export function assetIconMarkup(entity, fallback = '◈', extraClass = '') {
  const emoji = entity?.icon || fallback;
  if (!entity?.asset) return `<span class="asset-fallback">${emoji}</span>`;
  return `<span class="asset-icon ${extraClass}"><img src="${entity.asset}" alt="" loading="eager" onerror="this.hidden=true"></span>`;
}
