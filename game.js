import { monsters } from "./data/monsters.js";

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const readout = document.querySelector("#zoom-readout");
const status = document.querySelector("#location-status");
const world = { width: 1600, height: 1100 };
const camera = { x: -360, y: -250, zoom: 1 };
const limits = { min: .65, max: 2.8 };
const pointers = new Map();
let drag, pinch;

function point(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
function worldAt(x, y) { return { x: (x - camera.x) / camera.zoom, y: (y - camera.y) / camera.zoom }; }
function setZoom(zoom, x = canvas.clientWidth / 2, y = canvas.clientHeight / 2) {
  const anchor = worldAt(x, y);
  camera.zoom = Math.max(limits.min, Math.min(limits.max, zoom));
  camera.x = x - anchor.x * camera.zoom;
  camera.y = y - anchor.y * camera.zoom;
  readout.textContent = Math.round(camera.zoom * 100) + "%";
}
function mountain(x, y, size, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + size * .52, y - size * .9); ctx.lineTo(x + size, y);
  ctx.closePath(); ctx.fill();
}
function draw(now = 0) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#86b7a3"); sky.addColorStop(1, "#d5bf80");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.translate(camera.x, camera.y); ctx.scale(camera.zoom, camera.zoom);
  ctx.fillStyle = "#7c9b60"; ctx.fillRect(0, 0, world.width, world.height);
  mountain(80,390,470,"#4d725d"); mountain(420,370,570,"#456957");
  mountain(920,410,620,"#3b604f"); mountain(1280,360,510,"#355847");
  ctx.strokeStyle = "#b8d6b6"; ctx.lineWidth = 24; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-80,870); ctx.bezierCurveTo(360,630,530,1080,890,800);
  ctx.bezierCurveTo(1130,610,1340,890,1710,630); ctx.stroke();
  for (let x = 120; x < world.width; x += 140) {
    const y = 680 + (x * 37 % 210);
    ctx.fillStyle = "#254f3c"; ctx.beginPath(); ctx.arc(x,y,34,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#163b2d"; ctx.fillRect(x-6,y+10,12,48);
  }
  const fox = monsters[0], pulse = 40 + Math.sin(now / 500) * 5;
  ctx.strokeStyle = "rgba(255,236,151,.85)"; ctx.lineWidth = 3; ctx.beginPath();
  ctx.arc(fox.position.x,fox.position.y,pulse,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle = "#ffe695"; ctx.beginPath(); ctx.arc(fox.position.x,fox.position.y,8,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(8,25,19,.72)"; ctx.fillRect(fox.position.x-78,fox.position.y+48,156,38);
  ctx.fillStyle = "#fff4cf"; ctx.font = "600 17px system-ui"; ctx.textAlign = "center";
  ctx.fillText("妖獸蹤跡",fox.position.x,fox.position.y+73);
  ctx.restore(); requestAnimationFrame(draw);
}
new ResizeObserver(() => {
  const rect = canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
}).observe(canvas);
canvas.addEventListener("pointerdown", event => {
  canvas.setPointerCapture(event.pointerId); const p = point(event); pointers.set(event.pointerId,p);
  if (pointers.size === 1) { drag = { p, x: camera.x, y: camera.y }; canvas.classList.add("is-dragging"); }
  if (pointers.size === 2) { const [a,b] = [...pointers.values()]; pinch = { distance: Math.hypot(a.x-b.x,a.y-b.y), zoom: camera.zoom, x:(a.x+b.x)/2, y:(a.y+b.y)/2 }; }
});
canvas.addEventListener("pointermove", event => {
  if (!pointers.has(event.pointerId)) return; const p = point(event); pointers.set(event.pointerId,p);
  if (pointers.size === 1 && drag) { camera.x = drag.x + p.x - drag.p.x; camera.y = drag.y + p.y - drag.p.y; }
  if (pointers.size === 2 && pinch) { const [a,b] = [...pointers.values()]; setZoom(pinch.zoom * Math.hypot(a.x-b.x,a.y-b.y) / pinch.distance,pinch.x,pinch.y); }
});
function release(event) { pointers.delete(event.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) { drag = null; canvas.classList.remove("is-dragging"); } }
canvas.addEventListener("pointerup",release); canvas.addEventListener("pointercancel",release);
canvas.addEventListener("wheel", event => { event.preventDefault(); const p = point(event); setZoom(camera.zoom * (event.deltaY > 0 ? .9 : 1.1),p.x,p.y); },{passive:false});
document.querySelector(".zoom-controls").addEventListener("click",event => {
  const action = event.target.dataset.zoom;
  if (action === "in") setZoom(camera.zoom * 1.2);
  if (action === "out") setZoom(camera.zoom / 1.2);
  if (action === "reset") { camera.x = -360; camera.y = -250; setZoom(1); }
});
status.textContent = monsters[0].region + " · " + monsters[0].hint;
setZoom(1); requestAnimationFrame(draw);

canvas.addEventListener("click", event => {
  const p = point(event);
  const fox = monsters[0];

  const distance = Math.hypot(
    p.x - (camera.x + fox.position.x * camera.zoom),
    p.y - (camera.y + fox.position.y * camera.zoom)
  );

  if (distance < 70) {
    status.textContent = "發現九尾狐！";

    const message = document.createElement("div");
    message.textContent = "🦊 發現九尾狐！";
    message.style.position = "absolute";
    message.style.left = "50%";
    message.style.top = "50%";
    message.style.transform = "translate(-50%, -50%)";
    message.style.padding = "18px 24px";
    message.style.borderRadius = "16px";
    message.style.background = "rgba(8,25,19,.92)";
    message.style.color = "#fff4cf";
    message.style.fontSize = "22px";
    message.style.fontWeight = "700";
    message.style.zIndex = "10";

    document.querySelector(".scene-frame").appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 1800);
  }
});
