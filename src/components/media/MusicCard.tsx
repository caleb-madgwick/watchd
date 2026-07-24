import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { RecordSleeve } from './RecordSleeve';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { Text } from '@/components/primitives/Text';
import { prefetchMusicItem } from '@/features/music/prefetch';
import { useDiscTransition } from '@/stores/discTransitionStore';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import type { AlbumSummary, SongSummary } from '@/types/domain';
import { prefersReducedMotion } from '@/utils/motion';
import { musicHref } from '@/utils/titles';

export interface MusicCardProps {
  item: AlbumSummary | SongSummary;
  width: number;
  /** Community/personal rating shown under the title, 0–5. */
  rating?: number;
}

type MaybeWebEvent = GestureResponderEvent & {
  metaKey?: boolean;
  ctrlKey?: boolean;
  preventDefault?: () => void;
};

/** A record on the shelf — hover slides the vinyl out; tap spins it to the page. */
export function MusicCard({ item, width, rating }: MusicCardProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const beginTransition = useDiscTransition((s) => s.begin);
  const sleeveRef = useRef<View>(null);
  const [lifted, setLifted] = useState(false);
  const [grabbed, setGrabbed] = useState(false);
  const [pulling, setPulling] = useState(false);
  const credit = item.artistCredit ?? item.artistNames[0];
  const year = item.mediaType === 'album' ? item.releaseYear : undefined;
  const href = musicHref(item.mediaType, item.musicBrainzId);

  const onPress = (event: GestureResponderEvent) => {
    const webEvent = event as MaybeWebEvent;
    // Let cmd/ctrl-click keep open-in-new-tab on web.
    if (webEvent?.metaKey || webEvent?.ctrlKey) return;
    webEvent?.preventDefault?.();
    if (pulling) return;

    const ready = prefetchMusicItem(queryClient, item);
    if (prefersReducedMotion()) {
      ready.then(() => router.push(href));
      return;
    }

    // Beat 1: the record slides out of the sleeve…
    setPulling(true);
    setTimeout(() => {
      // Beat 2: …then it lifts off and spins to centre screen (overlay spawns
      // roughly over the record's resting position).
      sleeveRef.current?.measureInWindow((x, y, w, h) => {
        const discW = w * 0.9;
        beginTransition({
          variant: 'vinyl',
          art: item.coverUrl,
          label: item.title,
          origin: {
            x: x + (w - discW) / 2,
            y: y + (h - discW) / 2,
            width: discW,
            height: discW,
          },
          href: typeof href === 'string' ? href : String(href),
          ready,
        });
        setTimeout(() => setPulling(false), 700);
      });
    }, 240);
  };

  return (
    <LinkPressable
      href={href}
      accessibilityLabel={`${item.title}${credit ? `, ${credit}` : ''}`}
      onHoverIn={() => setLifted(true)}
      onHoverOut={() => setLifted(false)}
      onPressIn={() => setGrabbed(true)}
      onPressOut={() => setGrabbed(false)}
      onPress={onPress}
      style={{ width }}
    >
      <View ref={sleeveRef} collapsable={false}>
        <RecordSleeve
          posterUrl={item.coverUrl}
          title={item.title}
          width={width}
          lifted={lifted}
          pressed={grabbed || pulling}
        />
      </View>
      <View style={styles.meta}>
        <Text variant="subhead" numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          {credit ? (
            <Text variant="caption" color="muted" numberOfLines={1} style={styles.credit}>
              {credit}
            </Text>
          ) : null}
          {year ? (
            <Text variant="caption" color="muted">
              {year}
            </Text>
          ) : null}
          {rating !== undefined && rating > 0 ? (
            <View style={styles.rating}>
              <Ionicons name="star" size={10} color={colors.star} />
              <Text variant="caption" color="muted">
                {rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </LinkPressable>
  );
}

const styles = StyleSheet.create({
  meta: {
    marginTop: spacing.sm + 2,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  credit: {
    flexShrink: 1,
  },
  rating: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
