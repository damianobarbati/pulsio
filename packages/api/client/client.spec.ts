import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { faker } from '@faker-js/faker';
import { type Browser, type BrowserContext, chromium, type Page } from 'playwright';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const JOHN_DOE_ID = '1a0af49-49a7-7c68-8b35-12a3e7804984';

const html = `
<html lang="en">
  <head>
    <script async src="https://api.pulsio.live/client.dist.js" data-pulsio-id="${JOHN_DOE_ID}"></script>
  </head>
  <body>
    <h1>Tracking script test</h1>
    <main>${Array.from({ length: 100 }, () => faker.lorem.paragraph()).join('<br />')}</main>
  </body>
</html>
`;

const domApiHtml = `
<html lang="en">
  <head>
    <script async src="https://api.pulsio.live/client.dist.js" data-pulsio-id="${JOHN_DOE_ID}"></script>
  </head>
  <body>
    <span hidden data-pulsio-event="subscription" data-pulsio-trigger="present" data-pulsio-props='{"newsletter":"Dogs & Cats"}'></span>
    <input type="hidden" data-pulsio-event="listing" data-pulsio-trigger="present" data-pulsio-props='{"product_id":"123","unit_price":1000,"currency":"EUR"}' />
    <button id="add" data-pulsio-event="add" data-pulsio-trigger="click" data-pulsio-props='{"product_id":"123","quantity":1,"unit_price":1000,"currency":"EUR"}'>Add to cart</button>
    <button id="checkout" data-pulsio-event="checkout" data-pulsio-trigger="click" data-pulsio-transaction-id="checkout_123" data-pulsio-revenue-amount="1000" data-pulsio-revenue-currency="EUR" data-pulsio-items='[{"id":"123","name":"Product 123","quantity":1,"price":1000}]'>Checkout</button>
    <input type="hidden" data-pulsio-event="purchase" data-pulsio-trigger="present" data-pulsio-transaction-id="order_789" data-pulsio-revenue-amount="1000" data-pulsio-revenue-currency="EUR" data-pulsio-items='[{"id":"123","name":"Product 123","quantity":1,"price":1000}]' />
  </body>
</html>
`;

const jsApiHtml = `
<html lang="en">
  <head>
    <script async src="https://api.pulsio.live/client.dist.js" data-pulsio-id="${JOHN_DOE_ID}"></script>
  </head>
  <body></body>
</html>
`;

describe('client.ts', () => {
  let browser: Browser;
  let page: Page;
  let context: BrowserContext;
  let clientBundleSource: string;

  beforeAll(async () => {
    browser = await chromium.launch({ channel: 'chromium-headless-shell', headless: true });
    context = await browser.newContext({ locale: 'pt-PT', timezoneId: 'Europe/Lisbon', viewport: { width: 1366, height: 700 } });
    clientBundleSource = await readFile(resolve(__dirname, './client.dist.js'), 'utf-8');
  });

  beforeEach(async () => {
    page = await context.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('event is sent when view is loaded', async () => {
    await page.route('https://api.pulsio.live/client.dist.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: clientBundleSource }));
    await page.route('https://api.pulsio.live/event', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('https://app.test/', async (route) => await route.fulfill({ contentType: 'text/html', body: html }));

    const eventRequestPromise = page.waitForRequest('https://api.pulsio.live/event');
    await page.goto('https://app.test/');
    const eventRequest = await eventRequestPromise;
    const eventSent = JSON.parse(eventRequest.postData() as string);

    expect(eventSent).toMatchObject({
      version: '1',
      event_name: 'view',
      user_id: '1a0af49-49a7-7c68-8b35-12a3e7804984',
      url: 'https://app.test/',
      referrer: null,
      width: 1366,
    });
  });

  it('sends active time without an interaction', async () => {
    await page.clock.install();
    await page.route('https://api.pulsio.live/client.dist.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: clientBundleSource }));
    await page.route('https://api.pulsio.live/event', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('https://app.test/', (route) => route.fulfill({ contentType: 'text/html', body: html }));

    await page.goto('https://app.test/');
    await page.bringToFront();
    const engagementRequestPromise = page.waitForRequest((request) => {
      const body = request.postData();
      return request.url() === 'https://api.pulsio.live/event' && !!body && JSON.parse(body).event_name === 'engagement';
    });
    await page.clock.runFor(10_000);
    const engagementRequest = await engagementRequestPromise;
    const engagementEvent = JSON.parse(engagementRequest.postData() as string);

    expect(engagementEvent.engagement_ms).toBeGreaterThanOrEqual(10_000);
  });

  it('event is sent when user scrolls', async () => {
    await page.route('https://api.pulsio.live/client.dist.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: clientBundleSource }));
    await page.route('https://api.pulsio.live/event', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

    await page.route('https://app.test/', async (route) => await route.fulfill({ contentType: 'text/html', body: html }));
    await page.addInitScript(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (window.name === 'hidden' ? 'hidden' : 'visible') });
    });

    const viewRequest = page.waitForRequest('https://api.pulsio.live/event');
    await page.goto('https://app.test/');
    await viewRequest;

    const interactionRequestPromise = page.waitForRequest((req) => {
      if (req.url() !== 'https://api.pulsio.live/event') return false;
      const body = req.postData();
      return body ? JSON.parse(body).event_name === 'interaction' : false;
    });

    await page.evaluate(async () => {
      const targetDepth = document.documentElement.scrollHeight / 2;
      const steps = 10;
      const stepDistance = targetDepth / steps;
      for (let i = 0; i < steps; i++) {
        window.scrollBy(0, stepDistance);
        await new Promise((resolve) => window.setTimeout(resolve, 50));
      }
    });

    await page.evaluate(() => {
      window.name = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    const interactionRequest = await interactionRequestPromise;
    const interactionEvent = JSON.parse(interactionRequest.postData() as string);

    expect(interactionEvent).toMatchObject({
      version: '1',
      event_name: 'interaction',
      user_id: '1a0af49-49a7-7c68-8b35-12a3e7804984',
      url: 'https://app.test/',
      referrer: null,
      width: 1366,
      scroll_depth: expect.toSatisfy((val: number) => val >= 50),
    });
  });

  it('tracks DOM API examples', async () => {
    const events: any[] = [];
    await page.route('https://api.pulsio.live/client.dist.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: clientBundleSource }));
    await page.route('https://api.pulsio.live/event', async (route) => {
      const body = route.request().postData();
      if (body) events.push(JSON.parse(body));
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('https://app.test/', async (route) => await route.fulfill({ contentType: 'text/html', body: domApiHtml }));

    await page.goto('https://app.test/');

    await expect.poll(() => events.filter((event) => ['subscription', 'listing', 'purchase'].includes(event.event_name)).length).toBe(3);
    expect(events.find((event) => event.event_name === 'subscription')).toMatchObject({ props: { newsletter: 'Dogs & Cats' } });
    expect(events.find((event) => event.event_name === 'listing')).toMatchObject({ props: { product_id: '123', unit_price: 1000, currency: 'EUR' } });
    expect(events.find((event) => event.event_name === 'purchase')).toMatchObject({
      transaction_id: 'order_789',
      revenue_amount: 1000,
      revenue_currency: 'EUR',
      items: [{ id: '123', name: 'Product 123', quantity: 1, price: 1000 }],
    });

    const addRequestPromise = page.waitForRequest((request) => request.url() === 'https://api.pulsio.live/event' && JSON.parse(request.postData() || '{}').event_name === 'add');
    await page.locator('#add').click();
    const addRequest = await addRequestPromise;
    expect(JSON.parse(addRequest.postData() as string)).toMatchObject({ event_name: 'add', props: { product_id: '123', quantity: 1, unit_price: 1000, currency: 'EUR' } });

    const checkoutRequestPromise = page.waitForRequest(
      (request) => request.url() === 'https://api.pulsio.live/event' && JSON.parse(request.postData() || '{}').event_name === 'checkout',
    );
    await page.locator('#checkout').click();
    const checkoutRequest = await checkoutRequestPromise;
    expect(JSON.parse(checkoutRequest.postData() as string)).toMatchObject({
      event_name: 'checkout',
      transaction_id: 'checkout_123',
      revenue_amount: 1000,
      revenue_currency: 'EUR',
      items: [{ id: '123', name: 'Product 123', quantity: 1, price: 1000 }],
    });
  });

  it('tracks visible elements once', async () => {
    const events: any[] = [];
    await page.route('https://api.pulsio.live/client.dist.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: clientBundleSource }));
    await page.route('https://api.pulsio.live/event', async (route) => {
      const body = route.request().postData();
      if (body) events.push(JSON.parse(body));
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route(
      'https://app.test/',
      async (route) =>
        await route.fulfill({
          contentType: 'text/html',
          body: `${jsApiHtml.replace('</body>', '<div style="height: 200vh"></div><section id="visible" data-pulsio-event="inspect" data-pulsio-trigger="visible" data-pulsio-props=\'{"product_id":"123"}\'>Product</section></body>')}`,
        }),
    );

    await page.goto('https://app.test/');
    expect(events.some((event) => event.event_name === 'inspect')).toBe(false);

    await page.locator('#visible').scrollIntoViewIfNeeded();
    await expect.poll(() => events.filter((event) => event.event_name === 'inspect').length).toBe(1);

    await page.locator('#visible').evaluate((element) => element.setAttribute('data-pulsio-props', '{"product_id":"456"}'));
    await page.waitForTimeout(250);
    expect(events.filter((event) => event.event_name === 'inspect')).toHaveLength(1);
  });

  it('tracks JavaScript API examples', async () => {
    const events: any[] = [];
    await page.route('https://api.pulsio.live/client.dist.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: clientBundleSource }));
    await page.route('https://api.pulsio.live/event', async (route) => {
      const body = route.request().postData();
      if (body) events.push(JSON.parse(body));
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('https://app.test/', async (route) => await route.fulfill({ contentType: 'text/html', body: jsApiHtml }));

    await page.goto('https://app.test/');
    await page.waitForFunction(() => typeof window.pulsio === 'function');
    await page.evaluate(() => {
      window.pulsio('subscription', { props: { newsletter: 'Dogs & Cats' } });
      window.pulsio('listing', { props: { id: '123', name: 'Dog', price: 1000, currency: 'EUR', quantity: 1 } });
      window.pulsio('add', { props: { id: '123', name: 'Cat', price: 1000, currency: 'EUR', quantity: 1 } });
      window.pulsio('checkout', {
        transaction_id: 'checkout_123',
        revenue_amount: 1000,
        revenue_currency: 'EUR',
        items: [{ id: '123', name: 'Product 123', quantity: 1, price: 1000 }],
      });
      window.pulsio('purchase', {
        transaction_id: 'order_789',
        revenue_amount: 1000,
        revenue_currency: 'EUR',
        items: [{ id: '123', name: 'Product 123', quantity: 1, price: 1000 }],
      });
    });

    await expect.poll(() => events.filter((event) => ['subscription', 'listing', 'add', 'checkout', 'purchase'].includes(event.event_name)).length).toBe(5);
    expect(events.find((event) => event.event_name === 'subscription')).toMatchObject({ props: { newsletter: 'Dogs & Cats' } });
    expect(events.find((event) => event.event_name === 'listing')).toMatchObject({ props: { id: '123', price: 1000, currency: 'EUR' } });
    expect(events.find((event) => event.event_name === 'add')).toMatchObject({ props: { id: '123', quantity: 1, price: 1000, currency: 'EUR' } });
    expect(events.find((event) => event.event_name === 'checkout')).toMatchObject({ transaction_id: 'checkout_123', revenue_amount: 1000, revenue_currency: 'EUR' });
    expect(events.find((event) => event.event_name === 'purchase')).toMatchObject({ transaction_id: 'order_789', revenue_amount: 1000, revenue_currency: 'EUR' });
  });
});
