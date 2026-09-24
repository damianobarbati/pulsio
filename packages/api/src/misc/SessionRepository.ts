import Repository from 'nano-fw/database/Repository.ts';
import type { Session } from 'types/Session.ts';
import { pg } from '#dao/pg.ts';

class SessionRepository extends Repository<Session> {}

export default new SessionRepository({ database: pg, tableName: 'sessions', uniqueSortColumn: 'id' });
