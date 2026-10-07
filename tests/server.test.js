import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server.js';
import { createStore, defaultSettings } from '../lib/store.js';
import { DatabaseSync } from 'node:sqlite';

test('authenticated content management, persistence, analytics, uploads, and security', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'alaskarian-test-'));
  let app = createApp({ dataDir: directory });
  let origin, cookie = '', csrf = '';
  const password = 'OnlyForTests!2026';
  async function listen() { app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening'); origin = `http://127.0.0.1:${app.server.address().port}`; }
  async function request(path, method = 'GET', body, overrides = {}) {
    const headers = { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf, ...overrides };
    const response = await fetch(origin + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await response.text();
    return { response, status: response.status, body: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(data) : data };
  }
  function session(result) { cookie = result.response.headers.get('set-cookie').split(';')[0]; csrf = result.body.csrf; }
  await listen();
  try {
    await t.test('renders the exact default content without JavaScript or external assets', async () => {
      const result = await request('/'); assert.equal(result.status, 200);
      assert.match(result.body, /alaskariannews/); assert.match(result.body, /حسابات المركز الخبري/);
      assert.equal((result.body.match(/class="link-item"/g) || []).length, 6);
      assert.match(result.body, /https:\/\/www.facebook.com\/alaskariannews/);
      assert.doesNotMatch(result.body, /fonts.googleapis|cdnjs.cloudflare|imgur.com/);
      assert.equal((await request('/api/admin/data')).status, 401);
    });
    await t.test('serves Arabic and English with correct metadata, direction, labels, and language links', async () => {
      const arabic = await request('/'); assert.match(arabic.body, /lang="ar" dir="rtl"/);
      const english = await request('/?lang=en&preview=1');
      assert.equal(english.response.headers.get('content-language'), 'en');
      assert.match(english.body, /lang="en" dir="ltr"/); assert.match(english.body, />Facebook</);
      assert.match(english.body, /Official accounts of the Al-Askari/);
      assert.match(english.body, /href="\/\?lang=ar&amp;preview=1"/);
      assert.match((await request('/?lang=unknown')).body, /lang="ar" dir="rtl"/);
    });
    await t.test('one-time owner setup validates password and issues an HttpOnly session', async () => {
      assert.equal((await request('/api/session')).body.setup, true);
      assert.equal((await request('/api/setup', 'POST', { username: 'admin', password: 'short' })).status, 400);
      const result = await request('/api/setup', 'POST', { username: 'admin', password }); assert.equal(result.status, 201);
      assert.match(result.response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/); session(result);
      assert.equal((await request('/api/setup', 'POST', { username: 'attacker', password })).status, 409);
      assert.equal((await request('/api/session')).body.authenticated, true);
    });
    await t.test('rejects cross-origin writes, missing CSRF, script URLs, and traversal', async () => {
      assert.equal((await request('/api/admin/settings', 'PUT', { title: 'bad' }, { Origin: 'https://evil.example' })).status, 403);
      assert.equal((await request('/api/admin/settings', 'PUT', { title: 'bad' }, { 'X-CSRF-Token': '' })).status, 403);
      assert.equal((await request('/api/admin/links', 'POST', { label: 'unsafe', platform: 'link', url: 'javascript:alert(1)', visible: true })).status, 400);
      assert.equal((await request('/api/admin/links', 'POST', { label: 'unsafe', platform: 'link', url: 'https://user:password@example.com', visible: true })).status, 400);
      assert.equal((await request('/%2e%2e%2fserver.js')).status, 404);
      assert.equal((await request('/data/site.sqlite')).status, 404);
      assert.equal((await request('/api/admin/settings', 'PUT', { accent: 'red;}' })).status, 400);
    });
    let id;
    await t.test('creates, edits, hides, orders, and deletes links', async () => {
      let result = await request('/api/admin/links', 'POST', { label: 'اختبار', platform: 'link', url: 'https://example.com/a', visible: true });
      assert.equal(result.status, 201); assert.equal(result.body.links.length, 7); id = result.body.links.at(-1).id;
      result = await request(`/api/admin/links/${id}`, 'PUT', { label: 'Updated', platform: 'website', url: 'https://example.com/b', visible: false });
      assert.equal(result.status, 200); assert.doesNotMatch((await request('/')).body, /example.com\/b/);
      const ids = result.body.links.map(l => l.id).reverse();
      result = await request('/api/admin/links/order', 'PUT', { ids }); assert.deepEqual(result.body.links.map(l => l.id), ids);
      assert.equal((await request('/api/admin/links/order', 'PUT', { ids: [id] })).status, 400);
      result = await request(`/api/admin/links/${id}`, 'DELETE'); assert.equal(result.body.links.length, 6);
      assert.equal((await request(`/api/admin/links/${id}`, 'DELETE')).status, 404);
    });
    await t.test('escapes public content and persists theme settings', async () => {
      const result = await request('/api/admin/settings', 'PUT', { title: '<script>alert(1)</script>', backgroundCenter: '#123456', animations: false });
      assert.equal(result.status, 200); const page = await request('/');
      assert.match(page.body, /&lt;script&gt;/); assert.doesNotMatch(page.body, /<script>alert/); assert.match(page.body, /class="no-motion"/);
      assert.match((await request('/theme.css')).body, /#123456/);
    });
    await t.test('stores actual aggregate events and validates event IDs', async () => {
      assert.equal((await request('/api/events', 'POST', { kind: 'view' })).status, 200);
      assert.equal((await request('/api/events', 'POST', { kind: 'click', linkId: 'facebook' })).status, 200);
      assert.equal((await request('/api/events', 'POST', { kind: 'click', linkId: 'does-not-exist' })).status, 400);
      const { stats } = (await request('/api/admin/data')).body;
      assert.equal(stats.views, 1); assert.equal(stats.clicks, 1); assert.equal(stats.byLink.facebook, 1); assert.equal(stats.daily.length, 30);
    });
    let logo;
    await t.test('uploads real images and rejects unsafe or spoofed types', async () => {
      assert.equal((await request('/api/admin/upload', 'POST', { data: 'data:image/svg+xml;base64,PHN2Zz4=' })).status, 400);
      assert.equal((await request('/api/admin/upload', 'POST', { data: 'data:image/png;base64,PHN2Zz4=' })).status, 400);
      const bytes = await readFile(new URL('../public/assets/logo.png', import.meta.url));
      const result = await request('/api/admin/upload', 'POST', { data: `data:image/jpeg;base64,${bytes.toString('base64')}` }); assert.equal(result.status, 201); logo = result.body.url;
      assert.equal((await request('/api/admin/settings', 'PUT', { logo })).status, 200);
      const image = await fetch(origin + logo); assert.equal(image.status, 200); assert.equal((await image.arrayBuffer()).byteLength, bytes.length);
    });
    await t.test('persists custom link icons and translations, validates icon paths, and restores platform icons', async () => {
      const current = (await request('/api/admin/data')).body.links.find(link => link.id === 'facebook');
      let result = await request('/api/admin/links/facebook', 'PUT', { ...current, labelEn: 'Facebook newsroom', iconUrl: logo });
      assert.equal(result.status, 200);
      let page = await request('/?lang=en'); assert.match(page.body, />Facebook newsroom</); assert.match(page.body, /class="custom-link-icon"/);
      result = await request('/api/admin/links/facebook', 'PUT', { ...current, iconUrl: 'https://example.com/icon.svg' }); assert.equal(result.status, 400);
      result = await request('/api/admin/links/facebook', 'PUT', { ...current, iconUrl: '/uploads/00000000-0000-0000-0000-000000000000.png' }); assert.equal(result.status, 400);
      // Legacy clients that omit the new fields must not erase a saved translation/icon.
      result = await request('/api/admin/links/facebook', 'PUT', { label: current.label, platform: current.platform, url: current.url, visible: current.visible });
      assert.equal(result.body.links.find(link => link.id === 'facebook').iconUrl, logo);
      assert.equal(result.body.links.find(link => link.id === 'facebook').labelEn, 'Facebook newsroom');
      result = await request('/api/admin/links/facebook', 'PUT', { ...current, iconUrl: '' }); assert.equal(result.status, 200);
      assert.doesNotMatch((await request('/')).body, /class="custom-link-icon"/);
    });
    await t.test('stores and safely renders English page text with an Arabic fallback', async () => {
      assert.equal((await request('/api/admin/settings', 'PUT', { descriptionEn: 'English newsroom description', pageTitleEn: '<script>English title</script>', footerEn: '' })).status, 200);
      const english = (await request('/?lang=en')).body;
      assert.match(english, /English newsroom description/); assert.match(english, /&lt;script&gt;English title&lt;\/script&gt;/);
      assert.match(english, /© 2026 المركز الخبري/);
      assert.doesNotMatch((await request('/')).body, /English newsroom description/);
    });
    await t.test('data and sessions survive a server restart', async () => {
      await app.close(); app = createApp({ dataDir: directory }); await listen();
      const result = await request('/api/admin/data'); assert.equal(result.status, 200); assert.equal(result.body.settings.logo, logo); assert.equal(result.body.stats.views, 1);
      assert.equal(result.body.links[0].id, 'website'); assert.equal(result.body.settings.title, '<script>alert(1)</script>');
    });
    await t.test('changes password, invalidates old sessions, and supports logout', async () => {
      const oldCookie = cookie;
      assert.equal((await request('/api/admin/password', 'PUT', { currentPassword: 'wrong', password: 'ANewPassword!2026' })).status, 400);
      const result = await request('/api/admin/password', 'PUT', { currentPassword: password, password: 'ANewPassword!2026' }); assert.equal(result.status, 200); session(result);
      assert.equal((await request('/api/admin/data', 'GET', undefined, { Cookie: oldCookie })).status, 401);
      assert.equal((await request('/api/admin/export')).status, 200);
      const exported = (await request('/api/admin/export')).body; assert.equal(exported.version, 1); assert.equal(exported.hash, undefined); assert.equal(exported.password, undefined);
      assert.equal((await request('/api/logout', 'POST', {})).status, 200);
      assert.equal((await request('/api/admin/data')).status, 401);
      assert.equal((await request('/api/login', 'POST', { username: 'admin', password })).status, 401);
      const login = await request('/api/login', 'POST', { username: 'admin', password: 'ANewPassword!2026' }); assert.equal(login.status, 200); session(login);
      assert.equal((await request('/api/admin/data')).status, 200);
    });
  } finally { await app.close(); await rm(directory, { recursive: true, force: true }); }
});

test('upgrades a legacy database without replacing existing links, settings, or owner', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'alaskarian-migration-'));
  const legacy = new DatabaseSync(join(directory, 'site.sqlite'));
  legacy.exec('CREATE TABLE links(id TEXT PRIMARY KEY,platform TEXT NOT NULL,label TEXT NOT NULL,url TEXT NOT NULL,visible INTEGER NOT NULL,position INTEGER NOT NULL); CREATE TABLE settings(id INTEGER PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE owner(id INTEGER PRIMARY KEY,username TEXT NOT NULL,hash TEXT NOT NULL,salt TEXT NOT NULL);');
  legacy.prepare('INSERT INTO settings VALUES(1,?)').run(JSON.stringify({ ...defaultSettings, title: 'Existing account' }));
  legacy.prepare('INSERT INTO links VALUES(?,?,?,?,?,?)').run('facebook', 'facebook', 'فيسبوك', 'https://example.com/existing', 0, 7);
  legacy.prepare('INSERT INTO owner VALUES(1,?,?,?)').run('existing-owner', 'existing-hash', 'existing-salt');
  legacy.close();
  const store = createStore(directory);
  try {
    assert.equal(store.settings().title, 'Existing account'); assert.equal(store.owner().username, 'existing-owner');
    assert.equal(store.links().length, 1); assert.equal(store.links()[0].url, 'https://example.com/existing');
    assert.equal(store.links()[0].visible, false); assert.equal(store.links()[0].position, 7);
    assert.equal(store.links()[0].labelEn, 'Facebook'); assert.equal(store.links()[0].iconUrl, '');
  } finally { store.db.close(); await rm(directory, { recursive: true, force: true }); }
});
