import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler, registerDocsRoute } from 'nano-fw/docs/index.ts';
import { registerAnalyticsRoutes } from '#api/analytics/registerAnalyticsRoutes.ts';
import AuthService from '#api/auth/AuthService.ts';
import { registerAuthRoutes } from '#api/auth/registerAuthRoutes.ts';
import BillingService from '#api/billing/BillingService.ts';
import { registerBillingRoutes } from '#api/billing/registerBillingRoutes.ts';
import { registerCurrencyRoutes } from '#api/currency/registerCurrencyRoutes.ts';
import { registerDomainRoutes } from '#api/domain/registerDomainRoutes.ts';
import { registerEventRoutes } from '#api/event/registerEventRoutes.ts';
import { registerPlanRoutes } from '#api/plan/registerPlanRoutes.ts';
import { registerReportRoutes } from '#api/report/registerReportRoutes.ts';
import { registerUserRoutes } from '#api/user/registerUserRoutes.ts';
import { initScript } from '../scripts/init.ts';
import ENV from './env.ts';

export const app = new Hono();
app.use('*', cors({ origin: (origin) => origin, credentials: true, allowHeaders: ['Content-Type', 'X-Pulsio-Share-Token'] }));
app.onError(errorHandler);

app.get('/healthcheck', (c) => c.text('OK'));

app.post('/stripe-webhook', async (c) => {
  const payload = await c.req.text();
  const signature = c.req.header('stripe-signature');
  if (!signature) return c.json({ error: 'Missing Stripe signature.' }, 400);
  await BillingService.handleWebhook({ payload, signature });
  return c.json(true);
});

app.get('/client.js', async (c) => {
  const bundle = await readFile(new URL('../client/client.dist.js', import.meta.url), 'utf8');
  return c.body(bundle, 200, { 'Content-Type': 'text/javascript; charset=utf-8' });
});

registerAuthRoutes(app);
registerBillingRoutes(app);
registerUserRoutes(app);
registerDomainRoutes(app);
registerEventRoutes(app);
registerCurrencyRoutes(app);
registerAnalyticsRoutes(app);
registerReportRoutes(app);
registerPlanRoutes(app);

// NB: keep after registering all the application routes or docs won't be generated!
registerDocsRoute(app, '/', './docs-assets', {
  logoUrl: './logo.svg',
  tagOrder: ['Auth', 'User', 'Domain', 'Event', 'Analytics', 'Report', 'Currency', 'Plan'],
  transformOpenapiDocument: async ({ document, request }) => {
    const cookie = request.headers.get('cookie') ?? null;
    const user = cookie ? await AuthService.me({ cookie }) : null;
    if (user?.role === 'superadmin') return document as any;
    else {
      const paths = Object.fromEntries(Object.entries(document.paths).filter(([path]) => !path.startsWith('/s/')));
      return { ...document, paths } as any;
    }
  },
});

export const server = createServer(getRequestListener(app.fetch));

if (ENV.NODE_ENV !== 'test') {
  server.listen(8080, '0.0.0.0', () => console.log('Listening on port 8080'));
}

void initScript();
