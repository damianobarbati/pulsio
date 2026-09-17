import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetcher } from './requests.ts';

describe('superadmin requests', () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    window.config = { API_URL: 'http://api.test' };
  });

  it('shows an access denied error when HTTP Basic credentials are missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Superadmin credentials are required.', { status: 401 })));

    await expect(fetcher('/s/accounts')).rejects.toMatchObject({ message: 'Access denied. Enter valid superadmin credentials.', status: 401 });
  });
});
