import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'vitest/config';

const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) loadEnvFile(envFile);

export default defineConfig({
  test: {
    testTimeout: 60_000, // 1min
    globalSetup: ['./vitest.global.ts'],
    setupFiles: ['./vitest.setup.ts'],
    fileParallelism: false,
    maxConcurrency: 1,
    sequence: { shuffle: { files: true } },
    chaiConfig: { truncateThreshold: process.env.CI ? 40 : 0 },
    coverage: {
      reporter: ['text', 'json', 'html', 'cobertura'],
      reportsDirectory: '/tmp/coverage',
      skipFull: true,
      reportOnFailure: true,
      thresholds: { lines: 1, functions: 1, statements: 1, branches: 1 },
      exclude: ['**/vitest.*.ts', '**/api/database/**'],
    },
    restoreMocks: true,
  },
});
