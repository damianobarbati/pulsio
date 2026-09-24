import React from 'react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { Button, Input } from 'ui';
import { fetcher, mutation } from '#webapp/api.ts';

type Credentials = { email: string; password: string };

export const Auth = () => {
  const form = useForm<Credentials>({ defaultValues: { email: '', password: '' } });
  const login = useSWRMutation('/auth/login', mutation);
  const session = useSWR('/auth/me', fetcher, { shouldRetryOnError: false });
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (session.data) window.location.assign('/');
  }, [session.data]);

  const submit = form.handleSubmit(async (credentials) => {
    setMessage('');
    try {
      console.log(await login.trigger(credentials));
      console.log(await fetcher('/auth/me'));
      window.location.assign('/');
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 403) {
        await mutation('/auth/logout', { arg: {} });
      }
      setMessage(error instanceof Error ? error.message : 'Could not log in. Please try again.');
    }
  });

  return (
    <main className="grid min-h-screen place-items-center bg-pulsio-surface px-6 py-6">
      <section className="w-full max-w-md rounded-lg border border-pulsio-line bg-white p-7 shadow-sm sm:p-9">
        <img src="/logo.svg" alt="Pulsio Logo" className="mx-auto w-24" />

        <h1 className="mt-6 flex flex-row items-center gap-4 font-black text-3xl text-pulsio-blue tracking-tighter">Pulsio Login</h1>

        <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
          <label className="block font-medium text-sm">
            Email
            <Input type="email" autoComplete="username" className="mt-2 w-full" required {...form.register('email')} />
          </label>
          <label className="block font-medium text-sm">
            Password
            <Input type="password" autoComplete="current-password" className="mt-2 w-full" required {...form.register('password')} />
          </label>
          {message && (
            <p className="text-red-700 text-sm" role="alert">
              {message}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={login.isMutating}>
            {login.isMutating ? 'Logging in…' : 'Login'}
          </Button>
        </form>
      </section>
    </main>
  );
};

export default Auth;
