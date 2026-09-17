import React from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import useSWRMutation from 'swr/mutation';
import { Button, Input } from 'ui';
import { useLocation } from 'wouter';
import { ICard, IChart, IGlobe, ILogout, IUsers } from './icons.tsx';
import { Router } from './Router.tsx';
import { fetcher, logout, mutation } from './requests.ts';
import type { Account, Domain, Payment } from './views/index.ts';

type View = 'overview' | 'users' | 'websites' | 'payments';
const views: Record<string, View> = { '/': 'overview', '/users': 'users', '/websites': 'websites', '/payments': 'payments' };
type Page<T> = { page: number; pages: number; total: number } & ({ accounts: T[] } | { sites: T[] } | { payments: T[] });
type Details = {
  account: {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
    suspended_at: string | null;
    last_login_at: string | null;
    email_verified_at: string | null;
    email_verification_expires_at: string | null;
    trial_ends_at: string;
  };
  subscription: {
    plan: 'start' | 'grow' | 'scale';
    interval: 'month' | 'year';
    status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    cancel_at_period_end: boolean;
    current_period_ends_at: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  usage: { site_count: number; detected_site_count: number; events: number; visitors: number; latest_event_at: string | null };
  sites: { id: string; domain: string; detected: boolean; created_at: string; pageviews: number; visitors: number; events_last_30_days: number; latest_event_at: string | null }[];
  payments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string | null;
    provider_reference: string | null;
    invoice_url: string | null;
    created_at: string;
  }[];
  audit: { action: string; ip_address: string; site_id: string | null; created_at: string }[];
};
type WebsiteDetails = {
  site: { id: string; account_id: string; email: string; domain: string; created_at: string; updated_at: string; detected_at: string | null };
  events: number;
  latest_event_at: string | null;
  pageviews: number;
  visitors: number;
};
const dateTime = (value: string | null) => (value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Never');
const count = (value: number) => new Intl.NumberFormat().format(value);
const money = (amount: number, currency: string) => `${(amount / 100).toFixed(2)} ${currency}`;

type Sort = { id: string; direction: 'asc' | 'desc' };
const usePagedData = <T extends { id: string }>(view: View, query: string, active: boolean, sort: Sort) => {
  const getKey = (pageIndex: number, previousPage: Page<T> | null) => {
    if (!active) return null;
    if (previousPage && previousPage.page >= previousPage.pages) return null;
    const resource = view === 'users' ? 'accounts' : view === 'websites' ? 'websites' : 'payments';
    return `/s/${resource}?query=${encodeURIComponent(query)}&page=${pageIndex + 1}&sort=${encodeURIComponent(sort.id)}&direction=${sort.direction}`;
  };
  const result = useSWRInfinite<Page<T>>(getKey, fetcher, { keepPreviousData: true, revalidateFirstPage: false, shouldRetryOnError: false });
  const pages = result.data || [];
  const rows = Array.from(
    new Map(pages.flatMap((page) => ('accounts' in page ? page.accounts : 'sites' in page ? page.sites : page.payments)).map((row) => [row.id, row])).values(),
  );
  const lastPage = pages.at(-1);
  return { ...result, rows, total: pages[0]?.total || 0, hasMore: Boolean(lastPage && lastPage.page < lastPage.pages) };
};

export const App = () => {
  const [location, navigate] = useLocation();
  const view = location.startsWith('/users') ? 'users' : location.startsWith('/websites') ? 'websites' : location === '/payments' ? 'payments' : 'overview';
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [sorts, setSorts] = React.useState<Record<'users' | 'websites' | 'payments', Sort>>({
    users: { id: 'created_at', direction: 'desc' },
    websites: { id: 'created_at', direction: 'desc' },
    payments: { id: 'created_at', direction: 'desc' },
  });
  React.useEffect(() => {
    if (!views[location] && !location.startsWith('/users/') && !location.startsWith('/websites/')) navigate('/', { replace: true });
  }, [location, navigate]);
  React.useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 500);
    return () => window.clearTimeout(timeout);
  }, [query]);
  const accounts = usePagedData<Account>('users', debouncedQuery, view === 'users', sorts.users);
  const sites = usePagedData<Domain>('websites', debouncedQuery, view === 'websites', sorts.websites);
  const payments = usePagedData<Payment>('payments', debouncedQuery, view === 'payments', sorts.payments);
  const setSort = (target: 'users' | 'websites' | 'payments', id: string) =>
    setSorts((current) => ({ ...current, [target]: { id, direction: current[target].id === id && current[target].direction === 'asc' ? 'desc' : 'asc' } }));
  const signOut = async () => {
    await logout();
    window.dispatchEvent(new Event('superadmin:unauthorized'));
  };

  return (
    <div className="min-h-screen lg:flex lg:h-dvh lg:overflow-hidden">
      <aside className="w-48 border-pulsio-line border-b bg-pulsio-nav px-5 py-6 lg:flex lg:min-h-0 lg:flex-col lg:border-r lg:border-b-0">
        <a href="/" className="font-black text-3xl text-pulsio-blue tracking-tighter">
          Pulsio
        </a>
        <p className="mt-2 text-pulsio-muted text-xs uppercase tracking-[0.2em]">SUPERADMIN</p>
        <nav aria-label="Superadmin navigation" className="mt-10 flex gap-2 overflow-x-auto lg:flex-col">
          <NavItem icon={<IChart size={20} />} label="Overview" active={view === 'overview'} onClick={() => navigate('/')} />
          <NavItem icon={<IUsers size={20} />} label="Users" active={view === 'users'} onClick={() => navigate('/users')} />
          <NavItem icon={<IGlobe size={20} />} label="Websites" active={view === 'websites'} onClick={() => navigate('/websites')} />
          <NavItem icon={<ICard size={20} />} label="Payments" active={view === 'payments'} onClick={() => navigate('/payments')} />
          <button
            type="button"
            className="mt-auto inline-flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left font-medium text-slate-600 text-sm hover:bg-white/70"
            onClick={() => void signOut()}
          >
            <ILogout size={20} />
            Sign out
          </button>
        </nav>
      </aside>
      <main className="flex min-h-screen min-w-0 flex-1 flex-col px-5 py-7 sm:px-8 lg:min-h-0 lg:px-9 lg:py-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="mt-2 font-semibold text-4xl tracking-tight">{view[0].toUpperCase() + view.slice(1)}</h1>
          </div>
          {view !== 'overview' ? (
            <label className="w-full sm:w-80">
              <span className="sr-only">Search {view}</span>
              <Input className="w-full" placeholder={`Search ${view}`} value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          ) : null}
        </header>
        <Router
          users={{
            data: accounts.rows,
            total: accounts.total,
            loading: accounts.isLoading || accounts.isValidating,
            error: accounts.error,
            hasMore: accounts.hasMore,
            onEndReached: () => accounts.setSize(accounts.size + 1),
            onOpen: (account) => navigate(`/users/${account.id}`),
            sort: sorts.users,
            onSort: (id) => setSort('users', id),
          }}
          domains={{
            data: sites.rows,
            total: sites.total,
            loading: sites.isLoading || sites.isValidating,
            error: sites.error,
            hasMore: sites.hasMore,
            onEndReached: () => sites.setSize(sites.size + 1),
            onOpen: (site) => navigate(`/websites/${site.id}`),
            sort: sorts.websites,
            onSort: (id) => setSort('websites', id),
          }}
          payments={{
            data: payments.rows,
            total: payments.total,
            loading: payments.isLoading || payments.isValidating,
            error: payments.error,
            hasMore: payments.hasMore,
            onEndReached: () => payments.setSize(payments.size + 1),
            sort: sorts.payments,
            onSort: (id) => setSort('payments', id),
          }}
          userDrawer={(id) => <UserDrawer accountId={id} onClose={() => navigate('/users')} onChanged={() => void accounts.mutate()} />}
          websiteDrawer={(id) => <WebsiteDrawer siteId={id} onClose={() => navigate('/websites')} onChanged={() => void sites.mutate()} />}
        />
      </main>
    </div>
  );
};

type NavItemProps = { icon: React.ReactNode; label: string; active: boolean; onClick: () => void };
const NavItem = ({ icon, label, active, onClick }: NavItemProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={`inline-flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left font-medium text-sm lg:w-full ${active ? 'bg-blue-100 text-pulsio-blue' : 'text-slate-600 hover:bg-white/70'}`}
  >
    {icon}
    {label}
  </button>
);

type Action = { url: string; method: 'POST' | 'PATCH' | 'DELETE'; body?: unknown };
const Drawer = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOpen(true));
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-slate-950/40" onMouseDown={onClose}>
      <section
        aria-label={title}
        className={`h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl transition-transform duration-200 sm:p-8 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="float-right text-pulsio-muted hover:text-slate-900" onClick={onClose}>
          Close (ESC)
        </button>
        {children}
      </section>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <h3 className="font-bold text-lg">{title}</h3>
    {children}
  </section>
);

const UserDrawer = ({ accountId, onClose, onChanged }: { accountId: string; onClose: () => void; onChanged: () => void }) => {
  const details = useSWR<Details>(`/s/accounts/${accountId}`, fetcher, { shouldRetryOnError: false });
  const action = useSWRMutation('superadmin-action', mutation);
  const [email, setEmail] = React.useState('');
  const [billing, setBilling] = React.useState<Details['subscription']>(null);
  React.useEffect(() => {
    if (details.data) {
      setEmail(details.data.account.email);
      setBilling(details.data.subscription);
    }
  }, [details.data]);
  const run = async (input: Action, confirmation?: string) => {
    if (confirmation && !window.confirm(confirmation)) return;
    await action.trigger(input);
    if (input.method === 'DELETE') {
      onChanged();
      onClose();
      return;
    }
    await details.mutate();
    onChanged();
  };
  if (!details.data)
    return (
      <Drawer title="User details" onClose={onClose}>
        {details.error ? <p role="alert">{details.error.message}</p> : <p role="status">Loading user…</p>}
      </Drawer>
    );
  const { account } = details.data;
  const url = `/s/accounts/${account.id}`;
  return (
    <Drawer title="User details" onClose={onClose}>
      <p className="text-pulsio-muted text-sm">User</p>
      <h2 className="mt-1 font-bold text-2xl">{account.email}</h2>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" disabled={action.isMutating} onClick={() => void run({ url: `${url}/sessions/revoke`, method: 'POST' })}>
          Revoke sessions
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={action.isMutating}
          onClick={() => void run({ url: `${url}/${account.suspended_at ? 'reactivate' : 'suspend'}`, method: 'POST' })}
        >
          {account.suspended_at ? 'Unlock login' : 'Lock login'}
        </Button>
        <Button size="sm" disabled={action.isMutating} onClick={() => void run({ url, method: 'DELETE' }, 'Delete this user and all user data? Payment records will be kept.')}>
          Delete user
        </Button>
      </div>
      <Section title="Account details">
        <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
          {Object.entries({
            'Account ID': account.id,
            Created: dateTime(account.created_at),
            Updated: dateTime(account.updated_at),
            'Email verified': dateTime(account.email_verified_at),
            'Verification expires': dateTime(account.email_verification_expires_at),
            'Trial ends': dateTime(account.trial_ends_at),
            'Last login': dateTime(account.last_login_at),
            'Login locked': account.suspended_at ? dateTime(account.suspended_at) : 'No',
          }).map(([label, value]) => (
            <div key={label}>
              <dt className="text-pulsio-muted">{label}</dt>
              <dd className="break-all font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Email">
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run({ url, method: 'PATCH', body: { email } });
          }}
        >
          <Input className="min-w-0 flex-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Button size="sm" disabled={action.isMutating}>
            Save email
          </Button>
        </form>
      </Section>
      <Section title="Billing">
        <BillingForm billing={billing} busy={action.isMutating} onSave={(value) => void run({ url: `${url}/billing`, method: 'PATCH', body: value })} />
      </Section>
      <Section title="Usage">
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ['Domains', details.data.usage.site_count],
            ['Detected', details.data.usage.detected_site_count],
            ['Events', details.data.usage.events],
            ['Visitors', details.data.usage.visitors],
            ['Latest event', dateTime(details.data.usage.latest_event_at)],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-[var(--radius-md)] bg-pulsio-surface p-3">
              <dt className="text-pulsio-muted text-xs">{label}</dt>
              <dd className="mt-1 font-semibold">{typeof value === 'number' ? count(value) : value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Tracked domains">
        <ul className="mt-3 space-y-2">
          {details.data.sites.map((site) => (
            <li key={site.id} className="rounded border border-pulsio-line p-3">
              <b>{site.domain}</b> · {count(site.pageviews)} pageviews · Last event {dateTime(site.latest_event_at)}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Payments">
        {details.data.payments.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {details.data.payments.map((payment) => (
              <li key={payment.id}>
                {money(payment.amount, payment.currency)} · {payment.status} · {payment.provider || 'No provider'} · {payment.provider_reference || 'No reference'}{' '}
                {payment.invoice_url ? (
                  <a className="text-pulsio-blue underline" href={payment.invoice_url} target="_blank" rel="noreferrer">
                    Invoice
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-pulsio-muted">No payment records.</p>
        )}
      </Section>
      <Section title="Staff audit log">
        {details.data.audit.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {details.data.audit.map((entry, index) => (
              <li key={`${entry.created_at}-${index}`}>
                {dateTime(entry.created_at)} · {entry.action} · {entry.ip_address}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-pulsio-muted">No staff actions.</p>
        )}
      </Section>
    </Drawer>
  );
};

const BillingForm = ({ billing, busy, onSave }: { billing: Details['subscription']; busy: boolean; onSave: (value: NonNullable<Details['subscription']>) => void }) => {
  const [value, setValue] = React.useState(billing);
  React.useEffect(() => setValue(billing), [billing]);
  if (!value) return <p className="mt-3 text-pulsio-muted">No subscription record.</p>;
  const set = <K extends keyof NonNullable<Details['subscription']>>(key: K, next: NonNullable<Details['subscription']>[K]) => setValue({ ...value, [key]: next });
  return (
    <form
      className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value);
      }}
    >
      <label>
        Plan
        <select className="mt-1 w-full rounded border border-pulsio-line p-2" value={value.plan} onChange={(event) => set('plan', event.target.value as typeof value.plan)}>
          {['start', 'grow', 'scale'].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label>
        Interval
        <select
          className="mt-1 w-full rounded border border-pulsio-line p-2"
          value={value.interval}
          onChange={(event) => set('interval', event.target.value as typeof value.interval)}
        >
          {['month', 'year'].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label>
        Status
        <select className="mt-1 w-full rounded border border-pulsio-line p-2" value={value.status} onChange={(event) => set('status', event.target.value)}>
          {['trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label>
        Current period ends
        <Input
          className="mt-1 w-full"
          type="datetime-local"
          value={value.current_period_ends_at ? value.current_period_ends_at.slice(0, 16) : ''}
          onChange={(event) => set('current_period_ends_at', event.target.value ? new Date(event.target.value).toISOString() : null)}
        />
      </label>
      <label>
        Stripe customer ID
        <Input className="mt-1 w-full" value={value.stripe_customer_id || ''} onChange={(event) => set('stripe_customer_id', event.target.value || null)} />
      </label>
      <label>
        Stripe subscription ID
        <Input className="mt-1 w-full" value={value.stripe_subscription_id || ''} onChange={(event) => set('stripe_subscription_id', event.target.value || null)} />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={value.cancel_at_period_end} onChange={(event) => set('cancel_at_period_end', event.target.checked)} /> Cancel at period end
      </label>
      <div className="flex items-end">
        <Button size="sm" disabled={busy}>
          Save billing
        </Button>
      </div>
    </form>
  );
};

const WebsiteDrawer = ({ siteId, onClose, onChanged }: { siteId: string; onClose: () => void; onChanged: () => void }) => {
  const details = useSWR<WebsiteDetails>(`/s/websites/${siteId}`, fetcher, { shouldRetryOnError: false });
  const action = useSWRMutation('superadmin-site-action', mutation);
  const [, navigate] = useLocation();
  if (!details.data)
    return (
      <Drawer title="Domain details" onClose={onClose}>
        {details.error ? <p role="alert">{details.error.message}</p> : <p role="status">Loading domain…</p>}
      </Drawer>
    );
  const { site } = details.data;
  const reset = async () => {
    if (!window.confirm(`Reset all analytics data for ${site.domain}?`)) return;
    await action.trigger({ url: `/s/accounts/${site.account_id}/sites/${site.id}/data`, method: 'DELETE' });
    await details.mutate();
    onChanged();
  };
  return (
    <Drawer title="Domain details" onClose={onClose}>
      <p className="text-pulsio-muted text-sm">Tracked domain</p>
      <h2 className="mt-1 font-bold text-2xl">{site.domain}</h2>
      <Section title="Details">
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          {Object.entries({
            'Domain ID': site.id,
            Owner: site.email,
            Created: dateTime(site.created_at),
            Updated: dateTime(site.updated_at),
            'Tracking detected': site.detected_at ? dateTime(site.detected_at) : 'No',
            Events: count(details.data.events),
            Pageviews: count(details.data.pageviews),
            Visitors: count(details.data.visitors),
            'Last event': dateTime(details.data.latest_event_at),
          }).map(([label, value]) => (
            <div key={label}>
              <dt className="text-pulsio-muted">{label}</dt>
              <dd className="break-all font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Owner">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/users/${site.account_id}`)}>
          Open user profile
        </Button>
      </Section>
      <Section title="Actions">
        <Button size="sm" disabled={action.isMutating} onClick={() => void reset()}>
          Reset analytics data
        </Button>
      </Section>
    </Drawer>
  );
};
