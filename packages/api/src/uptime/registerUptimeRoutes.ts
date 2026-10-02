import type { Hono } from 'hono';
import { AppError, registerRoute } from 'nano-fw/docs/index.ts';
import { UptimeSchemas } from 'types/Uptime.ts';
import { asyncStorage } from '#api/asyncStorage.ts';
import { auth } from '#api/middleware.ts';
import UptimeService from '#api/uptime/UptimeService.ts';

const userId = () => {
  const value = asyncStorage.getStore()?.user_id;
  if (!value) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');
  return value;
};
export const registerUptimeRoutes = (app: Hono) => {
  app.get('/status/:slug', async (c) => {
    const range = c.req.query('range');
    const days = range === '365' ? 365 : 90;
    try {
      return c.json(await UptimeService.getPublicStatus({ slug: c.req.param('slug'), days }));
    } catch (error) {
      if (error instanceof AppError) return c.json({ code: error.code, message: error.message }, error.status as 404);
      throw error;
    }
  });
  registerRoute(app, {
    method: 'get',
    path: '/uptime/usage',
    meta: { section: 'Uptime', description: 'Get current uptime monitor usage and plan limit.' },
    requestSchema: UptimeSchemas.groupCreate.partial(),
    responseSchema: UptimeSchemas.usage,
    middlewares: [auth('user')],
    handler: () => UptimeService.getUsage({ user_id: userId() }),
  });
  registerRoute(app, {
    method: 'post',
    path: '/uptime/group',
    meta: { section: 'Uptime', description: 'Create an uptime group.' },
    requestSchema: UptimeSchemas.groupCreate,
    responseSchema: UptimeSchemas.group,
    middlewares: [auth('user')],
    handler: (params) => UptimeService.createGroup({ ...params, user_id: userId() }),
  });
  registerRoute(app, {
    method: 'post',
    path: '/uptime/group/list',
    meta: { section: 'Uptime', description: 'List uptime groups.' },
    requestSchema: UptimeSchemas.groupCreate.partial(),
    responseSchema: UptimeSchemas.groupList,
    middlewares: [auth('user')],
    handler: () => UptimeService.listGroups({ user_id: userId() }),
  });
  registerRoute(app, {
    method: 'put',
    path: '/uptime/group/:groupId/public',
    meta: { section: 'Uptime', description: 'Set uptime group publication.' },
    requestSchema: UptimeSchemas.public,
    responseSchema: UptimeSchemas.group,
    middlewares: [auth('user')],
    handler: (params) => UptimeService.setPublic({ ...params, user_id: userId() }),
  });
  registerRoute(app, {
    method: 'delete',
    path: '/uptime/group/:groupId',
    meta: { section: 'Uptime', description: 'Delete an uptime group.' },
    requestSchema: UptimeSchemas.groupId,
    responseSchema: UptimeSchemas.deleted,
    middlewares: [auth('user')],
    handler: (params) => UptimeService.removeGroup({ ...params, user_id: userId() }),
  });
  registerRoute(app, {
    method: 'post',
    path: '/uptime/monitor',
    meta: { section: 'Uptime', description: 'Create an uptime monitor.' },
    requestSchema: UptimeSchemas.monitorCreate,
    responseSchema: UptimeSchemas.monitor,
    middlewares: [auth('user')],
    handler: (params) => UptimeService.createMonitor({ ...params, user_id: userId() }),
  });
  registerRoute(app, {
    method: 'post',
    path: '/uptime/group/:groupId/monitor/list',
    meta: { section: 'Uptime', description: 'List group monitors.' },
    requestSchema: UptimeSchemas.groupId,
    responseSchema: UptimeSchemas.monitorList,
    middlewares: [auth('user')],
    handler: (params) => UptimeService.listMonitors({ ...params, user_id: userId() }),
  });
  registerRoute(app, {
    method: 'put',
    path: '/uptime/monitor/:monitorId/enabled',
    meta: { section: 'Uptime', description: 'Set monitor enabled state.' },
    requestSchema: UptimeSchemas.enabled,
    responseSchema: UptimeSchemas.monitor,
    middlewares: [auth('user')],
    handler: (params) => UptimeService.setEnabled({ ...params, user_id: userId() }),
  });
  registerRoute(app, {
    method: 'delete',
    path: '/uptime/monitor/:monitorId',
    meta: { section: 'Uptime', description: 'Delete an uptime monitor.' },
    requestSchema: UptimeSchemas.monitorId,
    responseSchema: UptimeSchemas.deleted,
    middlewares: [auth('user')],
    handler: (params) => UptimeService.removeMonitor({ ...params, user_id: userId() }),
  });
};
