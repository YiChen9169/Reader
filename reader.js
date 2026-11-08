'use strict';
const $=id=>document.getElementById(id), C=ReaderCore, synth=window.speechSynthesis;
const editor=$('text'), audio=new Audio(); audio.preservesPitch=true;
const STORE='slow-reader-v2';
let chunks=[], position=0, index=0, state='idle', token=0, utterance=null, controller=null, url=null, voices=[], parts=[], partIndex=0, rendered=-1, saveTimer, activeEngine='local';
let audioStart=0, audioEnd=0, saveClock=0;
const message=t=>$('status').textContent=t;
const rate=()=>Number($('rate').value);
function atPosition(){let lo=0,hi=chunks.length;while(lo<hi){const m=(lo+hi)>>1;if(chunks[m].end<=position)lo=m+1;else hi=m;}return lo;}
function display(){
  $('pause').disabled=!['playing','loading'].includes(state);
  $('progress').max=Math.max(1,editor.value.length);$('progress').value=position;
  index=atPosition();
  if(index!==rendered){
    rendered=index;$('reading').replaceChildren();
    for(let n=Math.max(0,index-4);n<Math.min(chunks.length,index+7);n++){
      const b=document.createElement('button');b.textContent=chunks[n].text;b.className=n===index?'current':'';
      b.onclick=()=>seek(chunks[n].start);$('reading').append(b);
    }
    if($('follow').checked)$('reading').querySelector('.current')?.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
}
function save(){
  if(!$('remember').checked)return;
  try{
    localStorage.setItem(STORE,JSON.stringify({text:editor.value,position,rate:rate(),rules:$('rules').value,skip:$('skipUrls').checked,mix:$('mix').value}));
    $('storageStatus').textContent='內容與進度已儲存在此瀏覽器；下次開啟可接續。';
  }catch(e){$('storageStatus').textContent='無法儲存：瀏覽器儲存空間不足或禁止存取。內容仍可朗讀，請另行備份原文。';}
}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,700);}
function stop(){
  token++;controller?.abort();controller=null;synth?.cancel();utterance=null;
  audio.pause();audio.onended=null;audio.ontimeupdate=null;audio.onerror=null;
  if(url){URL.revokeObjectURL(url);url=null;}audio.removeAttribute('src');
}
function seek(p, autoplay=false){stop();position=Math.max(0,Math.min(editor.value.length,p));state='idle';display();scheduleSave();message('已設定起讀位置，按播放開始。');if(autoplay)play();}
function rebuild(){
  chunks=C.sentences(editor.value);rendered=-1;
  $('count').textContent=`${editor.value.length.toLocaleString('zh-TW')} 字元 · 未設上限`;
  const frag=document.createDocumentFragment();let n=0;
  const re=/[^\r\n]+/g;let m;
  while((m=re.exec(editor.value))){if(!m[0].trim())continue;const o=new Option(`第 ${++n} 段 · ${m[0].slice(0,24)}`,String(m.index));frag.append(o);}
  $('paragraph').replaceChildren(frag);display();
}
function rules(){return $('rules').value.split('\n').map(s=>{const i=s.indexOf('=');return i>0?[s.slice(0,i).trim(),s.slice(i+1).trim()]:null}).filter(Boolean);}
function normalized(text){return C.normalize(text,{skipUrls:$('skipUrls').checked,rules:rules()});}
function loadVoices(){
  voices=synth?.getVoices()||[];
  for(const lang of ['zh','en']){
    const s=$(lang),old=s.value;s.replaceChildren(new Option('系統預設（來源未確認）',''));
    const available=voices.filter(v=>v.lang.toLowerCase().startsWith(lang)&&(!$('offline').checked||v.localService));
    for(const v of available)s.add(new Option(`${v.name} · ${v.localService?'本機／可離線':'線上／需網路'} (${v.lang})`,v.voiceURI));
    s.disabled=!available.length&&$('offline').checked;
    if(available.some(v=>v.voiceURI===old))s.value=old;
    else {const v=available.find(v=>v.lang.toLowerCase()===(lang==='zh'?'zh-tw':'en-us'))||available[0];if(v)s.value=v.voiceURI;}
  }
}
function fail(e,t){if(t!==token)return;state='paused';display();message(`無法播放：${e.message||e}。可調整設定後重試。`);}
function finish(t){if(t!==token)return;position=chunks[index].end;state='playing';display();if(Date.now()-saveClock>5000){saveClock=Date.now();scheduleSave();}run(t);}
function localPart(t){
  if(t!==token||state!=='playing')return;
  if(partIndex>=parts.length){finish(t);return;}
  const p=parts[partIndex];
  const voice=voices.find(v=>v.voiceURI===$(p.lang).value);
  if($('offline').checked&&(!voice||!voice.localService)){fail(new Error(`找不到${p.lang==='zh'?'中文':'英文'}本機語音，請安裝語音或關閉離線篩選`),t);return;}
  const u=new SpeechSynthesisUtterance(p.text);utterance=u;u.voice=voice||null;u.lang=voice?.lang||(p.lang==='zh'?'zh-TW':'en-US');u.rate=rate();
  u.onboundary=()=>{if(t===token)message(`朗讀中 · 第 ${index+1} / ${chunks.length} 句`);};
  u.onend=()=>{if(t!==token)return;partIndex++;localPart(t);};
  u.onerror=e=>{if(t===token)fail(new Error(`語音錯誤 ${e.error}`),t);};
  synth.speak(u);
}
function cloudConfig(){
  const region=$('region').value.trim(), key=$('key').value.trim();
  if(!/^[a-z][a-z0-9-]{1,40}$/.test(region)||!key)throw Error('請填入 Azure 服務區域與 Speech 金鑰');
  return {base:`https://${region}.tts.speech.microsoft.com/cognitiveservices`,key};
}
async function cloudSpeak(text,t){
  const config=cloudConfig();controller=new AbortController();
  const timeout=setTimeout(()=>controller?.abort(),45000);
  try{
    const res=await fetch(config.base+'/v1',{method:'POST',signal:controller.signal,headers:{'Ocp-Apim-Subscription-Key':config.key,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-24khz-96kbitrate-mono-mp3'},body:C.ssml(text,{mode:$('mix').value,zh:$('cloudZh').value,en:$('cloudEn').value,multi:$('multi').value})});
    if(!res.ok)throw Error(`Azure 回應 ${res.status}${res.status===401?'（金鑰或區域不正確）':''}${res.status===429?'（用量或請求頻率限制）':''}`);
    const blob=await res.blob();if(t!==token)return;
    url=URL.createObjectURL(blob);audio.src=url;audio.playbackRate=rate();audioStart=position;audioEnd=chunks[index].end;
    audio.onended=()=>{if(t!==token)return;if(url)URL.revokeObjectURL(url);url=null;finish(t);};
    audio.onerror=()=>fail(new Error('音訊無法解碼或播放'),t);
    audio.ontimeupdate=()=>{if(t!==token||!Number.isFinite(audio.duration)||!audio.duration)return;position=Math.min(audioEnd-1,audioStart+Math.floor((audioEnd-audioStart)*audio.currentTime/audio.duration));display();if(Date.now()-saveClock>5000){saveClock=Date.now();scheduleSave();}};
    if(state!=='paused'){state='playing';await audio.play();message(`雲端朗讀中 · 第 ${index+1} / ${chunks.length} 句（句內位置為估算）`);}display();
  }finally{clearTimeout(timeout);}
}
async function run(t){
  if(t!==token)return;
  index=atPosition();
  if(index>=chunks.length){state='done';position=editor.value.length;display();message('已朗讀完畢。');save();return;}
  const chunk=chunks[index];position=Math.max(position,chunk.start);display();
  const text=normalized(editor.value.slice(position,chunk.end));
  if(!text.trim()){position=chunk.end;setTimeout(()=>run(t),0);return;}
  message(`朗讀中 · 第 ${index+1} / ${chunks.length} 句`);
  activeEngine=$('engine').value;
  try{
    if(activeEngine==='cloud'){state='loading';display();message('正在產生這一句的語音…');await cloudSpeak(text,t);}
    else {
      if(!synth||!window.SpeechSynthesisUtterance)throw Error('瀏覽器不支援系統朗讀');
      state='playing';parts=C.runs(text,$('mix').value);partIndex=0;localPart(t);
    }
  }catch(e){if(e.name!=='AbortError')fail(e,t);else if(t===token)fail(new Error('語音請求逾時或已取消'),t);}
  display();
}
function play(){
  if(['playing','loading'].includes(state))return;
  if(!editor.value.trim()){message('請先貼上文字。');return;}
  if(state==='paused'&&utterance&&synth?.paused){state='playing';synth.resume();display();message('已繼續朗讀。');return;}
  if(state==='paused'&&url){state='playing';audio.play().catch(e=>fail(e,token));display();message('已繼續朗讀。');return;}
  stop();if(position>=editor.value.length)position=0;state='playing';run(token);
}
$('play').onclick=play;
$('pause').onclick=()=>{if(activeEngine==='cloud')audio.pause();else synth?.pause();state='paused';display();save();message('已暫停，按播放繼續。');};
$('reset').onclick=()=>seek(0,true);
$('prev').onclick=()=>{const i=atPosition();seek(chunks[Math.max(0,i-1)]?.start||0,['playing','loading'].includes(state));};
$('next').onclick=()=>{const i=atPosition();seek(chunks[i+1]?.start??editor.value.length,['playing','loading'].includes(state));};
$('paragraph').onchange=()=>seek(Number($('paragraph').value),['playing','loading'].includes(state));
editor.addEventListener('pointerup',()=>seek(editor.selectionStart));
editor.addEventListener('keyup',e=>{if(/^(Arrow|Home|End|Page)/.test(e.key))seek(editor.selectionStart);});
editor.addEventListener('input',()=>{stop();state='idle';position=0;rebuild();scheduleSave();message('內容已更新，播放會從頭開始。');});
$('rate').oninput=()=>{
  $('speed').textContent=rate().toFixed(1)+'×';
  if(activeEngine==='cloud'&&url)audio.playbackRate=rate();
  else if(state==='playing'){
    // Preserve completed language runs; only restart the active fragment.
    const p=partIndex;stop();state='playing';partIndex=p;localPart(token);message('語速已更新（本機語音可能重讀目前片段）。');
  }else if(utterance){stop();state='idle';}
  scheduleSave();
};
function settingChanged(){const playing=['playing','loading'].includes(state);seek(position,playing);scheduleSave();}
for(const id of ['zh','en','cloudZh','cloudEn','multi','mix','skipUrls'])$(id).onchange=settingChanged;
$('rules').oninput=()=>{stop();state='idle';display();scheduleSave();message('自訂讀法已更新，按播放接續。');};
$('engine').onchange=()=>{stop();state='idle';$('cloudOptions').hidden=$('engine').value!=='cloud';$('cloudOptions').open=true;$('localOptions').hidden=$('engine').value==='cloud';display();message('朗讀模式已切換。');};
$('offline').onchange=()=>{loadVoices();settingChanged();};
$('fetchVoices').onclick=async()=>{
  const button=$('fetchVoices');button.disabled=true;
  try{const cfg=cloudConfig();const response=await fetch(cfg.base+'/voices/list',{headers:{'Ocp-Apim-Subscription-Key':cfg.key},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`Azure 回應 ${response.status}`);const list=await response.json();
    for(const [id,predicate] of [['cloudZh',v=>v.Locale.startsWith('zh-')],['cloudEn',v=>v.Locale.startsWith('en-')],['multi',v=>v.ShortName.includes('Multilingual')]]){
      const s=$(id),old=s.value;const filtered=list.filter(predicate);s.replaceChildren(...filtered.map(v=>new Option(`${v.DisplayName} (${v.ShortName})`,v.ShortName)));if(filtered.some(v=>v.ShortName===old))s.value=old;
    }message('已載入可用的 Azure 語音。');
  }catch(e){message(`無法載入語音：${e.message}。請確認網路、區域與金鑰。`);}finally{button.disabled=false;}
};
$('preview').onclick=()=>{
  stop();state='idle';
  const text='你好，這是語音試聽。Hello, this is a voice preview.';
  if($('engine').value==='local'){
    if(!synth){message('此瀏覽器不支援系統語音。');return;}
    const t=token;const list=C.runs(text,$('mix').value);let n=0;
    function next(){if(t!==token)return;if(n>=list.length){utterance=null;message('試聽結束。');return;}const p=list[n++];const v=voices.find(v=>v.voiceURI===$(p.lang).value);if($('offline').checked&&!v?.localService){message('找不到本機語音。');return;}const u=new SpeechSynthesisUtterance(p.text);utterance=u;u.voice=v||null;u.lang=p.lang==='zh'?'zh-TW':'en-US';u.rate=rate();u.onend=next;u.onerror=()=>message('試聽失敗，請選其他語音。');synth.speak(u);}next();display();
  }else{
    // Preview uses the same synthesis path but does not alter document progress.
    const t=token;let cfg;try{cfg=cloudConfig();}catch(e){message(e.message);return;}
    controller=new AbortController();message('正在產生試聽語音…');
    fetch(cfg.base+'/v1',{method:'POST',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(45000)]),headers:{'Ocp-Apim-Subscription-Key':cfg.key,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-24khz-96kbitrate-mono-mp3'},body:C.ssml(text,{mode:$('mix').value,zh:$('cloudZh').value,en:$('cloudEn').value,multi:$('multi').value})}).then(r=>{if(!r.ok)throw Error(`Azure 回應 ${r.status}`);return r.blob();}).then(b=>{if(t!==token)return;url=URL.createObjectURL(b);audio.src=url;audio.playbackRate=rate();audio.onended=()=>{if(t===token){stop();message('試聽結束。');}};return audio.play();}).catch(e=>{if(t===token)message(`試聽失敗：${e.message}`);});
  }
};
$('save').onclick=()=>{if(!$('remember').checked){message('請先勾選「自動儲存內容與進度」。');return;}save();};
$('clearSaved').onclick=()=>{clearTimeout(saveTimer);$('remember').checked=false;try{localStorage.removeItem(STORE);$('storageStatus').textContent='已清除儲存內容，並關閉自動儲存；目前文字保留。';}catch{message('瀏覽器不允許存取儲存空間。');}};
$('remember').onchange=()=>{if($('remember').checked)save();else{clearTimeout(saveTimer);$('storageStatus').textContent='自動儲存已關閉；如要移除先前的副本，請按清除已儲存內容。';}};
window.addEventListener('pagehide',()=>{save();stop();});
try{const saved=JSON.parse(localStorage.getItem(STORE)||'null');if(saved&&typeof saved.text==='string'){editor.value=saved.text;position=Math.max(0,Math.min(editor.value.length,Number(saved.position)||0));$('rate').value=String(Math.max(.5,Math.min(3,Number(saved.rate)||1)));$('speed').textContent=rate().toFixed(1)+'×';$('rules').value=saved.rules||'';$('skipUrls').checked=saved.skip!==false;$('mix').value=saved.mix==='single'?'single':'switch';message('已還原上次內容與進度，按播放接續。');}}catch{$('storageStatus').textContent='無法讀取儲存內容；仍可貼上文字使用。';}
loadVoices();synth?.addEventListener('voiceschanged',loadVoices);rebuild();
