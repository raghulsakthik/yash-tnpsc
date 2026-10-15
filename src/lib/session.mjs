/**
 * Session token sign/verify — split out from auth.mjs so this file has no
 * node:crypto import. middleware.js runs in the Edge runtime, which can't
 * bundle node:crypto; the global Web Crypto `crypto.subtle` works in both
 * Node.js and Edge, so this is the one piece shared between middleware and
 * the route handlers. Password hashing (scrypt, genuinely Node-only) stays
 * in auth.mjs, which only route handlers ever import.
 */

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const encoder = new TextEncoder();

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toHex(signature);
}

/** @returns {Promise<string>} an opaque session token encoding learnerId + issuedAt */
export async function createSessionToken(learnerId) {
  const payload = `${learnerId}.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}

/** @returns {Promise<string|null>} the learnerId if the token is valid and unexpired, else null */
export async function verifySessionToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [learnerId, issuedAtStr, signature] = parts;
  const payload = `${learnerId}.${issuedAtStr}`;

  let expected;
  try {
    expected = await sign(payload);
  } catch {
    return null; // SESSION_SECRET not set — auth is off
  }
  if (signature.length !== expected.length || signature !== expected) return null;

  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > SESSION_MAX_AGE_MS) return null;

  return learnerId;
}

export function authEnabled() {
  return Boolean(process.env.SESSION_SECRET);
}
