import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(`${root}public/assets`, { recursive: true });
await mkdir(`${root}reference`, { recursive: true });
async function download(url, file) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(`${root}${file}`, bytes);
  console.log(`${file}: ${bytes.length} bytes`);
  return bytes.toString('utf8');
}
const source = await download('https://newsasskariaan.netlify.app/', 'reference/original.html');
const style = source.match(/<style>([\s\S]*?)<\/style>/)[1]
  .replace(/@import[^\n]+/, '')
  .replace('radial-gradient(circle at center, #0a5c53 0%, #05332e 100%)', 'radial-gradient(circle at center, var(--background-center, #0a5c53) 0%, var(--background-edge, #05332e) 100%)')
  .replaceAll('#00e5ff', 'var(--accent, #00e5ff)');
await writeFile(`${root}public/site.css`, `${style}\n/* Accessibility additions preserve the reference layout. */\na:focus-visible { outline: 3px solid var(--accent, #00e5ff); outline-offset: 4px; }\nbody.no-motion::before, body.no-motion .container, body.no-motion .logo { animation: none; }\nbody.no-motion *, body.no-motion *::before { transition: none !important; }\n@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }\n`);
await download('https://imgur.com/O49es5b.png', 'public/assets/logo.png');
const fontResponse = await fetch('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36' }
});
if (!fontResponse.ok) throw new Error('Unable to download Cairo font stylesheet');
let css = await fontResponse.text();
const urls = [...new Set([...css.matchAll(/url\((https[^)]+)\)/g)].map(m => m[1]))];
for (let i = 0; i < urls.length; i++) {
  const path = `public/assets/cairo-${i}.woff2`;
  await download(urls[i], path);
  css = css.replaceAll(urls[i], `/assets/cairo-${i}.woff2`);
}
await writeFile(`${root}public/fonts.css`, css);
await download('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2', 'public/assets/fa-brands-400.woff2');
await download('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2', 'public/assets/fa-solid-900.woff2');
await download('https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.4.0/LICENSE.txt', 'public/assets/FONT-AWESOME-LICENSE.txt');
await download('https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/OFL.txt', 'public/assets/CAIRO-LICENSE.txt');
