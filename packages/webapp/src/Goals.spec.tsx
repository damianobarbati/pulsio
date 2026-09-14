import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { afterEach, expect, it, vi } from 'vitest';
import { Goals } from './Goals.tsx';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('creates a custom event goal with property conditions', async () => {
  const fetchMock = vi.fn(async (_url, options) => new Response(JSON.stringify({ id: 'goal-1', site_id: 'site-1', ...JSON.parse(options.body) }), { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
  const onChanged = vi.fn();
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <Goals siteId="site-1" goals={[]} onChanged={onChanged} onSelect={vi.fn()} />
    </SWRConfig>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Add goal' }));
  await userEvent.type(screen.getByLabelText('Display name'), 'Paid signup');
  await userEvent.type(screen.getByLabelText('Event name'), 'Signup');
  fireEvent.change(screen.getByLabelText('Custom property conditions (JSON)'), { target: { value: '{"plan":"pro"}' } });
  await userEvent.click(screen.getByRole('button', { name: 'Save goal' }));
  expect(fetchMock).toHaveBeenCalledWith('/goals', expect.objectContaining({ method: 'POST' }));
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ site: 'site-1', name: 'Paid signup', kind: 'event', target: 'Signup', properties: { plan: 'pro' } });
  expect(onChanged).toHaveBeenCalledOnce();
  expect(await screen.findByText('Goal saved.')).toBeTruthy();
});
