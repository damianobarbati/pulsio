import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { AppError } from 'nano-fw/docs/index.ts';
import nodemailer from 'nodemailer';
import type { User } from 'types/User.ts';
import { Email } from 'ui/email';
import type { IAuth } from '#api/auth/AuthServiceSchema.ts';
import ENV from '#api/env.ts';
import SessionRepository from '#api/misc/SessionRepository.ts';
import UserRepository from '#api/user/UserRepository.ts';

const mailer = nodemailer.createTransport(ENV.SMTP_URI);
const sessionCookieName = 'pulsio_session';
const sessionDuration = 8 * 60 * 60 * 1000;

export class AuthService {
  static async grantSuperAdmin() {
    try {
      const user = await UserRepository.findBy({ email: ENV.SUPERADMIN_EMAIL });
      const password_hash = await AuthService.hashPassword(ENV.SUPERADMIN_PASSWORD);
      if (!user) return;
      await UserRepository.create({ email: ENV.SUPERADMIN_EMAIL, password_hash, role: 'superadmin' });
    } catch {}
  }

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  static getSessionCookieValue(cookie: string) {
    const match = cookie.match(new RegExp(`${sessionCookieName}=([^;]+)`));
    const token = match ? match[1] : '';
    return token;
  }

  static generateSessionCookieValue(token: string, clear = false) {
    const domain = ENV.COOKIE_DOMAIN ? `; Domain=${ENV.COOKIE_DOMAIN}` : '';
    const secure = ENV.APP_ENV === 'local' ? '' : '; Secure';
    const result = `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : sessionDuration / 1000}${domain}${secure}`;
    return result;
  }

  static async register({ email, password }: IAuth.registerRequest): Promise<IAuth.registerResponse> {
    const password_hash = await AuthService.hashPassword(password);
    const user = await UserRepository.create({ email, password_hash });
    const token = await AuthService.createSession(user);
    void AuthService.sendVerificationEmail({ email, token, domain: ENV.WEBAPP_URL });
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

    const token = await AuthService.createSession(user);
    return token;
  }

  static async logout({ cookie }: { cookie: string }) {
    const token = AuthService.getSessionCookieValue(cookie);
    const session = await SessionRepository.findBy({ token });
    if (!session) return;
    await SessionRepository.remove(session.id);
  }

  static async me({ cookie }: { cookie: string }): Promise<User> {
    const token = AuthService.getSessionCookieValue(cookie);
    if (!/^[a-f0-9]{64}$/.test(token)) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');

    const session = await SessionRepository.findBy({ token });
    if (!session) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');

    const user = await UserRepository.get(session.user_id);
    return user;
  }

  static async createSession(user: User): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + sessionDuration).toISOString();
    await SessionRepository.create({ user_id: user.id, token, expires_at });
    return token;
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
