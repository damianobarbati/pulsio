import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import AnalyticsService from '#api/analytics/AnalyticsService.ts';
import { asyncStorage } from '#api/asyncStorage.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import { createEventRow } from '#api/event/EventSeeder.ts';
import EventRepository from './EventRepository.ts';

describe('EventRepository analytics', () => {
  it('validates the period and ownership before querying metrics', async () => {
    asyncStorage.enterWith({ user_id: randomUUID() });
    const ownedDomain = { domain: 'owned.example.com' } as Awaited<ReturnType<typeof DomainRepository.getem>>[number];
    const domains = vi.spyOn(DomainRepository, 'getem').mockResolvedValue([ownedDomain]);
    const from = '2026-09-23T00:00:00Z';
    const to = '2026-09-24T00:00:00Z';

    await expect(AnalyticsService.validateSelection({ domains: ['owned.example.com'], from: to, to: from })).rejects.toMatchObject({ code: 'INVALID_DATE_RANGE' });
    await expect(AnalyticsService.validateSelection({ domains: [], from, to })).rejects.toMatchObject({ code: 'DOMAIN_NOT_FOUND' });
    await expect(AnalyticsService.validateSelection({ domains: ['other.example.com'], from, to })).rejects.toMatchObject({ status: 403 });
    await AnalyticsService.validateSelection({ domains: ['owned.example.com'], from, to });
    expect(domains).toHaveBeenCalled();
  });

  it('returns KPIs for a valid domain and period', async () => {
    const domain = `${randomUUID()}.example.com`;
    const timestamp = new Date(Date.now() - 60_000);
    const base = await createEventRow({ event_name: 'view', url: `https://${domain}/` });
    const view = { ...base, id: randomUUID(), domain, fingerprint: randomUUID(), timestamp: timestamp.toISOString(), event_name: 'view', engagement_ms: 0, interactive: 0 };
    const engagement = { ...view, id: randomUUID(), timestamp: new Date(timestamp.getTime() + 11_000).toISOString(), event_name: 'engagement', engagement_ms: 12_000 };
    const conversion = { ...view, id: randomUUID(), timestamp: new Date(timestamp.getTime() + 12_000).toISOString(), event_name: 'signup', interactive: 1 };
    const purchase = {
      ...view,
      id: randomUUID(),
      timestamp: new Date(timestamp.getTime() + 13_000).toISOString(),
      event_name: 'purchase',
      transaction_id: randomUUID(),
      revenue_amount: 12,
      revenue_currency: 'EUR',
      usd_rate: 2,
    };
    await EventRepository.createAll([view, engagement, conversion, purchase]);

    const kpis = await EventRepository.getKPIs({
      domains: [domain],
      from: new Date(timestamp.getTime() - 1_000).toISOString(),
      to: new Date(timestamp.getTime() + 60_000).toISOString(),
    });
    expect(kpis).toEqual({
      users_count: 1,
      sessions_count: 1,
      pageviews_count: 1,
      events_count: 4,
      pageviews_per_session_avg: 1,
      duration_per_session_avg: 12,
      engagement_rate: 100,
      conversion_rate: 100,
      conversions_count: 1,
      transactions_count: 1,
      revenue_sum: 24,
      revenue_per_transaction_avg: 24,
    });
  });

  it('returns a metric timeseries for a valid domain and period', async () => {
    const domain = `${randomUUID()}.example.com`;
    const hour = new Date();
    hour.setUTCMinutes(0, 0, 0);
    const timestamp = new Date(hour.getTime() - 1_000);
    const base = await createEventRow({ event_name: 'view', url: `https://${domain}/` });
    const view = { ...base, id: randomUUID(), domain, timestamp: timestamp.toISOString(), event_name: 'view' };
    const nextView = { ...view, id: randomUUID(), timestamp: new Date(hour.getTime() + 1_000).toISOString() };
    await EventRepository.createAll([view, nextView]);

    const timeseries = await EventRepository.getMetricTimeseries({
      metric: 'pageviews_count',
      interval: 'hour',
      domains: [domain],
      from: new Date(timestamp.getTime() - 1_000).toISOString(),
      to: new Date(hour.getTime() + 60_000).toISOString(),
    });
    const previousHour = new Date(hour.getTime() - 3_600_000);
    expect(timeseries).toEqual([
      { timestamp: previousHour.toISOString().replace('.000Z', 'Z'), value: 1 },
      { timestamp: hour.toISOString().replace('.000Z', 'Z'), value: 1 },
    ]);
  });
});
