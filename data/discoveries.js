// 尋寶資料層：青丘固定尋寶點。
// 規則：成功取得後進入 60 秒冷卻；冷卻結束即可再次取得。
// 取得後由 discovery-engine.js 發出 shanhaijing:item-collected，
// inventory-ui.js 已經有對應事件接收器。

export const itemDiscoverySpots = [
  {
    id: "qingqiu-herb-spot-01",
    mapId: "qingqiu-01",
    type: "item",
    position: { x: 280, y: 470 },
    radius: 70,
    itemId: "qingqiu-herb",
    quantity: 1,
    cooldownMs: 60000,
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
    cooldownMs: 60000,
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
    cooldownMs: 60000,
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
    cooldownMs: 60000,
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
    cooldownMs: 60000,
    active: true
  }
];

export function getItemDiscoverySpots(mapId) {
  return itemDiscoverySpots.filter(
    spot => spot.active !== false && spot.mapId === mapId
  );
}
