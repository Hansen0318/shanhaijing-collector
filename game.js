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

const world = { width: 1800, height: 1200 };
const camera = { x: -420, y: -300, zoom: 1 };
const limits = { min: 0.65, max: 2.8 };
const DEV_MODE = new URLSearchParams(location.search).get("dev") === "1";
const storageKey = "shanhaijing-collector-discovered";

const pointers = new Map();
let drag = null;
let pinch = null;
let suppressClick = false;
let lastRegionId = null;
let lastClueMonsterId = null;
let statusTimer = null;

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

  // 青丘之國：丘陵、草原、溪谷。
  drawHill(330, 500, 520, 230, "#78975f");
  drawHill(700, 620, 600, 270, "#73905b");
  drawHill(1040, 500, 460, 210, "#76945e");

  // 明星之山：山地是主體，讓「看到山」就真的在明星之山。
  drawMountain(1120, 520, 520, 420, "#405e4c");
  drawMountain(1380, 430, 600, 500, "#355345");
  drawMountain(1660, 540, 460, 350, "#2f4c40");

  // 東極：開闊、少遮蔽物，帶有天地交界感。
  ctx.fillStyle = "rgba(225, 211, 151, .12)";
  ctx.fillRect(1240, 500, 560, 420);

  // 大荒之野：低矮荒丘與稀疏植被。
  drawHill(300, 1120, 700, 230, "#627856");
  drawHill(950, 1140, 760, 250, "#5d7251");

  drawRiver();

  for (const [x, y, scale] of [
    [180, 350, 1.0], [430, 570, 0.8], [820, 430, 1.1],
    [610, 720, 0.75], [970, 680, 0.9], [1510, 760, 0.85],
    [1740, 1020, 0.9], [1180, 1060, 0.7], [300, 1020, 0.7]
  ]) {
    drawTree(x, y, scale);
  }

  // 區域邊界只用很淡的線，不把世界切成四個方塊。
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

    ctx.fillStyle = "rgba(8,25,19,.78)";
    ctx.fillRect(
      monster.position.x - (found ? 78 : 58),
      monster.position.y + 44,
      found ? 156 : 116,
      found ? 38 : 34
    );

    ctx.fillStyle = "#fff4cf";
    ctx.font = found ? "600 17px system-ui" : "600 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(found ? monster.name : "異獸蹤跡", monster.position.x, monster.position.y + (found ? 69 : 66));
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
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  clampCamera();
  updateZoomReadout();
  updateExplorationStatus();
}

new ResizeObserver(resizeCanvas).observe(canvas);
window.addEventListener("resize", resizeCanvas);

function startDrag(event, p) {
  drag = {
    pointerId: event.pointerId,
    startX: p.x,
    startY: p.y,
    cameraX: camera.x,
    cameraY: camera.y,
    moved: false
  };
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
  canvas.setPointerCapture(event.pointerId);
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

    camera.zoom = Math.max(
      limits.min,
      Math.min(limits.max, pinch.zoom * (distance / pinch.distance))
    );
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
    drag = {
      pointerId: remainingId,
      startX: p.x,
      startY: p.y,
      cameraX: camera.x,
      cameraY: camera.y,
      moved: false
    };
    pinch = null;
  } else if (pointers.size === 0) {
    drag = null;
    pinch = null;
    canvas.classList.remove("is-dragging");
    setTimeout(() => {
      suppressClick = false;
    }, 80);
  }
}

canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);

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
  if (action === "reset") {
    camera.zoom = 1;
    camera.x = -420;
    camera.y = -300;
    clampCamera();
    updateZoomReadout();
    updateExplorationStatus();
  }
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

  if (!discoveredMonsters.has(monster.id)) {
    discoveredMonsters.add(monster.id);
    saveDiscovered();
    lastClueMonsterId = null;
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
resizeCanvas();
updateZoomReadout();

if (DEV_MODE) {
  document.title = "山海經：青丘尋獸 · DEV";
}

requestAnimationFrame(draw);
