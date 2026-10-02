// Benchmark (not committed): what a debate recording costs after the room lets go of it, and the
// live upload's idle wake-ups. Real timers, real-size chunks. Runs on master and on the fix:
// master drops the reference (what the room does today); the fix calls `detach()` first.
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { Blob as NodeBlob } from 'node:buffer';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

vi.mock('~/core/analytics', () => ({ capture: vi.fn() }));

const MB = 1024 * 1024;
const CHUNK = 312 * 1024; // one 1 s timeslice at 2.5 Mbps
const SECONDS = 90; // recorded before the room lets go
const DEBATES = 5;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const gc = () => (globalThis as { gc?: () => void }).gc?.();
const mem = () => {
  gc();
  gc();
  const m = process.memoryUsage();
  return { heapMB: m.heapUsed / MB, buffersMB: (m.arrayBuffers + m.external) / MB };
};

let stream: typeof import('~/core/debates/recording-stream');
let db: typeof import('~/core/database/indexeddb').db;

beforeAll(async () => {
  globalThis.indexedDB = indexedDB;
  globalThis.IDBKeyRange = IDBKeyRange;
  globalThis.Blob = NodeBlob as typeof Blob;
  ({ db } = await import('~/core/database/indexeddb'));
  stream = await import('~/core/debates/recording-stream');
});
afterAll(() => db.close());

function transport(calls: { pause: number; partUrls: number; puts: number }) {
  return {
    startMultipart: async () => ({ filename: 'f', upload_id: 'u', part_size: 5 * MB }),
    getPartUrls: async (_f: string, _u: string, parts: number[]) => {
      calls.partUrls += 1;
      return parts.map(part_number => ({
        part_number,
        upload: { method: 'PUT', url: `x/${part_number}`, headers: {}, expires_at: new Date(Date.now() + 3_600_000).toISOString() },
      }));
    },
    putPart: async () => {
      calls.puts += 1;
      await sleep(5);
    },
    abortMultipart: async () => undefined,
  };
}

it('benchmark', { timeout: 600_000 }, async () => {
  const fixed = 'detach' in (stream.startLiveRecordingStream({
    id: 'probe', metadata: { userId: 'u', debateId: 'probe', mimeType: 'video/webm', startedAtMs: 0, width: null, height: null, framerate: null, videoBitsPerSecond: null },
    transport: transport({ pause: 0, partUrls: 0, puts: 0 }), shouldPause: () => true,
  }) as object);
  const out: Record<string, number | string | boolean> = { version: fixed ? 'fix' : 'master' };

  // 1. During a live debate, waiting for the next part: how often the upload wakes up.
  {
    const calls = { pause: 0, partUrls: 0, puts: 0 };
    const live = stream.startLiveRecordingStream({
      id: 'live', metadata: { userId: 'u', debateId: 'live', mimeType: 'video/webm', startedAtMs: 0, width: null, height: null, framerate: null, videoBitsPerSecond: null },
      transport: transport(calls), shouldPause: () => { calls.pause += 1; return false; },
    });
    live.append(new Blob([new Uint8Array(2 * MB)]), 1);
    await sleep(500); // multipart opens
    const before = calls.pause;
    await sleep(3_000);
    out.liveIdleWakeupsPerSec = Math.round((calls.pause - before) / 3);
    await live.finish();
  }
  await db.delete();
  await db.open();

  // 2. The room lets go of DEBATES recordings mid-debate.
  const base = mem();
  const calls = { pause: 0, partUrls: 0, puts: 0 };
  for (let d = 0; d < DEBATES; d += 1) {
    const live = stream.startLiveRecordingStream({
      id: `d${d}`, metadata: { userId: 'u', debateId: `d${d}`, mimeType: 'video/webm', startedAtMs: 0, width: null, height: null, framerate: null, videoBitsPerSecond: null },
      transport: transport(calls), shouldPause: () => { calls.pause += 1; return false; }, // room was 'connected'
    });
    for (let s = 0; s < SECONDS; s += 1) {
      live.append(new Blob([new Uint8Array(CHUNK).fill(s)]), s * 1000);
      if (s % 10 === 0) await sleep(20);
    }
    await sleep(500);
    const mode = process.env.BENCH_MODE ?? (fixed ? 'detach' : 'drop');
    if (mode === 'detach') void (live as { detach: () => Promise<void> }).detach();
    if (mode === 'release') {
      await live.finish();
      await live.release();
    }
    out.mode = mode;
    // The room drops its reference here either way.
  }
  await sleep(3_000);
  // Orphan recovery would remove the IndexedDB copies; take them out of the measurement.
  db.close();
  await db.delete();
  await sleep(500);
  const after = mem();
  out.recordedMB = Math.round((DEBATES * SECONDS * CHUNK) / MB);
  out.heldHeapMB = +(after.heapMB - base.heapMB).toFixed(1);
  out.heldBuffersMB = +(after.buffersMB - base.buffersMB).toFixed(1);
  const pause0 = calls.pause, urls0 = calls.partUrls, puts0 = calls.puts;
  await sleep(5_000);
  out.orphanWakeupsPerSec = Math.round((calls.pause - pause0) / 5);
  out.orphanRequestsIn5s = calls.partUrls - urls0 + calls.puts - puts0;
  process.stdout.write(`BENCH ${JSON.stringify(out)}\n`);
  await db.open();
  expect(true).toBe(true);
});
