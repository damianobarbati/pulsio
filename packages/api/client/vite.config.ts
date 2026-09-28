import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: { entry: 'client/client.ts', formats: ['iife'], name: 'client', fileName: () => 'client.dist.js' },
    outDir: 'client',
  },
});
