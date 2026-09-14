import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './src/globalSetup.ts',
    include: ['src/**/*.spec.ts'],
    fileParallelism: false,
    maxConcurrency: 1,
    testTimeout: 60_000,
  },
});
