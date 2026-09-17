import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from 'ui';
import { VirtualizedTable, type virtualizedTableFeatures } from '../VirtualizedTable.tsx';

export type Account = {
  id: string;
  email: string;
  created_at: string;
  suspended_at: string | null;
  last_login_at: string | null;
  site_count: number;
  detected_site_count: number;
  plan: string | null;
  account_status: 'active' | 'trialing' | 'inactive';
  total_paid: number;
  events: number;
};
type Props = {
  data: Account[];
  total: number;
  loading: boolean;
  error?: Error;
  hasMore: boolean;
  onEndReached: () => void;
  onOpen: (account: Account) => void;
  sort: { id: string; direction: 'asc' | 'desc' };
  onSort: (id: string) => void;
};
const count = (value: number) => new Intl.NumberFormat().format(value);
const money = (amount: number) => `${(amount / 100).toFixed(2)} USD`;
const dateTime = (value: string | null) => (value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Never');
const StatusDot = ({ status }: { status: Account['account_status'] }) => (
  <span
    role="img"
    aria-label={status}
    title={status}
    className={`inline-block size-2.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : status === 'trialing' ? 'bg-amber-400' : 'bg-red-500'}`}
  />
);
const column = createColumnHelper<typeof virtualizedTableFeatures, Account>();
const columns = column.columns([
  column.display({ id: 'status', header: () => <span className="sr-only">Status</span>, size: 40, cell: (info) => <StatusDot status={info.row.original.account_status} /> }),
  column.accessor('email', { header: 'User', size: 300, cell: (info) => <span className="font-medium">{info.getValue()}</span> }),
  column.accessor('site_count', { header: 'Domains', size: 120, cell: (info) => count(info.getValue()) }),
  column.accessor('events', { header: 'Events', size: 130, cell: (info) => count(info.getValue()) }),
  column.accessor('plan', { header: 'Plan', size: 110, cell: (info) => <span className="capitalize">{info.getValue() || 'No plan'}</span> }),
  column.accessor('total_paid', { header: 'Value', size: 100, cell: (info) => money(info.getValue()) }),
  column.accessor('last_login_at', { header: 'Last login', size: 160, cell: (info) => dateTime(info.getValue()) }),
]);

export const UsersView = ({ data, total, loading, error, hasMore, onEndReached, onOpen, sort, onSort }: Props) => (
  <DataTable
    className="mt-8 flex min-h-0 min-w-0 flex-1 flex-col [&>div:first-child]:min-h-0 [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1"
    footer={
      error ? (
        <p role="alert" className="text-center text-red-700">
          {error.message}
        </p>
      ) : (
        <span className="block text-center">{count(total)} users found</span>
      )
    }
  >
    <VirtualizedTable
      columns={columns}
      data={data}
      emptyMessage="No users match this search."
      loading={loading}
      onEndReached={() => hasMore && onEndReached()}
      onRowClick={onOpen}
      getRowId={(account) => account.id}
      sort={sort}
      onSort={onSort}
      sortableColumns={['email', 'site_count', 'plan', 'total_paid', 'last_login_at']}
    />
  </DataTable>
);
