import { chromium } from '/Users/bryandoss/muxtree/worktrees/geogenesis/benchmark-ui-load/node_modules/.bun/playwright@1.61.1/node_modules/playwright/index.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const AI = '/space/41e851610e13a19441c4d980f2f2ce6b';
async function snapshot(map) {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: map ? [`--host-resolver-rules=MAP localhost:3000 127.0.0.1:${map}`] : [] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const out = {};
  const cards = () => p.evaluate(() => [...document.querySelectorAll('article')].slice(0, 15).map(a => {
    const t = a.innerText.replace(/\s+/g, ' ').trim();
    return t.slice(0, 160);
  }));
  await p.goto('http://localhost:3000/explore', { waitUntil: 'load' }); await sleep(12000);
  out.explore = await cards();
  for (const tab of ['?tabId=27d3f95835da4358ad0c21ebaa8e8a8e', '?tabId=71008b9add9846d1942c2fd97a7028ea', '?tabId=5224cd4360ce4be4b7c47b9f00ec9539']) {
    await p.goto('http://localhost:3000' + AI + tab, { waitUntil: 'load' }); await sleep(12000);
    out[tab] = await p.evaluate(() => {
      const main = document.querySelector('main') ?? document.body;
      return { text: main.innerText.replace(/\s+/g, ' ').slice(0, 3000), imgs: [...main.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth).length };
    });
  }
  // 1b scroll-back check on Explore.
  await p.goto('http://localhost:3000/explore', { waitUntil: 'load' }); await sleep(10000);
  await p.mouse.move(720, 450);
  for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, 900); await sleep(700); }
  await sleep(3000);
  const anchorY = await p.evaluate(() => window.scrollY);
  const topCard = async () => p.evaluate(() => {
    const a = [...document.querySelectorAll('article')].find(x => { const r = x.getBoundingClientRect(); return r.bottom > 80 && r.top < 450; });
    return a ? a.innerText.replace(/\s+/g, ' ').slice(0, 60) : null;
  });
  const deepCard = await topCard();
  for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, -900); await sleep(400); }
  await sleep(3000);
  const topNow = await p.evaluate(() => window.scrollY);
  const visibleBlank = await p.evaluate(() => [...document.querySelectorAll('div')].filter(d => d.style.height && !d.children.length && (() => { const r = d.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; })()).length);
  await p.evaluate(y => window.scrollTo(0, y), anchorY); await sleep(3000);
  out.scroll = { anchorY, deepCard, back: await topCard(), topNow, visibleBlankBoxes: visibleBlank, articles: await p.evaluate(() => document.querySelectorAll('article').length) };
  await b.close();
  return out;
}
const [a, b] = await Promise.all([snapshot(null), snapshot(3001)]);
let diffs = 0;
a.explore.forEach((t, i) => { if (t !== b.explore[i]) { diffs++; console.log('EXPLORE card', i, '\n  master:', t, '\n  step3: ', b.explore[i]); } });
for (const k of Object.keys(a).filter(k => k.startsWith('?'))) {
  const same = a[k].text === b[k].text;
  if (!same) { diffs++; const i = [...a[k].text].findIndex((c, j) => c !== b[k].text[j]); console.log('TAB', k, 'first diff at', i, '\n  master:', a[k].text.slice(Math.max(0, i - 80), i + 120), '\n  step3: ', b[k].text.slice(Math.max(0, i - 80), i + 120)); }
  console.log('TAB', k, same ? 'identical text' : 'differs', 'images', a[k].imgs, b[k].imgs);
}
console.log('explore cards compared', a.explore.length, 'differences', diffs);
console.log('scroll master', JSON.stringify(a.scroll));
console.log('scroll step3 ', JSON.stringify(b.scroll));
