import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';
import type { Knex } from 'knex';
import type { IDomain } from 'types/Domain.ts';
import type { IEvent } from 'types/Event.ts';
import type { IUser } from 'types/User.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import { createDomainRow } from '#api/domain/DomainSeeder.ts';
import EventRepository from '#api/event/EventRepository.ts';
import { createClientEvent, createClientHeaders } from '#api/event/EventSeeder.ts';
import EventService from '#api/event/EventService.ts';
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
type DomainHistoryOptions = {
  days: number;
  sessions_per_day: number;
  weekly_growth_rate: number;
};

const JOHN_DOE_HISTORY: DomainHistoryOptions = { days: 180, sessions_per_day: 15, weekly_growth_rate: 0.01 };
const FOX_MULDER_HISTORY: DomainHistoryOptions = { days: 180, sessions_per_day: 10, weekly_growth_rate: 0.01 };

export async function seed(database: Knex): Promise<void> {
  const seed_present = await database('users').where({ id: JOHN_DOE.id }).first();
  if (seed_present) return;

  await initScript();

  const defaultUsersCreates = await Promise.all(defaultUsers.map(createUserRow));

  const userCreates = await Promise.all(Array.from({ length: USERS }, createUserRow));
  const users = await database('users')
    .insert([...defaultUsersCreates, ...userCreates])
    .returning<IUser.row[]>('*');

  await database('subscriptions').insert(users.map(({ id: user_id }) => ({ user_id, plan: user_id === JOHN_DOE.id ? 'solo' : 'free', recurrence: 'month', status: 'active' })));

  // 1-3 domains for each user
  const domains_rows: Partial<IDomain.row>[] = [];
  for (const user of users) {
    const domains = user.id === JOHN_DOE.id ? 3 : faker.number.int(DOMAINS_PER_USER);
    const rows: Partial<IDomain.row>[] = Array.from({ length: domains }, () => createDomainRow({ user_id: user.id }));
    domains_rows.push(...rows);
  }

  // john.doe has a lvh.me domain
  const johndoe_domain_row = domains_rows.find((row) => row.user_id === JOHN_DOE.id);
  if (johndoe_domain_row) johndoe_domain_row.domain = 'lvh.me';

  await DomainRepository.create(domains_rows);

  const default_domains = await DomainRepository.getem({ user_id$in: [JOHN_DOE.id, FOX_MULDER.id] });
  for (const domain of default_domains) {
    const options = domain.user_id === JOHN_DOE.id ? JOHN_DOE_HISTORY : FOX_MULDER_HISTORY;
    const events_rows = await createDomainHistory({ user_id: domain.user_id, domain: domain.domain, ...options });
    await EventRepository.createAll(events_rows);
  }
}

const createDomainView = async ({
  user_id,
  domain,
  headers,
  timestamp,
}: {
  user_id: string;
  domain: string;
  headers: ReturnType<typeof createClientHeaders>;
  timestamp: string;
}) => {
  const client_event = createClientEvent({
    user_id,
    event_name: 'view',
    timestamp,
    url: `https://${domain}${faker.helpers.arrayElement(['/', '/pricing', '/docs', '/blog'])}`,
  });
  const row = await EventService.createEventRow({ ...client_event, headers });
  return row;
};

const createDomainSession = async ({ user_id, domain, dayStart }: { user_id: string; domain: string; dayStart: Date }) => {
  const headers = createClientHeaders();
  const sessionStart = new Date(dayStart.getTime() + faker.number.int({ min: 0, max: 86_399_000 }));
  const pageviews = faker.number.int({ min: 1, max: 3 });
  const session_rows = await Promise.all(
    Array.from({ length: pageviews }, (_, pageviewIndex) => {
      const timestamp = new Date(sessionStart.getTime() + pageviewIndex * faker.number.int({ min: 5_000, max: 90_000 })).toISOString();
      return createDomainView({ user_id, domain, headers, timestamp });
    }),
  );
  const seeded_rows: IEvent.rowInsert[] = [...session_rows];
  const source_row = faker.helpers.arrayElement(session_rows);
  const source_timestamp = Date.parse(source_row.timestamp);

  if (faker.number.int({ min: 1, max: 20 }) === 1) {
    seeded_rows.push({
      ...source_row,
      id: randomUUID(),
      timestamp: new Date(source_timestamp + faker.number.int({ min: 1_000, max: 1_800_000 })).toISOString(),
      name: 'engagement',
      engagement_ms: faker.number.int({ min: 1_000, max: 1_800_000 }),
    });
  }

  if (faker.number.int({ min: 1, max: 10 }) === 1) {
    seeded_rows.push({
      ...source_row,
      id: randomUUID(),
      timestamp: new Date(source_timestamp + 10).toISOString(),
      name: 'interaction',
      interactive: 1,
      scroll_depth: faker.number.int({ min: 25, max: 100 }),
    });
  }

  if (faker.number.int({ min: 1, max: 20 }) === 1) {
    seeded_rows.push({
      ...source_row,
      id: randomUUID(),
      timestamp: new Date(source_timestamp + 20).toISOString(),
      name: faker.helpers.arrayElement(['signup', 'subscribe', 'trial start']),
      interactive: 1,
      scroll_depth: 100,
    });
  }

  if (faker.number.int({ min: 1, max: 50 }) === 1) {
    seeded_rows.push({
      ...source_row,
      id: randomUUID(),
      timestamp: new Date(source_timestamp + 30_000).toISOString(),
      name: 'purchase',
      interactive: 1,
      transaction_id: faker.string.nanoid(10),
      revenue_amount: faker.number.int({ min: 1_000, max: 25_000 }) / 100,
      revenue_currency: 'USD',
    });
  }

  return seeded_rows;
};

const createDomainHistory = async ({ user_id, domain, days, sessions_per_day, weekly_growth_rate }: DomainHistoryOptions & { user_id: string; domain: string }) => {
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);

  const seeded_rows: IEvent.rowInsert[] = [];
  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const dayStart = new Date(startDate.getTime() + dayIndex * 86_400_000);
    const weekIndex = Math.floor(dayIndex / 7);
    const growth = (1 + weekly_growth_rate) ** weekIndex;
    const dailyVariation = faker.number.int({ min: 80, max: 120 }) / 100;
    const sessions = Math.max(1, Math.round(sessions_per_day * growth * dailyVariation));

    const session_rows = await Promise.all(Array.from({ length: sessions }, () => createDomainSession({ user_id, domain, dayStart })));
    seeded_rows.push(...session_rows.flat());
  }

  return seeded_rows;
};
