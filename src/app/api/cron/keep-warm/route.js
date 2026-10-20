import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/keep-warm
 *
 * Neon's free tier suspends its compute after ~5 minutes of inactivity,
 * so the first request after idling pays a real cold-start cost (the
 * database has to spin back up before it can answer). Vercel's Hobby
 * plan only allows daily cron, nowhere near often enough to prevent
 * that -- this exists to be pinged externally (e.g. cron-job.org) every
 * few minutes instead. A single trivial query is enough to count as
 * activity and keep the compute warm; nothing here needs to do more.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Missing or invalid cron secret' }, { status: 401 });
    }
  }

  try {
    await query('SELECT 1');
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
