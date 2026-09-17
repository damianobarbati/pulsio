import React from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { Button, Input } from 'ui';
import { ILock } from './icons.tsx';
import { fetcher, login } from './requests.ts';

type SuperadminAuthProps = { children: React.ReactNode };
type Credentials = { username: string; password: string };

const LockedScreen = ({ children }: SuperadminAuthProps) => (
  <main className="grid min-h-screen place-items-center bg-pulsio-surface px-6 py-12">
    <section className="w-full max-w-md rounded-[var(--radius-lg)] border border-pulsio-line bg-white p-7 shadow-sm sm:p-9">
      <div className="grid size-12 place-items-center rounded-full bg-blue-100 text-pulsio-blue">
        <ILock aria-hidden="true" size={24} />
      </div>
      {children}
    </section>
  </main>
);

export const SuperadminAuth = ({ children }: SuperadminAuthProps) => {
  const session = useSWR<{ authenticated: true }>('/s/auth/session', fetcher, { shouldRetryOnError: false });
  const authentication = useSWRMutation('/s/auth/login', login);
  const [accessLost, setAccessLost] = React.useState(false);

  React.useEffect(() => {
    const lock = () => setAccessLost(true);
    window.addEventListener('superadmin:unauthorized', lock);
    return () => window.removeEventListener('superadmin:unauthorized', lock);
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const credentials: Credentials = { username: String(fields.get('username') || ''), password: String(fields.get('password') || '') };
    try {
      await authentication.trigger(credentials);
      setAccessLost(false);
      await session.mutate();
    } catch {}
  };

  if (session.data && !accessLost) return children;

  return (
    <LockedScreen>
      <p className="mt-6 font-black text-3xl text-pulsio-blue tracking-tighter">Pulsio</p>
      <p className="mt-6 font-semibold text-pulsio-muted text-xs uppercase tracking-[0.2em]">Superadmin</p>
      <h1 className="mt-3 font-semibold text-3xl tracking-tight">Protected access</h1>
      <p className="mt-3 text-pulsio-muted">Enter your superadmin credentials to open the control panel.</p>
      <form className="mt-8 space-y-5" onSubmit={(event) => void submit(event)}>
        <label className="block font-medium text-sm">
          Username
          <Input name="username" autoComplete="username" className="mt-2 w-full" required />
        </label>
        <label className="block font-medium text-sm">
          Password
          <Input name="password" type="password" autoComplete="current-password" className="mt-2 w-full" required />
        </label>
        {authentication.error ? (
          <p className="text-red-700 text-sm" role="alert">
            {authentication.error.message}
          </p>
        ) : null}
        <Button className="w-full" type="submit" disabled={authentication.isMutating}>
          {authentication.isMutating ? 'Unlocking…' : 'Unlock panel'}
        </Button>
      </form>
    </LockedScreen>
  );
};
