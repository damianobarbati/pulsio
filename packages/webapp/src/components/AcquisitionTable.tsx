import cx from 'clsx-tw';
import React from 'react';
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

const columns: TableColumn<IAnalytics.acquisitionResponse[number]>[] = [
  {
    key: 'name',
    header: 'Source',
    render: (row) => (
      <span className="flex items-center gap-2">
        <IGlobe className="text-pulsio-blue" aria-hidden="true" />
        <span className="truncate">{row.name}</span>
      </span>
    ),
  },
  { key: 'users', header: 'Visitors', render: (row) => `${toNumber(row.users)} (${toRate(row.percentage)})`, className: 'text-right tabular-nums' },
];

export const AcquisitionTable = ({ className, domains, from, to }: AcquisitionTableProps) => {
  const [tab, setTab] = React.useState<IAnalytics.acquisitionDimension>('source');
  const report = useSWR<IAnalytics.acquisitionResponse>(domains.length ? ['/analytics/acquisition', { domains, from, to, dimension: tab }] : null, POST, {
    keepPreviousData: true,
  });
  const rows = report.data ?? [];
  const activeTab = tabs.find((item) => item.dimension === tab);

  return (
    <section className={cx('overflow-hidden rounded-sm border border-pulsio-line bg-white shadow-pulsio', className)}>
      <div className="flex min-h-13 items-center gap-4 overflow-x-auto border-pulsio-line border-b px-5 pt-3" role="tablist" aria-label="Acquisition reports">
        {tabs.map((item) => (
          <button
            key={item.dimension}
            type="button"
            role="tab"
            aria-selected={tab === item.dimension}
            onClick={() => setTab(item.dimension)}
            className={cx(
              'whitespace-nowrap border-b-2 pb-3 font-semibold text-xs uppercase',
              tab === item.dimension ? 'border-pulsio-blue text-pulsio-blue' : 'border-transparent text-pulsio-muted',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 overflow-x-auto">
        {report.isLoading && !report.data ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : report.error ? (
          <p className="px-4 py-10 text-center text-red-600 text-sm">Could not load acquisition data. Please try again.</p>
        ) : (
          <Table
            columns={columns.map((column) => (column.key === 'name' ? { ...column, header: activeTab?.label || 'Source' } : column))}
            data={rows.slice(0, 10)}
            getRowKey={(row) => row.name}
            emptyMessage="No acquisition data for this period."
            bar={{ getPercentage: (row) => row.percentage }}
          />
        )}
      </div>
    </section>
  );
};
