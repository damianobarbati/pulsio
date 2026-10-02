import type { Hono, MiddlewareHandler } from 'hono';
import { registerRoute } from 'nano-fw/docs/index.ts';
import z from 'nano-fw/zod.ts';
import { CommonSchemas } from 'types/common.ts';
import EventService, { randomUUIDv7 } from '#api/event/EventService.ts';

const MAX_EVENT_BODY_BYTES = 64_000;

const eventBodyLimit: MiddlewareHandler = async (c, next) => {
  const contentLength = Number(c.req.header('content-length') || 0);
  if (contentLength > MAX_EVENT_BODY_BYTES) {
    return c.json(randomUUIDv7());
  }
  await next();
};

export const registerEventRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'post',
    path: '/event',
    meta: { section: 'Event', description: 'Ingest the event.' },
    requestSchema: CommonSchemas.any,
    responseSchema: z.uuid(),
    middlewares: [eventBodyLimit],
    handler: async (params, c) => {
      const headers = {
        ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0].trim() || null,
        user_agent: c.req.header('user-agent') || '',
        accept_language: c.req.header('accept-language') || '',
        sec_ch_ua: c.req.header('sec-ch-ua') || '',
        sec_ch_ua_mobile: c.req.header('sec-ch-ua-mobile') || '',
        sec_ch_ua_platform: c.req.header('sec-ch-ua-platform') || '',
      };
      const event_id = await EventService.ingest({ ...params, headers });
      return event_id;
    },
  });
};
