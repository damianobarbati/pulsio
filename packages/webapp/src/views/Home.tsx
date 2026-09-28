import cx from 'clsx-tw';
import dayjs from 'dayjs';
import React from 'react';
import useSWR from 'swr';
import type { AnalyticsKPIResponse, AnalyticsLiveResponse, AnalyticsTimeseriesResponse, Metric } from 'types/Analytics.ts';
import type { User } from 'types/User.ts';
import { Pulser, Spinner } from 'ui';
import api from 'ui/api/api.ts';
import { POST } from 'ui/api/fetchers.ts';
import { ChartLine } from 'ui/component/ChartLine.tsx';
import { useMe } from 'ui/hook/useMe.ts';
import { toAmount, toDuration, toNumber, toRate } from '#webapp/helpers.ts';
import { AcquisitionTable } from '../components/AcquisitionTable.tsx';
import { DashboardFilters } from '../components/DashboardFilters.tsx';
import { DashboardKpi } from '../components/DashboardKpi.tsx';
import { DeviceTable } from '../components/DeviceTable.tsx';
import { GoalsTable } from '../components/GoalsTable.tsx';
import { LocationTable } from '../components/LocationTable.tsx';

const metricToFormatter = {
  users_count: toNumber,
  sessions_count: toNumber,
  pageviews_per_session_avg: toNumber,
  duration_per_session_avg: toDuration,
  engagement_rate: toRate,
  conversion_rate: toRate,
  transactions_count: toNumber,
  revenue_sum: (value) => toAmount(value, 'USD'),
  revenue_per_transaction_avg: (value: number) => toAmount(value, 'USD'),
};

const defaultFilters = {
  domains: [] as string[],
  from: dayjs().startOf('year').toISOString(),
  to: dayjs().endOf('year').toISOString(),
  compare: false,
};

export const Home = ({ className }: { className?: string }) => {
  useMe<User>(api.authMe, 'user');

  const [filters, setFilters] = React.useState(defaultFilters);
  const [selectedMetric, setSelectedMetric] = React.useState<Metric>('users_count');
  const [displayedTimeseries, setDisplayedTimeseries] = React.useState<{ data: AnalyticsTimeseriesResponse; metric: Metric; interval: 'hour' | 'day' | 'week' | 'month' }>();
  const days = dayjs(filters.to).diff(filters.from, 'day');
  const interval = days <= 2 ? 'hour' : days <= 90 ? 'day' : days <= 365 ? 'week' : 'month';
  const periodDuration = dayjs(filters.to).diff(dayjs(filters.from)) + 1;
  const previousFilters = { ...filters, from: dayjs(filters.from).subtract(periodDuration, 'millisecond').toISOString(), to: filters.from };

  const kpisFilters = { domains: filters.domains, from: filters.from, to: filters.to, interval };
  const kpisFiltersPrevious = { domains: filters.domains, from: previousFilters.from, to: previousFilters.to, interval };
  const analyticsFilters = { domains: filters.domains, metric: selectedMetric, from: filters.from, to: filters.to, interval };
  const analyticsFiltersPrevious = { domains: previousFilters.domains, metric: selectedMetric, from: previousFilters.from, to: previousFilters.to, interval };

  const swrOptions = { keepPreviousData: true };

  const liveSWR = useSWR<AnalyticsLiveResponse>(filters.domains.length ? ['/analytics/live', { domains: filters.domains }] : null, POST, {
    refreshInterval: 60_000,
    ...swrOptions,
  });

  const kpisSWR = useSWR<AnalyticsKPIResponse>(filters.domains.length ? ['/analytics/kpis', kpisFilters] : null, POST, swrOptions);
  const previousKpisSWR = useSWR<AnalyticsKPIResponse>(filters.domains.length ? ['/analytics/kpis', kpisFiltersPrevious] : null, POST, swrOptions);
  const timeseriesSWR = useSWR<AnalyticsTimeseriesResponse>(filters.domains.length ? ['/analytics/timeseries', analyticsFilters] : null, POST, swrOptions);
  const previousTimeseriesSWR = useSWR<AnalyticsTimeseriesResponse>(filters.domains.length ? ['/analytics/timeseries', analyticsFiltersPrevious] : null, POST, swrOptions);

  const kpis = kpisSWR.data;
  const timeseries = timeseriesSWR.data;
  const comparisonTimeseries = previousTimeseriesSWR.data;
  const error = liveSWR.error || kpisSWR.error || previousKpisSWR.error || timeseriesSWR.error || previousTimeseriesSWR.error;

  React.useEffect(() => {
    if (!timeseries) return;
    setDisplayedTimeseries({ data: timeseries, metric: selectedMetric, interval });
  }, [timeseries, selectedMetric, interval]);

  return (
    <main className={className}>
      <DashboardFilters className="w-full" onChange={setFilters} />

      {!filters.domains.length && <p className="text-center text-gray-600 text-sm">Select a website to view analytics.</p>}
      {!!error && <p className="text-red-600 text-sm">Could not load analytics. Please try again.</p>}
      {!!filters.domains.length && !kpisSWR.data && !error && <Spinner size="lg" />}

      {!!kpis && (
        <section className="relative rounded-sm border border-pulsio-line bg-white p-2 shadow-pulsio">
          {!!kpis && (
            <div id="kpis" className="grid w-full grid-cols-[0.8fr_repeat(9,1fr)] p-2">
              <DashboardKpi
                label={
                  <span>
                    <Pulser className={cx('-ml-1', liveSWR.data ? 'text-emerald-500' : 'text-red-500')} active={!!liveSWR.data} />
                    Live Now
                  </span>
                }
                value={liveSWR.data ?? '...'}
                selected={false}
                valueFormatter={toNumber}
              />

              <DashboardKpi
                label="Users"
                value={kpis.users_count}
                previousValue={previousKpisSWR.data?.users_count}
                valueFormatter={toNumber}
                selected={selectedMetric === 'users_count'}
                onSelect={() => setSelectedMetric('users_count')}
              />
              <DashboardKpi
                label="Sessions"
                value={kpis.sessions_count}
                previousValue={previousKpisSWR.data?.sessions_count}
                valueFormatter={toNumber}
                selected={selectedMetric === 'sessions_count'}
                onSelect={() => setSelectedMetric('sessions_count')}
              />
              <DashboardKpi
                label="Session Views"
                value={kpis.pageviews_per_session_avg}
                previousValue={previousKpisSWR.data?.pageviews_per_session_avg}
                valueFormatter={toNumber}
                selected={selectedMetric === 'pageviews_per_session_avg'}
                onSelect={() => setSelectedMetric('pageviews_per_session_avg')}
              />
              <DashboardKpi
                label="Session Time"
                value={kpis.duration_per_session_avg}
                previousValue={previousKpisSWR.data?.duration_per_session_avg}
                valueFormatter={toDuration}
                selected={selectedMetric === 'duration_per_session_avg'}
                onSelect={() => setSelectedMetric('duration_per_session_avg')}
              />
              <DashboardKpi
                label="Engagement"
                value={kpis.engagement_rate}
                previousValue={previousKpisSWR.data?.engagement_rate}
                valueFormatter={toRate}
                selected={selectedMetric === 'engagement_rate'}
                onSelect={() => setSelectedMetric('engagement_rate')}
              />
              <DashboardKpi
                label="Conversion"
                value={kpis.conversion_rate}
                previousValue={previousKpisSWR.data?.conversion_rate}
                valueFormatter={toRate}
                selected={selectedMetric === 'conversion_rate'}
                onSelect={() => setSelectedMetric('conversion_rate')}
              />
              <DashboardKpi
                label="Transactions"
                value={kpis.transactions_count}
                previousValue={previousKpisSWR.data?.transactions_count}
                valueFormatter={toNumber}
                selected={selectedMetric === 'transactions_count'}
                onSelect={() => setSelectedMetric('transactions_count')}
              />
              <DashboardKpi
                label="Revenue"
                value={kpis.revenue_sum}
                previousValue={previousKpisSWR.data?.revenue_sum}
                valueFormatter={(value) => toAmount(value, 'USD')}
                selected={selectedMetric === 'revenue_sum'}
                onSelect={() => setSelectedMetric('revenue_sum')}
              />
              <DashboardKpi
                label="Trans. revenue"
                value={kpis.revenue_per_transaction_avg}
                previousValue={previousKpisSWR.data?.revenue_per_transaction_avg}
                valueFormatter={(value) => toAmount(value, 'USD')}
                selected={selectedMetric === 'revenue_per_transaction_avg'}
                onSelect={() => setSelectedMetric('revenue_per_transaction_avg')}
              />
            </div>
          )}
          {!displayedTimeseries && timeseriesSWR.isValidating && (
            <div className="mt-4 flex h-90 items-center justify-center sm:h-107.5">
              <Spinner size="lg" />
            </div>
          )}
          {!!displayedTimeseries && (
            <div className="relative">
              <ChartLine
                className="h-90"
                data={displayedTimeseries.data}
                compareData={filters.compare ? comparisonTimeseries : undefined}
                interval={displayedTimeseries.interval}
                valueFormatter={metricToFormatter[displayedTimeseries.metric] || toNumber}
              />
              {(timeseriesSWR.isValidating || previousTimeseriesSWR.isValidating) && (
                <div className="absolute top-3 right-3" role="status" aria-label="Updating chart">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {!!filters.domains.length && (
        <div className="grid grid-cols-2 items-stretch gap-4">
          <GoalsTable domains={filters.domains} from={filters.from} to={filters.to} />
          <AcquisitionTable domains={filters.domains} from={filters.from} to={filters.to} />
          <DeviceTable domains={filters.domains} from={filters.from} to={filters.to} />
          <LocationTable domains={filters.domains} from={filters.from} to={filters.to} />
        </div>
      )}
    </main>
  );
};

export default Home;
