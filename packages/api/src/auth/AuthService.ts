import bcrypt from 'bcrypt';
import jwt from 'jwt-simple';
import { AppError } from 'nano-fw/docs/index.ts';
import nodemailer from 'nodemailer';
import type { User } from 'types/User.ts';
import { Email } from 'ui/email';

import type { IAuth } from '#api/auth/AuthServiceSchema.ts';
import ENV from '#api/env.ts';
import UserRepository from '#api/user/UserRepository.ts';

const mailer = nodemailer.createTransport(ENV.SMTP_URI);
const sessionCookieName = 'pulsio_session';

export class AuthService {
  static async grantSuperAdmin() {
    try {
      const user = await UserRepository.findBy({ email: ENV.SUPERADMIN_EMAIL });
      if (user) return;
      const password_hash = await AuthService.hashPassword(ENV.SUPERADMIN_PASSWORD);
      await UserRepository.create({ email: ENV.SUPERADMIN_EMAIL, password_hash, role: 'superadmin' });
    } catch {}
  }

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  static async generateToken(user: User): Promise<string> {
    const token = jwt.encode({ sub: user.id, iat: Date.now() / 1000 }, ENV.JWT_SECRET, 'HS256');
    return token;
  }

  static getCookie(cookie: string): string {
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${sessionCookieName}=([^;]*)`));
    return match ? match[1] : '';
  }

  static generateCookie(token: string, clear = false) {
    const parts = [`${sessionCookieName}=${clear ? '' : token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict'];
    if (clear) parts.push('Max-Age=0');
    if (ENV.COOKIE_DOMAIN) parts.push(`Domain=${ENV.COOKIE_DOMAIN}`);
    if (ENV.APP_ENV !== 'local') parts.push('Secure');
    return parts.join('; ');
  }

  static async register({ email, password }: IAuth.registerRequest): Promise<IAuth.registerResponse> {
    const password_hash = await AuthService.hashPassword(password);
    const user = await UserRepository.create({ email, password_hash });
    const token = await AuthService.generateToken(user);
    return token;
  }

  static async login({ email, password }: IAuth.loginRequest): Promise<IAuth.loginResponse> {
    const user = await UserRepository.findBy({ email });
    if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email address or password is incorrect.');

    const validPassword = await AuthService.verifyPassword(password, user.password_hash);
    if (!validPassword) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email address or password is incorrect.');

    if (user.suspended_at) throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Account is suspended.');

    const login_at = new Date().toISOString();
    await UserRepository.update(user.id, { login_at });

    const token = await AuthService.generateToken(user);
    return token;
  }

  static async me({ cookie }: { cookie: string }): Promise<User> {
    const token = AuthService.getCookie(cookie);
    const unauthorizedError = new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');

    if (!token) throw unauthorizedError;

    let claims: any;
    try {
      claims = jwt.decode(token, ENV.JWT_SECRET) as any;
    } catch {
      throw unauthorizedError;
    }

    if (!claims.sub || !claims.iat) throw unauthorizedError;

    const user = await UserRepository.findBy({ id: claims.sub });
    if (!user || user.suspended_at || user.password_changed_at > claims.iat) throw unauthorizedError;

    return user;
  }

  static async sendVerificationEmail({ email, token, domain }: { email: string; token: string; domain: string }) {
    const verificationUrl = `${ENV.API_URL}/auth/verify?token=${encodeURIComponent(token)}`;
    const html = Email.render({ template: 'welcome', data: { domain, verificationUrl: verificationUrl.toString() } });

    await mailer.sendMail({
      attachments: [{ cid: Email.logo.cid, filename: Email.logo.filename, path: Email.logo.path }],
      from: ENV.EMAIL_FROM,
      to: email,
      subject: 'Welcome to Pulsio – verify your email address',
      html,
    });
  }
}
