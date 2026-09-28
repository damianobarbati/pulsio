import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware/persist';

const STORAGE_KEY = `pulsio-${window.location.hostname}`;

type User = {
  id: number;
};

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const store = create<AppState>()(
  persist(
    (set, _get) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
      }),
      onRehydrateStorage: (_state) => async (hydratedState, error) => {
        if (error || !hydratedState) {
          console.error(error);
          return;
        }
      },
    },
  ),
);

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) store.persist.rehydrate();
});
