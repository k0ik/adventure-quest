// Automated playtest of the Stage 3 sample. Usage: node scripts/playtest.mjs [baseUrl]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright')); }

const base = process.argv[2] ?? 'http://localhost:5173/';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const g = (fn, arg) => page.evaluate(([f, a]) => window.__game[f](a), [fn, arg]);

await page.goto(`${base}?loc=campfire`);
await page.waitForFunction(() => window.__studyReady === true, null, { timeout: 120000 });
check('Starts at the campfire', (await g('state')).location === 'campfire');
check('Opening passage shown', (await g('panelText')).includes('You wake beside a campfire'));

// Normal travel there, sampling the whole journey.
await g('choose', 1);
check('Choices locked while travelling', (await page.locator('.choices button').count()) === 0);
const outbound = await g('stepTravel', 1.01);
const minAbove = Math.min(...outbound.map((s) => s.aboveGround));
const maxAbove = Math.max(...outbound.map((s) => s.aboveGround));
const minClear = Math.min(...outbound.map((s) => s.clear));
check('Camera stays at eye height above terrain (outbound)', minAbove > 1.5 && maxAbove < 1.7, `${minAbove.toFixed(2)}–${maxAbove.toFixed(2)} m`);
check('Camera clears scenery on the path (outbound)', minClear > 0.35, `nearest ${minClear.toFixed(2)} m`);
await page.waitForTimeout(200);
let st = await g('state');
check('Arrives at the Village Oak', st.location === 'village-oak' && !st.travelling);
check('First-visit passage shown', (await g('panelText')).includes('The path opens into a clearing'));

// Dialogue.
await g('choose', 1);
check('Talking to the rabbit shows Clover', (await g('panelText')).includes('Clover Thimblewick'));
await g('choose', 2);
check('Dialogue branches', (await g('panelText')).includes("Bertram's the one"));
await g('choose', 1);
const again = await g('panelText');
check('Returns to the location with names learned', again.includes('Clover is still arranging cups') && again.includes('Talk to Clover'));

// Return trip, normal travel.
await g('choose', 3);
const back = await g('stepTravel', 1.01);
check('Camera stays at eye height above terrain (return)', Math.min(...back.map((s) => s.aboveGround)) > 1.5);
check('Camera clears scenery on the path (return)', Math.min(...back.map((s) => s.clear)) > 0.35, `nearest ${Math.min(...back.map((s) => s.clear)).toFixed(2)} m`);
await page.waitForTimeout(200);
check('Back at the campfire with revisit text', (await g('state')).location === 'campfire' && (await g('panelText')).includes('still sulking'));
check('Path label changes after walking it', (await g('panelText')).includes('Walk back to the Village Oak'));

// Skip mid-journey resolves the same arrival.
await g('choose', 1);
await g('stepTravel', 0.4);
await page.click('.travelling button');
await page.waitForTimeout(200);
check('Skip mid-travel arrives at the same place', (await g('state')).location === 'village-oak' && !(await g('state')).travelling);

// Reduced motion: fade instead of glide, same destination.
await g('setSettings', { reducedMotion: true });
await g('choose', 3);
await page.waitForTimeout(900);
check('Reduced-motion travel arrives at the campfire', (await g('state')).location === 'campfire');
await g('setSettings', { reducedMotion: false });

// Keyboard: number keys choose, C recentres without errors.
await page.keyboard.press('2');
check('Number key chooses an action', (await g('panelText')).includes('You hold your hands to the embers'));
await page.keyboard.press('c');

// Rapid double choice cannot start two journeys.
await page.evaluate(() => { window.__game.choose(1); window.__game.choose(1); });
await g('stepTravel', 1.01);
await page.waitForTimeout(200);
check('Double-clicking travel arrives once', (await g('state')).location === 'village-oak');

await page.waitForTimeout(300);
console.log('Render cost:', await g('render'));
check('No console errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
