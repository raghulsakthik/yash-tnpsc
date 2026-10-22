import crypto from 'crypto';

// Pending Quick Lab questions live in memory only, keyed by a one-time
// token, so the client never sees the correct index until it submits an
// answer. Single-process, in-memory and short-lived by design -- this is a
// casual drill game, not exam content, so it doesn't need the durability
// (or the database round-trip) that real questions get.
const pending = new Map();
const TTL_MS = 2 * 60 * 1000;

function sweep() {
  const now = Date.now();
  for (const [token, entry] of pending) {
    if (entry.expiresAt < now) pending.delete(token);
  }
}

export function createPendingQuestion(correctIndex, { learnerId, mode } = {}) {
  sweep();
  const token = crypto.randomBytes(16).toString('hex');
  pending.set(token, { correctIndex, learnerId: learnerId ?? null, mode: mode ?? null, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function resolvePendingQuestion(token, { learnerId, mode } = {}) {
  const entry = pending.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    pending.delete(token);
    return null;
  }
  if (entry.learnerId && entry.learnerId !== learnerId) return null;
  if (entry.mode && entry.mode !== mode) return null;
  // Consume only after the caller has presented the right learner + mode.
  pending.delete(token);
  return entry;
}
