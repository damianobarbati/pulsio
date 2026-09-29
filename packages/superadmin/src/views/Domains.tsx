import { createColumnHelper } from '@tanstack/react-table';
import cx from 'clsx-tw';
import React from 'react';
import useSWRInfinite from 'swr/infinite';
import useSWRMutation from 'swr/mutation';
import type { IDomain } from 'types/Domain.ts';
import { DataTable, Spinner } from 'ui';
import { MDELETE, POST } from 'ui/api/fetchers.ts';
import { Dialog } from 'ui/component/Dialog.tsx';
import { VirtualizedTable, type virtualizedTableFeatures } from 'ui/component/VirtualizedTable.tsx';
import { count, dateTime } from '#superadmin/helpers.ts';

type Domain = IDomain.listResponse[number];
type PageKey = [string, number];

const pageSize = 50;
const column = createColumnHelper<typeof virtualizedTableFeatures, Domain>();

const loadPage = async ([url, offset]: PageKey): Promise<IDomain.listResponse> => {
  const body: IDomain.listRequest = {
    limit: pageSize,
    offset,
    sort: [
      ['created_at', 'desc'],
      ['id', 'asc'],
    ],
  };
  const domains = await POST<IDomain.listResponse>([url, body]);
  return domains;
};

export const Domains = ({ className }: { className?: string }) => {
  const getKey = (pageIndex: number, previousPage: IDomain.listResponse | null): PageKey | null => {
    if (previousPage && previousPage.length < pageSize) return null;
    const key: PageKey = ['/s/domain/list', pageIndex * pageSize];
    return key;
  };

  const result = useSWRInfinite<IDomain.listResponse>(getKey, loadPage, { revalidateFirstPage: false, shouldRetryOnError: false });
  const pages = result.data || [];
  const domains = pages.flat();
  const loading = result.isLoading || result.isValidating;
  const hasMore = pages.length === 0 || pages.at(-1)?.length === pageSize;
  const [domainToDelete, setDomainToDelete] = React.useState<Domain | null>(null);
  const [deletingDomainId, setDeletingDomainId] = React.useState('');
  const [deleteError, setDeleteError] = React.useState('');
  const remove = useSWRMutation(domainToDelete ? `/s/domain/${domainToDelete.id}` : null, MDELETE);
  const isDeleting = deletingDomainId !== '';
  const columns = column.columns([
    column.accessor('domain', { header: 'Domain', size: 300 }),
    column.accessor('user_id', { header: 'Owner ID', size: 310 }),
    column.accessor('detected_at', { header: 'Detected', size: 180, cell: (info) => dateTime(info.getValue()) }),
    column.accessor('currency', { header: 'Currency', size: 130, cell: (info) => info.getValue() || '—' }),
    column.accessor('created_at', { header: 'Created', size: 180, cell: (info) => dateTime(info.getValue()) }),
    column.accessor('id', {
      header: 'Actions',
      size: 110,
      cell: (info) => (
        <button
          type="button"
          className="text-red-700 underline underline-offset-2 disabled:opacity-50"
          disabled={isDeleting}
          onClick={(event) => {
            event.stopPropagation();
            setDeleteError('');
            setDomainToDelete(info.row.original);
          }}
        >
          Delete
        </button>
      ),
    }),
  ]);

  const loadMore = async () => {
    if (!hasMore || loading || result.error) return;
    await result.setSize(result.size + 1);
  };

  const confirmDelete = async () => {
    if (!domainToDelete) return;
    setDeletingDomainId(domainToDelete.id);
    setDeleteError('');
    try {
      await remove.trigger();
      await result.mutate();
      setDomainToDelete(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete domain.');
    } finally {
      setDeletingDomainId('');
    }
  };

  return (
    <section className={cx('flex h-[calc(100dvh-3rem)] min-h-96 min-w-0 flex-col', className)}>
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
      <Dialog
        open={domainToDelete !== null}
        title="Delete domain?"
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete domain'}
        busy={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => {
          if (!isDeleting) setDomainToDelete(null);
        }}
      >
        <p>This permanently deletes {domainToDelete?.domain}, its events, and associated data.</p>
        {isDeleting && (
          <div className="mt-4 flex items-center gap-2 text-pulsio-muted">
            <Spinner size="sm" centered={false} />
            <span>Deleting domain…</span>
          </div>
        )}
        {deleteError && (
          <p className="mt-4 text-red-700" role="alert">
            {deleteError}
          </p>
        )}
      </Dialog>
    </section>
  );
};

export default Domains;
