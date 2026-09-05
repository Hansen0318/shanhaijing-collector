// 物品資料：探索 → 背包 → 餵食／賦能
// 規則：沒有明確配置的妖獸不可使用該道具；禁止 default 泛用效果。

export const items = [
  {
    id: "qingqiu-herb",
    name: "青丘靈草",
    icon: "🌿",
    asset: "./assets/items/qingqiu-herb.png",
    category: "plant",
    rarity: "uncommon",
    description: "生長於青丘丘陵的靈草，帶有淡淡的草木靈氣。",
    stackMax: 99,
    effects: { feed: { "nine-tailed-fox": { spirit: 2 }, "fu-zhu": { adaptability: 1 } } }
  },
  {
    id: "ling-fruit",
    name: "靈果",
    icon: "🍑",
    asset: "./assets/items/ling-fruit.png",
    category: "plant",
    rarity: "common",
    description: "蘊含微弱靈氣的果實，多種妖獸都能吸收。",
    stackMax: 99,
    effects: { feed: { "nine-tailed-fox": { spirit: 1 }, "fu-zhu": { spirit: 1 }, "bi-fang": { adaptability: 1 } } }
  },
  {
    id: "dew-crystal",
    name: "凝露水晶",
    icon: "💧",
    asset: "./assets/items/dew-crystal.png",
    category: "material",
    rarity: "rare",
    description: "凝聚溪谷水氣而成的晶體，適合水域妖獸。",
    stackMax: 99,
    effects: { feed: { "fu-zhu": { adaptability: 2 } } }
  },
  {
    id: "moon-jade",
    name: "月華玉",
    icon: "🌙",
    asset: "./assets/items/moon-jade.png",
    category: "treasure",
    rarity: "rare",
    description: "吸收月光而形成的玉石，能強化夜間感知。",
    stackMax: 20,
    effects: {
      empower: {
        "nine-tailed-fox": { id: "night-sense-moon", name: "月華感知", description: "夜間探索時，特殊蹤跡發現率提升 10%。", modifiers: { nightDiscovery: 0.10 } },
        "fu-zhu": { id: "moon-water", name: "月映水靈", description: "夜間水域探索效率提升 5%。", modifiers: { nightWaterDiscovery: 0.05 } }
      }
    }
  },
  {
    id: "flame-crystal",
    name: "赤焰晶",
    icon: "🔥",
    asset: "./assets/items/flame-crystal.png",
    category: "treasure",
    rarity: "rare",
    description: "蘊含山火之力的晶體，與火性妖獸特別契合。",
    stackMax: 20,
    effects: {
      feed: { "bi-fang": { adaptability: 2 } },
      empower: {
        "bi-fang": { id: "flame-resonance", name: "赤焰共鳴", description: "山區與高溫環境探索能力提升 10%。", modifiers: { mountainDiscovery: 0.10, heatDiscovery: 0.10 } }
      }
    }
  }
];

export const itemById = Object.fromEntries(items.map(item => [item.id, item]));

export function getItemEffect(item, monsterId, type) {
  return item?.effects?.[type]?.[monsterId] ?? null;
}

export function canUseItemOnMonster(item, monsterId, type = null) {
  if (!item || !monsterId) return false;
  if (type) return Boolean(getItemEffect(item, monsterId, type));
  return Boolean(getItemEffect(item, monsterId, "feed") || getItemEffect(item, monsterId, "empower"));
}
