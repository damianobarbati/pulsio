import { createColumnHelper } from '@tanstack/react-table';
import useSWRInfinite from 'swr/infinite';
import type { DomainListRequest, DomainListResponse } from 'types/Domain.ts';
import { DataTable } from 'ui';
import { post } from 'ui/api/api.ts';
import { VirtualizedTable, type virtualizedTableFeatures } from 'ui/VirtualizedTable.tsx';
import { count, dateTime } from '#superadmin/helpers.ts';

type Domain = DomainListResponse[number];
type PageKey = [string, number];

const pageSize = 50;
const column = createColumnHelper<typeof virtualizedTableFeatures, Domain>();
const columns = column.columns([
  column.accessor('domain', { header: 'Domain', size: 300 }),
  column.accessor('user_id', { header: 'Owner ID', size: 310 }),
  column.accessor('detected_at', { header: 'Detected', size: 180, cell: (info) => dateTime(info.getValue()) }),
  column.accessor('reporting_currency', { header: 'Currency', size: 130, cell: (info) => info.getValue() || '—' }),
  column.accessor('created_at', { header: 'Created', size: 180, cell: (info) => dateTime(info.getValue()) }),
]);

const loadPage = async ([url, offset]: PageKey): Promise<DomainListResponse> => {
  const body: DomainListRequest = {
    limit: pageSize,
    offset,
    sort: [
      ['created_at', 'desc'],
      ['id', 'asc'],
    ],
  };
  const domains = await post<DomainListResponse>(url, body);
  return domains;
};

export const Domains = () => {
  const getKey = (pageIndex: number, previousPage: DomainListResponse | null): PageKey | null => {
    if (previousPage && previousPage.length < pageSize) return null;
    const key: PageKey = ['/s/domain/list', pageIndex * pageSize];
    return key;
  };

  const result = useSWRInfinite<DomainListResponse>(getKey, loadPage, { revalidateFirstPage: false, shouldRetryOnError: false });
  const pages = result.data || [];
  const domains = pages.flat();
  const loading = result.isLoading || result.isValidating;
  const hasMore = pages.length === 0 || pages.at(-1)?.length === pageSize;

  const loadMore = async () => {
    if (!hasMore || loading || result.error) return;
    await result.setSize(result.size + 1);
  };

  return (
    <section className="flex h-[calc(100dvh-3rem)] min-h-96 min-w-0 flex-col">
      <h1 className="font-bold text-2xl text-pulsio-ink">Domains</h1>
      <DataTable
        className="mt-6 flex min-h-0 flex-1 flex-col"
        footer={
          result.error ? (
            <div className="flex items-center justify-between gap-4">
              <p role="alert" className="text-red-700">
                {result.error instanceof Error ? result.error.message : 'Could not load domains.'}
              </p>
              <button type="button" className="text-pulsio-blue underline" onClick={() => result.mutate()}>
                Try again
              </button>
            </div>
          ) : (
            <span>{loading && !domains.length ? 'Loading domains…' : `${count(domains.length)} domains loaded${hasMore ? ' · Scroll to load' : ''}`}</span>
          )
        }
      >
        <VirtualizedTable columns={columns} data={domains} emptyMessage="No domains found." loading={loading} onEndReached={loadMore} getRowId={(domain) => domain.id} />
      </DataTable>
    </section>
  );
};

export default Domains;
