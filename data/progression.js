// 妖獸養成資料與規則。
// 餵食 = 永久成長；賦能 = 可安裝效果。
// 這個模組獨立於 game.js，避免破壞現有地圖核心。

export const baseMonsterStats = {
  "nine-tailed-fox": {
    level: 1,
    stats: { perception: 5, spirit: 5, speed: 4, adaptability: 3 },
    talents: ["night-sense"]
  },
  "fu-zhu": {
    level: 1,
    stats: { perception: 4, spirit: 4, speed: 3, adaptability: 5 },
    talents: ["water-affinity"]
  },
  "bi-fang": {
    level: 1,
    stats: { perception: 4, spirit: 3, speed: 4, adaptability: 5 },
    talents: ["flame-affinity"]
  }
};

export function createProgressionState(monsterId) {
  const base = baseMonsterStats[monsterId];
  if (!base) return null;
  return {
    level: base.level,
    stats: { ...base.stats },
    feedCount: 0,
    equipped: []
  };
}

export function applyFeed(state, item, monsterId) {
  const effect = item?.effects?.feed?.[monsterId]
    ?? item?.effects?.feed?.default;
  if (!effect) return null;

  const next = structuredClone(state);
  for (const [key, value] of Object.entries(effect)) {
    if (key in next.stats) next.stats[key] += value;
  }
  next.feedCount += 1;
  next.level = 1 + Math.floor(next.feedCount / 3);
  return next;
}

export function equipEmpowerment(state, item, monsterId) {
  const effect = item?.effects?.empower?.[monsterId];
  if (!effect) return null;
  if (state.equipped.some(entry => entry.itemId === item.id)) return null;

  const next = structuredClone(state);
  next.equipped.push({
    itemId: item.id,
    ...effect
  });
  return next;
}
