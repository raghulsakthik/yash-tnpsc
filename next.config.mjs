/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse and mammoth ship CJS/ESM interop that breaks when webpack
  // bundles them; pdfjs-dist and @napi-rs/canvas (page-image rendering for
  // diagram-dependent questions) ship native/wasm bits webpack can't
  // bundle either. Let Next require all of these straight from
  // node_modules at runtime instead.
  serverExternalPackages: ['pdf-parse', 'mammoth', 'pdfjs-dist', '@napi-rs/canvas'],
};

export default nextConfig;
