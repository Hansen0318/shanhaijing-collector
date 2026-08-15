// 妖獸資料
// 遊戲核心與內容分離。
// region 是程式內部 ID；regionName 是玩家看到的顯示名稱。

export const monsters = [
  {
    id: "nine-tailed-fox",
    name: "九尾狐",
    region: "qingqiu",
    regionName: "青丘",
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
    regionName: "青丘山脈",
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
    regionName: "月影仙池",
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
    regionName: "青丘山脈",
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
    regionName: "神木森林",
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
    regionName: "青丘河谷",
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
    regionName: "青丘河谷",
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
    regionName: "神木森林",
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
    regionName: "青丘河谷",
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
    regionName: "幽竹林",
    hint: "竹林深處似乎有東西正在注視你。",
    position: { x: 0, y: 0 },
    zoomDepth: 5,
    rarity: "rare",
    active: false,
    clues: ["broken-bamboo"],
    collectionId: "zheng"
  }
];

export const activeMonsters = monsters.filter(
  monster => monster.active
);
