import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const platforms = ['facebook', 'instagram', 'telegram', 'youtube', 'whatsapp', 'website', 'tiktok', 'twitter', 'link'];
export const defaultSettings = {
  title: 'alaskariannews',
  description: 'حسابات المركز الخبري للعتبة العسكرية المقدسة',
  pageTitle: 'حسابات المركز الخبري للعتبة العسكرية المقدسة',
  footer: '© 2026 المركز الخبري للعتبة العسكرية المقدسة',
  logo: '/assets/logo.png',
  logoAlt: 'لوجو العتبة العسكرية',
  descriptionEn: 'Official accounts of the Al-Askari Holy Shrine News Center',
  pageTitleEn: 'Al-Askari Holy Shrine News Center | Official Accounts',
  footerEn: '© 2026 Al-Askari Holy Shrine News Center',
  logoAltEn: 'Al-Askari Holy Shrine News Center logo',
  accent: '#00e5ff',
  backgroundCenter: '#0a5c53',
  backgroundEdge: '#05332e',
  animations: true
};
export const defaultLinks = [
  ['facebook', 'فيسبوك', 'https://www.facebook.com/alaskariannews'],
  ['instagram', 'إنستغرام', 'https://www.instagram.com/alaskarian.news/?hl=ar'],
  ['telegram', 'تلغرام', 'https://t.me/alaskariannews'],
  ['youtube', 'يوتيوب', 'https://www.youtube.com/@alaskariannews'],
  ['whatsapp', 'واتساب', 'https://www.whatsapp.com/channel/0029Vb84oirKbYMMDhYchv1F'],
  ['website', 'الموقع الإلكتروني', 'https://alaskarian.net/']
];
export const defaultEnglishLabels = { facebook: 'Facebook', instagram: 'Instagram', telegram: 'Telegram', youtube: 'YouTube', whatsapp: 'WhatsApp', website: 'Official website' };

export function createStore(directory) {
  mkdirSync(join(directory, 'uploads'), { recursive: true });
  const db = new DatabaseSync(join(directory, 'site.sqlite'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY, platform TEXT NOT NULL, label TEXT NOT NULL, url TEXT NOT NULL,
      visible INTEGER NOT NULL DEFAULT 1, position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS owner (
      id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, hash TEXT NOT NULL, salt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS metrics (
      day TEXT NOT NULL, kind TEXT NOT NULL, link_id TEXT NOT NULL DEFAULT '', count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(day, kind, link_id)
    );
  `);
  // Additive migration preserves existing content and owner accounts.
  const columns = db.prepare('PRAGMA table_info(links)').all().map(column => column.name);
  if (!columns.includes('label_en')) {
    db.exec("ALTER TABLE links ADD COLUMN label_en TEXT NOT NULL DEFAULT ''");
    const update = db.prepare('UPDATE links SET label_en=? WHERE id=? AND label=?');
    for (const [id, label] of defaultLinks) update.run(defaultEnglishLabels[id], id, label);
  }
  if (!columns.includes('icon_url')) db.exec("ALTER TABLE links ADD COLUMN icon_url TEXT NOT NULL DEFAULT ''");
  if (!db.prepare('SELECT id FROM settings WHERE id=1').get()) {
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO settings(id,value) VALUES(1,?)').run(JSON.stringify(defaultSettings));
      const insert = db.prepare('INSERT INTO links(id,platform,label,url,position,label_en) VALUES(?,?,?,?,?,?)');
      defaultLinks.forEach(([platform, label, url], i) => insert.run(platform, platform, label, url, i, defaultEnglishLabels[platform]));
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
  return {
    db,
    settings: () => ({ ...defaultSettings, ...JSON.parse(db.prepare('SELECT value FROM settings WHERE id=1').get().value) }),
    links: () => db.prepare('SELECT id,platform,label,url,visible,position,label_en AS labelEn,icon_url AS iconUrl FROM links ORDER BY position,id').all().map(link => ({ ...link, visible: Boolean(link.visible) })),
    owner: () => db.prepare('SELECT * FROM owner WHERE id=1').get(),
    saveSettings(value) { db.prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(value)); },
    stats() {
      const today = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      const rows = db.prepare('SELECT * FROM metrics WHERE day >= ? ORDER BY day').all(start);
      const daily = Array.from({ length: 30 }, (_, i) => ({
        day: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10), views: 0, clicks: 0
      }));
      const byLink = {};
      let views = 0, clicks = 0, todayViews = 0;
      for (const row of rows) {
        const day = daily.find(d => d.day === row.day);
        if (row.kind === 'view') { views += row.count; if (day) day.views += row.count; if (row.day === today) todayViews += row.count; }
        else { clicks += row.count; if (day) day.clicks += row.count; byLink[row.link_id] = (byLink[row.link_id] || 0) + row.count; }
      }
      return { views, clicks, todayViews, daily, byLink, period: 30, timezone: 'UTC' };
    },
    event(kind, linkId = '') {
      db.prepare(`INSERT INTO metrics(day,kind,link_id,count) VALUES(?,?,?,1)
        ON CONFLICT(day,kind,link_id) DO UPDATE SET count=count+1`)
        .run(new Date().toISOString().slice(0, 10), kind, linkId);
    }
  };
}
