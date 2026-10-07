import http from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, platforms } from './lib/store.js';
import { renderPublic } from './lib/render.js';

const root = dirname(fileURLToPath(import.meta.url));
const deriveKey = promisify(scrypt);
const hashToken = token => createHash('sha256').update(token).digest('hex');
const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
const safeEqual = (a, b) => {
  const first = Buffer.from(String(a || '')), second = Buffer.from(String(b || ''));
  return first.length === second.length && timingSafeEqual(first, second);
};
const text = (value, label, max, allowEmpty = false) => {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) fail(400, `يرجى التحقق من ${label}.`);
  return value.trim();
};
function validLink(input, current = {}) {
  const label = text(input.label, 'اسم الرابط', 100);
  const url = text(input.url, 'عنوان الرابط', 2048);
  let parsed; try { parsed = new URL(url); } catch { fail(400, 'أدخل رابطاً صحيحاً يبدأ بـ https:// أو http://.'); }
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) fail(400, 'نوع الرابط غير مسموح.');
  if (!platforms.includes(input.platform) || typeof input.visible !== 'boolean') fail(400, 'بيانات الرابط غير صالحة.');
  const labelEn = text(input.labelEn ?? current.labelEn ?? '', 'اسم الرابط بالإنجليزية', 100, true);
  const iconUrl = input.iconUrl ?? current.iconUrl ?? '';
  if (typeof iconUrl !== 'string' || (iconUrl !== '' && !/^\/uploads\/[\da-f-]{36}\.(png|jpg|webp)$/.test(iconUrl))) fail(400, 'يرجى رفع صورة صالحة للأيقونة.');
  return { label, labelEn, iconUrl, url, platform: input.platform, visible: input.visible };
}
function validSettings(input, current) {
  const next = { ...current };
  for (const [key, max, label] of [
    ['title', 100, 'اسم الحساب'], ['description', 350, 'وصف الصفحة'], ['pageTitle', 180, 'عنوان الصفحة'],
    ['footer', 250, 'نص التذييل'], ['logoAlt', 150, 'وصف الشعار'],
    ['descriptionEn', 350, 'وصف الصفحة بالإنجليزية'], ['pageTitleEn', 180, 'عنوان الصفحة بالإنجليزية'],
    ['footerEn', 250, 'نص التذييل بالإنجليزية'], ['logoAltEn', 150, 'وصف الشعار بالإنجليزية']
  ]) if (key in input) next[key] = text(input[key], label, max, key === 'footer' || key.endsWith('En'));
  for (const key of ['accent', 'backgroundCenter', 'backgroundEdge']) if (key in input) {
    if (!/^#[a-f\d]{6}$/i.test(input[key])) fail(400, 'لون غير صالح.');
    next[key] = input[key];
  }
  if ('animations' in input) {
    if (typeof input.animations !== 'boolean') fail(400, 'إعداد الحركة غير صالح.');
    next.animations = input.animations;
  }
  if ('logo' in input) {
    if (input.logo !== '/assets/logo.png' && !/^\/uploads\/[\da-f-]{36}\.(png|jpg|webp)$/.test(input.logo)) fail(400, 'يرجى رفع صورة للشعار.');
    next.logo = input.logo;
  }
  return next;
}

export function createApp(options = {}) {
  const dataDir = resolve(options.dataDir || process.env.DATA_DIR || join(root, 'data'));
  const store = createStore(dataDir);
  const appOrigin = options.origin ?? process.env.APP_ORIGIN;
  const setupToken = options.setupToken ?? process.env.SETUP_TOKEN;
  const secure = options.secure ?? process.env.SECURE_COOKIES === 'true';
  const attempts = new Map();
  const sessionLength = 12 * 60 * 60 * 1000;
  function limited(key, maximum, duration) {
    const now = Date.now();
    if (attempts.size > 5000) for (const [k, value] of attempts) if (value.until < now) attempts.delete(k);
    const value = attempts.get(key);
    if (!value || value.until <= now) { attempts.set(key, { count: 1, until: now + duration }); return; }
    if (++value.count > maximum) fail(429, 'محاولات كثيرة. يرجى الانتظار ثم المحاولة مجدداً.');
  }
  function send(res, status, data, type = 'application/json; charset=utf-8') {
    res.writeHead(status, { 'Content-Type': type });
    res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
  }
  async function json(req, limit = 32 * 1024) {
    if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'نوع البيانات غير مدعوم.');
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > limit) fail(413, 'حجم البيانات أكبر من الحد المسموح.');
      chunks.push(chunk);
    }
    try {
      const parsed = JSON.parse(Buffer.concat(chunks).toString());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      return parsed;
    } catch { fail(400, 'صيغة البيانات غير صحيحة.'); }
  }
  function getSession(req) {
    const cookie = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('ask_session='))?.slice(12);
    if (!cookie || !/^[a-f\d]{64}$/.test(cookie)) return null;
    return store.db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hashToken(cookie), Date.now()) || null;
  }
  function authenticate(req, write = false) {
    const session = getSession(req);
    if (!session) fail(401, 'انتهت الجلسة. يرجى تسجيل الدخول.');
    if (write && !safeEqual(req.headers['x-csrf-token'], session.csrf)) fail(403, 'تعذر التحقق من الطلب. حدّث الصفحة وحاول مجدداً.');
    return session;
  }
  function beginSession(res) {
    const token = randomBytes(32).toString('hex');
    const csrf = randomBytes(24).toString('hex');
    store.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    store.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashToken(token), csrf, Date.now() + sessionLength);
    res.setHeader('Set-Cookie', `ask_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionLength / 1000}${secure ? '; Secure' : ''}`);
    return csrf;
  }
  function isLocal(req) {
    const hostname = new URL(`http://${req.headers.host}`).hostname;
    return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
      && ['localhost', '127.0.0.1', '[::1]'].includes(hostname) && !appOrigin;
  }
  async function passwordRecord(password) {
    text(password, 'كلمة المرور (12 حرفاً على الأقل)', 256);
    if (password.length < 12) fail(400, 'استخدم كلمة مرور من 12 حرفاً على الأقل.');
    const salt = randomBytes(16).toString('hex');
    return { salt, hash: (await deriveKey(password, salt, 64)).toString('hex') };
  }
  async function verifyPassword(password, owner) {
    if (typeof password !== 'string' || password.length > 256) return false;
    const hash = await deriveKey(password, owner?.salt || 'missing-owner-constant-salt', 64);
    return Boolean(owner) && safeEqual(hash.toString('hex'), owner.hash);
  }
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; form-action 'self'; base-uri 'none'; object-src 'none'");
    res.setHeader('Cache-Control', 'no-store');
    if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    try {
      const requestOrigin = appOrigin || `http://${req.headers.host}`;
      const url = new URL(req.url, requestOrigin);
      if (appOrigin && req.headers.host !== new URL(appOrigin).host) fail(403, 'عنوان الموقع غير مسموح.');
      if (!appOrigin && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(requestOrigin).hostname)) fail(403, 'اضبط APP_ORIGIN لاستخدام هذا النطاق.');
      const route = url.pathname;
      const writing = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      if (writing && req.headers.origin !== requestOrigin) fail(403, 'الطلب يجب أن يكون من الموقع نفسه.');
      if (['GET', 'HEAD'].includes(req.method) && route === '/') {
        const language = url.searchParams.get('lang') === 'en' ? 'en' : 'ar';
        res.setHeader('Content-Language', language);
        return send(res, 200, req.method === 'HEAD' ? '' : renderPublic(store.settings(), store.links(), language, url.searchParams.has('preview')), 'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && route === '/theme.css') {
        const settings = store.settings();
        return send(res, 200, `:root{--accent:${settings.accent};--background-center:${settings.backgroundCenter};--background-edge:${settings.backgroundEdge}}`, 'text/css; charset=utf-8');
      }
      if (req.method === 'GET' && route === '/api/session') {
        const owner = store.owner(), session = getSession(req);
        return send(res, 200, { setup: !owner, localSetup: isLocal(req), authenticated: Boolean(session), username: session ? owner.username : null, csrf: session?.csrf });
      }
      if (req.method === 'POST' && route === '/api/setup') {
        if (store.owner()) fail(409, 'تم إعداد حساب المدير مسبقاً.');
        limited(`setup:${req.socket.remoteAddress}`, 10, 15 * 60000);
        const body = await json(req);
        if (!isLocal(req) && (!setupToken || !safeEqual(body.setupToken, setupToken))) fail(403, 'رمز الإعداد غير صحيح.');
        const username = text(body.username, 'اسم المستخدم', 80);
        const { hash, salt } = await passwordRecord(body.password);
        // Re-check after async key derivation to prevent two simultaneous owner creations.
        if (store.owner()) fail(409, 'تم إعداد حساب المدير مسبقاً.');
        store.db.prepare('INSERT INTO owner VALUES(1,?,?,?)').run(username, hash, salt);
        return send(res, 201, { username, csrf: beginSession(res) });
      }
      if (req.method === 'POST' && route === '/api/login') {
        limited(`login:${req.socket.remoteAddress}`, 10, 15 * 60000);
        const body = await json(req);
        const owner = store.owner();
        const verified = await verifyPassword(body.password, owner);
        if (!verified || body.username !== owner?.username) fail(401, 'اسم المستخدم أو كلمة المرور غير صحيحة.');
        return send(res, 200, { username: owner.username, csrf: beginSession(res) });
      }
      if (req.method === 'POST' && route === '/api/logout') {
        const session = authenticate(req, true);
        store.db.prepare('DELETE FROM sessions WHERE token=?').run(session.token);
        res.setHeader('Set-Cookie', `ask_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`);
        return send(res, 200, { ok: true });
      }
      if (req.method === 'POST' && route === '/api/events') {
        limited(`event:${req.socket.remoteAddress}`, 120, 60000);
        const body = await json(req, 1024);
        if (body.kind === 'view') store.event('view');
        else if (body.kind === 'click') {
          const link = store.links().find(item => item.id === body.linkId && item.visible);
          if (!link) fail(400, 'الرابط غير موجود.');
          store.event('click', link.id);
        } else fail(400, 'نوع الحدث غير صالح.');
        return send(res, 200, { ok: true });
      }
      if (route.startsWith('/api/admin')) {
        authenticate(req, writing);
        if (req.method === 'GET' && route === '/api/admin/data') return send(res, 200, { settings: store.settings(), links: store.links(), stats: store.stats() });
        if (req.method === 'PUT' && route === '/api/admin/settings') {
          const next = validSettings(await json(req), store.settings());
          if (next.logo.startsWith('/uploads/')) {
            try { await stat(join(dataDir, next.logo)); } catch { fail(400, 'الصورة غير موجودة. أعد رفع الشعار.'); }
          }
          store.saveSettings(next);
          return send(res, 200, { settings: next });
        }
        if (req.method === 'POST' && route === '/api/admin/links') {
          if (store.links().length >= 50) fail(400, 'الحد الأقصى هو 50 رابطاً.');
          const link = validLink(await json(req));
          const id = randomUUID();
          const position = (store.db.prepare('SELECT MAX(position) AS last FROM links').get().last ?? -1) + 1;
          if (link.iconUrl) { try { await stat(join(dataDir, link.iconUrl)); } catch { fail(400, 'صورة الأيقونة غير موجودة. أعد رفع الصورة.'); } }
          store.db.prepare('INSERT INTO links(id,platform,label,url,visible,position,label_en,icon_url) VALUES(?,?,?,?,?,?,?,?)').run(id, link.platform, link.label, link.url, Number(link.visible), position, link.labelEn, link.iconUrl);
          return send(res, 201, { links: store.links() });
        }
        if (req.method === 'PUT' && route === '/api/admin/links/order') {
          const { ids } = await json(req);
          const links = store.links();
          if (!Array.isArray(ids) || ids.length !== links.length || new Set(ids).size !== ids.length || ids.some(id => !links.some(link => link.id === id))) fail(400, 'ترتيب الروابط غير صالح. حدّث الصفحة.');
          store.db.exec('BEGIN');
          try {
            const update = store.db.prepare('UPDATE links SET position=? WHERE id=?');
            ids.forEach((id, i) => update.run(i, id));
            store.db.exec('COMMIT');
          } catch (error) { store.db.exec('ROLLBACK'); throw error; }
          return send(res, 200, { links: store.links() });
        }
        const linkMatch = route.match(/^\/api\/admin\/links\/([\w-]+)$/);
        if (linkMatch && ['PUT', 'DELETE'].includes(req.method)) {
          const id = linkMatch[1];
          const current = store.links().find(link => link.id === id);
          if (!current) fail(404, 'الرابط غير موجود.');
          if (req.method === 'DELETE') store.db.prepare('DELETE FROM links WHERE id=?').run(id);
          else {
            const link = validLink(await json(req), current);
            if (link.iconUrl) { try { await stat(join(dataDir, link.iconUrl)); } catch { fail(400, 'صورة الأيقونة غير موجودة. أعد رفع الصورة.'); } }
            store.db.prepare('UPDATE links SET platform=?,label=?,url=?,visible=?,label_en=?,icon_url=? WHERE id=?').run(link.platform, link.label, link.url, Number(link.visible), link.labelEn, link.iconUrl, id);
          }
          return send(res, 200, { links: store.links() });
        }
        if (req.method === 'POST' && route === '/api/admin/upload') {
          const { data } = await json(req, 3 * 1024 * 1024);
          const match = typeof data === 'string' && data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z\d+/=]+)$/);
          if (!match) fail(400, 'اختر صورة PNG أو JPG أو WebP.');
          const bytes = Buffer.from(match[2], 'base64');
          if (bytes.length > 2 * 1024 * 1024) fail(413, 'الحد الأقصى لحجم الصورة هو 2 ميغابايت.');
          const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
            : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
              : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
          if (!valid) fail(400, 'ملف الصورة غير صالح.');
          const filename = `${randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
          await writeFile(join(dataDir, 'uploads', filename), bytes);
          return send(res, 201, { url: `/uploads/${filename}` });
        }
        if (req.method === 'PUT' && route === '/api/admin/password') {
          const body = await json(req);
          limited(`password:${req.socket.remoteAddress}`, 10, 15 * 60000);
          if (!await verifyPassword(body.currentPassword, store.owner())) fail(400, 'كلمة المرور الحالية غير صحيحة.');
          const { hash, salt } = await passwordRecord(body.password);
          store.db.prepare('UPDATE owner SET hash=?,salt=? WHERE id=1').run(hash, salt);
          store.db.prepare('DELETE FROM sessions').run();
          return send(res, 200, { csrf: beginSession(res) });
        }
        if (req.method === 'GET' && route === '/api/admin/export') {
          res.setHeader('Content-Disposition', 'attachment; filename="alaskarian-content.json"');
          return send(res, 200, { version: 1, exportedAt: new Date().toISOString(), settings: store.settings(), links: store.links(), stats: store.stats() });
        }
        fail(404, 'الطلب غير موجود.');
      }
      if (['GET', 'HEAD'].includes(req.method)) {
        let path;
        if (route === '/admin' || route.startsWith('/admin/')) path = join(root, 'public', 'admin.html');
        else if (/^\/uploads\/[\da-f-]{36}\.(png|jpg|webp)$/.test(route)) path = join(dataDir, route);
        else {
          const publicRoot = join(root, 'public');
          path = resolve(publicRoot, `.${decodeURIComponent(route)}`);
          if (!path.startsWith(publicRoot + sep)) fail(404, 'الصفحة غير موجودة.');
        }
        try {
          const bytes = await readFile(path);
          if (route.startsWith('/assets/') || route.startsWith('/uploads/')) res.setHeader('Cache-Control', 'public, max-age=86400');
          if (route.startsWith('/admin')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          // Imgur serves the original .png URL as JPEG; preserve its public filename with the correct MIME type.
          const type = extname(path) === '.png' && bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg' : mime[extname(path)] || 'application/octet-stream';
          return send(res, 200, req.method === 'HEAD' ? '' : bytes, type);
        } catch (error) { if (error.code === 'ENOENT' || error.code === 'EISDIR') fail(404, 'الصفحة غير موجودة.'); throw error; }
      }
      fail(404, 'الطلب غير موجود.');
    } catch (error) {
      if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : 'حدث خطأ في الخادم. يرجى المحاولة مجدداً.' });
      if (!error.status) console.error(error);
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return { server, store, close: () => new Promise(resolveClose => server.close(() => { store.db.close(); resolveClose(); })) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApp();
  const host = process.env.HOST || '127.0.0.1', port = Number(process.env.PORT || 3000);
  app.server.listen(port, host, () => {
    console.log(`Website: http://${host}:${port}\nAdmin:   http://${host}:${port}/admin`);
    if (!app.store.owner()) console.log('Open /admin to create your owner account.');
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
}
