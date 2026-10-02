// Shortest paths from GC roots to detached DOM nodes; groups by the last non-detached hop (the holder).
import fs from 'node:fs';
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const m = s.snapshot.meta, nf = m.node_fields.length, ef = m.edge_fields.length;
const F = n => m.node_fields.indexOf(n), E = n => m.edge_fields.indexOf(n);
const [nT, nN, nE, nD, nS] = [F('type'), F('name'), F('edge_count'), F('detachedness'), F('self_size')];
const [eT, eN, eTo] = [E('type'), E('name_or_index'), E('to_node')];
const count = s.nodes.length / nf;
const name = i => s.strings[s.nodes[i * nf + nN]];
const detached = i => s.nodes[i * nf + nD] === 2;
const edgeName = e => { const t = m.edge_types[0][s.edges[e + eT]]; const v = s.edges[e + eN]; return t === 'element' || t === 'hidden' ? `[${v}]` : String(s.strings[v] ?? v).slice(0, 30); };
const parent = new Int32Array(count).fill(-1), pedge = new Int32Array(count).fill(-1);
const first = new Uint32Array(count + 1);
for (let i = 0, e = 0; i < count; i++) { first[i] = e; e += s.nodes[i * nf + nE] * ef; }
first[count] = s.edges.length;
parent[0] = 0;
const q = new Int32Array(count); let qh = 0, qt = 0; q[qt++] = 0;
while (qh < qt) {
  const n = q[qh++];
  for (let e = first[n]; e < first[n + 1]; e += ef) {
    const t = m.edge_types[0][s.edges[e + eT]];
    if (t === 'weak' || t === 'shortcut') continue;
    const to = s.edges[e + eTo] / nf;
    if (parent[to] !== -1) continue;
    parent[to] = n; pedge[to] = e; q[qt++] = to;
  }
}
const groups = {};
let reached = 0, total = 0;
for (let i = 0; i < count; i++) {
  if (!detached(i) || !/^(HTML|SVG|Text)/.test(name(i))) continue;
  total++;
  if (parent[i] === -1) continue;
  reached++;
  // Walk up to the first non-detached ancestor and keep 3 hops above it for context.
  let cur = i, hops = [];
  while (cur !== 0 && detached(cur)) { hops.unshift(`${name(cur).slice(0, 25)}`); cur = parent[cur]; }
  const holder = [];
  let c = cur;
  for (let k = 0; k < 4 && c !== 0; k++) { holder.unshift(`${name(c).slice(0, 40)}.${edgeName(pedge[k === 0 ? c : c])}`); c = parent[c]; }
  const key = holder.join(' -> ') + '  ==> ' + hops[0];
  groups[key] = (groups[key] ?? 0) + 1;
}
console.log('detached DOM nodes', total, 'reachable from roots', reached);
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(v, k);
// One full path, and the variables in the holder's closure scope.
for (let i = 0; i < count; i++) {
  if (!detached(i) || !/^<button/.test(name(i)) || parent[i] === -1) continue;
  const path = []; let c = i;
  while (c !== 0) { path.unshift(`${name(c).slice(0, 50)} --${edgeName(pedge[c])}-->`); c = parent[c]; }
  console.log('\nFULL PATH:\n' + path.join('\n'));
  // Find the Context node on the path and list its edges.
  let ctx = i; while (ctx !== 0 && !name(ctx).startsWith('system / Context')) ctx = parent[ctx];
  if (ctx) { const vars = []; for (let e = first[ctx]; e < first[ctx + 1]; e += ef) vars.push(`${edgeName(e)}=${name(s.edges[e + eTo] / nf).slice(0, 30)}`); console.log('\nSCOPE VARS:', vars.join(' | ')); }
  break;
}
