import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { getRequestListener } from '@hono/node-server';
import { Hono, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { AppError, errorHandler, openapiRegistry, registerDocsRoute, registerRoute } from 'nano-fw/docs/index.ts';
import z from 'nano-fw/zod.ts';
import {
  accountDetailsSchema,
  accountSchema,
  deletionSchema,
  loginSchema,
  registrationSchema,
  siteDataSchema,
  siteSchema,
  siteSetupSchema,
  superadminAccountUpdateSchema,
  verificationSchema,
  verifiedSchema,
} from 'types/account.ts';
import { analyticsInputSchema, breakdownInputSchema, breakdownRowSchema, journeyInputSchema, journeySchema, liveSchema, overviewSchema } from 'types/analytics.ts';
import { trackEventSchema } from 'types/event.ts';
import { goalIdentitySchema, goalInputSchema, goalSchema, goalUpdateSchema } from 'types/goal.ts';
import { cancellationSchema, checkoutInputSchema, checkoutSchema, paymentSchema, subscriptionSchema, superadminSubscriptionUpdateSchema } from 'types/payment.ts';
import { AccountController, authenticatedAccount, sessionCookie } from '#api/accounts/AccountController.ts';
import { AccountRepository } from '#api/accounts/AccountRepository.ts';
import { AnalyticsController } from '#api/events/AnalyticsController.ts';
import { EventController } from '#api/events/EventController.ts';
import { PaymentController } from '#api/payments/PaymentController.ts';
import { SuperadminController, superadminSessionCookie } from '#api/superadmin/SuperadminController.ts';
import { database } from '#dao/database.ts';
import ENV from './env.ts';
import { GoalController } from './goals/GoalController.ts';

const bodyLimitBytes = 2000;
const webhookBodyLimitBytes = 65_536;
const clientIp = ({ request }: { request: IncomingMessage }) => {
  const forwarded = request.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value ? value.split(',')[0].trim() : request.socket.remoteAddress || '';
};

const handleEvent = async ({ request, response }: { request: IncomingMessage; response: ServerResponse }) => {
  const origin = request.headers.origin;
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Vary', 'Origin');
  }
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'POST');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.writeHead(204).end();
    return;
  }
  if (request.method !== 'POST') {
    response.writeHead(404).end();
    return;
  }
  const contentType = (request.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json' && contentType !== 'text/plain') {
    request.resume();
    response.writeHead(415).end();
    return;
  }
  try {
    if (Number(request.headers['content-length']) > bodyLimitBytes) {
      response.writeHead(413, { Connection: 'close' }).end();
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > bodyLimitBytes) {
        response.writeHead(413, { Connection: 'close' }).end();
        return;
      }
      chunks.push(chunk);
    }
    const status = await EventController.collect({
      body: Buffer.concat(chunks, size).toString('utf8'),
      ip: clientIp({ request }),
      userAgent: request.headers['user-agent'] || '',
      origin: request.headers.origin,
    });
    response.writeHead(status).end();
  } catch (error) {
    console.error('Event collection failed', error);
    if (!response.destroyed) response.writeHead(500).end();
  }
};

export const app = new Hono();
app.onError(errorHandler);
app.use('*', cors({ origin: (origin) => origin, credentials: true }));
const defaultBodyLimit = bodyLimit({ maxSize: bodyLimitBytes });
app.use('/*', async (c, next) => {
  if (c.req.path === '/webhook') {
    await next();
    return;
  }
  await defaultBodyLimit(c, next);
});
app.use('/webhook', bodyLimit({ maxSize: webhookBodyLimitBytes }));

const allowedOrigin: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header('origin');
  if (origin && ![ENV.WEBAPP_URL, ENV.WEBSITE_URL, ENV.API_URL, ENV.SUPERADMIN_URL].includes(origin)) throw new AppError(403, 'INVALID_ORIGIN', 'Origin is not allowed.');
  await next();
};

const rateLimit: MiddlewareHandler = async (c, next) => {
  await AccountController.rateLimit({ ip: clientIp({ request: c.env.incoming }) });
  await next();
};
const noInput = z.object({});
const superadminAccountSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  created_at: z.iso.datetime(),
  suspended_at: z.iso.datetime().nullable(),
  last_login_at: z.iso.datetime().nullable(),
  site_count: z.number(),
  detected_site_count: z.number(),
  plan: z.string().nullable(),
  account_status: z.enum(['active', 'trialing', 'inactive']),
  total_paid: z.number(),
  events: z.number(),
});
const superadminListSchema = z.object({ accounts: superadminAccountSchema.array(), page: z.number(), pages: z.number(), total: z.number() });
const superadminSiteSchema = z.object({
  id: z.uuid(),
  account_id: z.uuid(),
  email: z.email(),
  domain: z.string(),
  detected: z.boolean(),
  detected_at: z.iso.datetime().nullable(),
  created_at: z.iso.datetime(),
  events: z.number(),
  latest_event_at: z.iso.datetime().nullable(),
});
const superadminSitesSchema = z.object({ sites: superadminSiteSchema.array(), page: z.number(), pages: z.number(), total: z.number() });
const superadminPaymentSchema = z.object({
  id: z.uuid(),
  account_id: z.uuid().nullable(),
  email: z.email().nullable(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  created_at: z.iso.datetime(),
});
const superadminPaymentsSchema = z.object({ payments: superadminPaymentSchema.array(), page: z.number(), pages: z.number(), total: z.number() });
const actionSchema = z.object({ updated: z.boolean() });
const superadminLoginSchema = z.object({ username: z.string().min(1).max(254), password: z.string().min(1).max(254) });
const superadminAuthenticationSchema = z.object({ authenticated: z.literal(true) });
const superadminAuth: MiddlewareHandler = async (c, next) => {
  await SuperadminController.authenticated({ cookie: c.req.header('cookie') });
  await next();
};

/**
 * Routes
 */
app.get('/healthcheck', (c) => c.text('OK'));

const planPriceSchema = z.object({ name: z.enum(['start', 'grow', 'scale', 'expand']), monthly_price: z.number(), yearly_price: z.number(), valid_from: z.iso.datetime() });
registerRoute(app, {
  method: 'get',
  path: '/plans',
  meta: { section: 'Plans', description: 'List current prices for all subscription plans.' },
  requestSchema: noInput,
  responseSchema: z.array(planPriceSchema),
  handler: async () => {
    const plans = await database<{ name: 'start' | 'grow' | 'scale' | 'expand'; monthly_price: string; yearly_price: string; valid_from: Date }>('plans')
      .distinctOn('name')
      .where('valid_from', '<=', new Date())
      .orderBy([{ column: 'name' }, { column: 'valid_from', order: 'desc' }]);
    return plans.map((plan) => ({ ...plan, monthly_price: Number(plan.monthly_price), yearly_price: Number(plan.yearly_price), valid_from: plan.valid_from.toISOString() }));
  },
});

app.get('/client.js', async (c) => {
  const bundle = await readFile(new URL('../client/client.dist.js', import.meta.url), 'utf8');
  return c.body(bundle, 200, { 'Content-Type': 'text/javascript; charset=utf-8' });
});

registerRoute(app, {
  method: 'post',
  path: '/s/auth/login',
  meta: { section: 'Superadmin', description: 'Authenticate a superadmin and create a session.' },
  requestSchema: superadminLoginSchema,
  responseSchema: superadminAuthenticationSchema,
  middlewares: [allowedOrigin, rateLimit],
  handler: async (input, c) => {
    const result = await SuperadminController.login(input);
    c.header('Set-Cookie', superadminSessionCookie({ token: result.token }));
    return { authenticated: true };
  },
});

registerRoute(app, {
  method: 'get',
  path: '/s/auth/session',
  meta: { section: 'Superadmin', description: 'Check the current superadmin session.' },
  requestSchema: noInput,
  responseSchema: superadminAuthenticationSchema,
  middlewares: [superadminAuth],
  handler: async () => ({ authenticated: true }),
});

registerRoute(app, {
  method: 'post',
  path: '/s/auth/logout',
  meta: { section: 'Superadmin', description: 'End the current superadmin session.' },
  requestSchema: noInput,
  responseSchema: z.null(),
  middlewares: [superadminAuth, allowedOrigin],
  handler: async (_input, c) => {
    await SuperadminController.logout({ cookie: c.req.header('cookie') });
    c.header('Set-Cookie', superadminSessionCookie({ token: '', clear: true }));
    return null;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/s/overview',
  meta: { section: 'Superadmin', description: 'Get superadmin account, website, and payment statistics.' },
  requestSchema: noInput,
  responseSchema: z.unknown(),
  middlewares: [superadminAuth],
  handler: async () => SuperadminController.overview(),
});

registerRoute(app, {
  method: 'get',
  path: '/s/accounts',
  meta: { section: 'Superadmin', description: 'List accounts for superadmin management.' },
  requestSchema: z.object({
    query: z.string().max(254).default(''),
    page: z.coerce.number().int().min(1).default(1),
    sort: z.string().max(32).default('created_at'),
    direction: z.enum(['asc', 'desc']).default('desc'),
  }),
  responseSchema: superadminListSchema,
  middlewares: [superadminAuth],
  handler: async (input) => {
    const result = await SuperadminController.list(input);
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/s/websites',
  meta: { section: 'Superadmin', description: 'List tracked websites for superadmin management.' },
  requestSchema: z.object({
    query: z.string().max(254).default(''),
    page: z.coerce.number().int().min(1).default(1),
    sort: z.string().max(32).default('created_at'),
    direction: z.enum(['asc', 'desc']).default('desc'),
  }),
  responseSchema: superadminSitesSchema,
  middlewares: [superadminAuth],
  handler: async (input) => {
    const result = await SuperadminController.listSites(input);
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/s/payments',
  meta: { section: 'Superadmin', description: 'List payments for superadmin management.' },
  requestSchema: z.object({
    query: z.string().max(254).default(''),
    page: z.coerce.number().int().min(1).default(1),
    sort: z.string().max(32).default('created_at'),
    direction: z.enum(['asc', 'desc']).default('desc'),
  }),
  responseSchema: superadminPaymentsSchema,
  middlewares: [superadminAuth],
  handler: async (input) => {
    const result = await SuperadminController.listPayments(input);
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/billing',
  meta: { section: 'Billing', description: 'Get billing status for the authenticated account.' },
  requestSchema: noInput,
  responseSchema: subscriptionSchema,
  handler: async (_input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const stored = await AccountRepository.findById({ accountId: account.id });
    if (!stored) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
    const result = await PaymentController.billing({ accountId: account.id, trialEndsAt: stored.trial_ends_at });
    return result;
  },
});

registerRoute(app, {
  method: 'post',
  path: '/billing/checkout',
  meta: { section: 'Billing', description: 'Create a checkout session for the authenticated account.' },
  requestSchema: checkoutInputSchema,
  responseSchema: checkoutSchema,
  middlewares: [allowedOrigin],
  handler: async (input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const stored = await AccountRepository.findById({ accountId: account.id });
    if (!stored) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
    const result = await PaymentController.checkout({ accountId: account.id, email: account.email, trialEndsAt: stored.trial_ends_at, input });
    return result;
  },
});

registerRoute(app, {
  method: 'post',
  path: '/billing/cancel',
  meta: { section: 'Billing', description: 'Cancel the authenticated account subscription.' },
  requestSchema: noInput,
  responseSchema: cancellationSchema,
  middlewares: [allowedOrigin],
  handler: async (_input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await PaymentController.cancel({ accountId: account.id });
    return result;
  },
});
app.post('/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) throw new AppError(400, 'INVALID_SIGNATURE', 'Stripe signature is required.');
  await PaymentController.webhook({ body: await c.req.text(), signature });
  return c.body(null, 204);
});

registerRoute(app, {
  method: 'get',
  path: '/auth/verify',
  meta: { section: 'Authentication', description: 'Verify an account email address using a verification token.' },
  requestSchema: verificationSchema,
  responseSchema: verifiedSchema,
  handler: async (input) => {
    const result = await AccountController.verifyEmail(input);
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/s/accounts/:id',
  meta: { section: 'Superadmin', description: 'Get details for a superadmin account.' },
  requestSchema: z.object({ id: z.uuid() }),
  responseSchema: z.unknown(),
  middlewares: [superadminAuth],
  handler: async (input) => {
    const result = await SuperadminController.details({ accountId: input.id });
    return result;
  },
});
registerRoute(app, {
  method: 'get',
  path: '/s/websites/:id',
  meta: { section: 'Superadmin', description: 'Get details for a tracked website.' },
  requestSchema: z.object({ id: z.uuid() }),
  responseSchema: z.unknown(),
  middlewares: [superadminAuth],
  handler: async (input) => SuperadminController.siteDetails({ siteId: input.id }),
});
registerRoute(app, {
  method: 'patch',
  path: '/s/accounts/:id',
  meta: { section: 'Superadmin', description: 'Update a superadmin account email address.' },
  requestSchema: z.object({ id: z.uuid() }).merge(superadminAccountUpdateSchema),
  responseSchema: actionSchema,
  middlewares: [superadminAuth],
  handler: async (input, c) => SuperadminController.updateEmail({ accountId: input.id, email: input.email, ipAddress: clientIp({ request: c.env.incoming }) }),
});
registerRoute(app, {
  method: 'patch',
  path: '/s/accounts/:id/billing',
  meta: { section: 'Superadmin', description: 'Update billing settings for a superadmin account.' },
  requestSchema: z.object({ id: z.uuid() }).merge(superadminSubscriptionUpdateSchema),
  responseSchema: actionSchema,
  middlewares: [superadminAuth],
  handler: async (input, c) => {
    const { id, ...subscription } = input;
    return SuperadminController.updateSubscription({ accountId: id, subscription, ipAddress: clientIp({ request: c.env.incoming }) });
  },
});
for (const [path, operation] of [
  ['/s/accounts/:id/sessions/revoke', 'revokeSessions'],
  ['/s/accounts/:id/suspend', 'suspend'],
  ['/s/accounts/:id/reactivate', 'reactivate'],
] as const) {
  registerRoute(app, {
    method: 'post',
    path,
    meta: {
      section: 'Superadmin',
      description:
        operation === 'revokeSessions'
          ? 'Revoke all sessions for a superadmin account.'
          : operation === 'suspend'
            ? 'Suspend a superadmin account.'
            : 'Reactivate a suspended superadmin account.',
    },
    requestSchema: z.object({ id: z.uuid() }),
    responseSchema: actionSchema,
    middlewares: [superadminAuth],
    handler: async (input, c) => {
      const result = await SuperadminController[operation]({ accountId: input.id, ipAddress: clientIp({ request: c.env.incoming }) });
      return result;
    },
  });
}

registerRoute(app, {
  method: 'delete',
  path: '/s/accounts/:id',
  meta: { section: 'Superadmin', description: 'Delete a superadmin account.' },
  requestSchema: z.object({ id: z.uuid() }),
  responseSchema: deletionSchema,
  middlewares: [superadminAuth],
  handler: async (input, c) => {
    const result = await SuperadminController.delete({ accountId: input.id, ipAddress: clientIp({ request: c.env.incoming }) });
    return result;
  },
});

registerRoute(app, {
  method: 'delete',
  path: '/s/accounts/:accountId/sites/:siteId/data',
  meta: { section: 'Superadmin', description: 'Delete analytics data for an account website.' },
  requestSchema: z.object({ accountId: z.uuid(), siteId: z.uuid() }),
  responseSchema: deletionSchema,
  middlewares: [superadminAuth],
  handler: async (input, c) => {
    const result = await SuperadminController.resetSiteData({ accountId: input.accountId, siteId: input.siteId, ipAddress: clientIp({ request: c.env.incoming }) });
    return result;
  },
});

registerRoute(app, {
  method: 'post',
  path: '/auth/register',
  meta: { section: 'Authentication', description: 'Create an account and its first tracked website.' },
  requestSchema: registrationSchema,
  responseSchema: siteSetupSchema,
  middlewares: [allowedOrigin, rateLimit],
  handler: async (input, c) => {
    const result = await AccountController.register(input);
    c.header('Set-Cookie', sessionCookie({ token: result.token }));
    c.status(201);
    return result.setup;
  },
});

registerRoute(app, {
  method: 'post',
  path: '/auth/login',
  meta: { section: 'Authentication', description: 'Authenticate an account and create a session.' },
  requestSchema: loginSchema,
  responseSchema: accountSchema,
  middlewares: [allowedOrigin, rateLimit],
  handler: async (input, c) => {
    const result = await AccountController.login(input);
    c.header('Set-Cookie', sessionCookie({ token: result.token }));
    return result.account;
  },
});

registerRoute(app, {
  method: 'post',
  path: '/auth/logout',
  meta: { section: 'Authentication', description: 'End the current account session.' },
  requestSchema: noInput,
  responseSchema: z.null(),
  middlewares: [
    allowedOrigin,
    async (c, next) => {
      await next();
      if (c.res.status === 200) c.res = new Response(null, { status: 204, headers: c.res.headers });
    },
  ],
  handler: async (_input, c) => {
    const result = await AccountController.logout({ cookie: c.req.header('cookie') });
    c.header('Set-Cookie', sessionCookie({ token: '', clear: true }));
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/account',
  meta: { section: 'Account', description: 'Get details for the authenticated account.' },
  requestSchema: noInput,
  responseSchema: accountDetailsSchema,
  handler: async (_input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await AccountController.account({ account });
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/account/setup',
  meta: { section: 'Account', description: 'Get setup details for the authenticated account website.' },
  requestSchema: noInput,
  responseSchema: siteSetupSchema,
  handler: async (_input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await AccountController.setup({ account });
    return result;
  },
});

registerRoute(app, {
  method: 'post',
  path: '/sites',
  meta: { section: 'Websites', description: 'Add a tracked website to the authenticated account.' },
  requestSchema: siteSchema,
  responseSchema: siteSetupSchema,
  middlewares: [allowedOrigin],
  handler: async (input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await AccountController.addSite({ account, domain: input.domain });
    c.status(201);
    return result;
  },
});

registerRoute(app, {
  method: 'delete',
  path: '/sites/data',
  meta: { section: 'Websites', description: 'Delete analytics data for an authenticated account website.' },
  requestSchema: siteDataSchema,
  responseSchema: deletionSchema,
  middlewares: [allowedOrigin],
  handler: async (input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await AccountController.resetSiteData({ account, siteId: input.site });
    return result;
  },
});

registerRoute(app, {
  method: 'delete',
  path: '/account',
  meta: { section: 'Account', description: 'Delete the authenticated account and its data.' },
  requestSchema: noInput,
  responseSchema: deletionSchema,
  middlewares: [allowedOrigin],
  handler: async (_input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await AccountController.delete({ account });
    c.header('Set-Cookie', sessionCookie({ token: '', clear: true }));
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/analytics/overview',
  meta: { section: 'Analytics', description: 'Get analytics overview for an account website.' },
  requestSchema: analyticsInputSchema,
  responseSchema: overviewSchema,
  handler: async (input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await AnalyticsController.overview({ accountId: account.id, input });
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/payments',
  meta: { section: 'Payments', description: 'List payments for the authenticated account.' },
  requestSchema: noInput,
  responseSchema: paymentSchema.extend({ created_at: z.iso.datetime(), updated_at: z.iso.datetime() }).array(),
  handler: async (_input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await PaymentController.list({ accountId: account.id });
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/analytics/live',
  meta: { section: 'Analytics', description: 'Get live analytics for an account website.' },
  requestSchema: z.object({ site: z.string() }),
  responseSchema: liveSchema,
  handler: async (input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await AnalyticsController.live({ accountId: account.id, siteId: input.site });
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/analytics/breakdown',
  meta: { section: 'Analytics', description: 'Get analytics breakdown data for an account website.' },
  requestSchema: breakdownInputSchema,
  responseSchema: breakdownRowSchema.array(),
  handler: async (input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await AnalyticsController.breakdown({ accountId: account.id, input });
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/analytics/journeys',
  meta: { section: 'Analytics', description: 'Get visitor journeys for an account website.' },
  requestSchema: journeyInputSchema,
  responseSchema: journeySchema,
  handler: async (input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await AnalyticsController.journeys({ accountId: account.id, input });
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/goals',
  meta: { section: 'Goals', description: 'List goals for an account website.' },
  requestSchema: z.object({ site: z.uuid() }),
  responseSchema: goalSchema.array(),
  handler: async (input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await GoalController.list({ accountId: account.id, siteId: input.site });
    return result;
  },
});

registerRoute(app, {
  method: 'post',
  path: '/goals',
  meta: { section: 'Goals', description: 'Create a goal for an account website.' },
  requestSchema: goalInputSchema,
  responseSchema: goalSchema,
  middlewares: [allowedOrigin],
  handler: async (input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await GoalController.save({ accountId: account.id, input });
    c.status(201);
    return result;
  },
});

registerRoute(app, {
  method: 'patch',
  path: '/goals/:id',
  meta: { section: 'Goals', description: 'Update a goal for an account website.' },
  requestSchema: goalUpdateSchema,
  responseSchema: goalSchema,
  middlewares: [allowedOrigin],
  handler: async (input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await GoalController.save({ accountId: account.id, input, id: input.id });
    return result;
  },
});

registerRoute(app, {
  method: 'delete',
  path: '/goals/:id',
  meta: { section: 'Goals', description: 'Delete a goal from an account website.' },
  requestSchema: goalIdentitySchema,
  responseSchema: z.object({ deleted: z.boolean() }),
  middlewares: [allowedOrigin],
  handler: async (input, c) => {
    const account = await authenticatedAccount({ cookie: c.req.header('cookie') });
    const result = await GoalController.remove({ accountId: account.id, siteId: input.site, id: input.id });
    return result;
  },
});

for (const definition of openapiRegistry.definitions) {
  if (definition.type !== 'route') continue;
  const route = definition.route;
  if (route.path === '/auth/register' || route.path === '/sites' || route.path === '/goals') {
    route.responses[201] = route.responses[200];
    delete route.responses[200];
  }
  if (route.path === '/auth/logout') {
    route.responses[204] = { description: 'Session cleared. No response body.' };
    delete route.responses[200];
  }
}

openapiRegistry.registerPath({
  method: 'post',
  path: '/event',
  tags: ['Events'],
  summary: 'Collect a tracking event',
  description: 'Native HTTP handler. Maximum body size: 2000 bytes. Fields are validated manually.',
  request: { body: { required: true, content: { 'application/json': { schema: trackEventSchema }, 'text/plain': { schema: trackEventSchema } } } },
  responses: {
    204: { description: 'Event accepted. No response body.' },
    400: { description: 'Invalid event or JSON.' },
    403: { description: 'Unknown or mismatched site.' },
    413: { description: 'Body exceeds 2000 bytes.' },
    415: { description: 'Unsupported content type.' },
    500: { description: 'Event processing failed.' },
  },
});

registerDocsRoute(app, '/', fileURLToPath(new URL('../docs-assets', import.meta.url)), {
  logoUrl: 'https://app.pulsio.live/logo-light.svg',
  tagOrder: ['Authentication', 'Account', 'Websites', 'Billing', 'Payments', 'Analytics', 'Goals', 'Plans', 'Events', 'Superadmin'],
});

const honoListener = getRequestListener(app.fetch);
export const requestListener = async (request: IncomingMessage, response: ServerResponse) => {
  const pathname = (request.url || '/').split('?')[0];
  if (pathname === '/event') {
    await handleEvent({ request, response });
    return;
  }
  await honoListener(request, response);
};
