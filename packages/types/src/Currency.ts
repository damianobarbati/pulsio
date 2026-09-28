import z from 'nano-fw/zod.ts';

export const CurrencyRatesResponseSchema = z.object({
  base: z.literal('USD'),
  date: z.iso.date(),
  rates: z.record(z.string(), z.number().positive()),
});

export type CurrencyRatesResponse = z.infer<typeof CurrencyRatesResponseSchema>;
