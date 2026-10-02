# Browser Client API

You can send custom `events` (`goals` in the dashboard) using these attributes on any HTML element:
- `data-pulsio-event="event_name"`
- `data-pulsio-trigger="present|visible|click"`

Available events are:
- `present`: send once when element exists in DOM. Works with hidden.
- `visible`: send once when element enters viewport.
- `click`: send on each user click on element or its children.

Optional data:
- `data-pulsio-props='{"key":"value","quantity":1}'`
- `data-pulsio-transaction-id="order_123"`
- `data-pulsio-revenue-amount="49.90"`
- `data-pulsio-revenue-currency="EUR"`
- `data-pulsio-items='[{"id":"pro","name":"Pro plan","quantity":1,"price":49.90}]'`

Props must be a JSON object with string, number, or boolean values.  
Checkout and purchase require `transaction-id`, `revenue-amount`, `revenue-currency`; `items` is optional.

Example using DOM API:

```html
<span
  hidden
  data-pulsio-event="subscription"
  data-pulsio-trigger="present"
  data-pulsio-props='{"newsletter":"Dogs & Cats"}'
></span>
```

Example using JS API:

```js
window.pulsio('subscription', { props: { newsletter: 'Dogs & Cats' } });
```

## Ecommerce funnel example

**1. Product listing**

DOM API:

```html
<input type="hidden"
  data-pulsio-event="listing"
  data-pulsio-trigger="present"
  data-pulsio-props='{"product_id":"123","unit_price":1000,"currency":"EUR"}'
/>
```

JS API:

```js
window.pulsio('listing', { props: { product_id: '123', unit_price: 1000, currency: 'EUR' } });
```

**2. Add to cart**

DOM API:

```html
<button
  data-pulsio-event="add"
  data-pulsio-trigger="click"
  data-pulsio-props='{"product_id":"123","quantity":1,"unit_price":1000,"currency":"EUR"}'
/>
```

JS API:

```js
window.pulsio('add', { props: { product_id: '123', quantity: 1, unit_price: 1000, currency: 'EUR' } });
```

**3. Checkout started**

DOM API:

```html
<button
  data-pulsio-event="checkout"
  data-pulsio-trigger="click"
  data-pulsio-transaction-id="checkout_123"
  data-pulsio-revenue-amount="1000"
  data-pulsio-revenue-currency="EUR"
  data-pulsio-items='[{"id":"123","name":"Product 123","quantity":1,"price":1000}]'
/>
```

JS API:

```js
window.pulsio('checkout', {
  transaction_id: 'checkout_456',
  revenue: { amount: 1000, currency: 'EUR' },
  items: [{ id: '123', name: 'Product 123', quantity: 1, price: 1000 }],
});
```

**4. Purchase completed**

DOM API:
```html
<input
  type="hidden"
  data-pulsio-event="purchase"
  data-pulsio-trigger="present"
  data-pulsio-transaction-id="order_789"
  data-pulsio-revenue-amount="1000"
  data-pulsio-revenue-currency="EUR"
  data-pulsio-items='[{"id":"123","name":"Product 123","quantity":1,"price":1000}]'
/>
```

JS API:
```js
window.pulsio('purchase', {
  transaction_id: 'order_456',
  revenue: { amount: 1000, currency: 'EUR' },
  items: [{ id: '123', name: 'Product 123', quantity: 1, price: 1000 }],
});
```
