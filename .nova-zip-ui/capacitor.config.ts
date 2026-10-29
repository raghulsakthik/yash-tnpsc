import type { CapacitorConfig } from '@capacitor/cli';

// The web app's session is an httpOnly cookie (see src/lib/auth.mjs on the
// server) with SameSite=Lax. A WebView loading this bundle from its own
// local origin would be a cross-site caller to the real API host, and Lax
// cookies aren't sent on cross-site requests -- normally that means no
// session ever persists. CapacitorHttp routes fetch()/XHR through native
// networking instead of the WebView's own network stack, which carries
// cookies via its own cookie jar and isn't subject to the browser's
// same-site policy at all. That's what makes auth work here without
// loosening the cookie's SameSite on the server (which would weaken CSRF
// protection for the real web app too, not just this build).
const config: CapacitorConfig = {
  appId: 'com.nova.tnpsc',
  appName: 'YASH',
  webDir: 'dist-android',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
