import useSWR, { type Fetcher, type KeyedMutator } from 'swr';
import { mutation } from '../api/api.ts';

type UseMe<T> = {
  user: NonNullable<T>;
  mutate: KeyedMutator<T>;
};

export const useMe = <T>(fetcher: Fetcher<T>, redirect: string = '/auth'): UseMe<T> => {
  const loadMe: Fetcher<T> = async (key) => {
    try {
      const user = await fetcher(key);
      return user;
    } catch (error) {
      if (!(error instanceof Error && 'status' in error && error.status === 401 && redirect)) throw error;

      try {
        await mutation('/auth/logout', { arg: {} });
      } catch (logoutError) {
        console.error(logoutError);
      }

      window.location.replace(redirect);
      const navigation = new Promise<never>(() => {});
      return await navigation;
    }
  };

  const { data: user, mutate } = useSWR<T>(['/auth/me'], loadMe, { suspense: true, dedupingInterval: 60_000 });

  return { user: user as NonNullable<T>, mutate };
};
