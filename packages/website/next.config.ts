import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import type { NextConfig } from 'next';
import { z } from 'zod';

const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) loadEnvFile(envFile);

z.object({
  API_URL: z.url(),
  WEBSITE_URL: z.url(),
}).parse(process.env);

const config: NextConfig = {
  env: {
    API_URL: process.env.API_URL,
    WEBSITE_URL: process.env.WEBSITE_URL,
  },
};

export default config;
