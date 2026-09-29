import Repository from 'nano-fw/database/Repository.ts';
import type { ICheckoutAttempt } from 'types/CheckoutAttempt.ts';
import { pg } from '#dao/pg.ts';

class CheckoutAttemptRepository extends Repository<ICheckoutAttempt.row, ICheckoutAttempt.row, ICheckoutAttempt.rowInsert> {}

export default new CheckoutAttemptRepository({ database: pg, tableName: 'checkout_attempts', uniqueSortColumn: 'id' });
