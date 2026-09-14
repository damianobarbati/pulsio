import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Account, AccountRow, SiteRow } from '../../../types/src/account.ts';
import type { Plan } from '../../../types/src/payment.ts';
import { database } from '../../dao/database.ts';

export const AccountRepository = {
  async create({ email, passwordHash, domain, verificationTokenHash, plan }: { email: string; passwordHash: string; domain: string; verificationTokenHash: string; plan: Plan }) {
    const account = await database.transaction(async (transaction) => {
      const id = randomUUID();
      await transaction('accounts').insert({
        id,
        email,
        password_hash: passwordHash,
        email_verification_token_hash: verificationTokenHash,
        email_verification_expires_at: new Date(Date.now() + 3600_000),
      });
      await transaction('sites').insert({ id: randomUUID(), account_id: id, domain });
      await transaction('subscriptions').insert({ id: randomUUID(), account_id: id, plan, interval: 'month', status: 'trialing' });
      return { id, email };
    });
    return account;
  },
  async findByEmail({ email }: { email: string }) {
    const account = await database<AccountRow>('accounts').where({ email }).first();
    return account;
  },
  async findById({ accountId }: { accountId: string }) {
    const account = await database<AccountRow>('accounts').where({ id: accountId }).first();
    return account;
  },
  async verifyEmail({ tokenHash }: { tokenHash: string }) {
    const updated = await database('accounts')
      .where({ email_verification_token_hash: tokenHash })
      .where('email_verification_expires_at', '>', new Date())
      .whereNull('email_verified_at')
      .update({ email_verified_at: new Date(), email_verification_token_hash: null, email_verification_expires_at: null });
    return updated > 0;
  },
  async createSession({ accountId }: { accountId: string }) {
    const token = randomBytes(32).toString('hex');
    await database('sessions').insert({ token_hash: createHash('sha256').update(token).digest('hex'), account_id: accountId, expires_at: new Date(Date.now() + 30 * 86400_000) });
    return token;
  },
  async updateLastLogin({ accountId }: { accountId: string }) {
    await database('accounts').where({ id: accountId }).update({ last_login_at: new Date() });
  },
  async revokeSessions({ accountId }: { accountId: string }) {
    await database('sessions').where({ account_id: accountId }).delete();
  },
  async setSuspended({ accountId, suspended }: { accountId: string; suspended: boolean }) {
    await database('accounts')
      .where({ id: accountId })
      .update({ suspended_at: suspended ? new Date() : null });
  },
  async authenticate({ token }: { token: string }) {
    const account = await database('sessions')
      .join('accounts', 'accounts.id', 'sessions.account_id')
      .where('sessions.token_hash', createHash('sha256').update(token).digest('hex'))
      .where('sessions.expires_at', '>', new Date())
      .whereNull('accounts.suspended_at')
      .select<Account[]>('accounts.id', 'accounts.email')
      .first();
    return account;
  },
  async deleteSession({ token }: { token: string }) {
    await database('sessions')
      .where({ token_hash: createHash('sha256').update(token).digest('hex') })
      .delete();
  },
  async delete({ accountId }: { accountId: string }) {
    await database.transaction(async (transaction) => {
      await transaction('payments').where({ account_id: accountId }).delete();
      await transaction('subscriptions').where({ account_id: accountId }).delete();
      await transaction('accounts').where({ id: accountId }).delete();
    });
  },
  async sites({ accountId }: { accountId: string }) {
    const sites = await database<SiteRow>('sites').where({ account_id: accountId }).orderBy('created_at', 'asc');
    return sites;
  },
  async addSite({ accountId, domain }: { accountId: string; domain: string }) {
    const [site] = await database<SiteRow>('sites').insert({ id: randomUUID(), account_id: accountId, domain }).returning('*');
    return site;
  },
  async findSite({ domain }: { domain: string }) {
    const site = await database<SiteRow>('sites').where({ domain }).first();
    return site;
  },
  async markDetected({ id }: { id: string }) {
    await database('sites').where({ id }).whereNull('detected_at').update({ detected_at: new Date() });
  },
  async resetDetection({ siteId }: { siteId: string }) {
    await database('sites').where({ id: siteId }).update({ detected_at: null });
  },
};
