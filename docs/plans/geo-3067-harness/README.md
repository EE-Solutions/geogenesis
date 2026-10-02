# GEO-3067 memory harness

Scripts used for the GEO-3067 benchmarks (see the plans and results beside this folder). They were run
from a session scratchpad, so the absolute paths at the top of each script (`S=`, `R=`, `W=`, the
Playwright import) need pointing at a new checkout before reuse.

| File | Purpose |
|---|---|
| `harness.mjs` | One run: fresh headless Chrome, one flow, a JSONL row per checkpoint (process footprint, memory-infra by allocator, DOM and JS heap, query cache, requests by GraphQL operation). Options: `--auth`, `--map <port>`, `--expect <build>`, `--block <regex>`. |
| `flows.mjs` | Flow catalog (neutral page `/tools`, 3 visits per flow). |
| `runq.mjs` | Runs a job list N at a time. |
| `build.sh` / `server.sh` | Production build of a ref into a saved build; serve saved builds on :3000 / :3001. |
| `ab.sh` | Serve two builds side by side, alternate runs, print the comparison. |
| `analyze.py` | `summary A B` (first-visit peak, kept after leaving, per-revisit growth, requests), `ab`, `baseline`, `noise`. |
| `status.py` | Live dashboard (`python3 -m http.server --directory status`). |
| `rawcdp.mjs` | Same cycle without Playwright, for checking harness artifacts. |
| `heapdiff.mjs`, `detached.mjs`, `retainers.mjs`, `rootpaths.mjs` | Heap snapshot diff and retainer paths from GC roots. |
| `login.mjs` | Opens Chrome for a manual sign-in and saves the session (keep the output out of git). |
| `results/` | Comparison tables from the runs. `base-vs-step1.port3001-invalid.md` is the run broken by geo-chat CORS. |

Pitfalls: disable the back/forward cache; don't call `DOM.getDetachedDomNodes` in per-visit runs (it
keeps the nodes alive); geo-chat accepts only `http://localhost:3000`, so a second server needs the
`--map` host-resolver rule; process footprint is only comparable within the same concurrency.
