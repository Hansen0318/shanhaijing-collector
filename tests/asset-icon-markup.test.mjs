import test from 'node:test';
import assert from 'node:assert/strict';

import { assetIconMarkup } from '../asset-icon-markup.mjs';

test('configured artwork renders without the legacy emoji', () => {
  const markup = assetIconMarkup({
    name: '青丘靈草',
    icon: '🌿',
    asset: './assets/items/qingqiu-herb.png'
  }, '✦', 'selector-asset');

  assert.match(markup, /<img\b/);
  assert.match(markup, /qingqiu-herb\.png/);
  assert.doesNotMatch(markup, /🌿/);
  assert.doesNotMatch(markup, /asset-fallback/);
});

test('legacy emoji remains available when no artwork is configured', () => {
  const markup = assetIconMarkup({ name: '未完成道具', icon: '✦' });

  assert.equal(markup, '<span class="asset-fallback">✦</span>');
});
