import cx from 'clsx-tw';
import React from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import type { IAnalytics } from 'types/Analytics.ts';
import { Spinner, Table, type TableColumn } from 'ui';
import { POST } from 'ui/api/fetchers.ts';
import { IGlobe } from 'ui/icons.tsx';
import { toNumber, toRate } from '#webapp/helpers.ts';

type AcquisitionTableProps = {
  className?: string;
  domains: string[];
  from: string;
  to: string;
};

const tabs: { label: string; dimension: IAnalytics.acquisitionDimension }[] = [
  { label: 'Sources', dimension: 'source' },
  { label: 'Channels', dimension: 'channel' },
  { label: 'utm_source', dimension: 'utm_source' },
  { label: 'utm_medium', dimension: 'utm_medium' },
  { label: 'utm_campaign', dimension: 'utm_campaign' },
  { label: 'utm_content', dimension: 'utm_content' },
  { label: 'utm_term', dimension: 'utm_term' },
];

const getColumns = (locale: string, translate: (key: string) => string): TableColumn<IAnalytics.acquisitionResponse[number]>[] => [
  {
    key: 'name',
    header: translate('acquisition.source'),
    render: (row) => (
      <span className="flex items-center gap-2">
        <IGlobe className="text-pulsio-blue" aria-hidden="true" />
        <span className="truncate">{row.name}</span>
      </span>
    ),
  },
  { key: 'users', header: translate('acquisition.uniqueVisitors'), render: (row) => toNumber(row.users, '', locale), className: 'text-right ' },
  {
    key: 'visits',
    header: translate('acquisition.visits'),
    render: (row) => `${toNumber(row.visits, '', locale)} (${toRate(row.percentage, '', locale)})`,
    className: 'text-right ',
  },
];

export const AcquisitionTable = ({ className, domains, from, to }: AcquisitionTableProps) => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = React.useState<IAnalytics.acquisitionDimension>('source');
  const report = useSWR<IAnalytics.acquisitionResponse>(domains.length ? ['/analytics/acquisition', { domains, from, to, dimension: tab }] : null, POST, {
    keepPreviousData: true,
  });
  const rows = report.data ?? [];
  const activeTab = tabs.find((item) => item.dimension === tab);
  const activeTabLabel = tab === 'source' ? t('acquisition.sources') : tab === 'channel' ? t('acquisition.channels') : activeTab?.label || t('acquisition.source');

  return (
    <section className={cx('h-[402px] overflow-hidden rounded-sm border border-pulsio-line bg-white shadow-pulsio', className)}>
      <div className="flex h-[45px] items-end gap-4 overflow-x-auto border-pulsio-line border-b px-5" role="tablist" aria-label={t('acquisition.reports')}>
        {tabs.map((item) => (
          <button
            key={item.dimension}
            type="button"
            role="tab"
            aria-selected={tab === item.dimension}
            onClick={() => setTab(item.dimension)}
            className={cx(
              'whitespace-nowrap border-b-2 pb-3 font-semibold text-xs uppercase',
              tab === item.dimension ? 'border-(--home-primary-color) text-(--home-primary-color)' : 'border-transparent text-pulsio-muted',
            )}
          >
            {item.dimension === 'source' ? t('acquisition.sources') : item.dimension === 'channel' ? t('acquisition.channels') : item.label}
          </button>
        ))}
      </div>
      <div className="h-[355px] min-h-0 overflow-x-auto [&_td]:h-[35px] [&_td]:py-0 [&_th]:h-[40px] [&_th]:py-0">
        {report.isLoading && !report.data ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : report.error ? (
          <p className="px-4 py-10 text-center text-red-600 text-sm">{t('acquisition.loadError')}</p>
        ) : (
          <Table
            columns={getColumns(i18n.language, t).map((column) => (column.key === 'name' ? { ...column, header: activeTabLabel } : column))}
            data={rows.slice(0, 9)}
            getRowKey={(row) => row.name}
            emptyMessage={t('acquisition.empty')}
            bar={{ getPercentage: (row) => row.percentage }}
          />
        )}
      </div>
    </section>
  );
};
