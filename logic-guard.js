import { items, itemById } from "./data/items.js";

const DEV_MODE = new URLSearchParams(location.search).get("dev") === "1";
const DISCOVERED_KEY = "shanhaijing-collector-discovered";

// 道具 UI 狀態：
// 0/0 = 尚未取得／已經餵食完／冷卻完成但尚未再次點擊。
// 0/1 = 地圖剛剛成功找到 1 個，但尚未在背包中選擇。
// 1/1 = 已選擇 1 個進入餵食／賦能操作。
// 這個狀態只控制顯示與操作階段；真正的 inventory 數量仍由 inventory-ui.js 管理。
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
  itemUiState.set(itemId, state);
  renderItemCounts(itemId);
}

function getItemState(itemId) {
  return itemUiState.get(itemId) || "empty";
}

function countText(itemId, actualQty = 0) {
  const state = getItemState(itemId);

  if (state === "found") return `0/${Math.max(1, actualQty)}`;
  if (state === "selected") return `${Math.max(1, actualQty)}/${Math.max(1, actualQty)}`;
  return "0/0";
}

function renderItemCounts(itemId) {
  const item = itemById[itemId];
  if (!item) return;

  const text = countText(itemId, itemUiState.get(itemId) === "found" ? 1 : 1);

  document.querySelectorAll(`[data-dev-count="${CSS.escape(itemId)}"]`).forEach(node => {
    node.textContent = `${item.icon}${item.name} ${text}`;
  });

  document.querySelectorAll(`[data-item="${CSS.escape(itemId)}"] small`).forEach(node => {
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
  // 清除舊測試收藏，避免歷史測試資料讓未捕捉妖獸出現在餵食選擇。
  localStorage.removeItem(DISCOVERED_KEY);
}

function guardDevItemAdd(event) {
  const button = event.target.closest("[data-dev-item]");
  if (!button) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  showGuardMessage("尚未擁有此道具，請先在地圖發現。");
}

function guardMapItemClick(event) {
  const canvas = event.target.closest("#game-canvas");
  if (!canvas) return;
  // game.js/discovery-engine.js 負責真正的座標與 discoveryZoom 判定。
  // 此 guard 不攔截地圖點擊，避免與既有 canvas click 發生雙重處理。
}

function onItemCollected(event) {
  const { itemId, amount = 1 } = event.detail || {};
  if (!itemById[itemId] || amount <= 0) return;

  // 地圖實際取得後，第一個狀態是 0/1。
  // 玩家尚未點擊背包道具前，不直接顯示成 1/1。
  setItemState(itemId, "found");
}

function onInventoryItemSelected(event) {
  const button = event.target.closest("[data-item]");
  if (!button) return;

  const itemId = button.dataset.item;
  if (!itemById[itemId]) return;

  // 只有已經從地圖取得的道具才能進入 1/1 選擇狀態。
  if (getItemState(itemId) !== "found") {
    event.preventDefault();
    event.stopImmediatePropagation();
    showGuardMessage("尚未擁有此道具，請先在地圖發現。");
    return;
  }

  setItemState(itemId, "selected");
}

function onFeedOrEmpowerSelected(event) {
  const button = event.target.closest("[data-feed-target], [data-empower-target]");
  if (!button) return;

  const itemId = button.dataset.itemId;
  if (!itemById[itemId]) return;

  // 已經進入 1/1 選擇狀態才允許進下一步。
  if (getItemState(itemId) !== "selected") {
    event.preventDefault();
    event.stopImmediatePropagation();
    showGuardMessage("請先選擇已取得的道具。");
  }
}

function onConfirmComplete(event) {
  const ok = event.target.closest("[data-confirm-ok]");
  if (!ok) return;

  const modal = document.querySelector("#use-confirm-modal");
  const itemId = modal?.dataset.itemId;
  if (!itemId || !itemById[itemId]) return;

  // inventory-ui.js 的確認事件在同一個 document listener 中會實際扣除道具。
  // 這裡在事件泡泡完成後更新顯示狀態。
  window.setTimeout(() => {
    setItemState(itemId, "empty");
  }, 0);
}

function install() {
  resetDevMonsterState();

  // 開發測試的 +1 不再直接增加道具。
  document.addEventListener("click", guardDevItemAdd, true);

  // 背包道具選擇、餵食、確認都使用 capture/bubble 配合既有 inventory-ui。
  document.addEventListener("click", onInventoryItemSelected, false);
  document.addEventListener("click", onFeedOrEmpowerSelected, false);
  document.addEventListener("click", onConfirmComplete, false);

  window.addEventListener("shanhaijing:item-collected", onItemCollected);

  const observer = new MutationObserver(() => renderAllItemCounts());
  observer.observe(document.body, { childList: true, subtree: true });

  renderAllItemCounts();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install);
} else {
  install();
}
