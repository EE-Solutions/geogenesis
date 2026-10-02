"""Summaries for harness results.

  python3 analyze.py baseline <label>             per flow: first-visit peak, retained growth per cycle
  python3 analyze.py ab <labelA> <labelB> [flow]  per flow and checkpoint: B - A with 95% CI and p
  python3 analyze.py noise <label>                per flow: SD and CV of each metric (sample sizing)
"""
import itertools
import json
import math
import random
import re
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
METRICS = [
    'fpTotalMB', 'fp_rendererMB', 'fp_gpuMB', 'fp_browserMB',
    'mi_renderer_v8MB', 'mi_renderer_blink_gcMB', 'mi_renderer_partition_allocMB', 'mi_renderer_mallocMB',
    'mi_renderer_ccMB', 'mi_gpu_gpuMB',
    'jsHeapUsedMB', 'domNodes', 'liveNodes', 'offDocNodes', 'detachedNodes', 'listeners',
    'queries', 'queryDataMB', 'images', 'imagesDecodedMP', 'videosWithSrc', 'bufferedSec',
    'netReq', 'netMB',
]
SHORT = {
    'fpTotalMB': 'total', 'fp_rendererMB': 'renderer', 'fp_gpuMB': 'gpu', 'fp_browserMB': 'browser',
    'mi_renderer_v8MB': 'v8', 'mi_renderer_blink_gcMB': 'blink_gc', 'mi_renderer_partition_allocMB': 'partition',
    'mi_renderer_mallocMB': 'malloc', 'mi_renderer_ccMB': 'cc', 'mi_gpu_gpuMB': 'gpu_gpu',
    'jsHeapUsedMB': 'jsHeap', 'domNodes': 'nodes', 'liveNodes': 'live', 'offDocNodes': 'offDoc', 'detachedNodes': 'detached', 'listeners': 'listeners',
    'queries': 'queries', 'queryDataMB': 'qDataMB', 'images': 'imgs', 'imagesDecodedMP': 'imgMP',
    'videosWithSrc': 'videos', 'bufferedSec': 'bufSec', 'netReq': 'req', 'netMB': 'netMB',
}


def load(label):
    rows, fails = [], []
    for line in (HERE / 'results' / f'{label}.jsonl').read_text().splitlines():
        r = json.loads(line)
        (rows if 'checkpoint' in r else fails).append(r)
    # Drop whole runs that hit a network drop.
    # Older rows counted navigation aborts as failures, so there only page loads can flag a run.
    def suspect(r):
        if 'netErrors' in r:
            return r.get('netSuspect')
        return r.get('netSuspect') and not r['checkpoint'].startswith('ret')
    bad = {(r['flow'], r['run']) for r in rows if suspect(r)}
    if bad:
        print(f'(excluded {len(bad)} runs with network failures: {sorted(bad)})')
    return [r for r in rows if (r['flow'], r['run']) not in bad], fails


def by(rows, *keys):
    out = defaultdict(list)
    for r in rows:
        out[tuple(r[k] for k in keys)].append(r)
    return out


def fmt(x, d=1):
    if x is None:
        return '-'
    return f'{x:,.{d}f}' if abs(x) < 1000 else f'{x:,.0f}'


def slope(xs, ys):
    mx, my = st.mean(xs), st.mean(ys)
    den = sum((x - mx) ** 2 for x in xs)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den if den else 0.0


T95 = {1: 12.71, 2: 4.30, 3: 3.18, 4: 2.78, 5: 2.57, 6: 2.45, 7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23, 12: 2.18, 15: 2.13, 20: 2.09, 30: 2.04}


def t95(df):
    df = max(1, int(df))
    for k in sorted(T95):
        if df <= k:
            return T95[k]
    return 1.96


def mean_ci(v):
    if len(v) < 2:
        return (v[0] if v else None), None
    return st.mean(v), t95(len(v) - 1) * st.stdev(v) / math.sqrt(len(v))


def welch(a, b):
    ma, mb = st.mean(a), st.mean(b)
    va, vb = st.variance(a) / len(a), st.variance(b) / len(b)
    se = math.sqrt(va + vb) or 1e-9
    df = (va + vb) ** 2 / ((va ** 2) / (len(a) - 1) + (vb ** 2) / (len(b) - 1)) if va + vb else len(a) + len(b) - 2
    return mb - ma, t95(df) * se


def mann_whitney_p(a, b, iters=20000):
    """Two-sided permutation p-value on the difference of mean ranks."""
    pooled = a + b
    ranks = {v: i for i, v in enumerate(sorted(pooled))}
    def stat(xa, xb):
        return abs(st.mean(ranks[x] for x in xa) - st.mean(ranks[x] for x in xb))
    obs = stat(a, b)
    n = len(a)
    combos = math.comb(len(pooled), n)
    if combos <= iters:
        idx = range(len(pooled))
        hits = total = 0
        for pick in itertools.combinations(idx, n):
            s = set(pick)
            xa = [pooled[i] for i in pick]
            xb = [pooled[i] for i in idx if i not in s]
            hits += stat(xa, xb) >= obs - 1e-12
            total += 1
        return hits / total
    rnd = random.Random(0)
    hits = 0
    for _ in range(iters):
        p = pooled[:]
        rnd.shuffle(p)
        hits += stat(p[:n], p[n:]) >= obs - 1e-12
    return hits / iters


def vals(rows, m):
    return [r[m] for r in rows if isinstance(r.get(m), (int, float))]


def baseline(label):
    rows, fails = load(label)
    flows = by(rows, 'flow')
    print(f'# {label}: {len({(r["flow"], r["run"]) for r in rows})} runs, {len(fails)} with errors/failures\n')
    for (flow,), fr in sorted(flows.items()):
        runs = by(fr, 'run')
        print(f'## {flow}  (n={len(runs)})')
        cps = by(fr, 'checkpoint')
        print('| metric | base | peak1 | last ret | retained/cycle (95% CI) |')
        print('|---|---|---|---|---|')
        for m in METRICS:
            b = vals(cps.get(('base',), []), m)
            p = vals(cps.get(('peak1',), []), m)
            rets = sorted({r['checkpoint'] for r in fr if r['checkpoint'].startswith('ret')}, key=lambda c: int(c[3:] or 0))
            last = vals(cps.get((rets[-1],), []), m) if rets else []
            slopes = []
            for (_,), rr in runs.items():
                pts = [(0, r[m]) for r in rr if r['checkpoint'] == 'base' and m in r]
                pts += [(int(r['checkpoint'][3:]), r[m]) for r in rr if r['checkpoint'].startswith('ret') and r['checkpoint'][3:] and m in r]
                if len(pts) >= 3:
                    slopes.append(slope([x for x, _ in pts], [y for _, y in pts]))
            sm, sci = mean_ci(slopes) if slopes else (None, None)
            if not (b or p or last):
                continue
            print(f'| {SHORT[m]} | {fmt(st.median(b)) if b else "-"} | {fmt(st.median(p)) if p else "-"} | '
                  f'{fmt(st.median(last)) if last else "-"} | {fmt(sm, 2)} ± {fmt(sci, 2)} |')
        settle = vals(fr, 'settleMs')
        capped = sum(1 for r in fr if r.get('settleCapped'))
        print(f'\nsettle median {st.median(settle):.0f} ms, capped {capped}/{len(fr)} checkpoints\n')
    for f in fails:
        print('FAIL/ERR', f['flow'], f['run'], f.get('failed'), (f.get('pageErrors') or [])[:3])


def noise(label):
    rows, _ = load(label)
    for (flow, cp), rr in sorted(by(rows, 'flow', 'checkpoint').items()):
        if cp not in ('base', 'peak1') and not cp.startswith('ret') and not cp.startswith('idle'):
            continue
        parts = []
        for m in ['fpTotalMB', 'fp_rendererMB', 'jsHeapUsedMB', 'domNodes', 'mi_renderer_partition_allocMB', 'mi_renderer_mallocMB']:
            v = vals(rr, m)
            if len(v) >= 2 and st.mean(v):
                parts.append(f'{SHORT[m]} sd={fmt(st.stdev(v))} cv={100 * st.stdev(v) / st.mean(v):.1f}%')
        print(f'{flow:18} {cp:7} n={len(rr)}  ' + '  '.join(parts))


def ab(la, lb, only=None):
    ra, _ = load(la)
    rb, _ = load(lb)
    ga, gb = by(ra, 'flow', 'checkpoint'), by(rb, 'flow', 'checkpoint')
    for key in sorted(set(ga) & set(gb)):
        if only and key[0] != only:
            continue
        print(f'## {key[0]} @ {key[1]}  (n={len(ga[key])} vs {len(gb[key])})')
        print(f'| metric | {la} | {lb} | diff (95% CI) | % | p |')
        print('|---|---|---|---|---|---|')
        for m in METRICS:
            a, b = vals(ga[key], m), vals(gb[key], m)
            if len(a) < 2 or len(b) < 2:
                continue
            d, ci = welch(a, b)
            pct = 100 * d / st.mean(a) if st.mean(a) else 0
            p = mann_whitney_p(a, b)
            flag = ' **' if p < 0.05 and abs(d) > ci else ''
            print(f'| {SHORT[m]} | {fmt(st.mean(a))} ± {fmt(st.stdev(a))} | {fmt(st.mean(b))} ± {fmt(st.stdev(b))} | '
                  f'{fmt(d)} ± {fmt(ci)} | {pct:+.1f}% | {p:.3f}{flag} |')
        print()


def summary(la, lb):
    """Compact A/B per flow: first-visit peak, what the first visit leaves cached, revisit growth, requests."""
    ra, _ = load(la)
    rb, _ = load(lb)
    def runs(rows, flow):
        out = defaultdict(dict)
        for r in rows:
            if r['flow'] == flow:
                out[r['run']][r['checkpoint']] = r
        return list(out.values())
    def first_visit(rr, m):
        return [r['ret1'][m] - r['base'][m] for r in rr if 'ret1' in r and 'base' in r and m in r['ret1'] and m in r['base']]
    def revisit(rr, m):
        v = []
        for r in rr:
            pts = [(int(c[3:]), x[m]) for c, x in r.items() if re.fullmatch(r'ret\d+', c) and isinstance(x.get(m), (int, float))]
            if len(pts) >= 2:
                v.append(slope([p[0] for p in pts], [p[1] for p in pts]))
        return v
    def peak(rr, m):
        return [r['peak1'][m] for r in rr if 'peak1' in r and isinstance(r['peak1'].get(m), (int, float))]
    rowsdef = [
        ('peak: total MB', peak, 'fpTotalMB'), ('peak: renderer MB', peak, 'fp_rendererMB'), ('peak: GPU MB', peak, 'fp_gpuMB'),
        ('peak: JS heap MB', peak, 'jsHeapUsedMB'), ('peak: page elements', peak, 'domNodes'), ('peak: on-page elements', peak, 'liveNodes'),
        ('peak: decoded image MP', peak, 'imagesDecodedMP'), ('peak: videos with src', peak, 'videosWithSrc'),
        ('peak: query cache entries', peak, 'queries'), ('peak: query cache MB', peak, 'queryDataMB'),
        ('visit: requests', peak, 'netReq'), ('visit: settle s', peak, 'settleMs'),
        ('kept after 1st visit: JS heap MB', first_visit, 'jsHeapUsedMB'), ('kept after 1st visit: elements', first_visit, 'domNodes'),
        ('kept after 1st visit: renderer MB', first_visit, 'fp_rendererMB'),
        ('each revisit: JS heap MB', revisit, 'jsHeapUsedMB'), ('each revisit: elements', revisit, 'domNodes'),
    ]
    flows = sorted({r['flow'] for r in ra} & {r['flow'] for r in rb})
    for flow in flows:
        A, B = runs(ra, flow), runs(rb, flow)
        print(f'\n## {flow}  ({la} n={len(A)} vs {lb} n={len(B)})\n')
        print(f'| metric | {la} | {lb} | change (95% CI) | p |')
        print('|---|---|---|---|---|')
        for name, fn, m in rowsdef:
            a, b = fn(A, m), fn(B, m)
            if m == 'settleMs':
                a, b = [x / 1000 for x in a], [x / 1000 for x in b]
            if len(a) < 2 or len(b) < 2:
                continue
            d, ci = welch(a, b)
            base = st.mean(a)
            pct = f' ({100 * d / base:+.0f}%)' if base else ''
            p = mann_whitney_p(a, b)
            mark = ' **' if p < 0.05 and abs(d) > ci else ''
            print(f'| {name} | {fmt(st.mean(a))} | {fmt(st.mean(b))} | {fmt(d)}{pct} ± {fmt(ci)} | {p:.3f}{mark} |')
        # Requests by operation at the first visit.
        def ops(rr):
            tot = defaultdict(float)
            for r in rr:
                for k, v in (r.get('peak1', {}).get('gqlOps') or {}).items():
                    tot[k] += v / len(rr)
            return tot
        oa, ob = ops(A), ops(B)
        top = sorted(set(oa) | set(ob), key=lambda k: -max(oa.get(k, 0), ob.get(k, 0)))[:8]
        print('\nGraphQL operations per first visit: ' + ', '.join(f'{k} {oa.get(k, 0):.0f}→{ob.get(k, 0):.0f}' for k in top))


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'baseline':
        baseline(sys.argv[2])
    elif cmd == 'noise':
        noise(sys.argv[2])
    elif cmd == 'summary':
        summary(sys.argv[2], sys.argv[3])
    elif cmd == 'ab':
        ab(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
