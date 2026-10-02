# Debate recording leak: fix, benchmark and regression plan

Plan: `2026-10-02-recording-stream-leak-fix-plan.md`. Branch `recording-stream-leak` from master
`b95a136c5` (local, not pushed):

| Commit | Change |
|---|---|
| `17b334285` | The live upload reschedules itself only while a whole part is waiting (no idle polling during a debate). |
| `c86f87789` | `LiveRecordingStream.detach()`: stops streaming, keeps local chunks and the multipart upload for orphan recovery, reports nothing. |
| `56072d1b7` | `detachLocalRecorder` detaches the stream before dropping it (unmount mid-debate, connection timeout). |

## Success benchmark

`geo-3067-recording-bench/recording-leak.bench.test.ts` runs the real `startLiveRecordingStream`
(in-memory IndexedDB, fake transport) with real timers and real-size timeslices (312 KB/s, i.e.
2.5 Mbps). Copy it to `apps/web/core/debates/` and run:

```sh
NODE_OPTIONS=--expose-gc npx vitest run core/debates/recording-leak.bench.test.ts --pool=forks
# BENCH_MODE=drop|detach|release picks what the "room" does when it lets go
```

Scenarios:
1. **Live debate, waiting for the next part:** wake-ups per second over 3 s.
2. **The room lets go of 5 recordings of 90 s each (137 MB recorded).** Master does what the room did
   (drops the reference); the fix calls `detach()`. Then the IndexedDB copies are removed (orphan
   recovery's job), GC is forced, and memory held above baseline plus wake-ups per second are
   measured.

Results (3 runs each, identical to within 1%):

| | Master | Fix |
|---|---|---|
| Wake-ups per second during a live debate, waiting for the next part | 790-875 | **0** |
| Memory held after letting go of 5 recordings | 411 MB | **302 MB** |
| of which the environment's floor (same run with `release()`, the normal end) | 302 MB | 302 MB |
| **Leaked by the abandoned recordings** | **~110 MB** | **0** |
| Wake-ups per second from abandoned uploads | 3,950-4,360 | **0** |

Node runs timers at 1 ms; Chrome clamps nested timers to ~4 ms, so in the browser the wake-up rates
are about a quarter of these. The memory is the same. In a user's tab each abandoned debate holds
its recording so far (≈19 MB per minute of debate) for the life of the tab.

## Automated regression coverage

New or extended tests, each failing on master:
- `recording-stream.test.ts` › *goes quiet when no whole part is waiting, and sends one as soon as a
  timeslice completes it* (fails on master: a timer is always pending).
- `recording-stream.test.ts` › *stops streaming when the room lets go of a recording, and keeps it
  for recovery*. Checks no wake-ups and no further part uploads after `detach()`; the IndexedDB
  row, chunks and multipart progress are kept; no multipart abort; no
  `debate_recording_stream_finished` event. Also fails with a `detach()` that doesn't stop the
  streamer.
- `debate-room-page-client.test.tsx` › *keeps the saved chunks for recovery when the room unmounts
  mid-debate* now also requires `detach()` once.
- `debate-room-page-client.test.tsx` › *stops the live stream when a connection timeout cancels the
  debate mid-recording*. Fails on master: on that path neither `detach()` nor `abort()` reached the
  stream.

Guards that already passed and still pass:
- *sends a part completed while another was on the wire* (new; passes on master too). Guards against
  the reschedule change dropping a wake-up.
- Normal end hands the multipart to the queue and releases (now also asserts no `detach()`).
- Cancellation aborts the stream (now also asserts no `detach()`).
- Pause and catch-up, retry of a failed part, missing multipart routes, part on the wire at stop,
  orphan recovery (recover / leave a live recorder alone / wait on a running debate / discard
  cancelled / discard already uploaded / never abort the queue's own multipart), upload queue and
  coordinator suites.

Full web suite: 782 files, 9,469 tests passing. `tsc` and ESLint clean.

## Manual regression checklist (two accounts, real debate)

Run on a preview build. Keep DevTools open on one participant (Performance monitor plus the Memory
panel).

1. **Normal debate, start to finish.** Both recordings upload, the debate processes and publishes.
   Analytics: one `debate_recording_stream_finished` per participant, `streaming: 'on'`,
   `parts_uploaded_live` > 0 for a debate longer than about 15 s.
2. **Leave mid-debate by navigating away (not the Leave button).**
   - Heap snapshot a few seconds later: search `RecordingPartStreamer`; expect 0 instances.
   - Performance monitor: no steady timer activity from the old room.
   - Within ~2-3 minutes after the debate settles, orphan recovery acts: a `debate_recording_orphan`
     event with `recovered` (if the debate finished) or a `discarded_*` outcome, as before.
   - No repeating part-upload errors in the console.
3. **Connection timeout.** The opponent never connects, the room shows "Connection failed. Finding
   another match." Expect no `RecordingPartStreamer` left and the orphan discarded as cancelled.
4. **Leave button or cancel mid-debate.** Streamed parts are aborted, no orphan row left (unchanged
   behavior).
5. **Poor connection.** Throttle the network to "Slow 3G" for 30 s mid-debate, then restore. The live
   upload pauses, then catches up; `paused_ms` is reported in `debate_recording_stream_finished`.
6. **Safari (GEO-3116).** A normal debate's recording uploads.
7. **Several debates in one tab.** After each ends, renderer memory in Chrome's Task Manager returns
   near its previous level, and the Performance panel shows no ~4 ms timer storm while waiting
   between parts.

## What to watch after release

- `debate_recording_stream_finished`: volume per debate unchanged (detach doesn't emit it).
- `debate_recording_orphan`: same outcome mix. `streamed_parts` may be lower for detached recordings,
  since live upload now stops at detach instead of continuing unseen.
- Recording upload failure codes (GEO-3051): failures from part uploads to an already completed or
  aborted multipart should drop.
- No new console errors from `[DebateRecording]`.

## Not changed (follow-ups)

- Persistence's early return when geo-chat or the queue already has the recording: recorder and
  stream keep running until the room unmounts. Now bounded by the room's lifetime; stopping earlier
  changes recording semantics.
- The final ≤1 s timeslice on detach isn't written to IndexedDB (pre-existing).
- No event yet says how often a recording is detached (an analytics addition, Bryan's call).
