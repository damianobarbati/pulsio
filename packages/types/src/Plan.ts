import z from 'zod';

const PlanRowSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  max_domains: z.coerce.number().int().nonnegative(),
  max_events: z.coerce.number().int().nonnegative(),
  monthly_price: z.number().nonnegative(),
  yearly_price: z.number().nonnegative(),
  valid_from: z.iso.datetime({ offset: true }),
  description: z.string(),
  features: z.array(z.string()),
});
type PlanRow = z.infer<typeof PlanRowSchema>;
type Plan = PlanRow;

const PlanListResponseSchema = z.array(PlanRowSchema);
type PlanListResponse = z.infer<typeof PlanListResponseSchema>;

export const PlanSchemas = {
  row: PlanRowSchema,
  listResponse: PlanListResponseSchema,
};

export namespace IPlan {
  export type row = PlanRow;
  export type plan = Plan;
  export type listResponse = PlanListResponse;
}
