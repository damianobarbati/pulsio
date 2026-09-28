import { describe, expect, it } from 'vitest';
import UserRepository from '#api/user/UserRepository.ts';

describe('UserRepository', () => {
  describe('getem', async () => {
    it('should work', async () => {
      const users = await UserRepository.getem({});
      expect(users.length).toBeGreaterThan(0);
    });

    it('should work with filters', async () => {
      const users = await UserRepository.getem({ search: 'a' });
      expect(users.length).toBeGreaterThan(0);
    });

    it('should work with limit/offset', async () => {
      const users = await UserRepository.getem({ search: 'a', limit: 1, offset: 1 });
      expect(users.length).toBeGreaterThan(0);
    });
  });
});
