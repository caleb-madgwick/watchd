import { View, StyleSheet } from 'react-native';

import {
  useFriendship,
  useRemoveFriend,
  useRespondFriendRequest,
  useSendFriendRequest,
} from './hooks';
import { Button } from '@/components/primitives/Button';
import { config } from '@/constants/config';
import { useAuth, useCurrentUserId } from '@/providers/AuthProvider';
import { spacing } from '@/theme/tokens';

export interface FriendButtonProps {
  targetUserId: string;
  size?: 'sm' | 'md';
}

/**
 * State machine mirroring FollowButton:
 *   none → "Add friend"      (send request)
 *   outgoing → "Requested"   (tap to cancel)
 *   incoming → Accept / Decline
 *   friends → "Friends"      (tap to remove)
 */
export function FriendButton({ targetUserId, size = 'sm' }: FriendButtonProps) {
  const { session } = useAuth();
  const currentUserId = useCurrentUserId();
  const friendship = useFriendship(targetUserId);
  const sendRequest = useSendFriendRequest();
  const respond = useRespondFriendRequest();
  const remove = useRemoveFriend();

  if (config.demoMode || !session || currentUserId === targetUserId) return null;

  const data = friendship.data;
  const busy =
    friendship.isLoading || sendRequest.isPending || respond.isPending || remove.isPending;

  if (data?.status === 'incoming') {
    const requestId = data.requestId;
    return (
      <View style={styles.row}>
        <Button
          title="Accept"
          variant="primary"
          size={size}
          icon="checkmark"
          disabled={busy}
          onPress={() => respond.mutate({ requestId, accept: true, targetUserId })}
        />
        <Button
          title="Decline"
          variant="secondary"
          size={size}
          disabled={busy}
          onPress={() => respond.mutate({ requestId, accept: false, targetUserId })}
        />
      </View>
    );
  }

  if (data?.status === 'friends') {
    return (
      <Button
        title="Friends"
        variant="secondary"
        size={size}
        icon="people"
        disabled={busy}
        onPress={() => remove.mutate(targetUserId)}
      />
    );
  }

  if (data?.status === 'outgoing') {
    return (
      <Button
        title="Requested"
        variant="secondary"
        size={size}
        icon="time-outline"
        disabled={busy}
        onPress={() => remove.mutate(targetUserId)}
      />
    );
  }

  return (
    <Button
      title="Add friend"
      variant="outline"
      size={size}
      icon="person-add-outline"
      disabled={busy}
      onPress={() => sendRequest.mutate(targetUserId)}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
});
