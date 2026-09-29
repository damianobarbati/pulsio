import z from 'zod';

const SubscriptionPlanSchema = z.string().trim().min(1);
type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

const SubscriptionRecurrenceSchema = z.enum(['month', 'year']);
type SubscriptionRecurrence = z.infer<typeof SubscriptionRecurrenceSchema>;

const SubscriptionStatusSchema = z.enum(['active', 'canceled']);
type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

const SubscriptionRowSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  user_id: z.uuid(),
  plan: SubscriptionPlanSchema,
  recurrence: SubscriptionRecurrenceSchema,
  status: SubscriptionStatusSchema,
  stripe_subscription_id: z.string().min(1).max(255).nullable(),
  cancel_at_period_end: z.boolean(),
  current_period_ends_at: z.iso.datetime({ offset: true }).nullable(),
});
type SubscriptionRow = z.infer<typeof SubscriptionRowSchema>;
type Subscription = SubscriptionRow;

const systemKeys = { id: true, created_at: true, updated_at: true } as const;

const SubscriptionRowInsertSchema = SubscriptionRowSchema.omit(systemKeys).partial({
  stripe_subscription_id: true,
  cancel_at_period_end: true,
  current_period_ends_at: true,
});
type SubscriptionRowInsert = z.infer<typeof SubscriptionRowInsertSchema>;

const SubscriptionRowUpdateSchema = SubscriptionRowSchema.omit(systemKeys).partial();
type SubscriptionRowUpdate = z.infer<typeof SubscriptionRowUpdateSchema>;

export const SubscriptionSchemas = {
  plan: SubscriptionPlanSchema,
  recurrence: SubscriptionRecurrenceSchema,
  status: SubscriptionStatusSchema,
  row: SubscriptionRowSchema,
  rowInsert: SubscriptionRowInsertSchema,
  rowUpdate: SubscriptionRowUpdateSchema,
};

export namespace ISubscription {
  export type plan = SubscriptionPlan;
  export type recurrence = SubscriptionRecurrence;
  export type status = SubscriptionStatus;
  export type row = SubscriptionRow;
  export type subscription = Subscription;
  export type rowInsert = SubscriptionRowInsert;
  export type rowUpdate = SubscriptionRowUpdate;
}
