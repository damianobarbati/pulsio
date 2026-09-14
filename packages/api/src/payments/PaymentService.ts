import { AppError } from 'nano-fw/docs/index.ts';
import type Stripe from 'stripe';
import { checkoutSchema, type PaymentRowInsert, type Plan, paymentSchema, type SubscriptionRow, subscriptionSchema, subscriptionStatusSchema } from 'types/payment.ts';
import ENV from '#api/env.ts';
import { PaymentRepository } from './PaymentRepository.ts';
import { stripe } from './Stripe.ts';

const plans: Record<Plan, { name: string; monthly: number; yearly: number }> = {
  start: { name: 'Start', monthly: 400, yearly: 3900 },
  grow: { name: 'Grow', monthly: 1000, yearly: 9600 },
  scale: { name: 'Scale', monthly: 3000, yearly: 28800 },
};
const subscriptionStatus = (status: Stripe.Subscription.Status): SubscriptionRow['status'] => {
  if (status === 'paused') return 'past_due';
  if (subscriptionStatusSchema.safeParse(status).success) return subscriptionStatusSchema.parse(status);
  return 'past_due';
};
const timestamp = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000) : null);

export const PaymentService = {
  async create({ payment }: { payment: PaymentRowInsert }) {
    const result = paymentSchema.parse(await PaymentRepository.create({ payment }));
    return result;
  },
  async list({ accountId }: { accountId: string }) {
    const result = paymentSchema.array().parse(await PaymentRepository.list({ accountId }));
    return result;
  },
  async billing({ accountId, trialEndsAt }: { accountId: string; trialEndsAt: Date | string }) {
    const subscription = await PaymentRepository.subscription({ accountId });
    if (!subscription) throw new AppError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found.');
    const result = subscriptionSchema.parse({
      plan: subscription.plan,
      interval: subscription.interval,
      status: subscription.status,
      trial_ends_at: new Date(trialEndsAt).toISOString(),
      current_period_ends_at: subscription.current_period_ends_at ? new Date(subscription.current_period_ends_at).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      has_stripe_subscription: Boolean(subscription.stripe_subscription_id),
    });
    return result;
  },
  async checkout({ accountId, email, trialEndsAt, plan, interval }: { accountId: string; email: string; trialEndsAt: Date | string; plan: Plan; interval: 'month' | 'year' }) {
    const current = await PaymentRepository.subscription({ accountId });
    if (!current) throw new AppError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found.');
    if (current.status === 'active' && !current.cancel_at_period_end) throw new AppError(409, 'SUBSCRIPTION_ACTIVE', 'Your subscription is already active.');
    const price = plans[plan];
    const trialEnd = new Date(trialEndsAt);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      client_reference_id: accountId,
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      tax_id_collection: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Pulsio ${price.name}` },
            unit_amount: interval === 'month' ? price.monthly : price.yearly,
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { account_id: accountId, plan, interval },
        ...(trialEnd > new Date() ? { trial_end: Math.floor(trialEnd.getTime() / 1000) } : {}),
      },
      success_url: `${ENV.WEBAPP_URL}/?billing=success`,
      cancel_url: `${ENV.WEBAPP_URL}/?billing=cancelled`,
    });
    if (!session.url) throw new AppError(502, 'CHECKOUT_UNAVAILABLE', 'Stripe could not create a checkout session.');
    await PaymentRepository.updateSubscription({ accountId, values: { plan, interval, cancel_at_period_end: false } });
    const result = checkoutSchema.parse({ url: session.url });
    return result;
  },
  async cancel({ accountId }: { accountId: string }) {
    const subscription = await PaymentRepository.subscription({ accountId });
    if (!subscription?.stripe_subscription_id) throw new AppError(409, 'SUBSCRIPTION_NOT_ACTIVE', 'There is no active subscription to cancel.');
    const updated = await stripe.subscriptions.update(subscription.stripe_subscription_id, { cancel_at_period_end: true });
    await PaymentRepository.updateSubscription({ accountId, values: { cancel_at_period_end: updated.cancel_at_period_end } });
    return { cancel_at_period_end: true as const };
  },
  async authorizeAnalytics({ accountId, trialEndsAt }: { accountId: string; trialEndsAt: Date | string }) {
    const subscription = await PaymentRepository.subscription({ accountId });
    const hasAccess =
      new Date(trialEndsAt) > new Date() || subscription?.status === 'active' || (subscription?.status === 'trialing' && Boolean(subscription.stripe_subscription_id));
    if (!hasAccess) throw new AppError(402, 'PAYMENT_REQUIRED', 'Your trial has ended. Choose a plan to view your analytics.');
  },
  async webhook({ body, signature }: { body: string; signature: string }) {
    if (!ENV.STRIPE_WS_SECRET_KEY) throw new AppError(503, 'WEBHOOK_UNAVAILABLE', 'Stripe webhook verification is not configured.');
    const event = stripe.webhooks.constructEvent(body, signature, ENV.STRIPE_WS_SECRET_KEY);
    if (event.type === 'checkout.session.completed') await PaymentService.syncCheckout(event.data.object);
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') await PaymentService.syncSubscription(event.data.object);
    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') await PaymentService.syncInvoice(event.data.object);
  },
  async syncCheckout(session: Stripe.Checkout.Session) {
    if (!session.client_reference_id || typeof session.subscription !== 'string' || typeof session.customer !== 'string') return;
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    await PaymentService.syncSubscription(subscription);
  },
  async syncSubscription(subscription: Stripe.Subscription) {
    const accountId = subscription.metadata.account_id;
    const stored = accountId ? await PaymentRepository.subscription({ accountId }) : await PaymentRepository.subscriptionByStripeId({ stripeSubscriptionId: subscription.id });
    if (!stored) return;
    await PaymentRepository.updateSubscription({
      accountId: stored.account_id,
      values: {
        stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        stripe_subscription_id: subscription.id,
        status: subscriptionStatus(subscription.status),
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_ends_at: subscription.items.data[0] ? timestamp(subscription.items.data[0].current_period_end) : null,
      },
    });
  },
  async syncInvoice(invoice: Stripe.Invoice) {
    const invoiceParent = invoice.parent;
    const subscriptionDetails = invoiceParent ? invoiceParent.subscription_details : null;
    const stripeSubscription = subscriptionDetails ? subscriptionDetails.subscription : undefined;
    const stripeSubscriptionId = typeof stripeSubscription === 'string' ? stripeSubscription : stripeSubscription ? stripeSubscription.id : undefined;
    if (!stripeSubscriptionId) return;
    const subscription = await PaymentRepository.subscriptionByStripeId({ stripeSubscriptionId });
    if (!subscription || !invoice.amount_due) return;
    await PaymentRepository.upsert({
      payment: {
        account_id: subscription.account_id,
        amount: invoice.amount_paid || invoice.amount_due,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status === 'paid' ? 'paid' : 'failed',
        provider: 'stripe',
        provider_reference: invoice.id,
        invoice_url: invoice.invoice_pdf || invoice.hosted_invoice_url || null,
      },
    });
  },
};
