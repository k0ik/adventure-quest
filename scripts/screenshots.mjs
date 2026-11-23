// Capture the study's composed views. Usage: node scripts/screenshots.mjs [baseUrl] [outDir] [scale]
// Requires a running dev or preview server (npm run dev).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

// Use a project-local Playwright if present, else the globally installed one.
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const globalRoot = execSync('npm root -g').toString().trim();
  ({ chromium } = createRequire(globalRoot + '/')('playwright'));
}
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'docs/stage1';
const scale = Number(process.argv[4] ?? 2);
const views = (process.env.VIEWS ?? 'overall,character').split(',');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
for (const view of views) {
  await page.goto(`${base}?view=${view}&ui=0`);
  await page.waitForFunction(() => window.__studyReady === true, null, { timeout: 120000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${view}.png` });
  console.log(`saved ${out}/${view}.png`);
}
if (errors.length) console.log('Console errors:\n' + errors.join('\n'));
else console.log('No console errors.');
await browser.close();
