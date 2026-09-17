import type { TrackEvent } from 'types/event.ts';
import { EventService } from './EventService.ts';

const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const url = URL.parse(value);
  return url !== null && (url.protocol === 'http:' || url.protocol === 'https:');
};

const validProperties = (value: unknown) => {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length <= 20 &&
    entries.every(
      ([key, item]) =>
        key.length > 0 &&
        key.length <= 100 &&
        ((typeof item === 'string' && item.length <= 200) || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))),
    )
  );
};
const validRevenue = (value: unknown) => {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const revenue = value as Record<string, unknown>;
  return (
    typeof revenue.amount === 'number' &&
    Number.isFinite(revenue.amount) &&
    revenue.amount >= 0 &&
    revenue.amount <= 1e12 &&
    typeof revenue.currency === 'string' &&
    /^[A-Z]{3}$/.test(revenue.currency)
  );
};
const isTrackEvent = (value: unknown): value is TrackEvent => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  return (
    event.v === '1' &&
    typeof event.n === 'string' &&
    event.n.length > 0 &&
    event.n.length <= 100 &&
    typeof event.s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[78][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.s) &&
    isHttpUrl(event.u) &&
    (event.r === '' || isHttpUrl(event.r)) &&
    typeof event.w === 'number' &&
    Number.isInteger(event.w) &&
    event.w >= 0 &&
    event.w <= 100000 &&
    typeof event.l === 'string' &&
    event.l.length <= 100 &&
    typeof event.t === 'string' &&
    event.t.length <= 100 &&
    (event.pid === undefined || (typeof event.pid === 'string' && event.pid.length <= 64)) &&
    (event.i === undefined || typeof event.i === 'boolean') &&
    (event.e === undefined || (typeof event.e === 'number' && Number.isInteger(event.e) && event.e >= 0 && event.e <= 86400000)) &&
    (event.sd === undefined || (typeof event.sd === 'number' && Number.isInteger(event.sd) && event.sd >= 0 && event.sd <= 100)) &&
    validProperties(event.p) &&
    validRevenue(event.revenue)
  );
};

export const EventController = {
  async collect({ body, ip, userAgent, origin }: { body: string; ip: string; userAgent: string; origin?: string }) {
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return 400;
    }
    if (!isTrackEvent(payload)) return 400;
    if (origin && (!isHttpUrl(origin) || new URL(origin).hostname.toLowerCase().replace(/^www\./, '') !== new URL(payload.u).hostname.toLowerCase().replace(/^www\./, '')))
      return 403;
    const accepted = await EventService.collect({ data: payload, ip, userAgent });
    return accepted ? 204 : 403;
  },
};
