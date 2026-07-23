import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** ISO-3166-1 alpha-2 fallback when the device region can't be resolved. */
const FALLBACK_REGION = 'US';

/** Best-effort device region (e.g. "AU"), used as the default for new users. */
function deviceRegion(): string {
  try {
    const code = Localization.getLocales()[0]?.regionCode;
    return code ? code.toUpperCase() : FALLBACK_REGION;
  } catch {
    return FALLBACK_REGION;
  }
}

interface RegionState {
  /** Country whose streaming availability is shown. */
  region: string;
  setRegion: (region: string) => void;
}

export const useRegion = create<RegionState>()(
  persist(
    (set) => ({
      region: deviceRegion(),
      setRegion: (region) => set({ region: region.toUpperCase() }),
    }),
    {
      name: 'watchd.watchRegion',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
