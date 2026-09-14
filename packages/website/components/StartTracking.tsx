'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

type Registration = { email: string; password: string; domain: string; plan: 'start' | 'grow' | 'scale' };
type Setup = { domain: string; snippet: string; detected: boolean; adminUrl: string };

const apiPath = (path: string) => {
  const url = new URL(path, process.env.API_URL as string).toString();
  return url;
};

const readSetup = async (url: string): Promise<Setup> => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('We could not check your installation. Please try again.');
  const result = await response.json();
  return result;
};

const registerAccount = async (url: string, { arg }: { arg: Registration }): Promise<Setup> => {
  const response = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arg) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'We could not create your account. Please try again.');
  return result;
};

export const StartTracking = () => {
  const form = useForm<Registration>({ defaultValues: { plan: 'start' } });
  React.useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get('plan');
    if (plan === 'grow' || plan === 'scale') form.setValue('plan', plan);
  }, [form]);
  const registration = useSWRMutation(apiPath('/auth/register'), registerAccount);
  const [account, setAccount] = React.useState<Setup | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState('');
  const status = useSWR(apiPath('/account/setup'), readSetup, { refreshInterval: (data) => (data || account ? 2000 : 0), shouldRetryOnError: false });
  const setup = status.data || account;

  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await registration.trigger(values);
      setAccount(result);
      await status.mutate(result);
    } catch {}
  });

  const copy = async () => {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.snippet);
      setCopied(true);
      setCopyError('');
    } catch {
      setCopyError('Copy is unavailable in this browser. Select the snippet and copy it manually.');
    }
  };

  if (setup) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16">
        <p className="font-bold text-xs uppercase tracking-widest">Your account is ready</p>
        <h1 className="mt-5 font-semibold text-4xl tracking-tight sm:text-5xl">Let’s connect {setup.domain}.</h1>
        <p className="mt-5 text-ink/70 text-lg">Just one line between you and a clearer picture.</p>
        <ol className="mt-10 space-y-6">
          <li className="rounded-2xl border border-ink/15 bg-white p-7">
            <h2 className="font-semibold text-xl">1. Add your snippet</h2>
            <p className="mt-3 text-ink/70">
              Paste this inside the <code>&lt;head&gt;</code> of your website, or into your website builder’s custom code settings. Publish it on every page you want to track.
            </p>
            <pre className="mt-5 overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-ink p-5 text-accent text-sm">
              <code>{setup.snippet}</code>
            </pre>
            <button type="button" onClick={copy} className="mt-4 rounded-full bg-ink px-5 py-3 font-semibold text-sm text-white">
              {copied ? 'Copied!' : 'Copy snippet'}
            </button>
            <p role="status" className="mt-2 text-sm">
              {copyError}
            </p>
          </li>
          <li className="rounded-2xl border border-ink/15 bg-white p-7">
            <h2 className="font-semibold text-xl">2. Visit your website</h2>
            <p className="mt-3 text-ink/70">Open your website in another tab. We will confirm as soon as your first signal arrives.</p>
            <a href={`https://${setup.domain}`} target="_blank" rel="noreferrer" className="mt-4 inline-block font-semibold underline underline-offset-4">
              Visit {setup.domain} ↗
            </a>
            <div role="status" aria-live="polite" className="mt-6 flex items-center gap-3 rounded-xl bg-paper p-4">
              <span className={`h-3 w-3 shrink-0 rounded-full ${setup.detected ? 'bg-green-600' : 'animate-pulse bg-amber-500 motion-reduce:animate-none'}`} />
              <span>{setup.detected ? 'Tracking detected successfully!' : 'Waiting for the first signal…'}</span>
            </div>
            {status.error && (
              <p role="alert" className="mt-3 text-red-700 text-sm">
                {status.error.message}
              </p>
            )}
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer">No signal yet?</summary>
              <p className="mt-3 text-ink/70">
                Check that your changes are published, the domain matches, and the snippet is present in your page source. A browser extension or content security policy may block
                the script. Try a browser with extensions disabled.
              </p>
            </details>
          </li>
          <li className="rounded-2xl bg-ink p-7 text-white">
            <h2 className="font-semibold text-xl">3. Explore your analytics</h2>
            <p className="mt-3 text-white/75">
              Your dashboard is ready. Add more websites and see your visitors, top pages, and traffic sources in one place. Everything is free for now.
            </p>
            <a href={setup.adminUrl} className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-semibold text-ink">
              Open dashboard ↗
            </a>
          </li>
        </ol>
        <a href={setup.adminUrl} className="mt-7 inline-block font-semibold underline underline-offset-4">
          Go to your admin
        </a>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-2">
      <div>
        <p className="font-bold text-xs uppercase tracking-widest">Start tracking</p>
        <h1 className="mt-5 font-semibold text-5xl leading-tight tracking-tight">
          Your next insight
          <br />
          starts here.
        </h1>
        <p className="mt-6 max-w-sm text-ink/70 text-lg leading-relaxed">Create your account, connect your website, and see your first signal in real time.</p>
        <ul className="mt-9 space-y-4 text-sm">
          <li>✓ Your installation snippet, instantly</li>
          <li>✓ See your first signal in real time</li>
          <li>✓ Multiple websites in one account</li>
          <li>✓ Free to use. No card needed.</li>
        </ul>
      </div>
      <form onSubmit={submit} className="rounded-3xl border border-ink/15 bg-white p-8">
        <h2 className="font-semibold text-2xl">Make yourself at home.</h2>
        <p className="mt-2 text-ink/65 text-sm">Three fields. Then you are ready to install.</p>
        <div className="mt-7 space-y-5">
          <label className="block font-semibold text-sm">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              {...form.register('email')}
              className="mt-2 block w-full rounded-xl border border-ink/25 px-4 py-3 font-normal"
              placeholder="you@example.com"
            />
          </label>
          <label className="block font-semibold text-sm">
            Password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              {...form.register('password')}
              className="mt-2 block w-full rounded-xl border border-ink/25 px-4 py-3 font-normal"
              aria-describedby="password-help"
            />
            <span id="password-help" className="mt-2 block font-normal text-ink/65 text-xs">
              Use at least 12 characters.
            </span>
          </label>
          <label className="block font-semibold text-sm">
            Website domain
            <input
              type="text"
              autoComplete="url"
              required
              {...form.register('domain')}
              className="mt-2 block w-full rounded-xl border border-ink/25 px-4 py-3 font-normal"
              placeholder="your-site.com"
            />
          </label>
          <input type="hidden" {...form.register('plan')} />
        </div>
        {registration.error && (
          <p role="alert" className="mt-5 text-red-700 text-sm">
            {registration.error.message}
          </p>
        )}
        <button disabled={registration.isMutating} className="mt-7 w-full rounded-full bg-ink px-6 py-4 font-semibold text-white disabled:opacity-60">
          {registration.isMutating ? 'Creating your account…' : 'Create account & get snippet ↗'}
        </button>
        <p className="mt-4 text-center text-ink/65 text-xs">No card needed to get started.</p>
      </form>
    </section>
  );
};
