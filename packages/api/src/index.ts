import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import { Hono, type MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { AppError, errorHandler, registerDocsRoute, registerRoute } from 'nano-fw/docs/index.ts';
import { AnySchema } from 'types/common.ts';
import { UserListRequestSchema, UserListResponseSchema } from 'types/User.ts';
import { AuthService } from '#api/auth/AuthService.ts';
import { AuthSchema } from '#api/auth/AuthServiceSchema.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import EventService from '#api/event/EventService.ts';
import UserRepository from '#api/user/UserRepository.ts';
import ENV from './env.ts';

setInterval(AuthService.grantSuperAdmin, 5_000);

export const app = new Hono();
app.use('*', cors({ origin: (origin) => origin, credentials: true }));
app.onError(errorHandler);

const allowedOrigin: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header('origin');
  if (origin && ![ENV.WEBAPP_URL, ENV.WEBSITE_URL, ENV.API_URL, ENV.SUPERADMIN_URL].includes(origin)) throw new AppError(403, 'INVALID_ORIGIN', 'Origin is not allowed.');
  await next();
};

const auth =
  (role: 'user' | 'superadmin'): MiddlewareHandler =>
  async (c, next) => {
    const cookie = c.req.header('cookie');
    if (!cookie) throw new AppError(401, 'NO_SESSION', 'No session cookie found.');

    const user = await AuthService.me({ cookie });
    if (!user) throw new AppError(401, 'NO_SESSION', 'No valid session cookie found.');

    if (user.role !== role) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');

    await next();
  };

app.get('/healthcheck', (c) => c.text('OK'));

app.get('/client.js', async (c) => {
  const bundle = await readFile(new URL('../client/client.dist.js', import.meta.url), 'utf8');
  return c.body(bundle, 200, { 'Content-Type': 'text/javascript; charset=utf-8' });
});

registerDocsRoute(app, '/', './docs-assets', { logoUrl: 'https://pulsio.live/logo.svg', tagOrder: ['Users'] });

registerRoute(app, {
  method: 'post',
  path: '/event',
  meta: { section: 'Event', description: 'Ingest the event.' },
  requestSchema: AnySchema,
  responseSchema: AnySchema,
  middlewares: [allowedOrigin],
  handler: async (params, c) => {
    const headers = {
      ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0].trim() || null,
      user_agent: c.req.header('user-agent') || '',
      accept_language: c.req.header('accept-language') || '',
      sec_ch_ua: c.req.header('sec-ch-ua') || '',
      sec_ch_ua_mobile: c.req.header('sec-ch-ua-mobile') || '',
      sec_ch_ua_platform: c.req.header('sec-ch-ua-platform') || '',
    };
    await EventService.ingest({ ...params, headers });
    return true;
  },
});

registerRoute(app, {
  method: 'post',
  path: '/auth/register',
  meta: { section: 'Auth', description: 'Create the user.' },
  requestSchema: AuthSchema.registerRequest,
  responseSchema: AuthSchema.registerResponse,
  middlewares: [allowedOrigin],
  handler: async (params, c) => {
    const token = await AuthService.register(params);
    const cookie = AuthService.generateCookie(token);
    c.header('Set-Cookie', cookie);
    return token;
  },
});

registerRoute(app, {
  method: 'post',
  path: '/auth/login',
  meta: { section: 'Auth', description: 'Authenticate a user and create a session.' },
  requestSchema: AuthSchema.loginRequest,
  responseSchema: AuthSchema.loginResponse,
  middlewares: [allowedOrigin],
  handler: async (params, c) => {
    const token = await AuthService.login(params);
    const cookie = AuthService.generateCookie(token);
    c.header('Set-Cookie', cookie);
    return token;
  },
});

registerRoute(app, {
  method: 'post',
  path: '/auth/logout',
  meta: { section: 'Auth', description: 'End the current user session.' },
  requestSchema: AuthSchema.logoutRequest,
  responseSchema: AuthSchema.logoutResponse,
  middlewares: [allowedOrigin],
  handler: async (_params, c) => {
    c.header('Set-Cookie', AuthService.generateCookie('', true));
    return true;
  },
});

registerRoute(app, {
  method: 'get',
  path: '/auth/me',
  meta: { section: 'Auth', description: 'Get details for the authenticated user.' },
  requestSchema: AuthSchema.meRequest,
  responseSchema: AuthSchema.meResponse,
  handler: async (_params, c) => {
    const cookie = c.req.header('cookie');
    if (!cookie) throw new AppError(401, 'NO_SESSION', 'No session cookie found.');
    const user = await AuthService.me({ cookie });
    const { password_hash: _password_hash, email_verification_token_hash: _email_verification_token_hash, ...result } = user;
    return result;
  },
});

registerRoute(app, {
  method: 'post',
  path: '/s/user/list',
  meta: { section: 'User', description: 'List users.' },
  requestSchema: UserListRequestSchema,
  responseSchema: UserListResponseSchema,
  middlewares: [auth('superadmin')],
  handler: (params) => UserRepository.getem(params),
});

registerRoute(app, {
  method: 'post',
  path: '/s/domain/list',
  meta: { section: 'Domain', description: 'List domains.' },
  requestSchema: AnySchema,
  responseSchema: AnySchema,
  middlewares: [auth('superadmin')],
  handler: (params) => DomainRepository.getem(params),
});

export const server = createServer(getRequestListener(app.fetch));

if (ENV.NODE_ENV !== 'test') {
  server.listen(8080, '0.0.0.0', () => console.log('Listening on port 8080'));
}
