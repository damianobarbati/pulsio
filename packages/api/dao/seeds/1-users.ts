import { faker } from '@faker-js/faker';
import type { Knex } from 'knex';
import type { PageViewRowInsert } from 'types/event.ts';
import type { Plan } from 'types/payment.ts';
import { AccountRepository } from '#api/accounts/AccountRepository.ts';
import { AccountService } from '#api/accounts/AccountService.ts';
import ENV from '#api/env.ts';
import { clickhouse } from '../clickhouse.ts';

const JOHN_DOE_ID = '01a0af49-49a7-7c68-8b35-12a3e7804984';

const userCount = 100;
const extraDomainsPerUser = { min: 0, max: 3 };
const eventsPerDomain = 250;
const eventChunkSize = 10_000;
const paths = ['/', '/pricing', '/features', '/about', '/blog', '/contact'];
const referrers = ['', 'https://www.google.com/search?q=analytics', 'https://news.ycombinator.com/', 'https://www.linkedin.com/feed/'];
const userAgents = [
  { browser: 'Chrome', browser_version: '131.0', os: 'Mac OS', os_version: '14.0', device: 'Desktop' },
  { browser: 'Safari', browser_version: '18.0', os: 'iOS', os_version: '18.0', device: 'Mobile' },
  { browser: 'Firefox', browser_version: '133.0', os: 'Windows', os_version: '11', device: 'Desktop' },
];

type SeedSite = { id: string; domain: string };
type SeedAccount = { id: string };

const planAmounts: Record<Plan, number> = { start: 400, grow: 1000, scale: 3000, expand: 5000 };

const monthsAgo = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
};

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60_000);

const seedPayment = async ({ database, accountId, plan, month, index }: { database: Knex; accountId: string; plan: Plan; month: number; index: number }) => {
  const createdAt = monthsAgo(month);
  await database('payments').insert({
    account_id: accountId,
    amount: planAmounts[plan],
    currency: 'EUR',
    status: 'paid',
    provider: 'stripe',
    provider_reference: `in_seed_${accountId}_${index}`,
    invoice_url: `https://invoice.stripe.com/i/seed-${accountId}-${index}`,
    created_at: createdAt,
    updated_at: createdAt,
  });
};

const seedExpiredTrials = async ({ database, accounts }: { database: Knex; accounts: SeedAccount[] }) => {
  for (const account of accounts) {
    const trialEndedMonthsAgo = faker.number.int({ min: 1, max: 14 });
    const trialEndsAt = monthsAgo(trialEndedMonthsAgo);
    const createdAt = monthsAgo(trialEndedMonthsAgo + 1);
    await database('accounts').where({ id: account.id }).update({ created_at: createdAt, updated_at: trialEndsAt, trial_ends_at: trialEndsAt });
    await database('subscriptions').where({ account_id: account.id }).update({ status: 'canceled', current_period_ends_at: trialEndsAt, updated_at: trialEndsAt });
  }
};

const seedActiveSubscriptions = async ({ database, accounts }: { database: Knex; accounts: SeedAccount[] }) => {
  for (const account of accounts) {
    const paidMonths = faker.number.int({ min: 1, max: 14 });
    const plan = faker.helpers.arrayElement<Plan>(['start', 'grow', 'scale']);
    const trialEndsAt = monthsAgo(paidMonths);
    const createdAt = monthsAgo(paidMonths + 1);
    await database('accounts').where({ id: account.id }).update({ created_at: createdAt, updated_at: new Date(), trial_ends_at: trialEndsAt });
    await database('subscriptions')
      .where({ account_id: account.id })
      .update({
        plan,
        status: 'active',
        stripe_customer_id: `cus_seed_${account.id}`,
        stripe_subscription_id: `sub_seed_${account.id}`,
        current_period_ends_at: daysFromNow(faker.number.int({ min: 3, max: 28 })),
        updated_at: new Date(),
      });
    for (let month = paidMonths; month > 0; month -= 1) await seedPayment({ database, accountId: account.id, plan, month, index: month });
  }
};

const seedUpgradedSubscriptions = async ({ database, accounts }: { database: Knex; accounts: SeedAccount[] }) => {
  for (const account of accounts) {
    const startMonths = faker.number.int({ min: 2, max: 6 });
    const growMonths = faker.number.int({ min: 1, max: 8 });
    const paidMonths = startMonths + growMonths;
    const trialEndsAt = monthsAgo(paidMonths);
    const createdAt = monthsAgo(paidMonths + 1);
    await database('accounts').where({ id: account.id }).update({ created_at: createdAt, updated_at: new Date(), trial_ends_at: trialEndsAt });
    await database('subscriptions')
      .where({ account_id: account.id })
      .update({
        plan: 'grow',
        status: 'active',
        stripe_customer_id: `cus_seed_${account.id}`,
        stripe_subscription_id: `sub_seed_${account.id}`,
        current_period_ends_at: daysFromNow(faker.number.int({ min: 3, max: 28 })),
        updated_at: new Date(),
      });
    for (let month = paidMonths; month > growMonths; month -= 1) await seedPayment({ database, accountId: account.id, plan: 'start', month, index: month });
    for (let month = growMonths; month > 0; month -= 1) await seedPayment({ database, accountId: account.id, plan: 'grow', month, index: month });
  }
};

const generateEvent = ({ site, index }: { site: SeedSite; index: number }): PageViewRowInsert => {
  const path = paths[index % paths.length];
  const userAgent = userAgents[index % userAgents.length];
  const timestamp = new Date(Date.now() - ((index * 17) % (30 * 24 * 60)) * 60_000).toISOString();
  return {
    timestamp,
    site_id: site.id,
    event_name: index % 7 === 0 ? 'signup' : 'pv',
    protocol_version: '1',
    fingerprint: `seed-visitor-${index % 80}`,
    url: `https://${site.domain}${path}`,
    domain: site.domain,
    path,
    query: '',
    referrer: referrers[index % referrers.length] || null,
    screen_width: userAgent.device === 'Mobile' ? 390 : 1440,
    language: 'en-US',
    timezone: 'Europe/Rome',
    page_id: `${site.id}-${path}`,
    interactive: 1,
    engagement_ms: 800 + (index % 12) * 350,
    scroll_depth: index % 4 === 0 ? 75 : null,
    props: { seed: 'true' },
    browser: userAgent.browser,
    browser_version: userAgent.browser_version,
    os: userAgent.os,
    os_version: userAgent.os_version,
    device: userAgent.device,
    country: index % 3 === 0 ? 'IT' : index % 3 === 1 ? 'US' : 'DE',
    region: '(not set)',
    city: '(not set)',
    source: referrers[index % referrers.length] ? 'google.com' : 'Direct / None',
    channel: referrers[index % referrers.length] ? 'Organic Search' : 'Direct',
  };
};

const insertEvents = async (sites: SeedSite[]) => {
  for (let offset = 0; offset < sites.length * eventsPerDomain; offset += eventChunkSize) {
    const events = sites.flatMap((site, siteIndex) => {
      const siteOffset = siteIndex * eventsPerDomain;
      const start = Math.max(0, offset - siteOffset);
      const end = Math.min(eventsPerDomain, offset + eventChunkSize - siteOffset);
      return end > start ? Array.from({ length: end - start }, (_, index) => generateEvent({ site, index: start + index })) : [];
    });
    if (events.length) await clickhouse.insert({ table: 'events', values: events, format: 'JSONEachRow' });
  }
};

export const seed = async (database: Knex) => {
  if (ENV.APP_ENV !== 'local') return console.log('User seed can only be run in the local environment, skipping.');

  faker.seed(20260916);
  await clickhouse.command({ query: 'TRUNCATE TABLE events' });
  await database('plans').insert([
    { name: 'start', monthly_price: 4, yearly_price: 38.4, valid_from: new Date('2020-01-01T00:00:00Z') },
    { name: 'grow', monthly_price: 10, yearly_price: 96, valid_from: new Date('2020-01-01T00:00:00Z') },
    { name: 'scale', monthly_price: 30, yearly_price: 288, valid_from: new Date('2020-01-01T00:00:00Z') },
    { name: 'expand', monthly_price: 99, yearly_price: 950.4, valid_from: new Date('2020-01-01T00:00:00Z') },
  ]);

  const registrations = await Promise.all([
    AccountService.register({ id: JOHN_DOE_ID, email: 'john.doe@gmail.com', password: 'john.doe@gmail.com', domain: 'localtest.me' }),
    ...Array.from({ length: userCount }, async () => {
      const email = faker.internet.email().toLowerCase();
      return AccountService.register({ email, password: email, domain: faker.internet.domainName() });
    }),
  ]);
  await seedExpiredTrials({ database, accounts: registrations.slice(1, 13).map(({ account }) => account) });
  await seedActiveSubscriptions({ database, accounts: registrations.slice(13, 37).map(({ account }) => account) });
  await seedUpgradedSubscriptions({ database, accounts: registrations.slice(37, 49).map(({ account }) => account) });
  const sites: SeedSite[] = [];

  for (const registration of registrations) {
    const accountSites = await AccountRepository.sites({ accountId: registration.account.id });
    const extraDomainCount = faker.number.int(extraDomainsPerUser);
    for (let index = 0; index < extraDomainCount; index += 1) {
      await AccountRepository.addSite({ accountId: registration.account.id, domain: faker.internet.domainName() });
    }
    const allSites = await AccountRepository.sites({ accountId: registration.account.id });
    await database('sites').where({ account_id: registration.account.id }).update({ detected_at: new Date() });
    sites.push(...allSites.map((site) => ({ id: site.id, domain: site.domain })));
    if (!accountSites.length) throw new Error(`Seed account ${registration.account.email} has no tracker domain`);
  }

  await insertEvents(sites);
  console.log(`Seeded ${registrations.length} users, ${sites.length} tracker domains, and ${sites.length * eventsPerDomain} events.`);
};
