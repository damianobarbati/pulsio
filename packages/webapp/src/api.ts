import type { User } from 'types/User.ts';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type MutationArgument = { arg: unknown };
type GoalMutationArgument = { arg: { method: 'POST' | 'PATCH' | 'DELETE'; data: unknown } };

const authenticationKey = 'pulsio-authenticated';

const mockOverview = {
  activeVisitors: 12,
  from: '2026-09-01T00:00:00.000Z',
  to: '2026-09-22T00:00:00.000Z',
  summary: {
    visitors: 1248,
    visits: 1530,
    pageviews: 3820,
    viewsPerVisit: 2.5,
    bounceRate: 42.8,
    visitDuration: 98,
    engagementRate: 57.2,
    events: 641,
    conversionRate: 8,
    timeOnPage: 64,
    scrollDepth: 56,
  },
  previous: { visitors: 1100, visits: 1380, pageviews: 3390, viewsPerVisit: 2.4, bounceRate: 45.1, visitDuration: 91, timeOnPage: 58, scrollDepth: 51 },
  changes: { liveNow: 9.1, users: 13.5, views: 12.7, sessions: 10.9, sessionTime: 7.7, engagement: 4.2, events: -3.1, conversion: 1.4, revenue: 6.8 },
  timeline: [
    {
      label: '2026-09-20T00:00:00.000Z',
      visitors: 384,
      visits: 468,
      pageviews: 1130,
      viewsPerVisit: 2.4,
      bounceRate: 43,
      visitDuration: 96,
      engagementRate: 57,
      events: 190,
      conversionRate: 7.5,
      timeOnPage: 62,
      scrollDepth: 54,
    },
    {
      label: '2026-09-21T00:00:00.000Z',
      visitors: 418,
      visits: 512,
      pageviews: 1290,
      viewsPerVisit: 2.5,
      bounceRate: 42,
      visitDuration: 100,
      engagementRate: 58,
      events: 211,
      conversionRate: 8.1,
      timeOnPage: 65,
      scrollDepth: 57,
    },
    {
      label: '2026-09-22T00:00:00.000Z',
      visitors: 446,
      visits: 550,
      pageviews: 1400,
      viewsPerVisit: 2.6,
      bounceRate: 41,
      visitDuration: 102,
      engagementRate: 56.6,
      events: 240,
      conversionRate: 8.4,
      timeOnPage: 67,
      scrollDepth: 59,
    },
  ],
  topPages: [
    { name: '/', value: 1480 },
    { name: '/pricing', value: 760 },
    { name: '/docs', value: 550 },
  ],
  sources: [
    { name: 'Google', value: 680 },
    { name: 'Direct', value: 370 },
    { name: 'github.com', value: 198 },
  ],
  goals: [],
  revenue: [{ currency: 'USD', totalRevenue: 8240, averageRevenue: 82.4, orders: 100 }],
};
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
  if (url.startsWith('/analytics/overview')) return mockOverview;
  if (url.startsWith('/analytics/live'))
    return {
      activeVisitors: 12,
      pages: [
        { name: '/', value: 7 },
        { name: '/pricing', value: 3 },
        { name: '/docs', value: 2 },
      ],
    };
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
  if (url === '/auth/me') {
    const result = await request({ url, method: 'GET' });
    return result as Result;
  } else {
    const result = await mock<Result>({ url, method: 'GET' });
    return result;
  }
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
