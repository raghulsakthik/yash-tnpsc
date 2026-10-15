import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export { createSessionToken, verifySessionToken, authEnabled } from './session.mjs';

/**
 * Password hashing — node:crypto's scrypt, genuinely Node-only (no
 * dependency, but not Edge-portable). Only ever imported by route
 * handlers (Node.js runtime by default), never by middleware.js — see
 * session.mjs for why that split exists.
 */

const SCRYPT_KEYLEN = 64;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [salt, derivedHex] = storedHash.split(':');
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  const stored = Buffer.from(derivedHex, 'hex');
  return derived.length === stored.length && timingSafeEqual(derived, stored);
}
