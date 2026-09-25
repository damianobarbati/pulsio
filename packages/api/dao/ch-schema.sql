CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT generateUUIDv7(), -- Unique event identifier.
  site_id UUID, -- Identifier of the tracked website.
  timestamp DateTime64(3, 'UTC') CODEC(Delta(8), LZ4), -- Time when the event occurred.
  created_at DateTime64(3, 'UTC') DEFAULT now64(3) CODEC(Delta(8), LZ4), -- Time when ClickHouse stored the event.
  event_name LowCardinality(String), -- Event type, such as page view or transaction.
  protocol_version String, -- Tracker protocol version.
  fingerprint String, -- Pseudonymous visitor browser identifier.
  url String, -- Full URL.
  domain String, -- Tracked website domain, extracted from URL.
  path String, -- URL path without domain or query string, extracted from URL.
  query String, -- Retained URL query string, extracted from URL.
  referrer Nullable(String), -- Referring URL.
  referrer_source String DEFAULT '', -- Domain extracted from the Referring URL.
  screen_width UInt32, -- Browser viewport width in pixels.
  language String, -- Browser language preference.
  timezone String, -- Browser timezone identifier.
  transaction_id String DEFAULT '', -- Merchant transaction identifier.
  interactive UInt8 DEFAULT 1, -- Whether the event counts as an interaction.
  engagement_ms UInt32 DEFAULT 0, -- Engagement duration in milliseconds.
  scroll_depth Nullable(UInt8), -- Maximum scroll depth as a percentage.
  props Map(String, String), -- Custom event properties.
  revenue_amount Nullable(Decimal(18, 4)), -- Transaction total in revenue currency.
  revenue_currency LowCardinality(String) DEFAULT '', -- ISO currency for transaction revenue.
  usd_rate Decimal64(8) DEFAULT 1,
  browser LowCardinality(String) DEFAULT '', -- Browser family.
  browser_version String DEFAULT '', -- Browser version.
  os LowCardinality(String) DEFAULT '', -- Operating system family.
  os_version String DEFAULT '', -- Operating system version.
  device LowCardinality(String) DEFAULT '', -- Device category.
  country_code FixedString(2) DEFAULT '', -- ISO 3166-1 alpha-2 country code.
  subdivision_code LowCardinality(String) DEFAULT '', -- ISO 3166-2 geographic subdivision code.
  locality LowCardinality(String) DEFAULT '', -- City or locality name.
  utm_source String DEFAULT '', -- Raw UTM campaign source.
  utm_medium LowCardinality(String) DEFAULT '', -- Raw UTM campaign medium.
  utm_campaign String DEFAULT '', -- Raw UTM campaign name.
  utm_content String DEFAULT '', -- Raw UTM campaign content.
  utm_term String DEFAULT '', -- Raw UTM campaign term.
  source String DEFAULT 'None', -- Normalized attribution source.
  channel LowCardinality(String) DEFAULT 'Direct' -- Normalized attribution channel.
) ENGINE = ReplacingMergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (domain, timestamp, id)
TTL toDateTime(timestamp) + INTERVAL 3 YEAR DELETE;

CREATE TABLE IF NOT EXISTS transactions (
  event_id UUID,
  timestamp DateTime64(3, 'UTC'),
  created_at DateTime64(3, 'UTC') DEFAULT now64(3),
  site_id UUID,
  transaction_id String,
  amount Decimal(18, 4),
  currency LowCardinality(String)
) ENGINE = ReplacingMergeTree(created_at)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, transaction_id)
TTL toDateTime(timestamp) + INTERVAL 3 YEAR DELETE;

CREATE TABLE IF NOT EXISTS transaction_items (
  event_id UUID, -- Identifier of the parent transaction event.
  timestamp DateTime64(3, 'UTC'), -- Time when the transaction occurred.
  created_at DateTime64(3, 'UTC') DEFAULT now64(3), -- Time when ClickHouse stored the item.
  site_id UUID, -- Identifier of the tracked website.
  transaction_id String, -- Merchant transaction identifier.
  item_id String, -- Merchant product identifier.
  name String, -- Product display name.
  quantity UInt32, -- Number of units purchased.
  price Decimal(18, 4) -- Item unit price in transaction currency.
) ENGINE = ReplacingMergeTree(created_at)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, transaction_id, item_id)
TTL toDateTime(timestamp) + INTERVAL 3 YEAR DELETE;
