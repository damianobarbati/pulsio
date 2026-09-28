import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EventRepository from '#api/event/EventRepository.ts';
import { createClientEvent, createClientHeaders } from '#api/event/EventSeeder.ts';
import EventService from './EventService.ts';

describe('EventService', () => {
  it('fetch USD change rate for currency', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { EUR: 0.8 } }),
    } as Response);

    const usdRate = await EventService.getUSDRate('USD');
    const firstEvent = await EventService.createEventRow({ ...createClientEvent({ revenue_amount: 100, revenue_currency: 'EUR' }), headers: createClientHeaders() });
    const secondEvent = await EventService.createEventRow({ ...createClientEvent({ revenue_amount: 50, revenue_currency: 'EUR' }), headers: createClientHeaders() });

    expect(usdRate).toEqual(1);
    expect(firstEvent.usd_rate).toEqual(1.25);
    expect(secondEvent.usd_rate).toEqual(1.25);
    expect(fetchMock.mock.calls.length).toEqual(1);

    fetchMock.mockRestore();
  });

  it('stores active time without marking a heartbeat as interactive', async () => {
    const headers = createClientHeaders();
    const event = await EventService.createEventRow({ ...createClientEvent({ event_name: 'engagement', engagement_ms: 10_000 }), headers });
    expect(event).toMatchObject({ event_name: 'engagement', engagement_ms: 10_000, interactive: 0 });
  });

  describe('ingest', async () => {
    beforeEach(async () => {
      await EventRepository.removeByDomain('real-xyz.com');
    });

    afterEach(async () => {
      await EventRepository.removeByDomain('real-xyz.com');
    });

    it('should work with non-existing domain', async () => {
      const headers = createClientHeaders();
      const params = createClientEvent({ url: 'https://real-xyz.com' });
      const id = await EventService.ingest({ headers, ...params });
      expect(id).toBeTypeOf('string');
      const event = await EventRepository.get(id);
      expect(event).toMatchObject({ id });
    });

    it('should work with existing domain', async () => {
      const headers = createClientHeaders();
      const params = createClientEvent({ url: 'https://real-xyz.com' });
      const event_id1 = await EventService.ingest({ headers, ...params });
      const event_id2 = await EventService.ingest({ headers, ...params });
      const event1 = await EventRepository.get(event_id1);
      const event2 = await EventRepository.get(event_id2);

      expect(event1.user_id).toEqual(event2.user_id);
      expect(event1.domain_id).toEqual(event2.domain_id);
    });
  });
});
