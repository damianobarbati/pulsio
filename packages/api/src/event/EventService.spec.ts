import { describe, expect, it } from 'vitest';
import EventRepository from '#api/event/EventRepository.ts';
import { createClientEvent, createClientHeaders } from '#api/event/EventSeeder.ts';
import EventService from './EventService.ts';

describe('EventService', () => {
  describe('ingest', async () => {
    it('should work', async () => {
      const params = createClientEvent();
      const headers = createClientHeaders();

      const id = await EventService.ingest({ headers, ...params });
      expect(id).toBeTypeOf('string');

      const event = await EventRepository.get(id);
      expect(event).toMatchObject({
        id,
      });
    });
  });
});
