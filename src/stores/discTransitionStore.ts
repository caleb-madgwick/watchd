import { create } from 'zustand';

export interface DiscOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiscTransitionRequest {
  id: number;
  /** Which physical medium ejects: a DVD/CD disc, or a vinyl record. */
  variant: 'disc' | 'vinyl';
  /** Cover/poster art printed on the disc (or vinyl centre label). */
  art?: string;
  /** Title shown under the "NOW LOADING" caption. */
  label: string;
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
