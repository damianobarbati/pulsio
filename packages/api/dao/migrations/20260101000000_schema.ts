import fsp from 'node:fs/promises';
import type { Knex } from 'knex';
import { clickhouse } from '#dao/clickhouse.ts';

export const up = async (database: Knex) => {
  await database.raw(await fsp.readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
  await clickhouse.command({ query: await fsp.readFile(new URL('../clickhouse.sql', import.meta.url), 'utf8') });
};

export const down = async (_database: Knex) => {};
