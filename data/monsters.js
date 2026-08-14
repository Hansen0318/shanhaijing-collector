// 妖獸資料
// 遊戲核心與內容分離。
// 未來新增妖獸時，原則上只需要新增資料，不需要修改核心遊戲邏輯。

export const monsters = [
  {
    id: "nine-tailed-fox",
    name: "九尾狐",
    region: "qingqiu",
    hint: "月色落下時，狐火會在古樹旁閃動。",
    position: { x: 1160, y: 650 },
    zoomDepth: 4,
    rarity: "rare",
    active: true,
    clues: ["fox-fire"],
    collectionId: "nine-tailed-fox"
  },

  {
    id: "bi-fang",
    name: "畢方",
    region: "qingqiu-mountains",
    hint: "山巔偶爾會出現不尋常的火光。",
    position: { x: 1420, y: 300 },
    zoomDepth: 4,
    rarity: "rare",
    active: true,
    clues: ["burning-feather"],
    collectionId: "bi-fang"
  },

  {
    id: "fu-zhu",
    name: "夫諸",
    region: "moonlit-lake",
    hint: "月影落在水面時，湖畔會留下奇怪的足跡。",
    position: { x: 520, y: 820 },
    zoomDepth: 4,
    rarity: "epic",
    active: true,
    clues: ["strange-footprints"],
    collectionId: "fu-zhu"
  },

  {
    id: "ying-long",
    name: "應龍",
    region: "qingqiu-mountains",
    hint: "雲層深處似乎藏著巨大的身影。",
    position: { x: 0, y: 0 },
    zoomDepth: 5,
    rarity: "legendary",
    active: false,
    clues: ["dragon-scale"],
    collectionId: "ying-long"
  },

  {
    id: "bai-ze",
    name: "白澤",
    region: "ancient-forest",
    hint: "古老石碑附近似乎有人留下過記號。",
    position: { x: 0, y: 0 },
    zoomDepth: 5,
    rarity: "legendary",
    active: false,
    clues: ["stone-inscription"],
    collectionId: "bai-ze"
  },

  {
    id: "qiong-qi",
    name: "窮奇",
    region: "qingqiu-valley",
    hint: "峽谷深處傳來不尋常的低吼。",
    position: { x: 0, y: 0 },
    zoomDepth: 5,
    rarity: "epic",
    active: false,
    clues: ["claw-mark"],
    collectionId: "qiong-qi"
  },

  {
    id: "kui-niu",
    name: "夔牛",
    region: "qingqiu-river",
    hint: "河岸巨石上留下了奇怪的水痕。",
    position: { x: 0, y: 0 },
    zoomDepth: 5,
    rarity: "epic",
    active: false,
    clues: ["river-mark"],
    collectionId: "kui-niu"
  },

  {
    id: "feng-huang",
    name: "鳳凰",
    region: "ancient-forest",
    hint: "森林上空偶爾會飄落五彩羽毛。",
    position: { x: 0, y: 0 },
    zoomDepth: 6,
    rarity: "legendary",
    active: false,
    clues: ["colorful-feather"],
    collectionId: "feng-huang"
  },

  {
    id: "tao-wu",
    name: "檮杌",
    region: "qingqiu-valley",
    hint: "荒谷的岩壁上有巨大爪痕。",
    position: { x: 0, y: 0 },
    zoomDepth: 6,
    rarity: "epic",
    active: false,
    clues: ["deep-claw-mark"],
    collectionId: "tao-wu"
  },

  {
    id: "zheng",
    name: "狰",
    region: "bamboo-grove",
    hint: "竹林深處似乎有東西正在注視你。",
    position: { x: 0, y: 0 },
    zoomDepth: 5,
    rarity: "rare",
    active: false,
    clues: ["broken-bamboo"],
    collectionId: "zheng"
  }
];

// 目前真正啟用的妖獸。
// 遊戲核心可以只讀取這個陣列。
export const activeMonsters = monsters.filter(
  monster => monster.active
);
