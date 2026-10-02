import { chromium } from '/Users/bryandoss/muxtree/worktrees/geogenesis/benchmark-ui-load/node_modules/.bun/playwright@1.61.1/node_modules/playwright/index.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL_ = 'http://localhost:3000/space/41e851610e13a19441c4d980f2f2ce6b?tabId=27d3f95835da4358ad0c21ebaa8e8a8e';
async function grab(map) {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: map ? [`--host-resolver-rules=MAP localhost:3000 127.0.0.1:${map}`] : [] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(25000);
  const t = await Promise.race([sleep(20000).then(() => 'TIMEOUT'), p.evaluate(() => (document.querySelector('main') ?? document.body).innerText.replace(/\s+/g, ' '))]);
  await Promise.race([b.close(), sleep(10000)]);
  return t;
}
for (let round = 1; round <= 2; round++) {
  const a = await grab(null); const b = await grab(3001);
  const wa = a.split(' '), wb = b.split(' ');
  const onlyA = wa.filter(w => !wb.includes(w)), onlyB = wb.filter(w => !wa.includes(w));
  console.log(`round ${round}: identical=${a === b} lenA=${a.length} lenB=${b.length} onlyMaster=${JSON.stringify(onlyA.slice(0, 20))} onlyStep3=${JSON.stringify(onlyB.slice(0, 20))}`);
  console.log('  head master:', a.slice(0, 140)); console.log('  head step3: ', b.slice(0, 140));
}
