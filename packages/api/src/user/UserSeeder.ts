import { faker } from '@faker-js/faker';
import type { IUser } from 'types/User.ts';
import AuthService from '#api/auth/AuthService.ts';

export const createUserRow = async (params: Partial<IUser.row> = {}): Promise<IUser.rowInsert> => {
  const { email: _email, ...rest } = params;

  const email = _email || faker.internet.email().toLowerCase();
  const password_hash = await AuthService.hashPassword(email);

  const result = {
    email,
    password_hash,
    ...rest,
  };
  return result;
};
