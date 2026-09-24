import { AsyncLocalStorage } from 'node:async_hooks';

export type AsyncStore = {
  user_id: string;
};

export const asyncLocalStorage = new AsyncLocalStorage<AsyncStore>();
