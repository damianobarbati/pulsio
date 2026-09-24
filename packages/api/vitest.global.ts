import { ch } from '#dao/ch.ts';
import { pg } from '#dao/pg.ts';
import { seed as cleanup } from '#dao/seeds/0-cleanup.ts';
import { seed as seedUsers } from '#dao/seeds/2-users.ts';
import { cache } from './dao/cache.ts';

export const setup = async () => {
  await cleanup(pg);
  await seedUsers(pg);
};

export const teardown = async () => {
  await ch.close();
  await pg.destroy();
  await cache.flushall();
  await cache.quit();
};
