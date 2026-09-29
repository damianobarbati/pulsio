import { randomUUID } from 'node:crypto';
import { AppError } from 'nano-fw/docs/index.ts';
import type { IUser } from 'types/User.ts';
import AuthService from '#api/auth/AuthService.ts';
import UserRepository from '#api/user/UserRepository.ts';

export default class UserService {
  static async verifyCurrentPassword({ password, password_hash }: { password: string; password_hash: string }) {
    const validPassword = await AuthService.verifyPassword(password, password_hash);
    if (!validPassword) throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect.');
  }

  static async changeEmail({ user_id, email, current_password }: IUser.changeEmailRequest & { user_id: string }): Promise<IUser.accountResponse> {
    const user = await UserRepository.get(user_id);
    await UserService.verifyCurrentPassword({ password: current_password, password_hash: user.password_hash });

    const normalizedEmail = email.toLowerCase();
    const existingUser = await UserRepository.findBy({ email: normalizedEmail });
    if (existingUser && existingUser.id !== user_id) throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'Email address is already in use.');

    await UserRepository.update(user_id, { email: normalizedEmail, email_verified_at: null });
    const result = await UserRepository.get(user_id);
    return result;
  }

  static async changePassword({ user_id, current_password, new_password }: IUser.changePasswordRequest & { user_id: string }): Promise<true> {
    const user = await UserRepository.get(user_id);
    await UserService.verifyCurrentPassword({ password: current_password, password_hash: user.password_hash });
    const password_hash = await AuthService.hashPassword(new_password);
    await UserRepository.update(user_id, { password_hash });
    return true;
  }

  static async deleteAccount({ user_id, current_password, confirmation }: IUser.deleteAccountRequest & { user_id: string }): Promise<true> {
    const user = await UserRepository.get(user_id);
    await UserService.verifyCurrentPassword({ password: current_password, password_hash: user.password_hash });
    if (confirmation !== 'DELETE') throw new AppError(400, 'INVALID_CONFIRMATION', 'Type DELETE to confirm account deletion.');
    const timestamp = new Date().toISOString();
    const password_hash = await AuthService.hashPassword(randomUUID());
    await UserRepository.update(user_id, {
      email: `${user.email}_deleted`,
      password_hash,
      suspended_at: timestamp,
      deleted_at: timestamp,
      email_verified_at: null,
      email_verification_token_hash: null,
      email_verification_expires_at: null,
      name: null,
      logo: null,
    });
    return true;
  }
}
