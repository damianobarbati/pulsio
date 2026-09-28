import cx from 'clsx-tw';
import { FormProvider, useForm } from 'react-hook-form';
import useSWR from 'swr';
import type { AnalyticsEventsResponse } from 'types/Analytics.ts';
import { DataTable, Spinner, Table, type TableColumn } from 'ui';
import { POST } from 'ui/api/fetchers.ts';
import { Input } from 'ui/form';
import { toNumber, toRate } from '#webapp/helpers.ts';

type GoalsTableProps = {
  className?: string;
  domains: string[];
  from: string;
  to: string;
};

export const GoalsTable = ({ className, domains, from, to }: GoalsTableProps) => {
  const form = useForm({ defaultValues: { search: '' } });
  const search = form.watch('search');
  const swr = useSWR<AnalyticsEventsResponse>(domains.length ? ['/analytics/events', { domains, from, to }] : null, POST, { keepPreviousData: true });
  const rows = (swr.data ?? []).filter((row) => row.event_name.toLowerCase().includes(search.toLowerCase().trim()));
  const columns: TableColumn<AnalyticsEventsResponse[number]>[] = [
    { key: 'event_name', header: 'Event', render: (row) => row.event_name },
    { key: 'count', header: 'Count', render: (row) => `${toNumber(row.count)} (${toRate(row.percentage)})`, className: 'text-right tabular-nums' },
    { key: 'users', header: 'Users', render: (row) => toNumber(row.users), className: 'text-right tabular-nums' },
    { key: 'conversion_rate', header: 'Conversion rate %', render: (row) => toRate(row.conversion_rate), className: 'text-right tabular-nums' },
  ];

  return (
    <FormProvider {...form}>
      <DataTable className={cx('mt-4', className)} title="Goals" search={<Input name="search" aria-label="Search events" className="w-56" placeholder="Search events" />}>
        {swr.isLoading && !swr.data ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : swr.error ? (
          <p className="px-4 py-10 text-center text-red-600 text-sm">Could not load events. Please try again.</p>
        ) : (
          <Table
            columns={columns}
            data={rows}
            getRowKey={(row) => row.event_name}
            emptyMessage={search ? 'No matching events.' : 'No custom events found.'}
            bar={{ getPercentage: (row) => row.percentage }}
          />
        )}
      </DataTable>
    </FormProvider>
  );
};
