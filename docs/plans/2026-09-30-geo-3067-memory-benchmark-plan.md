# GEO-3067: memory benchmark plan (before vs after)

Goal: an empirical, averaged before/after of client memory for the lean fix branch
`bryan/geo-3067-release-debate-feed-media` (2 commits) against its base, master `b4ba180e6`.

## What changes, so what to measure

| Change | Expected effect | Where it shows |
|---|---|---|
| Debate feed releases `<video>` outside [active-1, active+2] | Loaded videos stay ~8 instead of +2 per debate passed; decoder and buffered media freed (since #2670 those buffers are `preload="auto"`) | Tab memory footprint, GPU process memory, `video[src]` count, buffered seconds |
| Analytics queue capped at 1000 | Bounded only when the analytics script is blocked | JS heap on a long session with the script blocked |

JS heap alone will under-report the video fix: decoded frames and media buffers live outside the
JS heap (renderer media memory and the GPU process). The primary metric is Chrome's per-process
memory footprint.

## Setup (same for both builds)

1. **Production builds, not dev.** Dev mode doubles effects and ships unminified code, which inflates
   memory unevenly. For each build, from `apps/web`:
   `DISABLE_SENTRY=1 NEXT_PUBLIC_API_ENDPOINT_TESTNET=https://testnet-api-v2.geobrowser.io/graphql NEXT_PUBLIC_GEO_CHAT_API_BASE_URL=https://chat-api-testnet.geobrowser.io bun run build && bun run start`
   (port 3000 for both, so the signed-in localhost session carries over). `DISABLE_SENTRY=1` skips
   source-map upload.
2. **Order:** build and measure master, then the branch, back to back within one sitting to limit
   testnet data drift. If time allows, repeat the first block at the end (A-B-A) to check drift.
3. **Browser:** the signed-in Chrome, one window, only the benchmark tab open, window in front and
   not minimised (hidden tabs pause video and observers). Close DevTools during runs (it holds
   memory). Same window size every run.
4. **Fresh tab per run.** Close the tab and open a new one, so no run inherits the last one's memory.
5. **Readings:** at each checkpoint, (a) the page metrics script below via Claude in Chrome, and
   (b) Chrome Task Manager (Window > Task Manager, columns: Memory footprint, JavaScript memory):
   the tab's row and the "GPU Process" row. Task Manager is manual: Bryan reads it, or takes a
   screenshot of it, at each checkpoint.

Page metrics script (read-only, run at each checkpoint):

```js
(() => {
  const v = [...document.querySelectorAll('video')];
  const buffered = v.reduce((a, x) => a + (x.buffered.length ? x.buffered.end(x.buffered.length - 1) : 0), 0);
  return JSON.stringify({
    jsHeapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1),
    domNodes: document.getElementsByTagName('*').length,
    videos: v.length,
    videosWithSrc: v.filter(x => x.getAttribute('src')).length,
    videosLoaded: v.filter(x => x.readyState >= 3).length,
    preloadAuto: v.filter(x => x.preload === 'auto').length,
    bufferedSec: Math.round(buffered),
  });
})()
```

## Scenarios (5 runs each, per build)

**S1. Debate feed deep scroll (primary).** `/space/41e851610e13a19441c4d980f2f2ce6b/debates`.
Wait 10s. Advance one card every 5s (ArrowDown or scroll one card), 20 cards, then 5 back up.
Checkpoints: after load, after 10 cards, after 20 cards, after returning 5, and 60s idle after that.

**S2. Debate page, anchored.** `/space/41e851610e13a19441c4d980f2f2ce6b/01a0d3c42b077233b4ea03639c494e2c`.
Wait 10s, advance 10 cards, return to the first. Checkpoints: load, after 10, after return.

**S3. Long mixed session (realistic).** Explore (scroll 2 minutes) > AI space overview > Debates
tab (15 cards) > a claim page > back to Explore. One checkpoint at the end; 3 runs is enough.

**S4. Control: Explore only.** `/explore`, scroll 2 minutes. Expected unchanged; confirms the
harness is not biased between builds.

**S5. Analytics blocked (queue cap).** DevTools > Network request blocking for
`geo-analytics-*.js`, then S3. Compare JS heap at the end. Small expected effect; run 3 times.

Optional stress (closest to the report): S1 while sharing the screen in Google Meet, reading the
GPU Process footprint.

## Reporting

- For each scenario, checkpoint and metric: mean and standard deviation over the runs, before and after,
  and the change in %. Treat a change as real when the ranges (mean ± 1 SD) don't overlap.
- Headline numbers: S1 at 20 cards, tab memory footprint plus GPU process footprint; `videosWithSrc`
  and `bufferedSec` as the mechanism evidence.
- Keep raw readings in a table (one row per run) alongside the averages.

## Automated backup

The headless harness (`compare.mjs`) covers request counts and loaded videos signed out, but its
renderer RSS was too noisy to show the saving (headless decodes little). Use it only as a
cross-check, not for the headline memory number.
