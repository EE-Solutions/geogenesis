# PR #2625 (GEO-3067): regression checklist

Branch `bryan/geo-3067-investigate-memory-leaks-high-resource-usage-causing-user`, merged with
upstream master at `4beed4acc` (2026-09-30). Automated: 733 test files / 8732 tests pass, `tsc` clean.

Covers what static analysis and unit tests could not settle, including interactions with master
changes merged since the PR opened: debate page outcome (#2644), stable playback instance id
(#2644), cursor-paged participant positions, offline and hidden people on the People tab
(#2606, #2613, #2614, #2633), hub schedule button (#2642), action attribution (#2611).

Fixed after adversarial review (items marked "was A1-A4" confirm those fixes):
A1/A4 ranking caps starving pending names (`41d597b5a`), A3 analytics after re-attach (`a1d64dd4a`),
A2 lapsed presigned URLs after a long release (`8c68ab5de`).

## 1. Debate feed releases videos (`/space/<id>/debates` and any Debate page)

Precondition: a space with 6+ watchable debates. Desktop Chrome unless noted.

- [ ] **Resume after scrolling back.** Play #1 to ~1:30, scroll to #4, scroll back to #1. Expected: scrubber still ~1:30, playback resumes from ~1:30 (not 0:00), both tiles in sync.
- [ ] **Paused card.** Pause #1 at ~1:30, scroll to #4 and back. Expected: paused glyph, play resumes at ~1:30. Note whether the still frame shows 0:00 (known cosmetic risk).
- [ ] **Ended debate.** Watch #2 to the end card, scroll to #5 and back. Expected: end card still shown; Replay plays both videos from 0.
- [ ] **Long absence, first return (was A2).** Play #1, scroll to #4, wait 11+ minutes, scroll back. Expected: "Loading…" briefly, then plays; no "This recording didn't load".
- [ ] **Long absence, second return (was A2).** Repeat the previous step on the same card. Expected: plays again without reload.
- [ ] **Deep link / anchored Debate page.** Open a Debate page link (with a timecode if the share dialog adds one). Expected: lands on that debate/time. Scroll 2 down and back: resumes where left, no re-seek to the link time.
- [ ] **Debate page outcome (master #2644).** With PostHog live events or the network tab: open a Debate page link and let it play. Expected: one `debate_page_outcome` for a play. Then scroll 2+ away and back: no extra or contradictory outcome. Also open a link and scroll 2+ away before it plays: outcome has `reason: "scrolled_away"`, not an error.
- [ ] **Playback analytics (was A3).** Play #1 for 20s (`debate_playback_interval` events), scroll to #4 and back, play 20s more. Expected: intervals resume for #1 with the same `playback_instance_id`. Likely: a second `debate_exposed` with the same `exposure_id` after the return (the re-bind re-runs exposure, and #2644 made the id stable per player). Confirm with analytics owners that duplicates by `exposure_id` are deduped, or ask for a one-exposure-per-instance guard.
- [ ] **Keyboard.** Focus the feed, PageDown x3 then PageUp x3. Expected: each landed card autoplays; the returned-to card resumes correctly.
- [ ] **Mobile fling (iOS Safari and Android Chrome).** Swipe quickly through 6 cards and back. Expected: no stuck "Loading…", no off-screen audio, active card autoplays (muted if required).
- [ ] **Memory (the point of the PR).** Scroll 15+ debates. Expected: `document.querySelectorAll('video[src]').length` stays at 6 or fewer; Chrome Task Manager memory stays flat. Ideally repeat on a phone and during a Google Meet screen share.
- [ ] **Explore debate cards unaffected.** On `/explore` (Best opens on a playable debate since #2621), scroll past several debate cards and back. Expected: same as before this PR.

## 2. Ranking pending names (spaces with a ranking block, e.g. the AI space)

Precondition: signed-in accounts A and B (C helps), a ranking the viewer can compose.

- [ ] **Baseline.** As A, compose, "Create new" entity "Probe 1", publish. Expected: within ~15s the embedded block's My ranking and compose show "Probe 1" with "Pending approval"; still there after reload.
- [ ] **Other rankings' proposals (was A1).** As A, leave 10+ pending "Create new" entities on ranking Y in the same space, then open ranking X with "Probe 1". Expected: "Probe 1" named and badged.
- [ ] **Other submitters (was A1).** As B and C, leave 5+ pending "Create new" entities each on ranking X. As A, create "Probe 2" and reload several times. Expected: always named and badged, in the block and in compose.
- [ ] **Busy ranking (was A4).** On a ranking with 10+ submitters, have a late submitter's pending entity in A's ranking. Expected: named.
- [ ] **Shared ranking.** As B, open A's shared ranking link. Expected: A's pending entity named; B's own tab shows B's pending entity named and badged.
- [ ] **Signed out.** Open the space. Expected: global leaderboard unchanged, no "Untitled" rows, and no `/proposals/.../diff` or `EntityBacklinksPage` requests in the network tab.
- [ ] **Share image.** Open the share-card image of a ranking with a pending entity. Expected: pending name, not "Untitled".
- [ ] **Known behavior change.** A pending entity whose proposal was not created through compose "Create new" (or was renamed) no longer shows as pending. Confirm this is acceptable.
- [ ] **Ranking explore view and attribution (master #2611).** Open the ranking's explore view, add/remove/reorder an entry. Expected: works as on master; ranking action analytics still attributed.
- [ ] **Default callers.** Space governance/activity pages and a proposal's diff view. Expected: proposer names/avatars and diff names as before.

## 3. Hub and gateway throttling (signed in, two accounts)

- [ ] **People tab positions.** A on the hub People tab (now online and offline people, minus hidden accounts). B takes a side on a claim A holds. Expected: B's position shows for A within ~10s; offline people's positions still load.
- [ ] **People presence.** B toggles availability or hides/shows the tab 3x within 5s. Expected: A's list shows B's final state within ~5s of the last change.
- [ ] **Matches tab.** B takes the opposite side of A's claim. Expected: match appears for A within ~10s.
- [ ] **Rematch picker.** After A and B debate, B changes a position in the picker list twice within 10s. Expected: A ends on B's final answer within ~10s.
- [ ] **Claim cards outside the hub.** A on `/explore` or a space Claims page, hub closed. B becomes a match. Expected: A's card shows the offer within 30s or immediately on window focus; disappears within ~30s after B goes offline; a stale request shows the refusal message without breaking.
- [ ] **Own position change.** A takes a side on a claim card. Expected: offer/match updates immediately.
- [ ] **Hidden tab.** Switch away for 2 minutes and back. Expected: no matches polling while hidden (network tab), refresh on return.
- [ ] **Hub schedule button and scheduling (master #2642, #2604).** Open the hub, use the header schedule button, send a scheduled request. Expected: works, and the Requests tab updates for both accounts.
- [ ] **Reconnect and account switch.** Toggle offline/online in DevTools; sign out and in as another account. Expected: hub tabs and rematch picker show current data within ~10s, no errors.

## 4. Property batches (`useQueryProperties`)

- [ ] Entity page in edit mode with many properties. Expected: names and types render in the same order as master.
- [ ] Table block "Edit properties": add and remove a property. Expected: list updates, no stuck skeleton.
- [ ] Entity with no properties. Expected: no `PropertiesBatch` request with `ids: []`, no spinner.
