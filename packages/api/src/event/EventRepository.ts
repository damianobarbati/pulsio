import type { EventRow, EventRowInsert } from 'types/Event.ts';
import { ch } from '#dao/ch.ts';

export default class EventRepository {
  static async create(event: EventRowInsert) {
    const result = await ch.insert({ table: 'events', values: [event], format: 'JSONEachRow' });
    const row = result.executed;
    return row;
  }

  static async createAll(events: EventRowInsert[]) {
    const result = await ch.insert({ table: 'events', values: events, format: 'JSONEachRow' });
    const rows = result.executed;
    return rows;
  }

  static async get(id: string) {
    const result = await ch.query({ query: `SELECT * FROM events WHERE id = {id:UUID} LIMIT 1`, query_params: { id }, format: 'JSONEachRow' });
    const [row] = await result.json<EventRow>();
    return row ?? null;
  }
}
