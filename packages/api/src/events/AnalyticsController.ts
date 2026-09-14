import { AppError } from 'nano-fw/docs/index.ts';
import type { AnalyticsInput, Dimension } from 'types/analytics.ts';
import { AccountRepository } from '#api/accounts/AccountRepository.ts';
import { PaymentService } from '../payments/PaymentService.ts';
import { AnalyticsRepository } from './AnalyticsRepository.ts';
import { AnalyticsService } from './AnalyticsService.ts';

export const AnalyticsController = {
  async authorize({ accountId, siteId }: { accountId: string; siteId?: string }) {
    const sites = await AccountRepository.sites({ accountId });
    const site = sites.find((item) => item.id === siteId);
    if (!site) throw new AppError(404, 'SITE_NOT_FOUND', 'Website not found.');
    return site;
  },
  async overview({ accountId, input }: { accountId: string; input: AnalyticsInput }) {
    const account = await AccountRepository.findById({ accountId });
    if (!account) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
    await PaymentService.authorizeAnalytics({ accountId, trialEndsAt: account.trial_ends_at });
    const site = await AnalyticsController.authorize({ accountId, siteId: input.site });
    const query = await AnalyticsService.query({ siteId: site.id, input });
    const result = await AnalyticsService.overview(query);
    return result;
  },
  async live({ accountId, siteId }: { accountId: string; siteId?: string }) {
    const account = await AccountRepository.findById({ accountId });
    if (!account) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
    await PaymentService.authorizeAnalytics({ accountId, trialEndsAt: account.trial_ends_at });
    const site = await AnalyticsController.authorize({ accountId, siteId });
    const result = await AnalyticsRepository.live({ siteId: site.id });
    return result;
  },
  async breakdown({ accountId, input }: { accountId: string; input: AnalyticsInput & { dimension: Dimension; key?: string } }) {
    const account = await AccountRepository.findById({ accountId });
    if (!account) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
    await PaymentService.authorizeAnalytics({ accountId, trialEndsAt: account.trial_ends_at });
    const site = await AnalyticsController.authorize({ accountId, siteId: input.site });
    const query = await AnalyticsService.query({ siteId: site.id, input });
    const result = await AnalyticsRepository.breakdown({ ...query, dimension: input.dimension, key: input.key });
    return result;
  },
  async journeys({ accountId, input }: { accountId: string; input: AnalyticsInput & { start: string; direction: 'after' | 'before' } }) {
    const account = await AccountRepository.findById({ accountId });
    if (!account) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
    await PaymentService.authorizeAnalytics({ accountId, trialEndsAt: account.trial_ends_at });
    const site = await AnalyticsController.authorize({ accountId, siteId: input.site });
    const query = await AnalyticsService.query({ siteId: site.id, input });
    const result = await AnalyticsRepository.journeys({ ...query, start: input.start, direction: input.direction });
    return result;
  },
};
