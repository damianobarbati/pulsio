import { readFile } from 'node:fs/promises';
import type { PageViewFromClient } from 'types/event.ts';
import { describe, expect, it } from 'vitest';
import ENV from '#api/env.ts';
import { createPageviewFromClient } from '#api/helpers.ts';
import { cache } from '../dao/cache.ts';
import { baseUrl } from '../vitest.setup.ts';

describe('Track API', () => {
  it('protects superadmin API routes with HTTP Basic authentication', async () => {
    const unauthorized = await fetch(new URL('/superadmin/accounts', baseUrl));
    expect({ status: unauthorized.status, challenge: unauthorized.headers.get('www-authenticate') }).toEqual({
      status: 401,
      challenge: 'Basic realm="Pulsio Superadmin", charset="UTF-8"',
    });

    const token = Buffer.from(`${ENV.SUPERADMIN_USERNAME}:${ENV.SUPERADMIN_PASSWORD}`).toString('base64');
    const authorized = await fetch(new URL('/superadmin/accounts', baseUrl), { headers: { authorization: `Basic ${token}` } });
    expect(authorized.status).toEqual(200);
  });
  it.each(['/client.js', '/client.js?v=1'])('should serve the built tracker without authentication at %s', async (url) => {
    const bundle = await readFile(new URL('../client/client.dist.js', import.meta.url), 'utf8');
    const res = await fetch(new URL(url, baseUrl), { method: 'GET' });

    expect({ status: res.status, body: await res.text() }).toMatchObject({ status: 200, body: bundle });
    expect(res.headers.get('content-type')).toMatch(/javascript/);
  });

  it('should allow credentialed events from the tracked site origin', async () => {
    const res = await fetch(new URL('/event', baseUrl), {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(Object.fromEntries(res.headers)).toMatchObject({
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': 'http://localhost:3000',
    });
  });

  it('should return 400 when payload is invalid', async () => {
    const res = await fetch(new URL('/event', baseUrl), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
    expect(res.status).toEqual(400);
  });

  it('should return 204 and push event to Redis queue', async () => {
    const registration = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'tracker@example.com', password: 'a-long-test-password', domain: 'localhost' }),
    });
    const payload: PageViewFromClient = { ...createPageviewFromClient(), u: 'http://localhost:3000/' };
    const res = await fetch(new URL('/event', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toEqual(204);

    const items = await cache.lrange(ENV.QUEUE_NAME, 0, -1);
    expect(items.length).toEqual(1);

    const event = JSON.parse(items[0]);
    expect(event).toMatchObject({
      url: payload.u,
      referrer: null,
      screen_width: 1900,
      site_id: (await registration.clone().json()).id,
      domain: 'localhost',
      path: '/',
    });
  });
  it('serves API documentation with native event and empty logout responses', async () => {
    const response = await fetch(new URL('/openapi.json', baseUrl));
    expect(response.status).toEqual(200);
    const document = await response.json();
    expect(document.paths).toHaveProperty('/event');
    expect(document.paths['/event'].post.responses['204']).toEqual({ description: 'Event accepted. No response body.' });
    expect(document.paths['/auth/logout'].post.responses['204']).toEqual({ description: 'Session cleared. No response body.' });
    expect(document.paths['/auth/register'].post.responses).toHaveProperty('201');
  });
  it('keeps the health check available on the shared server', async () => {
    const response = await fetch(new URL('/healthcheck', baseUrl));
    expect({ status: response.status, body: await response.text() }).toEqual({ status: 200, body: 'OK' });
  });
});
