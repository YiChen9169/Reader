'use strict';
(function(root) {
  const han = /\p{Script=Han}/u;
  function sentences(text) {
    const out=[]; let start=0;
    for(let i=0;i<text.length;i++) {
      const c=text[i];
      const decimal=c==='.' && /\d/.test(text[i-1]||'') && /\d/.test(text[i+1]||'');
      const abbreviation=c==='.' && /(?:\b(?:Mr|Mrs|Ms|Dr|Prof|vs|etc)|\b[A-Za-z])$/i.test(text.slice(Math.max(start,i-8),i));
      if(c==='\n'|| /[。！？!?]/.test(c)|| c==='.'&&!decimal&&!abbreviation&&(i+1===text.length||/\s/.test(text[i+1]))||i-start>=599) {
        let end=i+1;
        if(i-start>=599) {const space=text.lastIndexOf(' ',i);if(space>start+300)end=space+1; if(/[\uD800-\uDBFF]/.test(text[end-1]))end--;}
        if(text.slice(start,end).trim())out.push({start,end,text:text.slice(start,end)});
        start=end;i=end-1;
      }
    }
    if(text.slice(start).trim())out.push({start,end:text.length,text:text.slice(start)});
    return out;
  }
  function normalize(text, {skipUrls=true, rules=[]}={}) {
    let s=text;
    if(skipUrls)s=s.replace(/https?:\/\/[^\s<>]+|www\.[^\s<>]+/gi,' ');
    const chinese=han.test(s);
    if(chinese) {
      s=s.replace(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/g,(_,y,m,d)=>`${[...y].join(' ')} 年 ${+m} 月 ${+d} 日`)
        .replace(/NT\$\s*([\d,]+(?:\.\d+)?)/gi,(_,n)=>`新台幣 ${n.replace(/,/g,'')} 元`)
        .replace(/US\$\s*([\d,]+(?:\.\d+)?)/gi,(_,n)=>`${n.replace(/,/g,'')} 美元`)
        .replace(/(\d+(?:\.\d+)?)\s*%/g,'百分之 $1')
        .replace(/(\d+)\.(\d+)/g,(_,a,b)=>`${a} 點 ${[...b].join(' ')}`);
    }
    for(const [from,to] of rules)if(from)s=s.split(from).join(to);
    return s;
  }
  function runs(text, mode='switch') {
    if(mode==='single')return [{text,lang:han.test(text)?'zh':'en'}];
    const parts=text.match(/[A-Za-z\p{Script=Latin}]+(?:[\s'’.-]+[A-Za-z\p{Script=Latin}]+)*|[^A-Za-z\p{Script=Latin}]+/gu)||[];
    const out=[];
    for(const text of parts){
      if(!/[\p{L}\p{N}]/u.test(text)&&out.length)out[out.length-1].text+=text;
      else out.push({text,lang:/[A-Za-z\p{Script=Latin}]/u.test(text)?'en':'zh'});
    }
    return out.filter(r=>/[\p{L}\p{N}]/u.test(r.text));
  }
  const xml=s=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
  function ssml(text, options) {
    const body=runs(text,options.mode).map(r=>{
      const voice=options.mode==='single'?options.multi:r.lang==='zh'?options.zh:options.en;
      return `<voice name="${xml(voice)}">${xml(r.text).replace(/([，,；;：:])/g,'$1<break time="150ms"/>')}</voice>`;
    }).join('');
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW">${body}</speak>`;
  }
  const api={sentences,normalize,runs,ssml};
  if(typeof module!=='undefined')module.exports=api;else root.ReaderCore=api;
})(globalThis);
