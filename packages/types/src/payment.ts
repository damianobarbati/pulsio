import z from 'zod';
export const planSchema = z.enum(['start', 'grow', 'scale', 'expand']);
export const intervalSchema = z.enum(['month', 'year']);
export const subscriptionStatusSchema = z.enum(['trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired']);
export const paymentInputSchema = z
  .object({
    account_id: z.uuid(),
    amount: z.number().int().positive().max(2147483647),
    currency: z.string().regex(/^[A-Z]{3}$/),
    status: z.enum(['pending', 'paid', 'failed', 'refunded']).default('pending'),
    provider: z.string().min(1).nullable().default(null),
    provider_reference: z.string().min(1).nullable().default(null),
    invoice_url: z.url().nullable().default(null),
  })
  .refine((value) => Boolean(value.provider) === Boolean(value.provider_reference), 'Provider and reference must be supplied together');
export const paymentSchema = z.object({
  id: z.uuid(),
  account_id: z.uuid(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']),
  provider: z.string().nullable(),
  provider_reference: z.string().nullable(),
  invoice_url: z.url().nullable(),
  created_at: z.coerce.date().transform((value) => value.toISOString()),
  updated_at: z.coerce.date().transform((value) => value.toISOString()),
});
export const subscriptionSchema = z.object({
  plan: planSchema,
  interval: intervalSchema,
  status: subscriptionStatusSchema,
  trial_ends_at: z.iso.datetime(),
  current_period_ends_at: z.iso.datetime().nullable(),
  cancel_at_period_end: z.boolean(),
  has_stripe_subscription: z.boolean(),
});
export const checkoutInputSchema = z.object({ plan: planSchema, interval: intervalSchema });
export const checkoutSchema = z.object({ url: z.url() });
export const cancellationSchema = z.object({ cancel_at_period_end: z.literal(true) });
export const superadminSubscriptionUpdateSchema = z.object({
  plan: planSchema,
  interval: intervalSchema,
  status: subscriptionStatusSchema,
  stripe_customer_id: z.string().min(1).nullable(),
  stripe_subscription_id: z.string().min(1).nullable(),
  cancel_at_period_end: z.boolean(),
  current_period_ends_at: z.iso.datetime().nullable(),
});
export type Plan = z.infer<typeof planSchema>;
export type PaymentRowInsert = z.infer<typeof paymentInputSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type PaymentRow = Omit<Payment, 'created_at' | 'updated_at'> & { created_at: Date; updated_at: Date };
export type PaymentRowUpdate = Partial<PaymentRowInsert>;
export type SubscriptionRow = {
  id: string;
  account_id: string;
  plan: Plan;
  interval: 'month' | 'year';
  status: z.infer<typeof subscriptionStatusSchema>;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  cancel_at_period_end: boolean;
  current_period_ends_at: Date | null;
  created_at: Date;
  updated_at: Date;
};
