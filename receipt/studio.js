import * as T from '../vendor/three.module.min.js';
const $ = id => document.getElementById(id);
const canvas = $('field'), scene = new T.Scene(), camera = new T.OrthographicCamera();
let renderer, software = false;
try {
 renderer = new T.WebGLRenderer({canvas,antialias:true});
} catch {
 const {SVGRenderer} = await import('../vendor/renderers/SVGRenderer.js');
 renderer = new SVGRenderer();
 software = true;
 const frame=document.createElement('div');
 frame.style.position='relative';
 canvas.before(frame);frame.append(canvas,renderer.domElement);
 renderer.domElement.style.cssText='position:absolute;inset:0;pointer-events:none;border-radius:12px';
}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
if(!software){renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap}
scene.background=new T.Color(0xbcc7b9);
scene.add(new T.AmbientLight(0xfff1dc,1.7));
const sun=new T.DirectionalLight(0xffe3b6,3);
sun.position.set(-4,8,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
camera.position.set(0,4,11);camera.lookAt(0,1.65,0);
function group(parent){const g=new T.Group();parent.add(g);return g}
function material(color,map=null){return new T.MeshStandardMaterial({color,map,roughness:.72})}
function mesh(parent,geo,mat,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);parent.add(m);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m}
function turned(parent,profile,mat,x,y,z){
 const path=new T.SplineCurve(profile.map(([r,h])=>new T.Vector2(r,h)));
 return mesh(parent,new T.LatheGeometry(path.getPoints(software?8:40),software?10:40),mat,x,y,z);
}
const grain=document.createElement('canvas');grain.width=grain.height=256;
const ctx=grain.getContext('2d');ctx.fillStyle='#dbac79';ctx.fillRect(0,0,256,256);
for(let i=0;i<550;i++){const x=Math.random()*270-8;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+12,80,x-10,160,x+2,256);ctx.strokeStyle='rgba(95,48,16,.055)';ctx.stroke()}
const texture=new T.CanvasTexture(grain);texture.colorSpace=T.SRGBColorSpace;
const wood=material(0xffffff,texture),joint=material(0x895f42);
function mannequin(parent){
 const body=group(parent),limbs=[];
 turned(body,[[.04,1.45],[.3,1.52],[.24,1.8],[.38,2.17],[.33,2.35],[.09,2.42]],wood,0,0,0);
 turned(body,[[.08,0],[.19,.09],[.22,.33],[.15,.47],[.005,.51]],wood,0,2.43,0);
 for(const sign of [-1,1])for(const arm of [true,false]){
  const pivot=group(body);pivot.position.set(sign*(arm?.38:.16),arm?2.27:1.52,0);
  const length=arm?.5:.7;let link=pivot;
  for(let k=0;k<2;k++){turned(link,[[.02,-.08],[.09,0],[.02,.08]],joint,0,0,0);
   turned(link,[[.055,-length],[.085,-length*.7],[arm?.105:.135,-length*.28],[.08,-.03]],wood,0,0,0);
   const next=group(link);next.position.y=-length;link=next}
  turned(link,[[.04,0],[.09,-.05],[.08,-.12],[.01,-.14]],wood,0,0,arm?0:.045);
  limbs.push({pivot,sign,arm});
 }return {body,limbs}
}
const garment=mannequin(scene);garment.body.position.x=-2;
const actor=mannequin(scene);actor.body.position.x=1.8;
const floor=mesh(scene,new T.PlaneGeometry(200,200),material(0xbac6b8));floor.rotation.x=-Math.PI/2;
function paper(parent,mat){const shape=new T.Shape();shape.moveTo(-.15,.22);shape.lineTo(.15,.22);
 for(let i=0;i<=12;i++)shape.lineTo(.15-i*.025,-.23+(i%2)*.025);
 shape.closePath();return mesh(parent,new T.ExtrudeGeometry(shape,{depth:.008,bevelEnabled:false}),mat)}
let records;
try {const saved=JSON.parse(localStorage.getItem('receipt-recreate'));if(Array.isArray(saved))records=saved.filter(r=>r&&typeof r.title==='string')}catch{}
records??=['사과 3개, 귤 2개','수영장 입장','목욕탕','숙박'].map((title,id)=>({title,id,price:5000}));
const wardrobe=[['이삿짐 트럭',78000],['소품 칼',8500],['작은 집',28000000],['사과 3개',4800],['수영장 입장',7000],['귤 5개',5500],['목욕탕',9000],['숙박',62000]];
function dress(){
 for(let i=0;i<32;i++){const id='sample-cloak-'+i;
  if(!records.some(r=>r.id===id)){const [title,price]=wardrobe[(i+Math.floor(i/8)*3)%wardrobe.length];records.push({id,title,price})}}
}
try{if(!localStorage.getItem('receipt-cloak-v1')){dress();localStorage.setItem('receipt-recreate',JSON.stringify(records));localStorage.setItem('receipt-cloak-v1','1')}}catch{dress()}
const refill=document.createElement('button');refill.type='button';refill.textContent='예시 영수증 망토 다시 입히기';$('form').append(refill);
refill.onclick=()=>{dress();redraw()};
let tickets=[],chosen=null;
function list(rows){$('stack').replaceChildren(...rows.map(r=>new Option(r.title+' · '+Number(r.price).toLocaleString()+'원',r.id)));$('burn').disabled=!rows.length}
function redraw(){for(const t of tickets){t.removeFromParent();t.geometry.dispose();t.material.map.dispose();t.material.dispose()}tickets=[];
 records.forEach((r,i)=>{const angle=(i%8)*Math.PI/4+Math.floor(i/24)*.13;
 const sheet=document.createElement('canvas');sheet.width=128;sheet.height=180;const c=sheet.getContext('2d');
 c.fillStyle='#fff3d7';c.fillRect(0,0,128,180);c.fillStyle='#342d28';c.font='bold 18px sans-serif';c.fillText('RECEIPT',10,30);c.font='13px sans-serif';c.fillText(r.title,8,62,112);
 for(let j=0;j<32;j++)c.fillRect(8+j*3.4,105,1+j%3,28);
 const row=Math.floor(i/8)%5, radius=.46+row*.05, azimuth=angle+row*.18;
 const t=paper(garment.body,material(0xffffff,new T.CanvasTexture(sheet)));t.rotation.order='YXZ';t.rotation.y=azimuth;t.rotation.x=-.15;t.scale.set(1.55+row*.12,1.25,1);t.position.set(radius*Math.sin(azimuth),2.18-row*.32,radius*Math.cos(azimuth));t.userData.record=r;tickets.push(t)});
 list(records);try{localStorage.setItem('receipt-recreate',JSON.stringify(records))}catch{$('status').textContent='이 브라우저에서는 영수증이 현재 탭에만 보관됩니다.'}}
$('form').onsubmit=e=>{e.preventDefault();const title=$('description').value.trim();if(!title)return;records.unshift({title,price:Number($('price').value),id:Date.now()});redraw();e.target.reset()};
const entities=[],keys=new Set(),sparks=[];
const kinds=[[/수영/,'수영'],[/목욕|온천/,'목욕'],[/사우나/,'사우나'],[/마사지/,'마사지'],[/숙박|호텔|펜션/,'숙박'],[/사과/,'사과'],[/귤|오렌지|자몽|한라봉|천혜향/,'귤']];
const actions=['수영','목욕','사우나','마사지','숙박'];
kinds.unshift([/트럭|화물차/,'트럭'],[/칼|단검/,'소품 칼'],[/작은 집|주택|^집/,'집']);
function model(root,kind){
 function block(w,h,d,color,x,y,z){return mesh(root,new T.BoxGeometry(w,h,d),material(color),x,y,z)}
 function outline(points,depth,color,z){
  const shape=new T.Shape(points.map(([x,y])=>new T.Vector2(x,y)));
  return mesh(root,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:2}),material(color),0,0,z)
 }
 if(kind==='트럭'){
  block(1.55,.13,.66,0x343b3b,0,.25,0);block(.96,.67,.73,0xe1d4b8,-.28,.64,0);
  outline([[.23,.32],[.77,.32],[.77,.57],[.63,.85],[.23,.85]],.66,0xc44b32,-.33);
  for(const z of [-.35,.35]){block(.26,.18,.025,0x537384,.43,.69,z);
   for(const x of [-.53,.56])mesh(root,new T.CylinderGeometry(.18,.18,.13,20),material(0x313132),x,.18,z).rotation.x=Math.PI/2}
 }else if(kind==='집'){
  block(1.18,.85,.86,0xe4c8a0,0,.425,0);
  outline([[-.72,.84],[0,1.36],[.72,.84]],1.04,0x97442f,-.52);
  block(.23,.52,.04,0x634334,-.25,.26,.44);block(.31,.3,.04,0x77a4a6,.25,.52,.44);
 }else{
  outline([[-.09,.28],[.1,.28],[.085,.82],[-.1,1.1]],.045,0xb7c6d2,0);
  block(.35,.065,.11,0xd2a653,0,.28,.02);block(.12,.25,.11,0x684a42,0,.14,.02);
 }
 root.rotation.y=-.34;
}
function spawn(name,index){
 const kind=kinds.find(([pattern])=>pattern.test(name))?.[1]??'물품',action=actions.includes(kind);
 const root=group(scene);root.position.set(1.8+(action?0:Math.sin(index*2)*1.2),action?0:3.4+index*.18,action?0:Math.cos(index)*.5);
 const mat=material(action?0x629f9e:kind==='사과'?0xc72f24:kind==='귤'?0xf89924:0xae8667);
 const e={root,kind,action,end:Date.now()+60000,velocity:0,held:false,mat};entities.push(e);
 if(action){actor.body.visible=false;e.figure=mannequin(root);
 const bath=['목욕','사우나','수영'].includes(kind);
 const prop=turned(root,[[.01,0],[.59,.03],[.68,bath?.34:.18],[.57,bath?.38:.2],[.01,.19]],mat,0,0,0);
 prop.scale.set(bath?1.4:1,1,bath?.85:1.8);
 if(kind==='수영'||!bath){e.figure.body.rotation.x=Math.PI/2;e.figure.body.scale.setScalar(.55);e.figure.body.position.set(0,.35,-.78)}
 else{e.figure.body.scale.setScalar(.62);e.figure.body.position.y=-.65}
 }else if(['트럭','소품 칼','집'].includes(kind)){model(root,kind)
 }else{
 turned(root,[[.01,0],[.12,.025],[.21,.17],[.19,.32],[.11,.37],[.025,.32]],mat,0,0,0);
 if(kind==='사과'||kind==='귤')turned(root,[[.015,0],[.018,.04],[.009,.09]],material(0x524733),0,.32,0);
 }
 root.traverse(m=>{m.userData.entity=e;if(!m.isMesh)return;m.material=m.material.clone();m.material.onBeforeCompile=s=>{
 s.uniforms.expiry={value:0};m.userData.uniform=s.uniforms.expiry;
 s.uniforms.baseHeight={value:root.position.y};m.userData.baseHeight=s.uniforms.baseHeight;
 s.vertexShader='uniform float baseHeight; varying float localHeight;\n'+s.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nlocalHeight=(modelMatrix*vec4(transformed,1.)).y-baseHeight;');
 s.fragmentShader='uniform float expiry; varying float localHeight;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat gray=smoothstep(-.06,.0,localHeight-mix('+ (action?'2.1':'.48') +',-.12,expiry)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.299,.587,.114))),gray);')};
 });return e
}
let useMode=false,burning=false,yaw=0,pitch=.22;
function view(use){
 useMode=use;chosen=null;drag=null;
 garment.body.visible=!use;
 $('form').hidden=use;$('usePanel').hidden=!use;
 $('heading').textContent=use?'붙여 둔 영수증':'영수증 등록';
 $('hint').textContent=use?'빈 곳을 드래그해 장면을 돌리세요. 대상을 누르면 방향키로 조종할 수 있습니다.':'인형을 드래그해 돌리고 붙은 영수증을 확인하세요.';
 $('registerTab').setAttribute('aria-pressed',!use);$('useTab').setAttribute('aria-pressed',use);
 $('status').textContent='';if(use&&!$('stack').value)list(records);
}
$('registerTab').onclick=()=>view(false);$('useTab').onclick=()=>view(true);
for(let i=0;i<6;i++){const flame=document.createElement('i');flame.style.left=i*14+'%';flame.style.animationDelay=-i*.069+'s';document.querySelector('.flames').append(flame)}
$('burn').onclick=async()=>{const r=records.find(v=>String(v.id)===$('stack').value);if(!r||burning)return;
 burning=true;$('burn').disabled=true;$('registerTab').disabled=true;
 $('slip').textContent=r.title;$('fire').hidden=false;
 const ticket=tickets.find(t=>t.userData.record===r);const origin=ticket.getWorldPosition(new T.Vector3());
 for(let i=0;i<36;i++){const m=mesh(scene,new T.TetrahedronGeometry(.025+Math.random()*.035),new T.MeshBasicMaterial({color:i%2?0xff7b20:0xffd65c}));m.position.copy(origin);sparks.push({m,t:0,dx:Math.random()-.5})}
 await new Promise(resolve=>setTimeout(resolve,1700));$('fire').hidden=true;
 records=records.filter(v=>v!==r);redraw();let i=0;
 burning=false;$('registerTab').disabled=false;
 for(const line of r.title.split(/[,，+\n]/)){const count=Math.min(50,Number(line.match(/(\d+)\s*(개|장|병|마리)/)?.[1]??1));for(let j=0;j<count;j++)spawn(line,i++)}
 $('status').textContent=r.title+' 재계상 · 대상을 클릭해 조종하세요.'};
const ray=new T.Raycaster();let drag=null;
function point(e){const box=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-box.left)/box.width*2-1,1-(e.clientY-box.top)/box.height*2),camera)}
canvas.onpointerdown=e=>{point(e);const hit=ray.intersectObjects(useMode?entities.map(v=>v.root):tickets,true)[0]?.object;
 chosen=hit?.userData.entity??null;drag={x:e.clientX,y:e.clientY,start:e.clientX,ticket:hit?.userData.record};canvas.setPointerCapture(e.pointerId)};
canvas.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(chosen){chosen.held=true;const distance=dx*(camera.right-camera.left)/canvas.clientWidth;chosen.root.position.x+=distance*Math.cos(yaw);chosen.root.position.z-=distance*Math.sin(yaw);chosen.root.position.y=Math.max(0,chosen.root.position.y-dy*(camera.top-camera.bottom)/canvas.clientHeight)}
 else if(useMode){yaw-=dx*.012;pitch=Math.max(.06,Math.min(1.25,pitch+dy*.008))}
 else garment.body.rotation.y+=dx*.014;drag.x=e.clientX;drag.y=e.clientY};
canvas.onpointercancel=()=>{drag=null};
canvas.onpointerup=()=>{if(drag?.ticket&&Math.abs(drag.start-drag.x)<5){const i=records.indexOf(drag.ticket);list(records.filter((_,j)=>Math.min((j-i+80000)%8,(i-j+80000)%8)<=1));$('stack').value=drag.ticket.id}drag=null};
onkeydown=e=>{if(chosen&&Date.now()<chosen.end&&e.key.startsWith('Arrow')&&!['INPUT','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();keys.add(e.key);chosen.held=true}};
onkeyup=e=>keys.delete(e.key);onblur=()=>keys.clear();
const clock=new T.Clock();function frame(){requestAnimationFrame(frame);const dt=Math.min(.05,clock.getDelta()),now=Date.now(),ratio=canvas.clientWidth/canvas.clientHeight;
 const center=useMode?1.8:-2,angle=useMode?yaw:0,elevation=useMode?pitch:.22;
 camera.position.set(center+10*Math.sin(angle)*Math.cos(elevation),1.6+10*Math.sin(elevation),10*Math.cos(angle)*Math.cos(elevation));camera.lookAt(center,1.6,0);
 actor.body.visible=useMode&&!entities.some(v=>v.action&&v.end>now);
 for(const entity of entities)entity.root.visible=useMode;
 const h=Math.max(2.12,2/ratio);camera.left=-h*ratio;camera.right=h*ratio;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();
 const size=canvas.clientWidth+'x'+canvas.clientHeight;
 if(canvas.dataset.size!==size){renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);canvas.dataset.size=size}
 for(const e of [...entities]){const remaining=e.end-now;
 if(e.action&&remaining<=0){e.root.removeFromParent();entities.splice(entities.indexOf(e),1);actor.body.visible=!entities.some(v=>v.action);if(chosen===e)chosen=null;continue}
 if(e.action){for(const {pivot,arm,sign} of e.figure.limbs)pivot.rotation.x=e.kind==='수영'?Math.sin(now*.005+sign)*(.4+Number(arm)):arm?-.4+.12*Math.sin(now*.003):-1.2}
 if(e===chosen&&remaining>0){const distance=dt*2*(keys.has('ArrowRight')-keys.has('ArrowLeft'));e.root.position.x+=distance*Math.cos(yaw);e.root.position.z-=distance*Math.sin(yaw);e.root.position.y=Math.max(0,e.root.position.y+dt*2*(keys.has('ArrowUp')-keys.has('ArrowDown')))}
 if(!e.action&&(!e.held||remaining<=0)&&!(drag&&chosen===e)){e.velocity-=dt*6;e.root.position.y=Math.max(0,e.root.position.y+e.velocity*dt);if(!e.root.position.y)e.velocity=0}
 e.root.traverse(m=>{if(m.userData.uniform){m.userData.uniform.value=1-Math.max(0,remaining)/60000;m.userData.baseHeight.value=e.root.position.y}});
 if(e===chosen)$('status').textContent=e.kind+' · '+(remaining>0?Math.ceil(remaining/1000)+'초':'비활성');
 }for(const s of [...sparks]){s.t+=dt;s.m.position.y+=dt*1.4;s.m.position.x+=dt*s.dx;s.m.scale.setScalar(Math.max(0,1-s.t));if(s.t>=1){s.m.removeFromParent();s.m.geometry.dispose();s.m.material.dispose();sparks.splice(sparks.indexOf(s),1)}}
 renderer.render(scene,camera)}
redraw();view(false);frame();
