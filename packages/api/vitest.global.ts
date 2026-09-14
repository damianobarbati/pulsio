import fsp from 'node:fs/promises';
import { cache } from './dao/cache.ts';
import { clickhouse } from './dao/clickhouse.ts';
import { database } from './dao/database.ts';

export const setup = async () => {
  await clickhouse.command({ query: await fsp.readFile('./dao/clickhouse.sql', 'utf8') });
  await database.raw(await fsp.readFile('./dao/schema.sql', 'utf8'));
  await cache.flushall();
};

export const teardown = async () => {
  await clickhouse.command({ query: 'TRUNCATE TABLE events' });
  await clickhouse.close();
  await database.raw('truncate accounts cascade');
  await database.destroy();
  await cache.flushall();
  await cache.quit();
};
