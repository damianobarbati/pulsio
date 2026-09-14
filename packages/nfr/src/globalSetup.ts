import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

export default async () => {
  const envFile = new URL('../../../.env', import.meta.url);
  if (existsSync(envFile)) loadEnvFile(envFile);
};
