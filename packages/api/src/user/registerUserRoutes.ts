import type { Hono } from 'hono';
import { AppError, registerRoute } from 'nano-fw/docs/index.ts';
import z from 'nano-fw/zod.ts';
import { CommonSchemas } from 'types/common.ts';
import { UserSchemas } from 'types/User.ts';
import { asyncStorage } from '#api/asyncStorage.ts';
import AuthService from '#api/auth/AuthService.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import { auth, authOrShare } from '#api/middleware.ts';
import UserImageRepository from '#api/user/UserImageRepository.ts';
import UserRepository from '#api/user/UserRepository.ts';
import UserService from '#api/user/UserService.ts';

const MAX_LOGO_SIZE = 5_000_000;

const getBrandUserId = async () => {
  const storage = asyncStorage.getStore();
  if (storage?.user_id) return storage.user_id;
  if (!storage?.share_domain_id) throw new AppError(401, 'UNAUTHORIZED', 'User not logged in.');

  const domain = await DomainRepository.get(storage.share_domain_id);
  if (!domain) throw new AppError(404, 'DOMAIN_NOT_FOUND', 'Domain not found.');
  return domain.user_id;
};

export const registerUserRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'get',
    path: '/user/brand',
    meta: { section: 'User', description: 'Get dashboard branding.' },
    requestSchema: CommonSchemas.any,
    responseSchema: UserSchemas.brandResponse,
    middlewares: [authOrShare],
    handler: async () => {
      const user_id = await getBrandUserId();
      const result = await UserService.getBrand({ user_id });
      return result;
    },
  });

  registerRoute(app, {
    method: 'post',
    path: '/user/update-settings',
    meta: { section: 'User', description: 'Update authenticated user settings.' },
    requestSchema: UserSchemas.settingsUpdateRequest,
    responseSchema: UserSchemas.accountResponse,
    middlewares: [auth('user')],
    handler: async (params) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(401, 'UNAUTHORIZED', 'User not logged in.');
      const result = await UserService.updateSettings({ ...params, user_id });
      return result;
    },
  });

  registerRoute(app, {
    method: 'post',
    path: '/user/update-brand',
    meta: { section: 'User', description: 'Update the authenticated user branding settings.' },
    requestSchema: UserSchemas.brandUpdateRequest,
    responseSchema: UserSchemas.accountResponse,
    middlewares: [auth('user')],
    handler: async (params) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(401, 'UNAUTHORIZED', 'User not logged in.');
      const result = await UserService.updateBrand({ ...params, user_id });
      return result;
    },
  });

  app.post('/user/logo', auth('user'), async (c) => {
    const user_id = asyncStorage.getStore()?.user_id;
    if (!user_id) throw new AppError(401, 'UNAUTHORIZED', 'User not logged in.');

    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) throw new AppError(400, 'INVALID_LOGO', 'A PNG logo file is required.');
    if (file.type !== 'image/png') throw new AppError(400, 'INVALID_LOGO', 'Logo must be a PNG image.');
    if (file.size === 0 || file.size > MAX_LOGO_SIZE) throw new AppError(400, 'INVALID_LOGO', 'Logo must be smaller than 5 MB.');

    const data = Buffer.from(await file.arrayBuffer());
    await UserImageRepository.upsert({ user_id, data });
    return c.json(true);
  });

  app.get('/user/logo', authOrShare, async (c) => {
    const user_id = await getBrandUserId();

    const image = await UserImageRepository.findBy({ user_id }, true);
    if (!image) return c.body(null, 404);
    return c.body(image.data as unknown as ArrayBuffer, 200, {
      'Cache-Control': 'private, max-age=3600',
      'Content-Type': 'image/png',
    });
  });

  registerRoute(app, {
    method: 'post',
    path: '/user/change-email',
    meta: { section: 'User', description: 'Change the authenticated user email address.' },
    requestSchema: UserSchemas.changeEmailRequest,
    responseSchema: UserSchemas.accountResponse,
    middlewares: [auth('user')],
    handler: (params) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(401, 'UNAUTHORIZED', 'User not logged in.');
      return UserService.changeEmail({ ...params, user_id });
    },
  });

  registerRoute(app, {
    method: 'post',
    path: '/user/change-password',
    meta: { section: 'User', description: 'Change the authenticated user password.' },
    requestSchema: UserSchemas.changePasswordRequest,
    responseSchema: z.literal(true),
    middlewares: [auth('user')],
    handler: async (params, c) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(401, 'UNAUTHORIZED', 'User not logged in.');
      const result = await UserService.changePassword({ ...params, user_id });
      const user = await UserRepository.get(user_id);
      const token = await AuthService.generateToken(user);
      c.header('Set-Cookie', AuthService.generateCookie(token));
      return result;
    },
  });

  registerRoute(app, {
    method: 'post',
    path: '/user/delete-account',
    meta: { section: 'User', description: 'Delete the authenticated user account.' },
    requestSchema: UserSchemas.deleteAccountRequest,
    responseSchema: z.literal(true),
    middlewares: [auth('user')],
    handler: async (params, c) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(401, 'UNAUTHORIZED', 'User not logged in.');
      const result = await UserService.deleteAccount({ ...params, user_id });
      c.header('Set-Cookie', AuthService.generateCookie('', true));
      return result;
    },
  });

  registerRoute(app, {
    method: 'post',
    path: '/s/user/list',
    meta: { section: 'User', description: 'List users.' },
    requestSchema: UserSchemas.listRequest,
    responseSchema: UserSchemas.listResponse,
    middlewares: [auth('superadmin')],
    handler: (params) => UserRepository.getem(params),
  });
};
