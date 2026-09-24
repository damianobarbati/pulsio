import { ch } from '#dao/ch.ts';
import { pg } from '#dao/pg.ts';
import { seed } from '#dao/seeds/1-seed.ts';
import { cache } from './dao/cache.ts';

export const setup = async () => {
  const existingUser = await pg('users').first();
  if (!existingUser) await seed(pg);
};

export const teardown = async () => {
  await ch.close();
  await pg.destroy();
  await cache.quit();
};
