import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { IUser } from 'types/User.ts';
import { MPOST, MUPLOAD } from 'ui/api/fetchers.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserBrandForm } from '#webapp/components/UserBrandForm.tsx';

vi.mock('ui/api/fetchers.ts', () => ({
  DOWNLOAD: vi.fn().mockRejectedValue(new Error('No logo yet')),
  MPOST: vi.fn().mockResolvedValue({}),
  MUPLOAD: vi.fn().mockResolvedValue(true),
}));

const user = {
  id: '01a0af49-49a7-7c68-8b35-12a3e7804984',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  email: 'fox.mulder@gmail.com',
  password_hash: 'hidden',
  role: 'user',
  login_at: null,
  password_changed_at: '2026-01-01T00:00:00Z',
  suspended_at: null,
  email_verified_at: null,
  email_verification_token_hash: null,
  email_verification_expires_at: null,
  trial_ends_at: '2026-02-01T00:00:00Z',
  name: 'Fox Mulder',
  primary_color: '#055dfe',
  autodiscover_enabled: true,
  stripe_customer_id: null,
} as IUser.user;

const renderForm = () => render(<UserBrandForm user={user} onUpdated={vi.fn().mockResolvedValue(undefined)} />);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('UserBrandForm', () => {
  it('saves a resized PNG logo and detected primary color', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray([17, 34, 51, 255]) }),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['png'], { type: 'image/png' })));
    class MockImage {
      width = 100;
      height = 100;
      src = '';
      async decode() {}
    }
    vi.stubGlobal('Image', MockImage);

    const { container, getByRole } = renderForm();
    const input = container.querySelector('input[type="file"]');
    if (!input) throw new Error('Logo input was not rendered.');
    fireEvent.change(input, { target: { files: [new File(['source'], 'logo.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(getByRole('button', { name: 'Revert to previous color' })).toBeTruthy());
    fireEvent.click(getByRole('button', { name: 'Save brand settings' }));

    await waitFor(() => expect(MPOST).toHaveBeenCalledWith('/user/update-brand', expect.objectContaining({ arg: expect.objectContaining({ primary_color: '#202040' }) })));
    expect(MUPLOAD).toHaveBeenCalledWith('/user/logo', expect.objectContaining({ arg: expect.any(FormData) }));
  });

  it('shows save failure', async () => {
    vi.mocked(MPOST).mockRejectedValueOnce(new Error('Could not save brand settings.'));
    const { getByRole } = renderForm();
    fireEvent.click(getByRole('button', { name: 'Save brand settings' }));

    await waitFor(() => expect(getByRole('alert').textContent).toContain('Could not save brand settings.'));
  });
});
