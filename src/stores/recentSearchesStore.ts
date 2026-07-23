import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MAX_RECENT = 10;

interface RecentSearchesState {
  searches: string[];
  add: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
}

export const useRecentSearches = create<RecentSearchesState>()(
  persist(
    (set) => ({
      searches: [],
      add: (query) => {
        const clean = query.trim();
        if (clean.length < 2) return;
        set((state) => ({
          searches: [clean, ...state.searches.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(
            0,
            MAX_RECENT,
          ),
        }));
      },
      remove: (query) =>
        set((state) => ({ searches: state.searches.filter((s) => s !== query) })),
      clear: () => set({ searches: [] }),
    }),
    {
      name: 'watchd.recentSearches',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
