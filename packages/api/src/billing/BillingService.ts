import { AppError } from 'nano-fw/docs/index.ts';
import Stripe from 'stripe';
import type { IBilling } from 'types/Billing.ts';
import type { ICheckoutAttempt } from 'types/CheckoutAttempt.ts';
import type { IPayment } from 'types/Payment.ts';
import type { IPlan } from 'types/Plan.ts';
import type { ISubscription } from 'types/Subscription.ts';
import { requireCurrentUserId } from '#api/asyncStorage.ts';
import ENV from '#api/env.ts';
import CheckoutAttemptRepository from '#api/misc/CheckoutAttemptRepository.ts';
import PaymentRepository from '#api/misc/PaymentRepository.ts';
import StripeEventRepository from '#api/misc/StripeEventRepository.ts';
import SubscriptionRepository from '#api/misc/SubscriptionRepository.ts';
import PlanRepository from '#api/plan/PlanRepository.ts';
import UserRepository from '#api/user/UserRepository.ts';

const stripe = new Stripe(ENV.STRIPE_SECRET_KEY);

export default class BillingService {
  static async getSubscription(user_id: string): Promise<(ISubscription.row & { plan_row: IPlan.row }) | null> {
    const subscriptions = await SubscriptionRepository.getem({ user_id, status: 'active', sort: [['updated_at', 'desc']], limit: 1 }, true);
    const subscription = subscriptions[0];
    if (!subscription) return null;
    const plan_row = await PlanRepository.getBy({ name: subscription.plan });
    return { ...subscription, plan_row };
  }

  static async getSummary(): Promise<IBilling.summary> {
    const user_id = requireCurrentUserId();
    const subscription = await BillingService.getSubscription(user_id);
    if (!subscription) {
      const plan = await PlanRepository.getBy({ name: 'free' });
      return { plan, subscription: null, next_billing_at: null };
    } else {
      const { plan_row, ...subscriptionData } = subscription;
      return { plan: plan_row, subscription: { ...subscriptionData, plan: plan_row }, next_billing_at: subscription.current_period_ends_at };
    }
  }

  static async createCheckout(input: IBilling.checkoutRequest): Promise<IBilling.checkoutResponse> {
    const user_id = requireCurrentUserId();
    const plan = await PlanRepository.getBy({ name: input.plan });
    if (plan.name === 'custom') throw new AppError(400, 'CUSTOM_PLAN_CONTACT_REQUIRED', 'Contact us to configure a custom plan.');
    const amount = Math.round(Number(input.recurrence === 'year' ? plan.yearly_price : plan.monthly_price) * 100);

    const user = await UserRepository.getBy({ id: user_id });
    const customer_email = user.email;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            recurring: { interval: input.recurrence },
            product_data: { name: `Pulsio ${plan.name} plan` },
          },
          quantity: 1,
        },
      ],
      customer_email,
      client_reference_id: user_id,
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      metadata: { user_id, plan: input.plan, recurrence: input.recurrence },
      subscription_data: { metadata: { user_id, plan: input.plan, recurrence: input.recurrence } },
      success_url: `${ENV.WEBAPP_URL}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ENV.WEBAPP_URL}/billing?checkout=cancelled`,
    });
    if (!session.url) throw new AppError(502, 'STRIPE_CHECKOUT_UNAVAILABLE', 'Stripe did not return a checkout URL.');

    const checkoutAttempt: ICheckoutAttempt.rowInsert = {
      user_id,
      plan: input.plan as ICheckoutAttempt.rowInsert['plan'],
      recurrence: input.recurrence,
      stripe_session_id: session.id,
      url: session.url,
      expires_at: new Date(session.expires_at * 1000).toISOString(),
    };

    await CheckoutAttemptRepository.create(checkoutAttempt);

    return { url: session.url };
  }

  static async syncCheckout(session: Stripe.Checkout.Session): Promise<void> {
    if (session.payment_status !== 'paid') return;

    const user_id = session.metadata?.user_id || session.client_reference_id;
    const plan = session.metadata?.plan;
    const recurrence = session.metadata?.recurrence;
    if (!user_id || !plan || !recurrence || typeof session.subscription !== 'string') return;

    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const current_period_ends_at = new Date(subscription.items.data[0].current_period_end * 1000);

    await PlanRepository.syncCheckout({
      user_id,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
      stripe_subscription_id: subscription.id,
      plan: plan as IBilling.checkoutRequest['plan'],
      recurrence: recurrence as IBilling.checkoutRequest['recurrence'],
      current_period_ends_at: current_period_ends_at.toISOString(),
      checkout_session_id: session.id,
    });
  }

  static async syncSubscription(subscription: Stripe.Subscription, checkout_session_id: string): Promise<boolean> {
    const user_id = subscription.metadata.user_id;
    const plan = subscription.metadata.plan;
    const recurrence = subscription.metadata.recurrence;
    if (!user_id || !plan || !recurrence || typeof subscription.customer !== 'string') return false;

    const current_period_ends_at = subscription.items.data[0]?.current_period_end;
    if (!current_period_ends_at) return false;

    await PlanRepository.syncCheckout({
      user_id,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      plan: plan as IBilling.checkoutRequest['plan'],
      recurrence: recurrence as IBilling.checkoutRequest['recurrence'],
      current_period_ends_at: new Date(current_period_ends_at * 1000).toISOString(),
      checkout_session_id,
    });
    return true;
  }

  static async getInvoiceSubscriptionId(invoice: Stripe.Invoice): Promise<string | null> {
    const legacyInvoice = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
    const invoiceSubscription = invoice.parent?.subscription_details?.subscription ?? legacyInvoice.subscription;
    return typeof invoiceSubscription === 'string' ? invoiceSubscription : null;
  }

  static async ensureSubscription(stripe_subscription_id: string, event_id: string): Promise<string | null> {
    let user_id = await PlanRepository.getSubscriptionUser(stripe_subscription_id);
    if (user_id) return user_id;

    const subscription = await stripe.subscriptions.retrieve(stripe_subscription_id);
    const synced = await BillingService.syncSubscription(subscription, event_id);
    if (!synced) return null;
    user_id = await PlanRepository.getSubscriptionUser(stripe_subscription_id);
    return user_id;
  }

  static async handleWebhook({ payload, signature }: { payload: string; signature: string }): Promise<true> {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, ENV.STRIPE_WS_SECRET_KEY);
    } catch {
      throw new AppError(400, 'INVALID_STRIPE_SIGNATURE', 'Stripe webhook signature is invalid.');
    }

    const isNewEvent = await PlanRepository.recordWebhookEvent(event.id);
    if (!isNewEvent) return true;

    try {
      if (event.type === 'checkout.session.completed') await BillingService.syncCheckout(event.data.object);
      if (event.type === 'checkout.session.async_payment_succeeded') await BillingService.syncCheckout(event.data.object);
      if (event.type === 'customer.subscription.created') await BillingService.syncSubscription(event.data.object, event.id);
      if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;
        const stripe_subscription_id = await BillingService.getInvoiceSubscriptionId(invoice);
        if (stripe_subscription_id) await PlanRepository.updateSubscriptionStatus(stripe_subscription_id, 'active');
        if (stripe_subscription_id && invoice.amount_paid > 0) {
          const user_id = await BillingService.ensureSubscription(stripe_subscription_id, event.id);
          if (!user_id) throw new AppError(500, 'STRIPE_SUBSCRIPTION_NOT_SYNCHRONIZED', 'Stripe subscription is not synchronized.');
          const paid_at = invoice.status_transitions.paid_at;
          if (!paid_at) throw new AppError(500, 'STRIPE_INVOICE_PAID_AT_NOT_FOUND', 'Stripe invoice paid timestamp was not returned.');
          const payment: IPayment.rowInsert = {
            user_id,
            paid_at: new Date(paid_at * 1000).toISOString(),
            amount: invoice.amount_paid,
            currency: invoice.currency.toUpperCase(),
            status: 'paid',
            provider: 'stripe',
            provider_reference: invoice.id,
            invoice_url: invoice.invoice_pdf ?? invoice.hosted_invoice_url ?? null,
          };
          await PlanRepository.createPayment(payment);
        }
      }
      if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object;
        const stripe_subscription_id = await BillingService.getInvoiceSubscriptionId(invoice);
        if (stripe_subscription_id) {
          await BillingService.ensureSubscription(stripe_subscription_id, event.id);
          await PlanRepository.updateSubscriptionStatus(stripe_subscription_id, 'canceled');
        }
      }
      if (event.type === 'customer.subscription.deleted') await PlanRepository.updateSubscriptionStatus(event.data.object.id, 'canceled');
      if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        await BillingService.syncSubscription(subscription, event.id);
        const status = subscription.status === 'active' ? 'active' : 'canceled';
        const current_period_ends_at = subscription.items.data[0]?.current_period_end ? new Date(subscription.items.data[0].current_period_end * 1000) : null;
        await PlanRepository.updateSubscriptionStatus(subscription.id, status, current_period_ends_at ? current_period_ends_at.toISOString() : null);
      }
    } catch (error) {
      await StripeEventRepository.remove(event.id);
      throw error;
    }
    return true;
  }

  static async getPayments() {
    const user_id = requireCurrentUserId();
    const result = await PaymentRepository.getem({ user_id, sort: [['paid_at', 'desc']] }, true);
    return result;
  }
}
