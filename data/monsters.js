// 《山海經：青丘尋獸》妖獸與世界資料
// 正式世界地圖邏輯座標：1800 × 1200。
// region polygon 是世界地圖的邏輯區域；未來替換精美地圖 Asset 時沿用同一套座標。
// active=true 的妖獸目前可在地圖上探索。

export const regions = [
  {
    id: "qingqiu-country",
    name: "青丘之國",
    description: "丘陵、林地與溪谷相連，古老的狐族傳說仍留在這片土地。",
    polygon: [
      { x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1100, y: 300 },
      { x: 1050, y: 650 }, { x: 900, y: 900 }, { x: 0, y: 900 }
    ],
    terrain: "hills"
  },
  {
    id: "mingxing-mountain",
    name: "明星之山",
    description: "群峰聳立，岩壁與山谷間殘留著不尋常的灼熱氣息。",
    polygon: [
      { x: 1000, y: 0 }, { x: 1800, y: 0 }, { x: 1800, y: 580 },
      { x: 1500, y: 620 }, { x: 1250, y: 700 }, { x: 1100, y: 300 }
    ],
    terrain: "mountains"
  },
  {
    id: "east-extreme",
    name: "東極",
    description: "天地交界之處，地勢逐漸開闊，遠方的天際像沒有盡頭。",
    polygon: [
      { x: 1100, y: 300 }, { x: 1250, y: 700 }, { x: 1500, y: 620 },
      { x: 1800, y: 580 }, { x: 1800, y: 950 }, { x: 1050, y: 1000 },
      { x: 900, y: 900 }, { x: 1050, y: 650 }
    ],
    terrain: "open"
  },
  {
    id: "great-wilderness",
    name: "大荒之野",
    description: "荒野向天際延伸，古老巨石與遺跡散落在寂寥的大地。",
    polygon: [
      { x: 0, y: 900 }, { x: 900, y: 900 }, { x: 1050, y: 1000 },
      { x: 1800, y: 950 }, { x: 1800, y: 1200 }, { x: 0, y: 1200 }
    ],
    terrain: "wilderness"
  }
];

export const monsters = [
  {
    id: "nine-tailed-fox",
    name: "九尾狐",
    icon: "🦊",
    regionId: "qingqiu-country",
    position: { x: 760, y: 520 },
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
    regionId: "mingxing-mountain",
    position: { x: 1450, y: 320 },
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
    regionId: "qingqiu-country",
    position: { x: 500, y: 760 },
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
    regionId: "east-extreme",
    position: { x: 0, y: 0 },
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
    regionId: "great-wilderness",
    position: { x: 0, y: 0 },
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
    regionId: "great-wilderness",
    position: { x: 0, y: 0 },
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
    regionId: "east-extreme",
    position: { x: 0, y: 0 },
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
    regionId: "mingxing-mountain",
    position: { x: 0, y: 0 },
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
    regionId: "great-wilderness",
    position: { x: 0, y: 0 },
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
    regionId: "mingxing-mountain",
    position: { x: 0, y: 0 },
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

export const activeMonsters = monsters.filter(monster => monster.active);

export function getRegionById(regionId) {
  return regions.find(region => region.id === regionId) ?? regions[0];
}
