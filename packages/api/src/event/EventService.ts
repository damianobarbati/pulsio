import { createHash, randomBytes } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { type CityResponse, open, validate } from 'maxmind';
import type { ClientEvent, EventRowInsert } from 'types/Event.ts';
import { UAParser } from 'ua-parser-js';
import EventRepository from '#api/event/EventRepository.ts';

type EventHeaders = Record<string, string | undefined>;
type IngestParams = ClientEvent & { headers: EventHeaders };

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
  if (!ip || !validate(ip)) return { country_code: '', subdivision_code: '', locality: '', timezone: '' };

  const reader = await geoReader;
  const location = reader.get(ip);
  if (!location) return { country_code: '', subdivision_code: '', locality: '', timezone: '' };

  const subdivision = location.subdivisions ? location.subdivisions[0] : undefined;
  const geo = {
    country_code: location.country ? location.country.iso_code : '',
    subdivision_code: subdivision ? subdivision.iso_code : '',
    locality: location.city ? location.city.names.en : '',
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
    source,
    channel,
  };
};

const getReferrerSource = (referrer: any) => {
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

  return fingerprint;
};

export default class EventService {
  static async startWorker({ signal: _signal }: { signal: AbortSignal }) {
    while (true) {
      setTimeout(1_000);
    }
  }

  static async createEventRow({ headers, ...clientEvent }: IngestParams): Promise<EventRowInsert> {
    const id = randomUUIDv7();

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
    const timestamp = new Date().toISOString();
    const attribution = getAttribution({ referrer: clientEvent.referrer || null, url });
    const fingerprint = getFingerprint({ domain: url.hostname, headers, ip, timestamp });

    const event_row: EventRowInsert = {
      id,
      site_id: clientEvent.user_id,
      timestamp,
      event_name: clientEvent.event_name,
      protocol_version: clientEvent.version,
      fingerprint,
      url: url.href,
      domain: url.hostname,
      path: url.pathname,
      query: url.search.slice(1),
      referrer: clientEvent.referrer || null,
      referrer_source: getReferrerSource(clientEvent.referrer),
      screen_width: clientEvent.width,
      language: header({ headers, name: 'accept_language' }).split(',')[0].split(';')[0],
      timezone: geo.timezone,
      transaction_id: clientEvent.transaction_id || '',
      interactive: clientEvent.event_name === 'view' ? 0 : 1,
      engagement_ms: 0,
      scroll_depth: clientEvent.scroll_depth ?? null,
      props: Object.fromEntries(Object.entries(clientEvent.props).map(([key, value]) => [key, String(value)])),
      revenue_amount: clientEvent.revenue_amount || null,
      revenue_currency: clientEvent.revenue_currency || '',
      browser: userAgent.browser.name || '',
      browser_version: userAgent.browser.version || '',
      os: userAgent.os.name || '',
      os_version: userAgent.os.version || '',
      device: userAgent.device.type || (header({ headers, name: 'sec_ch_ua_mobile' }) === '?1' ? 'mobile' : 'desktop'),
      country_code: geo.country_code,
      subdivision_code: geo.subdivision_code,
      locality: geo.locality,
      ...attribution,
    };

    return event_row;
  }

  static async ingest(params: any): Promise<string> {
    const event_row = await EventService.createEventRow(params);
    await EventRepository.create(event_row);
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
