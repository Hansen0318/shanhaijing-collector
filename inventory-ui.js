import { items, itemById } from "./data/items.js";
import {
  createProgressionState,
  applyFeed,
  equipEmpowerment,
  baseMonsterStats
} from "./data/progression.js";

const DEV_MODE = new URLSearchParams(location.search).get("dev") === "1";
const INVENTORY_KEY = "shanhaijing_inventory_v1";
const PROGRESSION_KEY = "shanhaijing_progression_v1";

const defaultInventory = {};
const defaultProgression = {};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

let inventory = DEV_MODE ? {} : load(INVENTORY_KEY, defaultInventory);
let progression = DEV_MODE ? {} : load(PROGRESSION_KEY, defaultProgression);

function save() {
  if (DEV_MODE) return;
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  localStorage.setItem(PROGRESSION_KEY, JSON.stringify(progression));
}

function ensureMonster(monsterId) {
  if (!progression[monsterId]) {
    progression[monsterId] = createProgressionState(monsterId);
  }
  return progression[monsterId];
}

function addItem(itemId, amount = 1) {
  if (!itemById[itemId]) return;
  inventory[itemId] = Math.min(
    (inventory[itemId] || 0) + amount,
    itemById[itemId].stackMax
  );
  save();
  render();
}

function consumeItem(itemId, amount = 1) {
  if ((inventory[itemId] || 0) < amount) return false;
  inventory[itemId] -= amount;
  if (inventory[itemId] <= 0) delete inventory[itemId];
  save();
  return true;
}

function render() {
  const grid = document.querySelector("#inventory-grid");
  const count = document.querySelector("#inventory-count");
  if (!grid) return;

  const owned = Object.entries(inventory);
  count.textContent = `${owned.length} 種物品`;

  grid.innerHTML = owned.length
    ? owned.map(([id, qty]) => {
        const item = itemById[id];
        return `<button class="inventory-item" type="button" data-item="${id}">
          <span class="inventory-icon">${item.icon}</span>
          <strong>${item.name}</strong>
          <small>${qty}</small>
        </button>`;
      }).join("")
    : `<div class="inventory-empty">目前還沒有收集到物品。</div>`;
}

function renderMonsterDetail(monsterId) {
  const state = ensureMonster(monsterId);
  const modal = document.querySelector("#monster-growth-modal");
  if (!modal || !state) return;

  const equipped = state.equipped.length
    ? state.equipped.map(e => `<li>✨ ${e.name}</li>`).join("")
    : "<li>尚未賦能</li>";

  modal.querySelector("#monster-growth-content").innerHTML = `
    <div class="growth-title">妖獸養成</div>
    <div>Lv.${state.level}　餵食 ${state.feedCount} 次</div>
    <div class="growth-stats">
      <span>感知 ${state.stats.perception}</span>
      <span>靈性 ${state.stats.spirit}</span>
      <span>速度 ${state.stats.speed}</span>
      <span>適應 ${state.stats.adaptability}</span>
    </div>
    <h4>已賦能</h4>
    <ul>${equipped}</ul>
  `;
  modal.hidden = false;
}

function installUI() {
  if (document.querySelector("#inventory-modal")) return;

  const style = document.createElement("style");
  style.textContent = `
    .inventory-modal,.monster-growth-modal{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.55);display:grid;place-items:end center;padding:12px}
    .inventory-modal[hidden],.monster-growth-modal[hidden]{display:none}
    .inventory-card,.monster-growth-card{width:min(100%,520px);max-height:82vh;overflow:auto;background:#f6efd9;border-radius:20px;padding:18px;box-shadow:0 14px 40px rgba(0,0,0,.28)}
    .inventory-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
    .inventory-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .inventory-item{min-height:92px;border:1px solid rgba(45,38,24,.16);border-radius:14px;background:#fffaf0;padding:8px;display:grid;place-items:center;cursor:pointer}
    .inventory-icon{font-size:30px}.inventory-item strong{font-size:12px}.inventory-item small{font-size:13px}
    .inventory-empty{text-align:center;padding:30px 10px;grid-column:1/-1;opacity:.65}
    .growth-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}
    .growth-stats span{background:#fffaf0;border-radius:10px;padding:10px}
    .inventory-open{position:fixed;right:12px;top:74px;z-index:20;border:0;border-radius:999px;padding:10px 13px;background:#f6efd9;box-shadow:0 4px 12px rgba(0,0,0,.15);font-size:16px}
    .dev-items{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.dev-items button{border:0;border-radius:8px;padding:7px 9px}
  `;
  document.head.appendChild(style);

  const inventoryModal = document.createElement("div");
  inventoryModal.id = "inventory-modal";
  inventoryModal.className = "inventory-modal";
  inventoryModal.hidden = true;
  inventoryModal.innerHTML = `
    <div class="inventory-card">
      <div class="inventory-head">
        <div><strong>🎒 物品背包</strong><div id="inventory-count">0 種物品</div></div>
        <button type="button" data-close-inventory>×</button>
      </div>
      <div id="inventory-grid" class="inventory-grid"></div>
      ${DEV_MODE ? `<div class="dev-items">
        ${items.map(i => `<button type="button" data-dev-item="${i.id}">＋${i.icon}${i.name}</button>`).join("")}
      </div>` : ""}
    </div>`;
  document.body.appendChild(inventoryModal);

  const growthModal = document.createElement("div");
  growthModal.id = "monster-growth-modal";
  growthModal.className = "monster-growth-modal";
  growthModal.hidden = true;
  growthModal.innerHTML = `
    <div class="monster-growth-card">
      <div id="monster-growth-content"></div>
      <button type="button" data-close-growth>關閉</button>
    </div>`;
  document.body.appendChild(growthModal);

  const button = document.createElement("button");
  button.className = "inventory-open";
  button.type = "button";
  button.textContent = "🎒";
  button.setAttribute("aria-label", "開啟物品背包");
  button.addEventListener("click", () => {
    inventoryModal.hidden = false;
    render();
  });
  document.body.appendChild(button);

  document.addEventListener("click", event => {
    const add = event.target.closest("[data-dev-item]");
    if (add) addItem(add.dataset.devItem, 1);

    if (event.target.closest("[data-close-inventory]")) inventoryModal.hidden = true;
    if (event.target.closest("[data-close-growth]")) growthModal.hidden = true;

    const itemButton = event.target.closest("[data-item]");
    if (itemButton) {
      const item = itemById[itemButton.dataset.item];
      const monsterId = "nine-tailed-fox";
      const state = ensureMonster(monsterId);

      if (item.effects?.feed?.[monsterId] || item.effects?.feed?.default) {
        if (confirm(`要把「${item.name}」餵給九尾狐嗎？`)) {
          const next = applyFeed(state, item, monsterId);
          if (next && consumeItem(item.id)) {
            progression[monsterId] = next;
            save();
            renderMonsterDetail(monsterId);
          }
        }
      } else if (item.effects?.empower?.[monsterId]) {
        if (confirm(`要將「${item.name}」賦能給九尾狐嗎？`)) {
          const next = equipEmpowerment(state, item, monsterId);
          if (next && consumeItem(item.id)) {
            progression[monsterId] = next;
            save();
            renderMonsterDetail(monsterId);
          }
        }
      }
    }
  });

  // 第一階段先用自訂事件接到現有探索系統。
  // 後續 game.js 接入採集時，只需 dispatch：
  // window.dispatchEvent(new CustomEvent("shanhaijing:item-collected",{detail:{itemId,amount}}))
  window.addEventListener("shanhaijing:item-collected", event => {
    const { itemId, amount = 1 } = event.detail || {};
    addItem(itemId, amount);
  });

  window.addEventListener("shanhaijing:open-monster-growth", event => {
    if (event.detail?.monsterId) renderMonsterDetail(event.detail.monsterId);
  });

  render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installUI);
} else {
  installUI();
}
