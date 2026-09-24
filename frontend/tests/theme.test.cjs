const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/theme.js'), 'utf8');

function theme(saved, dark = false, blocked = false) {
  const handlers = {};
  const writes = [];
  const root = { dataset: {} };
  const select = { value: '', addEventListener(name, callback) { handlers.select = callback; } };
  const media = { matches: dark, addEventListener(name, callback) { handlers.media = callback; } };
  vm.runInNewContext(source, {
    document: { documentElement: root, getElementById: () => select, addEventListener(name, callback) { handlers.ready = callback; } },
    window: { matchMedia: () => media, addEventListener(name, callback) { handlers.storage = callback; } },
    localStorage: { getItem() { if (blocked) throw Error(); return saved; }, setItem(k,v) { if (blocked) throw Error(); writes.push([k,v]); } }
  });
  handlers.ready();
  return { root, select, media, handlers, writes };
}

test('saved theme wins over system and selection persists', () => {
  const t = theme('light', true);
  assert.equal(t.root.dataset.theme, 'light');
  t.select.value = 'dark'; t.handlers.select();
  assert.equal(t.root.dataset.theme, 'dark');
  assert.deepEqual(t.writes, [['inova_theme','dark']]);
  assert.equal(theme(t.writes[0][1]).root.dataset.theme, 'dark');
});

test('system updates, cross-tab changes, invalid preferences and blocked storage', () => {
  const t = theme('invalid');
  assert.equal(t.select.value, 'system');
  t.media.matches = true; t.handlers.media();
  assert.equal(t.root.dataset.theme, 'dark');
  t.handlers.storage({key:'inova_theme',newValue:'light'});
  assert.equal(t.root.dataset.theme, 'light');
  t.handlers.media();
  assert.equal(t.root.dataset.theme, 'light');
  const b = theme(null, false, true);
  b.select.value = 'dark'; b.handlers.select();
  assert.equal(b.root.dataset.theme, 'dark');
});
