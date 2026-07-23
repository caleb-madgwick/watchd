import { useCallback } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItemInfo } from 'react-native';

import { spacing } from '@/theme/tokens';

export interface ResponsiveGridProps<T> {
  data: T[];
  renderItem: (item: T, itemWidth: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  /** Target min column width; column count adapts to container width. */
  minItemWidth?: number;
  gap?: number;
  containerWidth: number;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;
  onEndReached?: () => void;
  contentPaddingBottom?: number;
}

/**
 * Virtualised grid whose column count adapts to the available width —
 * 3 posters on a phone, 6+ on desktop.
 */
export function ResponsiveGrid<T>({
  data,
  renderItem,
  keyExtractor,
  minItemWidth = 110,
  gap = spacing.md,
  containerWidth,
  ListHeaderComponent,
  ListEmptyComponent,
  ListFooterComponent,
  onEndReached,
  contentPaddingBottom = spacing['4xl'],
}: ResponsiveGridProps<T>) {
  const horizontalPadding = spacing.lg * 2;
  const available = Math.max(0, containerWidth - horizontalPadding);
  const numColumns = Math.max(1, Math.floor((available + gap) / (minItemWidth + gap)));
  const itemWidth = (available - gap * (numColumns - 1)) / numColumns;

  const render = useCallback(
    function GridCell({ item, index }: ListRenderItemInfo<T>) {
      return (
        <View
          style={{
            width: itemWidth,
            marginRight: (index + 1) % numColumns === 0 ? 0 : gap,
            marginBottom: gap,
          }}
        >
          {renderItem(item, itemWidth)}
        </View>
      );
    },
    [itemWidth, numColumns, gap, renderItem],
  );

  return (
    <FlatList
      key={numColumns}
      data={data}
      numColumns={numColumns}
      renderItem={render}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    // Headroom for the DVD-case pickup animation on the first row.
    paddingTop: spacing.lg,
  },
});
