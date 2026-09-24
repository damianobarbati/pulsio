import Repository from 'nano-fw/database/Repository.ts';
import type { User, UserListRequest } from 'types/User.ts';
import { pg } from '#dao/pg.ts';

class UserRepository extends Repository<User> {
  async getemQuery(params: UserListRequest) {
    const { search, limit: _limit, offset: _offset, sort: _sort } = params;

    const query = this.db<User>(this.tableOrView).select('*');

    if (search) {
      const pattern = `%${search}%`;
      query.whereRaw('(name ilike ? or email ilike ?)', [pattern, pattern]);
    }

    return { type: 'query' as const, query };
  }
}

export default new UserRepository({ database: pg, tableName: 'users', uniqueSortColumn: 'id' });
