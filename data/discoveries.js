// 尋寶資料層。
// 道具會一直留在地圖上，玩家實際點擊成功後取得 1 個，
// 之後進入 60 秒冷卻；冷卻完成只代表「可以再次點擊」，
// 不會自動增加背包數量。

export const itemDiscoverySpots = [
  {
    id: "qingqiu-herb-spot-01",
    mapId: "qingqiu-01",
    type: "item",
    position: { x: 280, y: 470 },
    radius: 70,
    discoveryZoom: 2.0,
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
    discoveryZoom: 2.0,
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
    discoveryZoom: 2.0,
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
    discoveryZoom: 2.0,
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
    discoveryZoom: 2.0,
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
