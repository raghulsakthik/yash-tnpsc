import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  try {
    const [{ rows: dbRows }, { rows: migrationRows }] = await Promise.all([
      query('SELECT 1 AS ok'),
      query(`SELECT version FROM schema_migration ORDER BY version DESC LIMIT 1`),
    ]);

    return NextResponse.json({
      status: 'ready',
      database: dbRows[0]?.ok === 1 ? 'ok' : 'unknown',
      latestMigration: migrationRows[0]?.version ?? null,
      latencyMs: Date.now() - started,
    });
  } catch {
    return NextResponse.json(
      { status: 'not_ready', database: 'unavailable' },
      { status: 503 }
    );
  }
}
