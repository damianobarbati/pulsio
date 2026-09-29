import Repository from 'nano-fw/database/Repository.ts';
import type { IStripeEvent } from 'types/StripeEvent.ts';
import { pg } from '#dao/pg.ts';

class StripeEventRepository extends Repository<IStripeEvent.row, IStripeEvent.row, IStripeEvent.rowInsert> {
  async createIgnore(input: IStripeEvent.rowInsert): Promise<boolean> {
    const inserted = await this.db(this.configuration.tableName).insert(input).onConflict('id').ignore().returning('id');
    return inserted.length > 0;
  }
}

export default new StripeEventRepository({ database: pg, tableName: 'stripe_events', uniqueSortColumn: 'id' });
