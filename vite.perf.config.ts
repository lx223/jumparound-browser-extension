import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import base from './vite.config';

// Build the same popup code in production mode with synthetic Chrome API data.
export default defineConfig({
  ...base,
  plugins: base.plugins!.filter(plugin => (plugin as { name?: string }).name !== 'inject-manifest-version'),
  build: {
    target: 'esnext',
    outDir: '.perf-dist',
    rollupOptions: { input: resolve(__dirname, 'scripts/perf.html') },
  },
});
