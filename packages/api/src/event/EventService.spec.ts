import { describe, expect, it, vi } from 'vitest';
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
    it('should work', async () => {
      const params = createClientEvent();
      const headers = createClientHeaders();
      const id = await EventService.ingest({ headers, ...params });
      expect(id).toBeTypeOf('string');
      const event = await EventRepository.get(id);
      expect(event).toMatchObject({ id });
    });
  });
});
