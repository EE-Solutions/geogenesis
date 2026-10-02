# Feed memory and request fan-out: results

Plan: `2026-10-01-feed-and-fanout-8020-plan.md`. Branch `feed-memory` (local, not pushed), from master
`6e5dee631`.

## Summary: master vs branch (`6e5dee631` → `20bf37e7d`)

One comparison of master against the branch head, 4 runs each per flow. `**` = significant.

| | Explore | Relationships space | Space tabs tour | AI space | Claim page |
|---|---|---|---|---|---|
| Peak JS heap | -10% (n.s.) | **95 → 53 MB (-45%)** | **97 → 77 MB (-20%)** | -2% (n.s.) | 0% |
| Peak page elements | -9% (n.s.) | **-36%** | **12.6k → 6.5k (-49%)** | -9% (n.s.) | -2% |
| Peak on-page elements | **4,710 → 1,473 (-69%)** | **-59%** | **-49%** | -9% (n.s.) | 0% |
| Elements kept after leaving | **19.3k → 9.7k (-50%)** | **11.6k → 5.5k (-53%)** | 0% | -3% | -1% |
| JS heap kept after leaving | -9% (n.s.) | **-19%** | -1% | -1% | +2% |
| Query cache entries | -2% | **-33%** | **-7%** | -7% (n.s.) | -4% |
| Requests per visit | +2% (n.s.) | -6% (n.s.) | **955 → 530 (-45%)** | **542 → 417 (-23%)** | **120 → 100 (-17%)** |
| Process memory (total / renderer / GPU) | n.s. (see below) | -4% / -7% / -1% (n.s.) | n.s. | n.s. | n.s. |

**What this means:**
- What the page holds (DOM, JS heap, cache) dropped by a third to two thirds on the feed pages, and
  per-item request fan-out is gone on the space, tabs and claim pages (-17% to -45% requests).
- Chrome's process memory did not move measurably anywhere. It is noisy here (±100-500 MB at peak
  with 4 builds' browsers sharing the machine), so effects under ~100-200 MB can't be seen this way.
- **Open question:** on Explore, renderer memory kept after leaving read higher on the branch in two
  comparisons (+17% step 2 vs 1, +31% master vs branch; p = 0.69 and 0.06), and the renderer's total
  element count barely fell although on-page elements fell by two thirds. Unmounted cards' nodes look
  like they are still retained after GC. Needs a heap snapshot (retainers of detached card nodes)
  and a sequential footprint measurement before any claim about process memory on Explore.

## How these were measured

Production builds of consecutive commits, served side by side (A on :3000, B on :3001 with the browser
mapped so the page origin stays `http://localhost:3000`, which geo-chat's CORS and Privy require).
Headless Chrome, signed out, 4 runs per build per flow, runs alternated between builds, 4 at a time.
Each run: neutral page, then 3 visits to the flow through client-side navigation with a return to
the neutral page after each. Numbers are means; `**` = p < 0.05 and the change exceeds its 95% CI.

- **peak**: first visit, at its heaviest point.
- **kept after 1st visit**: neutral page after the first visit minus before it.
- Process memory (total/renderer/GPU footprint) is noisy run to run (±100-450 MB at peak); page
  elements, JS heap and cache counts are the precise measures.

Harness fixes made on the way (they changed earlier conclusions):
- Port 3001 failed every geo-chat request (CORS allows only `localhost:3000`), so debates never
  loaded on the B side. The first step 1 comparison was invalid and was rerun with the origin mapping;
  an A/A run (master vs master) through the mapping showed no differences.
- The detached-node count (`DOM.getDetachedDomNodes`) kept the nodes it reported alive; removed.
- Requests cancelled by navigation no longer count as network failures.

## Step 1: fetch the next feed page ~2 screens ahead, not ~8 (`3790aead9`)

| | Explore | Relationships space | AI space (no feed, control) |
|---|---|---|---|
| Peak JS heap | 94 → 78 MB (-18%) ** | 97 → 77 MB (-21%) ** | no change |
| Peak on-page elements | 5,378 → 4,156 (-23%) ** | 4,496 → 3,500 (-22%) ** | no change |
| Elements kept after leaving | 20,367 → 17,262 (-15%) ** | 13,865 → 11,220 (-19%) ** | no change |
| Query cache entries | -17% (not significant) | 772 → 638 (-17%) ** | no change |
| Process memory | within noise | within noise | within noise |

Kept. Recording players also preload metadata only (no measurable effect in Chrome, which already
defaults to metadata).

## Step 2: far-away feed cards render as a box of their height (`502e1e673`)

Compared with step 1.

| | Explore | Relationships space | AI space (control) |
|---|---|---|---|
| Peak JS heap | 81 → 59 MB (-27%) ** | 76 → 63 MB (-17%) ** | no change |
| Peak on-page elements | 4,244 → 1,369 (-68%) ** | 3,498 → 2,214 (-37%) ** | no change |
| Elements kept after leaving | 18,083 → 9,539 (-47%) ** | 11,251 → 7,326 (-35%) ** | no change |
| JS heap added per revisit | 7.8 → 6.3 MB (-18%) ** | no change | no change |
| Peak page elements, all (incl. not yet collected) | -1% (n.s.) | -15% ** | no change |
| Process memory | within noise; GPU -14% (n.s.) | total -5% (p = 0.06) | no change |

Kept. Requests and cache entries are unchanged, as expected (the infinite query still loads the same
pages; cached data survives unmounting). On Explore the renderer's total element count barely moved
even though on-page elements fell by two thirds: unmounted cards' nodes are still held somewhere
after GC. Worth a heap snapshot (React fibers or a listener keeping detached cards) as a follow-up.

## Step 3: batch per-item reads into one request (`ca30a47fa`, `867676f15`)

`EntityResponseCounts`, `EntityCommentCount`, `RelationsByFromEntityId` and `Space` reads made within
10 ms go out as one aliased request (up to 50 items). Compared with step 2.

| Requests per first visit | Before | After | |
|---|---|---|---|
| Space tabs tour (5 tabs + community + activity) | 951 | 528 | -45% ** |
| AI space | 546 | 437 | -20% ** |
| Claim page | 119 | 103 | -14% ** |
| Explore | 565 | 608 | n.s. (scroll-dependent; response counts 37 → 7, spaces 21 → 5) |

| Operation, per first visit | Before | After (batched requests) |
|---|---|---|
| Tabs tour: EntityCommentCount | 238 | 0 (5 `EntityCommentCountBatch`) |
| Tabs tour: EntityResponseCounts | 122 | 1 |
| Tabs tour: RelationsByFromEntityId | 80 | 0 |
| AI space: EntityResponseCounts / EntityCommentCount / RelationsByFromEntityId | 62 / 45 / 18 | 0 / 0 / 0 (9 / 5 / 1 batched) |
| Claim page: EntityResponseCounts | 18 | 2 |

Memory: no change on any flow (expected; this step is about request count, and the data cached
is the same). Settle time: no measurable change.

One AI space visit (of 12 in the batched build) made 51 `EntityBacklinksPage` requests instead of 7;
the other 11 made 7, as did all 36 visits across the earlier comparisons. That operation comes from
the ranking block's pending-proposal lookup (the #2625 path), which this step doesn't touch, so it
is most likely testnet data or timing; noted, not reproduced.

One run was skipped by the pre-run API check (network blip), not by the app.

Kept. The entity batcher's 0 ms window (step 2c in the plan) was left alone: its comment records that
0 ms is deliberate to avoid delaying first paint, and the per-card reads that most needed batching
now go through the new batcher. `EntitiesBatch` is still ~70-140 requests per page; a follow-up
should measure a short window there on its own.

## Behavior checks (scripted, master vs step 3, production builds)

- **Counts are the same.** Debate claims, News and People tabs of the AI space render identical text
  (vote counts, comment counts, responders) and the same number of images on master and the batched
  build (24,494 characters, two rounds on the Debate claims tab).
- **Scroll back works.** Explore scrolled ~27,000 px and back: both builds return to the same card at
  the same scroll position, no empty placeholder is visible once scrolling stops, and the batched
  build keeps 15 cards mounted against master's 88.
- **Analytics.** Card impressions are deduplicated per page view, card, list and position at module
  level (`core/action-context-provider.tsx`), so a card unmounted and remounted by step 2 sends no
  second `component_impression` and keeps its `presentation_instance_id`. Not yet verified in a
  browser with the analytics script loaded.
- Full web suite, `tsc` and ESLint pass on the branch head.

## Worth a manual check before a PR

1. Explore and a topic-home space (e.g. Relationships): scroll far, open a card's menu or responders
   popover, scroll it off screen and back (the card remounts, so open popovers close).
2. A debate card on Explore playing video: scroll it 2,500 px away and back (the player was already
   unmounted at 800 px by GEO-2963; the card shell now goes too).
3. Find-in-page (Cmd+F) on Explore only finds cards near the viewport.
4. Data blocks, ranking views and the claim page: counts and avatars appear as before (batched
   through one request; a failing batch retries item by item).
5. `component_impression` events on Explore: one per card per page view after scrolling down and
   back up.

## Side finding: Amplitude holds removed feed elements, but costs little memory

A heap snapshot after scrolling Explore on the branch (full GC): 1,863 live elements, 1,732 detached
ones still in memory (master: 5,582 live, 677 detached; snapshot 375 MB vs 196 MB on the branch).
Every retained detached element traces to the same holder:
`window → experimentIntegration → eventBridge → … → exposure.unsubscribe → Map` holding elements
with `data-geo-analytics-label`. That is the Amplitude SDK, loaded from `cdn.amplitude.com` by
`public/geo-analytics-*.js` with `amplitudeAutocapture: true` and `amplitudeSessionReplaySampleRate: 1`
(session replay on every session). It never releases elements once they leave the page.

Measured cost (branch build, Amplitude blocked vs not, 4 runs, 3 visits per flow): no significant
difference in JS heap (-2 to -6%), page elements or process memory on Explore, the Relationships space
or the AI space. Blocking it raised request counts (the runtime retries). So it is a real but small
leak in a session of this length; its CPU cost (session replay records every DOM mutation, relevant
to the screen-share freeze report) was not measured. Worth raising with whoever owns the analytics
runtime rather than patching here.
