import type { PaymentRow, SubscriptionRow } from 'types/payment.ts';
import { cache } from '#dao/cache.ts';
import { clickhouse } from '#dao/clickhouse.ts';
import { database } from '#dao/database.ts';

type AccountListRow = {
  id: string;
  email: string;
  created_at: Date;
  suspended_at: Date | null;
  last_login_at: Date | null;
  trial_ends_at: Date;
  site_count: string;
  detected_site_count: string;
};
type SiteRow = { id: string; account_id: string; domain: string; detected_at: Date | null; created_at: Date };
type EventRow = { site_id: string; pageviews: number; visitors: number; latest_event_at: string | null };
type WebsiteListRow = { id: string; account_id: string; email: string; domain: string; detected_at: Date | null; created_at: Date };
type PaymentListRow = { id: string; account_id: string | null; email: string | null; amount: number; currency: string; status: string; created_at: Date };
type SubscriptionListRow = { account_id: string; plan: string; status: string };
type PaymentTotalRow = { account_id: string; total_paid: string };
type EventTotalRow = { site_id: string; events: number; latest_event_at: string | null };
export type SortDirection = 'asc' | 'desc';
type DayRow = { day: string; value: number };
type EventOverviewRow = { day: string; events: number };

const trendDays = () =>
  Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (29 - index));
    return date.toISOString().slice(0, 10);
  });
const filledTrend = (rows: DayRow[], days = trendDays()) => {
  const values = new Map(rows.map((row) => [row.day.slice(0, 10), Number(row.value)]));
  return days.map((day) => ({ day, value: values.get(day) || 0 }));
};

const queryEvents = async ({ siteIds, lastThirtyDays }: { siteIds: string[]; lastThirtyDays: boolean }) => {
  if (!siteIds.length) return [] as EventRow[];
  const result = await clickhouse.query({
    query: `SELECT site_id, countIf(event_name = 'pv') AS pageviews, uniqExactIf(fingerprint, event_name != 'engagement') AS visitors, max(timestamp) AS latest_event_at FROM events WHERE site_id IN {siteIds:Array(String)}${lastThirtyDays ? ' AND timestamp >= now() - INTERVAL 30 DAY' : ''} GROUP BY site_id`,
    query_params: { siteIds },
    format: 'JSONEachRow',
    clickhouse_settings: { output_format_json_quote_64bit_integers: 0 },
  });
  const rows = await result.json<EventRow>();
  return rows;
};

const queryEventTotals = async ({ siteIds }: { siteIds: string[] }) => {
  if (!siteIds.length) return [] as EventTotalRow[];
  const result = await clickhouse.query({
    query: 'SELECT site_id, count() AS events, max(timestamp) AS latest_event_at FROM events WHERE site_id IN {siteIds:Array(String)} GROUP BY site_id',
    query_params: { siteIds },
    format: 'JSONEachRow',
    clickhouse_settings: { output_format_json_quote_64bit_integers: 0 },
  });
  const rows = await result.json<EventTotalRow>();
  return rows;
};

export const SuperadminRepository = {
  async createSession({ token }: { token: string }) {
    await cache.set(`superadmin-session:${token}`, '1', 'EX', 8 * 60 * 60);
  },
  async sessionExists({ token }: { token: string }) {
    const result = await cache.exists(`superadmin-session:${token}`);
    return result === 1;
  },
  async deleteSession({ token }: { token: string }) {
    await cache.del(`superadmin-session:${token}`);
  },
  async overview() {
    const [active, trials, locked, paymentRisk, newUsers, revenue] = await Promise.all([
      database('subscriptions').where({ status: 'active' }).where('current_period_ends_at', '>', new Date()).count<{ count: string }>({ count: '*' }).first(),
      database('subscriptions')
        .where({ status: 'trialing' })
        .join('accounts', 'accounts.id', 'subscriptions.account_id')
        .where('accounts.trial_ends_at', '>', new Date())
        .count<{ count: string }>({ count: '*' })
        .first(),
      database('accounts').whereNotNull('suspended_at').count<{ count: string }>({ count: '*' }).first(),
      database('subscriptions').whereIn('status', ['past_due', 'unpaid']).count<{ count: string }>({ count: '*' }).first(),
      database('accounts').where('created_at', '>=', database.raw("now() - interval '30 days'")).count<{ count: string }>({ count: '*' }).first(),
      database('payments')
        .where({ status: 'paid', currency: 'USD' })
        .where('created_at', '>=', database.raw("date_trunc('month', now())"))
        .sum<{ total: string | null }>({ total: 'amount' })
        .first(),
    ]);
    const subscriptions = await database<{ plan: 'start' | 'grow' | 'scale'; interval: 'month' | 'year'; status: string }>('subscriptions')
      .select('plan', 'interval')
      .where({ status: 'active' })
      .where('current_period_ends_at', '>', new Date());
    const monthlyPrices = { start: 400, grow: 1000, scale: 3000 };
    const activeMrr = subscriptions.reduce((total, subscription) => total + Math.round(monthlyPrices[subscription.plan] * (subscription.interval === 'year' ? 0.8 : 1)), 0);
    const [usersTrend, revenueTrend] = await Promise.all([
      database('accounts')
        .select<{ day: string; value: string }[]>(database.raw("to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day"))
        .count({ value: '*' })
        .where('created_at', '>=', database.raw("now() - interval '29 days'"))
        .groupByRaw("to_char(created_at at time zone 'UTC', 'YYYY-MM-DD')"),
      database('payments')
        .select<{ day: string; value: string }[]>(database.raw("to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day"))
        .sum({ value: 'amount' })
        .where({ status: 'paid', currency: 'USD' })
        .where('created_at', '>=', database.raw("now() - interval '29 days'"))
        .groupByRaw("to_char(created_at at time zone 'UTC', 'YYYY-MM-DD')"),
    ]);
    const eventResult = await clickhouse.query({
      query: 'SELECT toString(toDate(timestamp)) AS day, count() AS events FROM events WHERE timestamp >= toStartOfDay(now()) - INTERVAL 29 DAY GROUP BY day ORDER BY day',
      format: 'JSONEachRow',
      clickhouse_settings: { output_format_json_quote_64bit_integers: 0 },
    });
    const eventRows = await eventResult.json<EventOverviewRow>();
    const domainsToday = await clickhouse.query({ query: 'SELECT countDistinct(site_id) AS value FROM events WHERE timestamp >= toStartOfDay(now())', format: 'JSONEachRow' });
    const [{ value: domainsWithEventsToday = 0 } = { value: 0 }] = await domainsToday.json<{ value: number }>();
    const latestEvents = await clickhouse.query({ query: 'SELECT countDistinct(site_id) AS value FROM events WHERE timestamp >= now() - INTERVAL 7 DAY', format: 'JSONEachRow' });
    const [{ value: activeDomainsLastWeek = 0 } = { value: 0 }] = await latestEvents.json<{ value: number }>();
    const domainCount = await database('sites').count<{ count: string }>({ count: '*' }).first();
    return {
      kpis: {
        active_users: Number(active?.count || 0),
        domains_with_events_today: Number(domainsWithEventsToday),
        active_mrr: activeMrr,
        paid_this_month: Number(revenue?.total || 0),
        trials: Number(trials?.count || 0),
        locked_users: Number(locked?.count || 0),
        new_users_30_days: Number(newUsers?.count || 0),
        payment_risk: Number(paymentRisk?.count || 0),
        silent_domains_7_days: Math.max(0, Number(domainCount?.count || 0) - Number(activeDomainsLastWeek)),
      },
      trends: {
        users: filledTrend((usersTrend as unknown as DayRow[]).map((row) => ({ day: row.day, value: Number(row.value) }))),
        revenue: filledTrend((revenueTrend as unknown as DayRow[]).map((row) => ({ day: row.day, value: Number(row.value) }))),
        events: filledTrend(eventRows.map((row) => ({ day: row.day, value: Number(row.events) }))),
      },
    };
  },
  async list({ query, limit, offset, sort, direction }: { query: string; limit: number; offset: number; sort: string; direction: SortDirection }) {
    const filter = database('accounts')
      .whereILike('email', `%${query}%`)
      .orWhereIn('accounts.id', (builder) => builder.select('account_id').from('sites').whereILike('domain', `%${query}%`));
    const count = await filter.clone().count<{ count: string }>({ count: '*' }).first();
    const accountOrder: Record<string, string> = {
      email: 'accounts.email',
      site_count: 'site_count',
      plan: 'plan',
      total_paid: 'total_paid',
      last_login_at: 'accounts.last_login_at',
      created_at: 'accounts.created_at',
    };
    const accounts = (await filter
      .clone()
      .leftJoin('sites', 'sites.account_id', 'accounts.id')
      .leftJoin('subscriptions', 'subscriptions.account_id', 'accounts.id')
      .select<AccountListRow[]>(
        'accounts.id',
        'accounts.email',
        'accounts.created_at',
        'accounts.suspended_at',
        'accounts.last_login_at',
        'accounts.trial_ends_at',
        'subscriptions.plan',
      )
      .countDistinct({ site_count: 'sites.id' })
      .countDistinct({ detected_site_count: database.raw('case when sites.detected_at is not null then sites.id end') })
      .select(database.raw("coalesce((select sum(amount) from payments where payments.account_id = accounts.id and payments.status = 'paid'), 0) as total_paid"))
      .groupBy('accounts.id', 'accounts.email', 'accounts.created_at', 'accounts.suspended_at', 'accounts.last_login_at', 'accounts.trial_ends_at', 'subscriptions.plan')
      .groupBy('subscriptions.plan')
      .orderBy(accountOrder[sort] || 'accounts.created_at', direction)
      .orderBy('accounts.id', 'asc')
      .limit(limit)
      .offset(offset)) as AccountListRow[];
    const accountIds = accounts.map((account) => account.id);
    const sites = await database<Pick<SiteRow, 'id' | 'account_id'>>('sites').select('id', 'account_id').whereIn('account_id', accountIds);
    const subscriptions = await database<SubscriptionListRow>('subscriptions').select('account_id', 'plan', 'status').whereIn('account_id', accountIds);
    const payments = (await database('payments')
      .whereIn('account_id', accountIds)
      .where({ status: 'paid' })
      .select('account_id')
      .sum({ total_paid: 'amount' })
      .groupBy('account_id')) as PaymentTotalRow[];
    const events = await queryEventTotals({ siteIds: sites.map((site) => site.id) });
    return { accounts, total: Number(count?.count || 0), sites, subscriptions, payments, events };
  },
  async listSites({ query, limit, offset, sort, direction }: { query: string; limit: number; offset: number; sort: string; direction: SortDirection }) {
    const filter = database('sites')
      .join('accounts', 'accounts.id', 'sites.account_id')
      .where((builder) => {
        builder.whereILike('sites.domain', `%${query}%`).orWhereILike('accounts.email', `%${query}%`);
      });
    const count = await filter.clone().count<{ count: string }>({ count: 'sites.id' }).first();
    const sites = await filter
      .clone()
      .select<WebsiteListRow[]>('sites.id', 'sites.account_id', 'accounts.email', 'sites.domain', 'sites.detected_at', 'sites.created_at')
      .orderBy({ domain: 'sites.domain', email: 'accounts.email', detected_at: 'sites.detected_at', created_at: 'sites.created_at' }[sort] || 'sites.created_at', direction)
      .orderBy('sites.id', 'asc')
      .limit(limit)
      .offset(offset);
    const events = await queryEventTotals({ siteIds: sites.map((site) => site.id) });
    return { sites, total: Number(count?.count || 0), events };
  },
  async listPayments({ query, limit, offset, sort, direction }: { query: string; limit: number; offset: number; sort: string; direction: SortDirection }) {
    const filter = database('payments')
      .leftJoin('accounts', 'accounts.id', 'payments.account_id')
      .where((builder) => {
        builder.whereILike('accounts.email', `%${query}%`).orWhereILike('payments.status', `%${query}%`).orWhereILike('payments.provider_reference', `%${query}%`);
      });
    const count = await filter.clone().count<{ count: string }>({ count: 'payments.id' }).first();
    const payments = await filter
      .clone()
      .select<PaymentListRow[]>('payments.id', 'payments.account_id', 'accounts.email', 'payments.amount', 'payments.currency', 'payments.status', 'payments.created_at')
      .orderBy({ email: 'accounts.email', amount: 'payments.amount', status: 'payments.status', created_at: 'payments.created_at' }[sort] || 'payments.created_at', direction)
      .orderBy('payments.id', 'asc')
      .limit(limit)
      .offset(offset);
    return { payments, total: Number(count?.count || 0) };
  },
  async account({ accountId }: { accountId: string }) {
    const account = await database('accounts')
      .select('id', 'email', 'created_at', 'updated_at', 'suspended_at', 'last_login_at', 'email_verified_at', 'email_verification_expires_at', 'trial_ends_at')
      .where({ id: accountId })
      .first();
    if (!account) return null;
    const sites = await database<SiteRow>('sites').where({ account_id: accountId }).orderBy('created_at', 'asc');
    const events = await queryEvents({ siteIds: sites.map((site) => site.id), lastThirtyDays: true });
    const allEvents = await queryEvents({ siteIds: sites.map((site) => site.id), lastThirtyDays: false });
    const payments = await database<PaymentRow>('payments').where({ account_id: accountId }).orderBy('created_at', 'desc');
    const subscription = await database<SubscriptionRow>('subscriptions').where({ account_id: accountId }).first();
    const audit = await database('superadmin_audit_logs').where({ account_id: accountId }).orderBy('created_at', 'desc').limit(50);
    return { account, sites, events, allEvents, payments, subscription, audit };
  },
  async site({ siteId }: { siteId: string }) {
    const site = await database('sites')
      .join('accounts', 'accounts.id', 'sites.account_id')
      .select('sites.id', 'sites.account_id', 'sites.domain', 'sites.created_at', 'sites.updated_at', 'sites.detected_at', 'accounts.email')
      .where('sites.id', siteId)
      .first();
    if (!site) return null;
    const [events] = await queryEventTotals({ siteIds: [siteId] });
    const [usage] = await queryEvents({ siteIds: [siteId], lastThirtyDays: false });
    return { site, events, usage };
  },
  async updateSubscription({ accountId, input }: { accountId: string; input: Omit<SubscriptionRow, 'id' | 'account_id' | 'created_at' | 'updated_at'> }) {
    await database('subscriptions').where({ account_id: accountId }).update(input);
  },
  async recordAudit({ ipAddress, action, accountId, siteId }: { ipAddress: string; action: string; accountId?: string; siteId?: string }) {
    await database('superadmin_audit_logs').insert({ ip_address: ipAddress, action, account_id: accountId || null, site_id: siteId || null });
  },
};
