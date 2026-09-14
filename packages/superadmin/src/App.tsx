import React from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher, mutation } from './requests.ts';

type Account = { id: string; email: string; created_at: string; suspended_at: string | null; site_count: number; detected_site_count: number };
type Accounts = { accounts: Account[]; page: number; pages: number; total: number };
type Details = {
  account: { id: string; email: string; created_at: string; suspended_at: string | null; last_login_at: string | null };
  usage: { site_count: number; detected_site_count: number; events: number; visitors: number; latest_event_at: string | null };
  sites: { id: string; domain: string; detected: boolean; created_at: string; pageviews: number; visitors: number; events_last_30_days: number; latest_event_at: string | null }[];
  payments: { id: string; amount: number; currency: string; status: string; created_at: string }[];
  audit: { action: string; ip_address: string; site_id: string | null; created_at: string }[];
};

const dateTime = (value: string | null) => (value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Never');
const count = (value: number) => new Intl.NumberFormat().format(value);

export const App = () => {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [accountId, setAccountId] = React.useState<string | null>(null);
  const accounts = useSWR<Accounts>(`/superadmin/accounts?query=${encodeURIComponent(query)}&page=${page}`, fetcher, { shouldRetryOnError: false });
  const details = useSWR<Details>(accountId ? `/superadmin/accounts/${accountId}` : null, fetcher, { shouldRetryOnError: false });
  const action = useSWRMutation('superadmin-action', mutation);
  const refresh = async () => {
    await accounts.mutate();
    await details.mutate();
  };
  const runAction = async ({ url, method, confirmation }: { url: string; method: 'POST' | 'DELETE'; confirmation?: string }) => {
    if (confirmation && !window.confirm(confirmation)) return;
    try {
      await action.trigger({ url, method });
      await refresh();
      if (method === 'DELETE' && url.includes('/accounts/')) setAccountId(null);
    } catch {}
  };

  if (accounts.isLoading)
    return (
      <main className="grid min-h-screen place-items-center" role="status">
        Loading superadmin…
      </main>
    );
  if (accounts.error)
    return (
      <main className="mx-auto grid min-h-screen max-w-lg place-items-center p-6">
        <section>
          <h1 className="font-bold text-3xl">Access denied</h1>
          <p role="alert" className="mt-3">
            {accounts.error.message}
          </p>
          <button type="button" className="mt-6 rounded-lg bg-slate-950 px-4 py-2 text-white" onClick={() => accounts.mutate()}>
            Try again
          </button>
        </section>
      </main>
    );

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <header className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-500 text-sm uppercase tracking-[0.2em]">Pulsio</p>
          <h1 className="font-bold text-3xl">Superadmin</h1>
        </div>
        <label className="w-full sm:w-80">
          <span className="sr-only">Search users</span>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            placeholder="Search email or domain"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </header>
      <section className="mx-auto mt-8 max-w-7xl rounded-xl border border-slate-200 bg-white">
        <div className="border-slate-200 border-b p-4 text-slate-500 text-sm">{accounts.data?.total || 0} accounts</div>
        {!accounts.data?.accounts.length ? (
          <p className="p-8 text-slate-500">No accounts match this search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4">Email</th>
                  <th>Sites</th>
                  <th>Detected</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.data.accounts.map((account) => (
                  <tr key={account.id} className="cursor-pointer border-slate-100 border-t hover:bg-slate-50" onClick={() => setAccountId(account.id)}>
                    <td className="p-4 font-medium">{account.email}</td>
                    <td>{count(account.site_count)}</td>
                    <td>{count(account.detected_site_count)}</td>
                    <td>{dateTime(account.created_at)}</td>
                    <td>{account.suspended_at ? 'Suspended' : 'Active'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-between border-slate-200 border-t p-4">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {accounts.data?.pages || 1}
          </span>
          <button type="button" disabled={page === accounts.data?.pages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      </section>
      {accountId && (
        <div className="fixed inset-0 z-10 overflow-y-auto bg-slate-950/40 p-3 sm:p-8">
          <section className="mx-auto max-w-4xl rounded-xl bg-white p-5 shadow-xl">
            <button type="button" className="float-right" onClick={() => setAccountId(null)}>
              Close
            </button>
            {details.isLoading && <p role="status">Loading account…</p>}
            {details.error && <p role="alert">{details.error.message}</p>}
            {details.data && <AccountDetails details={details.data} busy={action.isMutating} onAction={runAction} />}
          </section>
        </div>
      )}
    </main>
  );
};

type AccountDetailsProps = { details: Details; busy: boolean; onAction: (input: { url: string; method: 'POST' | 'DELETE'; confirmation?: string }) => Promise<void> };
const AccountDetails = ({ details, busy, onAction }: AccountDetailsProps) => {
  const { account } = details;
  const url = `/superadmin/accounts/${account.id}`;
  return (
    <div>
      <p className="text-slate-500 text-sm">Account</p>
      <h2 className="mt-1 font-bold text-2xl">{account.email}</h2>
      <p className="mt-2 text-slate-600">
        Created {dateTime(account.created_at)} · Last login {dateTime(account.last_login_at)}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button disabled={busy} className="rounded-lg border px-3 py-2" type="button" onClick={() => onAction({ url: `${url}/sessions/revoke`, method: 'POST' })}>
          Revoke sessions
        </button>
        <button
          disabled={busy}
          className="rounded-lg border px-3 py-2"
          type="button"
          onClick={() => onAction({ url: `${url}/${account.suspended_at ? 'reactivate' : 'suspend'}`, method: 'POST' })}
        >
          {account.suspended_at ? 'Reactivate' : 'Suspend'}
        </button>
        <button
          disabled={busy}
          className="rounded-lg bg-red-700 px-3 py-2 text-white"
          type="button"
          onClick={() => onAction({ url, method: 'DELETE', confirmation: 'Delete this account and all of its analytics data?' })}
        >
          Delete account
        </button>
      </div>
      <h3 className="mt-8 font-bold text-lg">Last 30 days</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Sites', details.usage.site_count],
          ['Detected', details.usage.detected_site_count],
          ['Events', details.usage.events],
          ['Visitors', details.usage.visitors],
          ['Latest event', dateTime(details.usage.latest_event_at)],
        ].map(([name, value]) => (
          <div key={String(name)} className="rounded-lg bg-slate-100 p-3">
            <dt className="text-slate-500 text-xs">{name}</dt>
            <dd className="mt-1 font-semibold">{typeof value === 'number' ? count(value) : value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-8 font-bold text-lg">Tracked websites</h3>
      <div className="mt-3 space-y-3">
        {details.sites.map((site) => (
          <details key={site.id} className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">
              {site.domain} · {site.detected ? 'Detected' : 'Not detected'}
            </summary>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p>
                {count(site.pageviews)} saved pageviews · {count(site.events_last_30_days)} in last 30 days · {count(site.visitors)} visitors · Last activity{' '}
                {dateTime(site.latest_event_at)}
              </p>
              <button
                disabled={busy}
                type="button"
                className="text-red-700 underline"
                onClick={() => onAction({ url: `${url}/sites/${site.id}/data`, method: 'DELETE', confirmation: `Reset all analytics data for ${site.domain}?` })}
              >
                Reset analytics data
              </button>
            </div>
          </details>
        ))}
      </div>
      <h3 className="mt-8 font-bold text-lg">Payments</h3>
      {details.payments.length ? (
        <ul className="mt-3 space-y-2">
          {details.payments.map((payment) => (
            <li key={payment.id}>
              {(payment.amount / 100).toFixed(2)} {payment.currency} · {payment.status} · {dateTime(payment.created_at)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-slate-500">No payment records.</p>
      )}
      <h3 className="mt-8 font-bold text-lg">Staff audit log</h3>
      {details.audit.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {details.audit.map((entry, index) => (
            <li key={`${entry.created_at}-${index}`}>
              {dateTime(entry.created_at)} · {entry.action} · {entry.ip_address}
              {entry.site_id ? ` · ${entry.site_id}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-slate-500">No staff actions.</p>
      )}
    </div>
  );
};
