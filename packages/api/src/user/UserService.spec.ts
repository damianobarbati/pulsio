import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import AuthService from '#api/auth/AuthService.ts';
import UserImageRepository from '#api/user/UserImageRepository.ts';
import UserRepository from '#api/user/UserRepository.ts';
import UserService from '#api/user/UserService.ts';

describe('UserService', () => {
  it('should change email for an existing user', async () => {
    const user = await UserRepository.get(global.user2.id);
    const email = `fox.mulder.${Date.now()}@example.com`;

    try {
      const result = await UserService.changeEmail({ user_id: user.id, email, current_password: 'fox.mulder@gmail.com' });

      expect(result).toMatchObject({ id: user.id, email });
      const updatedUser = await UserRepository.get(user.id);
      expect(updatedUser.email).toEqual(email);
    } finally {
      await UserRepository.update(user.id, { email: user.email, email_verified_at: user.email_verified_at });
    }
  });

  it('should change password for an existing user', async () => {
    const user = await UserRepository.get(global.user2.id);
    const new_password = `new-password-${Date.now()}`.slice(0, 20);

    try {
      const result = await UserService.changePassword({ user_id: user.id, current_password: 'fox.mulder@gmail.com', new_password });
      const updatedUser = await UserRepository.get(user.id);
      const oldPasswordIsValid = await AuthService.verifyPassword('fox.mulder@gmail.com', updatedUser.password_hash);
      const newPasswordIsValid = await AuthService.verifyPassword(new_password, updatedUser.password_hash);

      expect(result).toEqual(true);
      expect({ oldPasswordIsValid, newPasswordIsValid }).toEqual({ oldPasswordIsValid: false, newPasswordIsValid: true });
    } finally {
      await UserRepository.update(user.id, { password_hash: user.password_hash });
    }
  });

  it('should save user branding and replace the current PNG logo', async () => {
    const user = await UserRepository.get(global.user2.id);
    const firstLogo = Buffer.from('first-logo');
    const secondLogo = Buffer.from('second-logo');

    try {
      const result = await UserService.updateBrand({ user_id: user.id, name: 'Fox Analytics', primary_color: '#123456' });
      await UserImageRepository.upsert({ user_id: user.id, data: firstLogo });
      await UserImageRepository.upsert({ user_id: user.id, data: secondLogo });
      const image = await UserImageRepository.getBy({ user_id: user.id });

      expect(result).toMatchObject({ name: 'Fox Analytics', primary_color: '#123456' });
      expect({ data: image.data.toString(), size_bytes: Number(image.size_bytes) }).toEqual({ data: 'second-logo', size_bytes: secondLogo.length });
    } finally {
      const image = await UserImageRepository.findBy({ user_id: user.id });
      if (image) await UserImageRepository.remove(image.id);
      await UserRepository.update(user.id, { name: user.name, primary_color: user.primary_color });
    }
  });

  it('should fail when branding user does not exist', async () => {
    await expect(UserService.updateBrand({ user_id: randomUUID(), name: 'Missing', primary_color: '#123456' })).rejects.toMatchObject({ status: 404 });
  });

  it('should update autodiscovery settings', async () => {
    const user = await UserRepository.get(global.user2.id);

    try {
      const result = await UserService.updateSettings({ user_id: user.id, autodiscover_enabled: false });

      expect(result.autodiscover_enabled).toEqual(false);
    } finally {
      await UserRepository.update(user.id, { autodiscover_enabled: user.autodiscover_enabled });
    }
  });

  it('should prefix the registered email when deleting an account', async () => {
    const user = await UserRepository.get(global.user2.id);
    const originalUser = { ...user };

    const result = await UserService.deleteAccount({ user_id: user.id, current_password: 'fox.mulder@gmail.com', confirmation: 'DELETE' });
    const deletedUser = await UserRepository.get(user.id);

    expect(result).toEqual(true);
    expect(deletedUser).toMatchObject({ email: `${user.email}_deleted`, deleted_at: expect.any(String) });

    // tofix: recreate fox mulder user
    await UserRepository.update(user.id, {
      email: originalUser.email,
      password_hash: originalUser.password_hash,
      suspended_at: originalUser.suspended_at,
      deleted_at: originalUser.deleted_at,
      email_verified_at: originalUser.email_verified_at,
      email_verification_token_hash: originalUser.email_verification_token_hash,
      email_verification_expires_at: originalUser.email_verification_expires_at,
      name: originalUser.name,
      primary_color: originalUser.primary_color,
    });
  });
});
