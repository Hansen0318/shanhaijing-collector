import "../logic-guard.js";

// 妖獸養成資料與規則。
// 餵食 = 永久成長；賦能 = 安裝效果；talents = 妖獸天生技能。
// 基礎能力與累積增幅分開保存，UI 可顯示「5 +2」而不是只顯示 7。

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

export const talentDefinitions = {
  "night-sense": {
    name: "夜行感知",
    description: "夜間探索時，更容易察覺特殊蹤跡。"
  },
  "water-affinity": {
    name: "水靈親和",
    description: "在溪流、水霧等水域環境中具有較好的探索適應性。"
  },
  "flame-affinity": {
    name: "炎火親和",
    description: "在高溫、火焰與山區環境中具有較好的探索適應性。"
  }
};

export function createProgressionState(monsterId) {
  const base = baseMonsterStats[monsterId];
  if (!base) return null;

  return {
    level: base.level,
    stats: { ...base.stats },
    statBonuses: Object.fromEntries(
      Object.keys(base.stats).map(key => [key, 0])
    ),
    talents: [...base.talents],
    feedCount: 0,
    equipped: []
  };
}

export function applyFeed(state, item, monsterId) {
  const effect = item?.effects?.feed?.[monsterId];
  if (!state || !effect) return null;

  const next = structuredClone(state);

  next.statBonuses ||= Object.fromEntries(
    Object.keys(baseMonsterStats[monsterId]?.stats || {}).map(key => [key, 0])
  );

  for (const [key, value] of Object.entries(effect)) {
    if (!(key in next.stats) || !Number.isFinite(value)) continue;

    next.stats[key] += value;
    next.statBonuses[key] = (next.statBonuses[key] || 0) + value;
  }

  next.feedCount += 1;
  next.level = 1 + Math.floor(next.feedCount / 3);

  return next;
}

export function equipEmpowerment(state, item, monsterId) {
  const effect = item?.effects?.empower?.[monsterId];
  if (!state || !effect) return null;

  if ((state.equipped || []).some(entry => entry.itemId === item.id)) {
    return null;
  }

  const next = structuredClone(state);
  next.equipped ||= [];
  next.equipped.push({ itemId: item.id, ...effect });

  return next;
}

export function getStatDisplay(monsterId, state, previewEffect = null) {
  const base = baseMonsterStats[monsterId]?.stats || {};
  const bonuses = state?.statBonuses || {};
  const preview = previewEffect || {};

  return Object.fromEntries(
    Object.keys(base).map(key => {
      const bonus = (bonuses[key] || 0) + (preview[key] || 0);

      return [
        key,
        {
          key,
          base: base[key],
          bonus,
          text: `${base[key]}${bonus ? ` +${bonus}` : ""}`
        }
      ];
    })
  );
}
