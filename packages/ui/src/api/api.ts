import type { User } from 'types/User.ts';

const getApiUrl = () => window.config.API_URL;

const unauthorized = () => window.dispatchEvent(new Event('superadmin:unauthorized'));

const request = async ({
  url,
  method = 'GET',
  body,
  loginRequest = false,
}: {
  url: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  loginRequest?: boolean;
}) => {
  const response = await fetch(`${getApiUrl()}${url}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401 || response.status === 403) {
    if (!loginRequest && url !== '/auth/me') unauthorized();
    const message = loginRequest ? 'Could not authenticate.' : 'Access denied. Enter valid superadmin credentials.';
    throw Object.assign(new Error(message), { status: response.status });
  }
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message || 'Request failed. Please try again.'), { status: response.status });
  return result;
};

export const fetcher = async <Result>(url: string): Promise<Result> => {
  return request({ url });
};

export const post = async <Result>(url: string, body: unknown): Promise<Result> => {
  const result = await request({ url, method: 'POST', body });
  return result as Result;
};

export const login = async (_key: string, { arg }: { arg: { email: string; password: string } }) => request({ url: '/auth/login', method: 'POST', body: arg, loginRequest: true });

export const logout = async () => request({ url: '/auth/logout', method: 'POST' });

export const mutation = async (url: string, { arg }: { arg: unknown }) => {
  const result = await request({ url, method: 'POST', body: arg });
  return result;
};

export const checkAuth = async (): Promise<User> => {
  return await fetcher<User>('/auth/me');
};
