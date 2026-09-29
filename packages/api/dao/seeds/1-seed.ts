import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';
import type { Knex } from 'knex';
import type { IDomain } from 'types/Domain.ts';
import type { IEvent } from 'types/Event.ts';
import type { IUser } from 'types/User.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import { createDomainRow } from '#api/domain/DomainSeeder.ts';
import EventRepository from '#api/event/EventRepository.ts';
import { createEventRow } from '#api/event/EventSeeder.ts';
import { createUserRow } from '#api/user/UserSeeder.ts';
import { initScript } from '../../scripts/init.ts';

const defaultUsers = [
  {
    id: '01a0af49-49a7-7c68-8b35-12a3e7804984',
    email: 'john.doe@gmail.com',
  },
  {
    id: '01a0e80e-8409-7649-a5ae-01f82be03c60',
    email: 'fox.mulder@gmail.com',
  },
  {
    id: '01a0e80e-8409-7649-a5ae-0713a0acb899',
    email: 'sarah.connor@gmail.com',
  },

  {
    id: '01a0e80e-b311-747a-ac36-7b3b8c53f417',
    email: 'ellen.ripley@gmail.com',
  },
];

export const JOHN_DOE = defaultUsers[0];
export const FOX_MULDER = defaultUsers[1];

const USERS = 50;
const DOMAINS_PER_USER = { min: 1, max: 3 };
const EVENTS_PER_DOMAIN = { min: 2, max: 5_000 };

export async function seed(database: Knex): Promise<void> {
  const seed_present = await database('users').where({ id: JOHN_DOE.id }).first();
  if (seed_present) return;

  await initScript();

  const defaultUsersCreates = await Promise.all(defaultUsers.map(createUserRow));

  const userCreates = await Promise.all(Array.from({ length: USERS }, createUserRow));
  const users = await database('users')
    .insert([...defaultUsersCreates, ...userCreates])
    .returning<IUser.row[]>('*');

  await database('subscriptions').insert(users.map(({ id: user_id }) => ({ user_id, plan: 'free', recurrence: 'month', status: 'active' })));

  // 1-3 domains for each user
  const domains_rows: Partial<IDomain.row>[] = [];
  for (const user of users) {
    const rows: Partial<IDomain.row>[] = Array.from({ length: faker.number.int(DOMAINS_PER_USER) }, () => createDomainRow({ user_id: user.id }));
    domains_rows.push(...rows);
  }

  // john.doe has a lvh.me domain
  const johndoe_domain_row = domains_rows.find((row) => row.user_id === JOHN_DOE.id);
  if (johndoe_domain_row) johndoe_domain_row.domain = 'lvh.me';

  await DomainRepository.create(domains_rows);

  // 2 to 5k events for each domain of John Doe and Fox Mulder
  const userIds = defaultUsers.map((u) => u.id);
  const default_domains = await DomainRepository.getem({ user_id$in: userIds });
  for (const domain of default_domains) {
    const events_rows = await createDomainData(domain.user_id, domain.domain);
    await EventRepository.createAll(events_rows);
  }
}

const createDomainData = async (user_id: string, domain: string) => {
  const rows: IEvent.rowInsert[] = await Promise.all(Array.from({ length: faker.number.int(EVENTS_PER_DOMAIN) }, () => createEventRow({ user_id, url: `https://${domain}/` })));

  // starting from a random date in last 3y
  const startDate = faker.date.recent({ days: 365 * 2 });
  const startTime = startDate.getTime();
  const endTime = Date.now();
  const seeded_rows: IEvent.rowInsert[] = [];

  // make the timeseries of events realistic
  const interval = rows.length > 1 ? (endTime - startTime) / (rows.length - 1) : 0;
  for (const [index, event_row] of rows.entries()) {
    // by default, all events are page views
    event_row.name = 'view';
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
      const activity_event_row: IEvent.rowInsert = {
        ...event_row,
        id: randomUUID(),
        timestamp,
        name: 'engagement',
        interactive: 0,
        engagement_ms,
      };
      seeded_rows.push(activity_event_row);
    }

    // 5% of page views will have 1 of 3 custom events
    if (faker.number.int({ min: 1, max: 20 }) === 1) {
      const timestamp = new Date(Date.parse(event_row.timestamp) + 10).toISOString();
      const activity_event_row: IEvent.rowInsert = {
        ...event_row,
        id: randomUUID(),
        timestamp,
        name: faker.helpers.arrayElement(['hero click', 'more info', 'subscribe', 'trial start']),
      };
      seeded_rows.push(activity_event_row);
    }

    // 2% of page views will have transaction event with revenue between $0.01 and $500
    if (faker.number.int({ min: 1, max: 50 }) === 1) {
      const timestamp = new Date(Date.parse(event_row.timestamp) + 30_000).toISOString();
      const revenue_amount = faker.number.int({ min: 1, max: 50_000 }) / 100;
      const revenue_currency = 'USD';
      const transaction_event_row: IEvent.rowInsert = {
        ...event_row,
        id: randomUUID(),
        timestamp,
        name: 'purchase',
        interactive: 1,
        transaction_id: faker.string.nanoid(10),
        revenue_amount,
        revenue_currency,
      };
      seeded_rows.push(transaction_event_row);
    }
  }

  return seeded_rows;
};
