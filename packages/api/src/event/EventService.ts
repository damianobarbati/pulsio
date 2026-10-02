import { createHash, randomBytes } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { type CityResponse, open, validate } from 'maxmind';
import { AppError } from 'nano-fw/docs/index.ts';
import type { IEvent } from 'types/Event.ts';
import { UAParser } from 'ua-parser-js';
import CurrencyService from '#api/currency/CurrencyService.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import ENV from '#api/env.ts';
import EventRepository from '#api/event/EventRepository.ts';
import UserRepository from '#api/user/UserRepository.ts';
import { cache } from '#dao/cache.ts';

type EventHeaders = Record<string, string | undefined>;
type IngestParams = IEvent.clientEvent & { event_id?: string; timestamp?: string; headers: EventHeaders; domain_id?: string };

const geoReader = open<CityResponse>(fileURLToPath(new URL('../../GeoLite2-City.mmdb', import.meta.url)));

const header = ({ headers, name }: { headers: EventHeaders; name: string }) => {
  const value = headers[name] || headers[name.replaceAll('_', '-')];
  return value || '';
};

const getIp = ({ headers }: { headers: EventHeaders }) => {
  const ip = header({ headers, name: 'ip' }) || header({ headers, name: 'cf-connecting-ip' });
  return ip || null;
};

const getGeo = async ({ ip }: { ip: string | null }) => {
  if (!ip || !validate(ip)) return { country_code: '', region_code: '', city_id: 0, timezone: '' };

  const reader = await geoReader;
  const location = reader.get(ip);
  if (!location) return { country_code: '', region_code: '', city_id: 0, timezone: '' };

  const subdivision = location.subdivisions ? location.subdivisions[0] : undefined;
  const geo = {
    country_code: location.country ? location.country.iso_code : '',
    region_code: subdivision ? subdivision.iso_code : '',
    city_id: location.city ? location.city.geoname_id || 0 : 0,
    timezone: location.location ? location.location.time_zone || '' : '',
  };

  return geo;
};

const getAttribution = ({ referrer, url }: { referrer: string | null; url: URL }) => {
  const utm_source = url.searchParams.get('utm_source') || '';
  const utm_medium = url.searchParams.get('utm_medium') || '';
  const source = utm_source || (referrer ? new URL(referrer).hostname : null);
  const hostname = source || '';
  const channel = !source ? 'Direct' : hostname.includes('google.') || hostname.includes('bing.') || hostname.includes('duckduckgo.') ? 'Organic Search' : 'Referral';

  return {
    utm_source,
    utm_medium,
    utm_campaign: url.searchParams.get('utm_campaign') || '',
    utm_content: url.searchParams.get('utm_content') || '',
    utm_term: url.searchParams.get('utm_term') || '',
    source: source || '',
    channel,
  };
};

const getReferrerDomain = (referrer: string | null) => {
  if (!referrer) return '';

  try {
    return new URL(referrer).hostname;
  } catch {
    return '';
  }
};

const getFingerprint = ({ domain, headers, ip, timestamp }: { domain: string; headers: EventHeaders; ip: string | null; timestamp: string }) => {
  const dailySalt = timestamp.slice(0, 10);
  const fingerprint = createHash('sha256')
    .update(
      [
        dailySalt,
        domain,
        ip || '',
        header({ headers, name: 'user_agent' }),
        header({ headers, name: 'accept_language' }),
        header({ headers, name: 'sec_ch_ua' }),
        header({ headers, name: 'sec_ch_ua_mobile' }),
        header({ headers, name: 'sec_ch_ua_platform' }),
      ].join(':'),
    )
    .digest('hex');

  const bytes = createHash('sha256').update(fingerprint).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

export default class EventService {
  static async getUSDRate(currency: string): Promise<number> {
    const usdRate = await CurrencyService.getUSDRate(currency);
    return usdRate;
  }

  static async startWorker({ signal }: { signal: AbortSignal }): Promise<void> {
    let lastMessageId = '0-0';

    while (!signal.aborted) {
      let messages: Awaited<ReturnType<typeof cache.xread>>;

      try {
        messages = await cache.xread('COUNT', ENV.BATCH_SIZE, 'STREAMS', ENV.QUEUE_NAME, lastMessageId);
      } catch (error) {
        if (signal.aborted) break;
        if (error instanceof Error) console.error('Event worker failed:', error.message);

        try {
          await setTimeout(100, undefined, { signal });
        } catch (sleepError) {
          if (signal.aborted) break;
          throw sleepError;
        }

        continue;
      }

      if (messages) {
        const [, entries] = messages[0];
        const events = entries.map(([, fields]) => {
          const eventIndex = fields.indexOf('event');
          const payload = fields[eventIndex + 1];
          if (!payload) throw new Error('Event stream entry has no event payload.');
          return JSON.parse(payload) as IEvent.rowInsert;
        });
        const messageIds = entries.map(([messageId]) => messageId);

        try {
          await EventRepository.createAll(events);
          await cache.xdel(ENV.QUEUE_NAME, ...messageIds);
          lastMessageId = messageIds[messageIds.length - 1];
        } catch (error) {
          if (signal.aborted) break;

          try {
            await setTimeout(100, undefined, { signal });
          } catch (sleepError) {
            if (signal.aborted) break;
            throw sleepError;
          }

          if (signal.aborted) break;
          if (error instanceof Error) console.error('Event worker failed:', error.message);
        }

        continue;
      }

      try {
        await setTimeout(100, undefined, { signal });
      } catch (error) {
        if (signal.aborted) break;
        throw error;
      }
    }
  }

  static async createEventRow({ headers, domain_id = undefined, ...clientEvent }: IngestParams): Promise<IEvent.rowInsert> {
    const id = clientEvent.event_id || randomUUIDv7();

    if (!headers) throw new Error('EventService.createEventRow failed.');

    const ip = getIp({ headers });
    const geo = await getGeo({ ip });

    const userAgent = await new UAParser({
      'user-agent': header({ headers, name: 'user_agent' }),
      'sec-ch-ua': header({ headers, name: 'sec_ch_ua' }),
      'sec-ch-ua-mobile': header({ headers, name: 'sec_ch_ua_mobile' }),
      'sec-ch-ua-platform': header({ headers, name: 'sec_ch_ua_platform' }),
    })
      .getResult()
      .withClientHints();

    const url = new URL(clientEvent.url);
    const timestamp = clientEvent.timestamp || new Date().toISOString();
    const attribution = getAttribution({ referrer: clientEvent.referrer || null, url });
    const fingerprint = getFingerprint({ domain: url.hostname, headers, ip, timestamp });
    const usd_rate = clientEvent.revenue_currency ? await EventService.getUSDRate(clientEvent.revenue_currency) : 1;

    const event_row: IEvent.rowInsert = {
      id,
      user_id: clientEvent.user_id,
      domain_id: domain_id || clientEvent.user_id,
      visitor_hash: fingerprint,
      timestamp,
      name: clientEvent.event_name,
      domain: url.hostname,
      path: url.pathname,
      query: url.search.slice(1),
      referrer_domain: getReferrerDomain(clientEvent.referrer),
      screen_width: clientEvent.width,
      timezone: geo.timezone,
      transaction_id: clientEvent.transaction_id || '',
      interactive: clientEvent.event_name === 'view' || clientEvent.event_name === 'engagement' ? 0 : 1,
      engagement_ms: clientEvent.engagement_ms ?? 0,
      scroll_depth: clientEvent.scroll_depth ?? null,
      props: Object.fromEntries(Object.entries(clientEvent.props).map(([key, value]) => [key, String(value)])),
      revenue_amount: clientEvent.revenue_amount || null,
      revenue_currency: clientEvent.revenue_currency || null,
      usd_rate,
      browser: userAgent.browser.name || '',
      browser_version: userAgent.browser.version || '',
      os: userAgent.os.name || '',
      os_version: userAgent.os.version || '',
      device: userAgent.device.type || (header({ headers, name: 'sec_ch_ua_mobile' }) === '?1' ? 'mobile' : 'desktop'),
      country_code: geo.country_code,
      region_code: geo.region_code,
      city_id: geo.city_id,
      ...attribution,
    };

    return event_row;
  }

  static async ingest(params: IngestParams): Promise<string> {
    const user_exists = await UserRepository.exists({ id: params.user_id });
    if (!user_exists) throw new Error('User does not exist');

    const url = new URL(params.url);
    let domain = await DomainRepository.findBy({ domain: url.hostname });
    if (!domain) domain = await DomainRepository.create({ domain: url.hostname, user_id: params.user_id });

    const event_row = await EventService.createEventRow({ ...params, domain_id: domain.id });
    let marker: string | null;

    try {
      marker = await cache.set(`event:${event_row.id}`, '1', 'EX', 3600, 'NX');
    } catch {
      throw new AppError(500, 'EVENT_QUEUE_UNAVAILABLE', 'Event queue is unavailable.');
    }

    if (!marker) return event_row.id;

    try {
      await cache.xadd(ENV.QUEUE_NAME, '*', 'event', JSON.stringify(event_row));
    } catch {
      throw new AppError(500, 'EVENT_QUEUE_UNAVAILABLE', 'Event queue is unavailable.');
    }

    return event_row.id;
  }
}

export const randomUUIDv7 = () => {
  const timestamp = Date.now();
  const bytes = randomBytes(16);
  bytes[0] = Math.floor(timestamp / 2 ** 40);
  bytes[1] = Math.floor(timestamp / 2 ** 32) % 256;
  bytes[2] = Math.floor(timestamp / 2 ** 24) % 256;
  bytes[3] = Math.floor(timestamp / 2 ** 16) % 256;
  bytes[4] = Math.floor(timestamp / 2 ** 8) % 256;
  bytes[5] = timestamp % 256;
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return uuid;
};
