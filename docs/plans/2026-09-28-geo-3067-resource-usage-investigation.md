# GEO-3067: resource usage investigation

Status: working notes, 2026-09-28. Branch `bryan/geo-3067-investigate-memory-leaks-high-resource-usage-causing-user`.

## Summary

The user's full-machine freezes were not reproduced. Benchmarking production and local dev found
three problems that plausibly explain "slow and worse than ever", and one that plausibly explains a
freeze under screen-share load:

| # | Finding | Severity | Fix on this branch |
|---|---|---|---|
| 1 | Full-screen debate feed keeps every visited debate's two `<video>` elements loaded | High, likely crash/freeze path | Yes, measured 26 to 6 videos |
| 2 | Space pages with a ranking block fire ~470 GraphQL requests per visit, for every visitor | High, API load for everyone | Yes, measured -71% |
| 3 | Debates hub People tab refetches ~110 times/min while idle, signed in | Medium-high, grows with online users | Yes, not yet measured |
| 4 | Per-row queries that don't batch (`PropertiesBatch` with `[]`, claim response counts) | Medium | Partly |
| 5 | GraphQL API serves HTTP/1.1 only, so fan-outs queue 6 at a time | Medium | No, infra |

Nothing here is a classic JS heap leak: a 27-navigation soak retained ~0.8 MB per navigation with
flat listener and DOM counts.

## Method

- Production (`www.geobrowser.io`), headless Chromium via Playwright + CDP, signed out and signed in
  (manual Privy login saved as Playwright storage state).
- Per route: navigation timings, long tasks/TBT, request counts by endpoint and GraphQL
  `operationName`, JS heap / DOM nodes / listeners every 5s over a 30-60s idle soak.
- Navigation soak: 3 rounds over 9 routes in one tab, forced GC after each hop.
- Debate feed: scroll the snap container one card at a time, count `<video>` elements, `readyState`,
  buffered seconds, renderer process RSS.
- Local dev (`localhost:3000`) in real Chrome (Claude in Chrome) and Playwright to confirm and to
  verify fixes.
- A code audit of the ~110 commits merged since 2026-09-18.

Harness scripts (not in the repo): `bench.mjs` (per-route), `soak.mjs` (navigation leak),
`probe3.mjs` (scroll/video/RSS), `gqlvars.mjs` (GraphQL by operation and variables),
`visibility.mjs` (tab-switch fan-out).

## 1. Debate feed never releases video (High)

**Where:** `core/debates/browse/debate-feed.tsx` (`DebateFeed`, used by the space Debates tab and
every Debate entity page).

**Mechanism:** the feed only appends cards (`visibleCount` grows), every card renders
`DebateFeedPlayer`, and `useDebatePlayback` keeps a card's signed URLs after it deactivates. Every
card the viewer has passed keeps two `<video src>` elements at `readyState 4`.

**Proof:**

| Run | After scrolling | `<video>` with src | Offscreen at readyState 4 | Other |
|---|---|---|---|---|
| Prod, signed out | 30 debates | 56 | n/a | DOM 5k to 24k |
| Prod, signed in | 10-20 debates | 44 | 26 of 28 (sample) | renderer RSS 685 MB to ~1 GB, never released |
| Local dev, real Chrome, before fix | 12 scrolls | 26 | 22, ~204s buffered | |
| Local dev, Playwright, after fix | 12 scrolls | 6 (constant from scroll 1) | 0 | |

**History:**
- `7b2ac09bb` feat: debate feed (#2021), 2026-07-20: introduced the retention (append-only list,
  always-mounted player, URLs never cleared on deactivate).
- `52329fd16` fix: release offscreen debate media resources (#2463, GEO-2963), 2026-09-18: found this
  exact crash on mobile Chrome and fixed it for Explore cards only (`useNearViewport` +
  `releaseVideo`). `DebateFeed` never got it.
- Minor amplifiers: `d81df7911` (#2430) preloads the next card; `76004d025` (#2546) raises a failed
  recording to `preload="auto"` permanently (1 of 28 retained videos in the sample).
- `9aff907c6` (#2429) was suspected but did not introduce retention; its diff shows the old code
  also kept URLs on deactivate.

**Link to the report:** decoded video lives outside the JS heap (GPU and media buffers; unified
memory on Apple Silicon). Two dozen loaded decoders plus a Google Meet screen-share encode is a
plausible system-wide pressure path. Unconfirmed without the user's machine and page history.

**Fix (done):** `DebateFeedPlayer` takes `releaseMedia`; the feed passes it for every card more than
one away from the active card. The URLs stay in state, so coming back re-attaches without new URL
requests (keeps GEO-2895's no-flicker behavior), and the existing `releaseVideo` cleanup runs on the
`src` change. Tiles have a fixed aspect ratio, so layout does not move. Tests:
`debate-feed-player.test.tsx` (release and re-attach), `debate-feed.test.tsx` (window).

## 2. Ranking block fan-out on space pages (High)

**Where:** `/space/41e851610e13a19441c4d980f2f2ce6b` (AI space) and any space whose ranking has
entries that don't resolve.

**Proof (prod):**

| | Signed out | Signed in |
|---|---|---|
| Fetches on load | 592 | 674 |
| GraphQL | 472 | |
| `EntityBacklinksPage` | 205 (205 distinct ids) | |
| `EntitiesBatch` | 88 | |
| `proposalsCurrentsConnection` / `proposalActionsConnection` | ~42 / ~40 | |
| `profile/batch` | 43 | |
| GraphQL latency | p50 607 ms, p90 2.1 s, max 3.5 s (vs p50 ~250 ms elsewhere) | |

Re-fires on every revisit (30s staleTime): +150-175 requests per return in the soak.

**Chain:** `use-ranking-block-state` seeds pending candidates with every unnamed global entry, so
`useRankingPendingEntities` runs for every visitor → `fetchRankingPendingEntities` pages
`fetchProposalsByUser` for every submitter (3 requests per page) → `fetchProposalDiffs` for each open
proposal → `Diff.postProcessDiffs` → one `getEntityBacklinks` per orphan block
(`core/utils/diff/diff.ts:318`, `:387`) and one `getBatchEntities` per diff. The ranking only reads
entity id, name and description from the result. Introduced with `5be0fc498` (#1926).

**Fix (done).** Measured on local dev against `testnet-api-v2`, signed out, same page, two loads each:

| | GraphQL + `profile/batch` | `EntityBacklinksPage` | `EntitiesBatch` | `profile/batch` |
|---|---|---|---|---|
| master (`421635463`) | 566-573 | 239 | 93-94 | 43 |
| this branch | 162-167 | 0 | 50-51 | 0 |

Changes:
- `use-ranking-block-state.ts` now picks candidates with `selectRankingBlockPendingCandidates`
  (`ranking-pending-proposal-entries.ts`): only rows the block renders. Global placeholders are
  hidden from the leaderboard, so they are no longer looked up. Signed-out visitors and viewers with
  nothing unresolved get no candidates, and the query stays disabled.
- Proposers: the viewer and the shared-ranking author first, other submitters only when a rendered
  row is unresolved, capped at 10 (`MAX_PENDING_PROPOSERS`).
- `fetchRankingPendingEntities` diffs only "Create new" proposals (name contains ` - Create new - `),
  at most 10 per call, with `fetchProposalDiffs(..., { postProcess: false, signal })` (no backlinks or
  entity batches) and `fetchProposalsByUser({ includeProfiles: false })` (no `profile/batch`).
- The compose screen's "Show pending" disclosure is unchanged and now cheaper per proposer.
- Tests: `fetch-ranking-pending-proposals.test.ts` (new), `ranking-pending-proposal-entries.test.ts`.

Not reproducible on local dev as configured: the worktree `.env` points at `api-testnet.geobrowser.io`,
production at `testnet-api-v2.geobrowser.io`; locally the page made 62 requests.

## 3. People tab refetch storm (Medium-high)

**Proof (prod, signed in, 60s idle):**

| Route | Requests on load | Idle requests/min |
|---|---|---|
| Hub, People tab | 207 | ~75-110 |
| Hub, Lobby tab | 221 | 18 |
| `/explore` | 142 | 21 |

People tab idle minute: `ParticipantPositions` 32, `matchmaking/people` 17, `matchmaking/matches` 17,
`debate-claims` 16, driven by ~120 websocket frames/min from other users' activity. Every user with
the hub open adds this load, and events scale with users online.

**Mechanism (`core/debates/debate-gateway.ts`):** every `claims_changed` invalidates every
participant-positions query regardless of space; the flush cancels in-flight queries, so the paged
(500/page) positions fetch restarts from offset 0; `matchmaking_changed` refetches people/matches
with a 50ms coalesce. On `/explore`, each claim card holds the matchmaking scope through
`useClaimMatchup`, though the gateway documents that scope as hub-only.

**Fix (done, not yet measured):** in `debate-gateway.ts`
- Participant positions: one space-agnostic invalidation per `claims_changed`, throttled to 10s
  (leading + trailing), and no longer cancelled mid-read, so the paged fetch completes.
- `matchmaking_changed`: per-section throttle (people 5s, matches and claims 10s). READY and
  reconcile refreshes stay immediate.
- `useMatchmakingMatches(enabled, { live: false })` for claim cards (`use-claim-matchup.ts`): no
  matchmaking scope outside the hub; a 30s poll while visible plus refetch on focus instead.

Estimated: People tab ~110 to ~40-50 requests/min; plain `/explore` matches ~12/min to ~2/min.
Trade-off: event-driven updates can lag up to 5-10s (the positions poll already allowed 20s).
Since #2606/#2614 the People tab also includes offline schedulable people in the positions roster,
so each positions read is larger and avoiding restarts matters more.

**Not settled:** the audit suspects each tab visibility flip fans out to other users' clients. A
single-account test showed no effect, but geo-chat may not echo to the same user; needs two accounts.

## 4. Per-row queries that don't batch (Medium)

- `PropertiesBatch` fired ~13 times on a space page, including with `{"ids":[]}`; keys were built
  from unsorted ids. **Fixed:** `useQueryProperties` skips empty lists (without reporting loading)
  and keys on sorted unique ids; `getProperties([])` answers without a request. Test:
  `core/sync/use-query-properties.test.tsx`.
- Claim pages send ~20 `EntityResponseCounts` + ~18 `EntityResponders`, one per row.
  `ClaimResponseBatchBoundary` still exists but nothing renders it since `62522c8ae` (#2529).
  **Not done:** re-adding it needs response kinds up front and a per-target opt-out, or rows outside
  the batch never load.
- Most of the 88 `EntitiesBatch` calls on the AI space come from `diff.ts` in finding 2. The
  hydrate batcher's zero-delay window is deliberate (see its comment); left alone pending a
  measurement after finding 2 is fixed.

## 5. Not addressable in this branch

- **HTTP/1.1 API.** `testnet-api-v2.geobrowser.io` (envoy) negotiates HTTP/1.1 only, so the browser
  runs 6 requests at a time per origin. Enabling HTTP/2 at the proxy is likely the cheapest global win.
- **Bundle weight.** Every route ships ~3.1 MB JS transferred (~10 MB decoded, ~115 files) and makes
  36 requests to `auth.privy.io`. `/root` has a ~1s long task (TBT ~1.1s).
- **Relation drain (ticket suspect).** `useQueryAllEntities` (`7c3b1228f`, 2026-09-21) has no callers.
  `getEntity`'s relation drain dates to June (#1883), and `EntitiesBatch` has selected up to 1000
  relations twice per entity since `6aa1fae17` (#2254, 2026-08-27). The client sync store has no
  eviction path, but measured retention is small (finding in Summary).

## Checked and cleared

- No render loops, runaway intervals, leaked listeners or reconnect loops in commits since 09-18
  (sticky entity header #2581, the exhaustive-deps series #2485-#2502, analytics, profile commits).
- Idle CPU is low on every route (worst: debate page ~2.3s script per idle minute).
- Server TTFB 0.1-0.4s.

## Open questions for the user report

- Browser, OS, RAM; how many Geo tabs and for how long.
- Whether they were on the Debates tab or a Debate page before the freeze (points at finding 1).

## Pre/post comparison (2026-09-30)

Local dev server against `testnet-api-v2` and `chat-api-testnet`, signed out, headless Chromium,
master `4beed4acc` vs this branch (`35b45cc6a`), 2 runs each. Dev mode inflates absolute timings
equally on both sides.

| Scenario | Metric | master | branch | Change |
|---|---|---|---|---|
| AI space load | GraphQL requests | 416, 415 | 172, 171 | -59% |
| | `EntityBacklinksPage` / `profile/batch` | 97 / 44 | 0 / 3 | |
| | All requests | 762, 775 | 511, 506 | -34% |
| | Blocking time (ms) | 2661, 1816 | 2373, 1206 | -20% |
| | Empty `PropertiesBatch` | 1 | 0 | |
| Debate feed, 12 scrolls | Loaded `<video>` elements | 28, 28 | 6, 6 | -79% |
| | GraphQL requests | 193, 194 | 193, 196 | same |
| Claim page, entity page | Requests, GraphQL | unchanged | unchanged | |
| Explore idle 60s | Heap after forced GC | 118 MB | 118-121 MB | same |

- Renderer RSS in headless Chromium is noisy (500-960 MB on both sides) and does not show the video
  saving at 12 scrolls: headless decodes little at `preload="metadata"`. The saving is in live media
  elements; device memory needs a phone or headed-browser measurement.
- Media requests per scroll rose ~5 to ~6.5: each recording is fetched only while next or active,
  released recordings never refetch; the extra are playback range reads.
- Autoplay: 8 landings (4 down, 4 up) all autoplay on the branch; scrolling back resumes from the
  prior position, including released cards.
- Signed-in People tab idle (real Chrome, back to back): branch 59 req/min over 74s, master 28 req/min
  over 65s. Not comparable: the branch window saw ~12 claim events (`debate-claims` refetches) and
  master's saw none. Idle rate is driven by other users' activity; a fair comparison needs a
  replayed or synthetic event stream. The throttle itself is covered by `debate-gateway.test.ts`.
  Under ~12 events, the branch refetched `matchmaking/people` 5x and `matches` 4x in 74s, against
  17/min each in production before the change.
- Screens checked by eye on the branch: debate feed (initial, after 4 down, back to first), anchored
  Debate page (before and after scrolling away), AI space overview, claim page, entity page,
  Explore, hub People, Lobby and Positions tabs. The Next dev overlay issue counts (12 on the space
  overview, ~94 signed in) match master.
