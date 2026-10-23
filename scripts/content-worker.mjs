#!/usr/bin/env node
import { claimNextProcessingJob, processJob } from '../src/lib/contentProcessing.mjs';

const intervalMs = Number(process.env.CONTENT_WORKER_POLL_MS || 2000);
const once = process.argv.includes('--once');
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

console.log(`[content-worker] started; poll=${intervalMs}ms`);
while (!stopping) {
  const jobId = await claimNextProcessingJob();
  if (!jobId) {
    if (once) break;
    await new Promise((r) => setTimeout(r, intervalMs));
    continue;
  }
  try {
    console.log(`[content-worker] processing ${jobId}`);
    await processJob(jobId);
    console.log(`[content-worker] completed ${jobId}`);
  } catch (err) {
    console.error(`[content-worker] failed ${jobId}: ${err?.message || err}`);
  }
}
console.log('[content-worker] stopped');
