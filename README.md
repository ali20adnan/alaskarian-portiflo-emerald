# Alaskarian News links and admin dashboard

A faithful, locally hosted recreation of https://newsasskariaan.netlify.app/ with an Arabic/English admin dashboard. The public page reuses the reference's CSS, Cairo font, Font Awesome icons, original logo, copy, six destinations, hover effects, and animations, with the requested language switch added. Assets are served locally. The original HTML is saved in `reference/original.html`.

## Run

Requires **Node.js 24 or newer**. There are no npm dependencies to install.

```sh
npm start
```

This workspace's `.env` selects **http://127.0.0.1:4317**. Open **http://127.0.0.1:4317/admin** and create your administrator username and password. No default password exists. Setup is available only once and is restricted to a local connection unless a server setup token is configured.

Without `.env`, the default port is 3000. To customize, copy `.env.example` to `.env` and set `PORT` and `HOST`. `npm run dev` restarts the server on source changes.

## Dashboard

- Overview with actual, aggregate page visits and link clicks over 30 days (UTC).
- Create, edit, delete, search, show/hide, and reorder links.
- Upload a custom image icon for each link, or restore its standard platform icon.
- Switch both the public page and the entire admin dashboard between Arabic (RTL) and English (LTR).
- Edit English link labels, page description, browser title, logo description, and footer alongside the Arabic versions. Missing English content falls back to Arabic.
- Platform icons for Facebook, Instagram, Telegram, YouTube, WhatsApp, the website, TikTok, Twitter, and generic links.
- Edit account name, Arabic description, browser title, footer, logo alt text, colors, and animations.
- Upload PNG, JPEG, or WebP logos up to 2 MB; restore the original logo or colors.
- Preview the saved page without counting preview visits.
- Change the admin password and invalidate other sessions.
- Export content and aggregate analytics as JSON. The export does **not** include image files, credentials, or an import mechanism.

Settings, links, password hashes, sessions, and metrics live in `data/site.sqlite`. Uploaded images live in `data/uploads`. This is shared server data, not browser storage. Stop the app before copying the entire `data` directory for a full backup. Keep that directory on a persistent volume when deploying.

The public page uses server-rendered HTML, so its links work without JavaScript. JavaScript only records aggregate visits and clicks. No visitor identifiers, tracking cookies, or IP addresses are stored in analytics. Counts include page reloads and are not unique visitors; they are basic aggregate metrics, not bot-filtered analytics.

## Languages and custom icons

Use the **English / العربية** button to switch languages. Public URLs support `/?lang=ar` and `/?lang=en`; the dashboard also accepts `/admin?lang=en` and remembers its interface language on the device. Switching the dashboard language preserves unsaved form fields. Public previews follow the dashboard's selected language.

To add a custom icon, open **Manage links → Edit → Upload icon**, choose a PNG, JPG, or WebP image (up to 2 MB), then **Save link**. **Use platform icon** removes the custom override after saving. Custom icons are stored locally alongside uploaded logos and are included by path in content exports.

Existing databases are upgraded automatically with additive columns; existing links, their visibility/order, settings, and administrator accounts are preserved.

## Authentication and hosting

Passwords use salted scrypt hashes. Sessions use random tokens, stored as hashes, and expire after 12 hours. Cookies are HttpOnly and SameSite=Strict; mutations require same-origin requests and authenticated mutations also require a CSRF token. Login attempts are rate-limited. Content is validated and escaped; SVG uploads are rejected. The dashboard is excluded from indexing.

For deployment, use a Node.js server with persistent disk, behind an HTTPS reverse proxy:

```dotenv
HOST=0.0.0.0
PORT=3000
APP_ORIGIN=https://your-domain.example
SECURE_COOKIES=true
SETUP_TOKEN=a-long-random-secret-for-first-account-creation
DATA_DIR=/persistent/alaskarian
```

Set `APP_ORIGIN` to the exact public origin (without a trailing slash). Preserve that host header through the reverse proxy. A remote first-time setup requires `SETUP_TOKEN`; remove the token once the owner account exists. Do not use `SECURE_COOKIES=true` over plain HTTP. Run a single server process for this small site; rate limiting is per-process. This implementation cannot be hosted as static files alone because its dashboard uses a Node server and SQLite. No deployment or changes to the original Netlify site have been made.

## Verification

```sh
npm run check
npm test
```

Integration tests use isolated temporary databases and cover authentication, CSRF, URL validation, content escaping, link CRUD and ordering, settings, uploads, aggregate metrics, password changes, logout, and persistence after restart. `node scripts/qa-server.mjs` runs a separate browser-QA instance on port 4174 with data under ignored `test-results/browser-data`.

The original appearance is deliberately preserved, including its rounded container, low-opacity footer, and narrow layout on large screens. Browser zoom, keyboard focus indicators, and reduced-motion support are improved without changing the default visual layout. No claim is made about inaccessible backend functionality at the reference site; its public page contains six external links and no original admin interface.

## Asset provenance

The original logo and public page originate from the supplied reference URL. Cairo is distributed under the SIL Open Font License; Font Awesome fonts under the SIL OFL and code under MIT. License texts are included in `public/assets`. `npm run assets` refreshes the captured reference and local assets and regenerates `public/site.css`.
