import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { getRequestListener } from '@hono/node-server';
import { Hono, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { AppError, errorHandler, openapiRegistry, registerDocsRoute, registerRoute } from 'nano-fw/docs/index.ts';
import z from 'nano-fw/zod.ts';
import { AccountController, authenticatedAccount, sessionCookie } from '#api/accounts/AccountController.ts';
import { AccountRepository } from '#api/accounts/AccountRepository.ts';
import { AnalyticsController } from '#api/events/AnalyticsController.ts';
import { EventController } from '#api/events/EventController.ts';
import { PaymentController } from '#api/payments/PaymentController.ts';
import { SuperadminController } from '#api/superadmin/SuperadminController.ts';
import {
  accountDetailsSchema,
  accountSchema,
  deletionSchema,
  loginSchema,
  registrationSchema,
  siteDataSchema,
  siteSchema,
  siteSetupSchema,
  verificationSchema,
  verifiedSchema,
} from '../../types/src/account.ts';
import { analyticsInputSchema, breakdownInputSchema, breakdownRowSchema, journeyInputSchema, journeySchema, liveSchema, overviewSchema } from '../../types/src/analytics.ts';
import { trackEventSchema } from '../../types/src/event.ts';
import { goalIdentitySchema, goalInputSchema, goalSchema, goalUpdateSchema } from '../../types/src/goal.ts';
import { cancellationSchema, checkoutInputSchema, checkoutSchema, paymentSchema, subscriptionSchema } from '../../types/src/payment.ts';
import ENV from './env.ts';
import { GoalController } from './goals/GoalController.ts';

const bodyLimitBytes = 2000;
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
    const status = await EventController.collect({ body: Buffer.concat(chunks, size).toString('utf8'), ip: clientIp({ request }), userAgent: request.headers['user-agent'] || '' });
    response.writeHead(status).end();
  } catch (error) {
    console.error('Event collection failed', error);
    if (!response.destroyed) response.writeHead(500).end();
  }
};

export const app = new Hono();
app.onError(errorHandler);
app.use('*', cors({ origin: (origin) => origin, credentials: true }));
app.use('/*', bodyLimit({ maxSize: bodyLimitBytes }));

const allowedOrigin: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header('origin');
  if (origin && ![ENV.WEBAPP_URL, ENV.WEBSITE_URL, ENV.API_URL].includes(origin)) throw new AppError(403, 'INVALID_ORIGIN', 'Origin is not allowed.');
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
  site_count: z.number(),
  detected_site_count: z.number(),
});
const superadminListSchema = z.object({ accounts: superadminAccountSchema.array(), page: z.number(), pages: z.number(), total: z.number() });
const actionSchema = z.object({ updated: z.boolean() });
const superadminAuth: MiddlewareHandler = async (c, next) => {
  const authorization = c.req.header('authorization') || '';
  const expected = Buffer.from(`${ENV.SUPERADMIN_USERNAME}:${ENV.SUPERADMIN_PASSWORD}`).toString('base64');
  if (authorization !== `Basic ${expected}`) {
    c.header('WWW-Authenticate', 'Basic realm="Pulsio Superadmin", charset="UTF-8"');
    return c.text('Superadmin credentials are required.', 401);
  }
  await next();
};

/**
 * Routes
 */
app.get('/healthcheck', (c) => c.text('OK'));

app.get('/client.js', async (c) => {
  const bundle = await readFile(new URL('../client/client.dist.js', import.meta.url), 'utf8');
  return c.body(bundle, 200, { 'Content-Type': 'text/javascript; charset=utf-8' });
});

registerRoute(app, {
  method: 'get',
  path: '/superadmin/accounts',
  requestSchema: z.object({ query: z.string().max(254).default(''), page: z.coerce.number().int().min(1).default(1) }),
  responseSchema: superadminListSchema,
  middlewares: [superadminAuth],
  handler: async (input) => {
    const result = await SuperadminController.list(input);
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/billing',
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
  requestSchema: verificationSchema,
  responseSchema: verifiedSchema,
  handler: async (input) => {
    const result = await AccountController.verifyEmail(input);
    return result;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/superadmin/accounts/:id',
  requestSchema: z.object({ id: z.uuid() }),
  responseSchema: z.unknown(),
  middlewares: [superadminAuth],
  handler: async (input) => {
    const result = await SuperadminController.details({ accountId: input.id });
    return result;
  },
});
for (const [path, operation] of [
  ['/superadmin/accounts/:id/sessions/revoke', 'revokeSessions'],
  ['/superadmin/accounts/:id/suspend', 'suspend'],
  ['/superadmin/accounts/:id/reactivate', 'reactivate'],
] as const) {
  registerRoute(app, {
    method: 'post',
    path,
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
  path: '/superadmin/accounts/:id',
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
  path: '/superadmin/accounts/:accountId/sites/:siteId/data',
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

registerDocsRoute(app, '/', fileURLToPath(new URL('../', import.meta.url)));

// app.use('*', serveStatic({ root: fileURLToPath(new URL('../dist', import.meta.url)) }));

const honoListener = getRequestListener(app.fetch);
export const requestListener = async (request: IncomingMessage, response: ServerResponse) => {
  const pathname = (request.url || '/').split('?')[0];
  if (pathname === '/event') {
    await handleEvent({ request, response });
    return;
  }
  await honoListener(request, response);
};
