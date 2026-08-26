import { getItemDiscoverySpots } from "./data/discoveries.js";
import { itemById } from "./data/items.js";

const DEV_MODE = new URLSearchParams(location.search).get("dev") === "1";
const STORAGE_KEY = "shanhaijing-item-discovery-cooldowns-v1";

function normalizeTimestamp(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric < 100000000000 ? numeric * 1000 : numeric;
}

function normalizeNow(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return Date.now();
  if (numeric >= 100000000000) return numeric;
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
  if (!DEV_MODE) localStorage.setItem(STORAGE_KEY, JSON.stringify(cooldowns));
}

export function getDiscoverySpots(mapId) { return getItemDiscoverySpots(mapId); }
export function getRemainingMs(spotId, now = Date.now()) {
  const until = normalizeTimestamp(cooldowns[spotId]);
  return Math.max(0, until - normalizeNow(now));
}
export function isDiscoveryAvailable(spotId, now = Date.now()) { return getRemainingMs(spotId, now) <= 0; }

function getCurrentZoom() {
  const text = document.querySelector("#zoom-readout")?.textContent || "";
  const percent = Number.parseFloat(text);
  return Number.isFinite(percent) ? percent / 100 : 1;
}
function getRequiredZoom(spot) {
  const value = Number(spot?.discoveryZoom);
  return Number.isFinite(value) && value > 0 ? value : 1;
}
export function collectDiscovery(spot, now = Date.now()) {
  if (!spot || spot.active === false) return { ok: false, reason: "inactive" };
  const currentZoom = getCurrentZoom();
  const requiredZoom = getRequiredZoom(spot);
  if (currentZoom < requiredZoom) {
    const status = document.querySelector("#location-status");
    if (status) status.textContent = `請放大至 ${Math.round(requiredZoom * 100)}% 才能尋寶。`;
    return { ok: false, reason: "zoom", currentZoom, requiredZoom };
  }
  const current = normalizeNow(now);
  const remaining = getRemainingMs(spot.id, current);
  if (remaining > 0) return { ok: false, reason: "cooldown", remainingMs: remaining };
  const cooldownMs = Number(spot.cooldownMs || 60000);
  const amount = Math.max(1, Number(spot.quantity || 1));
  const item = itemById[spot.itemId];
  cooldowns[spot.id] = current + cooldownMs;
  saveCooldowns();
  window.dispatchEvent(new CustomEvent("shanhaijing:item-collected", { detail: {
    itemId: spot.itemId, itemName: item?.name || spot.itemId, itemIcon: item?.icon || "✦",
    amount, discoveryId: spot.id, cooldownMs
  }}));
  return { ok: true, itemId: spot.itemId, itemName: item?.name || spot.itemId, itemIcon: item?.icon || "✦", amount, cooldownMs };
}
export function resetDiscoveryCooldowns() { cooldowns = {}; saveCooldowns(); }
export function formatCooldown(ms) { const seconds = Math.ceil(Math.max(0, ms) / 1000); return `${seconds}s`; }
