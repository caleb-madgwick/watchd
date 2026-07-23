import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { ListCard } from '@/components/lists/ListCard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { useUserLists } from '@/features/lists/hooks';
import { useProfileByUsername } from '@/features/profile/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { contentWidth, spacing } from '@/theme/tokens';

export default function UserListsScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const profile = useProfileByUsername(username);
  const lists = useUserLists(profile.data?.id);

  return (
    <ProfileSubpageShell title="Lists" subtitle={username ? `@${username}` : undefined}>
      <Stack.Screen options={{ title: `Lists by @${username ?? ''} — Watchd` }} />
      {profile.isLoading || lists.isLoading ? (
        <View style={styles.loading}>
          <CardListSkeleton count={4} />
        </View>
      ) : !lists.data || lists.data.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          title="No lists yet"
          message="Public lists they create will appear here."
        />
      ) : (
        <FlatList
          data={lists.data}
          keyExtractor={(list) => list.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => <ListCard list={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: spacing.lg,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing['6xl'],
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
  },
});
