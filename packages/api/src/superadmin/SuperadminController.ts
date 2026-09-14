import { AppError } from 'nano-fw/docs/index.ts';
import { AccountRepository } from '#api/accounts/AccountRepository.ts';
import { SuperadminRepository } from './SuperadminRepository.ts';
import { SuperadminService } from './SuperadminService.ts';

type ActionInput = { accountId: string; ipAddress: string; siteId?: string };
const audit = async ({ action, ...input }: ActionInput & { action: string }) => {
  await SuperadminRepository.recordAudit({ action, ...input });
};

export const SuperadminController = {
  async list({ query, page }: { query: string; page: number }) {
    const result = await SuperadminService.list({ query, page });
    return result;
  },
  async details({ accountId }: { accountId: string }) {
    const result = await SuperadminService.details({ accountId });
    if (!result) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
    return result;
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
