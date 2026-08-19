import { items, itemById } from './data/items.js';
import { createProgressionState, applyFeed, equipEmpowerment, talentDefinitions, baseMonsterStats } from './data/progression.js';

const DEV_MODE = new URLSearchParams(location.search).get('dev') === '1';
const INVENTORY_KEY = 'shanhaijing_inventory_v1';
const PROGRESSION_KEY = 'shanhaijing_progression_v1';
const DISCOVERED_KEY = 'shanhaijing-collector-discovered';

const monsterNames = {
  'nine-tailed-fox': '九尾狐',
  'fu-zhu': '夫諸',
  'bi-fang': '畢方'
};
const monsterIcons = {
  'nine-tailed-fox': '🦊',
  'fu-zhu': '🦌',
  'bi-fang': '🐦'
};
const statNames = { perception: '感知', spirit: '靈性', speed: '速度', adaptability: '適應' };

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

let inventory = DEV_MODE ? {} : load(INVENTORY_KEY, {});
let progression = DEV_MODE ? {} : load(PROGRESSION_KEY, {});
const discoveredMonsters = new Set(load(DISCOVERED_KEY, []));

function save() {
  if (DEV_MODE) return;
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  localStorage.setItem(PROGRESSION_KEY, JSON.stringify(progression));
}

function ensureMonster(monsterId) {
  if (!progression[monsterId]) progression[monsterId] = createProgressionState(monsterId);
  return progression[monsterId];
}

function addItem(itemId, amount = 1) {
  const item = itemById[itemId];
  if (!item) return;
  const current = inventory[itemId] || 0;
  const next = Math.min(current + amount, item.stackMax);
  if (next === current) return;
  inventory[itemId] = next;
  save();
  renderInventory();
}

function consumeItem(itemId) {
  if ((inventory[itemId] || 0) < 1) return false;
  inventory[itemId] -= 1;
  if (inventory[itemId] <= 0) delete inventory[itemId];
  save();
  return true;
}

function getEffect(item, monsterId, type) {
  return item?.effects?.[type]?.[monsterId] ?? item?.effects?.[type]?.default ?? null;
}

function syncDiscoveredFromCollection() {
  document.querySelectorAll('#collection-grid .collection-item.discovered .monster-name').forEach(node => {
    const id = Object.entries(monsterNames).find(([, name]) => name === node.textContent.trim())?.[0];
    if (id) discoveredMonsters.add(id);
  });
}

function getDiscoveredTargets(item) {
  syncDiscoveredFromCollection();
  return [...discoveredMonsters].filter(id => monsterNames[id] && (getEffect(item, id, 'feed') || getEffect(item, id, 'empower')));
}

function getBonuses(monsterId, state) {
  const base = baseMonsterStats[monsterId]?.stats;
  if (!base || !state?.stats) return {};
  return Object.fromEntries(Object.keys(base).map(key => [key, Math.max(0, (state.stats[key] ?? base[key]) - base[key])]));
}

function renderStatsPreview(monsterId, state, feedEffect = null) {
  const base = baseMonsterStats[monsterId]?.stats || {};
  const bonuses = getBonuses(monsterId, state);
  const preview = feedEffect || {};
  return Object.keys(base).map(key => {
    const baseValue = base[key];
    const currentBonus = bonuses[key] || 0;
    const extra = preview[key] || 0;
    const totalBonus = currentBonus + extra;
    return `<span>${statNames[key]} ${baseValue}${totalBonus ? ` <b class="stat-bonus">+${totalBonus}</b>` : ''}</span>`;
  }).join('');
}

function openItemUse(itemId) {
  const item = itemById[itemId];
  if (!item || !inventory[itemId]) return;
  const targets = getDiscoveredTargets(item);
  const modal = document.querySelector('#item-use-modal');
  if (!modal) return;

  modal.querySelector('[data-use-title]').textContent = `${item.icon} ${item.name}`;
  modal.querySelector('[data-use-description]').textContent = item.description;
  const list = modal.querySelector('[data-use-targets]');
  list.innerHTML = targets.length ? targets.map(id => {
    const state = ensureMonster(id);
    const feed = getEffect(item, id, 'feed');
    const empower = item.effects?.empower?.[id];
    const effectLabels = [];
    if (feed) effectLabels.push(`餵食 ${Object.entries(feed).map(([key, value]) => `${statNames[key] || key} +${value}`).join('、')}`);
    if (empower) effectLabels.push(`賦能 ${empower.name}`);
    return `<article class="use-target-card">
      <div class="use-target-head"><span class="use-target-icon">${monsterIcons[id] || '◈'}</span><strong>${monsterNames[id]}</strong></div>
      <div class="use-target-stats">${renderStatsPreview(id, state, null)}</div>
      <div class="use-target-effect">${effectLabels.join('　')}</div>
      <div class="use-target-actions">
        ${feed ? `<button type="button" data-feed-target="${id}" data-item-id="${item.id}">餵食</button>` : ''}
        ${empower ? `<button type="button" data-empower-target="${id}" data-item-id="${item.id}">賦能</button>` : ''}
      </div>
    </article>`;
  }).join('') : `<div class="use-empty">目前沒有已發現且適用於此道具的妖獸。</div>`;
  modal.hidden = false;
}

function openConfirm(itemId, monsterId, action) {
  const item = itemById[itemId];
  const state = ensureMonster(monsterId);
  const modal = document.querySelector('#use-confirm-modal');
  if (!item || !state || !modal) return;
  const effect = action === 'feed' ? getEffect(item, monsterId, 'feed') : null;
  const empowerment = action === 'empower' ? item.effects?.empower?.[monsterId] : null;
  modal.dataset.itemId = itemId;
  modal.dataset.monsterId = monsterId;
  modal.dataset.action = action;
  modal.querySelector('[data-confirm-title]').textContent = `${monsterIcons[monsterId] || '◈'} ${monsterNames[monsterId]}`;
  modal.querySelector('[data-confirm-item]').textContent = `${item.icon} ${item.name}`;
  modal.querySelector('[data-confirm-effect]').innerHTML = action === 'feed'
    ? `<div class="confirm-stats">${renderStatsPreview(monsterId, state, effect)}</div><p>確認餵食後，${item.name} ×1 會從背包消耗。</p>`
    : `<p>安裝「${empowerment?.name || item.name}」後，會消耗 ${item.name} ×1。</p>`;
  modal.hidden = false;
}

function closeModal(selector) {
  const modal = document.querySelector(selector);
  if (modal) modal.hidden = true;
}

function renderDevButtons() {
  document.querySelectorAll('[data-dev-item]').forEach(button => {
    const item = itemById[button.dataset.devItem];
    const qty = inventory[item.id] || 0;
    button.disabled = qty >= item.stackMax;
    button.textContent = `＋${item.icon}${item.name} ${qty}/${item.stackMax}`;
  });
}

function renderInventory() {
  const grid = document.querySelector('#inventory-grid');
  const count = document.querySelector('#inventory-count');
  if (!grid) return;
  const owned = Object.entries(inventory).filter(([, qty]) => qty > 0);
  if (count) count.textContent = `${owned.length} 種物品`;
  grid.innerHTML = owned.length ? owned.map(([id, qty]) => {
    const item = itemById[id];
    return `<button class="inventory-item" type="button" data-item="${id}">
      <span class="inventory-icon">${item.icon}</span><strong>${item.name}</strong><small>${qty}/${item.stackMax}</small>
    </button>`;
  }).join('') : `<div class="inventory-empty">目前還沒有收集到物品。</div>`;
  renderDevButtons();
}

function renderMonsterGrowth(monsterId) {
  const state = ensureMonster(monsterId);
  const modal = document.querySelector('#monster-growth-modal');
  if (!modal || !state) return;
  const innate = (state.talents || []).map(id => {
    const talent = talentDefinitions[id];
    return talent ? `<li><strong>${talent.name}</strong><small>${talent.description}</small></li>` : '';
  }).join('');
  const empowered = (state.equipped || []).map(e => `<li><strong>${e.name || e.itemId}</strong><small>${e.description || '已安裝賦能效果。'}</small></li>`).join('');
  modal.querySelector('#monster-growth-content').innerHTML = `
    <div class="growth-title">妖獸養成</div>
    <div class="growth-level">Lv.${state.level}　餵食 ${state.feedCount} 次</div>
    <div class="growth-section-title">技能</div>
    <ul class="monster-skill-list">${innate + empowered || '<li>尚未獲得技能</li>'}</ul>
    <div class="growth-section-title">能力值</div>
    <div class="growth-stats">${renderStatsPreview(monsterId, state)}</div>`;
  modal.hidden = false;
}

function enhanceCollectionCards() {
  const grid = document.querySelector('#collection-grid');
  if (!grid) return;
  grid.querySelectorAll('.collection-item.discovered').forEach(card => {
    const name = card.querySelector('.monster-name')?.textContent?.trim() || '';
    const id = Object.entries(monsterNames).find(([, value]) => value === name)?.[0];
    if (!id) return;
    const state = ensureMonster(id);
    const skills = (state.talents || []).map(t => talentDefinitions[t]?.name || t);
    const empowered = (state.equipped || []).map(e => e.name).filter(Boolean);
    const panel = card.querySelector('.monster-ability-panel') || document.createElement('div');
    panel.className = 'monster-ability-panel';
    panel.innerHTML = `
      <div class="monster-level">Lv.${state.level}</div>
      <div class="monster-card-skill-title">技能</div>
      <div class="monster-card-skills">${[...skills, ...empowered].map(s => `<span>✦ ${s}</span>`).join('') || '<span>尚未獲得</span>'}</div>
      <div class="monster-stats">${renderStatsPreview(id, state)}</div>`;
    if (!panel.parentElement) card.appendChild(panel);
  });
}

function injectStyles() {
  if (document.querySelector('#inventory-ui-style')) return;
  const style = document.createElement('style');
  style.id = 'inventory-ui-style';
  style.textContent = `
    .header-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-shrink:0}.header-actions .collection-button{white-space:nowrap}.inventory-modal,.monster-growth-modal,.item-use-modal,.use-confirm-modal{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.62);display:grid;place-items:end center;padding:12px;backdrop-filter:blur(3px)}
    .inventory-modal[hidden],.monster-growth-modal[hidden],.item-use-modal[hidden],.use-confirm-modal[hidden]{display:none}
    .inventory-card,.monster-growth-card,.item-use-card,.use-confirm-card{width:min(100%,520px);max-height:84vh;overflow:auto;background:#f6efd9;color:#3b321f;border-radius:20px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
    .inventory-head,.use-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.inventory-head strong{font-size:1.1rem}.inventory-head button,.use-head button{width:38px;height:38px;border:0;border-radius:50%;background:#20251f;color:#fff;font-size:1.3rem}
    .inventory-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.inventory-item{min-height:100px;border:1px solid rgba(45,38,24,.2);border-radius:14px;background:#fffaf0;color:#3b321f;padding:8px;display:grid;place-items:center;cursor:pointer}.inventory-icon{font-size:30px}.inventory-item strong{font-size:12px}.inventory-item small{font-size:12px;font-weight:700}.inventory-empty{text-align:center;padding:30px 10px;grid-column:1/-1;opacity:.65}
    .item-use-card p,.use-confirm-card p{margin:5px 0;color:#6c6047}.use-targets{display:grid;gap:10px}.use-target-card{background:#fffaf0;border-radius:14px;padding:12px;border:1px solid rgba(65,53,29,.15)}.use-target-head{display:flex;align-items:center;gap:8px;font-size:1rem}.use-target-icon{font-size:1.7rem}.use-target-stats,.confirm-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:9px 0}.use-target-stats span,.confirm-stats span{background:#f0e8cf;border-radius:8px;padding:7px;color:#3b321f;font-weight:700}.stat-bonus{color:#b34b20;font-weight:900;margin-left:2px}.use-target-effect{font-size:.78rem;color:#6d5a31;margin:6px 0}.use-target-actions{display:flex;gap:8px}.use-target-actions button,.confirm-actions button{border:0;border-radius:10px;padding:9px 13px;background:#183b31;color:#fff4cf;font-weight:800;cursor:pointer}.confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.confirm-actions button[data-confirm-cancel]{background:#77705f}.use-empty{text-align:center;padding:25px;color:#6c6047}
    .growth-title{font-size:1.2rem;font-weight:900;color:#5c451d}.growth-level{margin-top:4px;color:#66583d}.growth-section-title{margin:16px 0 7px;font-weight:900;color:#5c451d}.growth-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 14px}.growth-stats span{background:#fffaf0;border-radius:10px;padding:10px;color:#3b321f;font-weight:800}.monster-skill-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}.monster-skill-list li{background:#fffaf0;border-radius:10px;padding:10px}.monster-skill-list strong{display:block;color:#3b321f}.monster-skill-list small{display:block;margin-top:3px;color:#66583d}
    .monster-ability-panel{margin-top:8px;padding-top:8px;border-top:1px solid rgba(225,191,110,.24)}.monster-level{color:#fff4cf;font:700 .76rem/1.2 system-ui;margin-bottom:6px}.monster-card-skill-title{color:#fff4cf;font:700 .7rem/1.2 system-ui;margin-bottom:4px}.monster-card-skills{display:flex;flex-wrap:wrap;gap:4px 7px;margin-bottom:7px}.monster-card-skills span{color:#d9e4db;font:700 .65rem/1.2 system-ui}.monster-stats{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px}.monster-stats span{color:#dce7df;font:700 .66rem/1.2 system-ui;white-space:nowrap}
    .dev-items{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.dev-items button{border:0;border-radius:8px;padding:7px 9px;background:#ded5bc;color:#3b321f}.dev-items button:disabled{opacity:.45;cursor:not-allowed}
  `;
  document.head.appendChild(style);
}

function installUI() {
  if (document.querySelector('#inventory-modal')) return;
  injectStyles();

  const inventoryModal = document.createElement('div');
  inventoryModal.id = 'inventory-modal';
  inventoryModal.className = 'inventory-modal';
  inventoryModal.hidden = true;
  inventoryModal.innerHTML = `<div class="inventory-card" role="dialog" aria-modal="true" aria-labelledby="inventory-title">
    <div class="inventory-head"><div><strong id="inventory-title">🎒 物品背包</strong><div id="inventory-count">0 種物品</div></div><button type="button" data-close-modal="inventory-modal" aria-label="關閉">×</button></div>
    <div id="inventory-grid" class="inventory-grid"></div>
    ${DEV_MODE ? `<div class="dev-items">${items.map(i => `<button type="button" data-dev-item="${i.id}">＋${i.icon}${i.name}</button>`).join('')}</div>` : ''}
  </div>`;
  document.body.appendChild(inventoryModal);

  const useModal = document.createElement('div');
  useModal.id = 'item-use-modal';
  useModal.className = 'item-use-modal';
  useModal.hidden = true;
  useModal.innerHTML = `<div class="item-use-card" role="dialog" aria-modal="true"><div class="use-head"><div><strong data-use-title></strong><p data-use-description></p></div><button type="button" data-close-modal="item-use-modal" aria-label="關閉">×</button></div><div class="use-targets" data-use-targets></div></div>`;
  document.body.appendChild(useModal);

  const confirmModal = document.createElement('div');
  confirmModal.id = 'use-confirm-modal';
  confirmModal.className = 'use-confirm-modal';
  confirmModal.hidden = true;
  confirmModal.innerHTML = `<div class="use-confirm-card" role="dialog" aria-modal="true"><div class="use-head"><strong data-confirm-title></strong><button type="button" data-close-modal="use-confirm-modal" aria-label="關閉">×</button></div><div><strong data-confirm-item></strong><div data-confirm-effect></div></div><div class="confirm-actions"><button type="button" data-confirm-cancel>取消</button><button type="button" data-confirm-ok>確認</button></div></div>`;
  document.body.appendChild(confirmModal);

  const growthModal = document.createElement('div');
  growthModal.id = 'monster-growth-modal';
  growthModal.className = 'monster-growth-modal';
  growthModal.hidden = true;
  growthModal.innerHTML = `<div class="monster-growth-card" role="dialog" aria-modal="true"><div id="monster-growth-content"></div><button type="button" data-close-modal="monster-growth-modal">關閉</button></div>`;
  document.body.appendChild(growthModal);

  const openButton = document.querySelector('#inventory-button');
  openButton?.addEventListener('click', () => { inventoryModal.hidden = false; renderInventory(); });

  document.addEventListener('click', event => {
    const dev = event.target.closest('[data-dev-item]');
    if (dev) addItem(dev.dataset.devItem, 1);

    const itemButton = event.target.closest('[data-item]');
    if (itemButton) openItemUse(itemButton.dataset.item);

    const feed = event.target.closest('[data-feed-target]');
    if (feed) openConfirm(feed.dataset.itemId, feed.dataset.feedTarget, 'feed');

    const empower = event.target.closest('[data-empower-target]');
    if (empower) openConfirm(empower.dataset.itemId, empower.dataset.empowerTarget, 'empower');

    const ok = event.target.closest('[data-confirm-ok]');
    if (ok) {
      syncDiscoveredFromCollection();
      const modal = document.querySelector('#use-confirm-modal');
      const itemId = modal.dataset.itemId;
      const monsterId = modal.dataset.monsterId;
      const action = modal.dataset.action;
      const item = itemById[itemId];
      const state = ensureMonster(monsterId);
      let next = null;
      if (action === 'feed') next = applyFeed(state, item, monsterId);
      if (action === 'empower') next = equipEmpowerment(state, item, monsterId);
      if (next && consumeItem(itemId)) {
        progression[monsterId] = next;
        save();
        closeModal('#use-confirm-modal');
        closeModal('#item-use-modal');
        renderInventory();
        enhanceCollectionCards();
        renderMonsterGrowth(monsterId);
      }
    }

    const close = event.target.closest('[data-close-modal]');
    if (close) closeModal(`#${close.dataset.closeModal}`);
  });

  for (const id of ['inventory-modal','item-use-modal','use-confirm-modal','monster-growth-modal']) {
    document.querySelector(`#${id}`)?.addEventListener('click', event => {
      if (event.target.id === id) event.target.hidden = true;
    });
  }

  window.addEventListener('shanhaijing:item-collected', event => {
    const { itemId, amount = 1 } = event.detail || {};
    addItem(itemId, amount);
  });
  window.addEventListener('shanhaijing:monster-discovered', event => {
    if (event.detail?.monsterId) discoveredMonsters.add(event.detail.monsterId);
  });
  window.addEventListener('shanhaijing:open-monster-growth', event => {
    if (event.detail?.monsterId) renderMonsterGrowth(event.detail.monsterId);
  });

  const collectionGrid = document.querySelector('#collection-grid');
  if (collectionGrid) {
    new MutationObserver(() => { syncDiscoveredFromCollection(); enhanceCollectionCards(); }).observe(collectionGrid, { childList: true, subtree: true });
    syncDiscoveredFromCollection();
    enhanceCollectionCards();
  }
  renderInventory();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installUI);
else installUI();
