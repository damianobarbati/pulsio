import type { DomainListRequest } from 'types/Domain.ts';
import type { User } from 'types/User.ts';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type MutationArgument = { arg: unknown };
type GoalMutationArgument = { arg: { method: 'POST' | 'PATCH' | 'DELETE'; data: unknown } };

const authenticationKey = 'pulsio-authenticated';

const mockBreakdown = [
  { name: 'Google', value: 680, percentage: 54.5, pageviews: 1860, visits: 820, bounceRate: 38, visitDuration: 112, timeOnPage: 73, scrollDepth: 61, exitRate: 31 },
  { name: 'Direct', value: 370, percentage: 29.6, pageviews: 1090, visits: 470, bounceRate: 44, visitDuration: 87, timeOnPage: 56, scrollDepth: 50, exitRate: 39 },
  { name: 'github.com', value: 198, percentage: 15.9, pageviews: 570, visits: 240, bounceRate: 48, visitDuration: 75, timeOnPage: 49, scrollDepth: 44, exitRate: 45 },
];

const setAuthenticated = (value: boolean) => {
  if (value) localStorage.setItem(authenticationKey, 'true');
  else localStorage.removeItem(authenticationKey);
};
const getApiUrl = () => window.config.API_URL;
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const request = async ({ url, method, body }: { url: string; method: HttpMethod; body?: unknown }) => {
  const response = await fetch(`${getApiUrl()}${url}`, {
    method,
    credentials: 'include',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = response.status === 204 ? null : await response.json();
  const message = result && typeof result === 'object' && 'message' in result && typeof result.message === 'string' ? result.message : 'Request failed. Please try again.';
  if (!response.ok) throw Object.assign(new Error(message), { status: response.status });
  return result;
};

const mockGet = ({ url }: { url: string }): unknown => {
  if (url === '/site-groups' || url === '/filter-presets') return [];
  if (url.startsWith('/analytics/breakdown')) return mockBreakdown;
  if (url.startsWith('/analytics/journeys'))
    return [
      { source: '/', target: '/pricing', step: 1, visitors: 120 },
      { source: '/pricing', target: '/start', step: 2, visitors: 68 },
    ];
  throw new Error(`No mock API for ${url}`);
};

const mockMutation = ({ url, method }: { url: string; method: HttpMethod }): unknown => {
  if ((url === '/site-groups' || url === '/filter-presets') && (method === 'POST' || method === 'DELETE')) return { id: id('mock') };
  if (url === '/goals' && method === 'POST') return { id: id('mock') };
  if (url.startsWith('/goals/') && (method === 'PATCH' || method === 'DELETE')) return {};

  throw new Error(`No mock API for ${method} ${url}`);
};

const mock = async <Result>({ url, method }: { url: string; method: HttpMethod; body?: unknown }): Promise<Result> => {
  const result = method === 'GET' ? mockGet({ url }) : mockMutation({ url, method });
  return result as Result;
};

export const fetcher = async <Result>(url: string): Promise<Result> => {
  if (url === '/auth/me' || url.startsWith('/analytics/overview') || url.startsWith('/analytics/live')) {
    const result = await request({ url, method: 'GET' });
    return result as Result;
  }

  if (url === '/domain/list') {
    const params: DomainListRequest = { sort: [['domain', 'asc']], limit: 1000 };
    const result = await request({ url, method: 'POST', body: params });
    return result as Result;
  }

  const result = await mock<Result>({ url, method: 'GET' });
  return result;
};

export const mutation = async <Result>(url: string, { arg }: MutationArgument): Promise<Result> => {
  if (url === '/auth/login') {
    const result = await request({ url, method: 'POST', body: arg });
    setAuthenticated(true);
    return result as Result;
  }
  if (url === '/auth/logout') {
    let result: Result;

    try {
      result = (await request({ url, method: 'POST', body: arg })) as Result;
    } catch (error) {
      if (!(error instanceof Error && 'status' in error && error.status === 401)) throw error;
      result = true as Result;
    }

    setAuthenticated(false);
    return result;
  }

  const result = await mock<Result>({ url, method: 'POST', body: arg });
  return result;
};

export const deleteMutation = async <Result>(url: string, { arg }: MutationArgument): Promise<Result> => {
  const result = await mock<Result>({ url, method: 'DELETE', body: arg });
  return result;
};

export const goalMutation = async <Result>(url: string, { arg }: GoalMutationArgument): Promise<Result> => {
  const result = await mock<Result>({ url, method: arg.method, body: arg.data });
  return result;
};

export const checkAuth = async (): Promise<User> => {
  return await fetcher<User>('/auth/me');
};
