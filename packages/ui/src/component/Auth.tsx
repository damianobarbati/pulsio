import cx from 'clsx-tw';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { IUser } from 'types/User.ts';
import { GET, MPOST } from '../api/fetchers.ts';
import { Input } from '../form/index.ts';
import { Button } from './Button.tsx';

type Credentials = { email: string; password: string };
type AuthProps = { className?: string; title: string; role: IUser.user['role'] };

export const Auth = ({ className, title, role }: AuthProps) => {
  const form = useForm<Credentials>({ defaultValues: { email: '', password: '' } });
  const login = useSWRMutation('/auth/login', MPOST);
  const session = useSWR<IUser.user>(['/auth/me'], GET, { shouldRetryOnError: false });
  const [message, setMessage] = React.useState('');
  const websiteUrl = window.config.WEBSITE_URL;

  React.useEffect(() => {
    const canAccess = session.data && (role === 'user' || session.data.role === role);
    if (canAccess) window.location.assign('/');
  }, [session.data, role]);

  const submit = form.handleSubmit(async (credentials) => {
    setMessage('');

    try {
      await login.trigger(credentials);
      const user = await session.mutate();
      const canAccess = user && (role === 'user' || user.role === role);
      if (!canAccess) throw Object.assign(new Error('Access denied.'), { status: 403 });
      window.location.assign('/');
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 403) {
        await MPOST('/auth/logout', { arg: {} });
      }

      if (error instanceof Error && 'status' in error && error.status === 401) {
        setMessage('Email and/or password wrong.');
        return;
      }

      setMessage(error instanceof Error ? error.message : 'Could not log in. Please try again.');
    }
  });

  return (
    <main className={cx('grid min-h-screen place-items-center bg-pulsio-surface px-6 py-6', className)}>
      <section className="w-full max-w-md rounded-lg border border-pulsio-line bg-white p-7 shadow-sm sm:p-9">
        <img src="/logo.svg" alt="Pulsio Logo" className="mx-auto w-24" />

        <h1 className="mt-6 flex flex-row items-center gap-4 font-bold text-3xl text-pulsio-blue tracking-tighter">{title}</h1>

        <FormProvider {...form}>
          <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
            <Input label="Email" name="email" type="email" autoComplete="username" required />
            <Input label="Password" name="password" type="password" autoComplete="current-password" required />
            {message && (
              <p className="text-red-700 text-sm" role="alert">
                {message}
              </p>
            )}
            <Button className="w-full" type="submit" disabled={login.isMutating}>
              {login.isMutating ? 'Logging in…' : 'Login'}
            </Button>
          </form>
        </FormProvider>
        <a href={websiteUrl} className="mt-6 block text-center text-pulsio-blue text-sm underline underline-offset-2">
          Back to website
        </a>
      </section>
    </main>
  );
};
