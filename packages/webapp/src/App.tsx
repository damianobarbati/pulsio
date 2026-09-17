import React from 'react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { Button, Card, Input, Select, Spinner } from 'ui';
import { useLocation } from 'wouter';
import { Dashboard } from './Dashboard.tsx';
import { IChart, IGlobe, IHome, ILogout, IReport, ISettings } from './icons.tsx';
import { deleteMutation, fetcher, mutation } from './requests.ts';

type Site = { id: string; domain: string; detected: boolean; automaticallyDiscovered: boolean; snippet: string; adminUrl: string };
type Account = { email: string; sites: Site[]; trial_ends_at: string };
type Billing = {
  plan: 'start' | 'grow' | 'scale';
  interval: 'month' | 'year';
  status: string;
  trial_ends_at: string;
  current_period_ends_at: string | null;
  cancel_at_period_end: boolean;
  has_stripe_subscription: boolean;
};
type Payment = { id: string; amount: number; currency: string; status: string; created_at: string; invoice_url: string | null };
const planPrices: Record<Billing['plan'], { monthly: string; yearly: string }> = {
  start: { monthly: '$4/month', yearly: '$38.40/year' },
  grow: { monthly: '$10/month', yearly: '$96/year' },
  scale: { monthly: '$30/month', yearly: '$288/year' },
};
export const App = () => {
  const [location, navigate] = useLocation();
  React.useEffect(() => () => navigate('/'), [navigate]);
  const account = useSWR<Account>('/account', fetcher, { refreshInterval: 3000, shouldRetryOnError: false });
  const [siteId, setSiteId] = React.useState(new URLSearchParams(window.location.search).get('site') || '');
  const showSettings = location === '/websites';
  const setShowSettings = (value: boolean) => navigate(value ? '/websites' : '/');
  const [resetSiteId, setResetSiteId] = React.useState<string | null>(null);
  const [deleteAccount, setDeleteAccount] = React.useState(false);
  const loginForm = useForm<{ email: string; password: string }>();
  const siteForm = useForm<{ domain: string }>();
  const login = useSWRMutation('/auth/login', mutation);
  const addSite = useSWRMutation('/sites', mutation);
  const logout = useSWRMutation('/auth/logout', mutation);
  const resetSiteData = useSWRMutation('/sites/data', deleteMutation);
  const removeAccount = useSWRMutation('/account', deleteMutation);
  const billing = useSWR<Billing>('/billing', fetcher);
  const payments = useSWR<Payment[]>('/payments', fetcher);
  const checkout = useSWRMutation('/billing/checkout', mutation);
  const cancelRenewal = useSWRMutation('/billing/cancel', mutation);
  const [plan, setPlan] = React.useState<Billing['plan']>('start');
  const [interval, setInterval] = React.useState<Billing['interval']>('month');
  React.useEffect(() => {
    const openBilling = () => setShowSettings(true);
    window.addEventListener('pulsio:billing', openBilling);
    return () => window.removeEventListener('pulsio:billing', openBilling);
  }, []);
  const selected = account.data ? account.data.sites.find((site) => site.id === siteId) || account.data.sites[0] : undefined;
  const submitLogin = loginForm.handleSubmit(async (values) => {
    try {
      await login.trigger(values);
      await account.mutate();
    } catch {}
  });
  const submitSite = siteForm.handleSubmit(async (values) => {
    try {
      const site = await addSite.trigger(values);
      await account.mutate();
      setSiteId(site.id);
      siteForm.reset();
      setShowSettings(false);
    } catch {}
  });
  const signOut = async () => {
    try {
      await logout.trigger({});
      window.location.assign('/');
    } catch {}
  };
  const resetSite = async (siteId: string) => {
    try {
      await resetSiteData.trigger({ site: siteId });
      setResetSiteId(null);
      await account.mutate();
    } catch {}
  };
  const deleteCurrentAccount = async () => {
    try {
      await removeAccount.trigger({});
      window.location.assign('/');
    } catch {}
  };
  const startCheckout = async () => {
    try {
      const result = await checkout.trigger({ plan, interval });
      window.location.assign(result.url);
    } catch {}
  };
  const disableRenewal = async () => {
    try {
      await cancelRenewal.trigger({});
      await billing.mutate();
    } catch {}
  };

  if (account.isLoading)
    return (
      <main className="grid min-h-screen place-items-center" role="status">
        <Spinner label="Loading your account" />
      </main>
    );
  if (!account.data && account.error && account.error.status !== 401)
    return (
      <main className="mx-auto max-w-lg p-10">
        <h1 className="font-semibold text-2xl">We could not load your account.</h1>
        <p role="alert" className="mt-4">
          {account.error.message}
        </p>
        <Button className="mt-5" onClick={() => account.mutate()}>
          Try again
        </Button>
      </main>
    );
  if (!account.data)
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <a href={window.config.WEBSITE_URL} className="font-black text-4xl tracking-tighter">
          Pulsio.
        </a>
        <h1 className="mt-10 font-semibold text-3xl">Welcome back.</h1>
        <p className="mt-3 text-emerald-950/65">Your websites, at a glance.</p>
        <form onSubmit={submitLogin} className="mt-8 space-y-5">
          <label className="block font-semibold text-sm">
            Email
            <Input type="email" autoComplete="email" required {...loginForm.register('email')} className="mt-2" />
          </label>
          <label className="block font-semibold text-sm">
            Password
            <Input type="password" autoComplete="current-password" required {...loginForm.register('password')} className="mt-2" />
          </label>
          {login.error && (
            <p role="alert" className="text-red-700 text-sm">
              {login.error.message}
            </p>
          )}
          <Button type="submit" disabled={login.isMutating} className="w-full">
            {login.isMutating ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
        <a href={`${window.config.WEBSITE_URL}/start-tracking`} className="mt-6 text-sm underline underline-offset-4">
          New here? Create an account
        </a>
      </main>
    );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="w-48 border-pulsio-line border-b bg-pulsio-nav px-5 py-6 lg:flex lg:min-h-screen lg:flex-col lg:border-r lg:border-b-0">
        <a href="/" className="font-black text-3xl text-pulsio-blue tracking-tighter">
          Pulsio
        </a>
        <nav aria-label="App navigation" className="mt-10 flex gap-2 overflow-x-auto lg:flex-col">
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            aria-current={!showSettings ? 'page' : undefined}
            className={`inline-flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left font-medium text-sm ${!showSettings ? 'bg-blue-100 text-pulsio-blue' : 'text-slate-600 hover:bg-white/70'}`}
          >
            <IHome size={20} />
            Overview
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label="Websites & account"
            aria-current={showSettings ? 'page' : undefined}
            className={`inline-flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left font-medium text-sm ${showSettings ? 'bg-blue-100 text-pulsio-blue' : 'text-slate-600 hover:bg-white/70'}`}
          >
            <IGlobe size={20} />
            Websites
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="inline-flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left font-medium text-slate-600 text-sm hover:bg-white/70"
          >
            <IChart size={20} />
            Analytics
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="inline-flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left font-medium text-slate-600 text-sm hover:bg-white/70"
          >
            <IReport size={20} />
            Reports
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left font-medium text-slate-600 text-sm hover:bg-white/70"
          >
            <ISettings size={20} />
            Settings
          </button>
          <button
            type="button"
            onClick={signOut}
            disabled={logout.isMutating}
            className="inline-flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left font-medium text-slate-600 text-sm hover:bg-white/70"
          >
            <ILogout size={20} />
            Sign out
          </button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-9 lg:py-6">
        {logout.error && (
          <p role="alert" className="mb-5 text-red-700">
            {logout.error.message}
          </p>
        )}
        {showSettings ? (
          <section className="max-w-2xl">
            <p className="font-semibold text-xs uppercase tracking-widest">Your workspace</p>
            <h1 className="mt-3 font-semibold text-4xl tracking-tight">Websites & account</h1>
            <p className="mt-5">
              Signed in as <strong>{account.data.email}</strong>
            </p>
            <p className="mt-3 text-emerald-950/65">Your analytics are available during your 30-day trial. Events are always collected.</p>
            <Card className="mt-8">
              <p className="font-semibold text-xs uppercase tracking-widest">Billing</p>
              <h2 className="mt-3 font-semibold text-xl">Plan and invoices</h2>
              {billing.data && (
                <p className="mt-3 text-emerald-950/65 text-sm">
                  {billing.data.status === 'active' ? `Your ${billing.data.plan} plan is active.` : `Trial ends ${new Date(billing.data.trial_ends_at).toLocaleDateString()}.`}
                  {billing.data.cancel_at_period_end &&
                    billing.data.current_period_ends_at &&
                    ` Renewal ends ${new Date(billing.data.current_period_ends_at).toLocaleDateString()}.`}
                </p>
              )}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="font-semibold text-sm">
                  Plan
                  <Select value={plan} onChange={(event) => setPlan(event.target.value as Billing['plan'])} className="mt-2 font-normal">
                    <option value="start">Start · $4/month</option>
                    <option value="grow">Grow · $10/month</option>
                    <option value="scale">Scale · $30/month</option>
                  </Select>
                </label>
                <fieldset className="font-semibold text-sm sm:col-span-2">
                  <legend>Billing period</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-emerald-950/5 p-1" role="group" aria-label="Billing period">
                    <button
                      type="button"
                      aria-pressed={interval === 'month'}
                      onClick={() => setInterval('month')}
                      className={`rounded-xl px-4 py-3 text-left transition ${interval === 'month' ? 'bg-white text-emerald-950 shadow-sm' : 'text-emerald-950/65 hover:text-emerald-950'}`}
                    >
                      <span className="block">Monthly</span>
                      <span className="font-normal text-xs">{planPrices[plan].monthly}</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={interval === 'year'}
                      onClick={() => setInterval('year')}
                      className={`rounded-xl px-4 py-3 text-left transition ${interval === 'year' ? 'bg-white text-emerald-950 shadow-sm' : 'text-emerald-950/65 hover:text-emerald-950'}`}
                    >
                      <span className="flex items-center gap-2">
                        Yearly <span className="rounded-full bg-lime-200 px-2 py-0.5 font-bold text-[10px] uppercase tracking-wide">Save 20%</span>
                      </span>
                      <span className="font-normal text-xs">{planPrices[plan].yearly}</span>
                    </button>
                  </div>
                </fieldset>
              </div>
              <button
                type="button"
                disabled={checkout.isMutating}
                onClick={startCheckout}
                className="mt-5 rounded-full bg-emerald-950 px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {checkout.isMutating ? 'Opening checkout…' : billing.data?.status === 'active' ? 'Change plan' : 'Choose plan & continue'}
              </button>
              {checkout.error && (
                <p role="alert" className="mt-3 text-red-700 text-sm">
                  {checkout.error.message}
                </p>
              )}
              {billing.data?.has_stripe_subscription && !billing.data.cancel_at_period_end && (
                <button
                  type="button"
                  disabled={cancelRenewal.isMutating}
                  onClick={disableRenewal}
                  className="ml-4 font-semibold text-red-700 text-sm underline underline-offset-4 disabled:opacity-50"
                >
                  {cancelRenewal.isMutating ? 'Disabling renewal…' : 'Disable automatic renewal'}
                </button>
              )}
              {cancelRenewal.error && (
                <p role="alert" className="mt-3 text-red-700 text-sm">
                  {cancelRenewal.error.message}
                </p>
              )}
              <h3 className="mt-8 font-semibold text-lg">Invoices</h3>
              {payments.data?.length ? (
                <ul className="mt-3 divide-y divide-emerald-950/10 rounded-xl border border-emerald-950/15">
                  {payments.data
                    .filter((payment) => payment.status === 'paid')
                    .map((payment) => (
                      <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                        <span>
                          {new Date(payment.created_at).toLocaleDateString()} ·{' '}
                          {(payment.amount / 100).toLocaleString(undefined, { style: 'currency', currency: payment.currency })}
                        </span>
                        {payment.invoice_url && (
                          <a href={payment.invoice_url} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
                            Download invoice
                          </a>
                        )}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mt-3 text-emerald-950/65 text-sm">Paid invoices will appear here.</p>
              )}
            </Card>
            <h2 className="mt-10 font-semibold text-xl">Your websites</h2>
            <ul className="mt-5 space-y-3">
              {account.data.sites.map((site) => (
                <li key={site.id} className="flex flex-wrap justify-between gap-4 rounded-xl border border-emerald-950/15 bg-white p-5">
                  <span>{site.domain}</span>
                  <button
                    className="font-semibold underline underline-offset-4"
                    type="button"
                    onClick={() => {
                      setSiteId(site.id);
                      setShowSettings(false);
                    }}
                  >
                    Open website ↗
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={submitSite} className="mt-8 rounded-2xl border border-emerald-950/15 bg-white p-6">
              <h2 className="font-semibold text-xl">Add another website</h2>
              <label className="mt-5 block font-semibold text-sm">
                Website domain
                <input required placeholder="another-site.com" {...siteForm.register('domain')} className="mt-2 w-full rounded-xl border border-emerald-950/25 px-4 py-3" />
              </label>
              {addSite.error && (
                <p role="alert" className="mt-3 text-red-700">
                  {addSite.error.message}
                </p>
              )}
              <button disabled={addSite.isMutating} className="mt-5 rounded-full bg-emerald-950 px-6 py-3 font-semibold text-white disabled:opacity-50">
                {addSite.isMutating ? 'Adding website…' : 'Add website'}
              </button>
            </form>
            <section className="mt-8 rounded-2xl border border-red-700/30 bg-red-50 p-6">
              <p className="font-semibold text-red-800 text-xs uppercase tracking-widest">Danger zone</p>
              <h2 className="mt-3 font-semibold text-xl">Permanently delete data</h2>
              <p className="mt-3 text-red-950/75">These actions cannot be undone.</p>
              <div className="mt-6 space-y-4">
                {account.data.sites.map((site) => (
                  <div key={site.id} className="rounded-xl border border-red-700/20 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">Reset site data</h3>
                        <p className="mt-1 text-red-950/70 text-sm">Delete every recorded event for {site.domain}.</p>
                      </div>
                      <button type="button" onClick={() => setResetSiteId(site.id)} className="rounded-full border border-red-700 px-5 py-2 font-semibold text-red-700 text-sm">
                        Reset data
                      </button>
                    </div>
                    {resetSiteId === site.id && (
                      <div className="mt-4 flex flex-wrap items-center gap-4 border-red-700/20 border-t pt-4 text-sm">
                        <p className="font-semibold">Delete all events for {site.domain}?</p>
                        <button type="button" disabled={resetSiteData.isMutating} onClick={() => resetSite(site.id)} className="font-semibold text-red-700 disabled:opacity-50">
                          {resetSiteData.isMutating ? 'Resetting…' : 'Yes, reset data'}
                        </button>
                        <button type="button" onClick={() => setResetSiteId(null)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="rounded-xl border border-red-700/20 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">Delete account</h3>
                      <p className="mt-1 text-red-950/70 text-sm">Delete your account and every event recorded for all its websites.</p>
                    </div>
                    <button type="button" onClick={() => setDeleteAccount(true)} className="rounded-full bg-red-700 px-5 py-2 font-semibold text-sm text-white">
                      Delete account
                    </button>
                  </div>
                  {deleteAccount && (
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-red-700/20 border-t pt-4 text-sm">
                      <p className="font-semibold">Delete this account and all its data?</p>
                      <button type="button" disabled={removeAccount.isMutating} onClick={deleteCurrentAccount} className="font-semibold text-red-700 disabled:opacity-50">
                        {removeAccount.isMutating ? 'Deleting…' : 'Yes, delete account'}
                      </button>
                      <button type="button" onClick={() => setDeleteAccount(false)}>
                        Cancel
                      </button>
                    </div>
                  )}
                  {removeAccount.error && (
                    <p role="alert" className="mt-4 text-red-700 text-sm">
                      {removeAccount.error.message}
                    </p>
                  )}
                </div>
              </div>
              {resetSiteData.error && (
                <p role="alert" className="mt-4 text-red-700 text-sm">
                  {resetSiteData.error.message}
                </p>
              )}
            </section>
          </section>
        ) : selected ? (
          <Dashboard key={selected.id} sites={account.data.sites} selected={selected} onSite={setSiteId} />
        ) : (
          <p>Add a website to start tracking.</p>
        )}
      </main>
    </div>
  );
};
