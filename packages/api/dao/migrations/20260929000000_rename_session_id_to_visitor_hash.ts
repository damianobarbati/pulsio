import type { Knex } from 'knex';
import { ch } from '#dao/ch.ts';

export const up = async (_database: Knex) => {
  await ch.command({ query: 'ALTER TABLE events RENAME COLUMN IF EXISTS session_id TO visitor_hash' });
};

export const down = async (_database: Knex) => {};
