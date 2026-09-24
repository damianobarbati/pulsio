import { createColumnHelper } from '@tanstack/react-table';
import React from 'react';
import useSWRInfinite from 'swr/infinite';
import type { UserListRequest, UserListResponse } from 'types/User.ts';
import { DataTable, Input } from 'ui';
import { post } from 'ui/api/api.ts';
import { VirtualizedTable, type virtualizedTableFeatures } from 'ui/VirtualizedTable.tsx';
import { count, dateTime } from '#superadmin/helpers.ts';

type User = UserListResponse[number];
type Sort = { id: 'email' | 'created_at' | 'login_at' | 'trial_ends_at'; direction: 'asc' | 'desc' };
type PageKey = [string, string, number, Sort['id'], Sort['direction']];

const pageSize = 50;
const column = createColumnHelper<typeof virtualizedTableFeatures, User>();
const columns = column.columns([
  column.accessor('email', { header: 'Email', size: 300, cell: (info) => <span className="font-medium">{info.getValue()}</span> }),
  column.accessor('name', { header: 'Name', size: 180, cell: (info) => info.getValue() || '—' }),
  column.accessor('role', { header: 'Role', size: 120, cell: (info) => <span className="capitalize">{info.getValue()}</span> }),
  column.accessor('suspended_at', {
    header: 'Access',
    size: 130,
    cell: (info) => <span className={info.getValue() ? 'text-red-700' : 'text-emerald-700'}>{info.getValue() ? 'Suspended' : 'Enabled'}</span>,
  }),
  column.accessor('created_at', { header: 'Created', size: 180, cell: (info) => dateTime(info.getValue()) }),
  column.accessor('login_at', { header: 'Last login', size: 180, cell: (info) => dateTime(info.getValue()) }),
  column.accessor('trial_ends_at', { header: 'Trial ends', size: 180, cell: (info) => dateTime(info.getValue()) }),
]);

const loadPage = async ([url, search, offset, sortId, direction]: PageKey): Promise<UserListResponse> => {
  const body: UserListRequest = {
    search,
    limit: pageSize,
    offset,
    sort: [
      [sortId, direction],
      ['id', 'asc'],
    ],
  };
  const users = await post<UserListResponse>(url, body);
  return users;
};

export const Users = () => {
  const [query, setQuery] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<Sort>({ id: 'created_at', direction: 'desc' });

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const getKey = (pageIndex: number, previousPage: UserListResponse | null): PageKey | null => {
    if (previousPage && previousPage.length < pageSize) return null;
    const key: PageKey = ['/s/user/list', search, pageIndex * pageSize, sort.id, sort.direction];
    return key;
  };

  const result = useSWRInfinite<UserListResponse>(getKey, loadPage, { revalidateFirstPage: false, shouldRetryOnError: false });
  const pages = result.data || [];
  const users = pages.flat();
  const loading = result.isLoading || result.isValidating;
  const hasMore = pages.length === 0 || pages.at(-1)?.length === pageSize;

  const loadMore = async () => {
    if (!hasMore || loading || result.error) return;
    await result.setSize(result.size + 1);
  };

  const changeSort = (id: string) => {
    if (id !== 'email' && id !== 'created_at' && id !== 'login_at' && id !== 'trial_ends_at') return;
    setSort((previous) => ({ id, direction: previous.id === id && previous.direction === 'asc' ? 'desc' : 'asc' }));
  };

  return (
    <section className="flex h-[calc(100dvh-3rem)] min-h-96 min-w-0 flex-col">
      <h1 className="font-bold text-2xl text-pulsio-ink">Users</h1>
      <DataTable
        className="mt-6 flex min-h-0 flex-1 flex-col"
        search={
          <label className="block w-full max-w-sm font-medium text-sm">
            Search users
            <Input className="mt-2" type="search" placeholder="Name or email" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        }
        footer={
          result.error ? (
            <div className="flex items-center justify-between gap-4">
              <p role="alert" className="text-red-700">
                {result.error instanceof Error ? result.error.message : 'Could not load users.'}
              </p>
              <button type="button" className="font-medium text-pulsio-blue underline" onClick={() => result.mutate()}>
                Try again
              </button>
            </div>
          ) : (
            <span>{loading && !users.length ? 'Loading users…' : `${count(users.length)} users loaded${hasMore ? ' · Scroll to load more' : ''}`}</span>
          )
        }
      >
        <VirtualizedTable
          key={`${search}:${sort.id}:${sort.direction}`}
          columns={columns}
          data={users}
          emptyMessage={result.error ? 'Could not load users.' : 'No users match this search.'}
          loading={loading}
          onEndReached={loadMore}
          getRowId={(user) => user.id}
          sort={sort}
          onSort={changeSort}
          sortableColumns={['email', 'created_at', 'login_at', 'trial_ends_at']}
        />
      </DataTable>
    </section>
  );
};

export default Users;
