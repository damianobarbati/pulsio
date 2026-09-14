import { randomUUID } from 'node:crypto';
import { clickhouse } from '#dao/clickhouse.ts';
import { database } from '#dao/database.ts';
import type { PaymentRow } from '../../../types/src/payment.ts';

type AccountListRow = { id: string; email: string; created_at: Date; suspended_at: Date | null; site_count: string; detected_site_count: string };
type SiteRow = { id: string; account_id: string; domain: string; detected_at: Date | null; created_at: Date };
type EventRow = { site_id: string; pageviews: number; visitors: number; latest_event_at: string | null };

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

export const SuperadminRepository = {
  async list({ query, limit, offset }: { query: string; limit: number; offset: number }) {
    const filter = database('accounts')
      .whereILike('email', `%${query}%`)
      .orWhereIn('accounts.id', (builder) => builder.select('account_id').from('sites').whereILike('domain', `%${query}%`));
    const count = await filter.clone().count<{ count: string }>({ count: '*' }).first();
    const accounts = (await filter
      .clone()
      .leftJoin('sites', 'sites.account_id', 'accounts.id')
      .select<AccountListRow[]>('accounts.id', 'accounts.email', 'accounts.created_at', 'accounts.suspended_at')
      .count({ site_count: 'sites.id' })
      .count({ detected_site_count: database.raw('case when sites.detected_at is not null then 1 end') })
      .groupBy('accounts.id')
      .orderBy('accounts.created_at', 'desc')
      .limit(limit)
      .offset(offset)) as AccountListRow[];
    return { accounts, total: Number(count?.count || 0) };
  },
  async account({ accountId }: { accountId: string }) {
    const account = await database('accounts').select('id', 'email', 'created_at', 'suspended_at', 'last_login_at').where({ id: accountId }).first();
    if (!account) return null;
    const sites = await database<SiteRow>('sites').where({ account_id: accountId }).orderBy('created_at', 'asc');
    const events = await queryEvents({ siteIds: sites.map((site) => site.id), lastThirtyDays: true });
    const allEvents = await queryEvents({ siteIds: sites.map((site) => site.id), lastThirtyDays: false });
    const payments = await database<PaymentRow>('payments').where({ account_id: accountId }).orderBy('created_at', 'desc');
    const audit = await database('superadmin_audit_logs').where({ account_id: accountId }).orderBy('created_at', 'desc').limit(50);
    return { account, sites, events, allEvents, payments, audit };
  },
  async recordAudit({ ipAddress, action, accountId, siteId }: { ipAddress: string; action: string; accountId?: string; siteId?: string }) {
    await database('superadmin_audit_logs').insert({ id: randomUUID(), ip_address: ipAddress, action, account_id: accountId || null, site_id: siteId || null });
  },
};
