// Snapshot after scrolling Explore; report detached DOM nodes and what retains them.
import { chromium } from '/Users/bryandoss/muxtree/worktrees/geogenesis/benchmark-ui-load/node_modules/.bun/playwright@1.61.1/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const map = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-features=BackForwardCache', ...(map ? [`--host-resolver-rules=MAP localhost:3000 127.0.0.1:${map}`] : [])] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const cdp = await p.context().newCDPSession(p);
await p.goto('http://localhost:3000/explore', { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(10000);
await p.mouse.move(720, 450);
for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, 900); await sleep(1000); }
await sleep(5000);
for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage');
const live = await p.evaluate(() => document.getElementsByTagName('*').length);
const file = `heap/explore-${map ?? '3000'}.heapsnapshot`;
fs.mkdirSync('heap', { recursive: true });
const fd = fs.openSync(file, 'w');
cdp.on('HeapProfiler.addHeapSnapshotChunk', e => fs.writeSync(fd, e.chunk));
await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
fs.closeSync(fd);
await b.close();

const s = JSON.parse(fs.readFileSync(file, 'utf8'));
const m = s.snapshot.meta, nf = m.node_fields.length, ef = m.edge_fields.length;
const F = n => m.node_fields.indexOf(n), E = n => m.edge_fields.indexOf(n);
const [nT, nN, nE, nD] = [F('type'), F('name'), F('edge_count'), F('detachedness')];
const [eT, eN, eTo] = [E('type'), E('name_or_index'), E('to_node')];
const count = s.nodes.length / nf;
const first = new Uint32Array(count + 1);
for (let i = 0, e = 0; i < count; i++) { first[i] = e; e += s.nodes[i * nf + nE] * ef; }
first[count] = s.edges.length;
const name = i => s.strings[s.nodes[i * nf + nN]];
const detached = i => s.nodes[i * nf + nD] === 2;
const ret = Array.from({ length: count }, () => []);
for (let i = 0; i < count; i++) for (let e = first[i]; e < first[i + 1]; e += ef) {
  const t = m.edge_types[0][s.edges[e + eT]];
  if (t === 'weak' || t === 'shortcut') continue;
  ret[s.edges[e + eTo] / nf].push([i, e]);
}
const groups = {};
const det = [];
for (let i = 0; i < count; i++) if (detached(i) && /^HTML|^SVG|^Text$/.test(name(i).split(' ')[0])) { det.push(i); const k = name(i).split(' ')[0]; groups[k] = (groups[k] ?? 0) + 1; }
console.log('live elements', live, 'detached DOM objects', det.length);
console.log(Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 8));
// For detached roots (no detached parent retaining them), show the nearest non-detached retainer chain.
const edgeName = e => { const t = m.edge_types[0][s.edges[e + eT]]; const v = s.edges[e + eN]; return t === 'element' || t === 'hidden' ? `[${v}]` : String(s.strings[v] ?? v).slice(0, 40); };
const chains = {};
for (const i of det.slice(0, 3000)) {
  const r = ret[i].filter(([from]) => !detached(from));
  if (!r.length) continue;
  // walk up 6 steps through first retainer
  let cur = i, path = [];
  for (let k = 0; k < 6; k++) {
    const rr = ret[cur].filter(([from]) => !detached(from) || k === 0);
    if (!rr.length) break;
    const [from, e] = rr[0];
    path.push(`${name(from).slice(0, 40)}.${edgeName(e)}`);
    cur = from;
    if (cur === 0) break;
  }
  const key = path.join(' <- ');
  chains[key] = (chains[key] ?? 0) + 1;
}
console.log('retainer chains of detached nodes (count):');
for (const [k, v] of Object.entries(chains).sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(v, k);
