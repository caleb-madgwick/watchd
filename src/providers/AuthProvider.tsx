import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import { unregisterPushToken } from '@/features/notifications/push';
import { supabase } from '@/lib/supabase/client';
import { mapProfileRow, type Profile } from '@/types/profile';

interface AuthContextValue {
  /** Undefined while restoring the persisted session on launch. */
  session: Session | null | undefined;
  profile: Profile | null;
  /** True until both session and (if signed in) profile have been resolved. */
  initializing: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: undefined,
  profile: null,
  initializing: true,
  signOut: async () => undefined,
  refreshProfile: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(
    supabase ? undefined : null,
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string | null) => {
    userIdRef.current = userId;
    if (!supabase || !userId) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    // Ignore stale responses after rapid auth changes.
    if (userIdRef.current !== userId) return;
    if (error) {
      console.error('Failed to load profile:', error.message);
      setProfile(null);
    } else {
      setProfile(data ? mapProfileRow(data) : null);
    }
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void loadProfile(data.session?.user.id ?? null);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // Keep token refresh alive only while the app is foregrounded (native).
  useEffect(() => {
    if (!supabase || Platform.OS === 'web') return;
    const client = supabase;
    client.auth.startAutoRefresh();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    });
    return () => {
      listener.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    // Release this device's push token while the session is still valid.
    await unregisterPushToken();
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(userIdRef.current);
  }, [loadProfile]);

  const initializing = session === undefined || (session !== null && !profileLoaded);

  const value = useMemo(
    () => ({ session, profile, initializing, signOut, refreshProfile }),
    [session, profile, initializing, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Convenience for screens that are guaranteed to be behind the auth gate. */
export function useCurrentUserId(): string | null {
  const { session } = useAuth();
  return session?.user.id ?? null;
}
