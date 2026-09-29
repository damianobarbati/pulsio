import z from 'zod';

export const PlanRowSchema = z.object({
  id: z.uuid(),
  name: z.enum(['start', 'grow', 'scale', 'expand']),
  monthly_price: z.number().nonnegative(),
  yearly_price: z.number().nonnegative(),
  valid_from: z.iso.datetime({ offset: true }),
  description: z.string(),
  features: z.array(z.string()),
});
export type PlanRow = z.infer<typeof PlanRowSchema>;
export type Plan = PlanRow;

export const PlanListResponseSchema = z.array(PlanRowSchema);
export type PlanListResponse = z.infer<typeof PlanListResponseSchema>;
