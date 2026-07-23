import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';

// Foreground presentation (native only). On web this import is inert.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}

/** Last token we registered, so sign-out can release it. */
let registeredToken: string | null = null;

function resolveProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

/**
 * Request permission, acquire the Expo push token and register it server-side.
 * No-ops on web, without a backend, or until an EAS projectId exists (needs an
 * EAS-configured build — until then the in-app inbox is the delivery path).
 */
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web' || !supabase) return;
  try {
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return;

    const projectId = resolveProjectId();
    if (!projectId) return; // token acquisition needs an EAS projectId

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    registeredToken = token;
    const { error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    if (error) console.warn('[push] register failed:', error.message);
  } catch (error) {
    console.warn('[push] registration error:', error instanceof Error ? error.message : error);
  }
}

/** Best-effort release of this device's token (call before sign-out). */
export async function unregisterPushToken(): Promise<void> {
  if (!supabase || !registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  try {
    await supabase.rpc('unregister_push_token', { p_token: token });
  } catch {
    // best effort — a stale token is harmless (reassigned on next login)
  }
}

/**
 * Register on login and route to the inbox when a notification is tapped.
 * Call once from the app shell. Inert on web.
 */
export function usePushNotifications(userId: string | null): void {
  useEffect(() => {
    if (Platform.OS === 'web' || !userId) return;
    void registerForPushNotifications();
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/notifications');
    });
    return () => sub.remove();
  }, []);
}
