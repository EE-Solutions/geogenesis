# GEO-3067: memory benchmark results (2026-09-30)

Master `b4ba180e6` vs `bryan/geo-3067-release-debate-feed-media` (`f3d8e02cd`: release feed videos,
cap the analytics queue). Production builds (`next build` + `next start`, `DISABLE_SENTRY=1`) against
testnet-api-v2 and chat-api-testnet. Google Chrome headless via Playwright, signed out, fresh browser
per run, forced GC before every reading, macOS `footprint` summed over the browser's process tree.
Master ran 18:01-19:23, branch 19:40-20:48 (same machine).

## Headline

- The fix does what it is built to do: loaded `<video>` elements -69% to -83% and buffered video
  -71% to -88% in every debate scenario, all separated beyond 1 SD.
- That only partly shows up as total memory on desktop headless Chrome: S1 (20 debates) renderer
  -6% (901 -> 849 MB, separated), total -5% (not separated); after 60s idle renderer -9%
  (771 -> 699 MB, separated), total -9%. S2 (Debate page, 10 debates) shows no total change.
- Mixed sessions (S3, S5) show no total saving; GPU footprint was higher on the branch
  (+41% S3, +20% S5). Data drift between the two halves is visible in the control (S4: Explore
  card set differed, 6 vs 8 videos, 51k vs 48k DOM nodes), so these are not clean comparisons.
- The largest memory driver measured is not video: it is mounted feed content. Explore alone grows
  from ~855 MB to ~1,380 MB and from ~7k to ~50k DOM nodes in 2 minutes of scrolling (both builds);
  a mixed session ends at ~1.5 GB with 60-70k DOM nodes.

## Interpretation

- Headless desktop Chrome decodes in software and keeps little per paused element, so 38 fewer
  loaded videos is worth ~50-100 MB here. On devices with hardware decoders and per-tab media
  limits (the GEO-2963 mobile crash), the element count is what matters; this run can't show that.
- To reduce memory on desktop materially, the next change is to unmount (or virtualize) feed cards
  far from the viewport in Explore and the debate feed: the DOM/JS growth is the bulk of the
  1.3-1.6 GB footprints.
- S3/S5 GPU increase needs an interleaved re-run (alternate master/branch per run) before reading
  anything into it.

## Full tables


### S1: Debate feed: 20 down, 5 back, 60s idle

| Checkpoint | Metric | master | branch | Change | Separated |
|---|---|---|---|---|---|
| load | Chrome total footprint (MB) | 990 ± 19 (n=5) | 974 ± 17 (n=5) | -2% | no |
| load | Renderer footprint (MB) | 578 ± 18 (n=5) | 561 ± 17 (n=5) | -3% | no |
| load | GPU process footprint (MB) | 186 ± 2 (n=5) | 187 ± 3 (n=5) | +0% | no |
| load | JS heap after GC (MB) | 46 ± 0 (n=5) | 47 ± 1 (n=5) | +2% | no |
| load | DOM nodes | 5378 ± 3 (n=5) | 5388 ± 14 (n=5) | +0% | no |
| load | <video> with src | 6 ± 0 (n=5) | 6 ± 0 (n=5) | +0% | no |
| load | Buffered video (s) | 116 ± 5 (n=5) | 116 ± 18 (n=5) | +0% | no |
| after10 | Chrome total footprint (MB) | 1239 ± 11 (n=5) | 1243 ± 50 (n=5) | +0% | no |
| after10 | Renderer footprint (MB) | 740 ± 9 (n=5) | 745 ± 28 (n=5) | +1% | no |
| after10 | GPU process footprint (MB) | 287 ± 4 (n=5) | 280 ± 25 (n=5) | -3% | no |
| after10 | JS heap after GC (MB) | 63 ± 0 (n=5) | 62 ± 0 (n=5) | -1% | yes |
| after10 | DOM nodes | 13481 ± 1 (n=5) | 13511 ± 12 (n=5) | +0% | yes |
| after10 | <video> with src | 26 ± 0 (n=5) | 8 ± 0 (n=5) | -69% | yes |
| after10 | Buffered video (s) | 606 ± 7 (n=5) | 141 ± 38 (n=5) | -77% | yes |
| after20 | Chrome total footprint (MB) | 1525 ± 58 (n=5) | 1453 ± 65 (n=5) | -5% | no |
| after20 | Renderer footprint (MB) | 901 ± 18 (n=5) | 849 ± 33 (n=5) | -6% | yes |
| after20 | GPU process footprint (MB) | 406 ± 52 (n=5) | 385 ± 33 (n=5) | -5% | no |
| after20 | JS heap after GC (MB) | 77 ± 0 (n=5) | 77 ± 0 (n=5) | -0% | no |
| after20 | DOM nodes | 21445 ± 1 (n=5) | 21514 ± 17 (n=5) | +0% | yes |
| after20 | <video> with src | 46 ± 0 (n=5) | 8 ± 0 (n=5) | -83% | yes |
| after20 | Buffered video (s) | 1081 ± 29 (n=5) | 128 ± 53 (n=5) | -88% | yes |
| back5 | Chrome total footprint (MB) | 1412 ± 13 (n=5) | 1372 ± 74 (n=5) | -3% | no |
| back5 | Renderer footprint (MB) | 902 ± 57 (n=5) | 825 ± 37 (n=5) | -9% | no |
| back5 | GPU process footprint (MB) | 286 ± 47 (n=5) | 324 ± 42 (n=5) | +13% | no |
| back5 | JS heap after GC (MB) | 75 ± 2 (n=5) | 76 ± 1 (n=5) | +1% | no |
| back5 | DOM nodes | 21454 ± 8 (n=5) | 23064 ± 9 (n=5) | +8% | yes |
| back5 | <video> with src | 46 ± 0 (n=5) | 8 ± 0 (n=5) | -83% | yes |
| back5 | Buffered video (s) | 1112 ± 28 (n=5) | 155 ± 28 (n=5) | -86% | yes |
| idle60 | Chrome total footprint (MB) | 1204 ± 43 (n=5) | 1090 ± 76 (n=5) | -9% | no |
| idle60 | Renderer footprint (MB) | 771 ± 34 (n=5) | 699 ± 37 (n=5) | -9% | yes |
| idle60 | GPU process footprint (MB) | 222 ± 10 (n=5) | 187 ± 42 (n=5) | -16% | no |
| idle60 | JS heap after GC (MB) | 77 ± 1 (n=5) | 76 ± 2 (n=5) | -1% | no |
| idle60 | DOM nodes | 21621 ± 10 (n=5) | 23220 ± 9 (n=5) | +7% | yes |
| idle60 | <video> with src | 46 ± 0 (n=5) | 8 ± 0 (n=5) | -83% | yes |
| idle60 | Buffered video (s) | 1222 ± 73 (n=5) | 295 ± 7 (n=5) | -76% | yes |

### S2: Debate page: 10 down, back

| Checkpoint | Metric | master | branch | Change | Separated |
|---|---|---|---|---|---|
| load | Chrome total footprint (MB) | 967 ± 9 (n=5) | 974 ± 15 (n=5) | +1% | no |
| load | Renderer footprint (MB) | 539 ± 14 (n=5) | 538 ± 11 (n=5) | -0% | no |
| load | GPU process footprint (MB) | 202 ± 20 (n=5) | 209 ± 10 (n=5) | +4% | no |
| load | JS heap after GC (MB) | 42 ± 1 (n=5) | 42 ± 1 (n=5) | -0% | no |
| load | DOM nodes | 5330 ± 15 (n=5) | 5325 ± 4 (n=5) | -0% | no |
| load | <video> with src | 6 ± 0 (n=5) | 6 ± 0 (n=5) | +0% | no |
| load | Buffered video (s) | 115 ± 7 (n=5) | 112 ± 11 (n=5) | -3% | no |
| after10 | Chrome total footprint (MB) | 1233 ± 33 (n=5) | 1251 ± 9 (n=5) | +1% | no |
| after10 | Renderer footprint (MB) | 730 ± 26 (n=5) | 739 ± 5 (n=5) | +1% | no |
| after10 | GPU process footprint (MB) | 286 ± 7 (n=5) | 293 ± 9 (n=5) | +3% | no |
| after10 | JS heap after GC (MB) | 60 ± 1 (n=5) | 59 ± 0 (n=5) | -2% | no |
| after10 | DOM nodes | 13516 ± 41 (n=5) | 13529 ± 38 (n=5) | +0% | no |
| after10 | <video> with src | 26 ± 0 (n=5) | 8 ± 0 (n=5) | -69% | yes |
| after10 | Buffered video (s) | 590 ± 31 (n=5) | 160 ± 3 (n=5) | -73% | yes |
| return | Chrome total footprint (MB) | 1288 ± 98 (n=5) | 1265 ± 8 (n=5) | -2% | no |
| return | Renderer footprint (MB) | 766 ± 63 (n=5) | 745 ± 10 (n=5) | -3% | no |
| return | GPU process footprint (MB) | 301 ± 40 (n=5) | 298 ± 5 (n=5) | -1% | no |
| return | JS heap after GC (MB) | 61 ± 2 (n=5) | 64 ± 1 (n=5) | +5% | yes |
| return | DOM nodes | 13548 ± 76 (n=5) | 16417 ± 44 (n=5) | +21% | yes |
| return | <video> with src | 26 ± 0 (n=5) | 6 ± 0 (n=5) | -77% | yes |
| return | Buffered video (s) | 637 ± 29 (n=5) | 188 ± 5 (n=5) | -71% | yes |

### S3: Mixed session (Explore, space, 15 debates, claim)

| Checkpoint | Metric | master | branch | Change | Separated |
|---|---|---|---|---|---|
| end | Chrome total footprint (MB) | 1542 ± 59 (n=3) | 1648 ± 59 (n=3) | +7% | no |
| end | Renderer footprint (MB) | 1045 ± 51 (n=3) | 1040 ± 45 (n=3) | -0% | no |
| end | GPU process footprint (MB) | 273 ± 12 (n=3) | 385 ± 18 (n=3) | +41% | yes |
| end | JS heap after GC (MB) | 145 ± 1 (n=3) | 132 ± 1 (n=3) | -9% | yes |
| end | DOM nodes | 71308 ± 360 (n=3) | 62521 ± 112 (n=3) | -12% | yes |
| end | <video> with src | 4 ± 0 (n=3) | 4 ± 0 (n=3) | +0% | no |
| end | Buffered video (s) | 81 ± 1 (n=3) | 80 ± 0 (n=3) | -1% | yes |

### S4: Control: Explore only

| Checkpoint | Metric | master | branch | Change | Separated |
|---|---|---|---|---|---|
| load | Chrome total footprint (MB) | 857 ± 14 (n=3) | 856 ± 4 (n=3) | -0% | no |
| load | Renderer footprint (MB) | 476 ± 12 (n=3) | 480 ± 7 (n=3) | +1% | no |
| load | GPU process footprint (MB) | 169 ± 2 (n=3) | 168 ± 2 (n=3) | -1% | no |
| load | JS heap after GC (MB) | 52 ± 1 (n=3) | 51 ± 1 (n=3) | -2% | no |
| load | DOM nodes | 6959 ± 19 (n=3) | 6973 ± 21 (n=3) | +0% | no |
| load | <video> with src | 4 ± 0 (n=3) | 4 ± 0 (n=3) | +0% | no |
| load | Buffered video (s) | 78 ± 2 (n=3) | 76 ± 5 (n=3) | -3% | no |
| end | Chrome total footprint (MB) | 1390 ± 32 (n=3) | 1372 ± 17 (n=3) | -1% | no |
| end | Renderer footprint (MB) | 917 ± 28 (n=3) | 935 ± 16 (n=3) | +2% | no |
| end | GPU process footprint (MB) | 247 ± 1 (n=3) | 221 ± 0 (n=3) | -11% | yes |
| end | JS heap after GC (MB) | 134 ± 4 (n=3) | 114 ± 1 (n=3) | -15% | yes |
| end | DOM nodes | 50980 ± 19 (n=3) | 48371 ± 21 (n=3) | -5% | yes |
| end | <video> with src | 6 ± 0 (n=3) | 8 ± 0 (n=3) | +33% | yes |
| end | Buffered video (s) | 69 ± 2 (n=3) | 48 ± 1 (n=3) | -30% | yes |

### S5: Mixed session, analytics script blocked

| Checkpoint | Metric | master | branch | Change | Separated |
|---|---|---|---|---|---|
| end | Chrome total footprint (MB) | 1430 ± 28 (n=3) | 1526 ± 17 (n=3) | +7% | yes |
| end | Renderer footprint (MB) | 873 ± 9 (n=3) | 924 ± 18 (n=3) | +6% | yes |
| end | GPU process footprint (MB) | 328 ± 43 (n=3) | 393 ± 1 (n=3) | +20% | yes |
| end | JS heap after GC (MB) | 131 ± 0 (n=3) | 117 ± 0 (n=3) | -11% | yes |
| end | DOM nodes | 20385 ± 585 (n=3) | 17035 ± 251 (n=3) | -16% | yes |
| end | <video> with src | 4 ± 0 (n=3) | 4 ± 0 (n=3) | +0% | no |
| end | Buffered video (s) | 78 ± 1 (n=3) | 78 ± 2 (n=3) | -0% | no |
