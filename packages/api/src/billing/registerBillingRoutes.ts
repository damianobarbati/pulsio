import type { Hono } from 'hono';
import { registerRoute } from 'nano-fw/docs/index.ts';
import { BillingSchemas } from 'types/Billing.ts';
import { CommonSchemas } from 'types/common.ts';
import BillingService from '#api/billing/BillingService.ts';
import { auth } from '#api/middleware.ts';

export const registerBillingRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'get',
    path: '/billing/summary',
    meta: { section: 'Billing', description: 'Get current billing plan and subscription.' },
    requestSchema: CommonSchemas.any,
    responseSchema: BillingSchemas.summary,
    middlewares: [auth('user')],
    handler: () => BillingService.getSummary(),
  });

  registerRoute(app, {
    method: 'get',
    path: '/billing/payments',
    meta: { section: 'Billing', description: 'List billing payments.' },
    requestSchema: CommonSchemas.any,
    responseSchema: BillingSchemas.paymentListResponse,
    middlewares: [auth('user')],
    handler: () => BillingService.getPayments(),
  });

  registerRoute(app, {
    method: 'post',
    path: '/billing/checkout',
    meta: { section: 'Billing', description: 'Create Stripe Checkout Session.' },
    requestSchema: BillingSchemas.checkoutRequest,
    responseSchema: BillingSchemas.checkoutResponse,
    middlewares: [auth('user')],
    handler: (params) => BillingService.createCheckout(params),
  });
};
