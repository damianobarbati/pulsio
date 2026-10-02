import type { IAnalytics } from 'types/Analytics.ts';
import type { IEvent } from 'types/Event.ts';
import { ch } from '#dao/ch.ts';

const metricsQuery = `
  WITH ordered AS (
    SELECT *, lagInFrame(timestamp, 1, toDateTime64('1970-01-01 00:00:00', 3, 'UTC')) OVER visitor AS previous_timestamp
    FROM events
    WHERE domain IN {domains:Array(String)}
      AND timestamp >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
      AND timestamp < parseDateTime64BestEffort({to:String}, 3, 'UTC')
    WINDOW visitor AS (PARTITION BY domain, visitor_hash, toDate(timestamp) ORDER BY timestamp, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
  ), marked AS (
    SELECT *, if(timestamp > previous_timestamp + INTERVAL 30 MINUTE, 1, 0) AS new_session
    FROM ordered
  ), numbered AS (
    SELECT *, sum(new_session) OVER (PARTITION BY domain, visitor_hash, toDate(timestamp) ORDER BY timestamp, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_number
    FROM marked
  ), sessions AS (
      SELECT domain, visitor_hash, min(timestamp) AS started_at, max(timestamp) AS ended_at,
      countIf(name = 'view') AS pageviews,
      count() AS events,
      sum(engagement_ms) AS engagement_ms_total,
      max(name IN ('engagement', 'interaction') OR ifNull(scroll_depth, 0) > 0) AS interacted,
      max(name NOT IN ('view', 'engagement', 'interaction', 'checkout', 'purchase')) AS converted,
      countIf(name NOT IN ('view', 'engagement', 'interaction', 'checkout', 'purchase')) AS conversions
    FROM numbered
    GROUP BY domain, visitor_hash, toDate(timestamp), session_number
  ), purchases AS (
    SELECT domain, transaction_id, max(timestamp) AS purchased_at,
      argMax(toFloat64(revenue_amount) * toFloat64(usd_rate), (timestamp, id)) AS amount_usd
    FROM ordered
    WHERE name = 'purchase' AND transaction_id != '' AND revenue_amount IS NOT NULL
    GROUP BY domain, transaction_id
  )
`;

const sessionTotals = `
  toUInt64(uniqExact((domain, visitor_hash))) AS users_count,
  toUInt64(count()) AS sessions_count,
  toUInt64(sum(pageviews)) AS pageviews_count,
  toUInt64(sum(events)) AS events_count,
  toFloat64(sum(engagement_ms_total)) / 1000 AS duration_sum,
  toUInt64(countIf(dateDiff('millisecond', started_at, ended_at) > 10000 OR interacted > 0)) AS engaged_count,
  toUInt64(sum(converted)) AS converted_count,
  toUInt64(sum(conversions)) AS conversions_count
`;

const purchaseTotals = `toUInt64(count()) AS transactions_count, toFloat64(sum(amount_usd)) AS revenue_sum`;

const metricExpressions: Record<IAnalytics.metric, string> = {
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

const metricNames = Object.keys(metricExpressions) as IAnalytics.metric[];

export default class EventRepository {
  static async getKPIs({ domains, from, to }: IAnalytics.kpiRequest): Promise<IAnalytics.kpiResponse> {
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
    const [row] = await result.json<IAnalytics.kpiResponse>();
    const kpis = Object.fromEntries(metricNames.map((metric) => [metric, Number(row[metric])])) as IAnalytics.kpiResponse;
    return kpis;
  }

  static async getMetricTimeseries({ domains, from, to, interval, metric }: IAnalytics.timeseriesRequest): Promise<IAnalytics.timeseriesResponse> {
    const query = `
      ${metricsQuery},
      event_buckets AS (
        SELECT toStartOfInterval(timestamp, INTERVAL 1 ${interval}) AS bucket,
          toUInt64(uniqExact((domain, visitor_hash))) AS users_count,
          toUInt64(countIf(name = 'view')) AS pageviews_count,
          toUInt64(count()) AS events_count,
          toUInt64(countIf(name NOT IN ('view', 'engagement', 'interaction', 'checkout', 'purchase'))) AS conversions_count
        FROM ordered GROUP BY bucket
      ),
      session_buckets AS (
        SELECT toStartOfInterval(started_at, INTERVAL 1 ${interval}) AS bucket, ${sessionTotals}
        FROM sessions GROUP BY bucket
      ), purchase_buckets AS (
        SELECT toStartOfInterval(purchased_at, INTERVAL 1 ${interval}) AS bucket, ${purchaseTotals}
        FROM purchases GROUP BY bucket
      )
      SELECT 
        formatDateTime(bucket, '%Y-%m-%dT%H:%i:%SZ', 'UTC') AS timestamp,
        toFloat64(${metricExpressions[metric]}) AS value
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
    `;

    const result = await ch.query({ query, query_params: { domains, from, to }, format: 'JSONEachRow' });
    const rows = await result.json<{ timestamp: string; value: number }>();
    return rows;
  }

  static async getCustomEvents({ domains, from, to }: IAnalytics.eventsRequest): Promise<IAnalytics.eventsResponse> {
    const result = await ch.query({
      query: `
        WITH filtered AS (
          SELECT domain, name, visitor_hash
          FROM events
          WHERE domain IN {domains:Array(String)}
            AND timestamp >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
            AND timestamp < parseDateTime64BestEffort({to:String}, 3, 'UTC')
        ), total_users AS (
          SELECT uniqExact((domain, visitor_hash)) AS users FROM filtered
        ), total_events AS (
          SELECT countIf(name NOT IN ('view', 'engagement', 'interaction', 'checkout', 'purchase')) AS count FROM filtered
        )
        SELECT
          name AS event_name,
          toUInt64(count()) AS count,
          toUInt64(uniqExact((domain, visitor_hash))) AS users,
          toFloat64(if(total_users.users > 0, 100 * users / total_users.users, 0)) AS conversion_rate,
          toFloat64(if(total_events.count > 0, 100 * count() / total_events.count, 0)) AS percentage
        FROM filtered
        CROSS JOIN total_users
        CROSS JOIN total_events
        WHERE name NOT IN ('view', 'engagement', 'interaction', 'checkout', 'purchase')
        GROUP BY name, total_users.users, total_events.count
        ORDER BY count DESC, name ASC
        LIMIT 10
      `,
      query_params: { domains, from, to },
      format: 'JSONEachRow',
    });
    const rows = await result.json<IAnalytics.eventsResponse[number]>();
    return rows.map((row) => ({ ...row, count: Number(row.count), users: Number(row.users), conversion_rate: Number(row.conversion_rate), percentage: Number(row.percentage) }));
  }

  static async getDemographics({ domains, from, to, dimension }: IAnalytics.demographicsRequest): Promise<IAnalytics.demographicsResponse> {
    const dimensions: Record<IAnalytics.demographicsDimension, string> = {
      browser: "if(browser = '', 'Unknown', browser)",
      os: "if(os = '', 'Unknown', os)",
      device: "if(screen_width < 768, 'Mobile', if(screen_width < 1024, 'Tablet', 'Desktop'))",
      country: "if(country_code = '', 'Unknown', country_code)",
      region: "if(region_code = '', 'Unknown', region_code)",
      city: "if(city_id = 0, 'Unknown', toString(city_id))",
    };
    const result = await ch.query({
      query: `
        WITH filtered AS (
          SELECT domain, visitor_hash, ${dimensions[dimension]} AS name
          FROM events
          WHERE domain IN {domains:Array(String)}
            AND timestamp >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
            AND timestamp < parseDateTime64BestEffort({to:String}, 3, 'UTC')
        ), total_users AS (
          SELECT uniqExact((domain, visitor_hash)) AS users FROM filtered
        )
        SELECT
          name,
          toUInt64(uniqExact((domain, visitor_hash))) AS users,
          toFloat64(if(total_users.users > 0, 100 * users / total_users.users, 0)) AS percentage
        FROM filtered
        CROSS JOIN total_users
        GROUP BY name, total_users.users
        ORDER BY users DESC, name ASC
      `,
      query_params: { domains, from, to },
      format: 'JSONEachRow',
    });
    const rows = await result.json<IAnalytics.demographicsResponse[number]>();
    return rows.map((row) => ({ ...row, users: Number(row.users), percentage: Number(row.percentage) }));
  }

  static async getAcquisition({ domains, from, to, dimension }: IAnalytics.acquisitionRequest): Promise<IAnalytics.acquisitionResponse> {
    const dimensions: Record<IAnalytics.acquisitionDimension, string> = {
      source: "ifNull(nullIf(first_source, ''), 'Direct')",
      channel: "ifNull(nullIf(first_channel, ''), 'Direct')",
      utm_source: "if(first_utm_source = '', 'None', first_utm_source)",
      utm_medium: "if(first_utm_medium = '', 'None', first_utm_medium)",
      utm_campaign: "if(first_utm_campaign = '', 'None', first_utm_campaign)",
      utm_content: "if(first_utm_content = '', 'None', first_utm_content)",
      utm_term: "if(first_utm_term = '', 'None', first_utm_term)",
    };
    const result = await ch.query({
      query: `
        WITH ordered AS (
          SELECT *, lagInFrame(timestamp, 1, toDateTime64('1970-01-01 00:00:00', 3, 'UTC')) OVER visitor AS previous_timestamp
          FROM events
          WHERE domain IN {domains:Array(String)}
            AND timestamp >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
            AND timestamp < parseDateTime64BestEffort({to:String}, 3, 'UTC')
          WINDOW visitor AS (PARTITION BY domain, visitor_hash, toDate(timestamp) ORDER BY timestamp, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        ), marked AS (
          SELECT *, if(timestamp > previous_timestamp + INTERVAL 30 MINUTE, 1, 0) AS new_session
          FROM ordered
        ), numbered AS (
          SELECT *, sum(new_session) OVER (PARTITION BY domain, visitor_hash, toDate(timestamp) ORDER BY timestamp, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_number
          FROM marked
        ), sessions AS (
          SELECT
            domain,
            visitor_hash,
            session_number,
            argMinIf(channel, tuple(timestamp, id), name = 'view') AS first_pageview_channel,
            argMinIf(source, tuple(timestamp, id), name = 'view') AS first_pageview_source,
            argMinIf(utm_source, tuple(timestamp, id), name = 'view') AS first_pageview_utm_source,
            argMinIf(utm_medium, tuple(timestamp, id), name = 'view') AS first_pageview_utm_medium,
            argMinIf(utm_campaign, tuple(timestamp, id), name = 'view') AS first_pageview_utm_campaign,
            argMinIf(utm_content, tuple(timestamp, id), name = 'view') AS first_pageview_utm_content,
            argMinIf(utm_term, tuple(timestamp, id), name = 'view') AS first_pageview_utm_term,
            argMin(channel, tuple(timestamp, id)) AS first_event_channel,
            argMin(source, tuple(timestamp, id)) AS first_event_source,
            argMin(utm_source, tuple(timestamp, id)) AS first_event_utm_source,
            argMin(utm_medium, tuple(timestamp, id)) AS first_event_utm_medium,
            argMin(utm_campaign, tuple(timestamp, id)) AS first_event_utm_campaign,
            argMin(utm_content, tuple(timestamp, id)) AS first_event_utm_content,
            argMin(utm_term, tuple(timestamp, id)) AS first_event_utm_term
          FROM numbered
          GROUP BY domain, visitor_hash, toDate(timestamp), session_number
        ), attributed AS (
          SELECT
            domain,
            visitor_hash,
            if(first_pageview_channel = '', first_event_channel, first_pageview_channel) AS first_channel,
            if(first_pageview_source = '', first_event_source, first_pageview_source) AS first_source,
            if(first_pageview_utm_source = '', first_event_utm_source, first_pageview_utm_source) AS first_utm_source,
            if(first_pageview_utm_medium = '', first_event_utm_medium, first_pageview_utm_medium) AS first_utm_medium,
            if(first_pageview_utm_campaign = '', first_event_utm_campaign, first_pageview_utm_campaign) AS first_utm_campaign,
            if(first_pageview_utm_content = '', first_event_utm_content, first_pageview_utm_content) AS first_utm_content,
            if(first_pageview_utm_term = '', first_event_utm_term, first_pageview_utm_term) AS first_utm_term
          FROM sessions
        ), total_visits AS (
          SELECT count() AS visits FROM attributed
        )
        SELECT
          ${dimensions[dimension]} AS name,
          toUInt64(uniqExact((domain, visitor_hash))) AS users,
          toUInt64(count()) AS visits,
          toFloat64(if(total_visits.visits > 0, 100 * visits / total_visits.visits, 0)) AS percentage
        FROM attributed
        CROSS JOIN total_visits
        GROUP BY name, total_visits.visits
        ORDER BY visits DESC, name ASC
      `,
      query_params: { domains, from, to },
      format: 'JSONEachRow',
    });
    const rows = await result.json<IAnalytics.acquisitionResponse[number]>();
    return rows.map((row) => ({ ...row, users: Number(row.users), visits: Number(row.visits), percentage: Number(row.percentage) }));
  }

  static async getLiveVisitors({ domains }: { domains: string[] }): Promise<number> {
    const query = `SELECT toUInt64(uniqExact((domain, visitor_hash))) AS activeVisitors FROM events WHERE domain IN {domains:Array(String)} AND timestamp >= now64(3) - INTERVAL 1 MINUTE`;
    const result = await ch.query({ query, query_params: { domains }, format: 'JSONEachRow' });
    const [row] = await result.json<{ activeVisitors: number }>();
    const value = row ? Number(row.activeVisitors) : 0;
    return value;
  }

  static async getEventCounts({ domains }: { domains: string[] }): Promise<Record<string, number>> {
    if (domains.length === 0) return {};

    const result = await ch.query({
      query: 'SELECT domain, toUInt64(count()) AS events_count FROM events WHERE domain IN {domains:Array(String)} GROUP BY domain',
      query_params: { domains },
      format: 'JSONEachRow',
    });
    const rows = await result.json<{ domain: string; events_count: number }>();
    const counts = Object.fromEntries(rows.map((row) => [row.domain, Number(row.events_count)]));
    return counts;
  }

  static async create(event: IEvent.rowInsert) {
    const result = await ch.insert({ table: 'events', values: [event], format: 'JSONEachRow' });
    const row = result.executed;
    return row;
  }

  static async createAll(events: IEvent.rowInsert[]) {
    const result = await ch.insert({ table: 'events', values: events, format: 'JSONEachRow' });
    const rows = result.executed;
    return rows;
  }

  static async get(id: string) {
    const result = await ch.query({ query: `SELECT * FROM events WHERE id = {id:UUID} LIMIT 1`, query_params: { id }, format: 'JSONEachRow' });
    const [row] = await result.json<IEvent.row>();
    return row ?? null;
  }

  static async exportByDomain(domain: string): Promise<string> {
    const result = await ch.query({
      query: 'SELECT * FROM events WHERE domain = {domain:String} ORDER BY timestamp, id',
      query_params: { domain },
      format: 'CSVWithNames',
    });
    const csv = await result.text();
    return csv;
  }

  static async remove(id: string) {
    await ch.command({ query: `ALTER TABLE events DELETE WHERE id = {id:UUID}`, query_params: { id }, clickhouse_settings: { mutations_sync: '1' } });
    return true;
  }

  static async removeByUserID(id: string) {
    await ch.command({ query: `ALTER TABLE events DELETE WHERE user_id = {id:UUID}`, query_params: { id }, clickhouse_settings: { mutations_sync: '1' } });
    return true;
  }

  // domain is a string
  static async removeByDomain(domain: string) {
    await ch.command({ query: `ALTER TABLE events DELETE WHERE domain = {domain:String}`, query_params: { domain }, clickhouse_settings: { mutations_sync: '1' } });
    return true;
  }
}
