// UI guard for item count display and monster selection.
// The real inventory remains owned by inventory-ui.js; this module only keeps the UI state as selected/owned.
const DEV_MODE = new URLSearchParams(location.search).get('dev') === '1';
const INVENTORY_KEY = 'shanhaijing_inventory_v1';
const DISCOVERED_KEY = 'shanhaijing-collector-discovered';

const selectedCounts = new Map();
const ownedCounts = new Map();
let installed = false;

const ITEM_NAMES = {
  'qingqiu-herb': '青丘靈草',
  'ling-fruit': '靈果',
  'dew-crystal': '凝露水晶',
  'moon-jade': '月華玉',
  'flame-crystal': '赤焰晶'
};

function localizeDiscoveryText() {
  const status = document.querySelector('#location-status');
  if (status) {
    const next = status.textContent.replace(
      /取得 (qingqiu-herb|ling-fruit|dew-crystal|moon-jade|flame-crystal) ×(\d+)/g,
      (_, id, amount) => `取得 ${ITEM_NAMES[id]} ×${amount}`
    );
    if (next !== status.textContent) status.textContent = next;
  }

  const toast = document.querySelector('.discovery-toast');
  if (!toast) return;
  const text = toast.querySelector('.discovery-toast-text');
  if (!text) return;
  const next = text.textContent.replace(
    /(qingqiu-herb|ling-fruit|dew-crystal|moon-jade|flame-crystal) ×(\d+)/g,
    (_, id, amount) => `${ITEM_NAMES[id]} ×${amount}`
  );
  if (next !== text.textContent) text.textContent = next;
}

function discoveredIds() {
  const ids = new Set();
  if (!DEV_MODE) {
    try {
      const raw = localStorage.getItem(DISCOVERED_KEY);
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed)) parsed.forEach(id => ids.add(id));
    } catch {}
  }
  document.querySelectorAll('#collection-grid .collection-item.discovered .monster-name').forEach(node => {
    const name = node.textContent.trim();
    if (name === '九尾狐') ids.add('nine-tailed-fox');
    if (name === '夫諸') ids.add('fu-zhu');
    if (name === '畢方') ids.add('bi-fang');
  });
  return ids;
}

function readOwnedFromInventoryStorage(itemId) {
  if (DEV_MODE) return null;
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    const inventory = JSON.parse(raw || '{}');
    const value = Number(inventory?.[itemId] || 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  } catch { return 0; }
}
function getSelected(itemId) { return Math.max(0, Number(selectedCounts.get(itemId) || 0)); }
function getOwned(itemId) {
  const stored = readOwnedFromInventoryStorage(itemId);
  if (stored !== null) return stored;
  return Math.max(0, Number(ownedCounts.get(itemId) || 0));
}
function rememberOwnedFromRawText(itemId, text, node = null) {
  const match = String(text || '').match(/(\d+)\/(\d+)/);
  if (!match) return;
  const left = Number(match[1]);
  const right = Number(match[2]);
  const stackMax = Number(node?.dataset.guardStackMax || 0);
  if (node && !node.dataset.guardStackMax && right >= left && right > 0) node.dataset.guardStackMax = String(right);
  const knownStackMax = Number(node?.dataset.guardStackMax || stackMax || 0);
  if (knownStackMax > 0 && right === knownStackMax) ownedCounts.set(itemId, left);
}
function countText(itemId) { return `${getSelected(itemId)}/${getOwned(itemId)}`; }
function updateCountNodes() {
  document.querySelectorAll('[data-dev-count]').forEach(node => {
    const id = node.dataset.devCount;
    rememberOwnedFromRawText(id, node.textContent, node);
    const icon = node.textContent.match(/^[^\u4e00-\u9fff]*?/u)?.[0] || '';
    const label = node.textContent.replace(/^[^\u4e00-\u9fff]*?/u, '').replace(/\s+\d+\/\d+\s*$/, '').trim();
    const itemName = label || node.dataset.itemName || id;
    const next = `${icon}${itemName} ${countText(id)}`;
    if (node.textContent !== next) node.textContent = next;
  });
  document.querySelectorAll('#inventory-grid [data-item]').forEach(card => {
    const id = card.dataset.item;
    const small = card.querySelector('small');
    if (!small) return;
    rememberOwnedFromRawText(id, small.textContent, small);
    const next = countText(id);
    if (small.textContent !== next) small.textContent = next;
  });
}
function setSelected(itemId, value) {
  const owned = getOwned(itemId);
  selectedCounts.set(itemId, Math.max(0, Math.min(Number(value) || 0, owned)));
  updateCountNodes();
}
function onCollected(event) {
  const itemId = event.detail?.itemId;
  const amount = Math.max(0, Number(event.detail?.amount || 0));
  if (!itemId || amount <= 0) return;
  if (DEV_MODE) ownedCounts.set(itemId, getOwned(itemId) + amount);
  selectedCounts.set(itemId, 0);
  setTimeout(() => { updateCountNodes(); localizeDiscoveryText(); }, 0);
}
function onInventoryOpened(event) {
  const item = event.target.closest?.('[data-item]');
  if (!item) return;
  const itemId = item.dataset.item;
  if (!itemId || getOwned(itemId) <= 0) return;
  setSelected(itemId, 0);
}
function onFeedOrEmpower(event) {
  const button = event.target.closest?.('[data-feed-target], [data-empower-target]');
  if (!button) return;
  const monsterId = button.dataset.feedTarget || button.dataset.empowerTarget;
  if (!discoveredIds().has(monsterId)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  const itemId = button.dataset.itemId;
  if (itemId) setSelected(itemId, 1);
}
function onConfirm(event) {
  const button = event.target.closest?.('[data-confirm-ok]');
  if (!button) return;
  const modal = document.querySelector('#use-confirm-modal');
  const itemId = modal?.dataset.itemId;
  if (!itemId) return;
  setTimeout(() => {
    selectedCounts.set(itemId, 0);
    if (DEV_MODE) ownedCounts.set(itemId, Math.max(0, getOwned(itemId) - 1));
    updateCountNodes();
  }, 30);
}
function install() {
  if (installed) return;
  installed = true;
  document.addEventListener('click', onFeedOrEmpower, true);
  document.addEventListener('click', onInventoryOpened, false);
  document.addEventListener('click', onConfirm, false);
  window.addEventListener('shanhaijing:item-collected', onCollected);
  updateCountNodes();
  localizeDiscoveryText();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
