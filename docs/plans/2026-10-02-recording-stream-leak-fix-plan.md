# Debate recording: stop the live upload when a room lets go of it

Status: plan, not implemented. Against master `b95a136c5` (includes #2706 and #2712).

## The problem

Since GEO-2955 (#2540, 2026-09-22) the debate room streams its recording while it is made, through
`startLiveRecordingStream` (`core/debates/recording-stream.ts`), which wraps a `RecordingPartStreamer`.
The streamer keeps its own copy of every timeslice (`chunks`) and runs on its own timer until it is
stopped by `finish()` or `abort()`.

**1. A detached recording is never stopped (the leak).**
`detachLocalRecorder` (`debate-room-page-client.tsx:1268`) sets `liveRecordingStreamRef.current = null`
and then calls `discardLocalRecorder`, whose `liveRecordingStreamRef.current?.abort()` is now a no-op.
Nothing calls `finish()` or `abort()`, so the streamer keeps rescheduling for the life of the tab and
holds the whole recording so far (2.5 Mbps ≈ 19 MB/min; ~90 MB for a 5-minute debate).

- Paths: room unmount mid-debate (`:2297`, any navigation that isn't Leave) and
  `handleConnectionFailure` (`:2213`, "Connection failed. Finding another match."). A LiveKit
  `Disconnected` followed by leaving reaches it through unmount.
- After unmount, `shouldPause` reads refs nobody updates. If the last room state was `connected`, it
  never pauses: a timer every ~4 ms forever (proved with the real class under fake timers: 60,000
  wake-ups per simulated minute at 1 ms resolution, still holding every byte). Otherwise it
  re-checks every 3 s forever.
- One per affected debate; they accumulate.
- Side effects beyond memory: the stream's IndexedDB heartbeat stops at detach, so after 2 minutes
  the upload coordinator's orphan recovery adopts it, completing or aborting the same multipart
  upload the leaked streamer is still working on. After that, the leaked streamer's part requests
  fail and retry every ≤30 s indefinitely (part-URL calls to geo-chat, PUTs to R2).

**2. A busy loop during every debate (not a leak).**
After each successful step, `pump()` ends with `this.schedule(0)` (`recording-stream.ts:326` on the
earlier base, same code on master). When no whole part is ready, `sendNextPart` returns at once and
the loop runs again in ~4 ms. So for the whole live call (once the multipart upload has started) the
main thread wakes ~250 times a second for nothing. New bytes only arrive through `append`, which
already schedules a pump.

## What must not change

- **Recovery of an interrupted recording (GEO-2955).** A detached recording must keep its IndexedDB
  chunks and its multipart upload so `recoverOrphanedRecordingStreams` can finish it or discard it.
  So detach must not `abort()` (it would abort the multipart and delete the chunks) and must not
  `release()` (it would delete the chunks).
- **Analytics.** `finish()` on the wrapper emits `debate_recording_stream_finished`. Detached
  recordings never emitted it and must not start (it would report a finished stream that didn't
  finish). No event is added or removed by this change.
- **Cancel, leave and the normal end.** `discardLocalRecorder` (cancel/abort/leave) and the
  persistence path (`finish` → enqueue → `release`) are untouched.
- **Live upload timing.** Parts still go out as soon as a whole part exists.

## The change

### A. `recording-stream.ts`: a `detach()` on the live stream

```ts
export type LiveRecordingStream = {
  // ...existing members
  /** The room let go of a recording it could not finish: stop streaming, keep the chunks and upload for recovery. */
  detach: () => Promise<void>;
};

// in startLiveRecordingStream
async detach() {
  await streamer.finish();
  await writes;
},
```

- `streamer.finish()` sets `stopped`, clears the timer and waits (up to its 10 s grace) for a part
  already on the wire, whose number `onMultipartChange` then saves to IndexedDB. That gives recovery
  the most accurate part list. It returns a snapshot that detach ignores.
- No `capture`, no `deleteRecordingStream`, no `abortMultipart`.
- Once the timer is cleared and any in-flight request settles, nothing references the streamer and
  its `chunks` are collected.

### B. `recording-stream.ts`: only reschedule when a whole part is waiting

In `RecordingPartStreamer.pump`, replace the final `this.schedule(0)` with:

```ts
// More whole parts may already be waiting; otherwise the next `append` schedules the pump.
if (this.nextPartNumber() !== null) this.schedule(0);
```

No lost wakeups:
- An `append` while idle schedules a pump (`schedule(0)`, unchanged).
- An `append` while a step is in flight is refused by `schedule` (`inFlight` set). When the step
  ends, the new check sees the bytes it added and schedules.
- An `append` while a timer is pending is covered by that timer.
- After `start()` opens the upload, bytes already buffered past a part boundary are caught by the
  same check.
- Unchanged: the pause branch (3 s re-checks while the call struggles) and the failure branch
  (backoff 2-30 s).

### C. `debate-room-page-client.tsx`: detach the stream before dropping it

```ts
const detachLocalRecorder = React.useCallback(() => {
  void liveRecordingStreamRef.current?.detach();
  liveRecordingStreamRef.current = null;
  return discardLocalRecorder();
}, [discardLocalRecorder]);
```

Fire-and-forget, like the other stream calls in the room, so unmount isn't delayed. The doc comment
above it stays accurate (chunks kept, coordinator decides).

## Why this doesn't break anything else

| Area | Effect |
|---|---|
| Normal end of a debate | Unchanged: `finish` → enqueue → `release`. Only the idle wake-ups during the call go away. |
| Cancel / abort / leave | Unchanged: `discardLocalRecorder` still aborts the stream (its ref is still set on those paths). |
| Unmount or connection failure mid-debate | Streamer stops instead of running forever. IndexedDB chunks and multipart kept; heartbeat already stopped at detach, so orphan recovery runs exactly as before. Parts not sent before detach go out with the queued upload after recovery (same mechanism as the tail today). |
| Orphan recovery (`recoverOrphanedRecordingStreams`) | No code change. It no longer races a still-running streamer on the same multipart upload, so fewer failed part uploads after completion or abort. |
| Persistence racing an unmount | If persistence already called `finish()` and the room unmounts before `release()`, detach calls `finish()` again: idempotent (already stopped, returns a snapshot, no event). Same outcome as today otherwise. |
| A recorder restart after a LiveKit drop | Not possible within one room (`startLocalRecorder` returns once a recording has started), so a second stream never overwrites an unfinished one. |
| Multi-tab ownership, Safari ArrayBuffer storage (GEO-3116), upload error codes (GEO-3051) | Not touched. |
| Server | Fewer part-URL requests and failing PUTs; no API change. |

**Analytics, in detail:**
- `debate_recording_stream_finished`: unchanged. Emitted on the normal end only, as today.
- `debate_recording_orphan`: same outcomes. `streamed_parts` can be lower for detached recordings,
  because live upload now stops at detach instead of continuing unseen. Expected, and more honest.
- `paused_ms` inside `debate_recording_stream_finished`: still counts 3 s per re-check while paused.
  Detection of a new pause can now wait for the next timeslice (≤1 s) instead of ~4 ms. The metric
  is already quantized to 3 s, so the distribution shouldn't move.
- Recording upload failure codes (#2706): failures caused by a leaked streamer racing recovery
  (part uploads to a completed or aborted multipart) should drop.

## Tests (each new one fails on master)

`core/debates/recording-stream.test.ts` (uses its manual timers):
1. **Goes quiet when no whole part is waiting.** Append 19 bytes (2 parts + tail), drain: parts 1-2
   sent and `timers.size === 0`. Today a timer is always pending (the helper caps `drain()` at 100
   rounds for this reason).
2. **No lost wakeup.** After it has gone quiet, append enough to complete part 3: it is sent. And an
   append that completes a part while a part is on the wire is sent after that part finishes.
3. **`detach()` stops streaming but keeps the recording for recovery.** After `detach()`:
   - a further whole part is not sent;
   - the IndexedDB stream row and its chunks still exist, with the multipart saved;
   - `abortMultipart` was not called;
   - `debate_recording_stream_finished` was not captured.

`debate-room-page-client.test.tsx`:
4. Add `detach` to the `startLiveRecordingStream` mock. Extend "keeps the saved chunks for recovery
   when the room unmounts mid-debate": `detach` called once, `abort` and `release` not called (as
   today).
5. New: a connection failure mid-debate detaches the stream once (and doesn't abort or release it).
6. Existing tests for cancel (`abort` once), normal end (`finish` then `release`), and the
   coordinator and orphan-recovery suites run unchanged.

Then the full web suite, `tsc`, ESLint.

## Out of scope (follow-ups)

- **Persistence's early return** (`debate-room-page-client.tsx` ~`:1119`): when geo-chat or the
  queue already has this participant's recording, persistence returns without stopping the recorder
  or the streamer. The recording keeps growing in memory and streaming until the room unmounts.
  After this fix that ends at unmount; stopping it earlier changes recording semantics and needs its
  own look.
- **Final timeslice on detach**: the ref is cleared before the recorder stops, so the last ≤1 s
  isn't written to IndexedDB. Pre-existing; unrelated to memory.
- **Visibility**: no event says how often a recording is detached. A `debate_recording_stream_detached`
  event would show how many users hit this path. That would be an analytics addition, so it's
  Bryan's call.
- IndexedDB growth items from the audit (rows for other accounts, failed deletes): disk, not memory.

## Delivery

- New branch from master (generic name, e.g. `recording-stream-leak`), separate from `feed-memory`.
- Three commits: streamer reschedule, `detach()`, room uses it. Each with its tests.
- Optional manual check in a real debate: leave mid-debate by navigating away, then confirm in
  DevTools (Performance monitor, or a heap snapshot) that no `RecordingPartStreamer` remains and
  timers stop. The unit tests cover the mechanism; this only confirms the wiring.
