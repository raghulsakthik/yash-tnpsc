import { query } from './db.mjs';

/**
 * Distributed, database-backed fixed-window rate limiting.
 * PostgreSQL is already the system of record, so this works across all web
 * instances without an in-memory counter. Redis can replace this adapter
 * later if throughput requires it without changing route call sites.
 */
export async function checkRateLimit({ key, limit, windowSeconds }) {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const expiresAt = new Date(windowStart.getTime() + windowSeconds * 1000);
  const { rows } = await query(`
    INSERT INTO api_rate_limit_bucket (bucket_key, window_start, request_count, expires_at)
    VALUES ($1, $2, 1, $3)
    ON CONFLICT (bucket_key) DO UPDATE
      SET request_count = CASE
            WHEN api_rate_limit_bucket.window_start = EXCLUDED.window_start
              THEN api_rate_limit_bucket.request_count + 1
            ELSE 1
          END,
          window_start = EXCLUDED.window_start,
          expires_at = EXCLUDED.expires_at,
          updated_at = now()
    RETURNING request_count, expires_at`,
    [key, windowStart, expiresAt]
  );
  const row = rows[0];
  const allowed = row.request_count <= limit;
  if (Math.random() < 0.01) {
    await query('DELETE FROM api_rate_limit_bucket WHERE expires_at < now()').catch(() => {});
  }
  return { allowed, remaining: Math.max(0, limit - row.request_count), retryAfterSeconds: Math.max(1, Math.ceil((new Date(row.expires_at).getTime() - now.getTime()) / 1000)) };
}
