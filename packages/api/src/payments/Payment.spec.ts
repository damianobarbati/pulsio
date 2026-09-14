import { describe, expect, it } from 'vitest';
import { AccountRepository } from '#api/accounts/AccountRepository.ts';
import { database } from '../../dao/database.ts';
import { baseUrl } from '../../vitest.setup.ts';
import { PaymentController } from './PaymentController.ts';

describe('Payment records', () => {
  it('stores integer minor units and exposes records only to their owner', async () => {
    const first = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'payer@example.com', password: 'a-long-test-password', domain: 'payer.example.com' }),
    });
    const cookie = String(first.headers.get('set-cookie')).split(';')[0];
    const account = await AccountRepository.findByEmail({ email: 'payer@example.com' });
    if (!account) throw new Error('Missing test account');
    const payment = await PaymentController.create({ input: { account_id: account.id, amount: 1200, currency: 'EUR', status: 'paid' } });
    expect(payment).toMatchObject({ amount: 1200, currency: 'EUR', status: 'paid' });
    const own = await fetch(new URL('/payments', baseUrl), { method: 'GET', headers: { cookie } });
    expect(await own.clone().json()).toEqual([payment]);
    const second = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'other@example.com', password: 'a-long-test-password', domain: 'other.example.com' }),
    });
    const other = await fetch(new URL('/payments', baseUrl), { method: 'GET', headers: { cookie: String(second.headers.get('set-cookie')).split(';')[0] } });
    expect(await other.clone().json()).toEqual([]);
    expect((await fetch(new URL('/payments', baseUrl), { method: 'GET' })).status).toEqual(401);
  });
  it('rejects fractional amounts before persistence', async () => {
    await expect(PaymentController.create({ input: { account_id: 'd4a81068-26d4-4f48-bb6f-c49b509d4cc6', amount: 12.5, currency: 'EUR' } })).rejects.toThrow();
  });
  it('keeps collecting events but locks analytics when the trial expires', async () => {
    const registration = await fetch(new URL('/auth/register', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'trial@example.com', password: 'a-long-test-password', domain: 'trial.example.com' }),
    });
    const cookie = String(registration.headers.get('set-cookie')).split(';')[0];
    const site = await registration.json();
    const billing = await fetch(new URL('/billing', baseUrl), { headers: { cookie } });
    expect(await billing.json()).toMatchObject({ plan: 'start', interval: 'month', status: 'trialing' });
    await database('accounts')
      .where({ email: 'trial@example.com' })
      .update({ trial_ends_at: new Date(Date.now() - 1) });
    const event = await fetch(new URL('/event', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ v: '1', n: 'pv', s: 'trial.example.com', u: 'https://trial.example.com/', r: '', w: 1440, l: 'en', t: 'UTC' }),
    });
    expect(event.status).toEqual(204);
    const analytics = await fetch(new URL(`/analytics/overview?site=${site.id}`, baseUrl), { headers: { cookie } });
    expect({ status: analytics.status, body: await analytics.json() }).toEqual({
      status: 402,
      body: { code: 'PAYMENT_REQUIRED', message: 'Your trial has ended. Choose a plan to view your analytics.' },
    });
  });
});
