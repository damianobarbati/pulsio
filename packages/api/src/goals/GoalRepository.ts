import { randomUUID } from 'node:crypto';
import type { Goal, GoalInput } from 'types/goal.ts';
import { database } from '../../dao/database.ts';

export const GoalRepository = {
  async list({ siteId }: { siteId: string }) {
    const result = await database<Goal>('goals').where({ site_id: siteId }).orderBy('name');
    return result;
  },
  async save({ input, id }: { input: GoalInput; id?: string }) {
    const { site, ...fields } = input;
    const rows = id
      ? await database<Goal>('goals').where({ id, site_id: site }).update(fields).returning('*')
      : await database<Goal>('goals')
          .insert({ ...fields, site_id: site, id: randomUUID() })
          .returning('*');
    return rows[0];
  },
  async remove({ siteId, id }: { siteId: string; id: string }) {
    const result = await database('goals').where({ id, site_id: siteId }).delete();
    return result;
  },
};
