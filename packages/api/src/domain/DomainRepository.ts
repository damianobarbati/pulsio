import Repository from 'nano-fw/database/Repository.ts';
import type { Domain, DomainListRequest } from 'types/Domain.ts';
import { pg } from '#dao/pg.ts';

class DomainRepository extends Repository<Domain> {
  async getemQuery(params: DomainListRequest) {
    const { search, user_id, limit: _limit, offset: _offset, sort: _sort } = params;

    const query = this.db<Domain>(this.tableOrView).select('*');

    if (search) query.whereRaw('name ilike ?', [`%${search}%`]);
    if (user_id) query.whereRaw('user_id = ?', [user_id]);

    return { type: 'query' as const, query };
  }
}

export default new DomainRepository({ database: pg, tableName: 'domains2', uniqueSortColumn: 'id' });
