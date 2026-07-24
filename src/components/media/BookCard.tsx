import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { BookCase } from './BookCase';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { Text } from '@/components/primitives/Text';
import { prefetchBook } from '@/features/books/prefetchBook';
import { useBookTransition } from '@/stores/bookTransitionStore';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import type { BookSummary } from '@/types/domain';
import { bookHref } from '@/utils/titles';
import { prefersReducedMotion } from '@/utils/motion';

export interface BookCardProps {
  book: BookSummary;
  width: number;
}

type MaybeWebEvent = GestureResponderEvent & {
  metaKey?: boolean;
  ctrlKey?: boolean;
  preventDefault?: () => void;
};

/**
 * A book on the shelf. Hover cracks the cover open and fans the pages; tap grows
 * the book to centre and flips through it while the detail page loads.
 */
export function BookCard({ book, width }: BookCardProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const beginTransition = useBookTransition((s) => s.begin);
  const caseRef = useRef<View>(null);
  const [lifted, setLifted] = useState(false);
  const [grabbed, setGrabbed] = useState(false);
  const [opening, setOpening] = useState(false);
  const author = book.authors[0];
  const href = bookHref(book.volumeId);

  const onPress = (event: GestureResponderEvent) => {
    const webEvent = event as MaybeWebEvent;
    if (webEvent?.metaKey || webEvent?.ctrlKey) return; // preserve open-in-new-tab
    webEvent?.preventDefault?.();
    if (opening) return;

    const ready = prefetchBook(queryClient, book);
    if (prefersReducedMotion()) {
      ready.then(() => router.push(href));
      return;
    }

    // Beat 1: the book opens in place; Beat 2: it grows to centre and flips.
    setOpening(true);
    setTimeout(() => {
      caseRef.current?.measureInWindow((x, y, w, h) => {
        beginTransition({
          book,
          origin: { x, y, width: w, height: h },
          href: typeof href === 'string' ? href : String(href),
          ready,
        });
        setTimeout(() => setOpening(false), 700);
      });
    }, 260);
  };

  return (
    <LinkPressable
      href={href}
      accessibilityLabel={`${book.title}${author ? `, ${author}` : ''}`}
      onHoverIn={() => setLifted(true)}
      onHoverOut={() => setLifted(false)}
      onPressIn={() => setGrabbed(true)}
      onPressOut={() => setGrabbed(false)}
      onPress={onPress}
      style={{ width }}
    >
      <View ref={caseRef} collapsable={false}>
        <BookCase
          posterUrl={book.coverUrl}
          title={book.title}
          width={width}
          lifted={lifted}
          pressed={grabbed || opening}
        />
      </View>
      <View style={styles.meta}>
        <Text variant="subhead" numberOfLines={1}>
          {book.title}
        </Text>
        <View style={styles.metaRow}>
          {author ? (
            <Text variant="caption" color="muted" numberOfLines={1} style={styles.author}>
              {author}
            </Text>
          ) : null}
          {book.averageRating && book.averageRating > 0 ? (
            <View style={styles.rating}>
              <Ionicons name="star" size={10} color={colors.star} />
              <Text variant="caption" color="muted">
                {book.averageRating.toFixed(1)}
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
  author: {
    flexShrink: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
});
