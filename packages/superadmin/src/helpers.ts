import useSWRInfinite from 'swr/infinite';
import { POST } from 'ui/api/fetchers.ts';

export type Sort = { id: string; direction: 'asc' | 'desc' };
export type Page<T> = { page: number; pages: number; total: number } & ({ accounts: T[] } | { sites: T[] } | { payments: T[] });
export type View = 'overview' | 'users' | 'websites' | 'payments' | 'plans';

export const usePagedData = <T extends { id: string }>(view: View, query: string, sort: Sort) => {
  const getKey = (pageIndex: number, previousPage: Page<T> | null) => {
    if (previousPage && previousPage.page >= previousPage.pages) return null;
    const resource = view === 'users' ? 'accounts' : view === 'websites' ? 'websites' : 'payments';
    return `/s/${resource}?query=${encodeURIComponent(query)}&page=${pageIndex + 1}&sort=${encodeURIComponent(sort.id)}&direction=${sort.direction}`;
  };
  const result = useSWRInfinite<Page<T>>(getKey, POST, { keepPreviousData: true, revalidateFirstPage: false, shouldRetryOnError: false });
  const pages = result.data || [];
  const rows = Array.from(
    new Map(pages.flatMap((page) => ('accounts' in page ? page.accounts : 'sites' in page ? page.sites : page.payments)).map((row) => [row.id, row])).values(),
  );
  const lastPage = pages.at(-1);
  return { ...result, rows, total: pages[0]?.total || 0, hasMore: Boolean(lastPage && lastPage.page < lastPage.pages) };
};

export const dateTime = (value: string | null) => (value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Never');
export const count = (value: number) => new Intl.NumberFormat().format(value);
export const money = (amount: number, currency: string) => `${(amount / 100).toFixed(2)} ${currency}`;

// const count = (value: number) => new Intl.NumberFormat().format(value);
// const money = (amount: number) => `${(amount / 100).toFixed(2)} USD`;
// const dateTime = (value: string | null) => (value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Never');
