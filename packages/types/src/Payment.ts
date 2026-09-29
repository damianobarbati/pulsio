import z from 'zod';

const PaymentSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  paid_at: z.iso.datetime({ offset: true }).nullable(),
  user_id: z.uuid().nullable(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']),
  provider: z.string().nullable(),
  provider_reference: z.string().nullable(),
  invoice_url: z.url().nullable(),
});
type Payment = z.infer<typeof PaymentSchema>;
const PaymentRowInsertSchema = PaymentSchema.omit({ id: true, created_at: true, updated_at: true });
type PaymentRowInsert = z.infer<typeof PaymentRowInsertSchema>;

export const PaymentSchemas = {
  payment: PaymentSchema,
  rowInsert: PaymentRowInsertSchema,
};

export namespace IPayment {
  export type payment = Payment;
  export type rowInsert = PaymentRowInsert;
}
