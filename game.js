import { monsters, activeMonsters, regions, getRegionById } from "./data/monsters.js";

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const readout = document.querySelector("#zoom-readout");
const status = document.querySelector("#location-status");
const collectionModal = document.querySelector("#collection-modal");
const collectionGrid = document.querySelector("#collection-grid");
const collectionProgress = document.querySelector("#collection-progress");

const world = { width: 1600, height: 1100 };
const camera = { x: -360, y: -250, zoom: 1 };
const limits = { min: 0.65, max: 2.8 };

const pointers = new Map();
let drag = null;
let pinch = null;
let suppressClick = false;
let lastRegionId = null;
let lastClueMonsterId = null;
let statusTimer = null;

const storageKey = "shanhaijing-collector-discovered";
const discoveredMonsters = new Set(
  JSON.parse(localStorage.getItem(storageKey) || "[]")
);

function saveDiscovered() {
  localStorage.setItem(storageKey, JSON.stringify([...discoveredMonsters]));
}

function safeIcon(monster) {
  return monster?.icon || "◈";
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

function getCurrentRegion() {
  const center = worldAt(canvas.clientWidth / 2, canvas.clientHeight / 2);

  return regions.find(region => {
    const b = region.bounds;
    return (
      center.x >= b.x &&
      center.x < b.x + b.width &&
      center.y >= b.y &&
      center.y < b.y + b.height
    );
  }) ?? regions[0];
}

function distanceToMonster(monster) {
  const center = worldAt(canvas.clientWidth / 2, canvas.clientHeight / 2);
  return Math.hypot(
    center.x - monster.position.x,
    center.y - monster.position.y
  );
}

function getNearestClueMonster() {
  const candidates = activeMonsters
    .filter(monster => !discoveredMonsters.has(monster.id))
    .filter(monster => monster.position.x || monster.position.y)
    .map(monster => ({ monster, distance: distanceToMonster(monster) }))
    .filter(item => item.distance <= item.monster.clueRadius)
    .sort((a, b) => a.distance - b.distance);

  return candidates[0]?.monster ?? null;
}

function showStatus(text, duration = 0) {
  status.textContent = text;

  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }

  if (duration > 0) {
    statusTimer = setTimeout(() => {
      updateExplorationStatus();
    }, duration);
  }
}

function updateExplorationStatus() {
  const region = getCurrentRegion();
  const clueMonster = getNearestClueMonster();

  // 玩家進入新的山海經地區時，先顯示地名。
  if (region.id !== lastRegionId) {
    lastRegionId = region.id;
    lastClueMonsterId = null;
    showStatus(`${region.name} · ${region.description}`, 2600);
    return;
  }

  // 尚未發現的妖獸靠近時，只提供線索，不揭露名稱。
  if (clueMonster) {
    const isClose = distanceToMonster(clueMonster) <= Math.max(90, clueMonster.clueRadius * 0.42);
    const clue = isClose ? clueMonster.closeClue : clueMonster.clue;

    if (clueMonster.id !== lastClueMonsterId) {
      lastClueMonsterId = clueMonster.id;
      showStatus(clue);
    } else if (statusTimer === null) {
      status.textContent = clue;
    }
    return;
  }

  lastClueMonsterId = null;
  status.textContent = `${region.name} · ${region.description}`;
}

function mountain(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size * 0.52, y - size * 0.9);
  ctx.lineTo(x + size, y);
  ctx.closePath();
  ctx.fill();
}

function draw(now = 0) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#86b7a3");
  sky.addColorStop(1, "#d5bf80");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  ctx.fillStyle = "#7c9b60";
  ctx.fillRect(0, 0, world.width, world.height);

  // 四個區域用非常淡的色塊區分，避免變成硬切的地圖。
  ctx.fillStyle = "rgba(58, 92, 75, .28)";
  ctx.fillRect(0, 0, 620, 1100);

  ctx.fillStyle = "rgba(48, 80, 67, .22)";
  ctx.fillRect(620, 0, 420, 1100);

  ctx.fillStyle = "rgba(225, 201, 127, .12)";
  ctx.fillRect(1040, 0, 320, 1100);

  ctx.fillStyle = "rgba(40, 65, 53, .16)";
  ctx.fillRect(1360, 0, 240, 1100);

  mountain(80, 390, 470, "#4d725d");
  mountain(420, 370, 570, "#456957");
  mountain(920, 410, 620, "#3b604f");
  mountain(1280, 360, 510, "#355847");

  ctx.strokeStyle = "#b8d6b6";
  ctx.lineWidth = 24;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-80, 870);
  ctx.bezierCurveTo(360, 630, 530, 1080, 890, 800);
  ctx.bezierCurveTo(1130, 610, 1340, 890, 1710, 630);
  ctx.stroke();

  for (let x = 120; x < world.width; x += 140) {
    const y = 680 + ((x * 37) % 210);

    ctx.fillStyle = "#254f3c";
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#163b2d";
    ctx.fillRect(x - 6, y + 10, 12, 48);
  }

  for (const monster of activeMonsters) {
    if (!monster.position.x && !monster.position.y) continue;

    const found = discoveredMonsters.has(monster.id);
    const distance = distanceToMonster(monster);

    // 只有接近時才顯示蹤跡，不直接顯示妖獸名稱。
    if (!found && distance <= monster.clueRadius && camera.zoom >= monster.clueZoom) {
      const pulse = 18 + Math.sin(now / 450 + monster.position.x) * 3;

      ctx.strokeStyle = "rgba(255,236,151,.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(monster.position.x, monster.position.y, pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,236,151,.9)";
      ctx.beginPath();
      ctx.arc(monster.position.x, monster.position.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 到達發現 Zoom 深度後才顯示可點擊的發現光圈。
    if (camera.zoom >= monster.discoveryZoom) {
      const pulse = 28 + Math.sin(now / 500 + monster.position.y) * 4;

      ctx.strokeStyle = found
        ? "rgba(255,236,151,.95)"
        : "rgba(255,236,151,.72)";

      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(monster.position.x, monster.position.y, pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = found ? "#ffe695" : "#fff0ae";
      ctx.beginPath();
      ctx.arc(monster.position.x, monster.position.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // 已發現後才顯示名字；未發現時絕不提前顯示。
      if (found) {
        ctx.fillStyle = "rgba(8,25,19,.78)";
        ctx.fillRect(
          monster.position.x - 78,
          monster.position.y + 48,
          156,
          38
        );

        ctx.fillStyle = "#fff4cf";
        ctx.font = "600 17px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(
          monster.name,
          monster.position.x,
          monster.position.y + 73
        );
      } else {
        ctx.fillStyle = "rgba(8,25,19,.78)";
        ctx.fillRect(
          monster.position.x - 60,
          monster.position.y + 48,
          120,
          34
        );

        ctx.fillStyle = "#fff4cf";
        ctx.font = "600 15px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(
          "異獸蹤跡",
          monster.position.x,
          monster.position.y + 70
        );
      }
    }
  }

  ctx.restore();

  updateExplorationStatus();
  requestAnimationFrame(draw);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  clampCamera();
  updateExplorationStatus();
}

new ResizeObserver(resizeCanvas).observe(canvas);

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

  if (pointers.size === 1) {
    startDrag(event, p);
  } else if (pointers.size === 2) {
    startPinch();
  }

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
    const distance = Math.max(
      Math.hypot(a.x - b.x, a.y - b.y),
      1
    );

    camera.zoom = Math.max(
      limits.min,
      Math.min(
        limits.max,
        pinch.zoom * (distance / pinch.distance)
      )
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
    }, 50);
  }
}

canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);

canvas.addEventListener("wheel", event => {
  event.preventDefault();

  const p = point(event);
  setZoom(
    camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1),
    p.x,
    p.y
  );
}, { passive: false });

document.querySelector(".zoom-controls").addEventListener("click", event => {
  const action = event.target.dataset.zoom;

  if (action === "in") {
    setZoom(camera.zoom * 1.2);
  }

  if (action === "out") {
    setZoom(camera.zoom / 1.2);
  }

  if (action === "reset") {
    camera.zoom = 1;
    camera.x = -360;
    camera.y = -250;
    clampCamera();
    updateZoomReadout();
    updateExplorationStatus();
  }
});

function renderCollection() {
  const found = monsters.filter(
    monster => discoveredMonsters.has(monster.id)
  ).length;

  collectionProgress.textContent =
    `${found} / ${monsters.length} 已發現`;

  collectionGrid.innerHTML = "";

  for (const monster of monsters) {
    const discovered = discoveredMonsters.has(monster.id);

    const item = document.createElement("div");
    item.className =
      `collection-item ${discovered ? "discovered" : "locked"}`;

    item.innerHTML = `
      <div class="monster-icon">${discovered ? safeIcon(monster) : "?"}</div>
      <div class="monster-name">
        ${discovered ? monster.name : "未發現妖獸"}
      </div>
      <div class="monster-meta">
        ${discovered ? monster.rarity : "探索青丘以解鎖"}
      </div>
    `;

    collectionGrid.appendChild(item);
  }
}

document.querySelector("#collection-button").addEventListener("click", () => {
  renderCollection();
  collectionModal.hidden = false;
});

document.querySelector("#collection-close").addEventListener("click", () => {
  collectionModal.hidden = true;
});

collectionModal.addEventListener("click", event => {
  if (event.target === collectionModal) {
    collectionModal.hidden = true;
  }
});

canvas.addEventListener("click", event => {
  if (suppressClick) return;

  const p = point(event);

  for (const monster of activeMonsters) {
    if (!monster.position.x && !monster.position.y) continue;
    if (camera.zoom < monster.discoveryZoom) continue;

    const screenX =
      camera.x + monster.position.x * camera.zoom;
    const screenY =
      camera.y + monster.position.y * camera.zoom;

    const hitRadius = Math.max(70, 55 * camera.zoom);

    if (
      Math.hypot(p.x - screenX, p.y - screenY) >= hitRadius
    ) {
      continue;
    }

    const firstDiscovery =
      !discoveredMonsters.has(monster.id);

    discoveredMonsters.add(monster.id);
    saveDiscovered();

    // 發現後立即切換狀態，不讓上一隻妖獸名稱殘留。
    lastClueMonsterId = null;
    showStatus(`發現${monster.name}！`);

    const popup = document.createElement("div");
    popup.className = "discovery-popup";

    popup.innerHTML = `
      <div class="discovery-icon">${safeIcon(monster)}</div>
      <div>
        <strong>發現${monster.name}！</strong>
        <span>已加入收藏圖鑑</span>
      </div>
    `;

    Object.assign(popup.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "14px 20px",
      borderRadius: "18px",
      background: "rgba(8,25,19,.94)",
      color: "#fff4cf",
      zIndex: "10",
      pointerEvents: "none",
      whiteSpace: "nowrap"
    });

    popup.querySelector(".discovery-icon").style.fontSize = "2.4rem";
    popup.querySelector("strong").style.display = "block";
    popup.querySelector("strong").style.fontSize = "1.2rem";
    popup.querySelector("span").style.display = "block";
    popup.querySelector("span").style.marginTop = "3px";
    popup.querySelector("span").style.color = "#b8c6ad";

    document
      .querySelector(".scene-frame")
      .appendChild(popup);

    setTimeout(() => popup.remove(), 1800);

    if (!firstDiscovery) {
      setTimeout(() => {
        updateExplorationStatus();
      }, 1800);
    }

    break;
  }
});

// 初始狀態
resizeCanvas();
camera.zoom = 1;
camera.x = -360;
camera.y = -250;
clampCamera();
updateZoomReadout();
updateExplorationStatus();
requestAnimationFrame(draw);
