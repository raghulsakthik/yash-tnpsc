import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Separate build target for the native Android app (wrapped via Capacitor,
// see android-shell/capacitor.config.ts). Builds android.html (mounting
// src/android-app/main.tsx -> AndroidAppShell) into dist-android/, served
// from the device's local filesystem rather than a web server, hence the
// relative base. The ordinary `vite build` (vite.config.ts, index.html)
// is untouched and keeps building the browser/Next.js-iframed app.
export default defineConfig(() => {
  return {
    base: './',
    define: {
      // Baked in at build time -- the packaged app has no Next.js host of
      // its own to resolve relative /api/* paths against, so every
      // novaApi call needs the real production origin. Override with
      // `VITE_API_BASE_URL=... npm run build:android` for a staging build.
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        process.env.VITE_API_BASE_URL || 'https://frontend-startup-c3cb19.vercel.app'
      ),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist-android',
      rollupOptions: {
        input: path.resolve(__dirname, 'android.html'),
      },
    },
  };
});
