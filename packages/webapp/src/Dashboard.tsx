import * as React from 'react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import type { SiteSetup } from 'types/account.ts';
import type { AnalyticsFilter, AnalyticsOverview, Dimension } from 'types/analytics.ts';
import { Chart } from './Chart.tsx';
import { formatMetric } from './format.ts';
import { Goals } from './Goals.tsx';
import { ICalendar, IClose, IDown, IFilter, IGlobe, IUp } from './icons.tsx';
import { Report } from './Report.tsx';
import { fetcher } from './requests.ts';

type DashboardProps = { sites: SiteSetup[]; selected: SiteSetup; onSite: (id: string) => void };
const metricLabels = {
  visitors: 'Unique visitors',
  visits: 'Total visits',
  pageviews: 'Total pageviews',
  viewsPerVisit: 'Views per visit',
  bounceRate: 'Bounce rate',
  visitDuration: 'Visit duration',
  timeOnPage: 'Time on page',
  scrollDepth: 'Scroll depth',
};
const date = (value: number) => new Date(value).toISOString().slice(0, 10);
export const Dashboard = ({ sites, selected, onSite }: DashboardProps) => {
  const [days, setDays] = React.useState('28');
  const [from, setFrom] = React.useState(date(Date.now() - 27 * 86400000));
  const [to, setTo] = React.useState(date(Date.now()));
  const [filters, setFilters] = React.useState<AnalyticsFilter[]>([]);
  const [goal, setGoal] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [showDates, setShowDates] = React.useState(false);
  const [showLive, setShowLive] = React.useState(false);
  const [metric, setMetric] = React.useState<keyof typeof metricLabels>('visitors');
  const [copyMessage, setCopyMessage] = React.useState('');
  const [journeyStart, setJourneyStart] = React.useState('/');
  const [journeyDirection, setJourneyDirection] = React.useState('after');
  const [showJourneys, setShowJourneys] = React.useState(false);
  const filterForm = useForm<{ dimension: Dimension; operator: 'is' | 'is_not' | 'contains'; value: string; key: string }>({
    defaultValues: { dimension: 'page', operator: 'is', value: '', key: '' },
  });
  const query = new URLSearchParams({
    site: selected.id,
    from: `${from}T00:00:00.000Z`,
    to: new Date(Date.parse(`${to}T00:00:00.000Z`) + 86400000).toISOString(),
    filters: JSON.stringify(filters),
    ...(goal ? { goal } : {}),
  }).toString();
  const overview = useSWR<AnalyticsOverview>(`/analytics/overview?${query}`, fetcher, { refreshInterval: 30000 });
  const live = useSWR<{ activeVisitors: number; pages: { name: string; value: number }[] }>(`/analytics/live?site=${selected.id}`, fetcher, {
    refreshInterval: 3000,
    dedupingInterval: 1000,
  });
  const journeys = useSWR<{ source: string; target: string; step: number; visitors: number }[]>(
    showJourneys ? `/analytics/journeys?${query}&start=${encodeURIComponent(journeyStart)}&direction=${journeyDirection}` : null,
    fetcher,
  );
  const addFilter = (filter: AnalyticsFilter) => {
    setFilters((current) => [...current.filter((item) => item.dimension !== filter.dimension || item.key !== filter.key), filter]);
  };
  const applyFilter = filterForm.handleSubmit((input) => {
    addFilter({ ...input, key: input.key || undefined });
    setShowFilters(false);
  });
  const data = overview.data;
  const visibleMetrics = Object.keys(metricLabels).filter(
    (key) => !['timeOnPage', 'scrollDepth'].includes(key) || filters.some((filter) => filter.dimension === 'page'),
  ) as (keyof typeof metricLabels)[];
  const paymentRequired = overview.error?.status === 402;
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2">
            <IGlobe className="text-violet-500" size={21} />
            <span className="sr-only">Selected website</span>
            <select
              value={selected.id}
              onChange={(event) => {
                onSite(event.target.value);
                setFilters([]);
                setGoal('');
              }}
              className="max-w-60 bg-transparent font-semibold text-base"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.domain}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="flex items-center gap-2 text-gray-500 text-sm" onClick={() => setShowLive(!showLive)} aria-expanded={showLive}>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {live.data ? live.data.activeVisitors : '…'} current visitors
          </button>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <button type="button" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2" aria-expanded={showFilters}>
            <IFilter size={18} /> Filter
          </button>
          <button type="button" className="flex items-center gap-2" onClick={() => setShowDates(!showDates)} aria-expanded={showDates}>
            <ICalendar size={18} />
            {days === 'custom' ? `${from} – ${to}` : `Last ${days} days`}
          </button>
        </div>
      </div>
      {showDates && (
        <div className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <label>
            Period
            <select
              aria-label="Date period"
              value={days}
              className="mt-1 block rounded border border-gray-200 p-2"
              onChange={(event) => {
                const next = event.target.value;
                setDays(next);
                if (next !== 'custom') {
                  setFrom(date(Date.now() - (Number(next) - 1) * 86400000));
                  setTo(date(Date.now()));
                }
              }}
            >
              {['1', '7', '28', '90', '365', 'custom'].map((value) => (
                <option key={value} value={value}>
                  {value === 'custom' ? 'Custom range' : `Last ${value} days`}
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              aria-label="From date"
              type="date"
              value={from}
              max={to}
              onChange={(event) => {
                if (event.target.value) {
                  setFrom(event.target.value);
                  setDays('custom');
                }
              }}
              className="mt-1 block rounded border border-gray-200 p-2"
            />
          </label>
          <label>
            To
            <input
              aria-label="To date"
              type="date"
              value={to}
              min={from}
              onChange={(event) => {
                if (event.target.value) {
                  setTo(event.target.value);
                  setDays('custom');
                }
              }}
              className="mt-1 block rounded border border-gray-200 p-2"
            />
          </label>
          <span className="pb-2 text-gray-400">UTC · compared with the previous period</span>
        </div>
      )}
      {showFilters && (
        <form onSubmit={applyFilter} className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <label>
            Dimension
            <select {...filterForm.register('dimension')} className="mt-1 block rounded border border-gray-200 p-2">
              {[
                'page',
                'entry_page',
                'exit_page',
                'source',
                'channel',
                'referrer',
                'utm_source',
                'utm_medium',
                'utm_campaign',
                'utm_content',
                'utm_term',
                'country',
                'region',
                'city',
                'browser',
                'browser_version',
                'os',
                'os_version',
                'device',
                'hostname',
                'property',
                'event',
              ].map((name) => (
                <option key={name} value={name}>
                  {name.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Match
            <select {...filterForm.register('operator')} className="mt-1 block rounded border border-gray-200 p-2">
              <option value="is">is</option>
              <option value="is_not">is not</option>
              <option value="contains">contains</option>
            </select>
          </label>
          {filterForm.watch('dimension') === 'property' && (
            <label>
              Property key
              <input required {...filterForm.register('key')} className="mt-1 block rounded border border-gray-200 p-2" />
            </label>
          )}
          <label>
            Value
            <input required {...filterForm.register('value')} className="mt-1 block rounded border border-gray-200 p-2" />
          </label>
          <button className="rounded bg-violet-600 px-4 py-2 text-white">Apply filter</button>
        </form>
      )}
      {paymentRequired && (
        <section className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-6">
          <h2 className="font-semibold text-lg">Your analytics are paused</h2>
          <p className="mt-2 max-w-2xl text-amber-950/75">
            Events are still collected, but your trial has ended or a payment is overdue. Choose a plan or reactivate your subscription to view your charts.
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('pulsio:billing'))}
            className="mt-4 rounded-full bg-emerald-950 px-5 py-2 font-semibold text-sm text-white"
          >
            Choose a plan
          </button>
          <div aria-hidden="true" className="mt-6 grid grid-cols-2 gap-4 opacity-35 blur-sm md:grid-cols-4">
            {[1, 2, 3, 4].map((value) => (
              <div key={value} className="h-24 rounded bg-amber-950/20" />
            ))}
          </div>
        </section>
      )}
      {(filters.length > 0 || goal) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <button
              key={`${filter.dimension}-${filter.key}`}
              type="button"
              className="flex items-center gap-2 rounded bg-violet-100 px-3 py-1 text-sm text-violet-800"
              onClick={() => setFilters(filters.filter((_, i) => i !== index))}
            >
              {filter.dimension}: {filter.operator.replace('_', ' ')} {filter.value}
              <IClose />
            </button>
          ))}
          {goal && (
            <button type="button" onClick={() => setGoal('')} className="flex items-center gap-2 rounded bg-violet-100 px-3 py-1 text-sm text-violet-800">
              Goal selected
              <IClose />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setFilters([]);
              setGoal('');
            }}
            className="text-gray-500 text-sm"
          >
            Clear all
          </button>
        </div>
      )}
      {showLive && (
        <section className="mb-5 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">Live pages</h2>
          <p className="mt-1 text-gray-500 text-sm">Pageviews in the last 5 minutes. Refreshes every 3 seconds, independent of filters.</p>
          {live.error && <p role="alert">Could not refresh live visitors.</p>}
          {live.data?.pages.map((page) => (
            <div key={page.name} className="mt-3 flex justify-between">
              <span>{page.name}</span>
              <span>{page.value}</span>
            </div>
          ))}
          {live.data && !live.data.pages.length && <p className="mt-4 text-gray-400">No current visitors.</p>}
        </section>
      )}
      {!selected.detected && (
        <section className="mb-5 rounded-lg border border-violet-100 bg-white p-5">
          <h2 className="font-semibold">Waiting for the first signal…</h2>
          <p className="mt-2 text-gray-500 text-sm">Paste this snippet inside your website’s &lt;head&gt;, then visit your site.</p>
          <pre className="mt-3 overflow-auto rounded bg-gray-50 p-3 text-xs">
            <code>{selected.snippet}</code>
          </pre>
          <button
            type="button"
            className="mt-3 text-sm text-violet-600"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(selected.snippet);
                setCopyMessage('Snippet copied.');
              } catch {
                setCopyMessage('Select the snippet and copy it manually.');
              }
            }}
          >
            Copy snippet
          </button>
          <p role="status" className="mt-2 text-sm">
            {copyMessage}
          </p>
        </section>
      )}
      {overview.error && !paymentRequired && (
        <p role="alert" className="mb-5 rounded bg-red-50 p-4 text-red-700">
          {overview.error.message}
          <button type="button" onClick={() => overview.mutate()} className="ml-3 underline">
            Try again
          </button>
        </p>
      )}
      {overview.isLoading && !paymentRequired && (
        <p role="status" className="py-20 text-center text-gray-400">
          Loading analytics…
        </p>
      )}
      {data && !paymentRequired && (
        <>
          <section className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
            <div className="grid grid-cols-2 gap-y-3 md:grid-cols-3 lg:grid-cols-6">
              {visibleMetrics.map((key) => {
                const value = data.summary[key];
                const previous = data.previous[key];
                const change = value !== null && previous !== null && previous !== 0 ? ((value - previous) / previous) * 100 : null;
                const improved = change !== null && (key === 'bounceRate' ? change <= 0 : change >= 0);
                const Arrow = change !== null && change < 0 ? IDown : IUp;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={metric === key}
                    onClick={() => setMetric(key)}
                    className={`border-gray-100 border-r px-4 py-3 text-left last:border-0 ${metric === key ? 'rounded bg-gray-50' : 'hover:bg-gray-50'}`}
                  >
                    <h2 className="whitespace-nowrap font-semibold text-gray-500 text-xs uppercase">{metricLabels[key]}</h2>
                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      <span className="font-semibold text-2xl tabular-nums tracking-tight">{formatMetric(key, value)}</span>
                      <span className="inline-flex items-center text-gray-500 text-xs">
                        {change !== null && <Arrow className={improved ? 'text-emerald-500' : 'text-red-500'} />}
                        {change === null ? '–' : `${Math.abs(Math.round(change))}%`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <Chart
              label={`${metricLabels[metric]} over the selected period`}
              className="mt-4 h-[360px] sm:h-[430px]"
              option={{
                animation: false,
                color: ['#7064ff'],
                grid: { left: 45, right: 10, top: 20, bottom: 40 },
                tooltip: { trigger: 'axis', renderMode: 'richText' },
                xAxis: {
                  type: 'category',
                  boundaryGap: false,
                  data: data.timeline.map((point) =>
                    new Date(point.label).toLocaleString('en-GB', {
                      timeZone: 'UTC',
                      day: 'numeric',
                      month: 'short',
                      ...(data.timeline.length <= 48 && Date.parse(data.to) - Date.parse(data.from) <= 172800000 ? { hour: '2-digit' } : {}),
                    }),
                  ),
                  axisLine: { lineStyle: { color: '#d4d4da' } },
                  axisLabel: { color: '#85858e', margin: 15 },
                },
                yAxis: { type: 'value', min: 0, splitNumber: 6, axisLabel: { color: '#85858e' }, splitLine: { lineStyle: { color: '#ededf1' } } },
                series: [
                  {
                    type: 'line',
                    showSymbol: false,
                    connectNulls: false,
                    lineStyle: { width: 2 },
                    areaStyle: { color: '#eeebff', opacity: 0.8 },
                    data: data.timeline.map((point) => point[metric]),
                  },
                ],
              }}
            />
            {!data.summary.visitors && <p className="pb-3 text-center text-gray-400 text-sm">No visits in this period. New data will appear automatically.</p>}
          </section>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Report
              query={query}
              initial="source"
              color="#eff5ff"
              onFilter={addFilter}
              tabs={[
                { label: 'Channels', dimension: 'channel' },
                { label: 'Sources', dimension: 'source' },
                { label: 'Campaigns', dimension: 'utm_campaign' },
              ]}
            />
            <Report
              query={query}
              color="#fff7eb"
              onFilter={addFilter}
              tabs={[
                { label: 'Top pages', dimension: 'page' },
                { label: 'Entry pages', dimension: 'entry_page' },
                { label: 'Exit pages', dimension: 'exit_page' },
              ]}
            />
            <Report
              query={query}
              color="#f1efff"
              onFilter={addFilter}
              tabs={[
                { label: 'Map', dimension: 'map' },
                { label: 'Countries', dimension: 'country' },
                { label: 'Regions', dimension: 'region' },
                { label: 'Cities', dimension: 'city' },
              ]}
            />
            <Report
              query={query}
              color="#ecfcf5"
              onFilter={addFilter}
              tabs={[
                { label: 'Browsers', dimension: 'browser' },
                { label: 'Operating systems', dimension: 'os' },
                { label: 'Devices', dimension: 'device' },
              ]}
            />
            <Goals
              siteId={selected.id}
              goals={data.goals}
              onChanged={() => {
                void overview.mutate();
              }}
              onSelect={setGoal}
            />
            <Report
              query={query}
              color="#f4f1ff"
              onFilter={addFilter}
              tabs={[
                { label: 'Custom properties', dimension: 'property' },
                { label: 'Events', dimension: 'event' },
                { label: 'Hostnames', dimension: 'hostname' },
              ]}
            />
            <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-sm uppercase">Revenue</h2>
              <table className="mt-5 w-full text-left text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className="font-normal">Currency</th>
                    <th className="font-normal">Total revenue</th>
                    <th className="font-normal">Average revenue</th>
                    <th className="font-normal">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenue.map((row) => (
                    <tr key={row.currency}>
                      <td className="py-4">{row.currency}</td>
                      <td>{row.totalRevenue.toLocaleString('en', { style: 'currency', currency: row.currency })}</td>
                      <td>{row.averageRevenue.toLocaleString('en', { style: 'currency', currency: row.currency })}</td>
                      <td>{row.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.revenue.length && <p className="py-20 text-center text-gray-400">No revenue recorded in this period.</p>}
            </section>
            <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm md:col-span-2">
              <h2 className="font-semibold text-sm uppercase">User journeys</h2>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setShowJourneys(true);
                }}
                className="mt-4 flex flex-wrap gap-3 text-sm"
              >
                <label>
                  Starting page or event
                  <input value={journeyStart} onChange={(event) => setJourneyStart(event.target.value)} className="ml-3 rounded border border-gray-200 p-2" />
                </label>
                <select
                  aria-label="Journey direction"
                  value={journeyDirection}
                  onChange={(event) => setJourneyDirection(event.target.value)}
                  className="rounded border border-gray-200 p-2"
                >
                  <option value="after">What happened next</option>
                  <option value="before">What happened before</option>
                </select>
                <button className="rounded bg-violet-600 px-4 py-2 text-white">Explore journeys</button>
              </form>
              {journeys.error && (
                <p role="alert" className="mt-4 text-red-600">
                  {journeys.error.message}
                </p>
              )}
              {journeys.isLoading && <p role="status">Loading journeys…</p>}
              {journeys.data && (
                <table className="mt-5 w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journeys.data.map((row) => (
                      <tr key={`${row.step}-${row.source}-${row.target}`} className="border-gray-100 border-b">
                        <td className="py-3">{row.step}</td>
                        <td>{row.source}</td>
                        <td>{row.target}</td>
                        <td>{row.visitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {journeys.data && !journeys.data.length && <p className="mt-4 text-gray-400">No journeys from this starting point.</p>}
            </section>
          </div>
        </>
      )}
    </>
  );
};
