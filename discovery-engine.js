import { getItemDiscoverySpots } from "./data/discoveries.js";

const DEV_MODE = new URLSearchParams(location.search).get("dev") === "1";
const STORAGE_KEY = "shanhaijing-item-discovery-cooldowns-v1";

function normalizeTimestamp(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric < 100000000000 ? numeric * 1000 : numeric;
}

/*
 * game.js 的 draw(now) 使用 requestAnimationFrame timestamp。
 * rAF timestamp 是 performance timeline，不是 Date.now() 的 Unix timestamp。
 * 因此不能直接拿它和 localStorage 裡的 Unix timestamp 相減。
 */
function normalizeNow(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return Date.now();
  }

  // Unix timestamp（毫秒）目前約為 1.7e12。
  if (numeric >= 100000000000) {
    return numeric;
  }

  // requestAnimationFrame / performance.now() 時間基準。
  return Date.now();
}

function loadCooldowns() {
  if (DEV_MODE) return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw || "{}");

    if (!parsed || typeof parsed !== "object") return {};

    const normalized = {};

    for (const [spotId, value] of Object.entries(parsed)) {
      const timestamp = normalizeTimestamp(value);
      if (timestamp > 0) normalized[spotId] = timestamp;
    }

    return normalized;
  } catch {
    return {};
  }
}

let cooldowns = loadCooldowns();

function saveCooldowns() {
  if (!DEV_MODE) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cooldowns));
  }
}

export function getDiscoverySpots(mapId) {
  return getItemDiscoverySpots(mapId);
}

export function getRemainingMs(spotId, now = Date.now()) {
  const until = normalizeTimestamp(cooldowns[spotId]);
  const current = normalizeNow(now);

  return Math.max(0, until - current);
}

export function isDiscoveryAvailable(spotId, now = Date.now()) {
  return getRemainingMs(spotId, now) <= 0;
}

export function collectDiscovery(spot, now = Date.now()) {
  if (!spot || spot.active === false) {
    return { ok: false, reason: "inactive" };
  }

  const current = normalizeNow(now);
  const remaining = getRemainingMs(spot.id, current);

  if (remaining > 0) {
    return {
      ok: false,
      reason: "cooldown",
      remainingMs: remaining
    };
  }

  const cooldownMs = Number(spot.cooldownMs || 60000);
  const amount = Math.max(1, Number(spot.quantity || 1));

  // 只有玩家實際點擊並成功取得後，才建立下一次冷卻。
  // 冷卻完成只代表「可以再次點擊」，不會自動增加背包數量。
  cooldowns[spot.id] = current + cooldownMs;
  saveCooldowns();

  window.dispatchEvent(new CustomEvent("shanhaijing:item-collected", {
    detail: {
      itemId: spot.itemId,
      amount,
      discoveryId: spot.id,
      cooldownMs
    }
  }));

  return {
    ok: true,
    itemId: spot.itemId,
    amount,
    cooldownMs
  };
}

export function resetDiscoveryCooldowns() {
  cooldowns = {};
  saveCooldowns();
}

export function formatCooldown(ms) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${seconds}s`;
}

/*
 * game.js 目前把「尋寶」與「冷卻 Xs」直接畫在 canvas 的 world transform
 * 裡，所以地圖放大時文字也會跟著放大。
 *
 * 這裡只處理這兩種尋寶 UI 文字：
 *   1. 「尋寶」
 *   2. 「冷卻 Xs」
 *
 * 文字位置仍使用 game.js 原本計算出的世界座標，
 * 但實際繪製時切換成固定 screen-space 字體大小。
 *
 * 地圖上的尋寶圖示、冷卻圓圈、妖獸標記等其他 canvas 繪圖完全不攔截。
 */
function installDiscoveryCanvasLabelGuard() {
  if (typeof window === "undefined") return;
  if (window.__shanhaijingDiscoveryLabelGuardInstalled) return;

  const CanvasRenderingContext2DClass = window.CanvasRenderingContext2D;

  if (!CanvasRenderingContext2DClass?.prototype) return;

  const originalFillText = CanvasRenderingContext2DClass.prototype.fillText;

  CanvasRenderingContext2DClass.prototype.fillText = function(text, x, y, ...rest) {
    const label = String(text);

    if (label !== "尋寶" && !label.startsWith("冷卻 ")) {
      return originalFillText.call(this, text, x, y, ...rest);
    }

    const transform = this.getTransform?.();
    const canvasElement = this.canvas;

    if (!transform || !canvasElement) {
      return originalFillText.call(this, text, x, y, ...rest);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 將目前 world/camera transform 下的座標轉成 screen-space。
    const screenX =
      (transform.a * x + transform.c * y + transform.e) / dpr;

    const screenY =
      (transform.b * x + transform.d * y + transform.f) / dpr;

    this.save();

    // 回到 game.js resizeCanvas 建立的基礎 DPR transform。
    this.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.fillStyle = label === "尋寶"
      ? "#fff4cf"
      : "#d6ddd7";

    this.font = label === "尋寶"
      ? "700 12px system-ui"
      : "700 13px system-ui";

    this.textAlign = "center";
    this.textBaseline = "alphabetic";

    originalFillText.call(
      this,
      text,
      screenX,
      screenY,
      ...rest
    );

    this.restore();
  };

  window.__shanhaijingDiscoveryLabelGuardInstalled = true;
}

installDiscoveryCanvasLabelGuard();
