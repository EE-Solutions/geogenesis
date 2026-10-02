// Runs harness jobs with a concurrency limit.
// Usage: node runq.mjs <jobs.txt> <concurrency> <logname>
// Each job line: [ENV=val ...] <label> <flow> <run> [--auth ...] [--base ...]. Lines starting with # are
// logged as section headers when reached.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const [jobsFile, concArg, logName] = process.argv.slice(2);
const HERE = new URL('.', import.meta.url).pathname;
const LOG = `${HERE}results/${logName}`;
const RUNLOG = `${HERE}results/${logName.replace(/\.log$/, '')}-runs.log`;
const CONC = Number(concArg);
const ts = () => new Date().toTimeString().slice(0, 8);
const log = s => fs.appendFileSync(LOG, `${ts()} ${s}\n`);

const lines = fs.readFileSync(jobsFile, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
const jobs = lines.filter(l => !l.startsWith('#'));
log(`TOTAL ${jobs.length} (concurrency ${CONC})`);

let next = 0;
let running = 0;
const queue = lines.slice();
await new Promise(resolve => {
  const pump = () => {
    while (running < CONC && queue.length) {
      const line = queue.shift();
      if (line.startsWith('#')) {
        log(line.slice(1).trim());
        continue;
      }
      const parts = line.split(/\s+/);
      const env = { ...process.env, BENCH_PARALLEL: String(CONC) };
      while (/^[A-Z_]+=/.test(parts[0])) {
        const [k, v] = parts.shift().split('=');
        env[k] = v;
      }
      const id = ++next;
      running++;
      log(`start ${parts.join(' ')}`);
      const child = spawn('node', [`${HERE}harness.mjs`, ...parts], { cwd: HERE, env });
      const out = fs.createWriteStream(RUNLOG, { flags: 'a' });
      child.stdout.on('data', d => out.write(`[${id} ${parts[1]}] ${d}`));
      child.stderr.on('data', d => out.write(`[${id} ${parts[1]} ERR] ${d}`));
      // A hung run should not stall the queue.
      const kill = setTimeout(() => child.kill('SIGKILL'), 30 * 60_000);
      child.on('exit', code => {
        clearTimeout(kill);
        running--;
        log(`${code === 0 ? 'done' : 'FAILED'} ${parts.join(' ')}`);
        if (!queue.length && running === 0) resolve();
        else pump();
      });
      // Stagger launches so browsers don't all start at the same instant.
      if (running < CONC && queue.length) return void setTimeout(pump, 3000);
    }
    if (!queue.length && running === 0) resolve();
  };
  pump();
});
log('DONE');
