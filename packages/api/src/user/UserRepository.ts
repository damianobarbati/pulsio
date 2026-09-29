import Repository from 'nano-fw/database/Repository.ts';
import type { IUser } from 'types/User.ts';
import { pg } from '#dao/pg.ts';

class UserRepository extends Repository<IUser.user> {
  async getemQuery(params: IUser.listRequest) {
    const { search, limit: _limit, offset: _offset, sort: _sort } = params;

    const query = this.db<IUser.user>(this.tableOrView).select('*');

    if (search) {
      const pattern = `%${search}%`;
      query.whereRaw('(name ilike ? or email ilike ?)', [pattern, pattern]);
    }

    return { type: 'query' as const, query };
  }
}

export default new UserRepository({ database: pg, tableName: 'users', uniqueSortColumn: 'id' });
