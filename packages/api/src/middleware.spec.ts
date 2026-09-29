import type { Context, Next } from 'hono';
import type { IDomain } from 'types/Domain.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { asyncStorage } from '#api/asyncStorage.ts';
import DomainShareRepository from '#api/domain/DomainShareRepository.ts';
import { shareAuth } from '#api/middleware.ts';

const createContext = (token?: string) => ({ req: { header: (name: string) => (name === 'X-Pulsio-Share-Token' ? token : undefined) } }) as unknown as Context;

const createShare = (): IDomain.shareRow => ({
  id: '00000000-0000-0000-0000-000000000001',
  created_at: '2026-01-01T00:00:00.000Z',
  revoked_at: null,
  domain_id: '00000000-0000-0000-0000-000000000002',
  label: 'Public report',
  show_revenue: false,
  token_hash: 'token-hash',
});

describe('shareAuth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects requests without a share token', async () => {
    const next = vi.fn<Next>();

    await expect(shareAuth(createContext(), next)).rejects.toMatchObject({ status: 404, code: 'SHARE_NOT_FOUND' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests with an invalid share token', async () => {
    vi.spyOn(DomainShareRepository, 'findBy').mockResolvedValue(null);
    const next = vi.fn<Next>();

    await expect(shareAuth(createContext('invalid-token'), next)).rejects.toMatchObject({ status: 404, code: 'SHARE_NOT_FOUND' });
    expect(next).not.toHaveBeenCalled();
  });

  it('stores shared domain context before calling next', async () => {
    const share = createShare();
    vi.spyOn(DomainShareRepository, 'findBy').mockResolvedValue(share);
    let store: ReturnType<typeof asyncStorage.getStore>;
    const next = vi.fn<Next>(async () => {
      store = asyncStorage.getStore();
    });

    await shareAuth(createContext('valid-token'), next);

    expect(store).toEqual({ share_domain_id: share.domain_id });
    expect(next).toHaveBeenCalledOnce();
  });
});
