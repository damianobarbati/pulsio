import Repository from 'nano-fw/database/Repository.ts';
import type { IDomain } from 'types/Domain.ts';
import DomainService from '#api/domain/DomainService.ts';
import DomainShareRepository from '#api/domain/DomainShareRepository.ts';
import ENV from '#api/env.ts';
import { pg } from '#dao/pg.ts';

class DomainRepository extends Repository<IDomain.row, IDomain.domain> {
  async getemQuery(params: IDomain.listRequest) {
    const { search, user_id, limit: _limit, offset: _offset, sort } = params;
    const query = this.db<IDomain.row>(this.tableOrView).select('*');
    if (!sort) query.orderBy('id');

    if (search) query.whereRaw('domain ilike ?', [`%${search}%`]);
    if (user_id) query.whereRaw('user_id = ?', [user_id]);

    return { type: 'query' as const, query };
  }

  async hydrate(rows: IDomain.row[]): Promise<IDomain.domain[]> {
    const result: IDomain.domain[] = [];

    for (const row of rows) {
      const shares = await DomainShareRepository.getem({ domain_id: row.id, revoked_at: null }, true);
      const publicShares: IDomain.share[] = shares.map(({ token_hash: _token_hash, ...share }) => ({
        ...share,
        url: `${ENV.WEBAPP_URL}/share/${DomainService.getShareToken(share.id)}`,
      }));
      const domain_row: IDomain.domain = { ...row, shares: publicShares };
      result.push(domain_row);
    }

    return result;
  }
}

export default new DomainRepository({ database: pg, tableName: 'domains', viewName: 'domains2', uniqueSortColumn: 'id' });
