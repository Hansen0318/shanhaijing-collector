import { items, itemById } from "./data/items.js";
import { createProgressionState, applyFeed, equipEmpowerment, talentDefinitions } from "./data/progression.js";

const DEV_MODE = new URLSearchParams(location.search).get("dev") === "1";
const INVENTORY_KEY = "shanhaijing_inventory_v1";
const PROGRESSION_KEY = "shanhaijing_progression_v1";

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

let inventory = DEV_MODE ? {} : load(INVENTORY_KEY, {});
let progression = DEV_MODE ? {} : load(PROGRESSION_KEY, {});

function save() {
  if (DEV_MODE) return;
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  localStorage.setItem(PROGRESSION_KEY, JSON.stringify(progression));
}

function ensureMonster(monsterId) {
  if (!progression[monsterId]) progression[monsterId] = createProgressionState(monsterId);
  if (progression[monsterId] && !Array.isArray(progression[monsterId].talents)) {
    progression[monsterId].talents = createProgressionState(monsterId)?.talents || [];
  }
  return progression[monsterId];
}

function addItem(itemId, amount = 1) {
  if (!itemById[itemId]) return;
  inventory[itemId] = Math.min((inventory[itemId] || 0) + amount, itemById[itemId].stackMax);
  save();
  render();
}

function consumeItem(itemId) {
  if ((inventory[itemId] || 0) < 1) return false;
  inventory[itemId]--;
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
  grid.innerHTML = owned.length ? owned.map(([id, qty]) => {
    const item = itemById[id];
    return `<button class="inventory-item" type="button" data-item="${id}">
      <span class="inventory-icon">${item.icon}</span><strong>${item.name}</strong><small>${qty}</small>
    </button>`;
  }).join("") : `<div class="inventory-empty">目前還沒有收集到物品。</div>`;
}

const monsterNameToId = {
  "九尾狐": "nine-tailed-fox",
  "夫諸": "fu-zhu",
  "畢方": "bi-fang"
};

function renderMonsterDetail(monsterId) {
  const state = ensureMonster(monsterId);
  const modal = document.querySelector("#monster-growth-modal");
  if (!modal || !state) return;

  const innate = (state.talents || []).map(id => {
    const t = talentDefinitions[id];
    return t ? `<li><strong>${t.name}</strong><small>${t.description}</small></li>` : "";
  }).join("");

  const empowered = (state.equipped || []).map(e =>
    `<li><strong>${e.name || e.itemId}</strong><small>${e.description || "已安裝賦能效果。"}</small></li>`
  ).join("");

  modal.querySelector("#monster-growth-content").innerHTML = `
    <div class="growth-title">妖獸養成</div>
    <div>Lv.${state.level}　餵食 ${state.feedCount} 次</div>
    <div class="growth-section-title">技能</div>
    <ul class="monster-skill-list">${innate + empowered || "<li>尚未獲得技能</li>"}</ul>
    <div class="growth-section-title">能力值</div>
    <div class="growth-stats">
      <span>感知 ${state.stats.perception}</span><span>靈性 ${state.stats.spirit}</span>
      <span>速度 ${state.stats.speed}</span><span>適應 ${state.stats.adaptability}</span>
    </div>`;
  modal.hidden = false;
}

function enhanceCollectionCards() {
  const grid = document.querySelector("#collection-grid");
  if (!grid) return;

  grid.querySelectorAll(".collection-item.discovered").forEach(card => {
    if (card.querySelector(".monster-ability-panel")) return;
    const name = card.querySelector(".monster-name")?.textContent?.trim() || "";
    const monsterId = monsterNameToId[name];
    if (!monsterId) return;

    const state = ensureMonster(monsterId);
    const skills = (state.talents || []).map(id => talentDefinitions[id]?.name || id);
    const empowered = (state.equipped || []).map(e => e.name).filter(Boolean);
    const allSkills = [...skills, ...empowered];

    const panel = document.createElement("div");
    panel.className = "monster-ability-panel";
    panel.innerHTML = `
      <div class="monster-level">Lv.${state.level}</div>
      <div class="monster-card-skill-title">技能</div>
      <div class="monster-card-skills">
        ${allSkills.length ? allSkills.map(s => `<span>✦ ${s}</span>`).join("") : "<span>尚未獲得</span>"}
      </div>
      <div class="monster-stats">
        <span>感知 ${state.stats.perception}</span><span>靈性 ${state.stats.spirit}</span>
        <span>速度 ${state.stats.speed}</span><span>適應 ${state.stats.adaptability}</span>
      </div>`;
    card.appendChild(panel);
  });
}

function installUI() {
  if (document.querySelector("#inventory-modal")) return;

  const style = document.createElement("style");
  style.textContent = `
    .inventory-modal,.monster-growth-modal{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.55);display:grid;place-items:end center;padding:12px}
    .inventory-modal[hidden],.monster-growth-modal[hidden]{display:none}
    .inventory-card,.monster-growth-card{width:min(100%,520px);max-height:82vh;overflow:auto;background:#f6efd9;border-radius:20px;padding:18px}
    .inventory-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
    .inventory-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .inventory-item{min-height:92px;border:1px solid rgba(45,38,24,.16);border-radius:14px;background:#fffaf0;padding:8px;display:grid;place-items:center}
    .inventory-icon{font-size:30px}.inventory-item strong{font-size:12px}.inventory-item small{font-size:13px}
    .inventory-empty{text-align:center;padding:30px 10px;grid-column:1/-1;opacity:.65}
    .growth-section-title{margin:16px 0 7px;font-weight:800;color:#6e4e18}
    .growth-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 14px}
    .growth-stats span{background:#fffaf0;border-radius:10px;padding:10px}
    .monster-skill-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}
    .monster-skill-list li{background:#fffaf0;border-radius:10px;padding:9px 10px}
    .monster-skill-list strong{display:block}.monster-skill-list small{display:block;margin-top:3px;opacity:.72}
    .inventory-open{position:fixed;right:12px;top:74px;z-index:20;border:0;border-radius:999px;padding:10px 13px;background:#f6efd9}
    .dev-items{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.dev-items button{border:0;border-radius:8px;padding:7px 9px}
    .collection-item.discovered{position:relative;min-height:184px}
    .monster-ability-panel{margin-top:8px;padding-top:8px;border-top:1px solid rgba(225,191,110,.18)}
    .monster-level{color:#fff4cf;font:700 .76rem/1.2 system-ui;margin-bottom:6px}
    .monster-card-skill-title{color:#fff4cf;font:700 .68rem/1.2 system-ui;margin-bottom:4px}
    .monster-card-skills{display:flex;flex-wrap:wrap;gap:4px 7px;margin-bottom:7px}
    .monster-card-skills span{color:#c9d4ca;font:600 .63rem/1.2 system-ui}
    .monster-stats{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px}
    .monster-stats span{color:#b9c9bb;font:600 .63rem/1.2 system-ui;white-space:nowrap}
  `;
  document.head.appendChild(style);

  const inventoryModal = document.createElement("div");
  inventoryModal.id = "inventory-modal";
  inventoryModal.className = "inventory-modal";
  inventoryModal.hidden = true;
  inventoryModal.innerHTML = `
    <div class="inventory-card">
      <div class="inventory-head"><div><strong>🎒 物品背包</strong><div id="inventory-count">0 種物品</div></div><button type="button" data-close-inventory>×</button></div>
      <div id="inventory-grid" class="inventory-grid"></div>
      ${DEV_MODE ? `<div class="dev-items">${items.map(i => `<button type="button" data-dev-item="${i.id}">＋${i.icon}${i.name}</button>`).join("")}</div>` : ""}
    </div>`;
  document.body.appendChild(inventoryModal);

  const growthModal = document.createElement("div");
  growthModal.id = "monster-growth-modal";
  growthModal.className = "monster-growth-modal";
  growthModal.hidden = true;
  growthModal.innerHTML = `<div class="monster-growth-card"><div id="monster-growth-content"></div><button type="button" data-close-growth>關閉</button></div>`;
  document.body.appendChild(growthModal);

  const button = document.createElement("button");
  button.className = "inventory-open";
  button.type = "button";
  button.textContent = "🎒";
  button.addEventListener("click", () => { inventoryModal.hidden = false; render(); });
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
          if (next && consumeItem(item.id)) { progression[monsterId] = next; save(); renderMonsterDetail(monsterId); }
        }
      } else if (item.effects?.empower?.[monsterId]) {
        if (confirm(`要將「${item.name}」賦能給九尾狐嗎？`)) {
          const next = equipEmpowerment(state, item, monsterId);
          if (next && consumeItem(item.id)) { progression[monsterId] = next; save(); renderMonsterDetail(monsterId); }
        }
      }
    }
  });

  window.addEventListener("shanhaijing:item-collected", event => {
    const { itemId, amount = 1 } = event.detail || {};
    addItem(itemId, amount);
  });

  window.addEventListener("shanhaijing:open-monster-growth", event => {
    if (event.detail?.monsterId) renderMonsterDetail(event.detail.monsterId);
  });

  const collectionGrid = document.querySelector("#collection-grid");
  if (collectionGrid) {
    new MutationObserver(enhanceCollectionCards).observe(collectionGrid, {childList:true, subtree:true});
    enhanceCollectionCards();
  }
  render();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installUI);
else installUI();
