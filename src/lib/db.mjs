import pg from 'pg';

// One pool for the process. Next.js reloads modules in dev, so the pool is
// stashed on globalThis to avoid leaking a connection pool per hot reload.
const globalForPg = globalThis;

export const pool =
  globalForPg.__novaPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== 'production') globalForPg.__novaPool = pool;

/** @param {string} text @param {Array<unknown>} params */
export function query(text, params) {
  return pool.query(text, params);
}

export const LEARNER_ID =
  process.env.NOVA_LEARNER_ID ?? '00000000-0000-0000-0000-000000000001';

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
