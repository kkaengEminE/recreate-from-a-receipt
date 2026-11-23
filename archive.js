'use strict';
const el = id => document.getElementById(id);
const read = (key, fallback) => JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
const oldPrefs = read('archivum-settings', {});
const defaults = {model:'gemini-2.5-flash', instruction:''};
let prefs = read('archivum-v3-prefs', {
  model: /^gemini-[\w.-]+$/.test(oldPrefs.model) ? oldPrefs.model : defaults.model,
  instruction: oldPrefs.instruction?.startsWith('나는 결말의 완성도와 여운을 중요하게') ? '' : oldPrefs.instruction || ''
});
let key = sessionStorage.getItem('archivum-key') || oldPrefs.apiKey || '';
if (oldPrefs.apiKey) {
  sessionStorage.setItem('archivum-key', key);
  delete oldPrefs.apiKey;
  localStorage.setItem('archivum-settings', JSON.stringify(oldPrefs));
}
const integer = n => Math.max(0, Math.min(50, Math.round(n)));
function normalize(row, factor=1) {
  if (!row || typeof row.title !== 'string' || !row.title.trim() || !Number.isFinite(row.score)) throw Error('기록 형식을 확인하세요.');
  return {id:String(row.id ?? crypto.randomUUID()), title:row.title, type:String(row.type || '기타'),
    author:String(row.author || ''), label:String(row.label || ''), note:String(row.note || ''), work:String(row.work || ''),
    reason:String(row.reason || ''), date:String(row.date || ''), ai:integer((Number.isFinite(row.ai)?row.ai:row.score)*factor),
    score:integer(row.score*factor), source:String(row.source || '이전 기록')};
}
const legacy = read('archivum-records', []);
const scale = !localStorage.getItem('archivum-settings') && legacy.every(r=>r.ai<=10 && r.score<=10) ? 5 : 1;
let rows = read('archivum-v3-records', legacy.map(r=>normalize(r,scale)));
let draft, band = -1;
function setView(library) {
  el('desk').hidden = library;
  el('library').hidden = !library;
  el('deskBtn').classList.toggle('active',!library);
  el('libraryBtn').classList.toggle('active',library);
  if (library) render(); else el('query').focus();
}
el('deskBtn').onclick = ()=>setView(false);
el('libraryBtn').onclick = ()=>setView(true);
function settings() {
  el('key').value=key;
  el('instruction').value=prefs.instruction;
  el('model').value=prefs.model;
  el('settings').showModal();
}
el('settingsBtn').onclick=settings;
el('prefs').onsubmit=e=>{
  e.preventDefault();
  key=el('key').value.trim();
  sessionStorage.setItem('archivum-key',key);
  prefs={model:el('model').value.trim(),instruction:el('instruction').value.trim()};
  localStorage.setItem('archivum-v3-prefs',JSON.stringify(prefs));
  el('settings').close();
};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
function edit(row) {
  draft={...row};
  el('source').textContent=row.source+' · 최초 '+row.ai+' / 50';
  el('title').textContent=row.title;
  el('reason').textContent=row.reason;
  for (const [field,prop] of Object.entries({score:'score',date:'date',kind:'type',author:'author',labels:'label',note:'note'})) el(field).value=row[prop];
  openConnections(row);
  if (!el('record').open) el('record').showModal();
}
el('edit').onsubmit=e=>{
  e.preventDefault();
  Object.assign(draft,{score:Number(el('score').value), date:el('date').value,type:el('kind').value.trim()||'기타',
    author:el('author').value,label:el('labels').value,note:el('note').value,work:el('work').value.trim()});
  const next=[draft,...rows.filter(r=>r.id!==draft.id)];
  localStorage.setItem('archivum-v3-records',JSON.stringify(next));
  rows=next;
  el('record').close();
  el('status').textContent=draft.title+' · '+draft.score+'점으로 저장했습니다.';
  render();
};
el('lookup').onsubmit=async e=>{
  e.preventDefault();
  const query=el('query').value.trim();
  if (!query || el('judge').disabled) return;
  if (!key) {el('status').textContent='Gemini 키를 설정한 뒤 다시 평가하세요.';settings();return;}
  el('judge').disabled=true;
  el('status').textContent='Gemini가 작품과 매체를 확인하고 있습니다…';
  try {
    const prompt='한국어 작품 평가. 입력한 작품과 판본을 식별하고 서사 완결성, 결말의 호흡, 여운을 기준으로 0~50 정수 평가. 기준점은 보통 25, 강철의 연금술사 48, 내일의 죠 30, 주술회전 13. 모르는 작품이면 {"unknown":true}. 알려진 작품이면 JSON 객체로 title,type,author,label,reason(간단한 평가 근거),score(정수)를 반환. 매체는 만화, 애니메이션, 도서, 영화, 드라마 등. 추가 취향: '+prefs.instruction+'\n작품 입력: '+query;
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(prefs.model)+':generateContent',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(60000),
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json'}})
    });
    if (!response.ok) throw Error('Gemini 요청 실패 ('+response.status+'). 설정의 키·모델과 사용량을 확인하세요.');
    const payload=await response.json();
    const result=JSON.parse(payload.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text).join('') || '{}');
    if(result.unknown || typeof result.title!=='string' || !Number.isInteger(result.score) || result.score<0 || result.score>50) throw Error('평가를 확인할 수 없습니다. 작품명과 매체를 함께 입력해 주세요.');
    const anchor={'내일의죠':30,'주술회전':13};
    const score=anchor[result.title.replace(/\s/g,'')] ?? result.score;
    const today=new Date();
    today.setMinutes(today.getMinutes()-today.getTimezoneOffset());
    edit(normalize({...result,score,ai:score,id:crypto.randomUUID(),source:'Gemini · '+prefs.model,date:today.toISOString().slice(0,10)}));
    el('status').textContent='평가가 도착했습니다.';
  } catch(error) {el('status').textContent=error instanceof SyntaxError?'응답 형식을 읽지 못했습니다. 다시 평가해 주세요.':error.message;}
  finally {el('judge').disabled=false;}
};
function render() {
  const current=el('media').value;
  el('media').replaceChildren(new Option('모든 매체',''),...Array.from(new Set(rows.map(r=>r.type)),t=>new Option(t,t)));
  el('media').value=current;
  const avg=rows.reduce((sum,r)=>sum+r.score,0)/(rows.length||1);
  el('stats').textContent=rows.length+'건 · 평균 '+Math.round(avg)+' / 50 · 만점 대비 '+Math.round(avg*2)+'%';
  const bin=r=>Math.min(4,Math.floor(r.score/10));
  el('bins').replaceChildren(...Array.from({length:5},(_,i)=>{
    const pct=Math.round(100*rows.filter(r=>bin(r)===i).length/(rows.length||1));
    const btn=document.createElement('button');
    btn.textContent=(10*i)+'–'+(i===4?50:10*i+9)+'점 · '+pct+'%';
    btn.style.setProperty('--fill',pct+'%');
    btn.setAttribute('aria-pressed',band===i);
    btn.onclick=()=>{band=band===i?-1:i;render();};
    return btn;
  }));
  const query=el('search').value.trim().toLowerCase();
  const list=rows.filter(r=>(band<0||bin(r)===band)&&(!current||current===r.type)&&[r.title,r.author,r.label].join(' ').toLowerCase().includes(query));
  if(el('sort').selectedIndex===1) list.sort((a,b)=>b.score-a.score);
  el('cards').replaceChildren(...list.map(r=>{
    const btn=document.createElement('button');
    const title=document.createElement('strong');
    title.textContent=r.title+' · '+r.score+'점';
    btn.append(title,r.type+' · '+(r.date||'감상일 미입력'));
    btn.onclick=()=>edit(r);
    return btn;
  }));
  if(!list.length) el('cards').textContent='표시할 기록이 없습니다.';
}
for(const id of ['sort','media','search']) el(id).oninput=render;
el('backup').onclick=()=>{
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify({format:'archivum-json',version:3,records:rows,settings:prefs},null,2)],{type:'application/json'}));
  a.download='archivum-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
el('restore').onchange=async e=>{
  try {
    const file=e.target.files[0];if(!file)return;
    const data=JSON.parse(await file.text());
    if(data.format!=='archivum-json'||!Array.isArray(data.records))throw Error();
    const next=data.records.map(r=>normalize(r));
    if(!confirm(next.length+'건으로 현재 서고를 복원할까요?'))return;
    localStorage.setItem('archivum-v3-records',JSON.stringify(next));rows=next;
    const s=data.settings||{};
    prefs={model:/^gemini-[\w.-]+$/.test(s.model)?s.model:defaults.model,instruction:typeof s.instruction==='string'?s.instruction:''};
    localStorage.setItem('archivum-v3-prefs',JSON.stringify(prefs));
    band=-1;el('settings').close();setView(true);
  }catch{alert('백업 파일을 복원할 수 없습니다.');}
  finally{e.target.value='';}
};
el('query').focus();
