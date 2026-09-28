import type { Hono } from 'hono';
import { AppError, registerRoute } from 'nano-fw/docs/index.ts';
import z from 'nano-fw/zod.ts';
import { AnySchema } from 'types/common.ts';
import {
  DomainDeleteResponseSchema,
  DomainIdRequestSchema,
  DomainListRequestSchema,
  DomainListResponseSchema,
  DomainResetResponseSchema,
  DomainSchema,
  DomainShareCreateRequestSchema,
  DomainShareIdRequestSchema,
  DomainShareResponseSchema,
  DomainUpdateRequestSchema,
} from 'types/Domain.ts';
import { asyncStorage } from '#api/asyncStorage.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import DomainService from '#api/domain/DomainService.ts';
import { auth } from '#api/middleware.ts';

export const registerDomainRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'post',
    path: '/domain/list',
    meta: { section: 'Domain', description: 'List domains.' },
    requestSchema: DomainListRequestSchema,
    responseSchema: DomainListResponseSchema,
    middlewares: [auth('user')],
    handler: async (_params) => {
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
    requestSchema: DomainUpdateRequestSchema,
    responseSchema: DomainSchema,
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
    requestSchema: DomainShareCreateRequestSchema,
    responseSchema: DomainShareResponseSchema,
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
    requestSchema: DomainShareIdRequestSchema,
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
    requestSchema: DomainIdRequestSchema,
    responseSchema: DomainResetResponseSchema,
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
    requestSchema: DomainIdRequestSchema,
    responseSchema: DomainDeleteResponseSchema,
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
    requestSchema: AnySchema,
    responseSchema: AnySchema,
    middlewares: [auth('superadmin')],
    handler: (params) => DomainRepository.getem(params),
  });
};
