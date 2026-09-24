import { AsyncLocalStorage } from 'node:async_hooks';
import { AppError } from 'nano-fw/docs/index.ts';

export type AsyncStore = {
  user_id: string;
};

export const asyncStorage = new AsyncLocalStorage<AsyncStore>();

export const getCurrentUserId = () => {
  const store = asyncStorage.getStore();
  if (!store) return null;
  return store.user_id;
};

export const requireCurrentUserId = () => {
  const user_id = getCurrentUserId();
  if (!user_id) throw new AppError(401, 'UNAUTHORIZED', 'User not logged in.');
  return user_id;
};
