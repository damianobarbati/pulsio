import { randomUUID } from 'node:crypto';
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
const DOMAINS_PER_USER = { min: 1, max: 3 };
const EVENTS_PER_DOMAIN = { min: 2, max: 5_000 };

export async function seed(database: Knex): Promise<void> {
  const seed_present = await database('users').where({ id: JOHN_DOE.id }).first();
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

  // 1-3 domains for each user
  const domains_rows: Partial<DomainRow>[] = [];
  for (const user of users) {
    const rows: Partial<DomainRow>[] = Array.from({ length: faker.number.int(DOMAINS_PER_USER) }, (_, index) =>
      createDomainRow({ user_id: user.id, ...(user.id === JOHN_DOE.id && index === 0 ? { domain: 'lvh.me' } : {}) }),
    );
    if (rows.length) domains_rows.push(...rows);
  }
  const domains = await database('domains').insert(domains_rows).returning<DomainRow[]>('*');

  // 2 to 5k events for each domain
  const events_rows: EventRowInsert[] = [];
  for (const { user_id, domain } of domains) {
    const rows: EventRowInsert[] = await Promise.all(Array.from({ length: faker.number.int(EVENTS_PER_DOMAIN) }, () => createEventRow({ user_id, url: `https://${domain}/` })));

    // starting from a random date in last 3y
    const startDate = faker.date.recent({ days: 365 * 2 });
    const startTime = startDate.getTime();
    const endTime = Date.now();
    const seeded_rows: EventRowInsert[] = [];

    // make the timeseries of events realistic
    const interval = rows.length > 1 ? (endTime - startTime) / (rows.length - 1) : 0;
    for (const [index, event_row] of rows.entries()) {
      // by default, all events are page views
      event_row.event_name = 'view';
      // consecutive events in the timespan at regular intervals
      event_row.timestamp = new Date(startTime + index * interval).toISOString();
      event_row.interactive = 0;
      event_row.engagement_ms = 0;
      event_row.transaction_id = '';
      event_row.revenue_amount = null;
      event_row.revenue_currency = '';
      seeded_rows.push(event_row);

      // 5% of page views will have engagement event with activity between 1s and 30min
      if (faker.number.int({ min: 1, max: 20 }) === 1) {
        const engagement_ms = faker.number.int({ min: 1_000, max: 1_800_000 });
        const timestamp = new Date(Date.parse(event_row.timestamp) + engagement_ms).toISOString();
        const activity_event_row: EventRowInsert = {
          ...event_row,
          id: randomUUID(),
          timestamp,
          event_name: 'engagement',
          interactive: 0,
          engagement_ms,
        };
        seeded_rows.push(activity_event_row);
      }
      // 2% of page views will have transaction event with revenue between $0.01 and $500
      else if (faker.number.int({ min: 1, max: 50 }) === 1) {
        const timestamp = new Date(Date.parse(event_row.timestamp) + 30_000).toISOString();
        const revenue_amount = faker.number.int({ min: 1, max: 50_000 }) / 100;
        const revenue_currency = 'USD';
        const transaction_event_row: EventRowInsert = {
          ...event_row,
          id: randomUUID(),
          timestamp,
          event_name: 'purchase',
          interactive: 1,
          transaction_id: faker.string.nanoid(10),
          revenue_amount,
          revenue_currency,
        };
        seeded_rows.push(transaction_event_row);
      }
    }

    events_rows.push(...seeded_rows);
  }
  await EventRepository.createAll(events_rows);
}
