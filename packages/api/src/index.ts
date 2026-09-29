import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler, registerDocsRoute } from 'nano-fw/docs/index.ts';
import { registerAnalyticsRoutes } from '#api/analytics/registerAnalyticsRoutes.ts';
import { AuthService } from '#api/auth/AuthService.ts';
import { registerAuthRoutes } from '#api/auth/registerAuthRoutes.ts';
import { registerCurrencyRoutes } from '#api/currency/registerCurrencyRoutes.ts';
import { registerDomainRoutes } from '#api/domain/registerDomainRoutes.ts';
import { registerEventRoutes } from '#api/event/registerEventRoutes.ts';
import { registerPlanRoutes } from '#api/plan/registerPlanRoutes.ts';
import { registerReportRoutes } from '#api/report/registerReportRoutes.ts';
import { registerUserRoutes } from '#api/user/registerUserRoutes.ts';
import ENV from './env.ts';

setInterval(AuthService.grantSuperAdmin, 5_000);

export const app = new Hono();
app.use('*', cors({ origin: (origin) => origin, credentials: true }));
app.onError(errorHandler);

app.get('/healthcheck', (c) => c.text('OK'));

app.get('/client.js', async (c) => {
  const bundle = await readFile(new URL('../client/client.dist.js', import.meta.url), 'utf8');
  return c.body(bundle, 200, { 'Content-Type': 'text/javascript; charset=utf-8' });
});

registerAuthRoutes(app);
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
