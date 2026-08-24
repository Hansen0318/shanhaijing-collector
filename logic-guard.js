import { items, itemById } from "./data/items.js";

const DEV_MODE = new URLSearchParams(location.search).get("dev") === "1";
const DISCOVERED_KEY = "shanhaijing-collector-discovered";
const INVENTORY_KEY = "shanhaijing_inventory_v1";

// 道具 UI 狀態：
// empty    = 0/0：尚未取得、已餵食完、或冷卻完成但尚未再次點擊。
// found    = 0/1：地圖實際點擊並取得 1 個，但尚未選擇餵食／賦能。
// selected = 1/1：玩家已選擇 1 個進入餵食／賦能操作。
// 真正 inventory 數量仍由 inventory-ui.js 管理。
const itemUiState = new Map();

function showGuardMessage(message) {
  const status = document.querySelector("#location-status");
  if (!status) return;
  const previous = status.textContent;
  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) status.textContent = previous;
  }, 1800);
}

function setItemState(itemId, state) {
  if (!itemById[itemId]) return;
  itemUiState.set(itemId, state);
  renderItemCounts(itemId);
}

function getItemState(itemId) {
  return itemUiState.get(itemId) || "empty";
}

function hasPersistentInventory(itemId) {
  if (DEV_MODE) return false;
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    const inventory = raw ? JSON.parse(raw) : {};
    return Number(inventory?.[itemId] || 0) > 0;
  } catch {
    return false;
  }
}

function countText(itemId) {
  switch (getItemState(itemId)) {
    case "found":
      return "0/1";
    case "selected":
      return "1/1";
    default:
      return "0/0";
  }
}

function renderItemCounts(itemId) {
  const item = itemById[itemId];
  if (!item) return;

  const text = countText(itemId);
  const escapedId = typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(itemId)
    : itemId.replace(/[^a-zA-Z0-9_-]/g, "\\$&");

  document.querySelectorAll(`[data-dev-count="${escapedId}"]`).forEach(node => {
    node.textContent = `${item.icon}${item.name} ${text}`;
  });

  document.querySelectorAll(`[data-item="${escapedId}"] small`).forEach(node => {
    node.textContent = text;
  });

  const useModal = document.querySelector("#item-use-modal");
  if (useModal?.dataset.itemId === itemId) {
    const description = useModal.querySelector("[data-use-description]");
    if (description) {
      description.textContent = `${item.description}　持有 ${text}`;
    }
  }
}

function renderAllItemCounts() {
  for (const item of items) renderItemCounts(item.id);
}

function resetDevMonsterState() {
  if (!DEV_MODE) return;
  localStorage.removeItem(DISCOVERED_KEY);
}

function guardDevItemAdd(event) {
  const button = event.target.closest("[data-dev-item]");
  if (!button) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  showGuardMessage("尚未擁有此道具，請先在地圖發現。");
}

function onItemCollected(event) {
  const { itemId, amount = 1 } = event.detail || {};
  if (!itemById[itemId] || Number(amount) <= 0) return;
  setItemState(itemId, "found");
}

function onInventoryItemSelected(event) {
  const button = event.target.closest("[data-item]");
  if (!button) return;

  const itemId = button.dataset.item;
  if (!itemById[itemId]) return;

  if (getItemState(itemId) !== "found" && !hasPersistentInventory(itemId)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showGuardMessage("尚未擁有此道具，請先在地圖發現。");
    return;
  }

  setItemState(itemId, "selected");
}

function onConfirmComplete(event) {
  const ok = event.target.closest("[data-confirm-ok]");
  if (!ok) return;

  const modal = document.querySelector("#use-confirm-modal");
  const itemId = modal?.dataset.itemId;
  if (!itemId || !itemById[itemId]) return;

  window.setTimeout(() => {
    setItemState(itemId, "empty");
  }, 0);
}

function install() {
  resetDevMonsterState();

  // DEV +1 不可直接產生道具；必須從地圖取得。
  document.addEventListener("click", guardDevItemAdd, true);

  // 這些 listener 只在實際互動時更新狀態。
  // 不使用 MutationObserver，避免修改文字節點又觸發自身造成無限迴圈。
  document.addEventListener("click", onInventoryItemSelected, false);
  document.addEventListener("click", onConfirmComplete, false);
  window.addEventListener("shanhaijing:item-collected", onItemCollected);

  renderAllItemCounts();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install, { once: true });
} else {
  install();
}
