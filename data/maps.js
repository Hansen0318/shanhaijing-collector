// 世界地圖資料層：地圖、區域、地圖入口與妖獸在地圖上的配置。
// 視覺素材只是表現層；探索邏輯使用 mapId / position / id，不依賴圖片本身。

export const currentMapId = "qingqiu-01";

export const maps = [
  {
    id: "qingqiu-01",
    name: "青丘",
    layer: 1,
    world: { width: 1800, height: 1200 },
    // 目前是測試地圖；未來替換正式美術只需更新 background / asset。
    background: {
      type: "generated-test",
      asset: null
    },
    regions: [
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
    ],
    entrances: [
      {
        id: "qingqiu-01-to-02-cave",
        type: "map-transition",
        position: { x: 760, y: 1085 },
        radius: 70,
        destinationMapId: "qingqiu-02",
        enabled: false
      }
    ]
  },
  {
    id: "qingqiu-02",
    name: "青丘深層",
    layer: 2,
    world: { width: 1800, height: 1200 },
    background: {
      type: "generated-placeholder",
      asset: null
    },
    regions: [],
    entrances: []
  }
];

export const monsterPlacements = {
  "qingqiu-01": [
    {
      monsterId: "nine-tailed-fox",
      regionId: "qingqiu-country",
      position: { x: 760, y: 520 }
    },
    {
      monsterId: "bi-fang",
      regionId: "mingxing-mountain",
      position: { x: 1450, y: 320 }
    },
    {
      monsterId: "fu-zhu",
      regionId: "qingqiu-country",
      position: { x: 500, y: 760 }
    }
  ],
  "qingqiu-02": []
};

export function getMapById(mapId) {
  return maps.find(map => map.id === mapId) ?? maps[0];
}

export function getMonsterPlacements(mapId) {
  return monsterPlacements[mapId] ?? [];
}

export function getMapEntrances(mapId) {
  return getMapById(mapId).entrances ?? [];
}
