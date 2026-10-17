/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse ships a CJS/ESM interop that breaks when webpack bundles it;
  // let Next require it straight from node_modules at runtime instead.
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
