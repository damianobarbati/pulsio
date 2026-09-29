import Repository from 'nano-fw/database/Repository.ts';
import type { IPayment } from 'types/Payment.ts';
import { pg } from '#dao/pg.ts';

class PaymentRepository extends Repository<IPayment.payment, IPayment.payment, IPayment.rowInsert> {}

export default new PaymentRepository({ database: pg, tableName: 'payments', uniqueSortColumn: 'id' });
