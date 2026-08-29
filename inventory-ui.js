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

const statNames = {
  perception: '感知',
  spirit: '靈性',
  speed: '速度',
  adaptability: '適應'
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

let inventory = DEV_MODE ? {} : load(INVENTORY_KEY, {});
let progression = DEV_MODE ? {} : load(PROGRESSION_KEY, {});
const discoveredMonsters = new Set();
const selectedCounts = new Map();

function save() {
  if (DEV_MODE) return;
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  localStorage.setItem(PROGRESSION_KEY, JSON.stringify(progression));
}

function refreshDiscovered() {
  discoveredMonsters.clear();
  const raw = load(DISCOVERED_KEY, []);
  if (Array.isArray(raw)) {
    raw.forEach(id => discoveredMonsters.add(id));
  }
}

function syncDiscoveredFromCollection() {
  const grid = document.querySelector('#collection-grid');
  if (!grid) return;

  grid.querySelectorAll('.collection-item.discovered .monster-name').forEach(node => {
    const name = node.textContent.trim();
    const id = Object.entries(monsterNames).find(([, value]) => value === name)?.[0];
    if (id) discoveredMonsters.add(id);
  });
}

function syncDiscovered() {
  refreshDiscovered();
  syncDiscoveredFromCollection();
}

function ensureMonster(monsterId) {
  syncDiscovered();
  if (!discoveredMonsters.has(monsterId)) return null;
  if (!progression[monsterId]) {
    progression[monsterId] = createProgressionState(monsterId);
  }
  return progression[monsterId];
}

/*
 * Inventory state model:
 *   owned    = real quantity currently in the backpack
 *   selected = quantity currently selected for use
 *
 * stackMax is only a hard cap. It is NEVER the displayed denominator.
 */
function getOwned(itemId) {
  return Math.max(0, Number(inventory[itemId] || 0));
}

function getSelected(itemId) {
  return Math.max(0, Number(selectedCounts.get(itemId) || 0));
}

function setSelected(itemId, value) {
  const owned = getOwned(itemId);
  const next = Math.max(
    0,
    Math.min(Math.floor(Number(value) || 0), owned)
  );

  selectedCounts.set(itemId, next);
  renderInventory();
}

function adjustSelected(itemId, delta) {
  setSelected(itemId, getSelected(itemId) + delta);
}

function resetSelected(itemId) {
  selectedCounts.set(itemId, 0);
}

function countText(itemId) {
  return `${getSelected(itemId)}/${getOwned(itemId)}`;
}

function addItem(itemId) {
  if (!DEV_MODE) return;

  const item = itemById[itemId];
  if (!item) return;

  // DEV + simulates selection only. It does NOT change real inventory.
  adjustSelected(itemId, +1);
}

function removeItem(itemId) {
  if (!DEV_MODE) return;

  // DEV - cancels selection only. It does NOT change real inventory.
  adjustSelected(itemId, -1);
}

function collectItem(itemId, amount = 1) {
  const item = itemById[itemId];
  if (!item || amount <= 0) return;

  const current = getOwned(itemId);
  const next = Math.min(current + amount, item.stackMax);

  if (next === current) return;

  inventory[itemId] = next;

  // Newly collected items are never auto-selected.
  resetSelected(itemId);

  save();
  renderInventory();
}

function consumeItem(itemId) {
  if (getOwned(itemId) < 1) return false;

  const next = getOwned(itemId) - 1;

  if (next > 0) inventory[itemId] = next;
  else delete inventory[itemId];

  // The consumed item is no longer selected.
  resetSelected(itemId);

  save();
  renderInventory();
  return true;
}

function getEffect(item, monsterId, type) {
  return item?.effects?.[type]?.[monsterId] ?? null;
}

function targetsFor(item) {
  syncDiscovered();
  return [...discoveredMonsters].filter(
    id => monsterNames[id] && (getEffect(item, id, 'feed') || getEffect(item, id, 'empower'))
  );
}

function statHTML(monsterId, state, preview = null) {
  const base = baseMonsterStats[monsterId]?.stats || {};
  const bonus = state?.statBonuses || {};
  const extra = preview || {};

  return Object.keys(base).map(key => {
    const totalBonus = (bonus[key] || 0) + (extra[key] || 0);
    return `<span class="stat-cell"><span class="stat-label">${statNames[key]}</span><span class="stat-value">${base[key]}${totalBonus ? `<b class="stat-bonus">+${totalBonus}</b>` : ''}</span></span>`;
  }).join('');
}

function closeModal(id) {
  const element = document.querySelector(id);
  if (element) element.hidden = true;
}

function openItemUse(itemId) {
  const item = itemById[itemId];
  const modal = document.querySelector('#item-use-modal');
  syncDiscovered();

  if (!item || !modal || getOwned(itemId) < 1) return;

  const targets = targetsFor(item);
  modal.dataset.itemId = itemId;
  modal.querySelector('[data-use-title]').textContent = `${item.icon} ${item.name}`;
  modal.querySelector('[data-use-description]').textContent = `${item.description}　持有 ${getOwned(itemId)}`;

  modal.querySelector('[data-use-targets]').innerHTML = targets.length
    ? targets.map(id => {
        const state = ensureMonster(id);
        if (!state) return '';

        const feed = getEffect(item, id, 'feed');
        const empower = getEffect(item, id, 'empower');
        const labels = [];

        if (feed) {
          labels.push(`餵食 ${Object.entries(feed).map(([key, value]) => `${statNames[key] || key} +${value}`).join('、')}`);
        }
        if (empower) labels.push(`賦能 ${empower.name}`);

        return `<article class="use-target-card">
          <div class="use-target-head"><span class="use-target-icon">${monsterIcons[id] || '◈'}</span><strong>${monsterNames[id]}</strong></div>
          <div class="use-target-stats">${statHTML(id, state)}</div>
          <div class="use-target-effect">${labels.join('　')}</div>
          <div class="use-target-actions">
            ${feed ? `<button type="button" data-feed-target="${id}" data-item-id="${item.id}">餵食</button>` : ''}
            ${empower ? `<button type="button" data-empower-target="${id}" data-item-id="${item.id}">賦能</button>` : ''}
          </div>
        </article>`;
      }).join('')
    : `<div class="use-empty">目前沒有已發現且適用於此道具的妖獸。<br><small>必須先在地圖捕捉妖獸，才能使用道具。</small></div>`;

  modal.hidden = false;
}

function openConfirm(itemId, monsterId, action) {
  syncDiscovered();

  const item = itemById[itemId];
  const state = ensureMonster(monsterId);
  const modal = document.querySelector('#use-confirm-modal');

  if (!item || !state || !discoveredMonsters.has(monsterId) || getOwned(itemId) < 1) return;

  const feed = action === 'feed' ? getEffect(item, monsterId, 'feed') : null;
  const empower = action === 'empower' ? getEffect(item, monsterId, 'empower') : null;

  if (action === 'feed' && !feed) return;
  if (action === 'empower' && !empower) return;

  modal.dataset.itemId = itemId;
  modal.dataset.monsterId = monsterId;
  modal.dataset.action = action;
  modal.querySelector('[data-confirm-title]').textContent = `${monsterIcons[monsterId] || '◈'} ${monsterNames[monsterId]}`;
  modal.querySelector('[data-confirm-item]').textContent = `${item.icon} ${item.name} ×${getOwned(itemId)}`;
  modal.querySelector('[data-confirm-effect]').innerHTML = action === 'feed'
    ? `<div class="confirm-stats">${statHTML(monsterId, state, feed)}</div><p>確認餵食後，${item.name} ×1 會從背包消耗。</p>`
    : `<p>安裝「${empower.name}」後，會消耗 ${item.name} ×1。</p>`;

  modal.hidden = false;
}

function renderInventory() {
  const grid = document.querySelector('#inventory-grid');
  const count = document.querySelector('#inventory-count');
  if (!grid) return;

  const owned = Object.entries(inventory).filter(([id, qty]) => qty > 0 && itemById[id]);
  if (count) count.textContent = `${owned.length} 種物品`;

  grid.innerHTML = owned.length
    ? owned.map(([id]) => {
        const item = itemById[id];
        return `<button class="inventory-item" type="button" data-item="${id}">
          <span class="inventory-icon">${item.icon}</span><strong>${item.name}</strong><small>${countText(id)}</small>
        </button>`;
      }).join('')
    : `<div class="inventory-empty">目前還沒有收集到物品。</div>`;

  if (DEV_MODE) renderDevButtons();
}

function renderDevButtons() {
  document.querySelectorAll('[data-dev-item]').forEach(button => {
    const item = itemById[button.dataset.devItem];
    const owned = getOwned(item.id);
    const selected = getSelected(item.id);
    button.disabled = selected >= owned;
  });

  document.querySelectorAll('[data-dev-remove-item]').forEach(button => {
    const item = itemById[button.dataset.devRemoveItem];
    const selected = getSelected(item.id);
    button.disabled = selected <= 0;
  });

  document.querySelectorAll('[data-dev-count]').forEach(label => {
    const item = itemById[label.dataset.devCount];
    label.textContent = `${item.icon}${item.name} ${countText(item.id)}`;
  });
}

function renderMonsterGrowth(monsterId) {
  const state = ensureMonster(monsterId);
  const modal = document.querySelector('#monster-growth-modal');
  if (!state || !modal) return;

  const innate = (state.talents || []).map(id => {
    const talent = talentDefinitions[id];
    return talent ? `<li><strong>${talent.name}</strong><small>${talent.description}</small></li>` : '';
  }).join('');

  const equipped = (state.equipped || []).map(entry =>
    `<li><strong>${entry.name || entry.itemId}</strong><small>${entry.description || '已安裝賦能效果。'}</small></li>`
  ).join('');

  modal.querySelector('#monster-growth-content').innerHTML = `
    <div class="growth-title">妖獸養成</div>
    <div class="growth-level">Lv.${state.level}　餵食 ${state.feedCount} 次</div>
    <div class="growth-section-title">技能</div>
    <ul class="monster-skill-list">${innate + equipped || '<li>尚未獲得技能</li>'}</ul>
    <div class="growth-section-title">能力值</div>
    <div class="growth-stats">${statHTML(monsterId, state)}</div>`;

  modal.hidden = false;
}

function enhanceCollectionCards() {
  syncDiscovered();
  const grid = document.querySelector('#collection-grid');
  if (!grid) return;

  grid.querySelectorAll('.collection-item.discovered').forEach(card => {
    const name = card.querySelector('.monster-name')?.textContent?.trim() || '';
    const id = Object.entries(monsterNames).find(([, value]) => value === name)?.[0];
    if (!id || !discoveredMonsters.has(id)) return;

    const state = ensureMonster(id);
    if (!state) return;

    let panel = card.querySelector('.monster-ability-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'monster-ability-panel';
      card.appendChild(panel);
    }

    const skills = [
      ...(state.talents || []).map(id => talentDefinitions[id]?.name || id),
      ...(state.equipped || []).map(entry => entry.name).filter(Boolean)
    ];

    const html = `
      <div class="monster-level">Lv.${state.level}</div>
      <div class="monster-card-skill-title">技能</div>
      <div class="monster-card-skills">${skills.map(skill => `<span>✦ ${skill}</span>`).join('') || '<span>尚未獲得</span>'}</div>
      <div class="monster-stats">${statHTML(id, state)}</div>`;
    if (panel.innerHTML !== html) panel.innerHTML = html;
  });
}

function injectStyles() {
  if (document.querySelector('#inventory-ui-style')) return;

  const style = document.createElement('style');
  style.id = 'inventory-ui-style';
  style.textContent = `
    .inventory-modal,.monster-growth-modal,.item-use-modal,.use-confirm-modal{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.62);display:grid;place-items:end center;padding:12px}
    .inventory-modal[hidden],.monster-growth-modal[hidden],.item-use-modal[hidden],.use-confirm-modal[hidden]{display:none}
    .inventory-card,.monster-growth-card,.item-use-card,.use-confirm-card{width:min(100%,520px);max-height:84vh;overflow:auto;background:#f6efd9;color:#3b321f;border-radius:20px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
    .inventory-head,.use-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
    .inventory-head button,.use-head button{width:38px;height:38px;border:0;border-radius:50%;background:#20251f;color:#fff;font-size:1.3rem;cursor:pointer}
    .inventory-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .inventory-item{min-height:100px;border:1px solid rgba(45,38,24,.2);border-radius:14px;background:#fffaf0;color:#3b321f;padding:8px;display:grid;place-items:center;cursor:pointer}
    .inventory-icon{font-size:30px}.inventory-item strong{font-size:12px}.inventory-item small{font-size:12px;font-weight:700}
    .inventory-empty,.use-empty{text-align:center;padding:30px 10px;grid-column:1/-1;opacity:.7}
    .use-targets{display:grid;gap:10px}.use-target-card{background:#fffaf0;border-radius:14px;padding:12px;border:1px solid rgba(65,53,29,.15)}
    .use-target-head{display:flex;align-items:center;gap:8px}.use-target-icon{font-size:1.7rem}
    .use-target-stats,.confirm-stats,.growth-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:9px 0}
    .stat-cell{background:#f0e8cf;border-radius:8px;padding:7px;color:#3b321f;font-weight:700;display:grid;grid-template-columns:1fr auto;align-items:baseline;gap:8px;min-width:0}
    .stat-label{min-width:0}.stat-value{white-space:nowrap}.stat-bonus{color:#b34b20;font-weight:900;margin-left:2px}.use-target-effect{font-size:.78rem;color:#6d5a31;margin:6px 0}
    .use-target-actions,.confirm-actions{display:flex;gap:8px}.use-target-actions button,.confirm-actions button{border:0;border-radius:10px;padding:9px 13px;background:#183b31;color:#fff4cf;font-weight:800;cursor:pointer}
    .confirm-actions{justify-content:flex-end;margin-top:14px}.confirm-actions button[data-confirm-cancel]{background:#77705f}
    .growth-title{font-size:1.2rem;font-weight:900;color:#5c451d}.growth-level{margin-top:4px;color:#66583d}.growth-section-title{margin:16px 0 7px;font-weight:900;color:#5c451d}
    .monster-skill-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}.monster-skill-list li{background:#fffaf0;border-radius:10px;padding:10px}.monster-skill-list strong,.monster-skill-list small{display:block}.monster-skill-list small{margin-top:3px;color:#66583d}
    .monster-ability-panel{margin-top:8px;padding-top:8px;border-top:1px solid rgba(225,191,110,.24)}
    .monster-level,.monster-card-skill-title{color:#fff4cf;font:700 .72rem/1.2 system-ui}.monster-card-skills{display:flex;flex-wrap:wrap;gap:4px 7px;margin:4px 0 7px}.monster-card-skills span,.monster-stats span{color:#dce7df;font:700 .66rem/1.2 system-ui}
    .monster-stats{display:grid;grid-template-columns:1fr 1fr;gap:5px}
    .monster-stats .stat-cell{background:transparent;padding:0;display:grid;grid-template-columns:1fr auto;color:#dce7df;font:700 .66rem/1.2 system-ui}
    .monster-stats .stat-label,.monster-stats .stat-value{font:inherit;color:inherit}
    .dev-section{margin-top:14px;padding-top:12px;border-top:1px dashed rgba(65,53,29,.25)}.dev-title{font-size:.75rem;font-weight:900;color:#6d5a31;margin-bottom:7px}
    .dev-items{display:grid;grid-template-columns:1fr;gap:6px}.dev-item-row{display:grid;grid-template-columns:42px 1fr 42px;gap:5px;align-items:center}.dev-item-row span{display:flex;align-items:center;justify-content:center;min-height:34px;border-radius:8px;background:#fffaf0;color:#3b321f;font-size:.78rem;font-weight:800}.dev-items button{border:0;border-radius:8px;padding:7px;background:#ded5bc;color:#3b321f;cursor:pointer}.dev-items button:disabled{opacity:.45;cursor:not-allowed}
  `;
  document.head.appendChild(style);
}

function installUI() {
  if (document.querySelector('#inventory-modal')) return;

  injectStyles();

  let inventoryButton = document.querySelector('#inventory-button');
  if (!inventoryButton) {
    inventoryButton = document.createElement('button');
    inventoryButton.id = 'inventory-button';
    inventoryButton.type = 'button';
    inventoryButton.textContent = '🎒';
    document.body.appendChild(inventoryButton);
  }

  const inventoryModal = document.createElement('div');
  inventoryModal.id = 'inventory-modal';
  inventoryModal.className = 'inventory-modal';
  inventoryModal.hidden = true;
  inventoryModal.innerHTML = `<div class="inventory-card" role="dialog" aria-modal="true">
    <div class="inventory-head"><div><strong>🎒 物品背包</strong><div id="inventory-count">0 種物品</div></div><button type="button" data-close-modal="inventory-modal">×</button></div>
    <div id="inventory-grid" class="inventory-grid"></div>
    ${DEV_MODE ? `<div class="dev-section"><div class="dev-title">🛠 測試模式：道具數量調整</div><div class="dev-items">${items.map(item => `<div class="dev-item-row"><button type="button" data-dev-item="${item.id}">＋</button><span data-dev-count="${item.id}">${item.icon}${item.name} 0/0</span><button type="button" data-dev-remove-item="${item.id}">−</button></div>`).join('')}</div></div>` : ''}
  </div>`;
  document.body.appendChild(inventoryModal);

  const useModal = document.createElement('div');
  useModal.id = 'item-use-modal';
  useModal.className = 'item-use-modal';
  useModal.hidden = true;
  useModal.innerHTML = `<div class="item-use-card" role="dialog" aria-modal="true">
    <div class="use-head"><div><strong data-use-title></strong><p data-use-description></p></div><button type="button" data-close-modal="item-use-modal" aria-label="取消選擇">×</button></div>
    <div class="use-targets" data-use-targets></div>
  </div>`;
  document.body.appendChild(useModal);

  const confirmModal = document.createElement('div');
  confirmModal.id = 'use-confirm-modal';
  confirmModal.className = 'use-confirm-modal';
  confirmModal.hidden = true;
  confirmModal.innerHTML = `<div class="use-confirm-card" role="dialog" aria-modal="true">
    <div class="use-head"><strong data-confirm-title></strong><button type="button" data-close-modal="use-confirm-modal">×</button></div>
    <strong data-confirm-item></strong><div data-confirm-effect></div>
    <div class="confirm-actions"><button type="button" data-confirm-cancel>取消</button><button type="button" data-confirm-ok>確認</button></div>
  </div>`;
  document.body.appendChild(confirmModal);

  const growthModal = document.createElement('div');
  growthModal.id = 'monster-growth-modal';
  growthModal.className = 'monster-growth-modal';
  growthModal.hidden = true;
  growthModal.innerHTML = `<div class="monster-growth-card" role="dialog" aria-modal="true"><div id="monster-growth-content"></div><button type="button" data-close-modal="monster-growth-modal">關閉</button></div>`;
  document.body.appendChild(growthModal);

  inventoryButton.addEventListener('click', () => {
    syncDiscovered();
    inventoryModal.hidden = false;
    renderInventory();
    enhanceCollectionCards();
  });

  document.addEventListener('click', event => {
    const add = event.target.closest('[data-dev-item]');
    if (add) {
      addItem(add.dataset.devItem);
      return;
    }

    const remove = event.target.closest('[data-dev-remove-item]');
    if (remove) {
      removeItem(remove.dataset.devRemoveItem);
      return;
    }

    const item = event.target.closest('[data-item]');
    if (item) {
      openItemUse(item.dataset.item);
      return;
    }

    const feed = event.target.closest('[data-feed-target]');
    if (feed) {
      openConfirm(feed.dataset.itemId, feed.dataset.feedTarget, 'feed');
      return;
    }

    const empower = event.target.closest('[data-empower-target]');
    if (empower) {
      openConfirm(empower.dataset.itemId, empower.dataset.empowerTarget, 'empower');
      return;
    }

    const ok = event.target.closest('[data-confirm-ok]');
    if (ok) {
      syncDiscovered();
      const modal = document.querySelector('#use-confirm-modal');
      const itemId = modal.dataset.itemId;
      const monsterId = modal.dataset.monsterId;
      const action = modal.dataset.action;
      const item = itemById[itemId];
      const state = ensureMonster(monsterId);

      if (!item || !state || getOwned(itemId) < 1) return;

      const next = action === 'feed'
        ? applyFeed(state, item, monsterId)
        : equipEmpowerment(state, item, monsterId);

      if (next && consumeItem(itemId)) {
        progression[monsterId] = next;
        save();
        closeModal('#use-confirm-modal');
        closeModal('#item-use-modal');
        enhanceCollectionCards();
      }
      return;
    }

    const cancel = event.target.closest('[data-confirm-cancel]');
    if (cancel) {
      closeModal('#use-confirm-modal');
      return;
    }

    const close = event.target.closest('[data-close-modal]');
    if (close) {
      closeModal(`#${close.dataset.closeModal}`);
    }
  });

  for (const id of ['inventory-modal', 'item-use-modal', 'use-confirm-modal', 'monster-growth-modal']) {
    document.querySelector(`#${id}`)?.addEventListener('click', event => {
      if (event.target.id === id) event.target.hidden = true;
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    for (const id of ['use-confirm-modal', 'item-use-modal', 'inventory-modal', 'monster-growth-modal']) {
      const element = document.querySelector(`#${id}`);
      if (element && !element.hidden) {
        element.hidden = true;
        break;
      }
    }
  });

  window.addEventListener('shanhaijing:item-collected', event => {
    const { itemId, amount = 1 } = event.detail || {};
    collectItem(itemId, amount);
  });

  window.addEventListener('shanhaijing:open-monster-growth', event => {
    if (event.detail?.monsterId) renderMonsterGrowth(event.detail.monsterId);
  });

  const collectionGrid = document.querySelector('#collection-grid');
  if (collectionGrid) {
    const observer = new MutationObserver(() => {
      syncDiscoveredFromCollection();
      enhanceCollectionCards();
    });
    observer.observe(collectionGrid, { childList: true, subtree: true });
  }

  window.__shanhaijingInventoryState = {
    getOwned,
    getSelected,
    setSelected,
    adjustSelected,
    resetSelected,
    renderInventory
  };

  syncDiscovered();
  renderInventory();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installUI);
} else {
  installUI();
}
