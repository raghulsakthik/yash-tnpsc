/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(isProduction
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  // pdf-parse and mammoth ship CJS/ESM interop that breaks when webpack
  // bundles them; pdfjs-dist and @napi-rs/canvas ship native/wasm bits
  // webpack can't bundle either. Let Next require these at runtime.
  serverExternalPackages: ['pdf-parse', 'mammoth', 'pdfjs-dist', '@napi-rs/canvas'],
  async headers() {
    // /nova-ui/* is the dashboard's own static bundle, intentionally
    // self-embedded via <iframe> by src/app/page.js (same origin only) --
    // DENY there would block the app's own dashboard from ever rendering.
    const nonFrameHeaders = securityHeaders.filter((h) => h.key !== 'X-Frame-Options');
    return [
      { source: '/((?!nova-ui/).*)', headers: securityHeaders },
      {
        source: '/nova-ui/:path*',
        headers: [...nonFrameHeaders, { key: 'X-Frame-Options', value: 'SAMEORIGIN' }, { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" }],
      },
    ];
  },
};

export default nextConfig;
