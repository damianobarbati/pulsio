import type { Knex } from 'knex';

export const seed = async (database: Knex) => {
  const seed_present = await database('users').first();
  if (seed_present) return console.log('Skipping seeding...');

  await database('plans').insert([
    { name: 'start', monthly_price: 5, yearly_price: 49, valid_from: new Date('2020-01-01T00:00:00Z') },
    { name: 'grow', monthly_price: 19, yearly_price: 199, valid_from: new Date('2020-01-01T00:00:00Z') },
    { name: 'scale', monthly_price: 99, yearly_price: 999, valid_from: new Date('2020-01-01T00:00:00Z') },
  ]);
};
