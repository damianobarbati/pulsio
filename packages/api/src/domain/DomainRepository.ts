import Repository from 'nano-fw/database/Repository.ts';
import type { Domain, DomainListRequest, DomainRow, DomainShare } from 'types/Domain.ts';
import DomainShareRepository from '#api/domain/DomainShareRepository.ts';
import { pg } from '#dao/pg.ts';

class DomainRepository extends Repository<DomainRow, Domain> {
  async getemQuery(params: DomainListRequest) {
    const { search, user_id, limit: _limit, offset: _offset, sort: _sort } = params;
    const query = this.db<DomainRow>(this.tableOrView).select('*');

    if (search) query.whereRaw('domain ilike ?', [`%${search}%`]);
    if (user_id) query.whereRaw('user_id = ?', [user_id]);

    return { type: 'query' as const, query };
  }

  async hydrate(rows: DomainRow[]): Promise<Domain[]> {
    const result: Domain[] = [];

    for (const row of rows) {
      const shares = await DomainShareRepository.getem({ domain_id: row.id, revoked_at: null }, true);
      const publicShares: DomainShare[] = shares.map(({ token_hash: _token_hash, ...share }) => share);
      const domain_row: Domain = { ...row, shares: publicShares };
      result.push(domain_row);
    }

    return result;
  }
}

export default new DomainRepository({ database: pg, tableName: 'domains', viewName: 'domains2', uniqueSortColumn: 'id' });
