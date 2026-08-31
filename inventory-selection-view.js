/**
 * Inventory selection presentation layer.
 *
 * The existing inventory module owns the real inventory state and the DEV
 * controls own the selected count. This module deliberately does not mutate
 * either state. It only makes the upper "items selected for use" area reflect
 * the selected count shown by the DEV controls.
 */

export function parseItemCount(text) {
  const match = String(text || '').match(/(\d+)\/(\d+)/);
  if (!match) return null;
  return { selected: Number(match[1]), owned: Number(match[2]) };
}

export function shouldShowSelectedItem(text) {
  const count = parseItemCount(text);
  return Boolean(count && count.selected > 0 && count.owned > 0);
}

function selectedCountFor(itemId) {
  const node = [...document.querySelectorAll('[data-dev-count]')].find(
    element => element.dataset.devCount === itemId
  );
  return parseItemCount(node?.textContent);
}

function syncSelectedItemView() {
  const grid = document.querySelector('#inventory-grid');
  if (!grid) return;

  const cards = grid.querySelectorAll('[data-item]');
  let selectedKinds = 0;

  cards.forEach(card => {
    const itemId = card.dataset.item;
    const count = selectedCountFor(itemId);
    const visible = Boolean(count && count.selected > 0 && count.owned > 0);

    const nextHidden = !visible;
    if (card.hidden !== nextHidden) card.hidden = nextHidden;
    const nextAriaHidden = String(nextHidden);
    if (card.getAttribute('aria-hidden') !== nextAriaHidden) {
      card.setAttribute('aria-hidden', nextAriaHidden);
    }

    const small = card.querySelector('small');
    if (small && count) {
      const nextText = String(count.selected);
      if (small.textContent !== nextText) small.textContent = nextText;
    }
    if (visible) selectedKinds += 1;
  });

  const count = document.querySelector('#inventory-count');
  if (count) {
    const nextText = `${selectedKinds} 種物品`;
    if (count.textContent !== nextText) count.textContent = nextText;
  }

  const visibleCards = [...cards].filter(card => !card.hidden);
  const empty = grid.querySelector('.inventory-empty');
  if (empty) {
    const nextHidden = visibleCards.length > 0;
    if (empty.hidden !== nextHidden) empty.hidden = nextHidden;
  }
}

export function installInventorySelectionView() {
  const devMode = new URLSearchParams(location.search).get('dev') === '1';
  if (!devMode || window.__shanhaijingInventorySelectionViewInstalled) return;
  window.__shanhaijingInventorySelectionViewInstalled = true;

  const run = () => syncSelectedItemView();
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('shanhaijing:item-collected', run);
  run();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installInventorySelectionView, { once: true });
  } else {
    installInventorySelectionView();
  }
}
