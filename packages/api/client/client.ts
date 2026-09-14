import type { TrackEvent } from 'types/event.ts';

type TrackOptions = { props?: TrackEvent['p']; revenue?: TrackEvent['revenue']; interactive?: boolean };
type Tracker = ((name: string, options?: TrackOptions) => void) & { q?: [string, TrackOptions?][] };
declare global {
  interface Window {
    pulsio?: Tracker;
  }
}
const script = (document.currentScript as HTMLScriptElement | null) || document.querySelector<HTMLScriptElement>('script[data-site]');
const endpoint = new URL(script ? script.src : 'http://localhost:8080/client.js').origin;
const domain = script ? script.dataset.site : '';
const automatic = new Set(script ? (script.dataset.track || '').split(',').map((value) => value.trim()) : []);
const cleanUrl = (value: string) => {
  const url = new URL(value);
  url.hash = '';
  url.username = '';
  url.password = '';
  for (const key of [...url.searchParams.keys()]) if (!key.startsWith('utm_') && !['q', 's', 'query', 'search'].includes(key)) url.searchParams.delete(key);
  return url.href;
};
let pageUrl = cleanUrl(location.href);
let pageId = crypto.randomUUID();
let referrer = document.referrer;
let visibleSince = document.visibilityState === 'visible' ? performance.now() : 0;
let scrollDepth = 0;
const updateScroll = () => {
  const height = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0, innerHeight);
  scrollDepth = Math.max(scrollDepth, Math.min(100, Math.round((100 * (scrollY + innerHeight)) / height)));
};
const send = (name: string, options: TrackOptions = {}, engagement?: { e: number; sd: number }) => {
  if (!domain) return;
  const payload: TrackEvent = {
    v: '1',
    n: name,
    s: domain,
    u: pageUrl,
    r: referrer ? cleanUrl(referrer) : '',
    w: screen.width,
    l: navigator.language,
    t: Intl.DateTimeFormat().resolvedOptions().timeZone,
    pid: pageId,
    i: options.interactive !== false,
    p: options.props,
    revenue: options.revenue,
    ...engagement,
  };
  const body = JSON.stringify(payload);
  if (new TextEncoder().encode(body).length <= 2000) navigator.sendBeacon(`${endpoint}/api/event`, body);
};
const engagement = () => {
  updateScroll();
  const elapsed = visibleSince ? Math.min(86400000, Math.max(0, Math.round(performance.now() - visibleSince))) : 0;
  visibleSince = 0;
  send('engagement', { interactive: false }, { e: elapsed, sd: scrollDepth });
};
const pageview = () => {
  const nextUrl = cleanUrl(location.href);
  if (nextUrl === pageUrl) return;
  engagement();
  referrer = pageUrl;
  pageUrl = nextUrl;
  pageId = crypto.randomUUID();
  scrollDepth = 0;
  visibleSince = document.visibilityState === 'visible' ? performance.now() : 0;
  send('pv');
};
const queued = window.pulsio?.q || [];
window.pulsio = (name, options) => send(name, options);
send('pv');
for (const [name, options] of queued) send(name, options);
if (automatic.has('404')) send('404');
addEventListener('scroll', updateScroll, { passive: true });
addEventListener('pagehide', engagement);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') engagement();
  else visibleSince = performance.now();
});
addEventListener('pageshow', () => {
  visibleSince = document.visibilityState === 'visible' ? performance.now() : 0;
});
addEventListener('popstate', pageview);
const pushState = history.pushState;
history.pushState = (...args) => {
  pushState.apply(history, args);
  pageview();
};
const replaceState = history.replaceState;
history.replaceState = (...args) => {
  replaceState.apply(history, args);
  pageview();
};

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const target = event.target.closest<HTMLElement>('[data-pulsio]');
  if (target?.dataset.pulsioEventName) {
    const currency = target.dataset.pulsioRevenueCurrency;
    const amount = Number(target.dataset.pulsioRevenueAmount);
    send(target.dataset.pulsioEventName, {
      interactive: target.dataset.pulsioInteractive !== 'false',
      revenue: currency && Number.isFinite(amount) ? { currency, amount } : undefined,
    });
  }
  const link = event.target.closest<HTMLAnchorElement>('a[href]');
  if (!link || !/^https?:/.test(link.href)) return;
  const url = new URL(link.href);
  if (automatic.has('downloads') && (link.hasAttribute('download') || /\.(pdf|zip|gz|rar|7z|csv|xlsx?|docx?|pptx?|epub|mp[34]|wav|exe|dmg)$/i.test(url.pathname)))
    send('File Download', { props: { url: cleanUrl(url.href) } });
  else if (automatic.has('outbound') && url.hostname !== location.hostname) send('Outbound Link: Click', { props: { url: cleanUrl(url.href) } });
});
document.addEventListener('submit', (event) => {
  if (automatic.has('forms') && event.target instanceof HTMLFormElement) send('Form: Submission');
});
