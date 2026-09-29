import type { Hono } from 'hono';
import { registerRoute } from 'nano-fw/docs/index.ts';
import { CommonSchemas } from 'types/common.ts';
import EventService from '#api/event/EventService.ts';

export const registerEventRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'post',
    path: '/event',
    meta: { section: 'Event', description: 'Ingest the event.' },
    requestSchema: CommonSchemas.any,
    responseSchema: CommonSchemas.any,
    middlewares: [],
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
};
