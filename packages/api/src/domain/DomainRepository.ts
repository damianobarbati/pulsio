import Repository from 'nano-fw/database/Repository.ts';
import type { Domain } from 'types/Domain.ts';
import { pg } from '#dao/pg.ts';

class DomainRepository extends Repository<Domain> {}

export default new DomainRepository({ database: pg, tableName: 'domains', uniqueSortColumn: 'id' });
