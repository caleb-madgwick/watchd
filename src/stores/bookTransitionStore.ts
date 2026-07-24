import { create } from 'zustand';

import type { BookSummary } from '@/types/domain';

export interface BookTransitionOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BookTransitionRequest {
  id: number;
  book: BookSummary;
  origin: BookTransitionOrigin;
  href: string;
  /** Resolves when the book detail prefetch has settled (or timed out). */
  ready: Promise<unknown>;
}

interface BookTransitionState {
  request: BookTransitionRequest | null;
  begin: (request: Omit<BookTransitionRequest, 'id'>) => void;
  clear: () => void;
}

let nextId = 1;

/** Drives the open-book page-flip transition rendered by BookTransitionHost. */
export const useBookTransition = create<BookTransitionState>((set, get) => ({
  request: null,
  begin: (request) => {
    if (get().request) return; // one transition at a time
    set({ request: { ...request, id: nextId++ } });
  },
  clear: () => set({ request: null }),
}));
