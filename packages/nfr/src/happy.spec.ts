import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import CheckoutAttemptRepository from 'api/misc/CheckoutAttemptRepository.ts';
import PaymentRepository from 'api/misc/PaymentRepository.ts';
import SubscriptionRepository from 'api/misc/SubscriptionRepository.ts';
import UserRepository from 'api/user/UserRepository.ts';
import type { Browser, Page } from 'playwright';
import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { click, headed, keepBrowserOpen, openBrowser, pause, type } from './browser.ts';

const websiteUrl = process.env.WEBSITE_URL;
const dashboardUrl = process.env.WEBAPP_URL;
if (!websiteUrl || !dashboardUrl) throw new Error('WEBSITE_URL and WEBAPP_URL are required.');
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY is required.');
const stripe = new Stripe(stripeSecretKey);
const email = 'jane.dane@gmail.com';
const password = email;
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

const fillStripeField = async ({ page, name, value, timeout }: { page: Page; name: string; value: string; timeout: number }): Promise<boolean> => {
  const autocomplete = name === 'cardNumber' ? 'number' : name === 'cardExpiry' ? 'exp' : name === 'cardCvc' ? 'csc' : name;
  const selector = `input[name="${name}"], input[autocomplete="cc-${autocomplete}"], input[autocomplete="${name}"]`;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      const field = frame.locator(selector).first();
      if (!(await field.count())) continue;
      try {
        await field.waitFor({ state: 'visible', timeout: Math.max(1, deadline - Date.now()) });
        await field.fill(value);
        return true;
      } catch {}
    }
    await page.waitForTimeout(100);
  }

  return false;
};

const selectStripeOption = async ({ page, name, labels, timeout }: { page: Page; name: string; labels: string[]; timeout: number }): Promise<boolean> => {
  const selector = `select[name="${name}"]`;
  const expectedLabels = labels.map((label) => label.toLowerCase());
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      const select = frame.locator(selector).first();
      if (!(await select.count())) continue;
      try {
        await select.waitFor({ state: 'visible', timeout: Math.max(1, deadline - Date.now()) });
        const options = await select
          .locator('option')
          .evaluateAll((elements) => elements.map((element) => ({ label: element.textContent?.trim() ?? '', value: (element as HTMLOptionElement).value })));
        const option = options.find(({ label, value }) => expectedLabels.includes(label.toLowerCase()) || expectedLabels.includes(value.toLowerCase()));
        if (!option) continue;
        await select.selectOption({ value: option.value });
        return true;
      } catch {}
    }
    await page.waitForTimeout(100);
  }

  return false;
};

const completeStripeCheckout = async (current: Page) => {
  await selectStripeOption({ page: current, name: 'billingCountry', labels: ['Italy'], timeout: 15_000 });
  await selectStripeOption({ page: current, name: 'billingAdministrativeArea', labels: ['Milano', 'Milan', 'MI', 'Lombardy'], timeout: 15_000 });

  const stripeFields = [
    ['phoneNumber', '+393123456789'],
    ['billingName', 'Jane Dane'],
    ['billingAddressLine1', '1 Test Street'],
    ['billingLocality', 'Milan'],
    ['billingPostalCode', '20100'],
    ['cardNumber', '4242424242424242'],
    ['cardExpiry', '1230'],
    ['cardCvc', '123'],
  ] as const;
  for (const [name, value] of stripeFields) {
    const isCardField = name === 'cardNumber' || name === 'cardExpiry' || name === 'cardCvc';
    const filled = await fillStripeField({ page: current, name, value, timeout: isCardField ? 15_000 : 1_000 });
    if (isCardField && !filled) throw new Error(`Stripe field ${name} was not rendered.`);
  }
  const stripeConsent = current.getByText('I am an AI agent acting on behalf of someone else');
  if (await stripeConsent.count()) {
    await current.waitForTimeout(250);
    await stripeConsent.evaluate((element: HTMLElement) => element.click());
  }
  await click({ page: current, locator: current.locator('button[type="submit"]') });
  await current.waitForURL(`${dashboardUrl}/billing**`, { timeout: 60_000 });
};

const removeAccount = async () => {
  const account = await UserRepository.findBy({ email });
  if (!account) return;
  const checkoutAttempts = await CheckoutAttemptRepository.getem({ user_id: account.id });
  for (const checkoutAttempt of checkoutAttempts) await CheckoutAttemptRepository.remove(checkoutAttempt.id);
  const subscriptions = await SubscriptionRepository.getem({ user_id: account.id });
  for (const subscription of subscriptions) await SubscriptionRepository.remove(subscription.id);
  const payments = await PaymentRepository.getem({ user_id: account.id });
  for (const payment of payments) await PaymentRepository.remove(payment.id);
  await UserRepository.remove(account.id);
};

beforeEach(async () => {
  await removeAccount();
});

afterEach(async () => {
  if (!keepBrowserOpen && browser) await browser.close();
  await removeAccount();
  if (keepBrowserOpen) return;
  browser = undefined;
  page = undefined;
});

describe('Happy path', () => {
  it('user registers, pays for Solo plan, downloads invoice, receives recurring payment, refreshes billing and downloads second invoice', async () => {
    const current = await open({ path: '/start-tracking?plan=free' });
    await type({ page: current, selector: 'input[type="email"]', value: email });
    await type({ page: current, selector: 'input[type="password"]', value: password });
    await click({ page: current, locator: current.getByRole('button', { name: 'Get your snippet ↗' }) });
    await current.getByRole('heading', { name: 'Your account is ready.' }).waitFor({ state: 'visible' });
    await Promise.all([current.waitForURL(`${dashboardUrl}/**`), click({ page: current, locator: current.getByRole('link', { name: 'Open dashboard ↗' }) })]);
    const account = await UserRepository.findBy({ email });
    if (!account) throw new Error('Registered account was not found.');
    const freeSubscriptions = await SubscriptionRepository.getem({ user_id: account.id, stripe_subscription_id: null });
    for (const subscription of freeSubscriptions) await SubscriptionRepository.remove(subscription.id);

    await click({ page: current, locator: current.getByRole('link', { name: 'Billing' }) });
    await current.getByRole('heading', { name: 'Billing' }).waitFor({ state: 'visible' });
    await current.getByRole('heading', { name: 'Solo', level: 3 }).waitFor({ state: 'visible' });
    await current.getByText('Next billing date:').waitFor({ state: 'visible' });
    await click({ page: current, locator: current.getByRole('button', { name: 'Choose Solo' }) });
    await click({ page: current, locator: current.getByRole('button', { name: 'Choose plan & continue' }) });
    await current.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

    await completeStripeCheckout(current);

    await expect
      .poll(
        async () => {
          const account = await UserRepository.findBy({ email });
          if (!account) return false;
          const subscription = await SubscriptionRepository.findBy({ user_id: account.id });
          if (!subscription?.current_period_ends_at) return false;
          const payments = await PaymentRepository.getem({ user_id: account.id });
          return payments.some((payment) => Boolean(payment.invoice_url));
        },
        { timeout: 60_000 },
      )
      .toBe(true);
    const subscription = await SubscriptionRepository.findBy({ user_id: account.id });
    if (!subscription?.stripe_subscription_id || !subscription.current_period_ends_at) throw new Error('Stripe subscription was not synchronized.');
    const paidStripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const paidPrice = paidStripeSubscription.items.data[0]?.price;
    const recurrence = paidPrice?.recurring?.interval;
    if (!paidPrice?.unit_amount || (recurrence !== 'month' && recurrence !== 'year')) throw new Error('Stripe subscription price was not returned.');
    const expectedNextBillingDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(Date.parse(subscription.current_period_ends_at));
    await current.reload();
    await current.getByRole('heading', { name: 'Solo', level: 3 }).waitFor({ state: 'visible' });
    await current.getByText(`Next billing date: ${expectedNextBillingDate}`).waitFor({ state: 'visible' });
    const invoiceLink = current.getByRole('link', { name: 'Download invoice' });
    await invoiceLink.waitFor({ state: 'visible' });
    const firstInvoiceHref = await invoiceLink.getAttribute('href');
    expect(firstInvoiceHref).toMatch(/^https:\/\/(invoice|pay)\.stripe\.com\//);
    const firstDownloadPromise = current.context().waitForEvent('download');
    await click({ page: current, locator: invoiceLink });
    const firstDownload = await firstDownloadPromise;
    expect(firstDownload.suggestedFilename()).toMatch(/\.pdf$/i);
    expect(await firstDownload.failure()).toBeNull();
    const invoiceDirectory = headed ? join(homedir(), 'Desktop') : '/tmp';
    await mkdir(invoiceDirectory, { recursive: true });
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const invoicePath = join(invoiceDirectory, `invoice_${currentDate}.pdf`);
    await firstDownload.saveAs(invoicePath);
    const initialPayments = await PaymentRepository.getem({ user_id: account.id });
    const initialPaymentCount = initialPayments.length;
    expect(initialPaymentCount).toBe(1);
    const firstPayment = initialPayments[0];
    if (!firstPayment) throw new Error('First invoice payment was not synchronized.');
    if (!firstPayment.paid_at) throw new Error('First invoice paid timestamp was not synchronized.');
    expect(firstPayment.amount).toBe(paidPrice.unit_amount);

    const clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now() / 1000), name: `nfr-${account.id}` });
    const customer = await stripe.customers.create({ email, test_clock: clock.id });
    const paymentMethod = await stripe.paymentMethods.create({ type: 'card', card: { token: 'tok_visa' } });
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
    const product = await stripe.products.create({ name: 'Pulsio solo plan' });
    const createdSubscription = await stripe.subscriptions.create({
      customer: customer.id,
      default_payment_method: paymentMethod.id,
      items: [
        {
          price_data: {
            currency: paidPrice.currency,
            unit_amount: paidPrice.unit_amount,
            recurring: { interval: recurrence },
            product: product.id,
          },
          quantity: 1,
        },
      ],
      metadata: { user_id: account.id, plan: 'solo', recurrence },
    });
    const currentPeriodEndsAt = createdSubscription.items.data[0]?.current_period_end;
    if (!currentPeriodEndsAt) throw new Error('Stripe subscription period was not returned.');

    await expect
      .poll(
        async () => {
          const subscription = await SubscriptionRepository.findBy({ stripe_subscription_id: createdSubscription.id });
          return Boolean(subscription?.current_period_ends_at);
        },
        { timeout: 60_000 },
      )
      .toBe(true);
    await expect
      .poll(
        async () => {
          const payments = await PaymentRepository.getem({ user_id: account.id });
          return payments.length;
        },
        { timeout: 60_000 },
      )
      .toBe(initialPaymentCount + 1);

    const firstSubscription = await SubscriptionRepository.findBy({ stripe_subscription_id: createdSubscription.id });
    if (!firstSubscription?.stripe_subscription_id || !firstSubscription.current_period_ends_at) throw new Error('Stripe subscription was not synchronized.');
    const firstPeriodEndsAt = firstSubscription.current_period_ends_at;
    await current.goto(`${dashboardUrl}/billing`);
    await current.getByRole('heading', { name: 'Billing' }).waitFor({ state: 'visible' });
    const firstInvoiceLink = current.getByRole('link', { name: 'Download invoice' });
    expect(await firstInvoiceLink.count()).toBe(initialPaymentCount + 1);
    await firstInvoiceLink.first().waitFor({ state: 'visible' });

    await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: Math.floor(Date.parse(firstPeriodEndsAt) / 1000) + 1 });
    await expect
      .poll(
        async () => {
          const currentClock = await stripe.testHelpers.testClocks.retrieve(clock.id);
          return currentClock.status;
        },
        { timeout: 60_000 },
      )
      .toBe('ready');
    await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: Math.floor(Date.parse(firstPeriodEndsAt) / 1000) + 24 * 60 * 60 });
    await expect
      .poll(
        async () => {
          const currentClock = await stripe.testHelpers.testClocks.retrieve(clock.id);
          return currentClock.status;
        },
        { timeout: 60_000 },
      )
      .toBe('ready');
    await expect
      .poll(
        async () => {
          const payments = await PaymentRepository.getem({ user_id: account.id });
          return payments.length;
        },
        { timeout: 60_000 },
      )
      .toBe(initialPaymentCount + 2);

    const subscriptionInvoices = await stripe.invoices.list({ subscription: createdSubscription.id });
    const recurringInvoice = subscriptionInvoices.data[0];
    if (!recurringInvoice) throw new Error('Recurring invoice was not returned.');
    expect(recurringInvoice.amount_paid).toBe(paidPrice.unit_amount);
    const payments = await PaymentRepository.getem({ user_id: account.id });
    const recurringPayment = payments.find((payment) => payment.provider_reference === recurringInvoice.id);
    if (!recurringPayment) throw new Error('Recurring invoice payment was not synchronized.');
    if (!recurringPayment.paid_at) throw new Error('Recurring invoice paid timestamp was not synchronized.');
    expect(recurringPayment.amount).toBe(paidPrice.unit_amount);
    expect(Date.parse(recurringPayment.paid_at)).toBeGreaterThan(Date.parse(firstPayment.paid_at));

    const secondSubscription = await SubscriptionRepository.findBy({ stripe_subscription_id: createdSubscription.id });
    if (!secondSubscription?.current_period_ends_at || secondSubscription.current_period_ends_at <= firstPeriodEndsAt)
      throw new Error('Recurring payment did not update subscription period.');
    await current.reload();
    await current.getByRole('heading', { name: 'Billing' }).waitFor({ state: 'visible' });
    const invoiceLinks = current.getByRole('link', { name: 'Download invoice' });
    expect(await invoiceLinks.count()).toBe(initialPaymentCount + 2);
    const secondInvoiceLink = invoiceLinks.first();
    const secondInvoiceHref = await secondInvoiceLink.getAttribute('href');
    expect(secondInvoiceHref).toMatch(/^https:\/\/(invoice|pay)\.stripe\.com\//);
    const secondDownloadPromise = current.context().waitForEvent('download');
    await click({ page: current, locator: secondInvoiceLink });
    const secondDownload = await secondDownloadPromise;
    expect(secondDownload.suggestedFilename()).toMatch(/\.pdf$/i);
    expect(await secondDownload.failure()).toBeNull();
    await pause({ page: current });
  }, 300_000);
});
