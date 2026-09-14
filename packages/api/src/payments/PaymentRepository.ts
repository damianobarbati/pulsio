import { randomUUID } from 'node:crypto';
import type { PaymentRow, PaymentRowInsert, SubscriptionRow } from '../../../types/src/payment.ts';
import { database } from '../../dao/database.ts';
export const PaymentRepository = {
  async create({ payment }: { payment: PaymentRowInsert }) {
    const [result] = await database<PaymentRow>('payments')
      .insert({ id: randomUUID(), ...payment })
      .returning('*');
    return result;
  },
  async list({ accountId }: { accountId: string }) {
    const result = await database<PaymentRow>('payments').where({ account_id: accountId }).orderBy('created_at', 'desc');
    return result;
  },
  async subscription({ accountId }: { accountId: string }) {
    const result = await database<SubscriptionRow>('subscriptions').where({ account_id: accountId }).first();
    return result;
  },
  async updateSubscription({ accountId, values }: { accountId: string; values: Partial<SubscriptionRow> }) {
    const [result] = await database<SubscriptionRow>('subscriptions')
      .where({ account_id: accountId })
      .update({ ...values, updated_at: new Date() })
      .returning('*');
    return result;
  },
  async subscriptionByStripeId({ stripeSubscriptionId }: { stripeSubscriptionId: string }) {
    const result = await database<SubscriptionRow>('subscriptions').where({ stripe_subscription_id: stripeSubscriptionId }).first();
    return result;
  },
  async upsert({ payment }: { payment: PaymentRowInsert }) {
    const [result] = await database<PaymentRow>('payments')
      .insert({ id: randomUUID(), ...payment })
      .onConflict(['provider', 'provider_reference'])
      .merge({ amount: payment.amount, currency: payment.currency, status: payment.status, invoice_url: payment.invoice_url, updated_at: new Date() })
      .returning('*');
    return result;
  },
};
