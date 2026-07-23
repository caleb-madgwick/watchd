import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ensureTitleReference } from '@/features/tracking/api';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type { TitleSummary } from '@/types/domain';

/** Normalise raw tag input to the DB's allowed shape (or null if unusable). */
export function normaliseTag(raw: string): string | null {
  const tag = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 _-]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 30)
    .trim();
  return /^[a-z0-9][a-z0-9 _-]*$/.test(tag) ? tag : null;
}

function tagsKey(userId: string, mediaType: string, tmdbId: number) {
  return ['titleTags', userId, mediaType, tmdbId] as const;
}

/** The current user's tags on a title. */
export function useTitleTags(title: Pick<TitleSummary, 'tmdbId' | 'mediaType'> | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: tagsKey(userId ?? 'anon', title?.mediaType ?? '', title?.tmdbId ?? 0),
    enabled: !!userId && !!title && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase!
        .from('title_tags')
        .select('tag, titles!inner(tmdb_id, media_type)')
        .eq('user_id', userId!)
        .eq('titles.tmdb_id', title!.tmdbId)
        .eq('titles.media_type', title!.mediaType)
        .order('tag', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.tag);
    },
  });
}

export function useAddTag(title: TitleSummary) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (rawTag: string) => {
      if (!supabase || !userId) throw new Error('Not connected.');
      const tag = normaliseTag(rawTag);
      if (!tag) throw new Error('Tags use letters, numbers, spaces, - and _.');
      const titleId = await ensureTitleReference(title);
      const { error } = await supabase
        .from('title_tags')
        .insert({ user_id: userId, title_id: titleId, tag });
      if (error && error.code !== '23505') throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: tagsKey(userId ?? 'anon', title.mediaType, title.tmdbId),
      }),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not add tag.'),
  });
}

export function useRemoveTag(title: TitleSummary) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (tag: string) => {
      if (!supabase || !userId) throw new Error('Not connected.');
      const titleId = await ensureTitleReference(title);
      const { error } = await supabase
        .from('title_tags')
        .delete()
        .eq('user_id', userId)
        .eq('title_id', titleId)
        .eq('tag', tag);
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: tagsKey(userId ?? 'anon', title.mediaType, title.tmdbId),
      }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not remove tag.'),
  });
}
