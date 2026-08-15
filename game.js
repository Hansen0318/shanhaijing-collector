import { monsters, activeMonsters } from "./data/monsters.js";

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const readout = document.querySelector("#zoom-readout");
const status = document.querySelector("#location-status");
const collectionModal = document.querySelector("#collection-modal");
const collectionGrid = document.querySelector("#collection-grid");
const collectionProgress = document.querySelector("#collection-progress");

const world = { width:1600, height:1100 };
const camera = { x:-360, y:-250, zoom:1 };
const limits = { min:.65, max:2.8 };
const pointers = new Map();
let drag=null, pinch=null, suppressClick=false;

const storageKey="shanhaijing-collector-discovered";
const discoveredMonsters=new Set(
  JSON.parse(localStorage.getItem(storageKey) || "[]")
);

function saveDiscovered(){ localStorage.setItem(storageKey, JSON.stringify([...discoveredMonsters])); }

function point(event){ const r=canvas.getBoundingClientRect(); return {x:event.clientX-r.left,y:event.clientY-r.top}; }
function worldAt(x,y){ return {x:(x-camera.x)/camera.zoom,y:(y-camera.y)/camera.zoom}; }
function clampCamera(){
  const w=canvas.clientWidth,h=canvas.clientHeight,mw=world.width*camera.zoom,mh=world.height*camera.zoom;
  camera.x=mw<=w?(w-mw)/2:Math.min(0,Math.max(w-mw,camera.x));
  camera.y=mh<=h?(h-mh)/2:Math.min(0,Math.max(h-mh,camera.y));
}
function updateZoomReadout(){ readout.textContent=Math.round(camera.zoom*100)+"%"; }
function setZoom(zoom,sx=canvas.clientWidth/2,sy=canvas.clientHeight/2){
  const anchor=worldAt(sx,sy);
  camera.zoom=Math.max(limits.min,Math.min(limits.max,zoom));
  camera.x=sx-anchor.x*camera.zoom; camera.y=sy-anchor.y*camera.zoom;
  clampCamera(); updateZoomReadout();
}
function mountain(x,y,size,color){
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+size*.52,y-size*.9);ctx.lineTo(x+size,y);ctx.closePath();ctx.fill();
}
function draw(now=0){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,"#86b7a3");sky.addColorStop(1,"#d5bf80");
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.zoom,camera.zoom);
  ctx.fillStyle="#7c9b60";ctx.fillRect(0,0,world.width,world.height);
  mountain(80,390,470,"#4d725d");mountain(420,370,570,"#456957");mountain(920,410,620,"#3b604f");mountain(1280,360,510,"#355847");
  ctx.strokeStyle="#b8d6b6";ctx.lineWidth=24;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-80,870);ctx.bezierCurveTo(360,630,530,1080,890,800);ctx.bezierCurveTo(1130,610,1340,890,1710,630);ctx.stroke();
  for(let x=120;x<world.width;x+=140){const y=680+((x*37)%210);ctx.fillStyle="#254f3c";ctx.beginPath();ctx.arc(x,y,34,0,Math.PI*2);ctx.fill();ctx.fillStyle="#163b2d";ctx.fillRect(x-6,y+10,12,48);}
  for(const monster of activeMonsters){
    if(!monster.position.x&&!monster.position.y)continue;
    const found=discoveredMonsters.has(monster.id);
    if(camera.zoom>=monster.clueZoom&&camera.zoom<monster.discoveryZoom){
      const pulse=18+Math.sin(now/450+monster.position.x)*3;ctx.strokeStyle="rgba(255,236,151,.45)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(monster.position.x,monster.position.y,pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle="rgba(255,236,151,.9)";ctx.beginPath();ctx.arc(monster.position.x,monster.position.y,4,0,Math.PI*2);ctx.fill();
    }
    if(camera.zoom>=monster.discoveryZoom){
      const pulse=28+Math.sin(now/500+monster.position.y)*4;ctx.strokeStyle=found?"rgba(255,236,151,.95)":"rgba(255,236,151,.72)";ctx.lineWidth=3;ctx.beginPath();ctx.arc(monster.position.x,monster.position.y,pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle=found?"#ffe695":"#fff0ae";ctx.beginPath();ctx.arc(monster.position.x,monster.position.y,8,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(8,25,19,.78)";ctx.fillRect(monster.position.x-78,monster.position.y+48,156,38);ctx.fillStyle="#fff4cf";ctx.font="600 17px system-ui";ctx.textAlign="center";ctx.fillText(found?monster.name:"妖獸蹤跡",monster.position.x,monster.position.y+73);
    }
  }
  ctx.restore();requestAnimationFrame(draw);
}
function resizeCanvas(){const r=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*ratio);canvas.height=Math.round(r.height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);clampCamera();}
new ResizeObserver(resizeCanvas).observe(canvas);

function startDrag(event,p){drag={pointerId:event.pointerId,startX:p.x,startY:p.y,cameraX:camera.x,cameraY:camera.y,moved:false};}
function startPinch(){if(pointers.size!==2)return;const [a,b]=[...pointers.values()],cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;pinch={distance:Math.max(Math.hypot(a.x-b.x,a.y-b.y),1),zoom:camera.zoom,worldCenter:worldAt(cx,cy)};drag=null;suppressClick=true;}
canvas.addEventListener("pointerdown",e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=point(e);pointers.set(e.pointerId,p);if(pointers.size===1)startDrag(e,p);else if(pointers.size===2)startPinch();canvas.classList.add("is-dragging");});
canvas.addEventListener("pointermove",e=>{if(!pointers.has(e.pointerId))return;const p=point(e);pointers.set(e.pointerId,p);if(pointers.size===1&&drag){const dx=p.x-drag.startX,dy=p.y-drag.startY;if(Math.hypot(dx,dy)>6){drag.moved=true;suppressClick=true;}camera.x=drag.cameraX+dx;camera.y=drag.cameraY+dy;clampCamera();}if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()],cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,d=Math.max(Math.hypot(a.x-b.x,a.y-b.y),1);camera.zoom=Math.max(limits.min,Math.min(limits.max,pinch.zoom*(d/pinch.distance)));camera.x=cx-pinch.worldCenter.x*camera.zoom;camera.y=cy-pinch.worldCenter.y*camera.zoom;clampCamera();updateZoomReadout();}});
function releasePointer(e){pointers.delete(e.pointerId);if(pointers.size===1){const [p]=[...pointers.values()];drag={pointerId:[...pointers.keys()][0],startX:p.x,startY:p.y,cameraX:camera.x,cameraY:camera.y,moved:false};pinch=null;}else if(pointers.size===0){drag=null;pinch=null;canvas.classList.remove("is-dragging");setTimeout(()=>suppressClick=false,50);}}
canvas.addEventListener("pointerup",releasePointer);canvas.addEventListener("pointercancel",releasePointer);
canvas.addEventListener("wheel",e=>{e.preventDefault();const p=point(e);setZoom(camera.zoom*(e.deltaY>0?.9:1.1),p.x,p.y);},{passive:false});
document.querySelector(".zoom-controls").addEventListener("click",e=>{const a=e.target.dataset.zoom;if(a==="in")setZoom(camera.zoom*1.2);if(a==="out")setZoom(camera.zoom/1.2);if(a==="reset"){camera.zoom=1;camera.x=-360;camera.y=-250;clampCamera();updateZoomReadout();}});

function renderCollection(){
  const found=monsters.filter(m=>discoveredMonsters.has(m.id)).length;
  collectionProgress.textContent=`${found} / ${monsters.length} 已發現`;
  collectionGrid.innerHTML="";
  for(const monster of monsters){
    const discovered=discoveredMonsters.has(monster.id);
    const item=document.createElement("div");
    item.className=`collection-item ${discovered?"discovered":"locked"}`;
    item.innerHTML=`<div class="monster-icon">${discovered?monster.icon:"?"}</div><div class="monster-name">${discovered?monster.name:"未發現妖獸"}</div><div class="monster-meta">${discovered?monster.rarity:"探索青丘以解鎖"}</div>`;
    collectionGrid.appendChild(item);
  }
}
document.querySelector("#collection-button").addEventListener("click",()=>{renderCollection();collectionModal.hidden=false;});
document.querySelector("#collection-close").addEventListener("click",()=>{collectionModal.hidden=true;});
collectionModal.addEventListener("click",e=>{if(e.target===collectionModal)collectionModal.hidden=true;});

canvas.addEventListener("click",e=>{
  if(suppressClick)return;
  const p=point(e);
  for(const monster of activeMonsters){
    if(!monster.position.x&&!monster.position.y||camera.zoom<monster.discoveryZoom)continue;
    const sx=camera.x+monster.position.x*camera.zoom,sy=camera.y+monster.position.y*camera.zoom;
    if(Math.hypot(p.x-sx,p.y-sy)>=Math.max(70,55*camera.zoom))continue;
    const firstDiscovery=!discoveredMonsters.has(monster.id);
    discoveredMonsters.add(monster.id);saveDiscovered();
    status.textContent=`發現${monster.name}！`;
    const message=document.createElement("div");
    message.className="discovery-popup";
    message.innerHTML=`<div class="discovery-icon">${monster.icon}</div><div><strong>發現${monster.name}！</strong><span>已加入收藏圖鑑</span></div>`;
    Object.assign(message.style,{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",display:"flex",alignItems:"center",gap:"12px",padding:"14px 20px",borderRadius:"18px",background:"rgba(8,25,19,.94)",color:"#fff4cf",zIndex:"10",pointerEvents:"none",whiteSpace:"nowrap"});
    message.querySelector(".discovery-icon").style.fontSize="2.4rem";
    message.querySelector("strong").style.display="block";
    message.querySelector("strong").style.fontSize="1.2rem";
    message.querySelector("span").style.display="block";
    message.querySelector("span").style.marginTop="3px";
    message.querySelector("span").style.color="#b8c6ad";
    document.querySelector(".scene-frame").appendChild(message);
    setTimeout(()=>message.remove(),1800);
    if(!firstDiscovery)status.textContent=`${monster.name} · 已收藏`;
    break;
  }
});
status.textContent=monsters[0].regionName+" · "+monsters[0].hint;
resizeCanvas();setZoom(1);requestAnimationFrame(draw);
