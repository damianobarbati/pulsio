import type { MiddlewareHandler } from 'hono';
import { AppError } from 'nano-fw/docs/index.ts';
import { asyncStorage } from '#api/asyncStorage.ts';
import { AuthService } from '#api/auth/AuthService.ts';

export const allowedOrigin: MiddlewareHandler = async (_c, next) => {
  // const origin = c.req.header('origin');
  // if (origin && ![ENV.WEBAPP_URL, ENV.WEBSITE_URL, ENV.API_URL, ENV.SUPERADMIN_URL].includes(origin)) throw new AppError(403, 'INVALID_ORIGIN', 'Origin is not allowed.');
  await next();
};

export const auth =
  (role: 'user' | 'superadmin'): MiddlewareHandler =>
  async (c, next) => {
    const cookie = c.req.header('cookie');
    if (!cookie) throw new AppError(401, 'NO_SESSION', 'No session cookie found.');

    const user = await AuthService.me({ cookie });
    if (!user) throw new AppError(401, 'NO_SESSION', 'No valid session cookie found.');

    if (user.role !== role) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');

    await asyncStorage.run({ user_id: user.id }, next);
  };
