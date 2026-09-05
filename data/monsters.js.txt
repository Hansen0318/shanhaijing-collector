// 《山海經：青丘尋獸》妖獸資料。
// 妖獸本體資料與「出現在哪張地圖」分離；地圖配置位於 data/maps.js。

import { currentMapId, getMonsterPlacements, getMapById } from "./maps.js";

export const monsters = [
  {
    id: "nine-tailed-fox",
    name: "九尾狐",
    icon: "🦊",
    asset: "./assets/monsters/nine-tailed-fox.png",
    clueRadius: 210,
    discoveryRadius: 85,
    clueZoom: 1.35,
    discoveryZoom: 2.0,
    rarity: "rare",
    active: true,
    clue: "前方似乎有微弱的狐火。",
    closeClue: "草叢中留下了數道奇異足跡。",
    collectionId: "nine-tailed-fox"
  },
  {
    id: "bi-fang",
    name: "畢方",
    icon: "🐦",
    asset: "./assets/monsters/bi-fang.png",
    clueRadius: 210,
    discoveryRadius: 85,
    clueZoom: 1.55,
    discoveryZoom: 2.35,
    rarity: "rare",
    active: true,
    clue: "空氣中殘留著奇異的灼熱氣息。",
    closeClue: "岩石旁落著一根尚未冷卻的羽毛。",
    collectionId: "bi-fang"
  },
  {
    id: "fu-zhu",
    name: "夫諸",
    icon: "🦌",
    asset: "./assets/monsters/fu-zhu.png",
    clueRadius: 210,
    discoveryRadius: 85,
    clueZoom: 1.75,
    discoveryZoom: 2.65,
    rarity: "epic",
    active: true,
    clue: "水霧之間，似乎留下了奇怪的足跡。",
    closeClue: "溪水旁的蹄印還沒有被水沖散。",
    collectionId: "fu-zhu"
  },
  {
    id: "ying-long",
    name: "應龍",
    icon: "🐉",
    clueRadius: 210,
    discoveryRadius: 85,
    clueZoom: 1.8,
    discoveryZoom: 2.7,
    rarity: "legendary",
    active: false,
    clue: "雲層深處似乎藏著巨大的身影。",
    closeClue: "地面留下了古老而巨大的鱗痕。",
    collectionId: "ying-long"
  },
  {
    id: "bai-ze",
    name: "白澤",
    icon: "🐐",
    clueRadius: 210,
    discoveryRadius: 85,
    clueZoom: 1.8,
    discoveryZoom: 2.7,
    rarity: "legendary",
    active: false,
    clue: "古老石碑附近似乎留下了異獸的蹤跡。",
    closeClue: "石碑上的異文像是在記錄某種生物。",
    collectionId: "bai-ze"
  },
  {
    id: "qiong-qi",
    name: "窮奇",
    icon: "🐯",
    clueRadius: 210,
    discoveryRadius: 85,
    clueZoom: 1.9,
    discoveryZoom: 2.7,
    rarity: "epic",
    active: false,
    clue: "荒野深處傳來不尋常的低吼。",
    closeClue: "岩壁上留下了巨大而凌亂的爪痕。",
    collectionId: "qiong-qi"
  },
  {
    id: "kui-niu",
    name: "夔牛",
    icon: "🐃",
    clueRadius: 210,
    discoveryRadius: 85,
    clueZoom: 1.9,
    discoveryZoom: 2.7,
    rarity: "epic",
    active: false,
    clue: "遠方傳來沉重的震動，像是巨獸踏過大地。",
    closeClue: "河岸巨石上留下了異常深的撞擊痕。",
    collectionId: "kui-niu"
  },
  {
    id: "feng-huang",
    name: "鳳凰",
    icon: "🦅",
    clueRadius: 210,
    discoveryRadius: 85,
    clueZoom: 2.0,
    discoveryZoom: 2.8,
    rarity: "legendary",
    active: false,
    clue: "天空飄落一片異常鮮豔的羽毛。",
    closeClue: "羽毛仍散發著溫暖的光。",
    collectionId: "feng-huang"
  },
  {
    id: "tao-wu",
    name: "檮杌",
    icon: "🐗",
    clueRadius: 210,
    discoveryRadius: 85,
    clueZoom: 2.0,
    discoveryZoom: 2.8,
    rarity: "epic",
    active: false,
    clue: "荒谷裡似乎有東西剛剛經過。",
    closeClue: "地面留下深陷的爪痕。",
    collectionId: "tao-wu"
  },
  {
    id: "zheng",
    name: "狰",
    icon: "🦁",
    clueRadius: 210,
    discoveryRadius: 85,
    clueZoom: 1.8,
    discoveryZoom: 2.7,
    rarity: "rare",
    active: false,
    clue: "山林深處似乎有東西正在注視你。",
    closeClue: "幾根折斷的枝條還在微微晃動。",
    collectionId: "zheng"
  }
];

export const monstersById = Object.fromEntries(monsters.map(monster => [monster.id, monster]));

export function getMonsterById(monsterId) {
  return monstersById[monsterId] ?? null;
}

export function getActiveMonstersForMap(mapId = currentMapId) {
  return getMonsterPlacements(mapId)
    .map(placement => {
      const monster = getMonsterById(placement.monsterId);
      return monster ? { ...monster, ...placement } : null;
    })
    .filter(monster => monster && monster.active !== false);
}

export const regions = getMapById(currentMapId).regions;
export const activeMonsters = getActiveMonstersForMap(currentMapId);
