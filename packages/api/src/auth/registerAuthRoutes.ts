import type { Hono } from 'hono';
import { AppError, registerRoute } from 'nano-fw/docs/index.ts';
import { AuthService } from '#api/auth/AuthService.ts';
import { AuthSchema } from '#api/auth/AuthServiceSchema.ts';

export const registerAuthRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'post',
    path: '/auth/register',
    meta: { section: 'Auth', description: 'Create the user.' },
    requestSchema: AuthSchema.registerRequest,
    responseSchema: AuthSchema.registerResponse,
    middlewares: [],
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
    middlewares: [],
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
    middlewares: [],
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
};
