import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { DvdCase } from './DvdCase';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { Text } from '@/components/primitives/Text';
import { prefetchTitle } from '@/features/titles/prefetchTitle';
import { useDiscTransition } from '@/stores/discTransitionStore';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';
import { prefersReducedMotion } from '@/utils/motion';

export interface PosterCardProps {
  title: string;
  posterUrl?: string;
  year?: number;
  href: Href;
  width: number;
  /** Personal or community rating shown under the title, 0–5. */
  rating?: number;
  /** Extra line under the title (e.g. "Movie" / "TV"). */
  subtitle?: string;
  /** Full summary enables the disc transition + destination prefetch. */
  summary?: TitleSummary;
}

type MaybeWebEvent = GestureResponderEvent & {
  metaKey?: boolean;
  ctrlKey?: boolean;
  preventDefault?: () => void;
};

/** A DVD case on the shelf — hover/press picks it up; tap feeds the disc in. */
export function PosterCard({
  title,
  posterUrl,
  year,
  href,
  width,
  rating,
  subtitle,
  summary,
}: PosterCardProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const beginTransition = useDiscTransition((s) => s.begin);
  const caseRef = useRef<View>(null);
  const [lifted, setLifted] = useState(false);
  const [grabbed, setGrabbed] = useState(false);
  const [opening, setOpening] = useState(false);

  const onPress = summary
    ? (event: GestureResponderEvent) => {
        const webEvent = event as MaybeWebEvent;
        // Let cmd/ctrl-click keep its open-in-new-tab behaviour on web.
        if (webEvent?.metaKey || webEvent?.ctrlKey) return;
        webEvent?.preventDefault?.();
        if (opening) return;

        const ready = prefetchTitle(queryClient, summary);
        if (prefersReducedMotion()) {
          ready.then(() => router.push(href));
          return;
        }

        // Beat 1: the case swings fully open in place…
        setOpening(true);
        setTimeout(() => {
          // Beat 2: …then the disc lifts out of the tray (overlay spawns
          // exactly over the tray disc, mirroring DvdCase's geometry).
          caseRef.current?.measureInWindow((x, y, w, h) => {
            const discW = w * 0.76;
            beginTransition({
              variant: 'disc',
              art: summary.posterUrl,
              label: summary.title,
              origin: {
                x: x + w - w * 0.085 - discW,
                // The open case body is translated up by 3.5% of its height.
                y: y + (h - discW) / 2 - h * 0.035,
                width: discW,
                height: discW,
              },
              href: typeof href === 'string' ? href : String(href),
              ready,
            });
            // Close the case once the overlay has covered the screen.
            setTimeout(() => setOpening(false), 700);
          });
        }, 300);
      }
    : undefined;

  return (
    <LinkPressable
      href={href}
      accessibilityLabel={`${title}${year ? `, ${year}` : ''}`}
      onHoverIn={() => setLifted(true)}
      onHoverOut={() => setLifted(false)}
      onPressIn={() => setGrabbed(true)}
      onPressOut={() => setGrabbed(false)}
      onPress={onPress}
      style={{ width }}
    >
      <View ref={caseRef} collapsable={false}>
        <DvdCase
          posterUrl={posterUrl}
          title={title}
          width={width}
          lifted={lifted}
          pressed={grabbed || opening}
        />
      </View>
      <View style={styles.meta}>
        <Text variant="subhead" numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.metaRow}>
          {year ? (
            <Text variant="caption" color="muted">
              {year}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="caption" color="muted">
              {subtitle}
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
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
