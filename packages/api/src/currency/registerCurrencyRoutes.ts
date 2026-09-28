import type { Hono } from 'hono';
import { registerRoute } from 'nano-fw/docs/index.ts';
import { CurrencyRatesResponseSchema } from 'types/Currency.ts';
import { AnySchema } from 'types/common.ts';
import CurrencyService from '#api/currency/CurrencyService.ts';
import { auth } from '#api/middleware.ts';

export const registerCurrencyRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'get',
    path: '/currency/rates',
    meta: { section: 'Currency', description: 'Get current USD exchange rates.' },
    requestSchema: AnySchema,
    responseSchema: CurrencyRatesResponseSchema,
    middlewares: [auth('user')],
    handler: CurrencyService.getRates,
  });
};
