# Feed memory and request fan-out: 80/20 plan

Two problems from the 2026-10-01 benchmarks, and the smallest changes that should remove most of
each. Every step is measured with the app-wide harness (master vs change, interleaved, 4 runs each,
3 at a time) before the next one starts. Expected effects below are estimates until measured.

## What we measured (master, production build)

| Page | Peak total | Page elements | Requests | Top repeated operations |
|---|---|---|---|---|
| Explore, 60 s scroll | ~1.8 GB (GPU ~520 MB) | ~49k | ~1,050 | EntityResponseCounts 95, EntitiesBatch 91, Spaces 72, Space 38 |
| AI space | ~1.0-1.1 GB | ~12-16k | ~645 | EntityResponseCounts 93, EntitiesBatch 87, EntityBacklinksPage 85 (#2625) |
| Relationships space | ~1.5 GB | ~24k | ~420 | EntityResponseCounts 43, EntitiesBatch 34, Spaces 31 |
| Space tabs tour | ~1.2 GB | ~12k | ~1,030 | EntityCommentCount 238, EntityResponseCounts 160, RelationsByFromEntityId 80 |
| Claim page | ~0.85 GB | ~6k | ~120 | EntityResponseCounts 18, EntityResponders 17 |

Most of the memory is what a page loads and keeps (first visit), not growth per revisit (AI space
revisits add ~4-5 MB JS heap each; tracked separately).

## Problem 1: long feeds keep everything mounted

`EntityFeed` (`partials/feed/entity-feed.tsx`) renders Explore, topic feeds and topic-home spaces.
It fetches pages of 22 while a sentinel is within **8000px** of the viewport (:467-473), appends
them forever and renders every card (:652-662). Each card mounts vote buttons, counts, responders,
avatars and media hooks (`EntityVoteButtons` alone runs ~4 queries). Nothing off-screen unmounts.
The same `ExploreFeedCard` is also used by data-block explore views, the space claims page, person
record feeds and topic coverage.

Existing patterns to reuse: `useNearViewport({ sticky: false })` (reversible, proven on Explore
debate cards, GEO-2963), and `@tanstack/react-virtual` (already a dependency, tables only).

### 1a. Prefetch distance 8000px to ~1500px (one line)
The feed loads roughly 8 screens ahead of the reader. Cutting the margin means only pages the
reader is about to see are fetched, so fewer cards, queries and cache entries exist at any time.
Risk: a short wait at the end of the list on very fast scrolls. Effort: minutes.

### 1b. Far-away cards render as a fixed-height placeholder (main lever)
Wrap each feed card in a reversible near-viewport gate: within ~1.5 screens it renders the real
card; further away it renders an empty `div` at the card's last measured height (ResizeObserver).
That unmounts the card's DOM, images, media and per-card queries while keeping scroll position
stable and window scrolling, back navigation and the infinite query unchanged. Cached data stays in
TanStack Query, so scrolling back renders instantly from cache.

Why not full virtualization: card heights vary a lot (60px rows to tall media cards) and the feed
scrolls the window; a placeholder gate gets most of the DOM saving without a virtualizer, scroll
math or restoration changes. Applied at the `ExploreFeedCard` level, it covers every list that uses
the card.

Expected: Explore peak page elements from ~49k to a bounded number (cards near the viewport only),
with a matching cut in JS heap, decoded images and GPU memory. Effort: ~1 day with tests.
Risks: scroll jump if a card's height changes while placeholdered (use the last measured height,
re-measure on mount); find-in-page and anchor links only see mounted cards.

### 1c. Recording videos on Explore don't preload (one line)
`PublishedRecordingPlayer` renders `<video controls src>` with no `preload`, and community-call
cards are never gated. `preload="metadata"` (or "none" with the poster) stops every recording in
the feed from buffering. Mostly superseded by 1b for far cards; still matters for cards on screen.

### 1d. Later, not in the first pass: full-screen DebateFeed
Cards there are exactly one viewport tall, so unmounting cards outside [active-2, active+3] is the
easiest windowing in the app, but the player holds resume position and pair state in component
state (the #2686 work), so it needs that state hoisted first. Medium effort, separate PR.

## Problem 2: one request per item

Five operations are single-id and fired once per card or row:

| Operation | Variables | Per-item callers |
|---|---|---|
| EntityResponseCounts | one objectId | `EntityVoteButtons` (every feed card and data-block row), `useClaimResponseSummary` (claim cards, claim page) |
| EntityCommentCount | one targetEntityId | `useBlockExploreFeedItem` (data-block explore rows, ranking explore cards) |
| RelationsByFromEntityId | one fromEntityId | `useEntityMedia` / avatar / cover (2 per row in data-block lists, galleries, rankings) |
| Space | one id | `useSpace` per row and chip, `useSpaceDebateSupport` per claim card |
| EntityResponders | one objectId | claim voter avatars, side responders, comment positions |

`Spaces` and `EntitiesBatch` already take id lists but still fire per card: `useSpacesByIds` keys on
each card's own id set, and the entity batcher (`core/sync/hydrate-entity-batcher.ts:83`) flushes
after `setTimeout(0)`, so it only merges ids enabled in the same commit; staggered enables (near
viewport, infinite pages, nested mounts) each flush alone.

A response-summary batcher exists (`ClaimResponseBatchBoundary`) but #2529 removed its only
boundary, so every `managed` check is false.

### 2a. One alias-batching collector for the single-id reads (main lever)
A small module modeled on `core/io/subgraph/profile-batch-loader.ts` (queue, flush on a short
timer, chunk, resolve each caller): callers keep calling the same fetch function with the same
arguments; the collector sends one GraphQL request with one aliased field per queued id, e.g.

```graphql
query EntityResponseCountsBatch {
  a0: votesCountByObjectIdAndObjectTypeAndSpaceIdAndVoteKind(objectId: "…", objectType: 0, spaceId: "…", voteKind: 0) { positive negative voteKind }
  a1: votesCountByObjectIdAndObjectTypeAndSpaceIdAndVoteKind(…) { … }
}
```

Swap it in inside `getEntityResponseCounts`, `getEntityCommentCount` and the
`RelationsByFromEntityId` fetch (`core/io/queries.ts`). No hook, query key or cache change, so
every call site benefits at once. Needs no API change: checked against testnet-api-v2 on
2026-10-01, an aliased EntityResponseCounts request with 1, 10, 50 and 100 fields returned in
0.21, 0.14, 0.21 and 0.25 s, so one request of 50-100 costs about the same as one of 1.

Expected: EntityResponseCounts 93-160 to a handful per page, EntityCommentCount 238 to ~5,
RelationsByFromEntityId 80 to a few. Effort: ~1 day including tests. Risk: one failed chunk fails
its items together (retry per chunk; fall back to single requests on a schema error).

### 2b. `Space` reads through the same collector
`getSpace` callers queue ids; the collector sends one `Spaces(filter: { id: { in } })` request
and splits the result. Same no-caller-change approach. Effort: hours.

### 2c. Entity batcher waits one frame and joins in-flight batches
Flush after ~16 ms instead of 0, and attach ids already in flight to that batch instead of starting
a new one. Fewer EntitiesBatch requests for staggered mounts. Effort: hours, but it sits under
every entity read, so it goes last, behind its own measurement.

Not in this pass: `EntityResponders` (lower counts, and the responders popover is on demand),
reviving `ClaimResponseBatchBoundary` (it reads raw vote rows, heavier per item than counts).

## Order and measurement

| Step | Change | Effort | Measure on |
|---|---|---|---|
| 0 | Baseline master on the flows below with the fixed harness | runs only | |
| 1 | 1a prefetch distance + 1c recording preload | small | Explore, Relationships space |
| 2 | 1b far cards as placeholders | ~1 day | Explore, Relationships space, AI space, claims page |
| 3 | 2a alias-batching collector | ~1 day | AI space, space tabs, claim page, Explore |
| 4 | 2b Space via collector | hours | Explore, AI space |
| 5 | 2c entity batch window | hours | all of the above |

Each step: production build, interleaved A/B against the previous step, report peak total and
renderer footprint (same concurrency on both sides), page elements, JS heap, query cache entries,
requests by operation, and settle time. Keep a step only if it shows a measurable win and no
behavior change in a manual check of the affected pages.

Branching: a new branch off master, separate from #2625 (which keeps the ranking fan-out and
gateway throttles), so each lands on its own.

Expected outcome if estimates hold: Explore and topic-home spaces stop growing with scroll
(steps 1-2, the memory win), and per-page request counts drop by roughly half on the AI space and
space tabs (steps 3-5, the speed win, which also matters most with several tabs sharing the
API's 6 connections).
