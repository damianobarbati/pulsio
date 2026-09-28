import type { ClientEvent } from 'types/Event.ts';

type EventOptions = {
  scroll_depth?: ClientEvent['scroll_depth'];
  engagement_ms?: ClientEvent['engagement_ms'];
  props?: ClientEvent['props'];
  revenue_amount?: ClientEvent['revenue_amount'];
  revenue_currency?: ClientEvent['revenue_currency'];
  transaction_id?: string;
  items?: ClientEvent['items'];
};

declare global {
  interface Window {
    pulsio: (name: string, options?: EventOptions) => void;
  }
}

const script = document.querySelector<HTMLScriptElement>('script[data-pulsio-id]');
if (!script) throw new Error('Pulsio: script not found');

const api_origin = new URL(script.src).origin;
const user_id = script.dataset.pulsioId;
if (!user_id) throw new Error('Pulsio: data-pulsio-id not found.');

const cleanUrl = (value: string, base: string = window.location.origin) => {
  try {
    const url = new URL(value, base);
    url.hash = '';
    url.username = '';
    url.password = '';
    const allowedParams = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'q', 'query', 's', 'search']);
    for (const key of Array.from(url.searchParams.keys())) {
      if (!allowedParams.has(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return value;
  }
};

let currentViewUrl = cleanUrl(location.href);

const send = (name = 'view', options: EventOptions = {}) => {
  if (!user_id) return;

  const payload: ClientEvent = {
    version: '1',
    event_name: name,
    user_id,
    url: currentViewUrl,
    referrer: document.referrer ? cleanUrl(document.referrer) : null,
    width: screen.width,
    scroll_depth: options.scroll_depth ?? null,
    engagement_ms: options.engagement_ms ?? 0,
    props: options.props ?? {},
    transaction_id: options.transaction_id ?? null,
    revenue_amount: options.revenue_amount ?? null,
    revenue_currency: options.revenue_currency ?? null,
    items: options.items ?? [],
  };

  navigator.sendBeacon(`${api_origin}/event`, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
};

window.pulsio = send;

/**
 * Engagement tracking
 */
const userActivity = { interacted: false, maxScrollDepth: 0 };

const registerActivity = () => {
  userActivity.interacted = true;
};

const trackScroll = () => {
  userActivity.interacted = true;
  const windowHeight = window.innerHeight;
  const fullHeight = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
  const currentScroll = window.scrollY || window.pageYOffset;
  const totalScrollable = fullHeight - windowHeight;

  if (totalScrollable > 0) {
    const depthPercentage = Math.round((currentScroll / totalScrollable) * 100);
    userActivity.maxScrollDepth = Math.max(userActivity.maxScrollDepth, Math.min(100, depthPercentage));
  }
};

const throttle = (fn: (...args: any[]) => void, wait: number) => {
  let time = Date.now();
  return () => {
    if (time + wait - Date.now() <= 0) {
      fn();
      time = Date.now();
    }
  };
};

window.addEventListener('scroll', throttle(trackScroll, 200), { passive: true });
window.addEventListener('pointerdown', registerActivity, { passive: true, capture: true });
window.addEventListener('input', registerActivity, { passive: true });

/**
 * Heartbeat every 10s if the view is visible
 */
const isActive = () => document.visibilityState === 'visible' && document.hasFocus();
let activeSince: number | null = isActive() ? performance.now() : null;

const flushEngagement = () => {
  const now = performance.now();
  const engagement_ms = activeSince === null ? 0 : Math.max(0, Math.round(now - activeSince));
  activeSince = isActive() ? now : null;
  if (!userActivity.interacted && engagement_ms === 0) return;

  const eventName = userActivity.interacted ? 'interaction' : 'engagement';
  send(eventName, { scroll_depth: userActivity.interacted ? userActivity.maxScrollDepth : null, engagement_ms });
  userActivity.interacted = false;
};

setInterval(flushEngagement, 10_000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flushEngagement();
    activeSince = null;
  } else if (isActive() && activeSince === null) activeSince = performance.now();
});

window.addEventListener('blur', () => {
  flushEngagement();
  activeSince = null;
});
window.addEventListener('focus', () => {
  if (isActive() && activeSince === null) activeSince = performance.now();
});
window.addEventListener('pagehide', () => {
  flushEngagement();
  activeSince = null;
});
window.addEventListener('pageshow', () => {
  if (isActive() && activeSince === null) activeSince = performance.now();
});

/**
 * SPA and browser routing support
 */
const handlePageChange = () => {
  flushEngagement();
  userActivity.maxScrollDepth = 0;
  currentViewUrl = cleanUrl(location.href);
  send('view');
};

addEventListener('popstate', handlePageChange);

const pushState = history.pushState;
history.pushState = (...args) => {
  pushState.apply(history, args);
  handlePageChange();
};

const replaceState = history.replaceState;
history.replaceState = (...args) => {
  replaceState.apply(history, args);
  handlePageChange();
};

/**
 * Track this view load
 */
send('view');

/** Browser Client API **/
/**
Use these attributes on any HTML element:
data-pulsio-event="event_name"
data-pulsio-trigger="present|visible|click"

- present: send once when element exists in DOM. Works with hidden.
- visible: send once when element enters viewport.
- click: send on each user click on element or its children.

Optional data:
data-pulsio-props='{"key":"value","quantity":1}'
data-pulsio-transaction-id="order_123"
data-pulsio-revenue-amount="49.90"
data-pulsio-revenue-currency="EUR"
data-pulsio-items='[{"id":"pro","name":"Pro plan","quantity":1,"price":49.90}]'

Props must be a JSON object with string, number, or boolean values.
checkout and purchase require transaction-id, revenue-amount, and revenue-currency together.
items is optional.

## Custom goal

DOM API =>
<span
  hidden
  data-pulsio-event="subscription"
  data-pulsio-trigger="present"
  data-pulsio-props='{"newsletter":"Dogs & Cats"}'
></span>

JS API =>
window.pulsio('subscription', { props: { newsletter: 'Dogs & Cats' } });

---

Ecommerce funnel example is:

1. PRODUCT LISTING

DOM API =>
<input type="hidden"
  data-pulsio-event="listing"
  data-pulsio-trigger="present"
  data-pulsio-props='{"product_id":"123","unit_price":1000,"currency":"EUR"}'
/>
JS API =>
window.pulsio('listing', { props: { product_id: '123', unit_price: 1000, currency: 'EUR' } });

2. ADD TO CART

DOM API =>
<button
  data-pulsio-event="add"
  data-pulsio-trigger="click"
  data-pulsio-props='{"product_id":"123","quantity":1,"unit_price":1000,"currency":"EUR"}'
/>

JS API =>
window.pulsio('add', { props: { product_id: '123', quantity: 1, unit_price: 1000, currency: 'EUR' } });

3. CHECKOUT STARTED

DOM API =>
<button
  data-pulsio-event="checkout"
  data-pulsio-trigger="click"
  data-pulsio-transaction-id="checkout_123"
  data-pulsio-revenue-amount="1000"
  data-pulsio-revenue-currency="EUR"
  data-pulsio-items='[{"id":"123","name":"Product 123","quantity":1,"price":1000}]'
/>

JS API =>
window.pulsio('checkout', {
  transaction_id: 'checkout_456',
  revenue: { amount: 1000, currency: 'EUR' },
  items: [{ id: '123', name: 'Product 123', quantity: 1, price: 1000 }],
});

4. PURCHASE COMPLETED

DOM API =>
<input
  type="hidden"
  data-pulsio-event="purchase"
  data-pulsio-trigger="present"
  data-pulsio-transaction-id="order_789"
  data-pulsio-revenue-amount="1000"
  data-pulsio-revenue-currency="EUR"
  data-pulsio-items='[{"id":"123","name":"Product 123","quantity":1,"price":1000}]'
/>

JS API =>
window.pulsio('purchase', {
  transaction_id: 'order_456',
  revenue: { amount: 1000, currency: 'EUR' },
  items: [{ id: '123', name: 'Product 123', quantity: 1, price: 1000 }],
});

*/

const isProps = (value: unknown): value is NonNullable<EventOptions['props']> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.values(value).every((property) => ['string', 'number', 'boolean'].includes(typeof property));
};

const isItems = (value: unknown): value is NonNullable<EventOptions['items']> => {
  if (!Array.isArray(value)) return false;

  return value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.quantity === 'number' &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      typeof item.price === 'number' &&
      Number.isFinite(item.price) &&
      item.price > 0,
  );
};

const domOptions = (element: HTMLElement, eventName: string) => {
  const propsText = element.dataset.pulsioProps;
  const itemsText = element.dataset.pulsioItems;
  let props: EventOptions['props'];
  let items: EventOptions['items'];

  try {
    if (propsText) {
      const parsedProps: unknown = JSON.parse(propsText);
      if (!isProps(parsedProps)) return null;
      props = parsedProps;
    }

    if (itemsText) {
      const parsedItems: unknown = JSON.parse(itemsText);
      if (!isItems(parsedItems)) return null;
      items = parsedItems;
    }
  } catch {
    return null;
  }

  const transaction_id = element.dataset.pulsioTransactionId;
  const amountText = element.dataset.pulsioRevenueAmount;
  const currency = element.dataset.pulsioRevenueCurrency;
  const hasRevenueData = [transaction_id, amountText, currency].some((value) => value !== undefined);
  const hasCompleteRevenueData = transaction_id !== undefined && amountText !== undefined && currency !== undefined;
  if ((eventName === 'checkout' || eventName === 'purchase') && !hasCompleteRevenueData) return null;
  if (hasRevenueData && !hasCompleteRevenueData) return null;

  const options: EventOptions = { props, items };
  if (!hasCompleteRevenueData) return options;

  const amount = Number(amountText);
  if (!transaction_id || !Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency)) return null;

  options.transaction_id = transaction_id;
  options.revenue_amount = amount;
  options.revenue_currency = currency;
  return options;
};

const trackedDomEvents = new WeakMap<HTMLElement, Set<string>>();

const trackOnce = (element: HTMLElement, eventName: string) => {
  const trackedEvents = trackedDomEvents.get(element);
  if (trackedEvents?.has(eventName)) return;

  const options = domOptions(element, eventName);
  if (!options) return;

  send(eventName, options);
  if (trackedEvents) trackedEvents.add(eventName);
  else trackedDomEvents.set(element, new Set([eventName]));
};

const visibleObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const element = entry.target as HTMLElement;
    if (element.dataset.pulsioTrigger !== 'visible') continue;
    const eventName = element.dataset.pulsioEvent;
    if (!eventName) continue;

    trackOnce(element, eventName);
    visibleObserver.unobserve(element);
  }
});

const scanDomEvents = () => {
  for (const element of document.querySelectorAll<HTMLElement>('[data-pulsio-event][data-pulsio-trigger]')) {
    const eventName = element.dataset.pulsioEvent;
    const trigger = element.dataset.pulsioTrigger;
    if (!eventName) continue;
    if (trigger === 'present') trackOnce(element, eventName);
    if (trigger === 'visible') visibleObserver.observe(element);
  }
};

scanDomEvents();

new MutationObserver(scanDomEvents).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    'data-pulsio-event',
    'data-pulsio-trigger',
    'data-pulsio-props',
    'data-pulsio-transaction-id',
    'data-pulsio-revenue-amount',
    'data-pulsio-revenue-currency',
    'data-pulsio-items',
  ],
});

document.addEventListener('click', (event) => {
  if (!event.isTrusted || !(event.target instanceof Element)) return;
  const element = event.target.closest<HTMLElement>('[data-pulsio-event][data-pulsio-trigger="click"]');
  if (!element) return;
  const eventName = element.dataset.pulsioEvent;
  if (!eventName) return;

  const options = domOptions(element, eventName);
  if (options) send(eventName, options);
});
