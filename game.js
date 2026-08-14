import { monsters } from "./data/monsters.js";

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const readout = document.querySelector("#zoom-readout");
const status = document.querySelector("#location-status");

const world = { width: 1600, height: 1100 };
const camera = { x: -360, y: -250, zoom: 1 };
const limits = { min: 0.65, max: 2.8 };

const pointers = new Map();
let drag = null;
let pinch = null;
let suppressClick = false;

function point(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function worldAt(x, y) {
  return {
    x: (x - camera.x) / camera.zoom,
    y: (y - camera.y) / camera.zoom
  };
}

function viewportSize() {
  return {
    width: canvas.clientWidth,
    height: canvas.clientHeight
  };
}

/**
 * Keep the camera inside the world.
 * This prevents the player from seeing the empty area outside the map.
 */
function clampCamera() {
  const { width, height } = viewportSize();
  const mapWidth = world.width * camera.zoom;
  const mapHeight = world.height * camera.zoom;

  if (mapWidth <= width) {
    camera.x = (width - mapWidth) / 2;
  } else {
    camera.x = Math.min(0, Math.max(width - mapWidth, camera.x));
  }

  if (mapHeight <= height) {
    camera.y = (height - mapHeight) / 2;
  } else {
    camera.y = Math.min(0, Math.max(height - mapHeight, camera.y));
  }
}

function updateZoomReadout() {
  readout.textContent = Math.round(camera.zoom * 100) + "%";
}

/**
 * Zoom around a fixed screen point.
 * The world position under that point stays stable, which makes
 * pinch/scroll/button zoom feel much less jumpy.
 */
function setZoom(zoom, screenX = canvas.clientWidth / 2, screenY = canvas.clientHeight / 2) {
  const anchor = worldAt(screenX, screenY);

  camera.zoom = Math.max(limits.min, Math.min(limits.max, zoom));
  camera.x = screenX - anchor.x * camera.zoom;
  camera.y = screenY - anchor.y * camera.zoom;

  clampCamera();
  updateZoomReadout();
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

  const fox = monsters[0];
  const pulse = 40 + Math.sin(now / 500) * 5;

  ctx.strokeStyle = "rgba(255,236,151,.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(fox.position.x, fox.position.y, pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffe695";
  ctx.beginPath();
  ctx.arc(fox.position.x, fox.position.y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(8,25,19,.72)";
  ctx.fillRect(fox.position.x - 78, fox.position.y + 48, 156, 38);

  ctx.fillStyle = "#fff4cf";
  ctx.font = "600 17px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("妖獸蹤跡", fox.position.x, fox.position.y + 73);

  ctx.restore();

  requestAnimationFrame(draw);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  clampCamera();
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
  const distance = Math.hypot(a.x - b.x, a.y - b.y);

  pinch = {
    distance: Math.max(distance, 1),
    zoom: camera.zoom,
    centerX,
    centerY,
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
  }

  if (pointers.size === 2 && pinch) {
    const [a, b] = [...pointers.values()];
    const centerX = (a.x + b.x) / 2;
    const centerY = (a.y + b.y) / 2;
    const distance = Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1);

    const nextZoom = Math.max(
      limits.min,
      Math.min(limits.max, pinch.zoom * (distance / pinch.distance))
    );

    // Keep the same world position under the current two-finger center.
    camera.zoom = nextZoom;
    camera.x = centerX - pinch.worldCenter.x * camera.zoom;
    camera.y = centerY - pinch.worldCenter.y * camera.zoom;

    clampCamera();
    updateZoomReadout();
  }
});

function releasePointer(event) {
  pointers.delete(event.pointerId);

  if (pointers.size === 1) {
    // Rebuild the single-finger drag baseline so releasing one finger
    // does not cause the remaining finger to jump the camera.
    const [remaining] = [...pointers.values()];
    drag = {
      pointerId: [...pointers.keys()][0],
      startX: remaining.x,
      startY: remaining.y,
      cameraX: camera.x,
      cameraY: camera.y,
      moved: false
    };
    pinch = null;
  } else if (pointers.size === 0) {
    drag = null;
    pinch = null;
    canvas.classList.remove("is-dragging");

    // Allow a future tap after the current gesture has finished.
    setTimeout(() => {
      suppressClick = false;
    }, 50);
  }
}

canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);

canvas.addEventListener(
  "wheel",
  event => {
    event.preventDefault();

    const p = point(event);
    const factor = event.deltaY > 0 ? 0.9 : 1.1;

    setZoom(camera.zoom * factor, p.x, p.y);
  },
  { passive: false }
);

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
  }
});

canvas.addEventListener("click", event => {
  if (suppressClick) return;

  const p = point(event);
  const fox = monsters[0];

  const foxScreenX = camera.x + fox.position.x * camera.zoom;
  const foxScreenY = camera.y + fox.position.y * camera.zoom;

  const hitRadius = Math.max(70, 55 * camera.zoom);
  const distance = Math.hypot(
    p.x - foxScreenX,
    p.y - foxScreenY
  );

  if (distance < hitRadius) {
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
    message.style.pointerEvents = "none";

    document.querySelector(".scene-frame").appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 1800);
  }
});

status.textContent = monsters[0].region + " · " + monsters[0].hint;

resizeCanvas();
setZoom(1);
requestAnimationFrame(draw);
