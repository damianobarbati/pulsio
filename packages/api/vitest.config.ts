import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'vitest/config';

const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) loadEnvFile(envFile);

export default defineConfig({
  test: {
    testTimeout: 60_000,
    globalSetup: ['./vitest.global.ts'],
    setupFiles: ['./vitest.setup.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    maxConcurrency: 1,
    sequence: { shuffle: { files: true } },
    chaiConfig: { truncateThreshold: process.env.CI ? 40 : 0 },
    coverage: {
      reporter: ['text', 'json', 'html', 'cobertura'],
      reportsDirectory: '/tmp/coverage',
      skipFull: true,
      reportOnFailure: true,
      thresholds: { lines: 50, functions: 50, statements: 50, branches: 50 },
      exclude: ['**/vitest.*.ts', '**/dao/**', '**/*Seeder.ts'],
    },
    restoreMocks: true,
  },
});
