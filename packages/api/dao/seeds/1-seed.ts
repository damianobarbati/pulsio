import { faker } from '@faker-js/faker';
import type { Knex } from 'knex';
import type { DomainRow } from 'types/Domain.ts';
import type { EventRowInsert } from 'types/Event.ts';
import type { UserRow } from 'types/User.ts';
import { createDomainRow } from '#api/domain/DomainSeeder.ts';
import EventRepository from '#api/event/EventRepository.ts';
import { createEventRow } from '#api/event/EventSeeder.ts';
import { createUserRow } from '#api/user/UserSeeder.ts';

export const JOHN_DOE = {
  id: '01a0af49-49a7-7c68-8b35-12a3e7804984',
  email: 'john.doe@gmail.com',
};

const USERS = 50;
const DOMAINS_PER_USER = { min: 0, max: 3 };
const EVENTS_PER_DOMAIN = { min: 2, max: 5_000 };

export async function seed(database: Knex): Promise<void> {
  const seed_present = await database('users').first();
  if (seed_present) return console.log('Skipping seeding...');

  await database('plans').insert([
    { name: 'start', monthly_price: 5, yearly_price: 49, valid_from: new Date('2020-01-01T00:00:00Z') },
    { name: 'grow', monthly_price: 19, yearly_price: 199, valid_from: new Date('2020-01-01T00:00:00Z') },
    { name: 'scale', monthly_price: 99, yearly_price: 999, valid_from: new Date('2020-01-01T00:00:00Z') },
  ]);

  const johndoe = await createUserRow({ ...JOHN_DOE });

  const userCreates = await Promise.all(Array.from({ length: USERS }, createUserRow));
  const users = await database('users')
    .insert([johndoe, ...userCreates])
    .returning<UserRow[]>('*');

  // 0-10 domains for each user
  const domains_rows: Partial<DomainRow>[] = [];
  for (const user of users) {
    const rows: Partial<DomainRow>[] = Array.from({ length: faker.number.int(DOMAINS_PER_USER) }, () => createDomainRow({ user_id: user.id }));
    if (rows.length) domains_rows.push(...rows);
  }
  const domains = await database('domains').insert(domains_rows).returning<DomainRow[]>('*');

  // 0 to 5k events for each domain
  const events_rows: EventRowInsert[] = [];
  for (const { id, domain } of domains) {
    const rows: EventRowInsert[] = await Promise.all(Array.from({ length: faker.number.int(EVENTS_PER_DOMAIN) }, () => createEventRow({ user_id: id, url: `https://${domain}/` })));

    // starting from a random date in last 3y
    const startDate = faker.date.recent({ days: 365 * 2 });
    const startTime = startDate.getTime();
    const endTime = Date.now();

    // consecutive events in the timespan at regular intervals
    const interval = rows.length > 1 ? (endTime - startTime) / (rows.length - 1) : 0;
    for (const [index, event_row] of Object.entries(rows)) {
      const eventTime = new Date(startTime + Number(index) * interval);
      event_row.timestamp = eventTime.toISOString();

      if (Number(index) === rows.length - 1) event_row.event_name = 'view';

      // 2% events will be transactions with revenue
      if (Number(index) !== rows.length - 1 && faker.number.int({ min: 1, max: 50 }) === 1) {
        const revenue_amount = faker.number.int({ min: 0.01, max: 500 });
        const revenue_currency = 'USD';
        Object.assign(event_row, { event_name: 'purchase', transaction_id: faker.string.nanoid(10), revenue_amount, revenue_currency });
      }
    }
    events_rows.push(...rows);
  }
  await EventRepository.createAll(events_rows);
}
