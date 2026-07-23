import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { ensureTitleReference } from '@/features/tracking/api';
import { track } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { posterUrl } from '@/lib/tmdb/images';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type { ListRow, ListVisibilityRow } from '@/types/database';
import type { TitleSummary } from '@/types/domain';
import { yearFromDate } from '@/utils/titles';

export interface ListSummary {
  id: string;
  name: string;
  description: string;
  visibility: ListVisibilityRow;
  itemCount: number;
  likeCount: number;
  likedByMe: boolean;
  updatedAt: string;
  ownerId: string;
  /** First few poster URLs for the card fan. */
  previewPosters: string[];
}

export interface ListItemEntry {
  id: string;
  position: number;
  note: string | null;
  addedAt: string;
  title: TitleSummary;
}

function mapListRow(row: ListRow, previewPosters: string[] = []): ListSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    visibility: row.visibility,
    itemCount: row.item_count,
    likeCount: row.like_count,
    likedByMe: false,
    updatedAt: row.updated_at,
    ownerId: row.user_id,
    previewPosters,
  };
}

/** Lists owned by a user. RLS hides other people's private lists automatically. */
export function useUserLists(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lists(userId ?? ''),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<ListSummary[]> => {
      const { data, error } = await supabase!
        .from('lists')
        .select('*, list_items(position, titles(poster_path))')
        .eq('user_id', userId!)
        .order('updated_at', { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => {
        const posters = (row.list_items ?? [])
          .sort((a, b) => a.position - b.position)
          .map((item) => posterUrl(item.titles?.poster_path, 'w185'))
          .filter((url): url is string => !!url)
          .slice(0, 4);
        return mapListRow(row, posters);
      });
    },
  });
}

export function useList(listId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.list(listId ?? ''),
    enabled: !!listId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<ListSummary | null> => {
      const { data, error } = await supabase!
        .from('lists')
        .select('*')
        .eq('id', listId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      let likedByMe = false;
      if (userId) {
        const { data: like } = await supabase!
          .from('content_likes')
          .select('target_id')
          .eq('user_id', userId)
          .eq('target_type', 'list')
          .eq('target_id', data.id)
          .maybeSingle();
        likedByMe = !!like;
      }
      return { ...mapListRow(data), likedByMe };
    },
  });
}

/** Like/unlike a list (content_likes). */
export function useToggleListLike(listId: string) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (like: boolean) => {
      if (!supabase || !userId) throw new Error('Not connected.');
      if (like) {
        const { error } = await supabase
          .from('content_likes')
          .insert({ user_id: userId, target_type: 'list', target_id: listId });
        if (error && error.code !== '23505') throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('user_id', userId)
          .eq('target_type', 'list')
          .eq('target_id', listId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.list(listId) }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update the like.'),
  });
}

/** Copy any visible list into a new private list of your own, then open it. */
export function useDuplicateList() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (listId: string): Promise<string> => {
      if (!supabase) throw new Error('Not connected.');
      const { data, error } = await supabase.rpc('duplicate_list', { p_list_id: listId });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: (newId) => {
      if (userId) queryClient.invalidateQueries({ queryKey: queryKeys.lists(userId) });
      toast.success('Copied to your lists.');
      router.push(`/list/${newId}`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not copy this list.'),
  });
}

export function useListItems(listId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.listItems(listId ?? ''),
    enabled: !!listId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<ListItemEntry[]> => {
      const { data, error } = await supabase!
        .from('list_items')
        .select('id, position, note, created_at, titles(*)')
        .eq('list_id', listId!)
        .order('position', { ascending: true })
        .limit(500);
      if (error) throw new Error(error.message);
      return (data ?? [])
        .filter((row) => row.titles)
        .map((row) => ({
          id: row.id,
          position: row.position,
          note: row.note,
          addedAt: row.created_at,
          title: {
            tmdbId: row.titles!.tmdb_id,
            mediaType: row.titles!.media_type,
            title: row.titles!.title,
            posterUrl: posterUrl(row.titles!.poster_path),
            posterPath: row.titles!.poster_path ?? undefined,
            releaseYear: yearFromDate(row.titles!.release_date),
            releaseDate: row.titles!.release_date ?? undefined,
          },
        }));
    },
  });
}

/** Which of my lists already contain a given title (add-to-list sheet). */
export function useListMembership(title: Pick<TitleSummary, 'tmdbId' | 'mediaType'> | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.listMembership(userId ?? 'anon', title?.mediaType ?? 'movie', title?.tmdbId ?? 0),
    enabled: !!userId && !!title && !!supabase,
    staleTime: 15_000,
    queryFn: async (): Promise<Set<string>> => {
      const client = supabase!;
      const { data: titleRow, error: titleError } = await client
        .from('titles')
        .select('id')
        .eq('tmdb_id', title!.tmdbId)
        .eq('media_type', title!.mediaType)
        .maybeSingle();
      if (titleError) throw new Error(titleError.message);
      if (!titleRow) return new Set();
      const { data, error } = await client
        .from('list_items')
        .select('list_id, lists!inner(user_id)')
        .eq('title_id', titleRow.id)
        .eq('lists.user_id', userId!);
      if (error) throw new Error(error.message);
      return new Set((data ?? []).map((row) => row.list_id));
    },
  });
}

interface ListDetailsInput {
  name: string;
  description: string;
  visibility: ListVisibilityRow;
}

export function useCreateList() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (input: ListDetailsInput): Promise<string> => {
      if (!supabase || !userId) throw new Error('Sign in to create lists.');
      const { data, error } = await supabase
        .from('lists')
        .insert({
          user_id: userId,
          name: input.name.trim(),
          description: input.description.trim() || null,
          visibility: input.visibility,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data.id;
    },
    onSuccess: (_id, input) => {
      track('list_created', { visibility: input.visibility });
      toast.success('List created.');
      queryClient.invalidateQueries({ queryKey: queryKeys.lists(userId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not create the list.'),
  });
}

export function useUpdateList(listId: string) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (input: ListDetailsInput) => {
      if (!supabase || !userId) throw new Error('Not signed in.');
      const { error } = await supabase
        .from('lists')
        .update({
          name: input.name.trim(),
          description: input.description.trim() || null,
          visibility: input.visibility,
        })
        .eq('id', listId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('List updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists(userId ?? '') });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update the list.'),
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (listId: string) => {
      if (!supabase || !userId) throw new Error('Not signed in.');
      const { error } = await supabase.from('lists').delete().eq('id', listId).eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('List deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.lists(userId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
      router.replace('/profile');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not delete the list.'),
  });
}

export function useAddToList() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async ({ listId, title }: { listId: string; title: TitleSummary }) => {
      if (!supabase || !userId) throw new Error('Not signed in.');
      const titleId = await ensureTitleReference(title);
      const { data: maxRow, error: maxError } = await supabase
        .from('list_items')
        .select('position')
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxError) throw new Error(maxError.message);
      const { error } = await supabase.from('list_items').insert({
        list_id: listId,
        title_id: titleId,
        position: (maxRow?.position ?? -1) + 1,
      });
      if (error && error.code !== '23505') throw new Error(error.message);
    },
    onSuccess: (_data, { listId, title }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listItems(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists(userId ?? '') });
      queryClient.invalidateQueries({
        queryKey: queryKeys.listMembership(userId ?? 'anon', title.mediaType, title.tmdbId),
      });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not add to the list.'),
  });
}

export function useRemoveFromList(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!supabase) throw new Error('Not signed in.');
      const { error } = await supabase.from('list_items').delete().eq('id', itemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listItems(listId) });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['listMembership'] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not remove the title.'),
  });
}

/** Persist a full reorder (array of item ids in new order). */
export function useReorderList(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedItemIds: string[]) => {
      if (!supabase) throw new Error('Not signed in.');
      // Small lists: sequential updates are fine and keep RLS simple.
      for (let index = 0; index < orderedItemIds.length; index++) {
        const { error } = await supabase
          .from('list_items')
          .update({ position: index })
          .eq('id', orderedItemIds[index]);
        if (error) throw new Error(error.message);
      }
    },
    onMutate: async (orderedItemIds) => {
      const key = queryKeys.listItems(listId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ListItemEntry[]>(key);
      if (previous) {
        const byId = new Map(previous.map((item) => [item.id, item]));
        queryClient.setQueryData(
          key,
          orderedItemIds
            .map((id, index) => {
              const item = byId.get(id);
              return item ? { ...item, position: index } : null;
            })
            .filter((item): item is ListItemEntry => !!item),
        );
      }
      return { previous };
    },
    onError: (error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.listItems(listId), context.previous);
      }
      toast.error(error instanceof Error ? error.message : 'Could not reorder the list.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listItems(listId) });
    },
  });
}
