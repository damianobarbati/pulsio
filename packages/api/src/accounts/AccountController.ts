import { AppError } from 'nano-fw/docs/index.ts';
import type { Account } from 'types/account.ts';
import ENV from '#api/env.ts';
import { cache } from '../../dao/cache.ts';
import { AnalyticsController } from '../events/AnalyticsController.ts';
import { AccountEmail } from './AccountEmail.ts';
import { AccountRepository } from './AccountRepository.ts';
import { AccountService } from './AccountService.ts';

export const sessionToken = ({ cookie = '' }: { cookie?: string }) => {
  const session = cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith('pulsio_session='));
  return session ? session.slice('pulsio_session='.length) : '';
};

export const sessionCookie = ({ token, clear = false }: { token: string; clear?: boolean }) => {
  const domain = ENV.COOKIE_DOMAIN ? `; Domain=${ENV.COOKIE_DOMAIN}` : '';
  const secure = ENV.APP_ENV === 'local' ? '' : '; Secure';
  return `pulsio_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : 30 * 86400}${domain}${secure}`;
};

export const authenticatedAccount = async ({ cookie }: { cookie?: string }) => {
  const token = sessionToken({ cookie });
  const account = /^[a-f0-9]{64}$/.test(token) ? await AccountRepository.authenticate({ token }) : undefined;
  if (!account) throw new AppError(401, 'UNAUTHORIZED', 'Please log in.');
  return account;
};

export const AccountController = {
  async rateLimit({ ip }: { ip: string }) {
    const key = `auth-attempts:${ip}`;
    const attempts = await cache.incr(key);
    if (attempts === 1) await cache.expire(key, 900);
    if (attempts > 20) throw new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please try again in 15 minutes.');
  },
  async register(input: { email: string; password: string; domain: string; plan: 'start' | 'grow' | 'scale' | 'expand' }) {
    try {
      const registration = await AccountService.register(input);

      try {
        await AccountEmail.sendVerification({ email: registration.account.email, token: registration.verificationToken });
      } catch (error) {
        console.error('Could not send registration verification email.', error);
      }

      const token = await AccountRepository.createSession({ accountId: registration.account.id });
      const sites = await AccountRepository.sites({ accountId: registration.account.id });
      return { token, setup: AccountService.setup({ site: sites[0], userId: registration.account.id }) };
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505')
        throw new AppError(409, 'ACCOUNT_EXISTS', 'That email or website is already registered. Log in to your account.');
      if (error instanceof TypeError || (error instanceof Error && error.message.startsWith('Enter a domain')))
        throw new AppError(400, 'INVALID_DOMAIN', 'Enter a valid website domain, without a path or port.');
      throw error;
    }
  },
  async login(input: { email: string; password: string }) {
    const account = await AccountService.login(input);
    if (!account) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    if (account === 'verification_expired') throw new AppError(403, 'EMAIL_VERIFICATION_EXPIRED', 'Verify your email before logging in.');
    const stored = await AccountRepository.findByEmail({ email: account.email });
    if (stored?.suspended_at) throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended.');
    await AccountRepository.updateLastLogin({ accountId: account.id });
    const token = await AccountRepository.createSession({ accountId: account.id });
    return { token, account };
  },
  async verifyEmail({ token }: { token: string }) {
    const verified = await AccountService.verifyEmail({ token });
    if (!verified) throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'This verification link is invalid or expired.');
    return { verified };
  },
  async logout({ cookie }: { cookie?: string }) {
    await AccountRepository.deleteSession({ token: sessionToken({ cookie }) });
    return null;
  },
  async account({ account }: { account: Account }) {
    const sites = await AccountRepository.sites({ accountId: account.id });
    const stored = await AccountRepository.findByEmail({ email: account.email });
    if (!stored) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
    return { email: account.email, sites: sites.map((site) => AccountService.setup({ site, userId: account.id })), trial_ends_at: new Date(stored.trial_ends_at).toISOString() };
  },
  async setup({ account }: { account: Account }) {
    const sites = await AccountRepository.sites({ accountId: account.id });
    if (!sites.length) throw new AppError(404, 'SITE_NOT_FOUND', 'Add a website first.');
    const result = AccountService.setup({ site: sites[0], userId: account.id });
    return result;
  },
  async addSite({ account, domain }: { account: Account; domain: string }) {
    try {
      const normalizedDomain = AccountService.normalizeDomain({ domain });
      const site = await AccountRepository.addSite({ accountId: account.id, domain: normalizedDomain });
      const result = AccountService.setup({ site, userId: account.id });
      return result;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505') throw new AppError(409, 'SITE_EXISTS', 'That website is already registered.');
      if (error instanceof TypeError || (error instanceof Error && error.message.startsWith('Enter a domain')))
        throw new AppError(400, 'INVALID_DOMAIN', 'Enter a valid domain, without a path or port.');
      throw error;
    }
  },
  async resetSiteData({ account, siteId }: { account: Account; siteId: string }) {
    const site = await AnalyticsController.authorize({ accountId: account.id, siteId });
    await AccountService.resetSiteData({ siteId: site.id });
    return { deleted: true };
  },
  async delete({ account }: { account: Account }) {
    const sites = await AccountRepository.sites({ accountId: account.id });
    for (const site of sites) await AccountService.resetSiteData({ siteId: site.id });
    await AccountRepository.delete({ accountId: account.id });
    return { deleted: true };
  },
};
