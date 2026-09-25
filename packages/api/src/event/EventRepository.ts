import type { AnalyticsKPIRequest, AnalyticsKPIResponse, AnalyticsTimeseriesRequest, AnalyticsTimeseriesResponse, Metric } from 'types/Analytics.ts';
import type { EventRow, EventRowInsert } from 'types/Event.ts';
import { ch } from '#dao/ch.ts';

const metricsQuery = `
  WITH ordered AS (
    SELECT *, lagInFrame(timestamp, 1, toDateTime64('1970-01-01 00:00:00', 3, 'UTC')) OVER visitor AS previous_timestamp
    FROM events
    WHERE domain IN {domains:Array(String)}
      AND timestamp >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
      AND timestamp < parseDateTime64BestEffort({to:String}, 3, 'UTC')
    WINDOW visitor AS (PARTITION BY domain, fingerprint, toDate(timestamp) ORDER BY timestamp, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
  ), marked AS (
    SELECT *, if(timestamp > previous_timestamp + INTERVAL 30 MINUTE, 1, 0) AS new_session
    FROM ordered
  ), numbered AS (
    SELECT *, sum(new_session) OVER (PARTITION BY domain, fingerprint, toDate(timestamp) ORDER BY timestamp, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_number
    FROM marked
  ), sessions AS (
    SELECT domain, fingerprint, min(timestamp) AS started_at, max(timestamp) AS ended_at,
      countIf(event_name = 'view') AS pageviews,
      count() AS events,
      sum(engagement_ms) AS engagement_ms_total,
      max(event_name IN ('engagement', 'interaction') OR ifNull(scroll_depth, 0) > 0) AS interacted,
      max(event_name NOT IN ('view', 'engagement', 'interaction', 'checkout', 'purchase')) AS converted,
      countIf(event_name NOT IN ('view', 'engagement', 'interaction', 'checkout', 'purchase')) AS conversions
    FROM numbered
    GROUP BY domain, fingerprint, toDate(timestamp), session_number
  ), purchases AS (
    SELECT domain, transaction_id, max(timestamp) AS purchased_at,
      argMax(toFloat64(revenue_amount) * toFloat64(usd_rate), (timestamp, id)) AS amount_usd
    FROM ordered
    WHERE event_name = 'purchase' AND transaction_id != '' AND revenue_amount IS NOT NULL
    GROUP BY domain, transaction_id
  )
`;

const sessionTotals = `
  toUInt64(uniqExact((domain, fingerprint))) AS users_count,
  toUInt64(count()) AS sessions_count,
  toUInt64(sum(pageviews)) AS pageviews_count,
  toUInt64(sum(events)) AS events_count,
  toFloat64(sum(engagement_ms_total)) / 1000 AS duration_sum,
  toUInt64(countIf(dateDiff('millisecond', started_at, ended_at) > 10000 OR interacted > 0)) AS engaged_count,
  toUInt64(sum(converted)) AS converted_count,
  toUInt64(sum(conversions)) AS conversions_count
`;

const purchaseTotals = `toUInt64(count()) AS transactions_count, toFloat64(sum(amount_usd)) AS revenue_sum`;

const metricExpressions: Record<Metric, string> = {
  users_count: 'users_count',
  sessions_count: 'sessions_count',
  pageviews_count: 'pageviews_count',
  events_count: 'events_count',
  pageviews_per_session_avg: 'if(sessions_count > 0, pageviews_count / sessions_count, 0)',
  duration_per_session_avg: 'if(sessions_count > 0, duration_sum / sessions_count, 0)',
  engagement_rate: 'if(sessions_count > 0, 100 * engaged_count / sessions_count, 0)',
  conversion_rate: 'if(sessions_count > 0, 100 * converted_count / sessions_count, 0)',
  conversions_count: 'conversions_count',
  transactions_count: 'transactions_count',
  revenue_sum: 'revenue_sum',
  revenue_per_transaction_avg: 'if(transactions_count > 0, revenue_sum / transactions_count, 0)',
};

const metricNames = Object.keys(metricExpressions) as Metric[];

export type OverviewBucket = {
  period: 'current' | 'previous';
  label: string;
  visitors: number;
  visits: number;
  pageviews: number;
  events: number;
  bounces: number;
  engaged: number;
  converted: number;
  duration_seconds: number;
  engagement_seconds: number;
  scroll_depth_total: number;
  scroll_depth_count: number;
};

export type OverviewRevenue = {
  period: 'current' | 'previous';
  currency: string;
  totalRevenue: number;
  orders: number;
};

type OverviewQuery = { domains: string[]; previousFrom: string; from: string; to: string };

export default class EventRepository {
  static async getKPIs({ domains, from, to }: AnalyticsKPIRequest): Promise<AnalyticsKPIResponse> {
    const columns = metricNames.map((metric) => `${metricExpressions[metric]} AS ${metric}`).join(', ');
    const result = await ch.query({
      query: `${metricsQuery}
        SELECT ${columns}
        FROM (SELECT ${sessionTotals} FROM sessions) AS sessions_total
        CROSS JOIN (SELECT ${purchaseTotals} FROM purchases) AS purchase_total
      `,
      query_params: { domains, from, to },
      format: 'JSONEachRow',
    });
    const [row] = await result.json<AnalyticsKPIResponse>();
    const kpis = Object.fromEntries(metricNames.map((metric) => [metric, Number(row[metric])])) as AnalyticsKPIResponse;
    return kpis;
  }

  static async getMetricTimeseries({ metric, interval, domains, from, to }: AnalyticsTimeseriesRequest): Promise<AnalyticsTimeseriesResponse> {
    const bucket = `toStartOfInterval(started_at, INTERVAL 1 ${interval})`;
    const eventBucket = `toStartOfInterval(timestamp, INTERVAL 1 ${interval})`;
    const purchaseBucket = `toStartOfInterval(purchased_at, INTERVAL 1 ${interval})`;
    const result = await ch.query({
      query: `${metricsQuery},
        event_buckets AS (
          SELECT ${eventBucket} AS bucket,
            toUInt64(uniqExact((domain, fingerprint))) AS users_count,
            toUInt64(countIf(event_name = 'view')) AS pageviews_count,
            toUInt64(count()) AS events_count,
            toUInt64(countIf(event_name NOT IN ('view', 'engagement', 'interaction', 'checkout', 'purchase'))) AS conversions_count
          FROM ordered GROUP BY bucket
        ),
        session_buckets AS (
          SELECT ${bucket} AS bucket, ${sessionTotals}
          FROM sessions GROUP BY bucket
        ), purchase_buckets AS (
          SELECT ${purchaseBucket} AS bucket, ${purchaseTotals}
          FROM purchases GROUP BY bucket
        )
        SELECT formatDateTime(bucket, '%Y-%m-%dT%H:%i:%SZ', 'UTC') AS timestamp,
          ${metricExpressions[metric]} AS value
        FROM (
          SELECT e.bucket AS bucket,
            e.users_count AS users_count,
            ifNull(s.sessions_count, 0) AS sessions_count,
            e.pageviews_count AS pageviews_count,
            e.events_count AS events_count,
            ifNull(s.duration_sum, 0) AS duration_sum,
            ifNull(s.engaged_count, 0) AS engaged_count,
            ifNull(s.converted_count, 0) AS converted_count,
            e.conversions_count AS conversions_count,
            ifNull(p.transactions_count, 0) AS transactions_count,
            ifNull(p.revenue_sum, 0) AS revenue_sum
          FROM event_buckets AS e
          LEFT JOIN session_buckets AS s ON e.bucket = s.bucket
          LEFT JOIN purchase_buckets AS p ON e.bucket = p.bucket
        ) ORDER BY bucket
      `,
      query_params: { domains, from, to },
      format: 'JSONEachRow',
    });
    const rows = await result.json<{ timestamp: string; value: number }>();
    const timeseries = rows.map((row) => ({ timestamp: row.timestamp, value: Number(row.value) }));
    return timeseries;
  }

  static async create(event: EventRowInsert) {
    const result = await ch.insert({ table: 'events', values: [event], format: 'JSONEachRow' });
    const row = result.executed;
    return row;
  }

  static async createAll(events: EventRowInsert[]) {
    const result = await ch.insert({ table: 'events', values: events, format: 'JSONEachRow' });
    const rows = result.executed;
    return rows;
  }

  static async get(id: string) {
    const result = await ch.query({ query: `SELECT * FROM events WHERE id = {id:UUID} LIMIT 1`, query_params: { id }, format: 'JSONEachRow' });
    const [row] = await result.json<EventRow>();
    return row ?? null;
  }

  static async getOverviewBuckets({ domains, previousFrom, from, to }: OverviewQuery): Promise<OverviewBucket[]> {
    const result = await ch.query({
      query: `
        WITH ordered AS (
          SELECT *, lagInFrame(timestamp, 1, toDateTime64('1970-01-01 00:00:00', 3, 'UTC')) OVER visitor AS previous_timestamp
          FROM events
          WHERE domain IN {domains:Array(String)}
            AND timestamp >= parseDateTime64BestEffort({previousFrom:String}, 3, 'UTC')
            AND timestamp < parseDateTime64BestEffort({to:String}, 3, 'UTC')
          WINDOW visitor AS (PARTITION BY domain, fingerprint, toDate(timestamp) ORDER BY timestamp, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        ), marked AS (
          SELECT *, if(timestamp > previous_timestamp + INTERVAL 30 MINUTE, 1, 0) AS new_session
          FROM ordered
        ), numbered AS (
          SELECT *, sum(new_session) OVER (PARTITION BY domain, fingerprint, toDate(timestamp) ORDER BY timestamp, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_number
          FROM marked
        ), sessions AS (
          SELECT
            domain, fingerprint, min(timestamp) AS started_at, max(timestamp) AS ended_at,
            countIf(event_name = 'view') AS session_pageviews,
            countIf(event_name != 'view') AS session_events,
            max(interactive) AS session_interacted,
            max(ifNull(scroll_depth, 0)) AS session_scroll_depth,
            countIf(scroll_depth IS NOT NULL) AS session_scroll_count,
            sum(engagement_ms) AS session_engagement_ms,
            max(event_name NOT IN ('view', 'engagement', 'interaction')) AS session_converted
          FROM numbered
          GROUP BY domain, fingerprint, toDate(timestamp), session_number
        )
        SELECT
          if(started_at >= parseDateTime64BestEffort({from:String}, 3, 'UTC'), 'current', 'previous') AS period,
          toString(toDate(started_at)) AS label,
          toUInt64(uniqExact((domain, fingerprint))) AS visitors,
          toUInt64(count()) AS visits,
          toUInt64(sum(session_pageviews)) AS pageviews,
          toUInt64(sum(session_events)) AS events,
          toUInt64(countIf(session_pageviews <= 1 AND session_interacted = 0)) AS bounces,
          toUInt64(countIf(dateDiff('second', started_at, ended_at) > 10 OR session_interacted > 0 OR session_scroll_depth > 0)) AS engaged,
          toUInt64(sum(session_converted)) AS converted,
          toFloat64(sum(greatest(toFloat64(dateDiff('second', started_at, ended_at)), session_engagement_ms / 1000))) AS duration_seconds,
          toFloat64(sum(session_engagement_ms) / 1000) AS engagement_seconds,
          toUInt64(sum(session_scroll_depth)) AS scroll_depth_total,
          toUInt64(sum(session_scroll_count > 0)) AS scroll_depth_count
        FROM sessions
        GROUP BY period, label
        ORDER BY label
      `,
      query_params: { domains, previousFrom, from, to },
      format: 'JSONEachRow',
    });
    const rows = await result.json<OverviewBucket>();
    return rows;
  }

  static async getOverviewRevenue({ domains, previousFrom, from, to }: OverviewQuery): Promise<OverviewRevenue[]> {
    const result = await ch.query({
      query: `
        SELECT period, currency, toFloat64(sum(amount)) AS totalRevenue, toUInt64(count()) AS orders
        FROM (
          SELECT
            if(timestamp >= parseDateTime64BestEffort({from:String}, 3, 'UTC'), 'current', 'previous') AS period,
            revenue_currency AS currency, domain, transaction_id,
            argMax(revenue_amount, (timestamp, id)) AS amount
          FROM events
          WHERE domain IN {domains:Array(String)}
            AND timestamp >= parseDateTime64BestEffort({previousFrom:String}, 3, 'UTC')
            AND timestamp < parseDateTime64BestEffort({to:String}, 3, 'UTC')
            AND event_name = 'purchase'
            AND transaction_id != ''
            AND revenue_currency != ''
            AND revenue_amount IS NOT NULL
          GROUP BY period, currency, domain, transaction_id
        )
        GROUP BY period, currency
        ORDER BY currency
      `,
      query_params: { domains, previousFrom, from, to },
      format: 'JSONEachRow',
    });
    const rows = await result.json<OverviewRevenue>();
    return rows;
  }

  static async getLiveVisitors({ domains }: { domains: string[] }): Promise<number> {
    const result = await ch.query({
      query: `SELECT toUInt64(uniqExact((domain, fingerprint))) AS activeVisitors FROM events WHERE domain IN {domains:Array(String)} AND timestamp >= now64(3) - INTERVAL 1 MINUTE`,
      query_params: { domains },
      format: 'JSONEachRow',
    });
    const [row] = await result.json<{ activeVisitors: number }>();
    const activeVisitors = row ? Number(row.activeVisitors) : 0;
    return activeVisitors;
  }
}
