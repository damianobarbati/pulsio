CREATE TABLE IF NOT EXISTS events
(
    id               UUID                 DEFAULT generateUUIDv7(),               -- Unique event identifier.
    created_at       DateTime64(3, 'UTC') DEFAULT now64(3) CODEC(Delta(8), LZ4), -- Time when ClickHouse stored the event.
    timestamp        DateTime64(3, 'UTC') CODEC (Delta(8), LZ4),                  -- Time when the event occurred.
    name             LowCardinality(String),                                      -- Event name
    user_id          UUID,                                                        -- Identifier of the user.
    domain_id        UUID,                                                        -- Identifier of the tracked website.
    visitor_hash     UUID,                                                        -- Daily fingerprint of the user's browser.
    domain           String,                                                      -- Tracked website domain, extracted from URL.
    path             String,                                                      -- URL path without domain or query string, extracted from URL.
    query            String,                                                      -- Retained URL query string, extracted from URL.
    referrer_domain  String,                                                      -- Referrer domain, extracted from the Referrer URL.
    -- event properties
    interactive      UInt8,                                                       -- Whether the event counts as an interaction.
    engagement_ms    UInt32,                                                      -- Engagement duration in milliseconds.
    scroll_depth     Nullable(UInt8),                                             -- Maximum scroll depth as a percentage.
    props            Map(String, String),                                         -- Custom user sent properties.
    -- geolocation
    country_code     FixedString(2),                                              -- ISO 3166-1 alpha-2 country code.
    region_code      LowCardinality(String),                                      -- ISO 3166-2 geographic subdivision code.
    city_id          UInt32,                                                      -- GeoName City ID.
    timezone         LowCardinality(String),                                      -- IANA Timezone identifier.
    -- device
    screen_width     UInt32,                                                      -- Browser viewport width in pixels.
    device           LowCardinality(String),                                      -- Device category between mobile, tablet, laptop, desktop.
    browser          LowCardinality(String),                                      -- Browser family.
    browser_version  LowCardinality(String),                                      -- Browser version.
    os               LowCardinality(String),                                      -- Operating system family.
    os_version       String,                                                      -- Operating system version.
    -- revenue
    transaction_id   String,                                                      -- Merchant transaction identifier.
    revenue_amount   Nullable(Decimal(18, 4)),                                    -- Transaction total in revenue currency.
    revenue_currency Nullable(FixedString(3)),                                    -- ISO currency for transaction revenue.
    usd_rate         Decimal64(8)         DEFAULT 1,
    -- attribution
    source           String,
    channel          LowCardinality(String),                                      -- Normalized attribution channel.
    -- Raw UTM params
    utm_source       String,
    utm_medium       String,
    utm_campaign     String,
    utm_content      String,
    utm_term         String
) ENGINE = MergeTree
      PARTITION BY toYYYYMM(timestamp)
PRIMARY KEY (domain_id, toDate(timestamp), name, user_id)
ORDER BY (domain_id, toDate(timestamp), name, user_id, timestamp, id);

CREATE TABLE IF NOT EXISTS transactions
(
    created_at     DateTime64(3, 'UTC') DEFAULT now64(3) CODEC(Delta(8), LZ4), -- Time when ClickHouse stored the event.
    event_id       UUID,
    timestamp      DateTime64(3, 'UTC'),
    site_id        UUID,
    transaction_id String,
    amount         Decimal(18, 4),
    currency       LowCardinality(String)
) ENGINE = MergeTree
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, transaction_id);

CREATE TABLE IF NOT EXISTS transaction_items
(
    created_at     DateTime64(3, 'UTC') DEFAULT now64(3) CODEC(Delta(8), LZ4), -- Time when ClickHouse stored the event.
    event_id       UUID,                                                        -- Identifier of the parent transaction event.
    timestamp      DateTime64(3, 'UTC') CODEC (Delta(8), LZ4),                  -- Time when the event occurred.
    site_id        UUID,                                                        -- Identifier of the tracked website.
    transaction_id String,                                                      -- Merchant transaction identifier.
    item_id        String,                                                      -- Merchant product identifier.
    name           String,                                                      -- Product display name.
    quantity       UInt32,                                                      -- Number of units purchased.
    price          Decimal(18, 4)                                               -- Item unit price in transaction currency.
) ENGINE = MergeTree
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, transaction_id, item_id);
