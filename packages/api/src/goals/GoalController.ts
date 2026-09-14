import type { GoalInput } from '../../../types/src/goal.ts';
import { AnalyticsController } from '../events/AnalyticsController.ts';
import { GoalRepository } from './GoalRepository.ts';
import { GoalService } from './GoalService.ts';

export const GoalController = {
  async list({ accountId, siteId }: { accountId: string; siteId: string }) {
    await AnalyticsController.authorize({ accountId, siteId });
    const result = await GoalRepository.list({ siteId });
    return result;
  },
  async save({ accountId, input, id }: { accountId: string; input: GoalInput; id?: string }) {
    await AnalyticsController.authorize({ accountId, siteId: input.site });
    const result = await GoalService.save({ input, id });
    return result;
  },
  async remove({ accountId, siteId, id }: { accountId: string; siteId: string; id: string }) {
    await AnalyticsController.authorize({ accountId, siteId });
    const result = await GoalService.remove({ siteId, id });
    return result;
  },
};
