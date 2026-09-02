// 尋寶資料層。
// 道具點在玩家第一次成功尋寶前保持隱藏；成功取得後才顯示圖示並進入冷卻。

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
    position: { x: 700, y: 820 },
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
    position: { x: 950, y: 300 },
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
    position: { x: 1650, y: 450 },
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
