import useSWR, { type Fetcher, type KeyedMutator } from 'swr';
import { MPOST } from '#ui/api/fetchers.ts';

type UseMe<T> = {
  user: T;
  mutate: KeyedMutator<T>;
};

export const useMe = <T extends { role: string }>(fetcher: Fetcher<T>, role?: T['role'], redirect: string = '/auth'): UseMe<T> => {
  const loadMe: Fetcher<T> = async (key) => {
    try {
      const user = await fetcher(key);

      if (role && user.role !== role) throw Object.assign(new Error('Access denied.'), { status: 403 });

      return user;
    } catch (error) {
      try {
        await MPOST('/auth/logout', { arg: {} });
      } finally {
        window.location.replace(redirect);
      }

      throw error;
    }
  };

  const { data: user, mutate } = useSWR<T>(['/auth/me', role], loadMe, { suspense: true, dedupingInterval: 60_000, shouldRetryOnError: false });

  if (!user) {
    window.location.replace(redirect);
    throw new Error('Could not load user.');
  }

  return { user, mutate };
};
