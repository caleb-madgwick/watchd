import { create } from 'zustand';

import type { TitleSummary } from '@/types/domain';

export interface DiscOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiscTransitionRequest {
  id: number;
  title: TitleSummary;
  origin: DiscOrigin;
  href: string;
  /** Resolves when the destination's data prefetch has settled (or timed out). */
  ready: Promise<unknown>;
}

interface DiscTransitionState {
  request: DiscTransitionRequest | null;
  begin: (request: Omit<DiscTransitionRequest, 'id'>) => void;
  clear: () => void;
}

let nextId = 1;

/** Drives the disc-into-the-player page transition rendered by DiscTransitionHost. */
export const useDiscTransition = create<DiscTransitionState>((set, get) => ({
  request: null,
  begin: (request) => {
    if (get().request) return; // one transition at a time
    set({ request: { ...request, id: nextId++ } });
  },
  clear: () => set({ request: null }),
}));
