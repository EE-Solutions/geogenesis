"""Writes status.html from the driver log and results. Run in a loop: python3 status.py --loop"""
import html
import json
import re
import statistics as st
import sys
import time
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
RES = HERE / 'results'
# Driver logs and how many runs each plans (until a driver writes "TOTAL n" itself).
DRIVERS = {'validate.log': 64, 'phase1.log': 87}


def esc(x):
    return html.escape(str(x))


def driver_status(name, default_total):
    p = RES / name
    if not p.exists():
        return None
    lines = p.read_text().splitlines()
    total = default_total
    for l in lines:
        m = re.search(r'TOTAL (\d+)', l)
        if m:
            total = int(m.group(1))
    now = datetime.now()
    def at(l):
        return datetime.combine(now.date(), datetime.strptime(l.split(' ')[0], '%H:%M:%S').time())
    running, finished, fails, phase = {}, 0, [], ''
    queue_style = any(' done ' in l for l in lines)
    starts = [l for l in lines if ' start ' in l]
    for l in lines:
        body = l.split(' ', 1)[1] if ' ' in l else ''
        if body.startswith('start '):
            running[body[6:]] = at(l)
        elif body.startswith('done ') or body.startswith('FAILED '):
            key = body.split(' ', 1)[1]
            running.pop(key, None)
            finished += 1
            if body.startswith('FAILED'):
                fails.append(l)
        elif 'FAILED' in body:
            fails.append(l)
        elif not body.startswith('TOTAL') and body != 'DONE':
            phase = body
    done = bool(lines) and lines[-1].endswith('DONE')
    if not queue_style:
        # Sequential driver: each start ends the previous run.
        finished = len(starts) - (0 if done else 1)
        running = {} if done or not starts else {starts[-1].split(' start ', 1)[1]: at(starts[-1])}
    eta = None
    if starts and finished and not done:
        span = (now - at(starts[0])).total_seconds()
        rate = finished / span if span > 0 else 0
        if rate:
            eta = int((total - finished) / rate)
    return dict(name=name, total=total, finished=finished, done=done, phase=phase,
                running=[(k, int((now - v).total_seconds())) for k, v in running.items()], eta=eta, fails=fails)


def load_rows():
    rows, errs = [], []
    for f in sorted(RES.glob('*.jsonl'), key=lambda f: f.stat().st_mtime):
        for line in f.read_text().splitlines():
            try:
                r = json.loads(line)
            except Exception:
                continue
            (rows if 'checkpoint' in r else errs).append(r)
    return rows, errs


def mean_sd(v, d=0):
    if not v:
        return '-'
    if len(v) == 1:
        return f'{v[0]:,.{d}f}'
    return f'{st.mean(v):,.{d}f} ± {st.stdev(v):,.{d}f}'


def slope(pts, m):
    xy = [(x, r[m]) for x, r in pts if isinstance(r.get(m), (int, float))]
    mx, my = st.mean(x for x, _ in xy), st.mean(y for _, y in xy)
    den = sum((x - mx) ** 2 for x, _ in xy)
    return sum((x - mx) * (y - my) for x, y in xy) / den if den else 0.0


def build():
    names = sorted(RES.glob('*.log'), key=lambda f: f.stat().st_mtime, reverse=True)
    names = [f.name for f in names if f.name in DRIVERS or 'TOTAL' in f.read_text()[:400]]
    drivers = [d for d in (driver_status(n, DRIVERS.get(n, 0)) for n in names) if d]
    rows, errs = load_rows()
    out = ['<!doctype html><meta charset=utf-8><meta http-equiv=refresh content=20>',
           '<title>Memory bench status</title><style>',
           'body{font:14px -apple-system,system-ui,sans-serif;margin:24px;color:#111;background:#fff;max-width:1200px}',
           'h1{font-size:20px}h2{font-size:16px;margin-top:28px}table{border-collapse:collapse;width:100%}',
           'td,th{border-bottom:1px solid #e5e5e5;padding:4px 8px;text-align:right;white-space:nowrap}',
           'td:first-child,th:first-child,td.l{text-align:left}.bar{background:#eee;border-radius:6px;height:14px;width:100%}',
           '.fill{background:#3b6cf6;height:14px;border-radius:6px}.muted{color:#777}.bad{color:#c0392b}',
           '</style>',
           f'<h1>Memory benchmark</h1><p class=muted>Updated {datetime.now():%H:%M:%S}, refreshes every 20 s.</p>']
    for d in drivers:
        pct = 100 * d['finished'] / d['total'] if d['total'] else 0
        out.append(f'<h2>{esc(d["name"])}: {"done" if d["done"] else esc(d["phase"])}</h2>')
        out.append(f'<div class=bar><div class=fill style="width:{pct:.0f}%"></div></div>')
        out.append(f'<p>{d["finished"]} of {d["total"]} runs finished ({pct:.0f}%).')
        for job, secs in d['running']:
            out.append(f'<br>Running: <b>{esc(job)}</b>, {secs // 60}m {secs % 60}s in.')
        if d['eta'] is not None and d['eta'] > 0:
            out.append(f' About {d["eta"] // 3600}h {(d["eta"] % 3600) // 60}m left.')
        out.append('</p>')
        if d['fails']:
            out.append('<p class=bad>Failed runs: ' + esc('; '.join(d['fails'])) + '</p>')

    # Latest checkpoints
    out.append('<h2>Latest readings</h2><table><tr><th>time</th><th>label</th><th>flow</th><th>run</th><th>checkpoint</th>'
               '<th>total MB</th><th>renderer MB</th><th>GPU MB</th><th>JS heap MB</th><th>nodes</th><th>detached</th>'
               '<th>queries</th><th>requests</th><th>settle s</th></tr>')
    for r in rows[-15:][::-1]:
        out.append('<tr>' + f'<td>{esc(r.get("t"))}s</td><td class=l>{esc(r["label"])}</td><td class=l>{esc(r["flow"])}</td><td>{r["run"]}</td>'
                   f'<td class=l>{esc(r["checkpoint"])}</td><td>{r.get("fpTotalMB", 0):,.0f}</td><td>{r.get("fp_rendererMB", 0):,.0f}</td>'
                   f'<td>{r.get("fp_gpuMB", 0):,.0f}</td><td>{r.get("jsHeapUsedMB", 0):,.1f}</td><td>{r.get("domNodes", 0):,}</td>'
                   f'<td>{r.get("detachedNodes", 0):,}</td><td>{r.get("queries") or 0:,}</td><td>{r.get("netReq", 0):,}</td>'
                   f'<td>{r.get("settleMs", 0) / 1000:.1f}{"!" if r.get("settleCapped") else ""}</td></tr>')
    out.append('</table>')

    # Per label and flow summary
    out.append('<h2>Summary by label and flow</h2><p class=muted>Mean ± SD across runs. Peak = first visit; '
               'per visit = memory left behind on the neutral page per cycle (slope over base and every return), the main leak measure.</p>')
    out.append('<table><tr><th>label</th><th>flow</th><th>runs</th><th>peak renderer MB</th><th>peak total MB</th>'
               '<th>peak nodes</th><th>per visit renderer MB</th><th>per visit total MB</th><th>per visit JS heap MB</th><th>per visit nodes</th></tr>')
    groups = {}
    for r in rows:
        groups.setdefault((r['label'], r['flow']), {}).setdefault(r['run'], []).append(r)
    for (label, flow), runs in sorted(groups.items()):
        peak_r, peak_t, peak_n, lb_r, lb_n, lb_d, lb_x = [], [], [], [], [], [], []
        for rr in runs.values():
            byc = {x['checkpoint']: x for x in rr}
            p = byc.get('peak1')
            if p:
                peak_r.append(p.get('fp_rendererMB', 0)); peak_t.append(p.get('fpTotalMB', 0)); peak_n.append(p.get('domNodes', 0))
            pts = [(0 if c == 'base' else int(c[3:]), x) for c, x in byc.items() if c == 'base' or re.fullmatch(r'ret\d+', c)]
            if len(pts) >= 3:
                lb_r.append(slope(pts, 'fp_rendererMB')); lb_n.append(slope(pts, 'fpTotalMB'))
                lb_d.append(slope(pts, 'jsHeapUsedMB')); lb_x.append(slope(pts, 'domNodes'))
        out.append(f'<tr><td class=l>{esc(label)}</td><td class=l>{esc(flow)}</td><td>{len(runs)}</td><td>{mean_sd(peak_r)}</td>'
                   f'<td>{mean_sd(peak_t)}</td><td>{mean_sd(peak_n)}</td><td>{mean_sd(lb_r, 1)}</td><td>{mean_sd(lb_n, 1)}</td>'
                   f'<td>{mean_sd(lb_d, 1)}</td><td>{mean_sd(lb_x)}</td></tr>')
    out.append('</table>')
    if errs:
        out.append('<h2>Runs with page errors or failures</h2><ul>')
        for e in errs[-10:]:
            out.append(f'<li>{esc(e.get("label"))} {esc(e.get("flow"))} run {esc(e.get("run"))}: '
                       f'{esc(e.get("failed") or "")} {esc("; ".join((e.get("pageErrors") or [])[:2]))}</li>')
        out.append('</ul>')
    (HERE / 'status' / 'index.html').write_text('\n'.join(out))


if __name__ == '__main__':
    build()
    while '--loop' in sys.argv:
        time.sleep(20)
        try:
            build()
        except Exception as e:
            print('status error', e, file=sys.stderr)
