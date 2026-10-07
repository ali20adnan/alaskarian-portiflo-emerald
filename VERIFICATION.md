# Verification — 7 October 2026

## Reference comparison

Before adding the subsequently requested language switch, compared the supplied live reference (`https://newsasskariaan.netlify.app/`) against the local public page, with fonts loaded and animations paused in both browsers for deterministic screenshots. The default site retains the original animations. The current page additionally includes the requested Arabic/English control and custom-icon support, so these pixel comparisons document the original clone baseline.

| Viewport | Reference container | Local container | Pixel comparison |
| --- | --- | --- | --- |
| Desktop, 1440 × 1000 | x=460, y=120, 520 × 760 | Identical | Mean RGB channel error 0.005 / 255; no pixel differs by more than 10 / 255 |
| Mobile, 390 × 844 | x=20, y=30, 350 × 784 | Identical | **0 differing pixels** |

Also checked 320 × 568 and 768 × 1024: no horizontal overflow, all six links present, internal scrolling available on the short viewport as in the reference. All six original link labels and URLs are preserved.

Screenshots: `reference/desktop.png`, `reference/mobile.png`, `test-results/clone-desktop.png`, and `test-results/clone-mobile.png`. Tiny desktop image-edge differences do not change layout, text, colors, or behavior. These results cover the tested viewports, not every possible browser or display.

## Browser checks

Used a separate database on port 4174, leaving the main site's owner account unconfigured for the user.

- Created the initial admin account through the setup form.
- Added a link, edited its name, searched it, hid it, moved it, and deleted it.
- Saved a title change; confirmed it appeared in the embedded public preview and survived reload.
- Uploaded a JPEG logo, saved it, then restored the original.
- Changed the password, logged out, and logged back in with the new password.
- Verified mobile menu opening, navigation, and closing; hidden navigation is inert to keyboard and assistive-technology focus.
- Verified desktop and mobile dashboard layouts and absence of horizontal overflow.
- No JavaScript console errors during the content-editing and preview checks.

Admin screenshots: `test-results/admin-desktop.png` and `test-results/admin-mobile.png`.

## Automated checks

`npm run check` passes syntax validation. `npm test` passes all 14 tests, covering initial rendering; account creation; CSRF, origin, URL and traversal checks; link CRUD and ordering; content escaping and theme persistence; analytics; uploads; persistence across restart; password/session lifecycle; bilingual rendering; custom icons and translations; English content with fallback; and legacy database migration.

## Bilingual and custom-icon update

- Uploaded a custom link icon through the English link editor and confirmed the exact uploaded image appeared in the public preview.
- Saved a custom English link label and verified Arabic and English show their respective labels.
- Switched the dashboard between LTR English and RTL Arabic and verified that the selected language survives reload.
- Changed English page text, switched languages while the form was unsaved, confirmed the draft was preserved, then saved and verified the public preview.
- Checked English interface text across the appearance screen and confirmed there were no untranslated interface labels or JavaScript console errors.
- Added compact link controls for 320px screens and checked the public English page on mobile.

Screenshots: `test-results/admin-english-desktop.png` and `test-results/site-english-mobile.png`.

This is a completed local implementation. No deployment or edits to the original Netlify site were performed.
