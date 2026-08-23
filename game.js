import { monsters, activeMonsters, regions } from "./data/monsters.js";
import { currentMapId } from "./data/maps.js";
import {
  getDiscoverySpots,
  collectDiscovery,
  getRemainingMs,
  formatCooldown
} from "./discovery-engine.js";

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const readout = document.querySelector("#zoom-readout");
const status = document.querySelector("#location-status");
const collectionModal = document.querySelector("#collection-modal");
const collectionGrid = document.querySelector("#collection-grid");
const collectionProgress = document.querySelector("#collection-progress");
const zoomControls = document.querySelector(".zoom-controls");
const collectionButton = document.querySelector("#collection-button");
const collectionClose = document.querySelector("#collection-close");

const world = { width: 1800, height: 1200 };
const camera = { x: 0, y: 0, zoom: 1 };
const limits = { min: 0.24, max: 2.8 };
const DEV_MODE = new URLSearchParams(location.search).get("dev") === "1";
const DISCOVERED_KEY = "shanhaijing-collector-discovered";

const pointers = new Map();
let drag = null;
let pinch = null;
let suppressClick = false;
let lastRegionId = null;
let lastClueMonsterId = null;
let statusTimer = null;
let discoveryToastTimer = null;
let cameraInitialized = false;

function loadDiscovered() {
  if (DEV_MODE) return new Set();
  try {
    const parsed = JSON.parse(localStorage.getItem(DISCOVERED_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

const discoveredMonsters = loadDiscovered();

function saveDiscovered() {
  if (!DEV_MODE) {
    localStorage.setItem(DISCOVERED_KEY, JSON.stringify([...discoveredMonsters]));
  }
}

function point(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function worldAt(x, y) {
  return {
    x: (x - camera.x) / camera.zoom,
    y: (y - camera.y) / camera.zoom
  };
}

function clampCamera() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const mw = world.width * camera.zoom;
  const mh = world.height * camera.zoom;

  camera.x = mw <= w ? (w - mw) / 2 : Math.min(0, Math.max(w - mw, camera.x));
  camera.y = mh <= h ? (h - mh) / 2 : Math.min(0, Math.max(h - mh, camera.y));
}

function updateZoomReadout() {
  readout.textContent = `${Math.round(camera.zoom * 100)}%`;
}

function fitWorldToViewport() {
  const w = Math.max(canvas.clientWidth, 1);
  const h = Math.max(canvas.clientHeight, 1);
  const fitZoom = h > w ? h / world.height : Math.min(w / world.width, h / world.height);

  camera.zoom = Math.max(limits.min, Math.min(limits.max, fitZoom));
  camera.x = (w - world.width * camera.zoom) / 2;
  camera.y = (h - world.height * camera.zoom) / 2;
  clampCamera();
  updateZoomReadout();
}

function preserveCameraOnResize(previousWidth, previousHeight) {
  const newWidth = Math.max(canvas.clientWidth, 1);
  const newHeight = Math.max(canvas.clientHeight, 1);

  if (!cameraInitialized || previousWidth === 0 || previousHeight === 0) {
    fitWorldToViewport();
    cameraInitialized = true;
    return;
  }

  const oldCenter = {
    x: (previousWidth / 2 - camera.x) / camera.zoom,
    y: (previousHeight / 2 - camera.y) / camera.zoom
  };

  camera.x = newWidth / 2 - oldCenter.x * camera.zoom;
  camera.y = newHeight / 2 - oldCenter.y * camera.zoom;
  clampCamera();
  updateZoomReadout();
}

function resetCameraToWorld() {
  fitWorldToViewport();
}

function setZoom(zoom, sx = canvas.clientWidth / 2, sy = canvas.clientHeight / 2) {
  const anchor = worldAt(sx, sy);
  camera.zoom = Math.max(limits.min, Math.min(limits.max, zoom));
  camera.x = sx - anchor.x * camera.zoom;
  camera.y = sy - anchor.y * camera.zoom;
  clampCamera();
  updateZoomReadout();
}

function pointInPolygon(pointValue, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects =
      a.y > pointValue.y !== b.y > pointValue.y &&
      pointValue.x < ((b.x - a.x) * (pointValue.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function getCurrentRegion() {
  const center = worldAt(canvas.clientWidth / 2, canvas.clientHeight / 2);
  return (
    regions.find(region => Array.isArray(region.polygon) && pointInPolygon(center, region.polygon)) ||
    regions[0]
  );
}

function distanceToMonster(monster) {
  const center = worldAt(canvas.clientWidth / 2, canvas.clientHeight / 2);
  return Math.hypot(center.x - monster.position.x, center.y - monster.position.y);
}

function getNearestClueMonster() {
  return activeMonsters
    .filter(monster => !discoveredMonsters.has(monster.id))
    .filter(monster => Number.isFinite(monster.position?.x) && Number.isFinite(monster.position?.y))
    .map(monster => ({ monster, distance: distanceToMonster(monster) }))
    .filter(item => item.distance <= item.monster.clueRadius)
    .sort((a, b) => a.distance - b.distance)[0]?.monster ?? null;
}

function showStatus(text, duration = 0) {
  status.textContent = text;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = null;
  if (duration > 0) {
    statusTimer = setTimeout(() => {
      statusTimer = null;
      updateExplorationStatus();
    }, duration);
  }
}

function updateExplorationStatus() {
  const region = getCurrentRegion();
  const clueMonster = getNearestClueMonster();

  if (region.id !== lastRegionId) {
    lastRegionId = region.id;
    lastClueMonsterId = null;
    showStatus(`${region.name} · ${region.description}`, 2200);
    return;
  }

  if (clueMonster) {
    const close = distanceToMonster(clueMonster) <= Math.max(70, clueMonster.clueRadius * 0.42);
    const clue = close ? clueMonster.closeClue : clueMonster.clue;

    if (clueMonster.id !== lastClueMonsterId) {
      lastClueMonsterId = clueMonster.id;
      showStatus(clue);
    } else if (!statusTimer) {
      status.textContent = clue;
    }
    return;
  }

  lastClueMonsterId = null;
  status.textContent = `${region.name} · ${region.description}`;
}

let discoveryToast = null;

function showDiscoveryToast(title, text, icon = "✦") {
  if (!discoveryToast) {
    discoveryToast = document.createElement("div");
    discoveryToast.className = "discovery-toast";
    discoveryToast.innerHTML = `
      <div class="discovery-toast-icon"></div>
      <div><strong class="discovery-toast-title"></strong><small class="discovery-toast-text"></small></div>
    `;
    document.querySelector(".scene-frame").appendChild(discoveryToast);

    const style = document.createElement("style");
    style.textContent = `
      .discovery-toast{position:absolute;left:50%;top:50%;z-index:20;width:min(82%,340px);
        transform:translate(-50%,-50%) scale(.96);display:grid;grid-template-columns:auto 1fr;
        gap:12px;align-items:center;padding:14px 16px;border:1px solid rgba(225,191,110,.6);
        border-radius:18px;background:rgba(7,25,20,.94);box-shadow:0 18px 42px rgba(0,0,0,.42);
        opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}
      .discovery-toast.is-visible{opacity:1;transform:translate(-50%,-50%) scale(1)}
      .discovery-toast-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;
        background:rgba(225,191,110,.13);font-size:2rem}
      .discovery-toast-title{display:block;color:#fff4cf;font-size:1.05rem}
      .discovery-toast-text{display:block;margin-top:3px;color:#b9c9bb;font:.76rem system-ui}
    `;
    document.head.appendChild(style);
  }

  discoveryToast.querySelector(".discovery-toast-icon").textContent = icon;
  discoveryToast.querySelector(".discovery-toast-title").textContent = title;
  discoveryToast.querySelector(".discovery-toast-text").textContent = text;
  discoveryToast.classList.add("is-visible");

  if (discoveryToastTimer) clearTimeout(discoveryToastTimer);
  discoveryToastTimer = setTimeout(() => {
    discoveryToast.classList.remove("is-visible");
  }, 1800);
}

function drawPolygon(polygon) {
  ctx.beginPath();
  polygon.forEach((p, index) => index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.closePath();
}

function fillPolygon(polygon, fill) {
  ctx.fillStyle = fill;
  drawPolygon(polygon);
  ctx.fill();
}

function strokePolygon(polygon, stroke, width = 3) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  drawPolygon(polygon);
  ctx.stroke();
}

function drawHill(x, y, width, height, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.quadraticCurveTo(x - width * .15, y - height, x, y - height * .75);
  ctx.quadraticCurveTo(x + width * .2, y - height * 1.05, x + width / 2, y);
  ctx.closePath();
  ctx.fill();
}

function drawMountain(x, y, width, height, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.lineTo(x - width * .12, y - height);
  ctx.lineTo(x + width * .05, y - height * .65);
  ctx.lineTo(x + width * .25, y - height * .9);
  ctx.lineTo(x + width / 2, y);
  ctx.closePath();
  ctx.fill();
}

function drawTree(x, y, scale = 1) {
  ctx.fillStyle = "#163e31";
  ctx.fillRect(x - 6 * scale, y, 12 * scale, 48 * scale);
  ctx.fillStyle = "#285541";
  ctx.beginPath();
  ctx.arc(x, y - 20 * scale, 32 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawRiver() {
  ctx.strokeStyle = "#b8d6b6";
  ctx.lineWidth = 46;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-100, 820);
  ctx.bezierCurveTo(250, 650, 480, 930, 780, 760);
  ctx.bezierCurveTo(1020, 620, 1180, 790, 1460, 670);
  ctx.bezierCurveTo(1580, 620, 1690, 610, 1900, 540);
  ctx.stroke();

  ctx.strokeStyle = "#d9ebcf";
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(-100, 820);
  ctx.bezierCurveTo(250, 650, 480, 930, 780, 760);
  ctx.bezierCurveTo(1020, 620, 1180, 790, 1460, 670);
  ctx.bezierCurveTo(1580, 620, 1690, 610, 1900, 540);
  ctx.stroke();
}

function drawTerrain() {
  const byId = Object.fromEntries(regions.map(region => [region.id, region]));
  fillPolygon(byId["qingqiu-country"].polygon, "#8aa66b");
  fillPolygon(byId["mingxing-mountain"].polygon, "#58725a");
  fillPolygon(byId["east-extreme"].polygon, "#8b9b6c");
  fillPolygon(byId["great-wilderness"].polygon, "#667255");

  ctx.save();
  drawPolygon(byId["qingqiu-country"].polygon);
  ctx.clip();
  drawHill(260, 430, 430, 180, "#78975f");
  drawHill(570, 560, 560, 240, "#73905b");
  drawHill(780, 700, 420, 170, "#76945e");
  for (const [x, y, scale] of [[160,280,.85],[360,390,.75],[650,320,1],[850,470,.8],[300,650,.7],[700,760,.8]]) {
    drawTree(x, y, scale);
  }
  drawRiver();
  ctx.restore();

  ctx.save();
  drawPolygon(byId["mingxing-mountain"].polygon);
  ctx.clip();
  drawMountain(1160, 520, 520, 470, "#405e4c");
  drawMountain(1420, 470, 650, 560, "#355345");
  drawMountain(1690, 500, 500, 430, "#2f4c40");
  drawMountain(1280, 690, 430, 250, "#46614d");
  ctx.restore();

  ctx.save();
  drawPolygon(byId["east-extreme"].polygon);
  ctx.clip();
  ctx.fillStyle = "rgba(225,211,151,.12)";
  ctx.fillRect(1050, 580, 750, 420);
  ctx.strokeStyle = "rgba(220,229,184,.34)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(1160,790);
  ctx.bezierCurveTo(1350,700,1510,850,1810,740);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  drawPolygon(byId["great-wilderness"].polygon);
  ctx.clip();
  drawHill(330,1110,680,190,"#5c6e50");
  drawHill(1040,1130,720,210,"#56684c");
  for (const [x,y,s] of [[180,1010,1],[470,1080,.75],[820,1030,1.1],[1210,1100,.8],[1510,1020,1],[1700,1130,.75]]) {
    ctx.fillStyle = "#4d5a47";
    ctx.beginPath();
    ctx.ellipse(x,y,28*s,18*s,-.18,0,Math.PI*2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(225,211,151,.16)";
  ctx.lineWidth = 3;
  ctx.strokeRect(620,1040,180,90);
  ctx.restore();

  for (const region of regions) strokePolygon(region.polygon, "rgba(238,224,172,.18)", 3);
}

function drawMonsterMarkers(now) {
  for (const monster of activeMonsters) {
    if (!Number.isFinite(monster.position?.x) || !Number.isFinite(monster.position?.y)) continue;
    const found = discoveredMonsters.has(monster.id);
    const distance = distanceToMonster(monster);

    if (!found && distance <= monster.clueRadius && camera.zoom >= monster.clueZoom) {
      const pulse = 15 + Math.sin(now / 450 + monster.position.x) * 3;
      ctx.strokeStyle = "rgba(255,236,151,.42)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(monster.position.x, monster.position.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (found) {
      const iconSize = 24 / camera.zoom;
      const markerRadius = 18 / camera.zoom;
      ctx.save();
      ctx.translate(monster.position.x, monster.position.y);
      ctx.fillStyle = "rgba(8,25,19,.88)";
      ctx.strokeStyle = "rgba(225,191,110,.82)";
      ctx.lineWidth = 1.5 / camera.zoom;
      ctx.beginPath();
      ctx.arc(0,0,markerRadius,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.font = `${iconSize}px "Apple Color Emoji","Segoe UI Emoji",system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(monster.icon || "◈", 0, 1 / camera.zoom);

      if (camera.zoom >= 1.15) {
        const labelY = 29 / camera.zoom;
        const labelWidth = Math.max(54, monster.name.length * 15) / camera.zoom;
        const labelHeight = 20 / camera.zoom;
        ctx.fillStyle = "rgba(8,25,19,.84)";
        ctx.beginPath();
        ctx.roundRect(-labelWidth/2, labelY-labelHeight/2, labelWidth, labelHeight, 7/camera.zoom);
        ctx.fill();
        ctx.fillStyle = "#fff4cf";
        ctx.font = `600 ${11 / camera.zoom}px system-ui`;
        ctx.fillText(monster.name, 0, labelY);
      }
      ctx.restore();
      continue;
    }

    if (camera.zoom < monster.discoveryZoom) continue;
    const pulse = 27 + Math.sin(now / 500 + monster.position.y) * 4;
    ctx.strokeStyle = "rgba(255,236,151,.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(monster.position.x, monster.position.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff0ae";
    ctx.beginPath();
    ctx.arc(monster.position.x, monster.position.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(8,25,19,.78)";
    ctx.fillRect(monster.position.x-58, monster.position.y+44, 116, 34);
    ctx.fillStyle = "#fff4cf";
    ctx.textAlign = "center";
    ctx.font = "600 15px system-ui";
    ctx.fillText("異獸蹤跡", monster.position.x, monster.position.y+66);
  }
}

function drawDiscoveryMarkers(now) {
  for (const spot of getDiscoverySpots(currentMapId)) {
    const remaining = getRemainingMs(spot.id, now);
    const r = spot.radius;

    ctx.save();
    ctx.translate(spot.position.x, spot.position.y);

    if (remaining > 0) {
      ctx.strokeStyle = "rgba(160,170,160,.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0,0,Math.max(14, r * .28),0,Math.PI*2);
      ctx.stroke();
      ctx.fillStyle = "rgba(8,25,19,.78)";
      ctx.fillRect(-48, r * .28, 96, 28);
      ctx.fillStyle = "#d6ddd7";
      ctx.textAlign = "center";
      ctx.font = "700 13px system-ui";
      ctx.fillText(`冷卻 ${formatCooldown(remaining)}`, 0, r * .28 + 19);
    } else {
      const pulse = 17 + Math.sin(now / 500 + spot.position.x) * 3;
      ctx.strokeStyle = "rgba(255,220,115,.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0,0,pulse,0,Math.PI*2);
      ctx.stroke();

      ctx.fillStyle = "rgba(8,25,19,.88)";
      ctx.strokeStyle = "rgba(225,191,110,.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0,0,20,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff4cf";
      ctx.font = '20px "Apple Color Emoji","Segoe UI Emoji",system-ui';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✦", 0, 1);

      ctx.fillStyle = "#fff4cf";
      ctx.font = `700 ${12 / camera.zoom}px system-ui`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText("尋寶", 0, 42 / camera.zoom);
    }

    ctx.restore();
  }
}

function monsterAtScreenPoint(x, y) {
  const p = worldAt(x, y);
  return activeMonsters.find(monster => {
    if (!Number.isFinite(monster.position?.x) || !Number.isFinite(monster.position?.y)) return false;
    if (camera.zoom < monster.discoveryZoom) return false;
    return Math.hypot(p.x - monster.position.x, p.y - monster.position.y) <= monster.discoveryRadius;
  }) ?? null;
}

function discoveryAtScreenPoint(x, y) {
  const p = worldAt(x, y);
  return getDiscoverySpots(currentMapId).find(spot =>
    Math.hypot(p.x - spot.position.x, p.y - spot.position.y) <= spot.radius
  ) ?? null;
}

function renderCollection() {
  const total = monsters.length;
  const found = monsters.filter(monster => discoveredMonsters.has(monster.id)).length;
  collectionProgress.textContent = `${found} / ${total} 已發現`;
  collectionGrid.innerHTML = monsters.map(monster => {
    const discovered = discoveredMonsters.has(monster.id);
    return `
      <article class="collection-item ${discovered ? "discovered" : "locked"}">
        <div class="monster-icon">${discovered ? (monster.icon || "◈") : "?"}</div>
        <div class="monster-name">${discovered ? monster.name : "未發現妖獸"}</div>
        <div class="monster-meta">${discovered ? monster.rarity : "探索青丘以解鎖"}</div>
      </article>
    `;
  }).join("");
}

canvas.addEventListener("click", event => {
  if (suppressClick) return;
  const p = point(event);

  const monster = monsterAtScreenPoint(p.x, p.y);
  if (monster) {
    if (!discoveredMonsters.has(monster.id)) {
      discoveredMonsters.add(monster.id);
      saveDiscovered();
      lastClueMonsterId = null;
      showDiscoveryToast(`發現：${monster.name}`, "已加入收藏圖鑑", monster.icon || "◈");
      showStatus(`${monster.name} · 已加入收藏圖鑑！`, 2200);
      renderCollection();
    } else {
      showStatus(`${monster.name} · 已在收藏圖鑑中`, 1600);
    }
    return;
  }

  const spot = discoveryAtScreenPoint(p.x, p.y);
  if (!spot) return;

  const result = collectDiscovery(spot);
  if (!result.ok) {
    if (result.reason === "cooldown") {
      showStatus(`尋寶點冷卻中 · 還有 ${formatCooldown(result.remainingMs)}`, 1500);
    }
    return;
  }

  showDiscoveryToast("取得道具", `${spot.itemId} ×${result.amount} · 60 秒後可再次取得`, "✦");
  showStatus(`取得 ${spot.itemId} ×${result.amount}`, 1800);
});

collectionButton?.addEventListener("click", () => {
  renderCollection();
  collectionModal.hidden = false;
});

collectionClose?.addEventListener("click", () => {
  collectionModal.hidden = true;
});

collectionModal?.addEventListener("click", event => {
  if (event.target === collectionModal) collectionModal.hidden = true;
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") collectionModal.hidden = true;
});

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const previousWidth = canvas.clientWidth;
  const previousHeight = canvas.clientHeight;

  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  preserveCameraOnResize(previousWidth, previousHeight);
}

new ResizeObserver(resizeCanvas).observe(canvas);
window.addEventListener("resize", resizeCanvas);

function startDrag(event, p) {
  drag = { pointerId: event.pointerId, startX: p.x, startY: p.y, cameraX: camera.x, cameraY: camera.y };
}

function startPinch() {
  if (pointers.size !== 2) return;
  const [a,b] = [...pointers.values()];
  const centerX = (a.x+b.x)/2;
  const centerY = (a.y+b.y)/2;
  pinch = {
    distance: Math.max(Math.hypot(a.x-b.x, a.y-b.y), 1),
    zoom: camera.zoom,
    worldCenter: worldAt(centerX, centerY)
  };
  drag = null;
  suppressClick = true;
}

canvas.addEventListener("pointerdown", event => {
  event.preventDefault();
  try { canvas.setPointerCapture(event.pointerId); } catch {}
  const p = point(event);
  pointers.set(event.pointerId, p);
  if (pointers.size === 1) startDrag(event, p);
  else if (pointers.size === 2) startPinch();
  canvas.classList.add("is-dragging");
});

canvas.addEventListener("pointermove", event => {
  if (!pointers.has(event.pointerId)) return;
  const p = point(event);
  pointers.set(event.pointerId, p);

  if (pointers.size === 1 && drag) {
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    if (Math.hypot(dx, dy) > 6) suppressClick = true;
    camera.x = drag.cameraX + dx;
    camera.y = drag.cameraY + dy;
    clampCamera();
    updateExplorationStatus();
  }

  if (pointers.size === 2 && pinch) {
    const [a,b] = [...pointers.values()];
    const centerX = (a.x+b.x)/2;
    const centerY = (a.y+b.y)/2;
    const distance = Math.max(Math.hypot(a.x-b.x, a.y-b.y), 1);
    const scale = Math.min(3, Math.max(.33, distance / pinch.distance));
    camera.zoom = Math.max(limits.min, Math.min(limits.max, pinch.zoom * scale));
    camera.x = centerX - pinch.worldCenter.x * camera.zoom;
    camera.y = centerY - pinch.worldCenter.y * camera.zoom;
    clampCamera();
    updateZoomReadout();
    updateExplorationStatus();
  }
});

function releasePointer(event) {
  pointers.delete(event.pointerId);
  if (pointers.size === 1) {
    const [remainingId] = [...pointers.keys()];
    const p = pointers.get(remainingId);
    drag = { pointerId: remainingId, startX: p.x, startY: p.y, cameraX: camera.x, cameraY: camera.y };
    pinch = null;
  } else if (pointers.size === 0) {
    drag = null;
    pinch = null;
    canvas.classList.remove("is-dragging");
    setTimeout(() => { suppressClick = false; }, 120);
  }
}

canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);

for (const eventName of ["gesturestart","gesturechange","gestureend"]) {
  canvas.addEventListener(eventName, event => event.preventDefault(), { passive: false });
}

canvas.addEventListener("wheel", event => {
  event.preventDefault();
  const p = point(event);
  setZoom(camera.zoom * (event.deltaY > 0 ? .9 : 1.1), p.x, p.y);
}, { passive: false });

zoomControls?.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.zoom === "in") setZoom(camera.zoom * 1.18);
  if (button.dataset.zoom === "out") setZoom(camera.zoom / 1.18);
  if (button.dataset.zoom === "reset") resetCameraToWorld();
});

function draw(now = 0) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#d1c28b";
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);
  drawTerrain();
  drawDiscoveryMarkers(now);
  drawMonsterMarkers(now);
  ctx.restore();

  updateExplorationStatus();
  requestAnimationFrame(draw);
}

renderCollection();
resizeCanvas();
updateZoomReadout();
requestAnimationFrame(draw);
