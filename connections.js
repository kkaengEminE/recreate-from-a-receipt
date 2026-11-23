'use strict';
const editor = el('edit');
editor.querySelector('footer').before(el('connectionFields').content.cloneNode(true));
const token = text => String(text || '').normalize('NFC').trim().toLowerCase();
const tags = text => String(text || '').split(/[,·#]/).map(token).filter(Boolean);
const caption = row => row.title + ' · ' + row.type + ' · ' + row.score + '점';

function references(note, catalog) {
  const found = new Map(), missing = new Set();
  for (const match of String(note || '').matchAll(/\[\[([^\]\n]+)\]\]/g)) {
    const name = match[1].trim();
    // The picker uses IDs so two editions with identical titles stay distinguishable.
    const id = name.match(/\|id:([^|]+)$/)?.[1];
    const targets = catalog.filter(row => id ? row.id === id : token(row.title) === token(name));
    for (const row of targets) found.set(row.id, row);
    if (!targets.length) missing.add(name.split('|id:')[0]);
  }
  return {targets:[...found.values()], missing:[...missing]};
}
function relations(row, catalog) {
  const others = catalog.filter(other => other.id !== row.id);
  const {targets, missing} = references(row.note, others);
  const labels = new Set(tags(row.label));
  return {missing, groups:[
    ['메모에서 연결한 작품', targets],
    ['이 기록을 언급한 작품', others.filter(other => references(other.note,[row]).targets.length)],
    ['같은 원작의 판본', others.filter(other => token(row.work || row.title) === token(other.work || other.title))],
    ['라벨이 겹치는 작품', others.filter(other => tags(other.label).some(label => labels.has(label)))]
  ]};
}
function button(text, action) {
  const item = document.createElement('button');
  item.type = 'button';
  item.textContent = text;
  item.onclick = action;
  return item;
}
function drawRelations(host, row, visit) {
  const {groups,missing} = relations(row, rows);
  host.replaceChildren();
  for (const [name,items] of groups) {
    if (!items.length) continue;
    const branch = document.createElement('section');
    branch.className = 'branch';
    const heading = document.createElement('strong');
    heading.textContent = name;
    branch.append(heading,...items.map(other=>button(caption(other),()=>visit(other))));
    host.append(branch);
  }
  if (!host.children.length) host.textContent = '아직 연결된 기록이 없습니다.';
  if (missing.length) {
    const pending = document.createElement('p');
    pending.textContent = '아직 서고에 없는 작품 · '+missing.join(', ');
    host.append(pending);
  }
}
let changed = false;
editor.addEventListener('input',()=>{changed=true;});
function openConnections(row) {
  changed = false;
  el('work').value = row.work || '';
  el('insertLink').replaceChildren(new Option('연결할 기록 선택',''),
    ...rows.filter(other=>other.id!==row.id).map(other=>new Option(caption(other),other.id)));
  refreshRelations();
}
function refreshRelations() {
  drawRelations(el('relations'),{...draft,note:el('note').value,work:el('work').value,label:el('labels').value},other=>{
    if ((!changed && rows.some(row=>row.id===draft.id)) || confirm('현재 초안의 변경 사항을 버리고 이동할까요?')) edit(other);
  });
}
for (const id of ['note','labels','work']) el(id).addEventListener('input',refreshRelations);
el('insertLink').onchange = event=>{
  const target = rows.find(row=>row.id===event.target.value);
  if (!target) return;
  const note = el('note');
  note.setRangeText('[['+target.title.replace(/[\]\n]/g,' ')+'|id:'+target.id+']]',note.selectionStart,note.selectionEnd,'end');
  event.target.value='';
  changed=true;
  note.focus();
  refreshRelations();
};
function focusMap(row) {
  el('center').value=row.id;
  const center=button(caption(row),()=>edit(row));
  center.className='mapRoot';
  const branches=document.createElement('div');
  drawRelations(branches,row,focusMap);
  el('network').replaceChildren(center,branches);
}
document.querySelector('nav').append(button('연결 지도',()=>{
  el('center').replaceChildren(...rows.map(row=>new Option(caption(row),row.id)));
  if (rows.length) focusMap(rows[0]);
  else el('network').textContent='작품을 저장하면 이곳에서 연결을 볼 수 있습니다.';
  el('map').showModal();
}));
el('center').onchange=()=>focusMap(rows.find(row=>row.id===el('center').value));
el('record').addEventListener('close',()=>{
  if (!el('map').open) return;
  const current=rows.find(row=>row.id===el('center').value);
  el('center').replaceChildren(...rows.map(row=>new Option(caption(row),row.id)));
  if(current) focusMap(current);
});
el('lookup').after(button('직접 기록',()=>{
  const title=el('query').value.trim();
  if(!title){el('query').focus();el('status').textContent='기록할 작품명을 입력하세요.';return;}
  edit(normalize({title,score:25,source:'직접 입력',type:'기타'}));
}));
