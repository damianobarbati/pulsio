import z from 'zod';

const StripeEventSchema = z.object({
  id: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});
type StripeEvent = z.infer<typeof StripeEventSchema>;

const StripeEventRowInsertSchema = StripeEventSchema.omit({ created_at: true });
type StripeEventRowInsert = z.infer<typeof StripeEventRowInsertSchema>;

export const StripeEventSchemas = {
  row: StripeEventSchema,
  rowInsert: StripeEventRowInsertSchema,
};

export namespace IStripeEvent {
  export type row = StripeEvent;
  export type rowInsert = StripeEventRowInsert;
}
