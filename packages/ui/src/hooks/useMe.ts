import React from 'react';
import useSWR, { type Fetcher, type KeyedMutator } from 'swr';
import { useLocation } from 'wouter';

type UseMe<T> = {
  user: NonNullable<T>;
  mutate: KeyedMutator<T>;
};

export const useMe = <T>(fetcher: Fetcher<T>, redirect: string = '/auth'): UseMe<T> => {
  const [, setLocation] = useLocation();

  const { data: user, mutate } = useSWR<T>(['/auth/me'], fetcher, { suspense: true, dedupingInterval: 60_000 });

  React.useEffect(() => {
    if (!user && redirect) setLocation(redirect);
  }, [user, setLocation, redirect]);

  return { user: user as NonNullable<T>, mutate };
};
