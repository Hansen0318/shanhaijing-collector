export function createSelectionState() {
  return new Map();
}

export function getSelectedCount(state, itemId) {
  return Math.max(0, Number(state.get(itemId) || 0));
}

export function setSelectedCount(state, itemId, value, owned) {
  const safeOwned = Math.max(0, Number(owned) || 0);
  const safeSelected = Math.max(0, Math.min(Math.trunc(Number(value) || 0), safeOwned));
  state.set(itemId, safeSelected);
  return safeSelected;
}

export function formatItemCount(state, itemId, owned) {
  return `${getSelectedCount(state, itemId)}/${Math.max(0, Number(owned) || 0)}`;
}
