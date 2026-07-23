import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';

export interface PersonFollowInput {
  personTmdbId: number;
  name: string;
  knownForDepartment?: string | null;
}

function personFollowKey(userId: string, personTmdbId: number) {
  return ['personFollow', userId, personTmdbId] as const;
}

export function useIsFollowingPerson(personTmdbId: number | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: personFollowKey(userId ?? 'anon', personTmdbId ?? 0),
    enabled: !!userId && !!personTmdbId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase!
        .from('person_follows')
        .select('person_tmdb_id')
        .eq('user_id', userId!)
        .eq('person_tmdb_id', personTmdbId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return !!data;
    },
  });
}

/** Follow/unfollow a TMDB person (actor/director) for new-release alerts. */
export function useTogglePersonFollow() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async ({
      person,
      follow,
    }: {
      person: PersonFollowInput;
      follow: boolean;
    }) => {
      if (!supabase || !userId) throw new Error('Not connected.');
      if (follow) {
        const { error } = await supabase.from('person_follows').insert({
          user_id: userId,
          person_tmdb_id: person.personTmdbId,
          name: person.name,
          known_for_department: person.knownForDepartment ?? null,
        });
        if (error && error.code !== '23505') throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('person_follows')
          .delete()
          .eq('user_id', userId)
          .eq('person_tmdb_id', person.personTmdbId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_data, { person }) => {
      queryClient.invalidateQueries({
        queryKey: personFollowKey(userId ?? 'anon', person.personTmdbId),
      });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update follow.'),
  });
}
