import type { Hono } from 'hono';
import { registerRoute } from 'nano-fw/docs/index.ts';
import { CurrencySchemas } from 'types/Currency.ts';
import { CommonSchemas } from 'types/common.ts';
import CurrencyService from '#api/currency/CurrencyService.ts';
import { auth } from '#api/middleware.ts';

export const registerCurrencyRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'get',
    path: '/currency/rates',
    meta: { section: 'Currency', description: 'Get current USD exchange rates.' },
    requestSchema: CommonSchemas.any,
    responseSchema: CurrencySchemas.ratesResponse,
    middlewares: [auth('user')],
    handler: CurrencyService.getRates,
  });
};
