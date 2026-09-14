import { AccountRepository } from '#api/accounts/AccountRepository.ts';
import { AccountService } from '#api/accounts/AccountService.ts';
import { EventRepository } from '#api/events/EventRepository.ts';
import { SuperadminRepository } from './SuperadminRepository.ts';

const timestamp = (value: Date | string | null) => (value ? new Date(value).toISOString() : null);

export const SuperadminService = {
  async list({ query, page }: { query: string; page: number }) {
    const limit = 25;
    const result = await SuperadminRepository.list({ query, limit, offset: (page - 1) * limit });
    return {
      accounts: result.accounts.map((account) => ({
        ...account,
        created_at: timestamp(account.created_at),
        suspended_at: timestamp(account.suspended_at),
        site_count: Number(account.site_count),
        detected_site_count: Number(account.detected_site_count),
      })),
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
      },
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
