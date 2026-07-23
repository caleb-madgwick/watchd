import { Button } from '@/components/primitives/Button';
import { useIsFollowingPerson, useTogglePersonFollow } from '@/features/social/personFollows';
import { useCurrentUserId } from '@/providers/AuthProvider';

/** Follow/unfollow a TMDB person. Hidden when signed out. */
export function FollowPersonButton({
  personTmdbId,
  name,
  knownForDepartment,
}: {
  personTmdbId: number;
  name: string;
  knownForDepartment?: string | null;
}) {
  const currentUserId = useCurrentUserId();
  const isFollowing = useIsFollowingPerson(personTmdbId);
  const toggle = useTogglePersonFollow();

  if (!currentUserId) return null;
  const following = isFollowing.data ?? false;

  return (
    <Button
      title={following ? 'Following' : 'Follow'}
      variant={following ? 'secondary' : 'primary'}
      size="sm"
      icon={following ? 'checkmark' : 'notifications-outline'}
      loading={toggle.isPending}
      onPress={() =>
        toggle.mutate({ person: { personTmdbId, name, knownForDepartment }, follow: !following })
      }
    />
  );
}
