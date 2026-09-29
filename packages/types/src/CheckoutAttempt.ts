import z from 'zod';

const CheckoutAttemptRowSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  user_id: z.uuid(),
  plan: z.string().min(1),
  recurrence: z.enum(['month', 'year']),
  stripe_session_id: z.string().nullable(),
  url: z.url().nullable(),
  expires_at: z.iso.datetime({ offset: true }).nullable(),
  completed_at: z.iso.datetime({ offset: true }).nullable(),
});
type CheckoutAttemptRow = z.infer<typeof CheckoutAttemptRowSchema>;

const CheckoutAttemptRowInsertSchema = CheckoutAttemptRowSchema.omit({ id: true, created_at: true, updated_at: true }).partial({
  stripe_session_id: true,
  url: true,
  expires_at: true,
  completed_at: true,
});
type CheckoutAttemptRowInsert = z.infer<typeof CheckoutAttemptRowInsertSchema>;

export const CheckoutAttemptSchemas = {
  row: CheckoutAttemptRowSchema,
  rowInsert: CheckoutAttemptRowInsertSchema,
};

export namespace ICheckoutAttempt {
  export type row = CheckoutAttemptRow;
  export type checkoutAttempt = CheckoutAttemptRow;
  export type rowInsert = CheckoutAttemptRowInsert;
}
