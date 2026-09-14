import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { SiteRow, SiteSetup } from 'types/account.ts';
import ENV from '#api/env.ts';
import { EventRepository } from '#api/events/EventRepository.ts';
import { AccountRepository } from './AccountRepository.ts';

const deriveKey = promisify(scrypt);

export const AccountService = {
  normalizeDomain({ domain }: { domain: string }) {
    const url = new URL(domain.includes('://') ? domain : `https://${domain}`);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      !url.hostname ||
      url.hostname.length > 253
    )
      throw new Error('Enter a domain such as example.com, without a path or port.');
    return url.hostname.toLowerCase().replace(/\.$/, '');
  },
  async register({ email, password, domain, plan = 'start' }: { email: string; password: string; domain: string; plan?: 'start' | 'grow' | 'scale' }) {
    const normalizedDomain = AccountService.normalizeDomain({ domain });
    const salt = randomBytes(16).toString('hex');
    const key = (await deriveKey(password, salt, 64)) as Buffer;
    const verificationToken = randomBytes(32).toString('hex');
    const account = await AccountRepository.create({
      email,
      passwordHash: `${salt}:${key.toString('hex')}`,
      domain: normalizedDomain,
      verificationTokenHash: createHash('sha256').update(verificationToken).digest('hex'),
      plan,
    });
    return { account, verificationToken };
  },
  async login({ email, password }: { email: string; password: string }) {
    const account = await AccountRepository.findByEmail({ email });
    const [salt, hash] = account ? account.password_hash.split(':') : ['00000000000000000000000000000000', '00'.repeat(64)];
    const key = (await deriveKey(password, salt, 64)) as Buffer;
    if (!timingSafeEqual(key, Buffer.from(hash, 'hex')) || !account) return null;
    if (!account.email_verified_at && account.email_verification_expires_at && new Date(account.email_verification_expires_at) <= new Date()) return 'verification_expired';
    return { id: account.id, email: account.email };
  },
  async verifyEmail({ token }: { token: string }) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const result = await AccountRepository.verifyEmail({ tokenHash });
    return result;
  },
  async resetSiteData({ siteId }: { siteId: string }) {
    await EventRepository.clear({ siteId });
    await AccountRepository.resetDetection({ siteId });
  },
  setup({ site }: { site: SiteRow }): SiteSetup {
    return {
      id: site.id,
      domain: site.domain,
      detected: Boolean(site.detected_at),
      snippet: `<script defer src="${ENV.API_URL}/client.js" data-site="${site.domain}"></script>`,
      adminUrl: `${ENV.WEBAPP_URL}/?site=${site.id}`,
    };
  },
};
