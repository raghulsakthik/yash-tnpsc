#!/usr/bin/env node
// Sends an engagement email every 3 hours. A standalone process rather
// than a Next.js instrumentation hook: instrumentation.js gets bundled
// for both the Node and Edge runtimes, and the Edge bundle can't resolve
// 'fs' (which `pg` needs) even behind a runtime check -- Next's static
// analysis pulls it in regardless. Plain Node, run alongside `npm run dev`,
// sidesteps that entirely.

import { sendEngagementEmail } from '../src/lib/engagement.mjs';
import { emailConfigured } from '../src/lib/email.mjs';

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

if (!emailConfigured) {
  console.error('[engagement] SMTP is not configured (missing SMTP_* env vars). Exiting.');
  process.exit(1);
}

async function tick() {
  try {
    const result = await sendEngagementEmail();
    console.log(`[engagement] Sent to ${result.to} at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[engagement] Send failed:', err.message);
  }
}

console.log(`[engagement] Scheduler started -- sending every 3 hours, starting now.`);
tick();
setInterval(tick, THREE_HOURS_MS);
