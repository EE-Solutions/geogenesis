// Opens a headed browser for a manual Privy login, then saves the session to auth/state.json.
import { chromium } from '/Users/bryandoss/muxtree/worktrees/geogenesis/benchmark-ui-load/node_modules/.bun/playwright@1.61.1/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const OUT = new URL('./auth/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true, mode: 0o700 });

const browser = await chromium.launch({ channel: 'chrome', headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/root');
console.log('Browser open. Log in; waiting up to 60 minutes...');

const deadline = Date.now() + 60 * 60_000;
let loggedIn = false;
while (Date.now() < deadline && !loggedIn) {
  await new Promise(r => setTimeout(r, 2000));
  const cookies = await ctx.cookies().catch(() => []);
  const ls = await page.evaluate(() => Object.keys(localStorage)).catch(() => []);
  loggedIn = cookies.some(c => c.name === 'privy-token') || ls.some(k => k === 'privy:token');
}
if (!loggedIn) { console.log('TIMEOUT: no Privy session detected'); await browser.close(); process.exit(1); }

// Let the app finish post-login setup (wallet, profile) before snapshotting.
await page.waitForTimeout(8000);
await ctx.storageState({ path: OUT + 'state.json' });
fs.chmodSync(OUT + 'state.json', 0o600);
console.log('LOGGED_IN: saved', OUT + 'state.json');
await browser.close();
