import { faker } from '@faker-js/faker';
import jwt from 'jwt-simple';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ENV from '#api/env.ts';
import SessionRepository from '#api/misc/SessionRepository.ts';
import UserRepository from '#api/user/UserRepository.ts';
import { AuthService } from './AuthService.ts';

const email = faker.internet.email().toLowerCase();
const password = email;
const domain = faker.internet.domainName();

const cleanUp = async () => {
  const user = await UserRepository.findBy({ email });
  if (user) await UserRepository.remove(user.id);
};

describe('AuthService', () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  describe('hashPassword', () => {
    it('works', async () => {
      const hash = await AuthService.hashPassword(password);
      const result = await AuthService.verifyPassword(password, hash);
      expect({ hash, result }).toMatchObject({ hash: expect.not.stringMatching(new RegExp(`^${password}$`)), result: true });
    });

    it('fails when password is different', async () => {
      const hash = await AuthService.hashPassword(password);
      const result = await AuthService.verifyPassword('xyz', hash);
      expect(result).toEqual(false);
    });
  });

  describe('getSessionCookieValue', () => {
    it('returns the session token', () => {
      const cookie = AuthService.generateCookie('xyz');
      const result = AuthService.getCookie(cookie);
      expect(result).toEqual('xyz');
    });

    it('returns an empty token when session cookie is missing', () => {
      const result = AuthService.getCookie('other=value');
      expect(result).toEqual('');
    });
  });

  describe('generateCookie', () => {
    it('returns the session cookie', () => {
      const result = AuthService.generateCookie('xyz');
      expect(result).toContain(`pulsio_session=xyz; Path=/; HttpOnly; SameSite=Strict`);
    });

    it('clears the session cookie', () => {
      const result = AuthService.generateCookie('xyz', true);
      expect(result).toContain('Max-Age=0');
    });
  });

  describe('register', () => {
    it('works', async () => {
      const token = await AuthService.register({ email, password });
      const user = await UserRepository.getBy({ email });
      const authenticatedUser = await AuthService.me({ cookie: AuthService.generateCookie(token) });
      const sessions = await SessionRepository.getem({ user_id: user.id });
      expect(user).toMatchObject({ email });
      expect(authenticatedUser).toMatchObject({ id: user.id });
      expect(sessions).toEqual([]);
      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    it('fails when email already exists', async () => {
      await AuthService.register({ email, password });
      await expect(AuthService.register({ email, password })).rejects.toMatchObject({ code: '23505' });
    });
  });

  describe('login', () => {
    it('works', async () => {
      await AuthService.register({ email, password });
      const token = await AuthService.login({ email, password });
      const user = await UserRepository.getBy({ email });
      const authenticatedUser = await AuthService.me({ cookie: AuthService.generateCookie(token) });
      expect(authenticatedUser).toMatchObject({ id: user.id, email });
    });

    it('fails when account does not exist', async () => {
      await expect(AuthService.login({ email, password })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    });
  });

  describe('me', () => {
    it('works', async () => {
      const token = await AuthService.register({ email, password });
      const result = await AuthService.me({ cookie: AuthService.generateCookie(token) });
      expect(result).toMatchObject({ email });
    });

    it('fails when token is invalid', async () => {
      await expect(AuthService.me({ cookie: AuthService.generateCookie('xyz') })).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    });

    it('rejects a token with a different signature', async () => {
      const token = await AuthService.register({ email, password });
      const claims = jwt.decode(token, ENV.JWT_SECRET, false, 'HS256');
      const forged = jwt.encode(claims, 'different-secret', 'HS256');
      await expect(AuthService.me({ cookie: AuthService.generateCookie(forged) })).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    });

    it('rejects a token after the password changes', async () => {
      await AuthService.register({ email, password });
      const { id: user_id } = await UserRepository.getBy({ email });

      const token_before = await AuthService.login({ email, password });
      await UserRepository.update(user_id, { password_hash: await AuthService.hashPassword('new-password') });
      const token_after = await AuthService.login({ email, password: 'new-password' });

      await expect(AuthService.me({ cookie: AuthService.generateCookie(token_before) })).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
      await expect(AuthService.me({ cookie: AuthService.generateCookie(token_after) })).resolves.toMatchObject({ id: user_id });
    });
  });

  describe('sendVerificationEmail', () => {
    it('works', async () => {
      const token = await AuthService.generateToken(global.user);
      const result = await AuthService.sendVerificationEmail({ email, token, domain });
      expect(result).toEqual(undefined);
    });
  });
});
