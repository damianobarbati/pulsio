import Repository from 'nano-fw/database/Repository.ts';
import type { IDomain } from 'types/Domain.ts';
import { pg } from '#dao/pg.ts';

class DomainShareRepository extends Repository<IDomain.shareRow> {}

export default new DomainShareRepository({ database: pg, tableName: 'domains_shares', uniqueSortColumn: 'id' });
