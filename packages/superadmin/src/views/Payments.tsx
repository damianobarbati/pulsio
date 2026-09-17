import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from 'ui';
import { VirtualizedTable, type virtualizedTableFeatures } from '../VirtualizedTable.tsx';

export type Payment = { id: string; account_id: string | null; email: string | null; amount: number; currency: string; status: string; created_at: string };
type Props = {
  data: Payment[];
  total: number;
  loading: boolean;
  error?: Error;
  hasMore: boolean;
  onEndReached: () => void;
  sort: { id: string; direction: 'asc' | 'desc' };
  onSort: (id: string) => void;
};
const count = (value: number) => new Intl.NumberFormat().format(value);
const money = (amount: number, currency: string) => `${(amount / 100).toFixed(2)} ${currency}`;
const dateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const column = createColumnHelper<typeof virtualizedTableFeatures, Payment>();
const columns = column.columns([
  column.accessor('email', { header: 'User', size: 360, cell: (info) => <span className="font-medium">{info.getValue() || 'Deleted user'}</span> }),
  column.accessor('amount', { header: 'Amount', size: 160, cell: (info) => money(info.getValue(), info.row.original.currency) }),
  column.accessor('status', { header: 'Status', size: 160, cell: (info) => <span className="capitalize">{info.getValue()}</span> }),
  column.accessor('created_at', { header: 'Date', size: 200, cell: (info) => dateTime(info.getValue()) }),
]);

export const PaymentsView = ({ data, total, loading, error, hasMore, onEndReached, sort, onSort }: Props) => (
  <DataTable
    className="mt-8 flex min-h-0 min-w-0 flex-1 flex-col [&>div:first-child]:min-h-0 [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1"
    footer={
      error ? (
        <p role="alert" className="text-center text-red-700">
          {error.message}
        </p>
      ) : (
        <span className="block text-center">{count(total)} payments found</span>
      )
    }
  >
    <VirtualizedTable
      columns={columns}
      data={data}
      emptyMessage="No payments match this search."
      loading={loading}
      onEndReached={() => hasMore && onEndReached()}
      getRowId={(payment) => payment.id}
      sort={sort}
      onSort={onSort}
      sortableColumns={['email', 'amount', 'status', 'created_at']}
    />
  </DataTable>
);
