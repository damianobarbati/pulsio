import type { Browser, Page } from 'playwright';
import { afterAll, afterEach, beforeEach, describe, it } from 'vitest';
import { database } from '../../api/dao/database.ts';
import { keepBrowserOpen, openBrowser, pause, type } from './browser.ts';

const websiteUrl = 'http://localhost:3001';
const dashboardUrl = 'http://localhost:3000';
const email = 'jane.dane@gmail.com';
const password = 'jane.dane@gmail.com';
const domain = 'lvh.me';
let browser: Browser | undefined;
let page: Page | undefined;

const open = async ({ path, mobile = false }: { path: string; mobile?: boolean }): Promise<Page> => {
  const result = await openBrowser();
  browser = result.browser;
  page = result.page;
  if (mobile) await page.setViewportSize({ width: 480, height: 700 });
  await page.goto(`${websiteUrl}${path}`);
  return page;
};

const fillStripeField = async ({ page, name, value }: { page: Page; name: string; value: string }) => {
  const field = page.locator(`input[name="${name}"]`);
  await field.waitFor({ state: 'visible' });
  await field.fill(value);
};

beforeEach(async () => {
  await database.transaction(async (transaction) => {
    const account = await transaction('accounts').where({ email }).first<{ id: string }>();
    if (!account) return;
    await transaction('payments').where({ account_id: account.id }).delete();
    await transaction('accounts').where({ id: account.id }).delete();
  });
});

afterEach(async () => {
  if (!keepBrowserOpen && browser) await browser.close();
  if (keepBrowserOpen) return;
  browser = undefined;
  page = undefined;
});

afterAll(async () => {
  await database.destroy();
});

describe('Happy path', () => {
  it('registers Jane Dane, opens the dashboard, and pays for Start', async () => {
    const current = await open({ path: '/start-tracking?plan=start' });
    await type({ page: current, selector: 'input[type="email"]', value: email });
    await type({ page: current, selector: 'input[type="password"]', value: password });
    await type({ page: current, selector: 'input[placeholder="your-site.com"]', value: domain });
    await current.getByRole('button', { name: 'Create account & get snippet ↗' }).click();
    await current.getByRole('heading', { name: `Let’s connect ${domain}.` }).waitFor({ state: 'visible' });
    await current.getByRole('link', { name: 'Open dashboard ↗' }).click();
    await current.waitForURL(`${dashboardUrl}/**`);
    await current.getByRole('button', { name: 'Websites & account' }).click();
    await current.getByText(`Signed in as ${email}`).waitFor({ state: 'visible' });

    await database('accounts')
      .where({ email })
      .update({ trial_ends_at: new Date(Date.now() - 60_000) });
    await current.reload();
    await current.getByRole('heading', { name: 'Your analytics are paused' }).waitFor({ state: 'visible' });
    await current.getByRole('button', { name: 'Choose a plan' }).click();
    await current.getByRole('heading', { name: 'Plan and invoices' }).waitFor({ state: 'visible' });
    await current.getByRole('button', { name: 'Choose plan & continue' }).click();
    await current.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

    await fillStripeField({ page: current, name: 'phoneNumber', value: '+393123456789' });
    await fillStripeField({ page: current, name: 'billingName', value: 'Jane Dane' });
    await fillStripeField({ page: current, name: 'billingAddressLine1', value: '1 Test Street' });
    await fillStripeField({ page: current, name: 'billingLocality', value: 'Milan' });
    await fillStripeField({ page: current, name: 'billingPostalCode', value: '20100' });
    await current.locator('select[name="billingAdministrativeArea"]').selectOption({ label: 'Milano' });
    await fillStripeField({ page: current, name: 'cardNumber', value: '4242424242424242' });
    await fillStripeField({ page: current, name: 'cardExpiry', value: '1230' });
    await fillStripeField({ page: current, name: 'cardCvc', value: '123' });
    await current.getByText('I am an AI agent acting on behalf of someone else').evaluate((element: HTMLElement) => element.click());
    await current.locator('button[type="submit"]').click();
    await current.waitForURL(`${dashboardUrl}/**`, { timeout: 30_000 });
    await current.waitForTimeout(2_000);
    await current.reload();
    await current.getByRole('button', { name: 'Websites & account' }).click();
    await current.getByText('Your start plan is active.').waitFor({ state: 'visible', timeout: 30_000 });
    await current.getByRole('link', { name: 'Download invoice' }).waitFor({ state: 'visible', timeout: 30_000 });
    await pause({ page: current });
  }, 180_000);
});
