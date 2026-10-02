// Heap snapshot diff for one flow: what survives repeated visits.
// Usage: node heapdiff.mjs <name> <path> [visits=3] [--auth state.json] [--scroll ms]
// Visits <path> from /tools `visits` times through client-side navigation, snapshots after the
// first and the last return to /tools, and reports objects created in between that are still alive,
// grouped by constructor, with sample retainer paths.
import { chromium } from '/Users/bryandoss/muxtree/worktrees/geogenesis/benchmark-ui-load/node_modules/.bun/playwright@1.61.1/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = n => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
const [name, target, visitsArg] = argv;
const VISITS = Number(/^\d+$/.test(visitsArg ?? '') ? visitsArg : 3);
const SCROLL = Number(opt('--scroll') ?? 8000);
const BASE = 'http://localhost:3000';
const HERE = new URL('.', import.meta.url).pathname;
const OUT = `${HERE}heap/${name}/`;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-features=BackForwardCache'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(opt('--auth') ? { storageState: opt('--auth') } : {}) });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('HeapProfiler.enable');

const spa = async p => {
  await page.evaluate(x => window.next.router.push(x), p);
  await page.waitForURL(u => u.pathname === p.split('?')[0], { timeout: 60000 }).catch(() => {});
  await sleep(6000);
};
const visit = async () => {
  await spa(target);
  await page.mouse.move(720, 450);
  const end = Date.now() + SCROLL;
  while (Date.now() < end) {
    await page.mouse.wheel(0, 900);
    await sleep(1500);
  }
  await spa('/tools');
};
const snapshot = async file => {
  for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage');
  await sleep(1000);
  const fd = fs.openSync(file, 'w');
  const onChunk = e => fs.writeSync(fd, e.chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false, captureNumericValue: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  fs.closeSync(fd);
};

await page.goto(BASE + '/tools', { waitUntil: 'load', timeout: 120000 });
await sleep(12000);
await visit();
await snapshot(OUT + 'after1.heapsnapshot');
for (let i = 2; i <= VISITS; i++) await visit();
await snapshot(OUT + `after${VISITS}.heapsnapshot`);
await browser.close();

// ---------- analysis ----------
function load(file) {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  const m = s.snapshot.meta;
  const nf = m.node_fields.length;
  const ef = m.edge_fields.length;
  const nTypes = m.node_fields.indexOf('type');
  const nName = m.node_fields.indexOf('name');
  const nId = m.node_fields.indexOf('id');
  const nSize = m.node_fields.indexOf('self_size');
  const nEdges = m.node_fields.indexOf('edge_count');
  const nDet = m.node_fields.indexOf('detachedness');
  const eType = m.edge_fields.indexOf('type');
  const eName = m.edge_fields.indexOf('name_or_index');
  const eTo = m.edge_fields.indexOf('to_node');
  const nodeTypes = m.node_types[0];
  const edgeTypes = m.edge_types[0];
  const count = s.nodes.length / nf;
  const firstEdge = new Uint32Array(count + 1);
  for (let i = 0, e = 0; i < count; i++) {
    firstEdge[i] = e;
    e += s.nodes[i * nf + nEdges] * ef;
  }
  firstEdge[count] = s.edges.length;
  return { s, nf, ef, nTypes, nName, nId, nSize, nDet, eType, eName, eTo, nodeTypes, edgeTypes, count, firstEdge };
}
const label = (h, i) => {
  const t = h.nodeTypes[h.s.nodes[i * h.nf + h.nTypes]];
  const n = h.s.strings[h.s.nodes[i * h.nf + h.nName]];
  const det = h.nDet >= 0 && h.s.nodes[i * h.nf + h.nDet] === 2 ? 'Detached ' : '';
  if (t === 'object' || t === 'native' || t === 'closure') return det + n.slice(0, 60);
  return `(${t})`;
};

const a = load(OUT + 'after1.heapsnapshot');
const oldIds = new Set();
for (let i = 0; i < a.count; i++) oldIds.add(a.s.nodes[i * a.nf + a.nId]);
const b = load(OUT + `after${VISITS}.heapsnapshot`);
let totalA = 0;
for (let i = 0; i < a.count; i++) totalA += a.s.nodes[i * a.nf + a.nSize];
let totalB = 0;
const groups = new Map();
const isNew = new Uint8Array(b.count);
for (let i = 0; i < b.count; i++) {
  const size = b.s.nodes[i * b.nf + b.nSize];
  totalB += size;
  if (oldIds.has(b.s.nodes[i * b.nf + b.nId])) continue;
  isNew[i] = 1;
  const k = label(b, i);
  const g = groups.get(k) ?? { count: 0, size: 0, samples: [] };
  g.count++;
  g.size += size;
  if (g.samples.length < 400) g.samples.push(i);
  groups.set(k, g);
}

// Reverse edges for retainer paths (skip weak edges).
const retainers = Array.from({ length: b.count }, () => []);
for (let i = 0; i < b.count; i++) {
  for (let e = b.firstEdge[i]; e < b.firstEdge[i + 1]; e += b.ef) {
    const t = b.edgeTypes[b.s.edges[e + b.eType]];
    if (t === 'weak' || t === 'shortcut') continue;
    retainers[b.s.edges[e + b.eTo] / b.nf].push([i, e]);
  }
}
const edgeName = e => {
  const t = b.edgeTypes[b.s.edges[e + b.eType]];
  const v = b.s.edges[e + b.eName];
  return t === 'element' || t === 'hidden' ? `[${v}]` : String(b.s.strings[v] ?? v).slice(0, 40);
};
// Shortest path from a root to node, walking retainers backwards (BFS), first old (pre-existing) owner marks
// where the new object hangs off long-lived state.
function path(start) {
  const prev = new Map([[start, null]]);
  const q = [start];
  for (let qi = 0; qi < q.length && qi < 200000; qi++) {
    const n = q[qi];
    if (n === 0) break;
    for (const [from, e] of retainers[n]) {
      if (prev.has(from)) continue;
      prev.set(from, [n, e]);
      q.push(from);
    }
  }
  if (!prev.has(0)) return null;
  const steps = [];
  let cur = 0;
  while (cur !== start) {
    const [n, e] = prev.get(cur);
    steps.push(`${label(b, cur)}${isNew[cur] ? '*' : ''} .${edgeName(e)}`);
    cur = n;
  }
  steps.push(label(b, start) + '*');
  // Drop the synthetic root chain prefix; keep the last 12 hops.
  return steps.slice(-12).join(' -> ');
}

const MB = x => (x / 1048576).toFixed(2);
const top = [...groups.entries()].sort((x, y) => y[1].size - x[1].size).slice(0, 30);
const lines = [];
lines.push(`# ${name}: ${target}, ${VISITS} visits`);
lines.push(`heap after visit 1: ${MB(totalA)} MB, after visit ${VISITS}: ${MB(totalB)} MB (+${MB(totalB - totalA)})`);
const newTotal = [...groups.values()].reduce((x, g) => x + g.size, 0);
lines.push(`created after visit 1 and still alive: ${MB(newTotal)} MB in ${[...groups.values()].reduce((x, g) => x + g.count, 0)} objects`);
lines.push('', '| constructor | count | self MB |', '|---|---|---|');
for (const [k, g] of top) lines.push(`| ${k} | ${g.count} | ${MB(g.size)} |`);
lines.push('', '## Sample retainer paths (* = created after visit 1)');
for (const [k, g] of top.slice(0, 10)) {
  const seen = new Set();
  let shown = 0;
  for (const i of g.samples) {
    const p = path(i);
    if (!p) continue;
    // Group paths by their shape so one sample per distinct owner chain is shown.
    const shape = p.replace(/\[\d+\]/g, '[n]');
    if (seen.has(shape)) continue;
    seen.add(shape);
    lines.push(`- **${k}**: ${p}`);
    if (++shown >= 3) break;
  }
}
fs.writeFileSync(OUT + 'report.md', lines.join('\n'));
console.log(lines.join('\n'));
