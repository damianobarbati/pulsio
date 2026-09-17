import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { SubscriptionRow } from 'types/payment.ts';
import { AccountRepository } from '#api/accounts/AccountRepository.ts';
import { AccountService } from '#api/accounts/AccountService.ts';
import ENV from '#api/env.ts';
import { EventRepository } from '#api/events/EventRepository.ts';
import { SuperadminRepository } from './SuperadminRepository.ts';

const timestamp = (value: Date | string | null) => (value ? new Date(value).toISOString() : null);
const accountStatus = ({ subscription, trialEndsAt }: { subscription: { plan: string; status: string } | undefined; trialEndsAt: Date }) => {
  if (subscription && subscription.status === 'active') return 'active' as const;
  if (subscription && subscription.status === 'trialing' && trialEndsAt > new Date()) return 'trialing' as const;
  return 'inactive' as const;
};

export const SuperadminService = {
  async login({ username, password }: { username: string; password: string }) {
    const credentials = Buffer.from(`${username}:${password}`);
    const expected = Buffer.from(`${ENV.SUPERADMIN_USERNAME}:${ENV.SUPERADMIN_PASSWORD}`);
    if (credentials.length !== expected.length || !timingSafeEqual(credentials, expected)) return null;
    const token = randomBytes(32).toString('hex');
    await SuperadminRepository.createSession({ token });
    return token;
  },
  async authenticated({ token }: { token: string }) {
    if (!/^[a-f0-9]{64}$/.test(token)) return false;
    const result = await SuperadminRepository.sessionExists({ token });
    return result;
  },
  async logout({ token }: { token: string }) {
    await SuperadminRepository.deleteSession({ token });
  },
  async overview() {
    return SuperadminRepository.overview();
  },
  async list({ query, page, sort, direction }: { query: string; page: number; sort: string; direction: 'asc' | 'desc' }) {
    const limit = 25;
    const result = await SuperadminRepository.list({ query, limit, offset: (page - 1) * limit, sort, direction });
    const subscriptions = new Map(result.subscriptions.map((subscription) => [subscription.account_id, subscription]));
    const payments = new Map(result.payments.map((payment) => [payment.account_id, Number(payment.total_paid)]));
    const siteAccounts = new Map(result.sites.map((site) => [site.id, site.account_id]));
    const events = new Map<string, number>();
    for (const event of result.events) {
      const accountId = siteAccounts.get(event.site_id);
      if (accountId) events.set(accountId, (events.get(accountId) || 0) + Number(event.events));
    }
    return {
      accounts: result.accounts.map((account) => {
        const subscription = subscriptions.get(account.id);
        const status = accountStatus({ subscription, trialEndsAt: account.trial_ends_at });
        const { trial_ends_at, ...accountData } = account;
        return {
          ...accountData,
          created_at: new Date(account.created_at).toISOString(),
          suspended_at: timestamp(account.suspended_at),
          last_login_at: timestamp(account.last_login_at),
          site_count: Number(account.site_count),
          detected_site_count: Number(account.detected_site_count),
          plan: status === 'inactive' || !subscription ? null : subscription.plan,
          account_status: status,
          total_paid: payments.get(account.id) || 0,
          events: events.get(account.id) || 0,
        };
      }),
      page,
      pages: Math.max(1, Math.ceil(result.total / limit)),
      total: result.total,
    };
  },
  async listSites({ query, page, sort, direction }: { query: string; page: number; sort: string; direction: 'asc' | 'desc' }) {
    const limit = 25;
    const result = await SuperadminRepository.listSites({ query, limit, offset: (page - 1) * limit, sort, direction });
    const events = new Map(result.events.map((event) => [event.site_id, event]));
    return {
      sites: result.sites.map((site) => {
        const event = events.get(site.id);
        return {
          ...site,
          detected: Boolean(site.detected_at),
          detected_at: timestamp(site.detected_at),
          created_at: timestamp(site.created_at),
          events: event ? Number(event.events) : 0,
          latest_event_at: timestamp(event?.latest_event_at || null),
        };
      }),
      page,
      pages: Math.max(1, Math.ceil(result.total / limit)),
      total: result.total,
    };
  },
  async listPayments({ query, page, sort, direction }: { query: string; page: number; sort: string; direction: 'asc' | 'desc' }) {
    const limit = 25;
    const result = await SuperadminRepository.listPayments({ query, limit, offset: (page - 1) * limit, sort, direction });
    return {
      payments: result.payments.map((payment) => ({ ...payment, amount: Number(payment.amount), created_at: timestamp(payment.created_at) })),
      page,
      pages: Math.max(1, Math.ceil(result.total / limit)),
      total: result.total,
    };
  },
  async details({ accountId }: { accountId: string }) {
    const result = await SuperadminRepository.account({ accountId });
    if (!result) return null;
    const eventBySite = new Map(result.events.map((event) => [event.site_id, event]));
    const allEventBySite = new Map(result.allEvents.map((event) => [event.site_id, event]));
    const sites = result.sites.map((site) => {
      const event = eventBySite.get(site.id);
      return {
        id: site.id,
        domain: site.domain,
        detected: Boolean(site.detected_at),
        created_at: timestamp(site.created_at),
        pageviews: allEventBySite.get(site.id)?.pageviews || 0,
        visitors: event?.visitors || 0,
        events_last_30_days: event?.pageviews || 0,
        latest_event_at: allEventBySite.get(site.id)?.latest_event_at || null,
      };
    });
    return {
      account: {
        ...result.account,
        created_at: timestamp(result.account.created_at),
        suspended_at: timestamp(result.account.suspended_at),
        last_login_at: timestamp(result.account.last_login_at),
        updated_at: timestamp(result.account.updated_at),
        email_verified_at: timestamp(result.account.email_verified_at),
        email_verification_expires_at: timestamp(result.account.email_verification_expires_at),
        trial_ends_at: timestamp(result.account.trial_ends_at),
      },
      subscription: result.subscription
        ? {
            ...result.subscription,
            current_period_ends_at: timestamp(result.subscription.current_period_ends_at),
            created_at: timestamp(result.subscription.created_at),
            updated_at: timestamp(result.subscription.updated_at),
          }
        : null,
      sites,
      usage: {
        site_count: sites.length,
        detected_site_count: sites.filter((site) => site.detected).length,
        events: sites.reduce((sum, site) => sum + site.events_last_30_days, 0),
        visitors: sites.reduce((sum, site) => sum + site.visitors, 0),
        latest_event_at:
          sites
            .map((site) => site.latest_event_at)
            .filter(Boolean)
            .sort()
            .at(-1) || null,
      },
      payments: result.payments.map((payment) => ({ ...payment, created_at: timestamp(payment.created_at), updated_at: timestamp(payment.updated_at) })),
      audit: result.audit.map((entry) => ({ action: entry.action, ip_address: entry.ip_address, site_id: entry.site_id, created_at: timestamp(entry.created_at) })),
    };
  },
  async revokeSessions({ accountId }: { accountId: string }) {
    await AccountRepository.revokeSessions({ accountId });
  },
  async setSuspended({ accountId, suspended }: { accountId: string; suspended: boolean }) {
    await AccountRepository.setSuspended({ accountId, suspended });
  },
  async updateEmail({ accountId, email }: { accountId: string; email: string }) {
    await AccountRepository.updateEmail({ accountId, email });
  },
  async updateSubscription({ accountId, input }: { accountId: string; input: Omit<SubscriptionRow, 'id' | 'account_id' | 'created_at' | 'updated_at'> }) {
    await SuperadminRepository.updateSubscription({ accountId, input });
  },
  async siteDetails({ siteId }: { siteId: string }) {
    const result = await SuperadminRepository.site({ siteId });
    if (!result) return null;
    return {
      site: {
        ...result.site,
        created_at: timestamp(result.site.created_at),
        updated_at: timestamp(result.site.updated_at),
        detected_at: timestamp(result.site.detected_at),
      },
      events: Number(result.events?.events || 0),
      latest_event_at: result.events?.latest_event_at || null,
      pageviews: Number(result.usage?.pageviews || 0),
      visitors: Number(result.usage?.visitors || 0),
    };
  },
  async delete({ accountId }: { accountId: string }) {
    const sites = await AccountRepository.sites({ accountId });
    for (const site of sites) await AccountService.resetSiteData({ siteId: site.id });
    await AccountRepository.delete({ accountId });
  },
  async resetSiteData({ siteId }: { siteId: string }) {
    await EventRepository.clear({ siteId });
    await AccountRepository.resetDetection({ siteId });
  },
};
