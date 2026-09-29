import Repository from 'nano-fw/database/Repository.ts';
import type { Plan } from 'types/Plan.ts';
import { pg } from '#dao/pg.ts';

class PlanRepository extends Repository<Plan> {}

export default new PlanRepository({ database: pg, tableName: 'plans', uniqueSortColumn: 'id' });
