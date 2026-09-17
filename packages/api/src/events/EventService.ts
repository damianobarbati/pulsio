import { createHash } from 'node:crypto';
import type { PageViewRowInsert, TrackEvent } from 'types/event.ts';
import { AccountRepository } from '#api/accounts/AccountRepository.ts';
import { enrichEvent } from './EventEnrichment.ts';
import { EventRepository } from './EventRepository.ts';

type CollectInput = { data: TrackEvent; ip: string; userAgent: string };
const cleanUrl = ({ value }: { value: string }) => {
  const url = new URL(value);
  url.hash = '';
  url.username = '';
  url.password = '';
  for (const key of [...url.searchParams.keys()]) {
    if (!key.startsWith('utm_') && !['query', 'search', 'q', 's'].includes(key)) url.searchParams.delete(key);
  }
  return url;
};
export const EventService = {
  async collect({ data, ip, userAgent }: CollectInput) {
    const url = cleanUrl({ value: data.u });
    const domain = url.hostname.toLowerCase().replace(/^www\./, '');
    const user = await AccountRepository.findById({ accountId: data.s });
    if (!user || user.suspended_at) return false;
    let site = await AccountRepository.findSite({ domain });
    if (site && site.user_id !== user.id) return false;
    if (!site) site = await AccountRepository.discoverSite({ userId: user.id, domain });
    const timestamp = new Date().toISOString();
    const referrer = data.r ? cleanUrl({ value: data.r }).href : null;
    const event: PageViewRowInsert = {
      ...enrichEvent({ ip, userAgent, url, referrer }),
      timestamp,
      site_id: site.id,
      event_name: data.n,
      protocol_version: data.v,
      fingerprint: createHash('sha256')
        .update(`${site.id}-${timestamp.slice(0, 10)}-${ip}-${userAgent}`)
        .digest('hex'),
      url: url.href,
      domain,
      path: url.pathname,
      query: url.search,
      referrer,
      screen_width: Math.floor(data.w / 100) * 100,
      language: data.l,
      timezone: data.t,
      page_id: data.pid || '',
      interactive: data.n === 'engagement' || data.i === false ? 0 : 1,
      engagement_ms: data.e || 0,
      scroll_depth: data.sd === undefined ? null : data.sd,
      props: Object.fromEntries(
        Object.entries(data.p || {}).map(([key, value]) => {
          const text = String(value);
          return [key, URL.canParse(text) && ['http:', 'https:'].includes(new URL(text).protocol) ? cleanUrl({ value: text }).href : text];
        }),
      ),
      revenue_amount: data.revenue ? data.revenue.amount : null,
      revenue_currency: data.revenue ? data.revenue.currency : '',
    };
    await EventRepository.enqueue({ event });
    await AccountRepository.markDetected({ id: site.id });
    return true;
  },
};
