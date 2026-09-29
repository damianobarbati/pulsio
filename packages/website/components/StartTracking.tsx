'use client';

import cx from 'clsx-tw';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { Button, TrackingSnippet } from 'ui';
import { Input } from 'ui/form';
import { getConfig } from './config';

type Registration = { email: string; password: string; plan: 'free' | 'solo' | 'agency' | 'studio' };
type Setup = { snippet: string; adminUrl: string };
type Account = { id: string };
type TrackedDomain = { events_count: number; last_event_at: string | null };

const apiPath = (path: string, config: { API_URL: string } | undefined) => {
  if (!config) return null;
  return new URL(path, config.API_URL).toString();
};

const readAccount = async (url: string): Promise<Account> => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('We could not load your account. Please try again.');
  const result = (await response.json()) as Account;
  return result;
};

const readTrackedDomains = async (url: string): Promise<TrackedDomain[]> => {
  const response = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (!response.ok) throw new Error('We could not check your tracking status. Please try again.');
  const result = (await response.json()) as TrackedDomain[];
  return result;
};

const registerAccount = async (url: string, { arg }: { arg: Registration }): Promise<string> => {
  const response = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arg) });
  const result = (await response.json()) as string | { message?: string };
  if (!response.ok) throw new Error(typeof result === 'string' ? result : result.message || 'We could not create your account. Please try again.');
  return result as string;
};

const createSnippet = ({ apiUrl, userId }: { apiUrl: string; userId: string }) => `<script async src="${new URL('/client.js', apiUrl)}" data-pulsio-id="${userId}"></script>`;

export const StartTracking = ({ className }: { className?: string }) => {
  const form = useForm<Registration>({ defaultValues: { plan: 'free' } });
  const configuration = useSWR('/env.json', getConfig, { revalidateOnFocus: false });
  React.useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get('plan');
    if (plan === 'solo' || plan === 'agency' || plan === 'studio') form.setValue('plan', plan);
  }, [form]);
  const registration = useSWRMutation(apiPath('/auth/register', configuration.data), registerAccount);
  const [account, setAccount] = React.useState<Setup | null>(null);
  const setup = account;
  const trackingStatus = useSWR<TrackedDomain[]>(setup && configuration.data ? apiPath('/domain/list', configuration.data) : null, readTrackedDomains, {
    refreshInterval: (domains) => (domains?.length ? 0 : 2000),
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });
  const hasReceivedSignal = Boolean(trackingStatus.data?.length);

  if (configuration.error)
    return (
      <p role="alert" className={className}>
        {configuration.error.message}
      </p>
    );
  if (!configuration.data) return null;
  const runtimeConfig = configuration.data;

  const submit = form.handleSubmit(async (values) => {
    await registration.trigger(values);
    const apiUrl = apiPath('/auth/me', runtimeConfig);
    if (!apiUrl) throw new Error('Application configuration is unavailable.');
    const user = await readAccount(apiUrl);
    const snippet = createSnippet({ apiUrl: runtimeConfig.API_URL, userId: user.id });
    setAccount({ snippet, adminUrl: runtimeConfig.WEBAPP_URL });
    window.dispatchEvent(new Event('pulsio:authenticated'));
  });

  if (setup) {
    return (
      <section className={cx('mx-auto max-w-3xl px-6 py-16', className)}>
        <p className="font-bold text-xs uppercase tracking-widest">Your account is ready</p>
        <h1 className="mt-5 font-semibold text-4xl tracking-tight sm:text-5xl">Your account is ready.</h1>
        <p className="mt-5 text-ink/70 text-lg">Just one line between you and a clearer picture.</p>
        <ol className="mt-10 space-y-6">
          <li className="rounded-2xl border border-ink/15 bg-white p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-semibold text-xl">1. Add snippet to your website</h2>
            </div>
            <TrackingSnippet
              className="mt-5 border-0 bg-transparent p-0 text-pulsio-ink shadow-none"
              snippet={setup.snippet}
              copyIcon
              description="Paste this inside your website’s <head>, or into your website builder’s custom code settings. Publish it on every page you want to track."
              temporarySnippetUrl="/api/snippet"
              temporarySnippetReplacements={{
                '${process.env.API_URL}': runtimeConfig.API_URL,
                '${process.env.WEBAPP_URL}': runtimeConfig.WEBAPP_URL,
                '${process.env.PULSIO_USER_ID}': setup.snippet.match(/data-pulsio-id="([^"]+)"/)?.[1] || '',
              }}
            />
          </li>
          <li className="rounded-2xl border border-ink/15 bg-white p-7">
            <h2 className="font-semibold text-xl">2. Visit your website</h2>
            <p className="mt-3 text-ink/70">Open your website in another tab. We will detect its domain as soon as the first signal arrives.</p>
            <div role="status" aria-live="polite" className="mt-6 flex items-center gap-3 rounded-xl bg-pulsio-surface p-4">
              <span className={cx('h-3 w-3 shrink-0 rounded-full', hasReceivedSignal ? 'bg-emerald-500' : 'bg-amber-500')} />
              <span>{hasReceivedSignal ? 'Tracking detected. Your analytics are ready.' : 'Visit your website to send the first signal. We are checking automatically.'}</span>
            </div>
          </li>
          <li className="rounded-2xl border border-ink/15 bg-white p-7">
            <h2 className="font-semibold text-xl">3. Explore your analytics</h2>
            <p className="mt-3 text-ink/70">Your dashboard is ready!</p>
            <a className="anchor-btn mt-4" href={setup.adminUrl}>
              Open dashboard ↗
            </a>
          </li>
        </ol>
      </section>
    );
  }

  return (
    <section className={cx('mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-2', className)}>
      <div>
        <h1 className="mt-5 font-semibold text-5xl leading-tight tracking-tight">Your next insight starts here.</h1>
        <p className="mt-6 max-w-sm text-ink/70 text-lg leading-relaxed">Create your account, connect your website, and see your first signal in real time.</p>
        <ul className="mt-9 space-y-4 text-sm">
          <li>✓ Your installation snippet, instantly</li>
          <li>✓ See your first signal in real time</li>
          <li>✓ Multiple websites in one account</li>
          <li>✓ Free to use. No card needed.</li>
        </ul>
      </div>
      <FormProvider {...form}>
        <form onSubmit={submit} className="rounded-3xl border border-ink/15 bg-white p-8" noValidate>
          <h2 className="flex flex-col gap-1 font-semibold text-2xl">
            <span>Start using for free.</span>
            <span>No credit card asked.</span>
          </h2>
          <div className="mt-7 space-y-5">
            <Input label="Email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
            <Input label="Password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} name="password" aria-describedby="password-help" />
          </div>
          <p className="mt-5 flex flex-wrap justify-start gap-1 text-center text-ink/60 text-xs">
            By creating your account, you agree and consent to our
            <a href="/terms" className="font-semibold text-pulsio-blue underline underline-offset-2">
              Terms of Service
            </a>
            and
            <a href="/privacy" className="font-semibold text-pulsio-blue underline underline-offset-2">
              Privacy Policy
            </a>
            .
          </p>
          <Button type="submit" disabled={registration.isMutating} size="lg" className="mt-7 w-full rounded-full">
            {registration.isMutating ? 'Creating your account…' : 'Get your snippet ↗'}
          </Button>
          {registration.error && (
            <p role="alert" className="mt-4 font-semibold text-red-700 text-sm">
              {registration.error.message}
            </p>
          )}
        </form>
      </FormProvider>
    </section>
  );
};
