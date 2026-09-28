import z from 'nano-fw/zod.ts';
import type { CurrencyRatesResponse } from 'types/Currency.ts';

type Rates = Record<string, number>;

const RatesSchema = z.object({ rates: z.record(z.string(), z.number().positive()) });

const getToday = () => new Date().toISOString().slice(0, 10);

export default class CurrencyService {
  private static cachedDate = '';
  private static ratesPromise: Promise<Rates> | null = null;

  private static async fetchRates({ date }: { date: string }): Promise<Rates> {
    const response = await fetch(`https://api.frankfurter.dev/v1/${date}?base=USD`);

    if (!response.ok) throw new Error('CurrencyService.fetchRates failed.');

    const data = RatesSchema.parse(await response.json());
    return data.rates;
  }

  static async getRates(): Promise<CurrencyRatesResponse> {
    const date = getToday();

    if (CurrencyService.cachedDate !== date || !CurrencyService.ratesPromise) {
      CurrencyService.cachedDate = date;
      CurrencyService.ratesPromise = CurrencyService.fetchRates({ date });
    }

    let rates: Rates;

    try {
      rates = await CurrencyService.ratesPromise;
    } catch (error) {
      CurrencyService.ratesPromise = null;
      throw error;
    }

    return { base: 'USD', date, rates: { USD: 1, ...rates } };
  }

  static async getUSDRate(currency: string): Promise<number> {
    if (currency === 'USD') return 1;

    const { rates } = await CurrencyService.getRates();
    const currencyRate = rates[currency];

    if (!currencyRate) throw new Error(`No USD exchange rate for ${currency}.`);

    return 1 / currencyRate;
  }
}
