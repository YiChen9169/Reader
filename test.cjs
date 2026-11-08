const assert=require('node:assert/strict');const C=require('./core');
const t='你好，今天是 2026/11/08，金額 NT$1,200，成長 3.5%。Hello, Dr. Wang! AI 很好。';
assert.equal(C.sentences(t).length,3);
assert.match(C.normalize(t),/新台幣 1200 元/);assert.match(C.normalize(t),/百分之 3 點 5/);
assert.equal(C.normalize('AI test',{rules:[['AI','A I']]}),'A I test');
assert.ok(!C.normalize('中文 https://example.com/path').includes('example'));
assert.match(C.ssml('<中文>&Hello',{mode:'switch',zh:'zh',en:'en'}),/&lt;/);
assert.ok(C.runs('中文 OpenAI 文字').some(x=>x.lang==='en'));
const long='中文長文，完整一句。Hello world! '.repeat(50000);const chunks=C.sentences(long);
assert.ok(chunks.map(x=>x.text).join('').trim()===long.trim());assert.ok(chunks.every(x=>x.end>x.start&&x.text.length<=601));
console.log('PASS core: sentence boundaries, decimal, abbreviation, normalization, XML escaping, bilingual runs, million-character document');
const vm=require('node:vm'),fs=require('node:fs');
const elements=new Map();
function el(id){if(!elements.has(id))elements.set(id,{value:id==='rate'?'1':id==='engine'?'local':id==='mix'?'switch':'',checked:['follow','remember','skipUrls'].includes(id),options:[],handlers:{},selectionStart:0,textContent:'',addEventListener(k,f){this.handlers[k]=f},replaceChildren(...a){this.options=a;},add(o){this.options.push(o)},append(){},querySelector(){return null}});return elements.get(id);}
let spoken=[],wasPaused=false,requests=[];
const synthesis={getVoices:()=>[{name:'Chinese',voiceURI:'zh',lang:'zh-TW',localService:true},{name:'English',voiceURI:'en',lang:'en-US',localService:true}],addEventListener(){},cancel(){wasPaused=false},speak(u){spoken.push(u)},pause(){wasPaused=true},resume(){wasPaused=false},get paused(){return wasPaused}};
class FakeAudio{constructor(){this.duration=10;this.currentTime=0;}pause(){}play(){return Promise.resolve()}removeAttribute(){}}
const storage=new Map();let audioObj;
const ctx=vm.createContext({ReaderCore:C,document:{getElementById:el,createElement:()=>el(Symbol()),createDocumentFragment:()=>({append(){}})},window:{speechSynthesis:synthesis,SpeechSynthesisUtterance:function(){},addEventListener(){}},SpeechSynthesisUtterance:function(t){this.text=t},Option:function(t,v){this.text=t;this.value=v??t},Audio:class extends FakeAudio{constructor(){super();audioObj=this}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout,clearTimeout,AbortController,AbortSignal,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},fetch:async(u,o)=>{requests.push([u,o]);return{ok:true,blob:async()=>({})}},console});
vm.runInContext(fs.readFileSync('reader.js','utf8'),ctx);
async function tests(){
 el('text').value='你好，世界。Hello world! 再見。';el('text').handlers.input();
 el('play').onclick();assert.equal(spoken.at(-1).text,'你好，世界。');
 el('pause').onclick();assert.ok(wasPaused);el('play').onclick();assert.ok(!wasPaused);
 spoken.at(-1).onend();assert.equal(spoken.at(-1).text,'Hello world!');
 const stale=spoken.at(-1);el('next').onclick();assert.equal(spoken.at(-1).text.trim(),'再見。');const count=spoken.length;stale.onend();assert.equal(spoken.length,count);
 el('rate').value='3';el('rate').oninput();assert.equal(spoken.at(-1).rate,3);
 el('pause').onclick();el('save').onclick();assert.equal(JSON.parse(storage.values().next().value).rate,3);
 el('text').selectionStart=1;el('text').handlers.pointerup();el('play').onclick();assert.equal(spoken.at(-1).text,'好，世界。');
 el('engine').value='cloud';el('engine').onchange();el('region').value='eastasia';el('key').value='test-key';el('cloudZh').value='zh-TW-HsiaoChenNeural';el('cloudEn').value='en-US-JennyNeural';el('multi').value='en-US-AvaMultilingualNeural';el('reset').onclick();
 await new Promise(r=>setTimeout(r,10));assert.equal(requests.length,1);assert.match(requests[0][1].body,/<break time="150ms"/);assert.equal(audioObj.src,'blob:test');
 el('rate').value='2.5';el('rate').oninput();assert.equal(audioObj.playbackRate,2.5);assert.equal(requests.length,1);
 el('pause').onclick();el('play').onclick();assert.equal(requests.length,1);
 el('clearSaved').onclick();assert.equal(storage.size,0);assert.ok(!el('remember').checked);
 assert.ok(!JSON.stringify([...storage.values()]).includes('test-key'));
 clearTimeout(vm.runInContext('saveTimer',ctx));
 console.log('PASS controls: pause/resume, next sentence, cursor, stale events, 3x, save/clear, Azure SSML, cloud uninterrupted rate, cloud pause/resume');
}
tests().catch(e=>{console.error(e);process.exitCode=1});
