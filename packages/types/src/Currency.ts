import z from 'nano-fw/zod.ts';

const CurrencyRatesResponseSchema = z.object({
  base: z.literal('USD'),
  date: z.iso.date(),
  rates: z.record(z.string(), z.number().positive()),
});

type CurrencyRatesResponse = z.infer<typeof CurrencyRatesResponseSchema>;

export const CurrencySchemas = {
  ratesResponse: CurrencyRatesResponseSchema,
};

export namespace ICurrency {
  export type ratesResponse = CurrencyRatesResponse;
}
