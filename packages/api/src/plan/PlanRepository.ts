import Repository from 'nano-fw/database/Repository.ts';
import type { IBilling } from 'types/Billing.ts';
import type { IPayment } from 'types/Payment.ts';
import type { IPlan } from 'types/Plan.ts';
import type { ISubscription } from 'types/Subscription.ts';
import CheckoutAttemptRepository from '#api/misc/CheckoutAttemptRepository.ts';
import PaymentRepository from '#api/misc/PaymentRepository.ts';
import StripeEventRepository from '#api/misc/StripeEventRepository.ts';
import SubscriptionRepository from '#api/misc/SubscriptionRepository.ts';
import UserRepository from '#api/user/UserRepository.ts';
import { pg } from '#dao/pg.ts';

class PlanRepository extends Repository<IPlan.plan> {
  async syncCheckout(input: IBilling.checkoutSync): Promise<void> {
    const { user_id, stripe_customer_id, stripe_subscription_id, plan, recurrence, current_period_ends_at, checkout_session_id } = input;
    await this.runInTransaction(async () => {
      const user = await UserRepository.get(user_id);
      await UserRepository.update(user.id, { stripe_customer_id });

      const activeSubscriptions = await SubscriptionRepository.getem({ user_id, status: 'active' }, true);
      for (const subscription of activeSubscriptions) await SubscriptionRepository.update(subscription.id, { status: 'canceled' });

      const subscription = await SubscriptionRepository.findBy({ stripe_subscription_id }, true);
      if (subscription) {
        await SubscriptionRepository.update(subscription.id, { user_id, plan, recurrence, status: 'active', current_period_ends_at });
      } else {
        await SubscriptionRepository.create({ user_id, plan, recurrence, status: 'active', stripe_subscription_id, current_period_ends_at });
      }

      const checkoutAttempt = await CheckoutAttemptRepository.findBy({ stripe_session_id: checkout_session_id }, true);
      if (checkoutAttempt) await CheckoutAttemptRepository.update(checkoutAttempt.id, { completed_at: new Date().toISOString() });
    });
  }

  async recordWebhookEvent(event_id: string): Promise<boolean> {
    const isNewEvent = await StripeEventRepository.createIgnore({ id: event_id });
    return isNewEvent;
  }

  async getSubscriptionUser(stripe_subscription_id: string): Promise<string | null> {
    const subscription = await SubscriptionRepository.findBy({ stripe_subscription_id }, true);
    if (!subscription) return null;
    return subscription.user_id;
  }

  async updateSubscriptionStatus(stripe_subscription_id: string, status: ISubscription.status, current_period_ends_at?: string | null): Promise<void> {
    const subscription = await SubscriptionRepository.findBy({ stripe_subscription_id }, true);
    if (!subscription) return;
    const update = current_period_ends_at === undefined ? { status } : { status, current_period_ends_at };
    await SubscriptionRepository.update(subscription.id, update);
  }

  async createPayment(input: IPayment.rowInsert): Promise<void> {
    const payment = await PaymentRepository.findBy({ provider: input.provider, provider_reference: input.provider_reference }, true);
    if (payment) return;
    await PaymentRepository.create(input);
  }
}

export default new PlanRepository({ database: pg, tableName: 'plans', uniqueSortColumn: 'id' });
