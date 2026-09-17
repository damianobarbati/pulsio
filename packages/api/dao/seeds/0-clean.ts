import type { Knex } from 'knex';
import type { QueryResult } from 'pg';
import ENV from '#api/env.ts';

export async function seed(database: Knex): Promise<void> {
  if (ENV.APP_ENV !== 'local') return console.log('Clean-up can only be run in the local environment, skipping.');

  const { rows } = await database.raw<QueryResult<{ tablename: string }>>("select tablename from pg_tables where schemaname = 'public'");
  const tables = rows.map((row) => row.tablename);
  const tables_to_preserve = ['knex_migrations', 'knex_migrations_lock'];
  const tables_to_remove = tables.filter((table) => !tables_to_preserve.includes(table));

  for (const table of tables_to_remove) {
    await database.raw(`truncate table "${table}" restart identity cascade`);
  }
}
