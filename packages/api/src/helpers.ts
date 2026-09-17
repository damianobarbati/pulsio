import type { PageViewRowInsert, TrackEvent } from 'types/event.ts';
export const createPageviewFromClient = (): TrackEvent => ({
  v: '1',
  n: 'pv',
  s: '00000000-0000-7000-8000-000000000000',
  u: 'http://localhost:3000/',
  r: '',
  w: 1920,
  l: 'en-US',
  t: 'UTC',
});
export const createPageviewRow = (): PageViewRowInsert => ({
  timestamp: new Date().toISOString(),
  site_id: 'test-site',
  event_name: 'pv',
  protocol_version: '1',
  fingerprint: 'test-fingerprint',
  url: 'https://example.com/',
  domain: 'example.com',
  path: '/',
  query: '',
  referrer: null,
  screen_width: 1900,
  language: 'en',
  timezone: 'UTC',
});
