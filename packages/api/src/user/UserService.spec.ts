import { describe, expect, it } from 'vitest';
import AuthService from '#api/auth/AuthService.ts';
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
      logo: originalUser.logo,
    });
  });
});
