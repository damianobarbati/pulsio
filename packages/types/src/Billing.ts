import z from 'zod';
import { PlanSchemas } from '#types/Plan.ts';

const BillingRecurrenceSchema = z.enum(['month', 'year']);
export type BillingRecurrence = z.infer<typeof BillingRecurrenceSchema>;

const BillingSubscriptionSchema = z.object({
  plan: PlanSchemas.row,
  recurrence: BillingRecurrenceSchema,
  status: z.enum(['active', 'canceled']),
  current_period_ends_at: z.iso.datetime({ offset: true }).nullable(),
});
export type BillingSubscription = z.infer<typeof BillingSubscriptionSchema>;

const BillingSummarySchema = z.object({
  plan: PlanSchemas.row,
  subscription: BillingSubscriptionSchema.nullable(),
  next_billing_at: z.iso.datetime({ offset: true }).nullable(),
});
export type BillingSummary = z.infer<typeof BillingSummarySchema>;

const BillingCheckoutRequestSchema = z.object({
  plan: PlanSchemas.row.shape.name,
  recurrence: BillingRecurrenceSchema,
});
export type BillingCheckoutRequest = z.infer<typeof BillingCheckoutRequestSchema>;

const BillingCheckoutResponseSchema = z.object({ url: z.url() });
export type BillingCheckoutResponse = z.infer<typeof BillingCheckoutResponseSchema>;

const BillingPaymentSchema = z.object({
  id: z.uuid(),
  paid_at: z.iso.datetime({ offset: true }).nullable(),
  amount: z.number().int().positive(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']),
  invoice_url: z.url().max(2000).nullable(),
});
export type BillingPayment = z.infer<typeof BillingPaymentSchema>;

const BillingPaymentListResponseSchema = z.array(BillingPaymentSchema);
export type BillingPaymentListResponse = z.infer<typeof BillingPaymentListResponseSchema>;

const BillingCheckoutSyncSchema = z.object({
  user_id: z.uuid(),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string(),
  plan: PlanSchemas.row.shape.name,
  recurrence: BillingRecurrenceSchema,
  current_period_ends_at: z.iso.datetime({ offset: true }),
  checkout_session_id: z.string(),
});
export type BillingCheckoutSync = z.infer<typeof BillingCheckoutSyncSchema>;

export const BillingSchemas = {
  recurrence: BillingRecurrenceSchema,
  subscription: BillingSubscriptionSchema,
  summary: BillingSummarySchema,
  checkoutRequest: BillingCheckoutRequestSchema,
  checkoutResponse: BillingCheckoutResponseSchema,
  payment: BillingPaymentSchema,
  paymentListResponse: BillingPaymentListResponseSchema,
  checkoutSync: BillingCheckoutSyncSchema,
};

export namespace IBilling {
  export type recurrence = BillingRecurrence;
  export type subscription = BillingSubscription;
  export type summary = BillingSummary;
  export type checkoutRequest = BillingCheckoutRequest;
  export type checkoutResponse = BillingCheckoutResponse;
  export type payment = BillingPayment;
  export type paymentListResponse = BillingPaymentListResponse;
  export type checkoutSync = BillingCheckoutSync;
}
