import pg from 'pg';

// pg's default DATE parser (OID 1082) returns a JS Date anchored at LOCAL
// midnight for the given date string. Calling .toISOString() on that then
// shifts it back a calendar day in any positive-UTC-offset timezone (this
// server runs in Asia/Kolkata, +05:30) -- a real question answered "today"
// silently gets attributed to "yesterday" everywhere a DATE column is
// read. Keeping DATE columns as plain 'YYYY-MM-DD' strings sidesteps the
// whole class of bug; every query that casts to ::date already produces
// that format, so this is a no-op transform, not a reformat.
pg.types.setTypeParser(1082, (value) => value);

// One pool for the process. Next.js reloads modules in dev, so the pool is
// stashed on globalThis to avoid leaking a connection pool per hot reload.
const globalForPg = globalThis;

export const pool =
  globalForPg.__appPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== 'production') globalForPg.__appPool = pool;

/** @param {string} text @param {Array<unknown>} params */
export function query(text, params) {
  return pool.query(text, params);
}

export const LEARNER_ID =
  process.env.APP_LEARNER_ID ?? '00000000-0000-0000-0000-000000000001';

/** Append an analytics event. Never read by the learning engine. */
export async function recordEvent(learnerId, event, topicId = null, metadata = {}) {
  try {
    await query(
      'INSERT INTO learning_event (learner_id, event, topic_id, metadata) VALUES ($1, $2, $3, $4)',
      [learnerId, event, topicId, metadata]
    );
  } catch {
    // Analytics must never break learning.
  }
}
