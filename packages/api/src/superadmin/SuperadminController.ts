import { AppError } from 'nano-fw/docs/index.ts';
import type { SubscriptionRow } from 'types/payment.ts';
import { AccountRepository } from '#api/accounts/AccountRepository.ts';
import ENV from '#api/env.ts';
import { SuperadminRepository } from './SuperadminRepository.ts';
import { SuperadminService } from './SuperadminService.ts';

type ActionInput = { accountId: string; ipAddress: string; siteId?: string };
type SubscriptionInput = Omit<SubscriptionRow, 'id' | 'account_id' | 'created_at' | 'updated_at' | 'current_period_ends_at'> & { current_period_ends_at: string | null };
const sessionCookieName = 'pulsio_superadmin_session';

export const superadminSessionToken = ({ cookie = '' }: { cookie?: string }) => {
  const session = cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${sessionCookieName}=`));
  return session ? session.slice(`${sessionCookieName}=`.length) : '';
};

export const superadminSessionCookie = ({ token, clear = false }: { token: string; clear?: boolean }) => {
  const domain = ENV.COOKIE_DOMAIN ? `; Domain=${ENV.COOKIE_DOMAIN}` : '';
  const secure = ENV.APP_ENV === 'local' ? '' : '; Secure';
  return `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 8 * 60 * 60}${domain}${secure}`;
};

const audit = async ({ action, ...input }: ActionInput & { action: string }) => {
  await SuperadminRepository.recordAudit({ action, ...input });
};

export const SuperadminController = {
  async login({ username, password }: { username: string; password: string }) {
    const token = await SuperadminService.login({ username, password });
    if (!token) throw new AppError(401, 'INVALID_CREDENTIALS', 'Username or password is incorrect.');
    return { token };
  },
  async authenticated({ cookie }: { cookie?: string }) {
    const authenticated = await SuperadminService.authenticated({ token: superadminSessionToken({ cookie }) });
    if (!authenticated) throw new AppError(401, 'UNAUTHORIZED', 'Superadmin authentication is required.');
  },
  async logout({ cookie }: { cookie?: string }) {
    await SuperadminService.logout({ token: superadminSessionToken({ cookie }) });
  },
  async overview() {
    return SuperadminService.overview();
  },
  async list({ query, page, sort, direction }: { query: string; page: number; sort: string; direction: 'asc' | 'desc' }) {
    const result = await SuperadminService.list({ query, page, sort, direction });
    return result;
  },
  async listSites({ query, page, sort, direction }: { query: string; page: number; sort: string; direction: 'asc' | 'desc' }) {
    const result = await SuperadminService.listSites({ query, page, sort, direction });
    return result;
  },
  async listPayments({ query, page, sort, direction }: { query: string; page: number; sort: string; direction: 'asc' | 'desc' }) {
    const result = await SuperadminService.listPayments({ query, page, sort, direction });
    return result;
  },
  async details({ accountId }: { accountId: string }) {
    const result = await SuperadminService.details({ accountId });
    if (!result) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
    return result;
  },
  async siteDetails({ siteId }: { siteId: string }) {
    const result = await SuperadminService.siteDetails({ siteId });
    if (!result) throw new AppError(404, 'SITE_NOT_FOUND', 'Website not found.');
    return result;
  },
  async updateEmail(input: ActionInput & { email: string }) {
    await SuperadminService.updateEmail({ accountId: input.accountId, email: input.email });
    await audit({ ...input, action: 'update_account' });
    return { updated: true };
  },
  async updateSubscription(input: ActionInput & { subscription: SubscriptionInput }) {
    await SuperadminService.updateSubscription({
      accountId: input.accountId,
      input: { ...input.subscription, current_period_ends_at: input.subscription.current_period_ends_at ? new Date(input.subscription.current_period_ends_at) : null },
    });
    await audit({ ...input, action: 'update_billing' });
    return { updated: true };
  },
  async revokeSessions(input: ActionInput) {
    await SuperadminService.revokeSessions({ accountId: input.accountId });
    await audit({ ...input, action: 'revoke_sessions' });
    return { updated: true };
  },
  async suspend(input: ActionInput) {
    await SuperadminService.setSuspended({ accountId: input.accountId, suspended: true });
    await audit({ ...input, action: 'suspend_account' });
    return { updated: true };
  },
  async reactivate(input: ActionInput) {
    await SuperadminService.setSuspended({ accountId: input.accountId, suspended: false });
    await audit({ ...input, action: 'reactivate_account' });
    return { updated: true };
  },
  async delete(input: ActionInput) {
    await audit({ ...input, action: 'delete_account' });
    await SuperadminService.delete({ accountId: input.accountId });
    return { deleted: true };
  },
  async resetSiteData(input: Required<ActionInput>) {
    const sites = await AccountRepository.sites({ accountId: input.accountId });
    if (!sites.some((site) => site.id === input.siteId)) throw new AppError(404, 'SITE_NOT_FOUND', 'Website not found.');
    await SuperadminService.resetSiteData({ siteId: input.siteId });
    await audit({ ...input, action: 'reset_site_data' });
    return { deleted: true };
  },
};
