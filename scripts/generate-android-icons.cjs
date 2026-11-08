const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/assets/images/tuklas-mark.svg'), 'utf8');
const paths = [...source.matchAll(/<path\b[^>]*\/>/g)].map((match) => match[0]).join('');
const output = path.join(root, 'android/app/src/main/res');
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

function svg(kind) {
  const background = kind === 'foreground' ? '' : kind === 'round'
    ? '<circle cx="54" cy="54" r="54" fill="white"/>'
    : '<rect width="108" height="108" rx="17" fill="white"/>';
  const inset = kind === 'foreground' ? 18 : 0;
  const size = kind === 'foreground' ? 72 : 108;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108">${background}<svg x="${inset}" y="${inset}" width="${size}" height="${size}" viewBox="0 0 172 172">${paths}</svg></svg>`;
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const [density, scale] of Object.entries(densities)) {
      const pixels = Math.round(108 * scale);
      const page = await browser.newPage({ viewport: { width: pixels, height: pixels }, deviceScaleFactor: 1 });
      for (const [name, kind] of [
        ['ic_launcher.png', 'square'],
        ['ic_launcher_round.png', 'round'],
        ['ic_launcher_foreground.png', 'foreground'],
      ]) {
        await page.setContent(`<html><body style="margin:0;background:transparent"><div style="width:${pixels}px;height:${pixels}px">${svg(kind).replace('width="108" height="108"', `width="${pixels}" height="${pixels}"`)}</div></body></html>`);
        await page.screenshot({ path: path.join(output, `mipmap-${density}`, name), omitBackground: true });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
