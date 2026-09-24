// @ts-nocheck

import React from 'react';
import useSWR from 'swr';
import type { User } from 'types/User.ts';
import { Spinner } from 'ui';
import { useMe } from 'ui/hooks/useMe.ts';
import { DomainNotDetected } from '#webapp/components/DomainNotDetected.tsx';
import { checkAuth, fetcher } from '../api.ts';
import { Chart } from '../components/Chart.tsx';
import { type AnalyticsFilter, DashboardFilters } from '../components/DashboardFilters.tsx';
import { DashboardKpi } from '../components/DashboardKpi.tsx';
import { Goals } from '../components/Goals.tsx';
import { Report } from '../components/Report.tsx';
import { formatMetric } from '../helpers.ts';

type Kpi = 'liveNow' | 'users' | 'views' | 'sessions' | 'sessionTime' | 'engagement' | 'events' | 'conversion' | 'revenue';
type AnalyticsOverview = any;
const kpiLabels: Record<Kpi, string> = {
  liveNow: 'Live now',
  users: 'Users',
  views: 'Views',
  sessions: 'Sessions',
  sessionTime: 'Session time',
  engagement: 'Engagement',
  events: 'Events',
  conversion: 'Conversion',
  revenue: 'Revenue',
};
const timelineMetrics: Record<Kpi, string | null> = {
  liveNow: null,
  users: 'visitors',
  views: 'pageviews',
  sessions: 'visits',
  sessionTime: 'visitDuration',
  engagement: 'engagementRate',
  events: 'events',
  conversion: 'conversionRate',
  revenue: null,
};
const date = (value: number) => new Date(value).toISOString().slice(0, 10);

export const Home = () => {
  const { user } = useMe<User>(checkAuth);
  console.log(user);

  const sites = [];
  const selected = [];
  const onSite = () => {};

  const [siteIds, setSiteIds] = React.useState([selected.id]);
  const [from, setFrom] = React.useState(date(Date.now() - 27 * 86400000));
  const [to, setTo] = React.useState(date(Date.now()));
  const [filters, setFilters] = React.useState<AnalyticsFilter[]>([]);
  const [goal, setGoal] = React.useState('');
  const [_showLive, _setShowLive] = React.useState(false);
  const [selectedKpi, setSelectedKpi] = React.useState<Kpi>('users');
  const [journeyStart, setJourneyStart] = React.useState('/');
  const [journeyDirection, setJourneyDirection] = React.useState('after');
  const [showJourneys, setShowJourneys] = React.useState(false);
  const query = new URLSearchParams({
    sites: siteIds.join(','),
    reporting_currency: selected.reportingCurrency,
    from: `${from}T00:00:00.000Z`,
    to: new Date(Date.parse(`${to}T00:00:00.000Z`) + 86400000).toISOString(),
    filters: JSON.stringify(filters),
    ...(goal ? { goal } : {}),
  }).toString();
  const overview = useSWR<AnalyticsOverview>(`/analytics/overview?${query}`, fetcher, { refreshInterval: 30000 });
  const live = useSWR<{ activeVisitors: number; pages: { name: string; value: number }[] }>(`/analytics/live?sites=${siteIds.join(',')}`, fetcher, {
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
  const data = overview.data;
  const revenue = data?.revenue.length === 1 ? data.revenue[0] : undefined;
  const timelineMetric = timelineMetrics[selectedKpi];
  return (
    <>
      <DashboardFilters
        sites={sites}
        siteIds={siteIds}
        onSite={onSite}
        onSiteIdsChange={setSiteIds}
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        filters={filters}
        onFilterAdd={addFilter}
        onFiltersChange={setFilters}
        goal={goal}
        onGoalChange={setGoal}
      />
      {false && !selected.detected && <DomainNotDetected snippet={selected.snippet} />}
      {overview.error && (
        <p role="alert" className="mb-5 rounded bg-red-50 p-4 text-red-700">
          {overview.error.message}
          <button type="button" onClick={() => overview.mutate()} className="ml-3 underline">
            Try again
          </button>
        </p>
      )}
      {overview.isLoading && <Spinner size="lg" />}
      {data && (
        <>
          <section className="rounded-[var(--radius-lg)] border border-pulsio-line bg-white p-3 shadow-pulsio sm:p-5">
            <div id="kpis" className="grid w-full grid-cols-8">
              <DashboardKpi label="Live now" value={live.data?.activeVisitors ?? '…'} change={data.changes.liveNow} selected={selectedKpi === 'liveNow'} onSelect={() => {}} live />
              <DashboardKpi
                label="Users"
                value={formatMetric('visitors', data.summary.visitors)}
                change={data.changes.users}
                selected={selectedKpi === 'users'}
                onSelect={() => setSelectedKpi('users')}
              />
              <DashboardKpi
                label="Views"
                value={formatMetric('pageviews', data.summary.pageviews)}
                change={data.changes.views}
                selected={selectedKpi === 'views'}
                onSelect={() => setSelectedKpi('views')}
              />
              <DashboardKpi
                label="Sessions"
                value={formatMetric('visits', data.summary.visits)}
                change={data.changes.sessions}
                selected={selectedKpi === 'sessions'}
                onSelect={() => setSelectedKpi('sessions')}
              />
              <DashboardKpi
                label="Session time"
                value={formatMetric('visitDuration', data.summary.visitDuration)}
                change={data.changes.sessionTime}
                selected={selectedKpi === 'sessionTime'}
                onSelect={() => setSelectedKpi('sessionTime')}
              />
              <DashboardKpi
                label="Engagement"
                value={formatMetric('engagementRate', data.summary.engagementRate)}
                change={data.changes.engagement}
                selected={selectedKpi === 'engagement'}
                onSelect={() => setSelectedKpi('engagement')}
              />
              <DashboardKpi
                label="Conversion"
                value={formatMetric('conversionRate', data.summary.conversionRate)}
                change={data.changes.conversion}
                selected={selectedKpi === 'conversion'}
                onSelect={() => setSelectedKpi('conversion')}
              />
              <DashboardKpi
                label="Revenue"
                value={revenue ? revenue.totalRevenue.toLocaleString('en', { style: 'currency', currency: revenue.currency, maximumFractionDigits: 0 }) : '–'}
                change={data.changes.revenue}
                selected={selectedKpi === 'revenue'}
                onSelect={() => setSelectedKpi('revenue')}
              />
            </div>
            {timelineMetric && (
              <Chart
                label={`${kpiLabels[selectedKpi]} over the selected period`}
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
                      data: data.timeline.map((point) => point[timelineMetric]),
                    },
                  ],
                }}
              />
            )}
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

export default Home;
