import { AppError } from 'nano-fw/docs/index.ts';
import type { UserAccountResponse, UserChangeEmailRequest, UserChangePasswordRequest, UserDeleteAccountRequest } from 'types/User.ts';
import { AuthService } from '#api/auth/AuthService.ts';
import UserRepository from '#api/user/UserRepository.ts';

const verifyCurrentPassword = async ({ password, password_hash }: { password: string; password_hash: string }) => {
  const validPassword = await AuthService.verifyPassword(password, password_hash);
  if (!validPassword) throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect.');
};

export default class UserService {
  static async changeEmail({ user_id, email, current_password }: UserChangeEmailRequest & { user_id: string }): Promise<UserAccountResponse> {
    const user = await UserRepository.get(user_id);
    await verifyCurrentPassword({ password: current_password, password_hash: user.password_hash });

    const normalizedEmail = email.toLowerCase();
    const existingUser = await UserRepository.findBy({ email: normalizedEmail });
    if (existingUser && existingUser.id !== user_id) throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'Email address is already in use.');

    await UserRepository.update(user_id, { email: normalizedEmail, email_verified_at: null });
    const result = await UserRepository.get(user_id);
    return result;
  }

  static async changePassword({ user_id, current_password, new_password }: UserChangePasswordRequest & { user_id: string }): Promise<true> {
    const user = await UserRepository.get(user_id);
    await verifyCurrentPassword({ password: current_password, password_hash: user.password_hash });
    const password_hash = await AuthService.hashPassword(new_password);
    await UserRepository.update(user_id, { password_hash });
    return true;
  }

  static async deleteAccount({ user_id, current_password, confirmation }: UserDeleteAccountRequest & { user_id: string }): Promise<true> {
    const user = await UserRepository.get(user_id);
    await verifyCurrentPassword({ password: current_password, password_hash: user.password_hash });
    if (confirmation !== 'DELETE') throw new AppError(400, 'INVALID_CONFIRMATION', 'Type DELETE to confirm account deletion.');
    await UserRepository.remove(user_id);
    return true;
  }
}
