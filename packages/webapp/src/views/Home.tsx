import cx from 'clsx-tw';
import dayjs from 'dayjs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import type { IAnalytics } from 'types/Analytics.ts';
import type { IBilling } from 'types/Billing.ts';
import type { IDomain } from 'types/Domain.ts';
import type { IUser } from 'types/User.ts';
import { Button, Card, Pulser, Spinner, TrackingSnippet } from 'ui';
import { DOWNLOAD, GET, POST } from 'ui/api/fetchers.ts';
import { ChartLine } from 'ui/component/ChartLine.tsx';
import { toAmount, toDuration, toNumber, toRate } from '#webapp/helpers.ts';
import { AcquisitionTable } from '../components/AcquisitionTable.tsx';
import { DashboardFilters } from '../components/DashboardFilters.tsx';
import { DashboardKpi } from '../components/DashboardKpi.tsx';
import { DeviceTable } from '../components/DeviceTable.tsx';
import { GoalsTable } from '../components/GoalsTable.tsx';
import { LocationTable } from '../components/LocationTable.tsx';

const defaultFilters = {
  domains: [] as string[],
  from: dayjs().startOf('year').toISOString(),
  to: dayjs().endOf('year').toISOString(),
  compare: false,
};

type HomeProps = {
  className?: string;
  primaryColor?: string;
  publicShare?: boolean;
};

export const Home = ({ className, primaryColor = '#055dfe', publicShare = false }: HomeProps) => {
  const { t, i18n } = useTranslation();
  const userSWR = useSWR<IUser.user | IUser.brandResponse>(publicShare ? ['/user/brand'] : ['/auth/me'], GET, {
    suspense: true,
    shouldRetryOnError: false,
  });
  const billingSWR = useSWR<IBilling.summary>(publicShare ? null : ['/billing/summary'], GET, { suspense: true, shouldRetryOnError: false });
  const domainsSWR = useSWR<IDomain.listResponse>(['/domain/list'], POST, { suspense: true, shouldRetryOnError: false });

  const [filters, setFilters] = React.useState(defaultFilters);
  const [selectedMetric, setSelectedMetric] = React.useState<IAnalytics.metric>('users_count');
  const [displayedTimeseries, setDisplayedTimeseries] = React.useState<{
    data: IAnalytics.timeseriesResponse;
    metric: IAnalytics.metric;
    interval: 'hour' | 'day' | 'week' | 'month';
  }>();
  const days = dayjs(filters.to).diff(filters.from, 'day');
  const interval = days <= 2 ? 'hour' : days <= 90 ? 'day' : days <= 365 ? 'week' : 'month';
  const periodDuration = dayjs(filters.to).diff(dayjs(filters.from)) + 1;
  const previousFilters = { ...filters, from: dayjs(filters.from).subtract(periodDuration, 'millisecond').toISOString(), to: filters.from };

  const kpisFilters = { domains: filters.domains, from: filters.from, to: filters.to, interval };
  const kpisFiltersPrevious = { domains: filters.domains, from: previousFilters.from, to: previousFilters.to, interval };
  const analyticsFilters = { domains: filters.domains, metric: selectedMetric, from: filters.from, to: filters.to, interval };
  const analyticsFiltersPrevious = { domains: previousFilters.domains, metric: selectedMetric, from: previousFilters.from, to: previousFilters.to, interval };
  const domains = domainsSWR.data ?? [];
  const summary = billingSWR.data;
  const totalEvents = domains.reduce((total, domain) => total + domain.events_count, 0);
  const blocked = !publicShare && !!summary && (totalEvents > summary.plan.max_events || domains.length > summary.plan.max_domains);
  const user = userSWR.data ?? { name: null, primary_color: null };
  const logoSWR = useSWR<Blob>(['/user/logo'], ([path]) => DOWNLOAD(path), { shouldRetryOnError: false });
  const dashboardPrimaryColor = user.primary_color ?? primaryColor;
  const authenticatedUser = userSWR.data && 'id' in userSWR.data ? userSWR.data : null;
  const snippet = !publicShare && authenticatedUser ? `<script async src="${new URL('/client.js', window.config.API_URL)}" data-pulsio-id="${authenticatedUser.id}"></script>` : '';
  const [logoUrl, setLogoUrl] = React.useState<string>();
  const formatNumber = (value: number) => toNumber(value, '', i18n.language);
  const formatDuration = (value: number) => toDuration(value);
  const formatRate = (value: number) => toRate(value, '', i18n.language);
  const formatAmount = (value: number) => toAmount(value, 'USD', '', i18n.language);
  const metricToFormatter = {
    users_count: formatNumber,
    sessions_count: formatNumber,
    pageviews_per_session_avg: formatNumber,
    duration_per_session_avg: formatDuration,
    engagement_rate: formatRate,
    conversion_rate: formatRate,
    transactions_count: formatNumber,
    revenue_sum: formatAmount,
    revenue_per_transaction_avg: formatAmount,
  };

  React.useEffect(() => {
    if (!logoSWR.data) {
      setLogoUrl(undefined);
      return;
    }

    const url = URL.createObjectURL(logoSWR.data);
    setLogoUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [logoSWR.data]);

  const swrOptions = { keepPreviousData: true };

  const liveSWR = useSWR<IAnalytics.liveResponse>(filters.domains.length ? ['/analytics/live', { domains: filters.domains }] : null, POST, {
    refreshInterval: 60_000,
    ...swrOptions,
  });

  const kpisSWR = useSWR<IAnalytics.kpiResponse>(filters.domains.length ? ['/analytics/kpis', kpisFilters] : null, POST, swrOptions);
  const previousKpisSWR = useSWR<IAnalytics.kpiResponse>(filters.domains.length ? ['/analytics/kpis', kpisFiltersPrevious] : null, POST, swrOptions);
  const timeseriesSWR = useSWR<IAnalytics.timeseriesResponse>(filters.domains.length ? ['/analytics/timeseries', analyticsFilters] : null, POST, swrOptions);
  const previousTimeseriesSWR = useSWR<IAnalytics.timeseriesResponse>(filters.domains.length ? ['/analytics/timeseries', analyticsFiltersPrevious] : null, POST, swrOptions);

  const kpis = kpisSWR.data;
  const timeseries = timeseriesSWR.data;
  const comparisonTimeseries = previousTimeseriesSWR.data;
  const error = liveSWR.error || kpisSWR.error || previousKpisSWR.error || timeseriesSWR.error || previousTimeseriesSWR.error;

  React.useEffect(() => {
    if (!timeseries) return;
    setDisplayedTimeseries({ data: timeseries, metric: selectedMetric, interval });
  }, [timeseries, selectedMetric, interval]);

  return (
    <main className={className} style={{ '--home-primary-color': dashboardPrimaryColor } as React.CSSProperties}>
      <header className="space-between flex h-14 flex-row">
        <DashboardFilters className="w-full" onChange={setFilters} />
        {logoUrl && <img src={logoUrl} alt={t('home.accountLogo')} className="h-full max-w-48 object-contain p-1" />}
      </header>

      <div className="relative">
        {blocked && (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/70 p-6 backdrop-blur-sm">
            <Card className="border-amber-200 bg-amber-50 text-center shadow-lg">
              <h1 className="font-bold text-xl">{t('home.choosePlan')}</h1>
              <p className="mx-auto mt-2 max-w-xl text-pulsio-muted text-sm">
                {t('home.accountLimit', {
                  domains: t('counts.domains', { count: domains.length }),
                  events: t('counts.events', { count: totalEvents }),
                  plan: summary.plan.name,
                })}
              </p>
              <Button className="mt-5" onClick={() => window.location.assign('/billing')}>
                {t('home.goToBilling')}
              </Button>
            </Card>
          </div>
        )}

        {!publicShare && !domains.length && authenticatedUser && (
          <TrackingSnippet
            className="mb-5"
            snippet={snippet}
            title={t('home.noEventsTitle')}
            description={t('home.noEventsDescription')}
            temporarySnippetUrl={`${window.config.WEBSITE_URL}/api/snippet`}
            temporarySnippetReplacements={{
              '${process.env.API_URL}': window.config.API_URL,
              '${process.env.WEBAPP_URL}': window.location.origin,
              '${process.env.PULSIO_USER_ID}': authenticatedUser.id,
            }}
          />
        )}
        {!filters.domains.length && <p className="text-center text-gray-600 text-sm">{t('home.selectWebsite')}</p>}
        {!!error && <p className="text-red-600 text-sm">{t('home.loadAnalyticsError')}</p>}
        {!!filters.domains.length && !kpisSWR.data && !error && <Spinner size="lg" />}

        {!!kpis && (
          <section className="relative mb-4 rounded-sm border border-pulsio-line bg-white p-2 shadow-pulsio">
            {!!kpis && (
              <div id="kpis" className="grid w-full grid-cols-[0.8fr_repeat(9,1fr)] p-2">
                <DashboardKpi
                  label={
                    <span>
                      <Pulser className={cx('-ml-1', liveSWR.data ? 'text-emerald-500' : 'text-red-500')} active={!!liveSWR.data} />
                      {t('home.liveNow')}
                    </span>
                  }
                  value={liveSWR.data ?? '...'}
                  selected={false}
                  valueFormatter={formatNumber}
                />

                <DashboardKpi
                  label={t('home.users')}
                  value={kpis.users_count}
                  previousValue={previousKpisSWR.data?.users_count}
                  valueFormatter={formatNumber}
                  selected={selectedMetric === 'users_count'}
                  onSelect={() => setSelectedMetric('users_count')}
                />
                <DashboardKpi
                  label={t('home.sessions')}
                  value={kpis.sessions_count}
                  previousValue={previousKpisSWR.data?.sessions_count}
                  valueFormatter={formatNumber}
                  selected={selectedMetric === 'sessions_count'}
                  onSelect={() => setSelectedMetric('sessions_count')}
                />
                <DashboardKpi
                  label={t('home.sessionViews')}
                  value={kpis.pageviews_per_session_avg}
                  previousValue={previousKpisSWR.data?.pageviews_per_session_avg}
                  valueFormatter={formatNumber}
                  selected={selectedMetric === 'pageviews_per_session_avg'}
                  onSelect={() => setSelectedMetric('pageviews_per_session_avg')}
                />
                <DashboardKpi
                  label={t('home.sessionTime')}
                  value={kpis.duration_per_session_avg}
                  previousValue={previousKpisSWR.data?.duration_per_session_avg}
                  valueFormatter={formatDuration}
                  selected={selectedMetric === 'duration_per_session_avg'}
                  onSelect={() => setSelectedMetric('duration_per_session_avg')}
                />
                <DashboardKpi
                  label={t('home.engagement')}
                  value={kpis.engagement_rate}
                  previousValue={previousKpisSWR.data?.engagement_rate}
                  valueFormatter={formatRate}
                  selected={selectedMetric === 'engagement_rate'}
                  onSelect={() => setSelectedMetric('engagement_rate')}
                />
                <DashboardKpi
                  label={t('home.conversion')}
                  value={kpis.conversion_rate}
                  previousValue={previousKpisSWR.data?.conversion_rate}
                  valueFormatter={formatRate}
                  selected={selectedMetric === 'conversion_rate'}
                  onSelect={() => setSelectedMetric('conversion_rate')}
                />
                <DashboardKpi
                  label={t('home.transactions')}
                  value={kpis.transactions_count}
                  previousValue={previousKpisSWR.data?.transactions_count}
                  valueFormatter={formatNumber}
                  selected={selectedMetric === 'transactions_count'}
                  onSelect={() => setSelectedMetric('transactions_count')}
                />
                <DashboardKpi
                  label={t('home.revenue')}
                  value={kpis.revenue_sum}
                  previousValue={previousKpisSWR.data?.revenue_sum}
                  valueFormatter={formatAmount}
                  selected={selectedMetric === 'revenue_sum'}
                  onSelect={() => setSelectedMetric('revenue_sum')}
                />
                <DashboardKpi
                  label={t('home.transactionRevenue')}
                  value={kpis.revenue_per_transaction_avg}
                  previousValue={previousKpisSWR.data?.revenue_per_transaction_avg}
                  valueFormatter={formatAmount}
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
                  primaryColor={dashboardPrimaryColor}
                  valueFormatter={metricToFormatter[displayedTimeseries.metric] || formatNumber}
                />
                {(timeseriesSWR.isValidating || previousTimeseriesSWR.isValidating) && (
                  <div className="absolute top-3 right-3" role="status" aria-label={t('home.updatingChart')}>
                    <Spinner size="sm" />
                  </div>
                )}
              </div>
            )}
          </section>
        )}
        {!!filters.domains.length && (
          <div className="grid grid-cols-2 items-stretch gap-4">
            <AcquisitionTable domains={filters.domains} from={filters.from} to={filters.to} />
            <DeviceTable domains={filters.domains} from={filters.from} to={filters.to} />
            <LocationTable domains={filters.domains} from={filters.from} to={filters.to} primaryColor={dashboardPrimaryColor} />
            <GoalsTable domains={filters.domains} from={filters.from} to={filters.to} />
          </div>
        )}
      </div>
    </main>
  );
};

export default Home;
