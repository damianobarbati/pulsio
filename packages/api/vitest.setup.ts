import { once } from 'node:events';
import { promisify } from 'node:util';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { cache } from './dao/cache.ts';
import { clickhouse } from './dao/clickhouse.ts';
import { database } from './dao/database.ts';
import { server } from './src/index.ts';

beforeEach(async () => {
  await database.raw('truncate accounts cascade');
  await clickhouse.command({ query: 'TRUNCATE TABLE events' });
  await cache.flushall();
});

export let baseUrl: string;

beforeAll(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing HTTP server address');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await promisify(server.close.bind(server))();
  await database.destroy();
  await clickhouse.close();
  await cache.quit();
});
