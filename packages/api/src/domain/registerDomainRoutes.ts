import type { Hono } from 'hono';
import { AppError, registerRoute } from 'nano-fw/docs/index.ts';
import z from 'nano-fw/zod.ts';
import { CommonSchemas } from 'types/common.ts';
import { DomainSchemas } from 'types/Domain.ts';
import { asyncStorage } from '#api/asyncStorage.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import DomainService from '#api/domain/DomainService.ts';
import { auth, authOrShare } from '#api/middleware.ts';

export const registerDomainRoutes = (app: Hono) => {
  app.get('/domain/:domainId/export', auth('user'), async (c) => {
    const user_id = asyncStorage.getStore()?.user_id;
    const domainId = c.req.param('domainId');
    if (!user_id) return c.json({ code: 'FORBIDDEN', message: 'This account cannot access this resource.' }, 403);
    const result = await DomainService.exportEvents({ domainId, user_id });
    return c.body(result.csv, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.domain}-events.csv"`,
    });
  });

  registerRoute(app, {
    method: 'post',
    path: '/domain',
    meta: { section: 'Domain', description: 'Create a domain.' },
    requestSchema: DomainSchemas.createRequest,
    responseSchema: DomainSchemas.domain,
    middlewares: [auth('user')],
    handler: async (params) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');
      const result = await DomainService.create({ ...params, user_id });
      return result;
    },
  });

  registerRoute(app, {
    method: 'post',
    path: '/domain/list',
    meta: { section: 'Domain', description: 'List domains.' },
    requestSchema: DomainSchemas.listRequest,
    responseSchema: DomainSchemas.listResponse,
    middlewares: [authOrShare],
    handler: async (_params) => {
      const share_domain_id = asyncStorage.getStore()?.share_domain_id;
      if (share_domain_id) {
        const domain = await DomainRepository.get(share_domain_id);
        return domain ? [domain] : [];
      }
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');
      const result = await DomainService.list({ user_id });
      return result;
    },
  });

  registerRoute(app, {
    method: 'put',
    path: '/domain/:domainId',
    meta: { section: 'Domain', description: 'Update domain currency and reporting settings.' },
    requestSchema: DomainSchemas.updateRequest,
    responseSchema: DomainSchemas.domain,
    middlewares: [auth('user')],
    handler: async (params) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');
      const result = await DomainService.update({ ...params, user_id });
      return result;
    },
  });

  registerRoute(app, {
    method: 'post',
    path: '/domain/:domainId/share',
    meta: { section: 'Domain', description: 'Create a share link for a domain.' },
    requestSchema: DomainSchemas.shareCreateRequest,
    responseSchema: DomainSchemas.shareResponse,
    middlewares: [auth('user')],
    handler: async (params) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');
      const result = await DomainService.createShare({ ...params, user_id });
      return result;
    },
  });

  registerRoute(app, {
    method: 'delete',
    path: '/domain/:domainId/share/:shareId',
    meta: { section: 'Domain', description: 'Revoke a domain share link.' },
    requestSchema: DomainSchemas.shareIdRequest,
    responseSchema: z.literal(true),
    middlewares: [auth('user')],
    handler: async (params) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');
      const result = await DomainService.revokeShare({ ...params, user_id });
      return result;
    },
  });

  registerRoute(app, {
    method: 'post',
    path: '/domain/:domainId/reset',
    meta: { section: 'Domain', description: 'Delete all events tracked for a domain.' },
    requestSchema: DomainSchemas.idRequest,
    responseSchema: DomainSchemas.resetResponse,
    middlewares: [auth('user')],
    handler: async (params) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');
      const result = await DomainService.reset({ ...params, user_id });
      return result;
    },
  });

  registerRoute(app, {
    method: 'delete',
    path: '/domain/:domainId',
    meta: { section: 'Domain', description: 'Delete a domain and associated data.' },
    requestSchema: DomainSchemas.idRequest,
    responseSchema: DomainSchemas.deleteResponse,
    middlewares: [auth('user')],
    handler: async (params) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');
      const result = await DomainService.remove({ ...params, user_id });
      return result;
    },
  });

  registerRoute(app, {
    method: 'post',
    path: '/s/domain/list',
    meta: { section: 'Domain', description: 'List domains.' },
    requestSchema: CommonSchemas.any,
    responseSchema: CommonSchemas.any,
    middlewares: [auth('superadmin')],
    handler: (params) => DomainRepository.getem(params),
  });

  registerRoute(app, {
    method: 'delete',
    path: '/s/domain/:domainId',
    meta: { section: 'Domain', description: 'Delete a domain and associated data as superadmin.' },
    requestSchema: DomainSchemas.idRequest,
    responseSchema: DomainSchemas.deleteResponse,
    middlewares: [auth('superadmin')],
    handler: DomainService.removeForSuperadmin,
  });
};
