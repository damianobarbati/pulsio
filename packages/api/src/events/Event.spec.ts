import { describe, expect, it, vi } from 'vitest';
import { processQueue } from '#api/ingest.ts';
import { app } from '#api/routes.ts';
import { cache } from '../../dao/cache.ts';
import { baseUrl } from '../../vitest.setup.ts';
import ENV from '../env.ts';
import { EventRepository } from './EventRepository.ts';

const payload = {
  v: '1',
  n: 'pv',
  s: 'example.com',
  u: 'https://example.com/about?secret=remove&utm_source=test&utm_custom=custom&q=one&s=two&query=three&search=four&secret=again#section',
  r: 'https://search.example/?private=remove&q=hello&utm_campaign=campaign',
  w: 1366,
  l: 'it-IT',
  t: 'Europe/Rome',
};
describe('Tracking pipeline', () => {
  it('validates browser events, inserts them into ClickHouse and reads account analytics', async () => {
    const registration = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'analytics@example.com', password: 'a-long-test-password', domain: 'example.com' }),
    });
    const cookie = String(registration.headers.get('set-cookie')).split(';')[0];
    const siteId = (await registration.clone().json()).id;
    const router = vi.spyOn(app.router, 'match');
    const beacon = await fetch(new URL('/event', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    expect({ status: beacon.status, body: await beacon.text() }).toEqual({ status: 204, body: '' });
    expect(router).not.toHaveBeenCalled();
    router.mockRestore();
    const [queued] = await cache.lrange(ENV.QUEUE_NAME, 0, -1);
    expect(JSON.parse(queued)).toMatchObject({
      url: 'https://example.com/about?utm_source=test&utm_custom=custom&q=one&s=two&query=three&search=four',
      query: '?utm_source=test&utm_custom=custom&q=one&s=two&query=three&search=four',
      referrer: 'https://search.example/?q=hello&utm_campaign=campaign',
      screen_width: 1300,
      language: 'it-IT',
      timezone: 'Europe/Rome',
    });
    await fetch(new URL('/event', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, n: 'signup-click' }),
    });
    await processQueue();
    const to = new Date().toISOString();
    const from = new Date(Date.parse(to) - 28 * 86400000).toISOString();
    const overview = await fetch(new URL(`/analytics/overview?site=${siteId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&filters=%5B%5D`, baseUrl), {
      method: 'GET',
      headers: { cookie },
    });
    expect(await overview.clone().json()).toMatchObject({
      activeVisitors: 1,
      summary: { pageviews: 1, visitors: 1, visits: 1, bounceRate: 0, viewsPerVisit: 1, visitDuration: 0 },
      topPages: [{ name: '/about', value: 1 }],
      sources: [{ name: 'test', value: 1 }],
    });
  });
  it.each([
    null,
    [],
    42,
    { ...payload, v: '2' },
    { ...payload, w: -1 },
    { ...payload, w: 1.5 },
    { ...payload, w: '1920' },
    { ...payload, w: 100001 },
    { ...payload, u: 'javascript:alert(1)' },
    { ...payload, r: 'file:///private' },
    { ...payload, n: '' },
    { ...payload, n: 'a'.repeat(101) },
    { ...payload, s: '' },
    { ...payload, s: 'a'.repeat(254) },
    { ...payload, l: undefined },
    { ...payload, l: 'a'.repeat(101) },
    { ...payload, t: null },
    { ...payload, t: 'a'.repeat(101) },
    '{broken',
  ])('rejects malformed and unsupported browser events: %j', async (body) => {
    const response = await fetch(new URL('/event', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    expect(response.status).toEqual(400);
    expect(await cache.llen(ENV.QUEUE_NAME)).toEqual(0);
  });
  it('rejects a site identifier that does not match the registered domain', async () => {
    await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'a-long-test-password', domain: 'example.com' }),
    });
    const response = await fetch(new URL('/event', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, s: 'other.example.com' }),
    });
    expect(response.status).toEqual(403);
    expect(await cache.llen(ENV.QUEUE_NAME)).toEqual(0);
  });
  it.each(['declared', 'chunked'])('rejects oversized %s event bodies', async (mode) => {
    const bytes = Buffer.from(JSON.stringify(payload).padEnd(2001, ' '));
    const body =
      mode === 'declared'
        ? bytes
        : new ReadableStream({
            start(controller) {
              controller.enqueue(bytes.subarray(0, 1000));
              controller.enqueue(bytes.subarray(1000));
              controller.close();
            },
          });
    const options = { method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half' };
    const response = await fetch(new URL('/event', baseUrl), options);
    expect(response.status).toEqual(413);
    expect(await cache.llen(ENV.QUEUE_NAME)).toEqual(0);
  });
  it('returns 500 when enqueueing fails', async () => {
    await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'failure@example.com', password: 'a-long-test-password', domain: 'example.com' }),
    });
    vi.spyOn(EventRepository, 'enqueue').mockRejectedValueOnce(new Error('Queue unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await fetch(new URL('/event', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    expect(response.status).toEqual(500);
  });
  it('accepts a 2000-byte UTF-8 event and preserves browser CORS headers', async () => {
    await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'boundary@example.com', password: 'a-long-test-password', domain: 'example.com' }),
    });
    const json = JSON.stringify({ ...payload, n: 'caffè' });
    const body = json + ' '.repeat(2000 - Buffer.byteLength(json));
    const response = await fetch(new URL('/event?version=1', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8', origin: 'https://example.com' },
      body,
    });
    expect({ status: response.status, body: await response.text(), origin: response.headers.get('access-control-allow-origin') }).toEqual({
      status: 204,
      body: '',
      origin: 'https://example.com',
    });
    const [queued] = await cache.lrange(ENV.QUEUE_NAME, 0, -1);
    expect(JSON.parse(queued).event_name).toEqual('caffè');
  });
});
