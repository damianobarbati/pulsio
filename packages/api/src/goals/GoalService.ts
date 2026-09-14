import { AppError } from 'nano-fw/docs/index.ts';
import type { GoalInput } from '../../../types/src/goal.ts';
import { GoalRepository } from './GoalRepository.ts';

export const GoalService = {
  async save({ input, id }: { input: GoalInput; id?: string }) {
    if (input.kind !== 'event' && !input.target.startsWith('/') && input.target !== '**')
      throw new AppError(400, 'INVALID_PATH', 'Use a page path starting with / or ** for all pages.');
    if (Object.keys(input.properties).length > 20) throw new AppError(400, 'INVALID_PROPERTIES', 'Use at most 20 properties.');
    try {
      const result = await GoalRepository.save({ input, id });
      if (!result) throw new AppError(404, 'GOAL_NOT_FOUND', 'Goal not found.');
      return result;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505') throw new AppError(409, 'GOAL_EXISTS', 'A goal with this name already exists.');
      throw error;
    }
  },
  async remove({ siteId, id }: { siteId: string; id: string }) {
    const count = await GoalRepository.remove({ siteId, id });
    if (!count) throw new AppError(404, 'GOAL_NOT_FOUND', 'Goal not found.');
    return { deleted: true };
  },
};
