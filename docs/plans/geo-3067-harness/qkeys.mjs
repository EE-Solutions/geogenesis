import { chromium } from '/Users/bryandoss/muxtree/worktrees/geogenesis/benchmark-ui-load/node_modules/.bun/playwright@1.61.1/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const target = process.argv[2];
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-features=BackForwardCache'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const keys = () => p.evaluate(() => {
  const find = () => {
    const k = Object.keys(document).find(x => x.startsWith('__reactContainer$'));
    const stack = [document[k].stateNode?.current ?? document[k]];
    while (stack.length) { const f = stack.pop(); const c = f?.memoizedProps?.client; if (c?.getQueryCache) return c; if (f?.sibling) stack.push(f.sibling); if (f?.child) stack.push(f.child); }
  };
  const qc = (window.__qc ??= find());
  return qc.getQueryCache().getAll().map(q => q.queryHash);
});
const spa = async path => { await p.evaluate(x => window.next.router.push(x), path); await sleep(9000); };
const scroll = async () => { await p.mouse.move(720, 450); for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 900); await sleep(1500); } };
await p.goto('http://localhost:3000/tools', { waitUntil: 'load' }); await sleep(5000);
await spa(target); await scroll(); await spa('/tools');
const k1 = new Set(await keys());
await spa(target); await scroll(); await spa('/tools');
const k2 = await keys();
const added = k2.filter(k => !k1.has(k));
console.log('after visit1', k1.size, 'after visit2', k2.length, 'new keys on revisit', added.length);
// Group new keys by their first segment, and show a pair of same-prefix keys from both visits.
const norm = k => { try { const a = JSON.parse(k); return JSON.stringify(a[0]) + (a.length > 1 ? ' +' + (a.length - 1) : ''); } catch { return k.slice(0, 60); } };
const groups = {};
for (const k of added) (groups[norm(k)] ??= []).push(k);
for (const [g, ks] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length).slice(0, 12)) {
  const twin = [...k1].find(x => norm(x) === g);
  console.log(`\n${ks.length}x ${g}\n  new: ${ks[0].slice(0, 300)}\n  old: ${(twin ?? '-').slice(0, 300)}`);
}
fs.writeFileSync('results/qkeys-' + target.replace(/\W+/g, '_') + '.json', JSON.stringify({ k1: [...k1], k2 }, null, 1));
await b.close();
