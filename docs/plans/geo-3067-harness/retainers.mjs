// From a snapshot: for detached DOM nodes, walk retainers up past DOM/Blink internals to the first JS
// owner and report the owner + edge names (grouped).
import fs from 'node:fs';
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const m = s.snapshot.meta, nf = m.node_fields.length, ef = m.edge_fields.length;
const F = n => m.node_fields.indexOf(n), E = n => m.edge_fields.indexOf(n);
const [nT, nN, nE, nD, nId] = [F('type'), F('name'), F('edge_count'), F('detachedness'), F('id')];
const [eT, eN, eTo] = [E('type'), E('name_or_index'), E('to_node')];
const count = s.nodes.length / nf;
const first = new Uint32Array(count + 1);
for (let i = 0, e = 0; i < count; i++) { first[i] = e; e += s.nodes[i * nf + nE] * ef; }
first[count] = s.edges.length;
const name = i => s.strings[s.nodes[i * nf + nN]];
const type = i => m.node_types[0][s.nodes[i * nf + nT]];
const detached = i => s.nodes[i * nf + nD] === 2;
const ret = Array.from({ length: count }, () => []);
for (let i = 0; i < count; i++) for (let e = first[i]; e < first[i + 1]; e += ef) {
  const t = m.edge_types[0][s.edges[e + eT]];
  if (t === 'weak' || t === 'shortcut') continue;
  ret[s.edges[e + eTo] / nf].push([i, e]);
}
const edgeName = e => { const t = m.edge_types[0][s.edges[e + eT]]; const v = s.edges[e + eN]; return t === 'element' || t === 'hidden' ? `[${v}]` : String(s.strings[v] ?? v).slice(0, 30); };
const isDomish = i => detached(i) || /^(HTML|SVG|Text|Comment|blink::|DOMTokenList|NodeList|CSSStyleDeclaration|Attr|NamedNodeMap|DocumentFragment|ShadowRoot|InternalNode|system \/|\(|Detached)/.test(name(i)) || type(i) === 'hidden' || type(i) === 'array';
const owners = {};
const det = [];
for (let i = 0; i < count; i++) if (detached(i)) det.push(i);
let examined = 0;
for (const start of det) {
  // BFS upward until the first non-DOM-ish owner.
  const seen = new Set([start]); const q = [[start, []]]; let found = null;
  for (let qi = 0; qi < q.length && qi < 5000 && !found; qi++) {
    const [n, path] = q[qi];
    for (const [from, e] of ret[n]) {
      if (seen.has(from)) continue; seen.add(from);
      const p2 = [`${name(from).slice(0, 35)}.${edgeName(e)}`, ...path];
      if (!isDomish(from)) { found = p2.slice(0, 4).join(' -> '); break; }
      q.push([from, p2]);
    }
  }
  if (found) { owners[found] = (owners[found] ?? 0) + 1; }
  if (++examined > 4000) break;
}
console.log('detached', det.length);
for (const [k, v] of Object.entries(owners).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(v, k);
