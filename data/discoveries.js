// 世界探索／尋寶資料層。
// 目前先建立資料模型，不啟用實際取得流程；下一階段由 game.js 探索引擎消費此資料。
// 新增道具時優先增加資料，不應在 game.js 寫死座標與 itemId。

export const itemDiscoverySpots = [
  {
    id: "qingqiu-herb-spot-01",
    mapId: "qingqiu-01",
    type: "item",
    position: { x: 280, y: 470 },
    radius: 70,
    itemId: "qingqiu-herb",
    quantity: 1,
    once: true,
    active: true
  },
  {
    id: "ling-fruit-spot-01",
    mapId: "qingqiu-01",
    type: "item",
    position: { x: 610, y: 300 },
    radius: 70,
    itemId: "ling-fruit",
    quantity: 1,
    once: true,
    active: true
  },
  {
    id: "dew-crystal-spot-01",
    mapId: "qingqiu-01",
    type: "item",
    position: { x: 520, y: 700 },
    radius: 70,
    itemId: "dew-crystal",
    quantity: 1,
    once: true,
    active: true
  },
  {
    id: "moon-jade-spot-01",
    mapId: "qingqiu-01",
    type: "item",
    position: { x: 850, y: 410 },
    radius: 70,
    itemId: "moon-jade",
    quantity: 1,
    once: true,
    active: true
  },
  {
    id: "flame-crystal-spot-01",
    mapId: "qingqiu-01",
    type: "item",
    position: { x: 1460, y: 430 },
    radius: 70,
    itemId: "flame-crystal",
    quantity: 1,
    once: true,
    active: true
  }
];

export function getItemDiscoverySpots(mapId) {
  return itemDiscoverySpots.filter(spot => spot.active !== false && spot.mapId === mapId);
}
