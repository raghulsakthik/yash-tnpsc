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
  // pdf-parse (via pdfjs-dist) loads its worker as a separate .mjs file at
  // runtime through a dynamically-constructed path, which Vercel's build
  // tracer can't follow statically -- without this, the deployed function
  // is missing the file entirely and every PDF extraction fails with
  // "Setting up fake worker failed: Cannot find module .../pdf.worker.mjs"
  // the moment it's actually called (serverExternalPackages above only
  // stops webpack from bundling these packages; it doesn't make the
  // tracer follow their dynamic imports).
  outputFileTracingIncludes: {
    '/api/admin/content/process/**': [
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdf-parse/dist/worker/pdf.worker.mjs',
    ],
    '/api/admin/content/process': [
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdf-parse/dist/worker/pdf.worker.mjs',
    ],
    '/api/admin/content/classify': [
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdf-parse/dist/worker/pdf.worker.mjs',
    ],
    '/api/admin/retrieval/resources/[id]/analyze': [
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdf-parse/dist/worker/pdf.worker.mjs',
    ],
  },
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
