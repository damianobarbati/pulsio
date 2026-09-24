import { faker } from '@faker-js/faker';
import type { UserRow, UserRowInsert } from 'types/User.ts';
import { AuthService } from '#api/auth/AuthService.ts';

export const createUserRow = async (params: Partial<UserRow> = {}): Promise<UserRowInsert> => {
  const { email: _email } = params;
  delete params.email;

  const email = _email || faker.internet.email().toLowerCase();
  const password_hash = await AuthService.hashPassword(email);

  const result = {
    email,
    password_hash,
    ...params,
  };
  return result;
};
