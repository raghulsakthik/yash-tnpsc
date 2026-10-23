import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  try {
    await query('SELECT 1');
    return NextResponse.json({ status: 'ok', database: 'ok', latencyMs: Date.now() - started });
  } catch {
    return NextResponse.json({ status: 'degraded', database: 'unavailable' }, { status: 503 });
  }
}
