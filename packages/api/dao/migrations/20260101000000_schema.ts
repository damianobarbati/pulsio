import fsp from 'node:fs/promises';
import type { Knex } from 'knex';
import { ch } from '#dao/ch.ts';

export const up = async (database: Knex) => {
  const pg_schema = await fsp.readFile(new URL('../pg-schema.sql', import.meta.url), 'utf8');
  await database.raw(pg_schema);

  const ch_schema = await fsp.readFile(new URL('../ch-schema.sql', import.meta.url), 'utf8');
  const queries = ch_schema.split(';').filter((query) => query.trim().length > 0);
  for (const query of queries) await ch.command({ query });
};

export const down = async (_database: Knex) => {};
