// App memory harness. One run = one fresh Chrome running one flow.
// Usage: node harness.mjs <label> <flow> <run> [--auth state.json] [--base http://localhost:3000]
// Writes one JSONL row per checkpoint to results/<label>.jsonl.
import { chromium } from '/Users/bryandoss/muxtree/worktrees/geogenesis/benchmark-ui-load/node_modules/.bun/playwright@1.61.1/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { FLOWS } from './flows.mjs';

const argv = process.argv.slice(2);
const opt = name => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const [label, flowName, runArg] = argv;
const BASE = opt('--base') ?? 'http://localhost:3000';
const AUTH = opt('--auth');
const HERE = new URL('.', import.meta.url).pathname;
const OUT = `${HERE}results/`;
fs.mkdirSync(OUT, { recursive: true });
const outFile = `${OUT}${label}.jsonl`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MB = b => +(b / 1048576).toFixed(2);
const flow = FLOWS[flowName];
const CYCLES = Number(process.env.BENCH_CYCLES ?? 3);
if (!flow) throw new Error(`unknown flow ${flowName}`);

// ---------- OS level ----------
function processTree(root) {
  const tree = [root];
  for (let i = 0; i < tree.length; i++) {
    try {
      tree.push(...execSync(`pgrep -P ${tree[i]}`).toString().trim().split('\n').filter(Boolean).map(Number));
    } catch {}
  }
  return tree;
}
const role = name =>
  /\(GPU\)/.test(name) ? 'gpu' : /Renderer/.test(name) ? 'renderer' : /Helper/.test(name) ? 'utility' : 'browser';
function footprints(rootPid) {
  const tmp = `${OUT}fp-${process.pid}.json`;
  execSync(`footprint -f bytes -j ${tmp} ${processTree(rootPid).map(p => '-p ' + p).join(' ')}`, { stdio: 'ignore' });
  const procs = JSON.parse(fs.readFileSync(tmp, 'utf8')).processes;
  const byRole = {};
  for (const p of procs) byRole[role(p.name)] = (byRole[role(p.name)] ?? 0) + p.footprint;
  const out = { fpTotalMB: MB(procs.reduce((a, p) => a + p.footprint, 0)) };
  for (const [k, v] of Object.entries(byRole)) out[`fp_${k}MB`] = MB(v);
  out.fpProcs = procs.map(p => ({ pid: p.pid, role: role(p.name), mb: MB(p.footprint) }));
  return out;
}
function systemPressure() {
  try {
    return { sysFreePct: Number(execSync('sysctl -n kern.memorystatus_level').toString().trim()) };
  } catch {
    return {};
  }
}

// ---------- Chrome memory-infra ----------
const ALLOCATORS = [
  'v8',
  'blink_gc',
  'blink_objects',
  'partition_alloc/partitions',
  'malloc',
  'cc',
  'gpu',
  'skia',
  'media',
  'discardable',
  'web_cache',
  'parkable_images',
  'shared_memory',
  'font_caches',
  'canvas',
];
function allocSize(a, key) {
  const node = a[key];
  if (node?.attrs?.size) return parseInt(node.attrs.size.value, 16);
  // Some allocators only report on children.
  let sum = 0;
  let found = false;
  for (const [k, v] of Object.entries(a)) {
    if (k.startsWith(key + '/') && k.split('/').length === key.split('/').length + 1 && v.attrs?.size) {
      sum += parseInt(v.attrs.size.value, 16);
      found = true;
    }
  }
  return found ? sum : undefined;
}
async function memoryInfra(bcdp, roles) {
  const events = [];
  const onData = e => events.push(...e.value);
  bcdp.on('Tracing.dataCollected', onData);
  const done = new Promise(r => bcdp.once('Tracing.tracingComplete', r));
  await bcdp.send('Tracing.start', {
    traceConfig: { includedCategories: ['disabled-by-default-memory-infra'], memoryDumpConfig: { triggers: [] } },
    transferMode: 'ReportEvents',
  });
  const res = await bcdp.send('Tracing.requestMemoryDump', { deterministic: true, levelOfDetail: 'detailed' });
  await bcdp.send('Tracing.end');
  await Promise.race([done, sleep(20000)]);
  bcdp.off('Tracing.dataCollected', onData);
  const out = { infraOk: !!res.success };
  for (const e of events) {
    if (e.ph !== 'v') continue;
    const a = e.args?.dumps?.allocators;
    if (!a) continue;
    const r = roles.get(e.pid) ?? 'other';
    for (const key of ALLOCATORS) {
      const s = allocSize(a, key);
      if (s === undefined) continue;
      const name = `mi_${r}_${key.split('/')[0]}MB`;
      out[name] = +((out[name] ?? 0) + MB(s)).toFixed(2);
    }
  }
  return out;
}

// ---------- page level ----------
async function pageCounters(page, cdp, sizeQueries) {
  const out = {};
  const dc = await cdp.send('Memory.getDOMCounters').catch(() => null);
  if (dc) Object.assign(out, { documents: dc.documents, domNodes: dc.nodes, listeners: dc.jsEventListeners });
  const pm = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  out.jsHeapUsedMB = MB(pm.JSHeapUsedSize);
  out.jsHeapTotalMB = MB(pm.JSHeapTotalSize);
  // Off by default: handing detached nodes to DevTools keeps them alive.
  const det = !process.env.BENCH_DETACHED ? null : await cdp.send('DOM.getDetachedDomNodes').catch(() => null);
  if (det) {
    out.detachedRoots = det.detachedNodes.length;
    out.detachedNodes = det.detachedNodes.reduce((a, n) => a + 1 + (n.treeNode?.childNodeCount ?? 0), 0);
  }
  const v = await page
    .evaluate(sizeQueries => {
      const vs = [...document.querySelectorAll('video')];
      const imgs = [...document.images];
      const decoded = imgs.filter(i => i.complete && i.naturalWidth);
      const res = {
        path: location.pathname,
        visible: document.visibilityState,
        videos: vs.length,
        videosWithSrc: vs.filter(x => x.currentSrc || x.getAttribute('src')).length,
        videosLoaded: vs.filter(x => x.readyState >= 3).length,
        bufferedSec: Math.round(
          vs.reduce((a, x) => a + (x.buffered.length ? x.buffered.end(x.buffered.length - 1) : 0), 0)
        ),
        images: imgs.length,
        imagesDecodedMP: +(decoded.reduce((a, i) => a + i.naturalWidth * i.naturalHeight, 0) / 1e6).toFixed(2),
        iframes: document.querySelectorAll('iframe').length,
        // Every node in the live document, text and comments included (compare with the process counter).
        liveNodes: (() => {
          const w = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
          let n = 1;
          while (w.nextNode()) n++;
          return n;
        })(),
      };
      // TanStack Query cache, found through the React root fiber (no app changes).
      const findClient = () => {
        if (window.__benchQC) return window.__benchQC;
        const hosts = [document, document.documentElement, document.body, document.getElementById('__next')];
        let root = null;
        for (const h of hosts) {
          if (!h) continue;
          const k = Object.keys(h).find(x => x.startsWith('__reactContainer$') || x.startsWith('__reactFiber$'));
          if (k) {
            root = h[k];
            break;
          }
        }
        if (!root) return null;
        const stack = [root.stateNode?.current ?? root];
        let seen = 0;
        while (stack.length && seen < 200000) {
          const f = stack.pop();
          seen++;
          const c = f?.memoizedProps?.client;
          if (c && typeof c.getQueryCache === 'function') return (window.__benchQC = c);
          if (f?.sibling) stack.push(f.sibling);
          if (f?.child) stack.push(f.child);
        }
        return null;
      };
      try {
        const qc = findClient();
        if (qc) {
          const qs = qc.getQueryCache().getAll();
          let bytes = 0;
          let unsized = 0;
          for (const q of sizeQueries ? qs : []) {
            if (q.state.data === undefined) continue;
            try {
              bytes += JSON.stringify(q.state.data, (_, x) => (typeof x === 'bigint' ? String(x) : x))?.length ?? 0;
            } catch {
              unsized++;
            }
          }
          res.queries = qs.length;
          res.queriesActive = qs.filter(q => q.getObserversCount() > 0).length;
          if (sizeQueries) res.queryDataMB = +(bytes / 1048576).toFixed(2);
          res.queriesUnsized = unsized;
          res.mutations = qc.getMutationCache().getAll().length;
        } else res.queries = null;
      } catch (e) {
        res.queryErr = String(e).slice(0, 100);
      }
      return res;
    }, sizeQueries)
    .catch(e => ({ evalErr: String(e).slice(0, 100) }));
  Object.assign(out, v);
  // Nodes alive in the renderer but not in this document: detached trees plus other documents.
  if (out.domNodes != null && out.liveNodes != null) out.offDocNodes = out.domNodes - out.liveNodes;
  return out;
}

// ---------- network ----------
function networkTracker(page) {
  const inflight = new Map();
  let totals = { req: 0, bytes: 0, failed: 0, netErr: 0, wsIn: 0, wsOut: 0 };
  let byOrigin = {};
  let gqlOps = {};
  let window_ = structuredClone({ totals, byOrigin, gqlOps });
  const bump = (obj, k, n = 1) => (obj[k] = (obj[k] ?? 0) + n);
  page.on('request', r => {
    const t = r.resourceType();
    if (t !== 'media' && t !== 'websocket' && t !== 'eventsource') inflight.set(r, Date.now());
    totals.req++;
    let origin = 'other';
    try {
      origin = new URL(r.url()).host;
    } catch {}
    bump(byOrigin, origin);
    if (r.method() === 'POST' && /graphql/.test(r.url())) {
      let op = 'unknown';
      try {
        const body = JSON.parse(r.postData() ?? '{}');
        const one = Array.isArray(body) ? body[0] : body;
        op = one.operationName ?? /(?:query|mutation)\s+(\w+)/.exec(one.query ?? '')?.[1] ?? 'anon';
      } catch {}
      bump(gqlOps, op);
    }
  });
  const finish = r => inflight.delete(r);
  page.on('requestfinished', async r => {
    finish(r);
    try {
      const s = await r.sizes();
      totals.bytes += s.responseBodySize + s.responseHeadersSize;
    } catch {}
  });
  page.on('requestfailed', r => {
    finish(r);
    totals.failed++;
    // Requests cancelled by navigating away are normal; anything else is a network or CORS failure.
    const blocked = opt('--block') && new RegExp(opt('--block')).test(r.url());
    if (!blocked && !/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) totals.netErr++;
  });
  page.on('websocket', ws => {
    ws.on('framereceived', () => totals.wsIn++);
    ws.on('framesent', () => totals.wsOut++);
  });
  return {
    // Requests still pending that started in the last 15 s (long polls and streams don't block settle).
    busy: () => [...inflight.values()].filter(t => Date.now() - t < 15000).length,
    // Counts since the previous call.
    delta() {
      const now = structuredClone({ totals, byOrigin, gqlOps });
      const sub = (a, b) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v - (b[k] ?? 0)]).filter(([, v]) => v));
      const d = {
        netReq: now.totals.req - window_.totals.req,
        netMB: MB(now.totals.bytes - window_.totals.bytes),
        netFailed: now.totals.failed - window_.totals.failed,
        netErrors: now.totals.netErr - window_.totals.netErr,
        wsIn: now.totals.wsIn - window_.totals.wsIn,
        wsOut: now.totals.wsOut - window_.totals.wsOut,
        byOrigin: sub(now.byOrigin, window_.byOrigin),
        gqlOps: sub(now.gqlOps, window_.gqlOps),
      };
      window_ = now;
      return d;
    },
  };
}

// ---------- run ----------
// Refuse to run without the testnet APIs (a dropped connection makes pages load almost nothing).
async function apiUp() {
  try {
    const r = await fetch('https://testnet-api-v2.geobrowser.io/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"query":"{__typename}"}',
      signal: AbortSignal.timeout(10000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
if (!(await apiUp())) {
  console.error('API unreachable, not running');
  process.exit(3);
}
const server = await chromium.launchServer({
  channel: 'chrome',
  headless: !argv.includes('--headed'),
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--js-flags=--expose-gc',
    '--disable-features=BackForwardCache',
    // --map <port>: keep the page origin http://localhost:3000 (the only origin geo-chat's CORS and Privy
    // accept) while connecting to another local server.
    ...(opt('--map') ? [`--host-resolver-rules=MAP localhost:3000 127.0.0.1:${opt('--map')}`] : []),
  ],
});
const browser = await chromium.connect(server.wsEndpoint());
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ...(AUTH ? { storageState: AUTH } : {}),
});
// --block <regex>: abort matching requests (e.g. a third-party script), to measure what it costs.
if (opt('--block')) await ctx.route(new RegExp(opt('--block')), r => r.abort());
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
await cdp.send('HeapProfiler.enable');
const bcdp = await browser.newBrowserCDPSession();
const net = networkTracker(page);
const errors = [];
page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
const t0 = Date.now();
const rootPid = server.process().pid;

async function settle(capMs = 30000) {
  const start = Date.now();
  if (process.env.BENCH_FIXED_WAIT) {
    await sleep(Number(process.env.BENCH_FIXED_WAIT));
    return { settleMs: Date.now() - start, settleCapped: false, fixedWait: true };
  }
  let lastNodes = -1;
  let stableSince = Date.now();
  while (Date.now() - start < capMs) {
    const nodes = await page.evaluate(() => document.getElementsByTagName('*').length).catch(() => -1);
    if (nodes !== lastNodes || net.busy() > 0) {
      lastNodes = nodes;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= 2000) return { settleMs: Date.now() - start, settleCapped: false };
    await sleep(250);
  }
  return { settleMs: Date.now() - start, settleCapped: true };
}

let seq = 0;
let lastProcs = [];
async function checkpoint(name, { noSettle = false } = {}) {
  const s = noSettle ? { settleMs: 0, settleCapped: false } : await settle();
  const tm = Date.now();
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  await sleep(500);
  const tGc = Date.now();
  // footprint costs 2-3 s; mid-flow peaks after the first don't need it.
  const skipFp = /^peak\d+$/.test(name) && name !== 'peak1';
  const fp = skipFp ? { fpProcs: [] } : footprints(rootPid);
  const tFp = Date.now();
  const roles = new Map((skipFp ? lastProcs : fp.fpProcs).map(p => [p.pid, p.role]));
  if (!skipFp) lastProcs = fp.fpProcs;
  const mi = process.env.BENCH_NO_INFRA ? {} : await memoryInfra(bcdp, roles).catch(e => ({ infraErr: String(e).slice(0, 100) }));
  const tMi = Date.now();
  const sizeQueries = name === 'base' || name === 'peak1' || name === `ret${CYCLES}` || !/^(peak|ret)\d+$/.test(name);
  const pc = await pageCounters(page, cdp, sizeQueries && !process.env.BENCH_NO_QSIZE);
  const tPc = Date.now();
  const row = {
    label,
    flow: flowName,
    run: Number(runArg),
    seq: seq++,
    checkpoint: name,
    t: Math.round((Date.now() - t0) / 1000),
    signedIn: !!AUTH,
    ...s,
    ...fp,
    ...mi,
    ...pc,
    msGc: tGc - tm,
    msFootprint: tFp - tGc,
    msInfra: tMi - tFp,
    msCounters: tPc - tMi,
    parallel: Number(process.env.BENCH_PARALLEL ?? 1),
    at: new Date().toISOString(),
    ...net.delta(),
    ...systemPressure(),
  };
  // More than a quarter of this reading's requests failed: likely a network drop, not the app.
  row.netSuspect = row.netReq >= 8 && row.netErrors / row.netReq > 0.25;
  fs.appendFileSync(outFile, JSON.stringify(row) + '\n');
  console.log(
    `${name.padEnd(12)} total=${row.fpTotalMB} rend=${row.fp_rendererMB} gpu=${row.fp_gpuMB} heap=${row.jsHeapUsedMB} docs=${row.documents} nodes=${row.domNodes} detached=${row.detachedNodes} q=${row.queries}/${row.queryDataMB}MB req=${row.netReq} settle=${row.settleMs}${row.settleCapped ? '!' : ''}`
  );
  return row;
}

const h = {
  page,
  cdp,
  BASE,
  sleep,
  checkpoint,
  settle,
  goto: async path => {
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 180000 });
  },
  // Client-side navigation, so the session's memory carries over.
  spa: async path => {
    await page.evaluate(p => window.next.router.push(p), path);
    await page.waitForURL(u => u.pathname === path.split('?')[0], { timeout: 60000 }).catch(() => {});
  },
  wheel: async (ms, dy = 900, every = 1500) => {
    await page.mouse.move(720, 450);
    const end = Date.now() + ms;
    while (Date.now() < end) {
      await page.mouse.wheel(0, dy);
      await sleep(every);
    }
  },
  // The full-screen debate feed scrolls its own snap container.
  feed: async (dir, wait = 4000) => {
    await page.evaluate(d => {
      const f = [...document.querySelectorAll('div')].find(e => String(e.className).includes('snap-y'));
      if (f) f.scrollBy(0, d * f.clientHeight);
    }, dir);
    await sleep(wait);
  },
};

// --expect <label>: fail unless pages come from that saved build (catches a wrong or stale server).
const EXPECT = opt('--expect');
const expectedBuild = EXPECT ? fs.readFileSync(`${HERE}builds/${EXPECT}/.next/BUILD_ID`, 'utf8').trim() : null;
const origGoto = h.goto;
h.goto = async path => {
  await origGoto(path);
  if (expectedBuild && !(await page.content()).includes(expectedBuild)) throw new Error(`served build is not ${EXPECT}`);
};

let failed = null;
try {
  await flow(h);
} catch (e) {
  failed = String(e).slice(0, 300);
  console.error('FLOW FAILED', failed);
}
if (errors.length || failed)
  fs.appendFileSync(
    outFile,
    JSON.stringify({ label, flow: flowName, run: Number(runArg), failed, pageErrors: [...new Set(errors)].slice(0, 20) }) + '\n'
  );
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
