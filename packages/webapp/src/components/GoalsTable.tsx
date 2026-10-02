import cx from 'clsx-tw';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import type { IAnalytics } from 'types/Analytics.ts';
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
  const { t, i18n } = useTranslation();
  const form = useForm({ defaultValues: { search: '' } });
  const search = form.watch('search');
  const swr = useSWR<IAnalytics.eventsResponse>(domains.length ? ['/analytics/events', { domains, from, to }] : null, POST, { keepPreviousData: true });
  const rows = (swr.data ?? []).filter((row) => row.event_name.toLowerCase().includes(search.toLowerCase().trim()));
  const columns: TableColumn<IAnalytics.eventsResponse[number]>[] = [
    { key: 'event_name', header: t('goals.event'), render: (row) => row.event_name },
    {
      key: 'count',
      header: t('goals.count'),
      render: (row) => `${toNumber(row.count, '', i18n.language)} (${toRate(row.percentage, '', i18n.language)})`,
      className: 'text-right ',
    },
    { key: 'users', header: t('goals.users'), render: (row) => toNumber(row.users, '', i18n.language), className: 'text-right ' },
    { key: 'conversion_rate', header: t('goals.conversionRate'), render: (row) => toRate(row.conversion_rate, '', i18n.language), className: 'text-right ' },
  ];

  return (
    <FormProvider {...form}>
      <DataTable
        className={cx('h-[402px] [&>div:first-of-type]:h-[45px] [&>div:first-of-type]:py-0', className)}
        title={t('goals.title')}
        search={<Input name="search" aria-label={t('goals.searchEvents')} className="w-56 [&>input]:h-8" placeholder={t('goals.searchEvents')} />}
      >
        <div className="h-[355px] overflow-x-auto [&_td]:h-[35px] [&_td]:py-0 [&_th]:h-[40px] [&_th]:py-0">
          {swr.isLoading && !swr.data ? (
            <div className="flex h-full items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : swr.error ? (
            <p className="px-4 py-10 text-center text-red-600 text-sm">{t('goals.loadError')}</p>
          ) : (
            <Table
              columns={columns}
              data={rows.slice(0, 9)}
              getRowKey={(row) => row.event_name}
              emptyMessage={search ? t('goals.matching') : t('goals.empty')}
              bar={{ getPercentage: (row) => row.percentage }}
            />
          )}
        </div>
      </DataTable>
    </FormProvider>
  );
};
