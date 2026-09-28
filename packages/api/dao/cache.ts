import { Redis } from 'ioredis';
import ENV from '#api/env.ts';
export const cache = new Redis(ENV.CACHE_URI);
await cache.ping();
