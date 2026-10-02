import type { Hono, MiddlewareHandler } from 'hono';
import { registerRoute } from 'nano-fw/docs/index.ts';
import { ContactSchemas } from 'types/Contact.ts';
import { cache } from '#dao/cache.ts';
import ContactService from './ContactService.ts';

const RATE_LIMIT_SECONDS = 60;
const RATE_LIMIT_KEY_PREFIX = 'contact-rate-limit';

const getClientIp = (header: (name: string) => string | undefined) => header('cf-connecting-ip') || header('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

const contactRateLimit: MiddlewareHandler = async (c, next) => {
  const ip = getClientIp(c.req.header.bind(c.req));
  const userAgent = c.req.header('user-agent') || 'unknown';
  const key = `${RATE_LIMIT_KEY_PREFIX}:${ip}:${userAgent}`;
  const allowed = await cache.set(key, '1', 'EX', RATE_LIMIT_SECONDS, 'NX');

  if (!allowed) {
    c.header('Retry-After', String(RATE_LIMIT_SECONDS));
    return c.json({ message: 'Please wait before sending another message.' }, 429);
  }

  await next();
};

export const registerContactRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'post',
    path: '/contact',
    meta: { section: 'Contact', description: 'Send a contact message.' },
    requestSchema: ContactSchemas.request,
    responseSchema: ContactSchemas.response,
    middlewares: [contactRateLimit],
    handler: ContactService.send,
  });
};
