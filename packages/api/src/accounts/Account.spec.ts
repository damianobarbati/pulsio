import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import ENV from '#api/env.ts';
import { cache } from '../../dao/cache.ts';
import { database } from '../../dao/database.ts';
import { baseUrl } from '../../vitest.setup.ts';
import { AccountController } from './AccountController.ts';
import { AccountEmail } from './AccountEmail.ts';

vi.spyOn(AccountEmail, 'sendVerification').mockResolvedValue(undefined);

describe('Account onboarding', () => {
  it('verifies email addresses and blocks login after the one-hour deadline', async () => {
    const verifiedRegistration = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'verified@example.com', password: 'a-long-test-password', domain: 'verified.example.com' }),
    });
    const verificationToken = 'a'.repeat(64);
    await database('accounts')
      .where({ email: 'verified@example.com' })
      .update({ email_verification_token_hash: createHash('sha256').update(verificationToken).digest('hex') });
    const verification = await fetch(new URL(`/auth/verify?token=${verificationToken}`, baseUrl));
    expect({ registration: verifiedRegistration.status, verification: await verification.json() }).toEqual({ registration: 201, verification: { verified: true } });

    await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'expired@example.com', password: 'a-long-test-password', domain: 'expired.example.com' }),
    });
    await database('accounts')
      .where({ email: 'expired@example.com' })
      .update({ email_verification_expires_at: new Date(Date.now() - 1) });
    const login = await fetch(new URL('/auth/login', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'expired@example.com', password: 'a-long-test-password' }),
    });
    expect({ status: login.status, body: await login.json() }).toEqual({
      status: 403,
      body: { code: 'EMAIL_VERIFICATION_EXPIRED', message: 'Verify your email before logging in.' },
    });
  });

  it('registers, detects a real beacon, supports a second website, and logs in again', async () => {
    const registration = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'a-long-test-password', domain: 'https://example.com/' }),
    });
    expect(registration.status).toEqual(201);
    const cookie = String(registration.headers.get('set-cookie')).split(';')[0];
    const setup = await registration.clone().json();
    const userId = /data-pulsio-id="([^"]+)"/.exec(setup.snippet)?.[1];
    expect(setup).toMatchObject({ domain: 'example.com', detected: false, snippet: `<script async src="${ENV.API_URL}/client.js" data-pulsio-id="${userId}"></script>` });
    expect(registration.headers.get('set-cookie')).toContain('HttpOnly');
    const event = await fetch(new URL('/event', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ v: '1', n: 'pv', s: userId, u: 'https://example.com/about', r: '', w: 1920, l: 'en', t: 'UTC' }),
    });
    expect(event.status).toEqual(204);
    const status = await fetch(new URL('/account/setup', baseUrl), { method: 'GET', headers: { cookie } });
    expect(await status.clone().json()).toMatchObject({ detected: true });
    const added = await fetch(new URL('/sites', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ domain: 'second.example.com' }),
    });
    expect(added.status).toEqual(201);
    const account = await fetch(new URL('/account', baseUrl), { method: 'GET', headers: { cookie } });
    expect((await account.clone().json()).sites.map((site: { domain: string }) => site.domain)).toEqual(['example.com', 'second.example.com']);
    const logout = await fetch(new URL('/auth/logout', baseUrl), { method: 'POST', headers: { cookie } });
    expect({ status: logout.status, body: await logout.text() }).toEqual({ status: 204, body: '' });
    const expired = await fetch(new URL('/account', baseUrl), { method: 'GET', headers: { cookie } });
    expect(expired.status).toEqual(401);
    const login = await fetch(new URL('/auth/login', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'a-long-test-password' }),
    });
    expect(login.status).toEqual(200);
  });

  it('keeps analytics private and scoped to the signed-in account', async () => {
    const first = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'first@example.com', password: 'a-long-test-password', domain: 'first.example.com' }),
    });
    const second = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'second@example.com', password: 'a-long-test-password', domain: 'second.example.com' }),
    });
    const cookie = String(first.headers.get('set-cookie')).split(';')[0];
    const own = await fetch(new URL(`/analytics/overview?site=${(await first.clone().json()).id}`, baseUrl), { method: 'GET', headers: { cookie } });
    expect(await own.clone().json()).toMatchObject({ summary: { pageviews: 0, visitors: 0 } });
    const other = await fetch(new URL(`/analytics/overview?site=${(await second.clone().json()).id}`, baseUrl), { method: 'GET', headers: { cookie } });
    expect(other.status).toEqual(404);
    const anonymous = await fetch(new URL(`/analytics/overview?site=${(await first.clone().json()).id}`, baseUrl), { method: 'GET' });
    expect(anonymous.status).toEqual(401);
  });

  it('rejects duplicate accounts, invalid credentials, and cross-origin writes', async () => {
    const payload = { email: 'owner@example.com', password: 'a-long-test-password', domain: 'example.com' };
    await fetch(new URL('/auth/register', baseUrl), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const duplicate = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(duplicate.status).toEqual(409);
    const invalid = await fetch(new URL('/auth/login', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: payload.email, password: 'wrong-password-value' }),
    });
    expect(invalid.status).toEqual(401);
    const crossOrigin = await fetch(new URL('/auth/login', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://untrusted.example' },
      body: JSON.stringify(payload),
    });
    expect(crossOrigin.status).toEqual(403);
    const stored = await database('accounts').first();
    expect(stored.password_hash).not.toContain(payload.password);
  });

  it('does not collect visits from unregistered domains', async () => {
    await fetch(new URL('/event', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ u: 'https://unregistered.example/', r: '', w: 1920, h: 1080 }),
    });
    expect(await cache.llen(ENV.QUEUE_NAME)).toEqual(0);
  });
  it('resets only the selected site data and deletes the account', async () => {
    const first = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'first@example.com', password: 'a-long-test-password', domain: 'first.example.com' }),
    });
    const second = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'second@example.com', password: 'a-long-test-password', domain: 'second.example.com' }),
    });
    const firstCookie = String(first.headers.get('set-cookie')).split(';')[0];
    const firstSetup = await first.clone().json();
    const secondSetup = await second.clone().json();
    const firstSite = firstSetup.id;
    const secondSite = secondSetup.id;
    for (const [domain, setup] of [
      ['first.example.com', firstSetup],
      ['second.example.com', secondSetup],
    ]) {
      await fetch(new URL('/event', baseUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ v: '1', n: 'pv', s: /data-pulsio-id="([^"]+)"/.exec(setup.snippet)?.[1], u: `https://${domain}/`, r: '', w: 1920, l: 'en', t: 'UTC' }),
      });
    }
    const reset = await fetch(new URL('/sites/data', baseUrl), {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', cookie: firstCookie },
      body: JSON.stringify({ site: firstSite }),
    });
    expect(await reset.json()).toEqual({ deleted: true });
    const pendingEvents = (await cache.lrange(ENV.QUEUE_NAME, 0, -1)).map((event) => JSON.parse(event));
    expect(pendingEvents.map((event) => event.site_id)).toEqual([secondSite]);
    const deleted = await fetch(new URL('/account', baseUrl), { method: 'DELETE', headers: { 'content-type': 'application/json', cookie: firstCookie }, body: '{}' });
    expect(await deleted.json()).toEqual({ deleted: true });
    const account = await fetch(new URL('/account', baseUrl), { headers: { cookie: firstCookie } });
    expect(account.status).toEqual(401);
    expect(await database('accounts').where({ email: 'first@example.com' }).first()).toEqual(undefined);
  });
  it('validates standard API request and response bodies with Zod', async () => {
    const invalid = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'invalid', password: 'short', domain: 'example.com' }),
    });
    expect(invalid.status).toEqual(400);
    const registration = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'schemas@example.com', password: 'a-long-test-password', domain: 'example.com' }),
    });
    const cookie = String(registration.headers.get('set-cookie')).split(';')[0];
    vi.spyOn(AccountController, 'account').mockResolvedValueOnce({ email: 'invalid', sites: [], trial_ends_at: new Date().toISOString() });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await fetch(new URL('/account', baseUrl), { headers: { cookie } });
    expect({ status: response.status, body: await response.json() }).toEqual({
      status: 500,
      body: { code: 'RESPONSE_VALIDATION_ERROR', message: 'Internal server error (response format mismatch)' },
    });
  });
});
