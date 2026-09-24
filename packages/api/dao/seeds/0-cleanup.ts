import type { Knex } from 'knex';
import type { QueryResult } from 'pg';
import ENV from '#api/env.ts';
import { ch } from '#dao/ch.ts';

export async function seed(database: Knex): Promise<void> {
  if (ENV.APP_ENV !== 'local') throw new Error('Clean-up can only be run in the local environment, skipping.');

  const seed_present = await database('users').first();
  if (seed_present) return console.log('Skipping seeding...');

  // postgres
  const { rows } = await database.raw<QueryResult<{ tablename: string }>>("select tablename from pg_tables where schemaname = 'public'");
  const pg_tables = rows.map((row) => row.tablename);
  const tables_to_preserve = ['knex_migrations', 'knex_migrations_lock'];
  for (const table of pg_tables.filter((table) => !tables_to_preserve.includes(table))) {
    await database.raw(`truncate table "${table}" restart identity cascade`);
  }

  // clickhouse
  const result = await ch.query({ query: 'SELECT name FROM system.tables WHERE database = currentDatabase()', format: 'JSONEachRow' });
  const ch_tables = await result.json<{ name: string }>();
  for (const { name } of ch_tables) {
    await ch.command({ query: `TRUNCATE TABLE ${name}` });
  }
}
