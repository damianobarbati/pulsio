import useSWR, { type Fetcher, type KeyedMutator } from 'swr';
import { mutation } from '../api/api.ts';

type UseMe<T> = {
  user: NonNullable<T>;
  mutate: KeyedMutator<T>;
};

export const useMe = <T extends { role: string }>(fetcher: Fetcher<T>, role?: T['role'], redirect: string = '/auth'): UseMe<T> => {
  const loadMe: Fetcher<T> = async (key) => {
    try {
      const user = await fetcher(key);

      if (role && user.role !== role) throw Object.assign(new Error('Access denied.'), { status: 403 });

      return user;
    } catch (error) {
      if (!(error instanceof Error && 'status' in error && (error.status === 401 || error.status === 403) && redirect)) throw error;

      await mutation('/auth/logout', { arg: {} });

      window.location.replace(redirect);
      const navigation = new Promise<never>(() => {});
      return await navigation;
    }
  };

  const { data: user, mutate } = useSWR<T>(['/auth/me', role], loadMe, { suspense: true, dedupingInterval: 60_000 });

  return { user: user as NonNullable<T>, mutate };
};
