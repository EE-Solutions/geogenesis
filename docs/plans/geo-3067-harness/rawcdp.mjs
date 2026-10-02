// Same cycle protocol without Playwright: raw CDP with no Network/Runtime/Log domains enabled, so DevTools
// keeps no response bodies or console messages. Usage: node rawcdp.mjs <label> <path> <run> [--network]
// --network enables the Network domain with Chrome's default buffers, to measure what it adds.
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';

const [label, target, runArg] = process.argv.slice(2);
const WITH_NETWORK = process.argv.includes('--network');
const HERE = new URL('.', import.meta.url).pathname;
const OUT = `${HERE}results/${label}.jsonl`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CYCLES = 3;
const port = 9300 + Math.floor(Math.random() * 600);
const profile = fs.mkdtempSync('/private/tmp/claude-501/-Users-bryandoss-muxtree-worktrees-geogenesis-benchmark-ui-load/63e2a027-75d6-40cb-94df-8058e589ca6a/scratchpad/bench2/profiles-');
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--autoplay-policy=no-user-gesture-required', '--disable-features=BackForwardCache',
  '--no-first-run', '--no-default-browser-check', '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });

let targets;
for (let i = 0; i < 50; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    if (targets.some(t => t.type === 'page')) break;
  } catch {}
  await sleep(200);
}
const pageWs = targets.find(t => t.type === 'page').webSocketDebuggerUrl;
const ws = new WebSocket(pageWs);
await new Promise(r => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, m => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

if (WITH_NETWORK) await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

function processTree(root) {
  const tree = [root];
  for (let i = 0; i < tree.length; i++) {
    try {
      tree.push(...execSync(`pgrep -P ${tree[i]}`).toString().trim().split('\n').filter(Boolean).map(Number));
    } catch {}
  }
  return tree;
}
function footprint() {
  const tmp = `${HERE}results/fp-raw-${process.pid}.json`;
  execSync(`footprint -f bytes -j ${tmp} ${processTree(chrome.pid).map(p => '-p ' + p).join(' ')}`, { stdio: 'ignore' });
  const procs = JSON.parse(fs.readFileSync(tmp, 'utf8')).processes;
  const sum = f => +(procs.filter(f).reduce((a, p) => a + p.footprint, 0) / 1048576).toFixed(1);
  return { fpTotalMB: sum(() => true), fp_rendererMB: sum(p => /Renderer/.test(p.name)), fp_gpuMB: sum(p => /\(GPU\)/.test(p.name)) };
}

const settle = async () => {
  // No network events here: wait for the DOM to stop changing for 2 s (cap 30 s).
  let last = -1;
  let since = Date.now();
  const start = Date.now();
  while (Date.now() - start < 30000) {
    const n = await evaluate('document.getElementsByTagName("*").length').catch(() => -1);
    if (n !== last) {
      last = n;
      since = Date.now();
    } else if (Date.now() - since > 2000) break;
    await sleep(250);
  }
};
const checkpoint = async name => {
  await settle();
  await send('HeapProfiler.collectGarbage');
  await send('HeapProfiler.collectGarbage');
  await sleep(500);
  const heap = await send('Runtime.getHeapUsage');
  const dc = await send('Memory.getDOMCounters');
  const live = await evaluate('(() => { const w = document.createTreeWalker(document, NodeFilter.SHOW_ALL); let n = 1; while (w.nextNode()) n++; return n; })()');
  const row = {
    label, flow: target, run: Number(runArg), checkpoint: name, network: WITH_NETWORK,
    jsHeapUsedMB: +(heap.usedSize / 1048576).toFixed(2), domNodes: dc.nodes, liveNodes: live, offDocNodes: dc.nodes - live,
    ...footprint(),
  };
  fs.appendFileSync(OUT, JSON.stringify(row) + '\n');
  console.log(name, JSON.stringify(row));
};
const spa = async p => {
  await evaluate(`window.next.router.push(${JSON.stringify(p)})`);
  await sleep(1000);
  await settle();
};
const wheel = async ms => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: 900 });
    await sleep(1500);
  }
};

await send('Page.navigate', { url: 'http://localhost:3000/tools' });
await sleep(3000);
await checkpoint('base');
for (let k = 1; k <= CYCLES; k++) {
  await spa(target);
  await wheel(10000);
  await checkpoint(`peak${k}`);
  await spa('/tools');
  await checkpoint(`ret${k}`);
}
ws.close();
chrome.kill();
await sleep(1000);
fs.rmSync(profile, { recursive: true, force: true });
process.exit(0);
