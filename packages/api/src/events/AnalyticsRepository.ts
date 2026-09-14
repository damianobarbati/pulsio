import type { AnalyticsQuery, Dimension } from '../../../types/src/analytics.ts';
import type { Goal } from '../../../types/src/goal.ts';
import { cache } from '../../dao/cache.ts';
import { clickhouse } from '../../dao/clickhouse.ts';

type Parameters = Record<string, string | number>;
const queryRows = async <T>({ query, params }: { query: string; params: Parameters }) => {
  const result = await clickhouse.query({ query, query_params: params, format: 'JSONEachRow', clickhouse_settings: { output_format_json_quote_64bit_integers: 0 } });
  const rows = await result.json<T>();
  return rows;
};
const dimensions: Record<Dimension, string> = {
  source: 'visit_source',
  channel: 'visit_channel',
  referrer: "if(empty(visit_referrer), 'Direct / None', visit_referrer)",
  page: 'path',
  entry_page: 'entry_page',
  exit_page: 'exit_page',
  country: 'country',
  region: 'region',
  city: 'city',
  browser: 'browser',
  browser_version: 'browser_version',
  os: 'os',
  os_version: 'os_version',
  device: 'device',
  hostname: 'domain',
  event: 'event_name',
  property: 'props',
  utm_source: "extractURLParameter(entry_url, 'utm_source')",
  utm_medium: "extractURLParameter(entry_url, 'utm_medium')",
  utm_campaign: "extractURLParameter(entry_url, 'utm_campaign')",
  utm_content: "extractURLParameter(entry_url, 'utm_content')",
  utm_term: "extractURLParameter(entry_url, 'utm_term')",
};
const dimensionExpression = ({ dimension, key, params, prefix }: { dimension: Dimension; key?: string; params: Parameters; prefix: string }) => {
  if (dimension !== 'property') return `if(empty(${dimensions[dimension]}), '(not set)', ${dimensions[dimension]})`;
  if (!key) return 'arrayJoin(mapKeys(props))';
  params[`${prefix}Key`] = key;
  return `if(mapContains(props, {${prefix}Key:String}), props[{${prefix}Key:String}], '(not set)')`;
};
export const goalCondition = ({ goal, params }: { goal: Goal; params: Parameters }) => {
  params.goalTarget = goal.target;
  params.goalPattern = `^${goal.target
    .split(/\*+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')}$`;
  params.goalThreshold = goal.threshold;
  let condition = "event_name = 'pv' AND match(path, {goalPattern:String})";
  if (goal.kind === 'event') condition = 'event_name = {goalTarget:String}';
  if (goal.kind === 'scroll') condition = 'match(path, {goalPattern:String}) AND scroll_depth >= {goalThreshold:UInt8}';
  Object.entries(goal.properties).forEach(([key, value], index) => {
    params[`goalKey${index}`] = key;
    params[`goalValue${index}`] = value;
    condition += ` AND mapContains(props, {goalKey${index}:String}) AND props[{goalKey${index}:String}] = {goalValue${index}:String}`;
  });
  return condition;
};
const buildQuery = (input: AnalyticsQuery) => {
  const params: Parameters = { siteId: input.siteId, from: input.from, to: input.to };
  const filters = input.filters.map((filter, index) => {
    const expression = dimensionExpression({ ...filter, params, prefix: `f${index}` });
    params[`filter${index}`] = filter.value;
    if (filter.operator === 'contains') return `positionCaseInsensitive(${expression}, {filter${index}:String}) > 0`;
    return `${expression} ${filter.operator === 'is_not' ? '!=' : '='} {filter${index}:String}`;
  });
  const goal = input.goal ? goalCondition({ goal: input.goal, params }) : '';
  const cte = `WITH raw AS (
    SELECT *, lagInFrame(toNullable(timestamp), 1, NULL) OVER (PARTITION BY fingerprint ORDER BY timestamp, id ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS previous
    FROM events FINAL WHERE site_id = {siteId:String} AND timestamp >= toStartOfDay(parseDateTime64BestEffort({from:String})) AND timestamp < parseDateTime64BestEffort({to:String})
  ), numbered AS (
    SELECT *, sum(if(previous IS NULL OR dateDiff('second', previous, timestamp) >= 1800, 1, 0)) OVER (PARTITION BY fingerprint ORDER BY timestamp, id) AS session FROM raw
  ), sessions AS (
    SELECT fingerprint, session, countIf(event_name = 'pv') AS session_views,
      countIf(event_name NOT IN ('pv', 'engagement') AND interactive = 1) AS session_interactions,
      if(countIf(event_name != 'engagement') > 1, greatest(0, dateDiff('second', minIf(timestamp, event_name != 'engagement'), maxIf(timestamp, event_name != 'engagement'))), 0) AS session_duration,
      argMinIf(path, tuple(timestamp, id), event_name = 'pv') AS entry_page,
      argMaxIf(path, tuple(timestamp, id), event_name = 'pv') AS exit_page,
      argMin(url, tuple(timestamp, id)) AS entry_url,
      argMin(source, tuple(timestamp, id)) AS visit_source,
      argMin(channel, tuple(timestamp, id)) AS visit_channel,
      argMin(ifNull(referrer, ''), tuple(timestamp, id)) AS visit_referrer
    FROM numbered GROUP BY fingerprint, session
  ), attributed AS (
    SELECT n.*, s.session_views, s.session_interactions, s.session_duration, s.entry_page, s.exit_page, s.entry_url, s.visit_source, s.visit_channel, s.visit_referrer
    FROM numbered n INNER JOIN sessions s ON n.fingerprint = s.fingerprint AND n.session = s.session
    WHERE n.timestamp >= parseDateTime64BestEffort({from:String})
  ), matching AS (SELECT * FROM attributed ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}),
  filtered AS (SELECT * FROM matching ${goal ? `WHERE tuple(fingerprint, session) IN (SELECT tuple(fingerprint, session) FROM matching WHERE ${goal})` : ''})`;
  return { cte, params };
};
const metrics = `uniqExactIf(fingerprint, event_name != 'engagement') AS visitors,
  uniqExactIf(tuple(fingerprint, session), event_name != 'engagement') AS visits,
  countIf(event_name = 'pv') AS pageviews,
  if(visits = 0, 0, round(pageviews / visits, 2)) AS viewsPerVisit,
  if(visits = 0, 0, round(100 * uniqExactIf(tuple(fingerprint, session), event_name != 'engagement' AND session_views <= 1 AND session_interactions = 0) / visits, 1)) AS bounceRate,
  if(visits = 0, 0, round(arraySum(x -> x.3, groupUniqArrayIf(tuple(fingerprint, session, session_duration), event_name != 'engagement')) / visits)) AS visitDuration`;

export const AnalyticsRepository = {
  async live({ siteId }: { siteId: string }) {
    const key = `active:${siteId}`;
    const expired = await cache.zrangebyscore(key, '0', String(Date.now() - 300000));
    if (expired.length) await cache.hdel(`active-pages:${siteId}`, ...expired);
    await cache.zremrangebyscore(key, 0, Date.now() - 300000);
    const visitors = await cache.zrange(key, '0', '-1');
    const paths = visitors.length ? await cache.hmget(`active-pages:${siteId}`, ...visitors) : [];
    const counts = new Map<string, number>();
    for (const path of paths) if (path) counts.set(path, (counts.get(path) || 0) + 1);
    return { activeVisitors: visitors.length, pages: [...counts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value) };
  },
  async summary(input: AnalyticsQuery) {
    const { cte, params } = buildQuery(input);
    const rows = await queryRows<Record<string, number | null>>({
      params,
      query: `${cte}
      SELECT * FROM (SELECT ${metrics} FROM filtered) totals CROSS JOIN (
        SELECT if(count() = 0, NULL, avg(ms) / 1000) AS timeOnPage, avgOrNull(depth) AS scrollDepth
        FROM (SELECT fingerprint, path, sum(engagement_ms) AS ms, max(scroll_depth) AS depth FROM filtered GROUP BY fingerprint, path HAVING countIf(event_name = 'pv') > 0 OR sum(engagement_ms) > 0)
      ) engagement`,
    });
    return rows[0];
  },
  async timeline(input: AnalyticsQuery) {
    const { cte, params } = buildQuery(input);
    const hourly = Date.parse(input.to) - Date.parse(input.from) <= 172800000;
    const bucket = hourly ? 'toStartOfHour(timestamp)' : 'toStartOfDay(timestamp)';
    const rows = await queryRows<Record<string, string | number | null>>({
      params,
      query: `${cte} SELECT formatDateTime(${bucket}, '%Y-%m-%dT%H:%i:%SZ', 'UTC') AS label, ${metrics},
      if(countIf(event_name = 'pv') = 0, NULL, sum(engagement_ms) / 1000 / uniqExactIf(tuple(fingerprint, path), event_name = 'pv')) AS timeOnPage,
      avgOrNull(scroll_depth) AS scrollDepth FROM filtered GROUP BY ${bucket} ORDER BY ${bucket}`,
    });
    return rows;
  },
  async breakdown(input: AnalyticsQuery & { dimension: Dimension; key?: string }) {
    const { cte, params } = buildQuery(input);
    const expression = dimensionExpression({ ...input, params, prefix: 'breakdown' });
    const pageOnly = ['page', 'entry_page', 'exit_page'].includes(input.dimension);
    const rows = await queryRows<Record<string, string | number | null>>({
      params,
      query: `${cte}, grouped AS (SELECT *, ${expression} AS dimension_name FROM filtered)
      SELECT a.*, b.timeOnPage, b.scrollDepth, a.visitors AS value,
      if((SELECT uniqExactIf(fingerprint, event_name != 'engagement') FROM filtered) = 0, 0, round(100 * a.visitors / (SELECT uniqExactIf(fingerprint, event_name != 'engagement') FROM filtered), 1)) AS percentage,
      if(a.pageviews = 0, 0, round(100 * a.exits / a.pageviews, 1)) AS exitRate
      FROM (SELECT dimension_name AS name, ${metrics}, uniqExactIf(tuple(fingerprint, session), event_name = 'pv' AND path = exit_page) AS exits
        FROM grouped ${pageOnly ? "WHERE event_name IN ('pv', 'engagement')" : ''} GROUP BY dimension_name HAVING visitors > 0) a
      LEFT JOIN (SELECT dimension_name AS name, avg(ms) / 1000 AS timeOnPage, avgOrNull(depth) AS scrollDepth FROM
        (SELECT dimension_name, fingerprint, path, sum(engagement_ms) AS ms, max(scroll_depth) AS depth FROM grouped GROUP BY dimension_name, fingerprint, path)
        GROUP BY dimension_name) b ON a.name = b.name ORDER BY value DESC, name LIMIT 100`,
    });
    return rows;
  },
  async conversions(input: AnalyticsQuery & { definition: Goal; denominator: number }) {
    const { cte, params } = buildQuery({ ...input, goal: undefined });
    const condition = goalCondition({ goal: input.definition, params });
    const rows = await queryRows<{ uniqueConversions: number; totalConversions: number }>({
      params,
      query: `${cte} SELECT uniqExact(fingerprint) AS uniqueConversions, count() AS totalConversions FROM filtered WHERE ${condition}`,
    });
    const revenue = await AnalyticsRepository.revenue({ ...input, conversion: input.definition });
    return {
      ...input.definition,
      ...rows[0],
      totalConversions: input.definition.kind === 'scroll' ? null : rows[0].totalConversions,
      conversionRate: input.denominator ? Math.round((10000 * rows[0].uniqueConversions) / input.denominator) / 100 : 0,
      revenue,
    };
  },
  async revenue(input: AnalyticsQuery & { conversion?: Goal }) {
    const { cte, params } = buildQuery(input);
    const condition = input.conversion ? ` AND ${goalCondition({ goal: input.conversion, params })}` : '';
    const rows = await queryRows<{ currency: string; totalRevenue: number; averageRevenue: number; orders: number }>({
      params,
      query: `${cte} SELECT revenue_currency AS currency, toFloat64(sum(revenue_amount)) AS totalRevenue, toFloat64(avg(revenue_amount)) AS averageRevenue, count() AS orders FROM filtered WHERE revenue_amount IS NOT NULL AND revenue_currency != '' ${condition} GROUP BY revenue_currency ORDER BY revenue_currency`,
    });
    return rows;
  },
  async journeys(input: AnalyticsQuery & { start: string; direction: 'after' | 'before' }) {
    const { cte, params } = buildQuery(input);
    params.start = input.start;
    const sequence = input.direction === 'before' ? 'arrayReverse(sequence)' : 'sequence';
    const rows = await queryRows<{ source: string; target: string; step: number; visitors: number }>({
      params,
      query: `${cte}, paths AS (
      SELECT fingerprint, session, arrayMap(x -> x.2, arraySort(x -> x.1, groupArray(tuple(timestamp, if(event_name = 'pv', path, event_name))))) AS sequence
      FROM filtered WHERE event_name != 'engagement' GROUP BY fingerprint, session
    ), selected AS (SELECT fingerprint, arraySlice(${sequence}, indexOf(${sequence}, {start:String}), 6) AS path FROM paths WHERE has(sequence, {start:String}))
    SELECT path[step] AS source, path[step + 1] AS target, step, uniqExact(fingerprint) AS visitors FROM selected ARRAY JOIN range(1, toUInt32(length(path))) AS step GROUP BY source, target, step ORDER BY step, visitors DESC LIMIT 100`,
    });
    return rows;
  },
};
