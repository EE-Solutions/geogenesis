# App-wide memory benchmark: plan

Goal: a repeatable harness that measures client memory (and the requests that feed it) for each
main app flow, tells us *what* the memory is, not just how much, and can compare two builds with
known statistical power. Then baseline master, rank flows by cost, and use the same harness to
judge #2625 and any later fix.

Nothing from the GEO-3067 benchmarks is taken as a finding here. The old scripts are reused only as
plumbing, and every earlier claim (Explore growth, debate feed cost, People tab request rate,
ranking fan-out) gets re-measured by this harness before it drives a change.

## What the previous harness could not tell us

| Gap | Effect | Fix in this plan |
|---|---|---|
| One number per process (`footprint` total) | Says a page is big, not why (JS, DOM, images, media, GPU, malloc) | Chrome memory-infra dump per checkpoint, broken down by allocator |
| Run-to-run SD ~40-75 MB on ~1.5 GB totals | Effects under ~100 MB were invisible at n=5 | Pilot measures noise per metric; n chosen for a target effect; primary metrics with lower variance |
| Master runs, then branch runs | Testnet data drift landed on one arm (it showed in the control) | Interleaved A/B per run; optional GraphQL replay for identical data |
| Fixed sleeps | Checkpoints taken mid-load on slow runs | Settle detection (network quiet + no DOM growth), with time-to-settle recorded |
| One-shot absolute readings | A leak and a big-but-stable page look the same | Cycle protocol: repeat flow and leave, measure retained memory per cycle (slope) |
| Signed out only | Misses the signed-in paths (hub polling, personal space, edit) | Signed-in arm via a saved session the user creates |
| Harness never validated | No proof it catches a leak or stays quiet on no change | A/A test and an injected-leak positive control before any real comparison |
| Ad hoc routes | Flows chosen around the video bug | Flow catalog covering the main nav (below) |

## Metrics

Collected at every checkpoint, after two forced GCs and a 1.5 s pause.

**L1. Process memory (macOS `footprint`, per process role).** Browser, renderer(s), GPU, utility.
Kept as the "what the user's machine pays" number. Reported per role, never only as a total.

**L2. Allocator breakdown (Chrome memory-infra dump, `Tracing.requestMemoryDump`).** Per process:
`v8`, `blink_gc`, `blink_objects`, `partition_alloc` (DOM/layout/strings), `cc` and `gpu`
(compositor tiles, decoded images), `malloc`, `media` when present, `shared_memory`. Verified
working in headless Chrome today. This is the attribution layer: it says whether a flow's cost is
JS objects, DOM, decoded images, video, or compositor.

**L3. Page-level counters (CDP).**
- JS heap used, DOM nodes, documents, event listeners (`Memory.getDOMCounters`).
- Detached DOM nodes (`DOM.getDetachedDomNodes`; verified, counts exact). The leak signal for
  SPA navigation.
- Media: `<video>` count, with `src`, loaded, buffered seconds. Images: `<img>` count and decoded
  pixel estimate.
- TanStack Query cache: entry count and serialized size. Read without app changes by finding the
  `QueryClient` through React's root fiber; if that proves fragile in prod builds, fall back to a
  flag-gated `window.__geoQueryClient` (local-only, not merged).

**L4. Network.** Requests per origin, GraphQL operation names and counts, response bytes,
websocket messages per minute. Needed for #2625, and because response data ends up in the query
cache.

**Heap snapshots** are not taken every run (they perturb memory). Taken on demand: the first and
last cycle of a flow flagged as leaking, diffed by constructor and retainer path.

## Protocol

**Builds.** Production (`next build` + `next start`) of each ref, each in its own checkout, served
on port 3000 one at a time (port 3000 keeps the signed-in session valid for Privy). Env passed
inline: `DISABLE_SENTRY=1`, testnet API and geo-chat URLs.

**Browser.** Google Chrome, fresh browser per run, fixed 1440x900 viewport, autoplay allowed.
Headless by default; a headed spot-check per flow for GPU/hardware decode, since headless uses
software paths.

**Order.** Interleaved ABAB...: one run of A, restart server on B, one run of B. Server restart is
seconds; the drift that skewed the last comparison lands on both arms equally.

**Data.** Two modes:
- *Live* (default for the baseline): real testnet, realistic.
- *Replay* (for A/B on GraphQL-heavy flows): record a HAR of the GraphQL origin once, replay for
  both builds with live fallback for requests the HAR lacks (count of fallbacks reported, since
  #2625 changes which requests are made). Media and presign requests always go live (signed URLs
  expire).

**Settle.** A checkpoint waits until no requests in flight for 2 s and DOM node count stable for
2 s, capped at 30 s. Time to settle is recorded; a capped checkpoint is flagged.

**Cycle protocol (leak test).** For each flow: load a neutral page, measure; run the flow; go back
to the neutral page through client-side navigation; GC; measure. Repeat 5 cycles. Report retained
growth per cycle (slope with 95% CI) for JS heap, DOM nodes, detached nodes, renderer footprint.
The neutral page is chosen in phase 0 by measuring candidates (lightest stable page in the app
shell).

**Soak.** Idle 10 minutes on pages with polling or sockets (home, debates hub People tab, live
community call page if available), tab visible. Report growth per minute and requests per minute.

**Statistics.** Pilot of 8 runs per flow gives each metric's SD. Sample size per comparison is
set so the minimum detectable effect is 5% of the flow's renderer footprint (or 50 MB, whichever
is larger) at 80% power. Report median, mean ± SD, 95% CI of the difference, and a Mann-Whitney
p-value. Totals within the CI of zero are reported as "no measurable change", not as wins.

## Validation before any real comparison

1. **A/A.** Same build in both arms, 8 runs, three flows. Expect no metric to differ; if one does,
   the protocol is still biased and gets fixed first.
2. **Positive control.** Inject a known leak through the harness (retain 50 MB of arrays and 5,000
   detached nodes per cycle). The cycle protocol must report it with the right size and source
   (`v8` / detached nodes). Then a smaller one (10 MB) to learn the real detection floor.
3. **Settle check.** Compare settled checkpoints against a long fixed wait (60 s) on two flows; they
   should agree within noise.

## Flow catalog

Each flow is a scripted journey with named checkpoints. "In" = signed in only.

| # | Flow | Route(s) | Journey |
|---|---|---|---|
| F1 | Home / Governance | `/home` | load, scroll, open a proposal, back; then soak |
| F2 | Explore | `/explore` | load, scroll 2 min, open a card, back, leave |
| F3 | Space overview | `/space/[id]` (AI space and one small space) | load, scroll to bottom, switch tabs |
| F4 | Entity page with ranking block | entity in the AI space with a ranking block | load, scroll, open ranking compose |
| F5 | Space Debates feed | `/space/[id]/debates` | scroll 20 debates, back 5 |
| F6 | Debate page | `/space/[id]/[debateEntityId]` | scroll 10, back to first |
| F7 | Space tabs tour | claims, questions, positions, activity, about | visit each tab in turn |
| F8 | Proposals and diffs | `/space/[id]/proposals`, governance | open 5 proposals with diffs |
| F9 | Bounties | `/bounties`, a bounty | load, open, back |
| F10 | Search and sidebar navigation | browse sidebar, search | search 5 terms, open results |
| F11 | Debates hub, People tab (In) | space debates hub | soak 10 min, requests/min |
| F12 | Personal space and editing (In) | personal space, an entity in edit mode | open editor, add blocks, no publish |
| F13 | Mixed session | F2, F3, F5, F4, F8 back to back | the "tab open all day" case, with soak at the end |

Specific space and entity ids get picked in phase 0 and written into the script, so every run
hits the same data. Community-call live rooms and debate rooms need a live session; left out
unless we can schedule one.

## Signed-in arm

Bryan signs in once in a headed Playwright window opened by the harness (I don't type credentials);
the session is saved to the scratchpad, reused for the signed-in flows, and deleted at the end.

## Outputs

- One JSONL row per checkpoint (all metrics), per run.
- `analyze` script: per-flow tables (baseline) and A/B tables with CIs.
- A report page per batch: flows ranked by renderer footprint, retained growth per cycle, idle
  growth, and request count; stacked allocator breakdown per flow, so the next target is visible.
- Heap snapshot diffs for flagged flows, summarized as top retainers.

## Phases

| Phase | Work | Bryan needed? | Rough time |
|---|---|---|---|
| 0 | Build the harness, pick ids and the neutral page, run validation (A/A, positive control, settle check) | No | ~half a day of runs |
| 1 | Baseline master, all flows, signed out; then signed-in flows | One sign-in | ~4-6 h of unattended runs |
| 2 | Rank flows by cost; heap snapshot diffs on the top 3 | No | |
| 3 | Rebase #2625 onto master without its video commit (superseded by #2686); A/B on F3, F4, F8, F11, F13 | No | |
| 4 | Fix candidates from phase 2, each A/B'd with the same harness | Review | |

Results of phases 1-2 come back as a ranked list with numbers before anything changes in code.

## Later: multiple tabs

Crash reports came from users with several Geo tabs open. Per-tab memory, sockets and polling add up
linearly, and some limits are browser-wide: the API's 6 HTTP/1.1 connections per host are shared by
every tab, the GPU process and video decoders are shared, and `refetchOnWindowFocus` refetches a
tab's mounted queries when it regains focus.

Test (signed in, headed Chrome off-screen so background tabs are really hidden): 1, 3 and 5 Geo tabs
on a mix of Explore, AI space, a debate feed, a claim page and the People tab; 10 minutes. Record
total and per-tab footprint, requests/min from background tabs, request queueing time in the
foreground tab per tab count, and the request burst when switching back to a tab idle 5+ minutes.
Answers whether cost grows linearly or worse with tabs, and how much HTTP/2 on the API would help.

## Harness corrections found during validation (2026-10-01)

- `DOM.getDetachedDomNodes` hands detached nodes to DevTools, which keeps them alive: the harness
  created ~1,000 retained nodes per AI space visit itself. Removed from per-visit runs.
- Per-visit growth must be measured between returns to the neutral page (ret1 to retN); including
  the first reading counts the first visit's cache as a leak.
- Back/forward cache off, API reachability checked before each run, and runs with >25% failed
  requests at any reading are excluded (a Wi-Fi drop produced pages that loaded almost nothing).
