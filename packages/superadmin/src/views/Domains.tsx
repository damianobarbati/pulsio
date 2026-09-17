import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from 'ui';
import { VirtualizedTable, type virtualizedTableFeatures } from '../VirtualizedTable.tsx';

export type Domain = {
  id: string;
  account_id: string;
  email: string;
  domain: string;
  detected: boolean;
  detected_at: string | null;
  created_at: string;
  events: number;
  latest_event_at: string | null;
};
type Props = {
  data: Domain[];
  total: number;
  loading: boolean;
  error?: Error;
  hasMore: boolean;
  onEndReached: () => void;
  onOpen: (domain: Domain) => void;
  sort: { id: string; direction: 'asc' | 'desc' };
  onSort: (id: string) => void;
};
const count = (value: number) => new Intl.NumberFormat().format(value);
const dateTime = (value: string | null) => (value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Never');
const column = createColumnHelper<typeof virtualizedTableFeatures, Domain>();
const columns = column.columns([
  column.display({
    id: 'status',
    header: () => <span className="sr-only">Status</span>,
    size: 44,
    cell: (info) => (
      <span
        role="img"
        aria-label={info.row.original.detected ? 'Active' : 'Inactive'}
        className={`inline-block size-2.5 rounded-full ${info.row.original.detected ? 'bg-emerald-500' : 'bg-red-500'}`}
      />
    ),
  }),
  column.accessor('domain', { header: 'Website', size: 280, cell: (info) => <span className="font-medium">{info.getValue()}</span> }),
  column.accessor('events', { header: 'Events', size: 130, cell: (info) => count(info.getValue()) }),
  column.accessor('latest_event_at', { header: 'Last event', size: 160, cell: (info) => dateTime(info.getValue()) }),
  column.accessor('email', {
    header: 'Owner',
    size: 320,
    cell: (info) => (
      <a
        href={`/users/${info.row.original.account_id}`}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-pulsio-blue underline underline-offset-4"
        onClick={(event) => event.stopPropagation()}
      >
        {info.getValue()}
      </a>
    ),
  }),
  column.accessor('created_at', { header: 'Created', size: 200, cell: (info) => dateTime(info.getValue()) }),
]);

export const DomainsView = ({ data, total, loading, error, hasMore, onEndReached, onOpen, sort, onSort }: Props) => (
  <DataTable
    className="mt-8 flex min-h-0 min-w-0 flex-1 flex-col [&>div:first-child]:min-h-0 [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1"
    footer={
      error ? (
        <p role="alert" className="text-center text-red-700">
          {error.message}
        </p>
      ) : (
        <span className="block text-center">{count(total)} websites found</span>
      )
    }
  >
    <VirtualizedTable
      columns={columns}
      data={data}
      emptyMessage="No websites match this search."
      loading={loading}
      onEndReached={() => hasMore && onEndReached()}
      onRowClick={onOpen}
      getRowId={(domain) => domain.id}
      sort={sort}
      onSort={onSort}
      sortableColumns={['domain', 'email', 'detected_at', 'created_at']}
    />
  </DataTable>
);
