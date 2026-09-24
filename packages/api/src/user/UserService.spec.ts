import { describe, expect, it } from 'vitest';
import UserService from '#api/user/UserService.ts';
import { JOHN_DOE } from '#dao/seeds/2-users.ts';

describe('UserService', () => {
  it('get should return user', async () => {
    const result = await UserService.get(JOHN_DOE.id);
    expect(result).toMatchObject({ id: JOHN_DOE.id, email: JOHN_DOE.email });
  });
});
