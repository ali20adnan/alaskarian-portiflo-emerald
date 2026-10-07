import { getLanguage, setLanguage, t, localizeHtml as L } from './i18n.js';
document.querySelector('.skip-link').textContent = t('انتقل إلى المحتوى');
const app = document.querySelector('#app');
const dialog = document.querySelector('#editor');
const state = { session: null, data: null, page: 'overview', dirty: false, busy: false, search: '' };
const names = { overview: 'نظرة عامة', links: 'إدارة الروابط', appearance: 'هوية الصفحة', account: 'إعدادات الحساب' };
const platformNames = { facebook: 'فيسبوك', instagram: 'إنستغرام', telegram: 'تلغرام', youtube: 'يوتيوب', whatsapp: 'واتساب', website: 'الموقع الإلكتروني', tiktok: 'تيك توك', twitter: 'X / تويتر', link: 'رابط مخصص' };
const iconPaths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  link: '<path d="m10 13 4-4m-5 7-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 8a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2" transform="translate(1 0) scale(.9)"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 1.8 1.8 0 0 1 1-3.3h2a4 4 0 0 0 4-4c0-4-4-7-9-7Z"/><circle cx="7.5" cy="10" r=".6"/><circle cx="11" cy="7" r=".6"/><circle cx="15" cy="8" r=".6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 3 3-1 2 2 3-1 1-3 3-1 1-3-2-2 1-3-3-2-3 1-2-2Z"/>',
  external: '<path d="M14 3h7v7m0-7L10 14m0-11H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  logout: '<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m5-15 5 5-5 5m-7-5h12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  click: '<path d="m5 3 5 17 3-6 6-3L5 3Zm8 11 5 6"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L21 6a2.8 2.8 0 0 0-4-4L4 15v5Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  up: '<path d="m6 14 6-6 6 6"/>',
  down: '<path d="m6 10 6 6 6-6"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  save: '<path d="M4 3h13l4 4v14H3V3h1Zm3 0v6h10V3M7 21v-8h10v8"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 15v6h16v-6"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5m11-1a8 8 0 0 0-14-5M4 13a8 8 0 0 0 14 5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  check: '<path d="m5 12 4 4L19 6"/>'
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.link}</svg>`; }
function e(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function number(value) { return new Intl.NumberFormat(getLanguage() === 'en' ? 'en-US' : 'ar-IQ').format(value); }
function linkLabel(link) { return getLanguage() === 'en' ? link.labelEn || link.label : link.label; }
function languageControl() { return `<button class="btn small language-control" type="button" data-action="language" lang="${getLanguage() === 'en' ? 'ar' : 'en'}" aria-label="${getLanguage() === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}">${getLanguage() === 'en' ? 'العربية' : 'English'}</button>`; }
function platformIcon(platform, iconUrl = '') {
  if (iconUrl) return `<img class="custom-link-image" src="${e(iconUrl)}" alt="">`;
  if (platform === 'website') return `<img src="${e(state.data?.settings.logo || '/assets/logo.png')}" alt="">`;
  const classes = { facebook: 'facebook-f', instagram: 'instagram', telegram: 'telegram-plane', youtube: 'youtube', whatsapp: 'whatsapp', tiktok: 'tiktok', twitter: 'x-twitter' };
  return `<i class="${classes[platform] ? 'fab' : 'fas'} fa-${classes[platform] || 'link'}" aria-hidden="true"></i>`;
}
function toast(message, bad = false) {
  const node = document.querySelector('#toast');
  node.textContent = t(message); node.classList.toggle('bad', bad); node.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { node.hidden = true; }, 4500);
}
async function api(path, method = 'GET', body) {
  let response;
  try {
    response = await fetch(path, { method, headers: { 'Content-Type': 'application/json', ...(state.session?.csrf ? { 'X-CSRF-Token': state.session.csrf } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  } catch { throw new Error('تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مجدداً.'); }
  let data; try { data = await response.json(); } catch { throw new Error('تعذر قراءة استجابة الخادم. حاول مجدداً.'); }
  if (!response.ok) {
    if (response.status === 401 && path.startsWith('/api/admin')) {
      state.session = { authenticated: false, setup: false }; state.dirty = false; dialog.close(); renderAuth();
    }
    throw new Error(t(data.error || 'تعذر إتمام الطلب.'));
  }
  return data;
}
function passwordField(id, label, autocomplete = 'current-password', min = '') {
  return `<div class="field"><label for="${id}">${label}</label><div class="password-wrap"><input id="${id}" name="${id}" type="password" required ${min ? `minlength="${min}"` : ''} maxlength="256" autocomplete="${autocomplete}" dir="ltr"><button class="icon-btn password-toggle" type="button" data-action="password-visibility" data-target="${id}" aria-label="إظهار كلمة المرور" aria-pressed="false">${icon('eye')}</button></div></div>`;
}
function renderAuth() {
  const setup = state.session.setup;
  app.innerHTML = L(`<main id="main-content" class="auth-page">
    <section class="auth-brand"><div class="brand-mark"><img src="/assets/logo.png" alt="المركز الخبري"><div><strong>المركز الخبري</strong><small>العتبة العسكرية المقدسة</small></div></div>
      <div class="auth-message"><div class="auth-label">${icon('link')} منصة إدارة الحسابات</div><h1>حضورٌ واحد.<br>وكل قنواتكم أقرب.</h1><p>مساحة واحدة لإدارة حسابات المركز الخبري، وتحديث الروابط، ومتابعة تفاعل الزوار.</p></div>
      <div class="auth-footer">المركز الخبري للعتبة العسكرية المقدسة</div></section>
    <section class="auth-form-wrap"><div class="auth-language">${languageControl()}</div><form class="auth-form" id="auth-form"><h2>${setup ? 'مرحباً بمدير الموقع' : 'أهلاً بعودتك'}</h2><p>${setup ? 'أنشئ حسابك لبدء إدارة الصفحة. يتم إعداد هذا الحساب مرة واحدة فقط.' : 'سجّل دخولك لإدارة حسابات المركز الخبري.'}</p>
      <div class="error" id="auth-error" role="alert" hidden></div>
      <div class="field"><label for="username">اسم المستخدم</label><input id="username" name="username" required maxlength="80" autocomplete="username" placeholder="أدخل اسم المستخدم" dir="auto"></div>
      ${passwordField('password', 'كلمة المرور', setup ? 'new-password' : 'current-password', setup ? '12' : '')}
      ${setup ? `${passwordField('confirmPassword', 'تأكيد كلمة المرور', 'new-password', '12')}<p class="notice">اختر كلمة مرور لا تقل عن 12 حرفاً واحتفظ بها في مكان آمن.</p>` : ''}
      ${setup && !state.session.localSetup ? '<div class="field section-gap"><label for="setupToken">رمز إعداد الموقع</label><input id="setupToken" name="setupToken" type="password" required autocomplete="off"><small>رمز الإعداد المحدد على خادم الموقع.</small></div>' : ''}
      <button class="btn primary" type="submit">${icon(setup ? 'shield' : 'lock')}${setup ? 'إنشاء حساب المدير' : 'تسجيل الدخول'}</button>
      <a class="auth-back" href="/">العودة إلى الصفحة الرئيسية ${icon('left')}</a>
    </form></section></main>`);
  document.querySelector('#auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget, button = form.querySelector('[type=submit]'), error = form.querySelector('#auth-error');
    const body = Object.fromEntries(new FormData(form)); error.hidden = true;
    if (setup && body.password !== body.confirmPassword) { error.textContent = t('كلمتا المرور غير متطابقتين.'); error.hidden = false; return; }
    button.disabled = true;
    try {
      const result = await api(setup ? '/api/setup' : '/api/login', 'POST', body);
      state.session = { authenticated: true, setup: false, ...result };
      state.data = await api('/api/admin/data');
      renderShell(); toast(setup ? 'تم إنشاء حسابك. لوحة الإدارة جاهزة.' : 'تم تسجيل الدخول بنجاح.');
    } catch (err) { error.textContent = t(err.message); error.hidden = false; }
    finally { button.disabled = false; }
  });
}
function renderShell() {
  state.page = Object.hasOwn(names, location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  const username = state.session.username;
  app.innerHTML = L(`<button class="menu-scrim" data-action="menu-close" aria-label="إغلاق القائمة"></button>
  <aside class="sidebar" aria-label="القائمة الرئيسية"><div class="brand-mark"><img id="sidebar-logo" src="${e(state.data.settings.logo)}" alt="المركز الخبري"><div><strong>المركز الخبري</strong><small>العتبة العسكرية المقدسة</small></div></div>
    <p class="nav-label">مساحة الإدارة</p><nav>${Object.entries(names).map(([key, label], i) => `<a class="nav-item ${state.page === key ? 'active' : ''}" href="#${key}" data-nav="${key}" ${state.page === key ? 'aria-current="page"' : ''}>${icon(['grid', 'link', 'palette', 'settings'][i])}<span>${label}</span>${key === 'links' ? `<span class="nav-count">${number(state.data.links.length)}</span>` : ''}</a>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="sidebar-note">${icon('shield')} <strong>مساحتك الآمنة</strong><p>تحديثاتك تُحفظ وتظهر مباشرة على صفحة الحسابات.</p></div><a class="nav-item" href="/" target="_blank" rel="noopener">${icon('external')}زيارة الموقع</a><button class="nav-item logout" data-action="logout">${icon('logout')}تسجيل الخروج</button></div>
  </aside><div class="workspace"><header class="topbar"><div class="row"><button class="icon-btn mobile-menu" data-action="menu" aria-label="فتح القائمة" aria-expanded="false">${icon('menu')}</button><div class="breadcrumbs"><span>لوحة الإدارة</span>${icon('left')}<strong id="breadcrumb">${names[state.page]}</strong></div></div><div class="topbar-user">${languageControl()}<div class="user-detail"><strong>${e(username)}</strong><small>مدير الموقع</small></div><div class="avatar">${e(username.slice(0, 1).toUpperCase())}</div></div></header><main id="main-content" class="content" tabindex="-1"></main></div>`);
  renderPage();
  syncMenuAccessibility();
}
function heading(title, description, action = '') { return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action}</div>`; }
function preview() {
  return `<aside class="panel preview-panel" aria-label="معاينة الصفحة"><div class="preview-title"><h2>معاينة مباشرة</h2><span class="pill green"><span class="dot"></span>مباشر</span></div><div class="preview-window"><iframe src="/?preview=1" title="معاينة صفحة الحسابات" tabindex="-1" loading="lazy"></iframe></div><p class="preview-caption">هكذا تظهر صفحتك لزوار الهاتف.<br>تنعكس التحديثات المحفوظة هنا تلقائياً.</p><a class="preview-link" href="/?preview=1" target="_blank" rel="noopener">فتح المعاينة ${icon('external')}</a></aside>`;
}
function footer() { return '<footer class="page-foot"><span>المركز الخبري للعتبة العسكرية المقدسة</span><span>لوحة إدارة الحسابات · جميع التغييرات تُحفظ بأمان</span></footer>'; }
function statusPill(visible) { return `<span class="pill ${visible ? 'green' : 'gray'}"><span class="dot"></span>${visible ? 'ظاهر' : 'مخفي'}</span>`; }
function overview() {
  const { links, stats } = state.data;
  const max = Math.max(1, ...stats.daily.map(day => day.views));
  return `${heading('كل حساباتكم، في مكان واحد', 'تابع أداء الصفحة، وأبقِ جمهورك على اتصال.', `<a class="btn" href="/" target="_blank" rel="noopener">${icon('external')}عرض الصفحة</a>`)}
    <div class="dashboard-grid"><div class="main-column"><div class="metric-grid">
      ${[[stats.views, 'زيارات الصفحة', 'eye', 'آخر 30 يوماً'], [stats.clicks, 'نقرات الروابط', 'click', 'آخر 30 يوماً'], [links.filter(l => l.visible).length, 'روابط ظاهرة', 'link', `من أصل ${number(links.length)} روابط`]].map(([value, label, symbol, note]) => `<article class="metric"><div class="metric-label"><span>${label}</span>${icon(symbol)}</div><strong class="metric-value">${number(value)}</strong><span class="metric-foot">${note}</span></article>`).join('')}
    </div><section class="panel performance"><div class="chart-head"><div><h2>تفاعل الزوار</h2><p>زيارات الصفحة خلال آخر 30 يوماً · UTC</p></div><span class="chart-legend"><span class="dot"></span>الزيارات</span></div><div class="chart" role="img" aria-label="مخطط الزيارات: ${number(stats.views)} زيارة خلال آخر 30 يوماً">${stats.daily.map(day => `<div class="chart-bar" data-height="${Math.max(2, day.views / max * 125)}" title="${day.day}: ${day.views} زيارة"></div>`).join('')}${stats.views ? '' : '<div class="chart-empty">ستظهر الزيارات هنا بعد فتح الصفحة العامة.</div>'}</div><div class="chart-labels"><span>${stats.daily[0].day}</span><span>${stats.daily.at(-1).day}</span></div></section>
    <section class="panel section-gap"><div class="panel-header"><div><h2>قنوات التواصل</h2><p>روابطك وأداء كل قناة خلال 30 يوماً</p></div><a class="text-button" href="#links" data-nav="links">إدارة الروابط ${icon('left')}</a></div>${links.length ? links.map(link => `<div class="summary-row"><div class="platform-icon ${e(link.platform)}">${platformIcon(link.platform, link.iconUrl)}</div><div class="link-info"><strong>${e(linkLabel(link))}</strong><small>${e(link.url.replace(/^https?:\/\//, ''))}</small></div>${statusPill(link.visible)}<div class="link-clicks">${number(stats.byLink[link.id] || 0)}<small>نقرة</small></div><button class="icon-btn" data-action="edit" data-id="${e(link.id)}" aria-label="تعديل ${e(linkLabel(link))}">${icon('edit')}</button></div>`).join('') : '<div class="empty"><h3>أضف أول رابط</h3><p>ابدأ بربط جمهورك بقنوات المركز الخبري.</p><button class="btn primary" data-action="add">إضافة رابط</button></div>'}</section>
    </div>${preview()}</div>${footer()}`;
}
function linkRows() {
  const links = state.data.links.filter(link => `${link.label} ${link.labelEn || ''} ${link.url}`.toLowerCase().includes(state.search.toLowerCase()));
  if (!links.length) return `<div class="panel empty">${icon('link')}<h3>${state.search ? 'لا توجد نتائج مطابقة' : 'لا توجد روابط بعد'}</h3><p>${state.search ? 'جرّب البحث باسم المنصة أو جزء من الرابط.' : 'أضف رابطاً ليظهر في صفحة حسابات المركز الخبري.'}</p>${state.search ? '' : '<button class="btn primary" data-action="add">إضافة رابط جديد</button>'}</div>`;
  return links.map(link => {
    const index = state.data.links.findIndex(item => item.id === link.id);
    return `<article class="link-card ${link.visible ? '' : 'is-hidden'}"><div class="link-card-top"><div class="platform-icon ${e(link.platform)}">${platformIcon(link.platform, link.iconUrl)}</div><div class="link-info"><strong>${e(linkLabel(link))}</strong><small title="${e(link.url)}">${e(link.url)}</small></div>${statusPill(link.visible)}</div><div class="link-card-bottom"><span class="order-label">الترتيب ${number(index + 1)}</span><button class="icon-btn" data-action="up" data-id="${e(link.id)}" ${index === 0 ? 'disabled' : ''} aria-label="نقل ${e(linkLabel(link))} للأعلى">${icon('up')}</button><button class="icon-btn" data-action="down" data-id="${e(link.id)}" ${index === state.data.links.length - 1 ? 'disabled' : ''} aria-label="نقل ${e(linkLabel(link))} للأسفل">${icon('down')}</button><div class="link-status"><button class="link-toggle" role="switch" aria-checked="${link.visible}" aria-label="إظهار ${e(linkLabel(link))}" data-action="toggle" data-id="${e(link.id)}"><span class="switch"></span>${link.visible ? 'ظاهر' : 'مخفي'}</button></div><button class="btn small edit-link" data-action="edit" data-id="${e(link.id)}">${icon('edit')}تعديل</button><button class="icon-btn danger" data-action="delete" data-id="${e(link.id)}" aria-label="حذف ${e(linkLabel(link))}">${icon('trash')}</button></div></article>`;
  }).join('');
}
function linksPage() {
  return `${heading('إدارة الروابط', 'عدّل قنواتك، ورتّب ظهورها على الصفحة.', `<button class="btn primary" data-action="add">${icon('plus')}إضافة رابط</button>`)}<div class="dashboard-grid"><div class="main-column"><div class="links-toolbar"><span class="small muted">${number(state.data.links.length)} روابط · ${number(state.data.links.filter(l => l.visible).length)} ظاهرة</span><div class="search-wrap">${icon('search')}<input class="search-input" id="link-search" aria-label="البحث في الروابط" placeholder="ابحث عن رابط…" value="${e(state.search)}"></div></div><div id="link-rows">${linkRows()}</div><p class="notice section-gap">استخدم الأسهم لتغيير الترتيب. يمكنك إخفاء أي رابط مؤقتاً مع الاحتفاظ ببياناته.</p></div>${preview()}</div>${footer()}`;
}
function englishFields(s) {
  return `<section class="panel section-gap"><div class="panel-header"><div><h2>النصوص الإنجليزية</h2><p>تظهر هذه النصوص عند اختيار الإنجليزية.</p></div><span class="pill gray" lang="en">English</span></div><div class="panel-body">
    <div class="field"><label for="description-en">وصف الصفحة بالإنجليزية</label><textarea id="description-en" name="descriptionEn" maxlength="350" dir="ltr">${e(s.descriptionEn || '')}</textarea></div>
    <div class="field-grid"><div class="field"><label for="page-title-en">عنوان الصفحة بالإنجليزية</label><input id="page-title-en" name="pageTitleEn" value="${e(s.pageTitleEn || '')}" maxlength="180" dir="ltr"></div><div class="field"><label for="logo-alt-en">وصف الشعار بالإنجليزية</label><input id="logo-alt-en" name="logoAltEn" value="${e(s.logoAltEn || '')}" maxlength="150" dir="ltr"></div></div>
    <div class="field"><label for="footer-en">نص التذييل بالإنجليزية</label><input id="footer-en" name="footerEn" value="${e(s.footerEn || '')}" maxlength="250" dir="ltr"><small>تُستخدم النصوص العربية عند ترك الترجمة فارغة.</small></div>
  </div></section>`;
}

function appearancePage() {
  const s = state.data.settings;
  return `${heading('هوية الصفحة', 'اضبط تفاصيل صفحتك لتعبّر عن هوية المركز الخبري.', `<a class="btn" href="/?preview=1" target="_blank" rel="noopener">${icon('external')}معاينة الصفحة</a>`)}<div class="dashboard-grid"><div class="main-column"><form id="appearance-form"><section class="panel"><div class="panel-header"><div><h2>معلومات الصفحة</h2><p>الشعار والنصوص التي تظهر لجمهورك</p></div>${icon('palette')}</div><div class="panel-body"><div id="appearance-error" class="error" role="alert" hidden></div><div class="logo-upload"><img id="logo-preview" src="${e(s.logo)}" alt="الشعار الحالي"><div><div class="upload-buttons"><button class="btn small" type="button" data-action="upload">${icon('upload')}رفع شعار</button><button class="text-button" type="button" data-action="reset-logo">الشعار الأصلي</button></div><p>PNG أو JPG أو WebP · حتى 2 ميغابايت</p><input type="file" id="logo-file" accept="image/png,image/jpeg,image/webp" hidden><input type="hidden" name="logo" id="logo-value" value="${e(s.logo)}"></div></div>
    <div class="field"><label for="site-title">اسم الحساب</label><input id="site-title" name="title" value="${e(s.title)}" maxlength="100" required dir="auto"><small>الاسم الظاهر أسفل الشعار.</small></div><div class="field"><label for="site-description">وصف الصفحة</label><textarea id="site-description" name="description" required maxlength="350" dir="rtl">${e(s.description)}</textarea></div><div class="field-grid"><div class="field"><label for="page-title">عنوان تبويب المتصفح</label><input id="page-title" name="pageTitle" value="${e(s.pageTitle)}" required maxlength="180" dir="rtl"></div><div class="field"><label for="logo-alt">وصف الشعار</label><input id="logo-alt" name="logoAlt" value="${e(s.logoAlt)}" required maxlength="150" dir="rtl"><small>وصف يساعد مستخدمي قارئات الشاشة.</small></div></div><div class="field"><label for="footer-text">نص أسفل الصفحة</label><input id="footer-text" name="footer" value="${e(s.footer)}" maxlength="250" dir="rtl"></div></div></section>
    ${englishFields(s)}<section class="panel section-gap"><div class="panel-header"><div><h2>الألوان والحركة</h2><p>المظهر الافتراضي مطابق للصفحة الأصلية</p></div><button class="text-button" type="button" data-action="reset-colors">الألوان الأصلية</button></div><div class="panel-body"><div class="color-grid">${[['accent', 'لون الاسم'], ['backgroundCenter', 'وسط الخلفية'], ['backgroundEdge', 'أطراف الخلفية']].map(([key, label]) => `<div class="color-field"><label for="color-${key}">${label}</label><div class="color-control"><input type="color" id="color-${key}" name="${key}" value="${e(s[key])}"><output for="color-${key}">${e(s[key])}</output></div></div>`).join('')}</div><label class="toggle-row" for="animations"><div><strong>حركة الشعار والخلفية</strong><p>تُحترم إعدادات تقليل الحركة في جهاز الزائر.</p></div><input id="animations" type="checkbox" name="animations" ${s.animations ? 'checked' : ''}></label></div><div class="form-actions"><span class="form-status" id="save-status">جميع التغييرات محفوظة</span><button class="btn primary" type="submit">${icon('save')}حفظ التغييرات</button></div></section></form></div>${preview()}</div>${footer()}`;
}
function accountPage() {
  return `${heading('إعدادات الحساب', 'حافظ على أمان حسابك واحتفظ بنسخة من محتوى صفحتك.')}<div class="account-grid"><section class="panel"><div class="panel-header"><div><h2>تغيير كلمة المرور</h2><p>اختر كلمة مرور قوية وخاصة بهذا الحساب</p></div>${icon('lock')}</div><form id="password-form"><div class="panel-body"><div class="error" id="password-error" role="alert" hidden></div>${passwordField('currentPassword', 'كلمة المرور الحالية')}${passwordField('password', 'كلمة المرور الجديدة', 'new-password', '12')}${passwordField('confirmPassword', 'تأكيد كلمة المرور الجديدة', 'new-password', '12')}<p class="notice">12 حرفاً على الأقل. عند التغيير، تُسجّل بقية الأجهزة خروجها تلقائياً.</p></div><div class="form-actions"><span class="small muted">${icon('shield')} حساب محمي</span><button class="btn primary" type="submit">تحديث كلمة المرور</button></div></form></section><div><section class="panel account-aside"><div class="panel-body"><div class="account-avatar">${e(state.session.username.slice(0, 1).toUpperCase())}</div><div><h2>${e(state.session.username)}</h2><span class="pill green">مدير الموقع</span></div><p>تملك صلاحية إدارة الروابط وهوية الصفحة ومتابعة الزيارات.</p></div></section><section class="panel section-gap"><div class="panel-body"><h2>تصدير المحتوى</h2><p class="small muted section-gap">نزّل ملف JSON يحتوي على إعدادات الصفحة والروابط والإحصاءات. لا يتضمن كلمات المرور أو ملفات الصور.</p><a class="btn section-gap" href="/api/admin/export" download>${icon('download')}تنزيل نسخة من المحتوى</a></div></section></div></div>${footer()}`;
}
function markDirty() {
  state.dirty = true;
  const status = document.querySelector('#save-status');
  if (status) { status.textContent = t('تغييرات غير محفوظة'); status.classList.add('dirty'); }
}
function renderPage() {
  const main = document.querySelector('#main-content');
  main.innerHTML = L(({ overview, links: linksPage, appearance: appearancePage, account: accountPage })[state.page]());
  document.querySelector('#breadcrumb').textContent = t(names[state.page]);
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === state.page);
    if (link.dataset.nav === state.page) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  const count = document.querySelector('.nav-count'); if (count) count.textContent = number(state.data.links.length);
  document.querySelectorAll('.chart-bar').forEach(bar => { bar.style.height = `${bar.dataset.height}px`; });
  document.querySelector('#link-search')?.addEventListener('input', event => { state.search = event.target.value; document.querySelector('#link-rows').innerHTML = L(linkRows()); });
  const appearance = document.querySelector('#appearance-form');
  if (appearance) {
    appearance.addEventListener('input', event => {
      if (event.target.type === 'color') event.target.nextElementSibling.textContent = event.target.value;
      markDirty();
    });
    appearance.addEventListener('submit', saveAppearance);
    document.querySelector('#logo-file').addEventListener('change', uploadLogo);
  }
  document.querySelector('#password-form')?.addEventListener('submit', updatePassword);
}
async function refreshAfterLinks(links) {
  state.data.links = links;
  state.data.stats = (await api('/api/admin/data')).stats;
  renderPage();
}
function openLinkEditor(id) {
  const link = id ? state.data.links.find(l => l.id === id) : { platform: 'link', label: '', labelEn: '', iconUrl: '', url: '', visible: true };
  if (!link) return;
  dialog.innerHTML = L(`<form id="link-form"><header class="dialog-header"><h2 id="dialog-title">${id ? 'تعديل الرابط' : 'إضافة رابط جديد'}</h2><button class="icon-btn" type="button" data-action="close-dialog" aria-label="إغلاق">${icon('close')}</button></header><div class="dialog-body"><div class="error" id="link-error" role="alert" hidden></div>
    <div class="field-grid"><div class="field"><label for="link-label">اسم الرابط</label><input id="link-label" name="label" value="${e(link.label)}" placeholder="مثال: فيسبوك" required maxlength="100" dir="rtl" autofocus></div><div class="field"><label for="link-label-en">اسم الرابط بالإنجليزية</label><input id="link-label-en" name="labelEn" value="${e(link.labelEn || '')}" placeholder="مثال: Facebook" maxlength="100" dir="ltr"><small>تُستخدم النصوص العربية عند ترك الترجمة فارغة.</small></div></div>
    <div class="field"><label for="link-platform">أيقونة المنصة</label><select id="link-platform" name="platform">${Object.entries(platformNames).map(([value, label]) => `<option value="${value}" ${value === link.platform ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
    <div class="custom-icon-editor"><div class="platform-icon ${e(link.platform)}" id="link-icon-preview">${platformIcon(link.platform, link.iconUrl)}</div><div><strong>أيقونة مخصصة</strong><div class="upload-buttons"><button class="btn small" type="button" data-action="upload-icon">${icon('upload')}رفع أيقونة</button><button class="text-button" type="button" data-action="remove-icon">استخدام أيقونة المنصة</button></div><p>PNG أو JPG أو WebP · حتى 2 ميغابايت</p><small>الصورة المخصصة تحل محل أيقونة المنصة لهذا الرابط فقط.</small></div><input type="file" id="link-icon-file" accept="image/png,image/jpeg,image/webp" hidden><input type="hidden" name="iconUrl" id="link-icon-value" value="${e(link.iconUrl || '')}"></div>
    <div class="field"><label for="link-url">عنوان الرابط</label><input id="link-url" name="url" type="url" value="${e(link.url)}" placeholder="https://" required maxlength="2048" dir="ltr"><small>يفتح الرابط في تبويب جديد.</small></div><div class="field"><label class="check-label"><input type="checkbox" name="visible" ${link.visible ? 'checked' : ''}>إظهار هذا الرابط على الصفحة</label></div></div><div class="dialog-actions"><button class="btn" type="button" data-action="close-dialog">إلغاء</button><button class="btn primary" type="submit">${icon('check')}${id ? 'حفظ الرابط' : 'إضافة الرابط'}</button></div></form>`);
  dialog.showModal();
  document.querySelector('#link-icon-file').addEventListener('change', uploadLinkIcon);
  document.querySelector('#link-platform').addEventListener('change', updateIconPreview);
  document.querySelector('#link-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget, button = form.querySelector('[type=submit]'), error = form.querySelector('#link-error');
    button.disabled = true; error.hidden = true;
    const data = Object.fromEntries(new FormData(form)); data.visible = form.elements.visible.checked;
    try {
      const result = await api(`/api/admin/links${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', data);
      dialog.close(); await refreshAfterLinks(result.links); toast(id ? 'تم تحديث الرابط.' : 'تمت إضافة الرابط.');
    } catch (err) { error.textContent = t(err.message); error.hidden = false; }
    finally { button.disabled = false; }
  });
}
function updateIconPreview() {
  const platform = document.querySelector('#link-platform').value;
  const preview = document.querySelector('#link-icon-preview');
  preview.className = `platform-icon ${platform}`;
  preview.innerHTML = platformIcon(platform, document.querySelector('#link-icon-value').value);
}
async function uploadLinkIcon(event) {
  const file = event.target.files[0]; if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { toast('اختر صورة PNG أو JPG أو WebP بحجم لا يتجاوز 2 ميغابايت.', true); event.target.value = ''; return; }
  const form = dialog.querySelector('#link-form');
  const button = form.querySelector('[data-action=upload-icon]'), saveButton = form.querySelector('[type=submit]');
  button.disabled = true; saveButton.disabled = true;
  try {
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const result = await api('/api/admin/upload', 'POST', { data });
    if (!dialog.open || dialog.querySelector('#link-form') !== form) return;
    document.querySelector('#link-icon-value').value = result.url; updateIconPreview(); toast('تم رفع الأيقونة. احفظ الرابط لنشرها.');
  } catch (err) { toast(err.message || 'تعذر رفع الصورة.', true); }
  finally { button.disabled = false; saveButton.disabled = false; event.target.value = ''; }
}
function confirmDelete(id) {
  const link = state.data.links.find(l => l.id === id);
  dialog.innerHTML = L(`<header class="dialog-header"><h2 id="dialog-title">حذف الرابط</h2><button class="icon-btn" data-action="close-dialog" aria-label="إغلاق">${icon('close')}</button></header><div class="dialog-body"><p class="delete-description">هل تريد حذف رابط <strong>${e(linkLabel(link))}</strong>؟ سيُزال من الصفحة. يمكنك إخفاؤه مؤقتاً بدلاً من حذفه.</p><div class="error section-gap" id="delete-error" role="alert" hidden></div></div><div class="dialog-actions"><button class="btn" data-action="close-dialog" autofocus>إلغاء</button><button class="btn danger" id="confirm-delete">${icon('trash')}حذف الرابط</button></div>`);
  dialog.showModal();
  document.querySelector('#confirm-delete').addEventListener('click', async event => {
    const button = event.currentTarget; button.disabled = true;
    try { const result = await api(`/api/admin/links/${id}`, 'DELETE'); dialog.close(); await refreshAfterLinks(result.links); toast('تم حذف الرابط.'); }
    catch (err) { const error = document.querySelector('#delete-error'); error.textContent = t(err.message); error.hidden = false; }
    finally { button.disabled = false; }
  });
}
async function saveAppearance(event) {
  event.preventDefault();
  const form = event.currentTarget, button = form.querySelector('[type=submit]'), error = document.querySelector('#appearance-error');
  const data = Object.fromEntries(new FormData(form)); data.animations = form.elements.animations.checked;
  button.disabled = true; error.hidden = true;
  try {
    const result = await api('/api/admin/settings', 'PUT', data); state.data.settings = result.settings; state.dirty = false;
    document.querySelector('#sidebar-logo').src = result.settings.logo;
    renderPage(); toast('تم حفظ التغييرات ونشرها على الصفحة.');
  } catch (err) { error.textContent = t(err.message); error.hidden = false; error.scrollIntoView({ block: 'center' }); }
  finally { button.disabled = false; }
}
async function uploadLogo(event) {
  const file = event.target.files[0]; if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { toast('اختر صورة PNG أو JPG أو WebP بحجم لا يتجاوز 2 ميغابايت.', true); event.target.value = ''; return; }
  const button = document.querySelector('[data-action=upload]'), saveButton = document.querySelector('#appearance-form [type=submit]');
  button.disabled = true; saveButton.disabled = true;
  try {
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const result = await api('/api/admin/upload', 'POST', { data });
    document.querySelector('#logo-preview').src = result.url; document.querySelector('#logo-value').value = result.url; markDirty(); toast('تم رفع الشعار. اضغط حفظ التغييرات لنشره.');
  } catch (err) { toast(err.message || 'تعذر رفع الصورة.', true); }
  finally { button.disabled = false; saveButton.disabled = false; event.target.value = ''; }
}
async function updatePassword(event) {
  event.preventDefault(); const form = event.currentTarget, error = document.querySelector('#password-error'), button = form.querySelector('[type=submit]');
  const data = Object.fromEntries(new FormData(form)); error.hidden = true;
  if (data.password !== data.confirmPassword) { error.textContent = t('كلمتا المرور غير متطابقتين.'); error.hidden = false; return; }
  button.disabled = true;
  try { const result = await api('/api/admin/password', 'PUT', data); state.session.csrf = result.csrf; form.reset(); toast('تم تحديث كلمة المرور وتسجيل خروج الأجهزة الأخرى.'); }
  catch (err) { error.textContent = t(err.message); error.hidden = false; }
  finally { button.disabled = false; }
}
function switchLanguage() {
  if (state.busy || document.querySelector('form button[type=submit]:disabled')) return;
  const form = document.querySelector('#appearance-form, #password-form, #auth-form');
  const fields = form ? [...form.elements].filter(el => el.name && el.type !== 'file').map(el => ({ name: el.name, value: el.value, checked: el.checked })) : [];
  const wasDirty = state.dirty;
  const language = getLanguage() === 'ar' ? 'en' : 'ar';
  setLanguage(language);
  if (state.session?.authenticated) renderShell(); else renderAuth();
  const nextForm = document.querySelector('#appearance-form, #password-form, #auth-form');
  for (const field of fields) {
    const element = nextForm?.elements.namedItem(field.name);
    if (!element) continue;
    element.value = field.value;
    if (element.type === 'checkbox') element.checked = field.checked;
    if (element.type === 'color') element.nextElementSibling.textContent = field.value;
  }
  const logo = document.querySelector('#logo-preview');
  if (logo) logo.src = document.querySelector('#logo-value').value;
  if (wasDirty) markDirty();
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) skipLink.textContent = language === 'en' ? 'Skip to content' : 'انتقل إلى المحتوى';
}

const mobileQuery = matchMedia('(max-width: 720px)');
function syncMenuAccessibility() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.inert = mobileQuery.matches && !document.body.classList.contains('menu-open');
}
mobileQuery.addEventListener('change', () => { if (!mobileQuery.matches) closeMenu(); syncMenuAccessibility(); });
function closeMenu() {
  const wasOpen = document.body.classList.contains('menu-open');
  document.body.classList.remove('menu-open');
  document.querySelector('[data-action=menu]')?.setAttribute('aria-expanded', 'false');
  syncMenuAccessibility();
  if (wasOpen) document.querySelector('[data-action=menu]')?.focus();
}
document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-nav]');
  if (nav) {
    if (state.dirty && !confirm(t('لديك تغييرات غير محفوظة. هل تريد مغادرة الصفحة؟'))) { event.preventDefault(); return; }
    state.dirty = false; closeMenu();
  }
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const { action, id } = button.dataset;
  if (action === 'language') return switchLanguage();
  if (action === 'upload-icon') return document.querySelector('#link-icon-file').click();
  if (action === 'remove-icon') { document.querySelector('#link-icon-value').value = ''; updateIconPreview(); return; }
  if (action === 'password-visibility') {
    const input = document.getElementById(button.dataset.target), show = input.type === 'password'; input.type = show ? 'text' : 'password'; button.setAttribute('aria-pressed', String(show)); button.setAttribute('aria-label', t(show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور')); return;
  }
  if (action === 'menu') {
    document.body.classList.toggle('menu-open'); button.setAttribute('aria-expanded', String(document.body.classList.contains('menu-open')));
    syncMenuAccessibility();
    if (document.body.classList.contains('menu-open')) document.querySelector('.sidebar .nav-item')?.focus();
    return;
  }
  if (action === 'menu-close') return closeMenu();
  if (action === 'close-dialog') return dialog.close();
  if (action === 'add' || action === 'edit') return openLinkEditor(id);
  if (action === 'delete') return confirmDelete(id);
  if (action === 'upload') return document.querySelector('#logo-file').click();
  if (action === 'reset-logo') { document.querySelector('#logo-preview').src = '/assets/logo.png'; document.querySelector('#logo-value').value = '/assets/logo.png'; markDirty(); return; }
  if (action === 'reset-colors') {
    for (const [key, value] of Object.entries({ accent: '#00e5ff', backgroundCenter: '#0a5c53', backgroundEdge: '#05332e' })) { const input = document.querySelector(`#color-${key}`); input.value = value; input.nextElementSibling.textContent = value; }
    markDirty(); return;
  }
  if (state.busy) return;
  state.busy = true; button.disabled = true;
  try {
    if (action === 'logout') {
      if (state.dirty && !confirm(t('لديك تغييرات غير محفوظة. هل تريد تسجيل الخروج؟'))) return;
      await api('/api/logout', 'POST', {}); state.session = { setup: false, authenticated: false }; state.dirty = false; state.data = null; closeMenu(); renderAuth();
    } else if (action === 'toggle') {
      const link = state.data.links.find(item => item.id === id);
      const result = await api(`/api/admin/links/${id}`, 'PUT', { ...link, visible: !link.visible });
      await refreshAfterLinks(result.links); toast(link.visible ? 'تم إخفاء الرابط.' : 'تم إظهار الرابط.');
      document.querySelector(`[data-action="toggle"][data-id="${id}"]`)?.focus();
    } else if (action === 'up' || action === 'down') {
      const ids = state.data.links.map(link => link.id), index = ids.indexOf(id), next = index + (action === 'up' ? -1 : 1);
      if (next < 0 || next >= ids.length) return;
      [ids[index], ids[next]] = [ids[next], ids[index]];
      const result = await api('/api/admin/links/order', 'PUT', { ids }); await refreshAfterLinks(result.links); toast('تم حفظ ترتيب الروابط.');
      document.querySelector(`[data-action="${action}"][data-id="${id}"]`)?.focus();
    }
  } catch (err) { toast(err.message, true); }
  finally { state.busy = false; button.disabled = false; }
});
window.addEventListener('hashchange', () => {
  if (!state.session?.authenticated) return;
  const page = Object.hasOwn(names, location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  if (page === state.page) return;
  if (state.dirty && !confirm(t('لديك تغييرات غير محفوظة. هل تريد مغادرة الصفحة؟'))) { history.replaceState(null, '', `#${state.page}`); return; }
  state.dirty = false; state.page = page; state.search = ''; renderPage(); window.scrollTo(0, 0);
});
window.addEventListener('beforeunload', event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
async function boot() {
  try { state.session = await api('/api/session'); if (state.session.authenticated) { state.data = await api('/api/admin/data'); renderShell(); } else renderAuth(); }
  catch (err) { app.innerHTML = L(`<main class="boot-state"><p class="error" role="alert">${e(err.message)}</p><button class="btn" id="retry">إعادة المحاولة</button></main>`); document.querySelector('#retry').addEventListener('click', boot); }
}
boot();
