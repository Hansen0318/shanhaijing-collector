import { monsters, activeMonsters, regions } from "./data/monsters.js";

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
let discoveryToast = null;
let discoveryIcon = null;
let discoveryTitle = null;
let discoveryText = null;

const world = { width: 1800, height: 1200 };
const camera = { x: 0, y: 0, zoom: 1 };
const limits = { min: 0.24, max: 2.8 };
const DEV_MODE = new URLSearchParams(location.search).get("dev") === "1";
const storageKey = "shanhaijing-collector-discovered";

const pointers = new Map();
let drag = null;
let pinch = null;
let suppressClick = false;
let lastRegionId = null;
let lastClueMonsterId = null;
let statusTimer = null;
let toastTimer = null;
let cameraInitialized = false;

function createDiscoveryToast() {
  discoveryToast = document.createElement("div");
  discoveryToast.className = "discovery-toast";
  discoveryToast.hidden = true;
  discoveryToast.innerHTML = `
    <div class="discovery-icon"></div>
    <div>
      <div class="discovery-title"></div>
      <div class="discovery-text"></div>
    </div>
  `;
  discoveryIcon = discoveryToast.querySelector(".discovery-icon");
  discoveryTitle = discoveryToast.querySelector(".discovery-title");
  discoveryText = discoveryToast.querySelector(".discovery-text");
  const scene = document.querySelector(".scene-frame");
  scene.appendChild(discoveryToast);

  const style = document.createElement("style");
  style.textContent = `
    .discovery-toast{position:absolute;left:50%;top:50%;z-index:10;width:min(82%,330px);transform:translate(-50%,-46%) scale(.94);display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;padding:14px 16px;border:1px solid rgba(225,191,110,.6);border-radius:18px;background:rgba(7,25,20,.94);box-shadow:0 18px 42px rgba(0,0,0,.42);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease}
    .discovery-toast[hidden]{display:none}
    .discovery-toast.is-visible{opacity:1;transform:translate(-50%,-50%) scale(1)}
    .discovery-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:rgba(225,191,110,.13);font-size:2rem}
    .discovery-title{font-weight:800;font-size:1.08rem;color:#fff4cf}
    .discovery-text{margin-top:3px;color:#b9c9bb;font:.76rem system-ui}
  `;
  document.head.appendChild(style);
}

function loadDiscovered() {
  if (DEV_MODE) return new Set();
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = JSON.parse(raw || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

const discoveredMonsters = loadDiscovered();

function saveDiscovered() {
  if (!DEV_MODE) {
    localStorage.setItem(storageKey, JSON.stringify([...discoveredMonsters]));
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

  camera.x = mw <= w
    ? (w - mw) / 2
    : Math.min(0, Math.max(w - mw, camera.x));

  camera.y = mh <= h
    ? (h - mh) / 2
    : Math.min(0, Math.max(h - mh, camera.y));
}

function updateZoomReadout() {
  readout.textContent = `${Math.round(camera.zoom * 100)}%`;
}

function fitWorldToViewport() {
  const w = Math.max(canvas.clientWidth, 1);
  const h = Math.max(canvas.clientHeight, 1);
  const isPortrait = h > w;

  // 手機直向：以地圖高度填滿探索框，避免上下留下大面積空白。
  // 桌面／橫向：仍以完整世界地圖為基準。
  const fitZoom = isPortrait
    ? h / world.height
    : Math.min(w / world.width, h / world.height);

  camera.zoom = Math.max(limits.min, Math.min(limits.max, fitZoom));
  camera.x = (w - world.width * camera.zoom) / 2;
  camera.y = (h - world.height * camera.zoom) / 2;
  clampCamera();
  updateZoomReadout();
  updateExplorationStatus();
}

function preserveCameraOnResize(previousWidth, previousHeight) {
  const newWidth = Math.max(canvas.clientWidth, 1);
  const newHeight = Math.max(canvas.clientHeight, 1);

  if (!cameraInitialized || previousWidth === 0 || previousHeight === 0) {
    fitWorldToViewport();
    cameraInitialized = true;
    return;
  }

  // Safari 的網址列展開／收起會改變 viewport 高度；不要因此重設鏡頭，
  // 否則地圖會突然跳位或跳回最大／最小倍率。
  const oldCenter = {
    x: (previousWidth / 2 - camera.x) / camera.zoom,
    y: (previousHeight / 2 - camera.y) / camera.zoom
  };

  camera.x = newWidth / 2 - oldCenter.x * camera.zoom;
  camera.y = newHeight / 2 - oldCenter.y * camera.zoom;
  clampCamera();
  updateZoomReadout();
  updateExplorationStatus();
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
  updateExplorationStatus();
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function getCurrentRegion() {
  const center = worldAt(canvas.clientWidth / 2, canvas.clientHeight / 2);
  return (
    regions.find(region => Array.isArray(region.polygon) && pointInPolygon(center, region.polygon)) ||
    regions.find(region => region.id === "qingqiu-country") ||
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

function showDiscoveryToast(monster) {
  if (!discoveryToast) createDiscoveryToast();
  discoveryIcon.textContent = monster.icon || "◈";
  discoveryTitle.textContent = `發現：${monster.name}`;
  discoveryText.textContent = DEV_MODE ? "測試模式：本次發現不會永久儲存" : "已加入收藏圖鑑";
  discoveryToast.hidden = false;
  requestAnimationFrame(() => discoveryToast.classList.add("is-visible"));
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    discoveryToast.classList.remove("is-visible");
    setTimeout(() => { discoveryToast.hidden = true; }, 220);
  }, 1800);
}

function drawPolygon(polygon) {
  ctx.beginPath();
  polygon.forEach((p, index) => {
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
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
  ctx.quadraticCurveTo(x - width * 0.15, y - height, x, y - height * 0.75);
  ctx.quadraticCurveTo(x + width * 0.2, y - height * 1.05, x + width / 2, y);
  ctx.closePath();
  ctx.fill();
}

function drawMountain(x, y, width, height, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.lineTo(x - width * 0.12, y - height);
  ctx.lineTo(x + width * 0.05, y - height * 0.65);
  ctx.lineTo(x + width * 0.25, y - height * 0.9);
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
  ctx.fillStyle = "#7d9e61";
  ctx.fillRect(0, 0, world.width, world.height);

  const byId = Object.fromEntries(regions.map(region => [region.id, region]));
  fillPolygon(byId["qingqiu-country"].polygon, "#8aa66b");
  fillPolygon(byId["mingxing-mountain"].polygon, "#66815d");
  fillPolygon(byId["east-extreme"].polygon, "#879d6b");
  fillPolygon(byId["great-wilderness"].polygon, "#6f855f");

  drawHill(330, 500, 520, 230, "#78975f");
  drawHill(700, 620, 600, 270, "#73905b");
  drawHill(1040, 500, 460, 210, "#76945e");

  drawMountain(1120, 520, 520, 420, "#405e4c");
  drawMountain(1380, 430, 600, 500, "#355345");
  drawMountain(1660, 540, 460, 350, "#2f4c40");

  ctx.fillStyle = "rgba(225, 211, 151, .12)";
  ctx.fillRect(1240, 500, 560, 420);

  drawHill(300, 1120, 700, 230, "#627856");
  drawHill(950, 1140, 760, 250, "#5d7251");
  drawRiver();

  for (const [x, y, scale] of [
    [180, 350, 1.0], [430, 570, 0.8], [820, 430, 1.1],
    [610, 720, 0.75], [970, 680, 0.9], [1510, 760, 0.85],
    [1740, 1020, 0.9], [1180, 1060, 0.7], [300, 1020, 0.7]
  ]) drawTree(x, y, scale);

  for (const region of regions) {
    strokePolygon(region.polygon, "rgba(238,224,172,.16)", 3);
  }
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

    if (camera.zoom < monster.discoveryZoom) continue;

    const pulse = 27 + Math.sin(now / 500 + monster.position.y) * 4;
    ctx.strokeStyle = found ? "rgba(255,236,151,.95)" : "rgba(255,236,151,.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(monster.position.x, monster.position.y, pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = found ? "#ffe695" : "#fff0ae";
    ctx.beginPath();
    ctx.arc(monster.position.x, monster.position.y, 7, 0, Math.PI * 2);
    ctx.fill();

    const labelWidth = found ? 176 : 116;
    const labelHeight = found ? 58 : 34;
    ctx.fillStyle = "rgba(8,25,19,.78)";
    ctx.fillRect(
      monster.position.x - labelWidth / 2,
      monster.position.y + 44,
      labelWidth,
      labelHeight
    );

    ctx.fillStyle = "#fff4cf";
    ctx.textAlign = "center";

    if (found) {
      ctx.font = "600 18px system-ui";
      ctx.fillText(`${monster.icon || "◈"}  ${monster.name}`, monster.position.x, monster.position.y + 68);
      ctx.font = "500 12px system-ui";
      ctx.fillStyle = "#c5d0c1";
      ctx.fillText("已發現", monster.position.x, monster.position.y + 88);
    } else {
      ctx.font = "600 15px system-ui";
      ctx.fillText("異獸蹤跡", monster.position.x, monster.position.y + 66);
    }
  }
}

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
  drawMonsterMarkers(now);
  ctx.restore();

  updateExplorationStatus();
  requestAnimationFrame(draw);
}

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
  drag = { pointerId: event.pointerId, startX: p.x, startY: p.y, cameraX: camera.x, cameraY: camera.y, moved: false };
}

function startPinch() {
  if (pointers.size !== 2) return;
  const [a, b] = [...pointers.values()];
  const centerX = (a.x + b.x) / 2;
  const centerY = (a.y + b.y) / 2;
  pinch = {
    distance: Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1),
    zoom: camera.zoom,
    worldCenter: worldAt(centerX, centerY)
  };
  drag = null;
  suppressClick = true;
}

canvas.addEventListener("pointerdown", event => {
  event.preventDefault();
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    // Safari 某些情況下 pointer capture 可能失敗，不影響探索操作。
  }
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
    if (Math.hypot(dx, dy) > 6) {
      drag.moved = true;
      suppressClick = true;
    }
    camera.x = drag.cameraX + dx;
    camera.y = drag.cameraY + dy;
    clampCamera();
    updateExplorationStatus();
  }

  if (pointers.size === 2 && pinch) {
    const [a, b] = [...pointers.values()];
    const centerX = (a.x + b.x) / 2;
    const centerY = (a.y + b.y) / 2;
    const distance = Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1);
    const scale = Math.min(3, Math.max(0.33, distance / pinch.distance));
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
    drag = { pointerId: remainingId, startX: p.x, startY: p.y, cameraX: camera.x, cameraY: camera.y, moved: false };
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

// Safari 可能同時啟動原生手勢；遊戲自己處理 pinch，因此阻止瀏覽器的第二套縮放手勢。
for (const eventName of ["gesturestart", "gesturechange", "gestureend"]) {
  canvas.addEventListener(eventName, event => event.preventDefault(), { passive: false });
}

canvas.addEventListener("wheel", event => {
  event.preventDefault();
  const p = point(event);
  setZoom(camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1), p.x, p.y);
}, { passive: false });

zoomControls?.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  const action = button.dataset.zoom;
  if (action === "in") setZoom(camera.zoom * 1.18);
  if (action === "out") setZoom(camera.zoom / 1.18);
  if (action === "reset") resetCameraToWorld();
});

function monsterAtScreenPoint(x, y) {
  const p = worldAt(x, y);
  return activeMonsters.find(monster => {
    if (!Number.isFinite(monster.position?.x) || !Number.isFinite(monster.position?.y)) return false;
    if (camera.zoom < monster.discoveryZoom) return false;
    return Math.hypot(p.x - monster.position.x, p.y - monster.position.y) <= monster.discoveryRadius;
  }) ?? null;
}

canvas.addEventListener("click", event => {
  if (suppressClick) return;
  const p = point(event);
  const monster = monsterAtScreenPoint(p.x, p.y);
  if (!monster) return;

  // 只有玩家實際點擊妖獸才會加入收藏；靠近、縮放、拖曳都不會自動捕獲。
  if (!discoveredMonsters.has(monster.id)) {
    discoveredMonsters.add(monster.id);
    saveDiscovered();
    lastClueMonsterId = null;
    showDiscoveryToast(monster);
    showStatus(`${monster.name} · 已加入收藏圖鑑！`, 2200);
    renderCollection();
  } else {
    showStatus(`${monster.name} · 已在收藏圖鑑中`, 1600);
  }
});

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

renderCollection();
createDiscoveryToast();
resizeCanvas();
updateZoomReadout();

if (DEV_MODE) document.title = "山海經：青丘尋獸 · DEV";
requestAnimationFrame(draw);
