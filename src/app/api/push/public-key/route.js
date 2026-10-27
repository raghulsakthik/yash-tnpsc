import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/push/public-key -- the VAPID public key, safe to expose (that's
 * the point of a "public" key; the private key never leaves the server).
 * Lets the frontend subscribe to push without needing its own copy baked
 * in at build time -- the nova-ui bundle (a separate Vite build, embedded
 * as a static asset) has no access to this app's Next.js env vars
 * otherwise.
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null;
  return NextResponse.json({ publicKey });
}
