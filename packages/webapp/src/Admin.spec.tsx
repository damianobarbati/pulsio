import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './App.tsx';

vi.mock('./Chart.tsx', () => ({ Chart: () => null }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('shows login errors and lets the user correct credentials', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => new Response(JSON.stringify({ message: url === '/auth/login' ? 'Email or password is incorrect.' : 'Please log in.' }), { status: 401 })),
  );
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <App />
    </SWRConfig>,
  );
  await screen.findByRole('heading', { name: 'Welcome back.' });
  await userEvent.type(screen.getByLabelText('Email'), 'person@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'incorrect-password');
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
  expect((await screen.findByRole('alert')).textContent).toEqual('Email or password is incorrect.');
});

const site = {
  id: 'site-1',
  domain: 'example.com',
  detected: false,
  snippet: '<script defer src="https://track.example.com/client.js" data-site="example.com"></script>',
  adminUrl: 'http://localhost:3000/?site=site-1',
};
const overview = {
  activeVisitors: 0,
  from: '2026-08-18T00:00:00.000Z',
  to: '2026-09-15T00:00:00.000Z',
  summary: { visitors: 0, visits: 0, pageviews: 0, viewsPerVisit: 0, bounceRate: 0, visitDuration: 0, timeOnPage: null, scrollDepth: null },
  previous: { visitors: 0, visits: 0, pageviews: 0, viewsPerVisit: 0, bounceRate: 0, visitDuration: 0, timeOnPage: null, scrollDepth: null },
  timeline: [],
  topPages: [],
  sources: [],
  goals: [],
  revenue: [],
};
const mockApi = (fetchMock: ReturnType<typeof vi.fn>) => {
  fetchMock.mockImplementation(async (url) => {
    const path = String(url);
    const body =
      path === '/account'
        ? { email: 'owner@example.com', sites: [site] }
        : path.startsWith('/analytics/live')
          ? { activeVisitors: 0, pages: [] }
          : path.startsWith('/analytics/breakdown') || path.startsWith('/analytics/journeys')
            ? []
            : path === '/world.json'
              ? { type: 'FeatureCollection', features: [] }
              : overview;
    return new Response(JSON.stringify(body));
  });
};

it('shows the waiting state and installation snippet for an account website', async () => {
  vi.stubGlobal('fetch', vi.fn());
  mockApi(fetch as unknown as ReturnType<typeof vi.fn>);
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <App />
    </SWRConfig>,
  );
  expect((await screen.findByText('Waiting for the first signal…')).textContent).toEqual('Waiting for the first signal…');
  expect(screen.getAllByRole('code').some((element) => element.textContent?.includes(site.snippet))).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Websites & account' }));
  expect(screen.getByRole('heading', { name: 'Add another website' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Permanently delete data' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Reset data' }));
  expect(screen.getByText('Delete all events for example.com?')).toBeTruthy();
});

it('refreshes the live visitor endpoint after three seconds', async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn();
  mockApi(fetchMock);
  vi.stubGlobal('fetch', fetchMock);
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <App />
    </SWRConfig>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  const initial = fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/analytics/live')).length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3100);
  });
  const refreshed = fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/analytics/live')).length;
  expect(refreshed).toBeGreaterThan(initial);
});
