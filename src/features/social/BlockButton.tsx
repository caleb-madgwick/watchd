import { Button } from '@/components/primitives/Button';
import { useIsBlocking, useToggleBlock } from '@/features/social/blocks';
import { useCurrentUserId } from '@/providers/AuthProvider';

/** Block/unblock toggle for another user's profile. Hidden when signed out. */
export function BlockButton({ targetUserId }: { targetUserId: string }) {
  const currentUserId = useCurrentUserId();
  const isBlocking = useIsBlocking(targetUserId);
  const toggle = useToggleBlock(targetUserId);

  if (!currentUserId || currentUserId === targetUserId) return null;

  const blocking = isBlocking.data ?? false;
  return (
    <Button
      title={blocking ? 'Unblock' : 'Block'}
      variant="ghost"
      size="sm"
      icon={blocking ? 'lock-open-outline' : 'ban-outline'}
      loading={toggle.isPending}
      onPress={() => toggle.mutate(!blocking)}
    />
  );
}
