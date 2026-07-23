/**
 * Analytics + error-reporting abstraction.
 *
 * The app calls track()/reportError() everywhere; swapping providers means
 * implementing AnalyticsProvider once here. The default provider is structured
 * console logging (fine for local/MVP).
 *
 * To connect Sentry later:
 *   1. npx expo install @sentry/react-native and follow their Expo guide
 *   2. Implement AnalyticsProvider.reportError with Sentry.captureException
 *   3. setProvider(sentryProvider) during app start
 * No review text or other user content is ever sent — event payloads are
 * limited to ids and coarse metadata by the AnalyticsEvent type below.
 */

export type AnalyticsEvent =
  | { name: 'registration_completed' }
  | { name: 'onboarding_completed' }
  | { name: 'search_performed'; scope: 'all' | 'movie' | 'tv' | 'user' }
  | { name: 'title_opened'; mediaType: 'movie' | 'tv'; tmdbId: number }
  | { name: 'title_watchlisted'; mediaType: 'movie' | 'tv'; tmdbId: number }
  | { name: 'title_watched'; mediaType: 'movie' | 'tv'; tmdbId: number }
  | { name: 'rating_submitted'; mediaType: 'movie' | 'tv'; tmdbId: number; rating: number }
  | { name: 'review_submitted'; mediaType: 'movie' | 'tv'; tmdbId: number; hasSpoilers: boolean }
  | { name: 'tv_progress_updated'; tmdbId: number; completed: boolean }
  | { name: 'user_followed' }
  | { name: 'list_created'; visibility: 'public' | 'private' }
  | { name: 'account_deleted' };

type EventName = AnalyticsEvent['name'];
type EventPayload<N extends EventName> = Omit<Extract<AnalyticsEvent, { name: N }>, 'name'>;

export interface AnalyticsProvider {
  track: (event: AnalyticsEvent) => void;
  identify: (userId: string | null) => void;
  reportError: (error: unknown, context?: Record<string, string | number>) => void;
}

const consoleProvider: AnalyticsProvider = {
  track(event) {
    if (__DEV__) {
      console.log('[analytics]', JSON.stringify(event));
    }
  },
  identify(userId) {
    if (__DEV__) {
      console.log('[analytics] identify', userId ?? '(signed out)');
    }
  },
  reportError(error, context) {
    console.error('[error-report]', error, context ? JSON.stringify(context) : '');
  },
};

let provider: AnalyticsProvider = consoleProvider;

export function setProvider(next: AnalyticsProvider) {
  provider = next;
}

export function track<N extends EventName>(
  ...args: keyof EventPayload<N> extends never ? [name: N] : [name: N, payload: EventPayload<N>]
): void {
  const [name, payload] = args;
  try {
    provider.track({ name, ...(payload ?? {}) } as AnalyticsEvent);
  } catch {
    // Analytics must never break the app.
  }
}

export function identifyUser(userId: string | null) {
  try {
    provider.identify(userId);
  } catch {
    // ignore
  }
}

export function reportError(error: unknown, context?: Record<string, string | number>) {
  try {
    provider.reportError(error, context);
  } catch {
    // ignore
  }
}
