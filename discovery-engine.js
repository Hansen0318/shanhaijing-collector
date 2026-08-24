import { getItemDiscoverySpots } from "./data/discoveries.js";

const DEV_MODE = new URLSearchParams(location.search).get("dev") === "1";
const STORAGE_KEY = "shanhaijing-item-discovery-cooldowns-v1";

function normalizeTimestamp(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric < 100000000000 ? numeric * 1000 : numeric;
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
  return Math.max(0, until - now);
}

export function isDiscoveryAvailable(spotId, now = Date.now()) {
  return getRemainingMs(spotId, now) <= 0;
}

export function collectDiscovery(spot, now = Date.now()) {
  if (!spot || spot.active === false) {
    return { ok: false, reason: "inactive" };
  }

  const remaining = getRemainingMs(spot.id, now);
  if (remaining > 0) {
    return { ok: false, reason: "cooldown", remainingMs: remaining };
  }

  const cooldownMs = Number(spot.cooldownMs || 60000);
  const amount = Math.max(1, Number(spot.quantity || 1));

  // 只有玩家實際點擊並成功取得後，才建立下一次冷卻。
  cooldowns[spot.id] = now + cooldownMs;
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
