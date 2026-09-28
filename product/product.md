## Glossary

User: The user is the navigator browsing the website or opening the application.

Session: A continuous period of user interactions on the application for the same User (daily).
A session starts on the first view and ends when no heartbeats or events
are received for more than 30 minutes, or when the 00:00 UTC rollover occurs.

View: The view is a distinct user interface component in the application, 
responsible for displaying data to the user and capturing their direct interactions 
(eg. page in web applications, screen in native applications).

Event: The event sent by the browser to pulsio (eg. view load, custom event).

## Core concepts

Users are tracked using a daily combination of:
SHA256(Daily salt + Domain + IP + User Agent + Accept-Language + Sec-CH-UA + Sec-CH-UA-Mobile + Sec-CH-UA-Platform)

The same user accessing the same view at 23:59 then again at 00:01 is counted as 2 unique visitors.   

## Metrics

User (daily): amount of unique users who visited any view of the application (count in the given period).

Views per user: distinct views opened by the user (avg in the given period)

Time per user: time spent by the user on the app (avg in the given period)

Time on view: time spent on the view (avg in the given period)
*Based on active focus, Page Visibility API, with heartbeat through navigator.sendBeacon every 10s 

Engagement rate: % of sessions lasted more than 10s, or where a scroll event or click event occurred

Conversion rate: % of sessions where a custom event occurred
**Breakdown by event (eg. form submit, dom element rendered, pulsio.event call)

Events: total amount of events occurred

Revenue: total amount of revenue generated

## Tracking

The client loads pulsio script providing his pulsio User ID:
```html
<script async src="https://api.pulsio.live/client.js" data-pulsio-id="<user_id>"></script>
```

The script sends the following data:
```ts
const payload: TrackEvent = {
  v, // version of tracking
  n, // event name
  u_id, // pulsio user id
  v_id, // canonical ID for the current view, useful for localized websites
  u, // full page url
  r, // full referrer url
  w, // screen width of user's device
  tx_id, // unique id of the money transaction (if any)
  tx_amount, // amount of the money transaction (if any)
  tx_currency, // currency of the money transaction (if any)
  items, // structured array describing the items of the money transaction (if any)
};
```

Available event names:
- `view`: fired on website opening
- `engagement`: fired when the user scrolls, clicks or types on the view
- `checkout`: fired when the user starts the checkout (intent to pay)
- `purchase`: fired when the user completes the checkout (payment occurred)

Events `checkout` and `purchase` require the following fields:
- `transaction_id` (mandatory)
- `amount` (mandatory)
- `currency` (mandatory)
- `items` (optional): array of object with `{id, name, price, quantity}`

## Users

The user registered can add the snippet anywhere, and pulsio automatically adds the domain to the tracked ones.
The user can turn off this autodiscover feature in his settings, to only accept websites explicitly added from the dashboard.  
When autodiscover is disabled, events received from a domain not in user websites list is refused.  

The user can set the following for each website tracked in his account:
- Default currency

The user can create shared links for each website tracked in his account.  