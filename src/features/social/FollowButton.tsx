import { useFollowState, useToggleFollow } from './hooks';
import { Button } from '@/components/primitives/Button';
import { config } from '@/constants/config';
import { useAuth, useCurrentUserId } from '@/providers/AuthProvider';

export interface FollowButtonProps {
  targetUserId: string;
  targetUsername?: string;
  size?: 'sm' | 'md';
}

export function FollowButton({ targetUserId, targetUsername, size = 'sm' }: FollowButtonProps) {
  const { session } = useAuth();
  const currentUserId = useCurrentUserId();
  const followState = useFollowState(targetUserId);
  const toggleFollow = useToggleFollow(targetUserId, targetUsername);

  if (config.demoMode || !session || currentUserId === targetUserId) return null;

  const following = followState.data ?? false;

  return (
    <Button
      title={following ? 'Following' : 'Follow'}
      variant={following ? 'secondary' : 'primary'}
      size={size}
      icon={following ? 'checkmark' : 'person-add-outline'}
      disabled={followState.isLoading}
      onPress={() => toggleFollow.mutate(!following)}
    />
  );
}
