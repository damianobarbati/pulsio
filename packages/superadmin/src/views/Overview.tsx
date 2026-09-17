import useSWR from 'swr';
import { fetcher } from '../requests.ts';

export type Overview = {
  kpis: {
    active_users: number;
    domains_with_events_today: number;
    active_mrr: number;
    paid_this_month: number;
    trials: number;
    locked_users: number;
    new_users_30_days: number;
    payment_risk: number;
    silent_domains_7_days: number;
  };
  trends: { users: Trend[]; revenue: Trend[]; events: Trend[] };
};
type Trend = { day: string; value: number };
const count = (value: number) => new Intl.NumberFormat().format(value);
const money = (amount: number, currency: string) => `${(amount / 100).toFixed(2)} ${currency}`;

export const OverviewView = ({ active }: { active: boolean }) => {
  const { data, error, isLoading } = useSWR<Overview>(active ? '/s/overview' : null, fetcher, { shouldRetryOnError: false });
  if (isLoading)
    return (
      <p className="mt-8" role="status">
        Loading overview…
      </p>
    );
  if (error)
    return (
      <p className="mt-8 text-red-700" role="alert">
        {error.message}
      </p>
    );
  if (!data) return null;
  const { kpis } = data;
  return (
    <div className="mt-8 overflow-scroll pb-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <Kpi label="Paid active users" value={count(kpis.active_users)} hint="Excludes trials" />
        <Kpi label="Month revenue" value={money(kpis.paid_this_month, '$')} />
        <Kpi label="MRR" value={money(kpis.active_mrr, '$')} hint="Paid current periods only" />
        <Kpi label="Payment risk" value={count(kpis.payment_risk)} hint="Past due or unpaid" tone={kpis.payment_risk ? 'warning' : undefined} />
        <span />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Kpi label="Domains active" value={count(kpis.domains_with_events_today)} hint="Events sent today" />
        <Kpi label="Domains silent" value={count(kpis.silent_domains_7_days)} hint="No event in 7 days" tone={kpis.silent_domains_7_days ? 'warning' : undefined} />
        <Kpi label="New users (30d)" value={count(kpis.new_users_30_days)} />
        <Kpi label="Trial users" value={count(kpis.trials)} />
        <Kpi label="Locked users" value={count(kpis.locked_users)} />
      </div>
      <div className="mt-7 grid gap-5 xl:grid-cols-3">
        <TrendChart title="User growth" subtitle="New users per day · last 30 days" data={data.trends.users} color="#2563eb" />
        <TrendChart title="Revenue growth" subtitle="Paid USD per day · last 30 days" data={data.trends.revenue} color="#059669" format={(value) => money(value, 'USD')} />
        <TrendChart title="Event growth" subtitle="Events per day · last 30 days" data={data.trends.events} color="#7c3aed" />
      </div>
    </div>
  );
};

const Kpi = ({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'warning' }) => (
  <section className={`rounded-[var(--radius-lg)] border p-5 ${tone ? 'border-amber-300 bg-amber-50' : 'border-pulsio-line bg-white'}`}>
    <p className="text-pulsio-muted text-sm">{label}</p>
    <p className="mt-2 font-semibold text-3xl tracking-tight">{value}</p>
    {hint ? <p className="mt-2 text-pulsio-muted text-xs">{hint}</p> : null}
  </section>
);
const TrendChart = ({ title, subtitle, data, color, format = count }: { title: string; subtitle: string; data: Trend[]; color: string; format?: (value: number) => string }) => {
  const maximum = Math.max(...data.map((item) => item.value), 1);
  const points = data.map((item, index) => `${(index / Math.max(data.length - 1, 1)) * 100},${100 - (item.value / maximum) * 86 - 7}`).join(' ');
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className="rounded-[var(--radius-lg)] border border-pulsio-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">{title}</h2>
          <p className="mt-1 text-pulsio-muted text-xs">{subtitle}</p>
        </div>
        <strong>{format(total)}</strong>
      </div>
      <svg className="mt-5 h-48 w-full" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={title}>
        <line x1="0" x2="100" y1="93" y2="93" stroke="#e2e8f0" strokeWidth="1" />
        <polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-pulsio-muted text-xs">
        <span>{data[0]?.day}</span>
        <span>{data.at(-1)?.day}</span>
      </div>
    </section>
  );
};
