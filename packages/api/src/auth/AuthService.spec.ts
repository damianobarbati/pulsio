import { faker } from '@faker-js/faker';
import type { User } from 'types/User.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import SessionRepository from '#api/misc/SessionRepository.ts';
import UserRepository from '#api/user/UserRepository.ts';
import { AuthService } from './AuthService.ts';

const email = faker.internet.email().toLowerCase();
const password = email;
const token = faker.string.hexadecimal({ length: 64, prefix: '' }).toLowerCase();
const domain = faker.internet.domainName();

const cleanUp = async () => {
  const users = await UserRepository.getem({ email });
  for (const user of users) await UserRepository.remove(user.id);

  const sessions = await SessionRepository.getem();
  for (const session of sessions) await SessionRepository.remove(session.id);
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
      const cookie = AuthService.generateSessionCookieValue(token);
      const result = AuthService.getSessionCookieValue(cookie);
      expect(result).toEqual(token);
    });

    it('returns an empty token when session cookie is missing', () => {
      const result = AuthService.getSessionCookieValue('other=value');
      expect(result).toEqual('');
    });
  });

  describe('generateSessionCookieValue', () => {
    it('returns the session cookie', () => {
      const result = AuthService.generateSessionCookieValue(token);
      expect(result).toContain(`pulsio_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800`);
    });

    it('clears the session cookie', () => {
      const result = AuthService.generateSessionCookieValue(token, true);
      expect(result).toContain('Max-Age=0');
    });
  });

  describe('register', () => {
    it('works', async () => {
      const token = await AuthService.register({ email, password });
      const user = await UserRepository.getBy({ email });
      const session = await SessionRepository.findBy({ token });
      expect(user).toMatchObject({ email });
      expect(session).toMatchObject({ user_id: user.id, token });
      expect(token).toMatch(/^[a-f0-9]{64}$/);
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
      const session = await SessionRepository.getBy({ token });
      expect(user).toMatchObject({ email });
      expect(session).toMatchObject({ user_id: user.id, token });
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('fails when account does not exist', async () => {
      await expect(AuthService.login({ email, password })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    });
  });

  describe('logout', () => {
    it('works', async () => {
      const token = await AuthService.register({ email, password });
      await AuthService.logout({ cookie: AuthService.generateSessionCookieValue(token) });
      const session = await SessionRepository.findBy({ token });
      expect(session).toEqual(null);
    });

    it('works when session does not exist', async () => {
      const token = 'xyz';
      const result = await AuthService.logout({ cookie: AuthService.generateSessionCookieValue(token) });
      expect(result).toEqual(undefined);
    });
  });

  describe('me', () => {
    it('works', async () => {
      const token = await AuthService.register({ email, password });
      const result = await AuthService.me({ cookie: AuthService.generateSessionCookieValue(token) });
      expect(result).toMatchObject({ email });
    });

    it('fails when session does not exist', async () => {
      const token = 'xyz';
      await expect(AuthService.me({ cookie: AuthService.generateSessionCookieValue(token) })).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    });
  });

  describe('createSession', () => {
    it('works', async () => {
      const token = await AuthService.register({ email, password });
      const user = (await AuthService.me({ cookie: AuthService.generateSessionCookieValue(token) })) as User;
      const result = await AuthService.createSession(user);
      const session = await SessionRepository.findBy({ token: result });
      expect({ result, session }).toMatchObject({ result: expect.stringMatching(/^[a-f0-9]{64}$/), session: { user_id: user.id, token: result } });
    });

    it('fails when user does not exist', async () => {
      const token = await AuthService.register({ email, password });
      const user = (await AuthService.me({ cookie: AuthService.generateSessionCookieValue(token) })) as User;
      await expect(AuthService.createSession({ ...user, id: faker.string.uuid() })).rejects.toMatchObject({ code: '23503' });
    });
  });

  describe('sendVerificationEmail', () => {
    it('works', async () => {
      const result = await AuthService.sendVerificationEmail({ email, token, domain });
      expect(result).toEqual(undefined);
    });

    it('fails when recipient is empty', async () => {
      await expect(AuthService.sendVerificationEmail({ email: '', token, domain })).rejects.toThrow('No recipients defined');
    });
  });
});
