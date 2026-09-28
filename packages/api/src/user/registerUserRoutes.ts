import type { Hono } from 'hono';
import { AppError, registerRoute } from 'nano-fw/docs/index.ts';
import z from 'nano-fw/zod.ts';
import {
  UserAccountResponseSchema,
  UserChangeEmailRequestSchema,
  UserChangePasswordRequestSchema,
  UserDeleteAccountRequestSchema,
  UserListRequestSchema,
  UserListResponseSchema,
} from 'types/User.ts';
import { asyncStorage } from '#api/asyncStorage.ts';
import { AuthService } from '#api/auth/AuthService.ts';
import { auth } from '#api/middleware.ts';
import UserRepository from '#api/user/UserRepository.ts';
import UserService from '#api/user/UserService.ts';

export const registerUserRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'post',
    path: '/user/change-email',
    meta: { section: 'User', description: 'Change the authenticated user email address.' },
    requestSchema: UserChangeEmailRequestSchema,
    responseSchema: UserAccountResponseSchema,
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
    requestSchema: UserChangePasswordRequestSchema,
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
    requestSchema: UserDeleteAccountRequestSchema,
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
    requestSchema: UserListRequestSchema,
    responseSchema: UserListResponseSchema,
    middlewares: [auth('superadmin')],
    handler: (params) => UserRepository.getem(params),
  });
};
