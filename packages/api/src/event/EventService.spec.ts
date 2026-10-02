import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EventRepository from '#api/event/EventRepository.ts';
import { createClientEvent, createClientHeaders } from '#api/event/EventSeeder.ts';
import EventService from './EventService.ts';

const HEAVY_LOAD_EVENTS_PER_SECOND = 10;
const HEAVY_LOAD_DURATION_SECONDS = 5;
const HEAVY_LOAD_MAX_LATENCY_MS = 1_000;
const HEAVY_LOAD_POLL_INTERVAL_MS = 100;
const HEAVY_LOAD_POLL_TIMEOUT_MS = 60_000;
const HEAVY_LOAD_DOMAIN = 'heavy-load-test.pulsio.live';

const waitForEvents = async (eventIds: string[]) => {
  const deadline = Date.now() + HEAVY_LOAD_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const events = await Promise.all(eventIds.map((id) => EventRepository.get(id)));
    if (events.every((event) => event !== null)) return events;
    await setTimeout(HEAVY_LOAD_POLL_INTERVAL_MS);
  }

  const events = await Promise.all(eventIds.map((id) => EventRepository.get(id)));
  return events;
};

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
    expect(event).toMatchObject({ name: 'engagement', engagement_ms: 10_000, interactive: 0 });
  });

  describe('ingest', async () => {
    let controller: AbortController;
    let worker: Promise<void>;

    beforeEach(async () => {
      await EventRepository.removeByDomain('real-xyz.com');
      controller = new AbortController();
      worker = EventService.startWorker({ signal: controller.signal });
    });

    afterEach(async () => {
      controller.abort();
      await worker;
      await EventRepository.removeByDomain('real-xyz.com');
    });

    it('should work with non-existing domain', async () => {
      const headers = createClientHeaders();
      const params = createClientEvent({ url: 'https://real-xyz.com' });
      const id = await EventService.ingest({ headers, ...params });
      expect(id).toBeTypeOf('string');
      const [event] = await waitForEvents([id]);
      expect(event).toMatchObject({ id });
    });

    it('should work with existing domain', async () => {
      const headers = createClientHeaders();
      const params = createClientEvent({ url: 'https://real-xyz.com' });
      const event_id1 = await EventService.ingest({ headers, ...params });
      const event_id2 = await EventService.ingest({ headers, ...params });
      const [event1, event2] = await waitForEvents([event_id1, event_id2]);

      expect(event1).not.toBeNull();
      expect(event2).not.toBeNull();
      if (!event1 || !event2) throw new Error('Ingested events were not persisted.');

      expect(event1.user_id).toEqual(event2.user_id);
      expect(event1.domain_id).toEqual(event2.domain_id);
    });
  });

  describe('heavy load', () => {
    it('processes configured event rate within the latency limit', async () => {
      await EventRepository.removeByDomain(HEAVY_LOAD_DOMAIN);

      const controller = new AbortController();
      const worker = EventService.startWorker({ signal: controller.signal });
      const eventIds: string[] = [];
      const startedAt = performance.now();
      const durationMs = HEAVY_LOAD_DURATION_SECONDS * 1_000;
      const intervalMs = 1_000 / HEAVY_LOAD_EVENTS_PER_SECOND;
      let nextEventAt = startedAt;

      try {
        while (performance.now() - startedAt < durationMs) {
          const event_id = randomUUID();
          const timestamp = new Date().toISOString();
          const url = `https://${HEAVY_LOAD_DOMAIN}/heavy-load`;
          const event = { ...createClientEvent({ event_name: 'view', url }), event_id, timestamp };
          eventIds.push(event_id);

          const headers = new Headers({ 'content-type': 'application/json' });
          const clientHeaders = createClientHeaders();

          for (const [name, value] of Object.entries(clientHeaders)) {
            if (value) headers.set(name, value);
          }

          const response = await fetch(`${global.API_URL}/event`, { method: 'POST', headers, body: JSON.stringify(event) });

          expect(response.ok).toEqual(true);
          const returnedEventId = await response.json();
          expect(returnedEventId).toEqual(event_id);

          nextEventAt += intervalMs;
          const waitMs = nextEventAt - performance.now();
          if (waitMs > 0) await setTimeout(waitMs);
        }

        const events = await waitForEvents(eventIds);
        const storedEvents = events.filter((event) => event !== null);
        const latencies = storedEvents.map((event) => Date.parse(event.created_at) - Date.parse(event.timestamp));
        const maxLatency = latencies.length > 0 ? Math.max(...latencies) : Number.POSITIVE_INFINITY;

        expect(storedEvents).toHaveLength(eventIds.length);
        expect(new Set(storedEvents.map((event) => event.id)).size).toEqual(eventIds.length);
        expect(maxLatency).toBeLessThan(HEAVY_LOAD_MAX_LATENCY_MS);
      } finally {
        controller.abort();
        await worker;
        await EventRepository.removeByDomain(HEAVY_LOAD_DOMAIN);
      }
    });
  });
});
