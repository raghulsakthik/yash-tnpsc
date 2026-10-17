/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse and mammoth ship CJS/ESM interop that breaks when webpack
  // bundles them; let Next require them straight from node_modules at
  // runtime instead.
  serverExternalPackages: ['pdf-parse', 'mammoth'],
};

export default nextConfig;
