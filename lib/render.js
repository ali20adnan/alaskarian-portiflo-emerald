export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function platformIcon(platform, logo = '/assets/logo.png', customIcon = '') {
  if (customIcon) return `<img src="${escapeHtml(customIcon)}" alt="" class="custom-link-icon">`;
  if (platform === 'website') return `<img src="${escapeHtml(logo)}" alt="" class="custom-web-icon">`;
  const icons = { facebook: 'facebook-f', instagram: 'instagram', telegram: 'telegram-plane', youtube: 'youtube', whatsapp: 'whatsapp', tiktok: 'tiktok', twitter: 'x-twitter' };
  return `<i class="${icons[platform] ? 'fab' : 'fas'} fa-${icons[platform] || 'link'}" aria-hidden="true"></i>`;
}
export function renderPublic(settings, links, language = 'ar', preview = false) {
  const e = escapeHtml;
  const english = language === 'en';
  const localized = key => english ? settings[`${key}En`] || settings[key] : settings[key];
  return `<!DOCTYPE html>
<html lang="${language}" dir="${english ? 'ltr' : 'rtl'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${e(localized('description'))}">
  <meta name="theme-color" content="${e(settings.backgroundEdge)}">
  <title>${e(localized('pageTitle'))}</title>
  <link rel="icon" href="${e(settings.logo)}">
  <link rel="stylesheet" href="/fonts.css">
  <link rel="stylesheet" href="/icons.css">
  <link rel="stylesheet" href="/site.css">
  <link rel="stylesheet" href="/site-extras.css">
  <link rel="stylesheet" href="/theme.css">
  <script src="/site.js" defer></script>
</head>
<body${settings.animations ? '' : ' class="no-motion"'}>
  <main class="container">
    <a class="language-switch" href="/?lang=${english ? 'ar' : 'en'}${preview ? '&amp;preview=1' : ''}" lang="${english ? 'ar' : 'en'}" hreflang="${english ? 'ar' : 'en'}" aria-label="${english ? 'التبديل إلى العربية' : 'Switch to English'}">${english ? 'العربية' : 'English'}</a>
    <div class="logo-wrapper"><img src="${e(settings.logo)}" alt="${e(localized('logoAlt'))}" class="logo" width="110" height="110"></div>
    <h1 class="title-en">${e(settings.title)}</h1>
    <p class="title-ar">${e(localized('description'))}</p>
    <nav class="links-list" aria-label="${english ? 'Social media accounts' : 'حسابات التواصل الاجتماعي'}">
      ${links.filter(link => link.visible).map(link => `<a href="${e(link.url)}" target="_blank" rel="noopener noreferrer" class="link-item" data-link-id="${e(link.id)}">
        <div class="link-content-wrapper">
          <div class="icon-box ${e(link.platform)}-icon">${platformIcon(link.platform, settings.logo, link.iconUrl)}</div>
          <div class="text-wrapper"><span>${e(english ? link.labelEn || link.label : link.label)}</span></div>
          <div class="arrow-box"><i class="fas fa-chevron-left" aria-hidden="true"></i></div>
        </div>
      </a>`).join('\n')}
    </nav>
    <div class="footer">${e(localized('footer'))}</div>
  </main>
</body>
</html>`;
}
