import type { MiddlewareHandler } from 'hono';
import { AppError } from 'nano-fw/docs/index.ts';
import { asyncStorage } from '#api/asyncStorage.ts';
import AuthService from '#api/auth/AuthService.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import DomainService from '#api/domain/DomainService.ts';
import DomainShareRepository from '#api/domain/DomainShareRepository.ts';

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

    const hasAccess = role === 'user' ? user.role === 'user' || user.role === 'superadmin' : user.role === 'superadmin';
    if (!hasAccess) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');

    await asyncStorage.run({ user_id: user.id }, next);
  };

export const authOrShare: MiddlewareHandler = async (c, next) => {
  if (c.req.header('X-Pulsio-Share-Token')) {
    await shareAuth(c, next);
    return;
  }
  await auth('user')(c, next);
};

const getShare = async (token: string) => {
  if (token === 'pulsio') {
    const domain = await DomainRepository.findBy({ domain: 'pulsio.live' });
    if (!domain) return null;
    const publicShare = await DomainShareRepository.findBy({ domain_id: domain.id, label: 'Pulsio public report', revoked_at: null });
    return publicShare;
  }

  const share = await DomainShareRepository.findBy({ token_hash: DomainService.getTokenHash(token), revoked_at: null }, true);
  return share;
};

export const shareAuth: MiddlewareHandler = async (c, next) => {
  const token = c.req.header('X-Pulsio-Share-Token');
  if (!token) throw new AppError(404, 'SHARE_NOT_FOUND', 'Share link not found.');
  const share = await getShare(token);
  if (!share) throw new AppError(404, 'SHARE_NOT_FOUND', 'Share link not found.');
  await asyncStorage.run({ share_domain_id: share.domain_id }, next);
};
