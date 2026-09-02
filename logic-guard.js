// Guard for the inventory use flow.
// inventory-ui.js owns the ONLY live inventory state.
// This module never creates or mutates a second owned/selected store.

let installed = false;

function getInventoryState() {
  return window.__shanhaijingInventoryState || null;
}

function canUseSelectedItem(itemId) {
  const state = getInventoryState();
  if (!state || !itemId) return false;
  return state.getOwned(itemId) > 0 && state.getSelected(itemId) > 0;
}

function blockIfNoSelection(event) {
  const button = event.target.closest?.('[data-feed-target], [data-empower-target]');
  if (!button) return;

  const itemId = button.dataset.itemId;
  if (canUseSelectedItem(itemId)) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const status = document.querySelector('#location-status');
  if (status) status.textContent = '請先在背包下方選擇道具，再選擇妖獸。';
}

function install() {
  if (installed) return;
  installed = true;
  document.addEventListener('click', blockIfNoSelection, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}
