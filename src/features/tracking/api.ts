import { requireSupabase } from '@/lib/supabase/client';
import type {
  LogTitleResult,
  UserTitleStatusRow,
  WatchStatusRow,
} from '@/types/database';
import type {
  AlbumSummary,
  BookDetails,
  BookSummary,
  MusicSummary,
  SongSummary,
  TitleSummary,
  WatchStatus,
} from '@/types/domain';

/**
 * Anything trackable: a TMDB title (movie/tv), a Google Books volume, or a music
 * album/song. Artists are catalogue-only (not rated or listed), so they are not
 * part of this union — every member has a `.title`.
 */
export type TrackableMedia = TitleSummary | BookSummary | AlbumSummary | SongSummary;

/**
 * Ensures a local reference row exists for a TMDB title and returns its uuid.
 * Goes through the validated SECURITY DEFINER RPC — the only write path into
 * the titles table.
 */
export async function ensureTitleReference(title: TitleSummary): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('upsert_title_reference', {
    p_tmdb_id: title.tmdbId,
    p_media_type: title.mediaType,
    p_title: title.title,
    p_original_title: title.originalTitle ?? null,
    p_poster_path: title.posterPath ?? null,
    p_backdrop_path: title.backdropPath ?? null,
    p_release_date: title.releaseDate ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** The book equivalent of ensureTitleReference — upserts a Google Books volume. */
export async function ensureBookReference(book: BookSummary): Promise<string> {
  const supabase = requireSupabase();
  const details = book as Partial<BookDetails>;
  const { data, error } = await supabase.rpc('upsert_book_reference', {
    p_volume_id: book.volumeId,
    p_title: book.title,
    p_authors: book.authors,
    p_cover_url: book.coverUrl ?? null,
    p_categories: details.categories ?? [],
    p_page_count: details.pageCount ?? null,
    p_published_date: book.publishedDate ?? null,
    p_isbn13: book.isbn13 ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** The music equivalent — upserts a MusicBrainz artist/album/song reference. */
export async function ensureMusicReference(item: MusicSummary): Promise<string> {
  const supabase = requireSupabase();
  const title = item.mediaType === 'artist' ? item.name : item.title;
  const subtitle =
    item.mediaType === 'artist'
      ? (item.disambiguation ?? null)
      : (item.artistCredit ?? (item.artistNames.length > 0 ? item.artistNames.join(', ') : null));
  const coverUrl = item.mediaType === 'artist' ? (item.imageUrl ?? null) : (item.coverUrl ?? null);
  const releaseDate = item.mediaType === 'album' ? (item.releaseDate ?? null) : null;

  const { data, error } = await supabase.rpc('upsert_music_reference', {
    p_mbid: item.musicBrainzId,
    p_media_type: item.mediaType,
    p_title: title,
    p_subtitle: subtitle,
    p_cover_url: coverUrl,
    p_release_date: releaseDate,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Resolve any trackable to its titles.id (uuid): music vs book vs movie/tv. */
export async function ensureReference(item: TrackableMedia): Promise<string> {
  if ('musicBrainzId' in item) return ensureMusicReference(item);
  return 'volumeId' in item ? ensureBookReference(item) : ensureTitleReference(item);
}

export async function fetchTitleStatus(
  userId: string,
  title: Pick<TitleSummary, 'tmdbId' | 'mediaType'>,
): Promise<UserTitleStatusRow | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('user_title_status')
    .select('*, titles!inner(tmdb_id, media_type)')
    .eq('user_id', userId)
    .eq('titles.tmdb_id', title.tmdbId)
    .eq('titles.media_type', title.mediaType)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Quiet status change (watchlist toggle etc.) — no feed activity is created. */
export async function setTitleStatus(
  userId: string,
  title: TrackableMedia,
  status: WatchStatus | null,
): Promise<void> {
  const supabase = requireSupabase();
  const titleId = await ensureReference(title);
  if (status === null) {
    const { error } = await supabase
      .from('user_title_status')
      .update({ status: null })
      .eq('user_id', userId)
      .eq('title_id', titleId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from('user_title_status').upsert(
    {
      user_id: userId,
      title_id: titleId,
      status: status as WatchStatusRow,
      ...(status === 'watched' ? { watched_at: new Date().toISOString().slice(0, 10) } : {}),
    },
    { onConflict: 'user_id,title_id' },
  );
  if (error) throw new Error(error.message);
}

/** Quiet rating change from the title page (no review, no diary, no activity). */
export async function setTitleRating(
  userId: string,
  title: TrackableMedia,
  rating: number | null,
): Promise<void> {
  const supabase = requireSupabase();
  const titleId = await ensureReference(title);
  const { data: existing, error: readError } = await supabase
    .from('user_title_status')
    .select('id, status')
    .eq('user_id', userId)
    .eq('title_id', titleId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const { error } = await supabase.from('user_title_status').upsert(
    {
      user_id: userId,
      title_id: titleId,
      rating,
      // Rating a title implies having seen it unless a status already exists.
      status: (existing?.status ?? 'watched') as WatchStatusRow,
    },
    { onConflict: 'user_id,title_id' },
  );
  if (error) throw new Error(error.message);
}

export interface LogTitleInput {
  title: TrackableMedia;
  status?: WatchStatus;
  rating?: number;
  watchedAt?: string;
  reviewBody?: string;
  containsSpoilers?: boolean;
  isRewatch?: boolean;
  createDiaryEntry?: boolean;
}

/**
 * The full "log" action: watched + rating + review + diary in one transaction,
 * emitting a single combined feed activity (server-side dedupe).
 */
export async function logTitle(input: LogTitleInput): Promise<LogTitleResult> {
  const supabase = requireSupabase();
  const titleId = await ensureReference(input.title);
  const { data, error } = await supabase.rpc('log_title', {
    p_title_id: titleId,
    p_status: (input.status ?? null) as WatchStatusRow | null,
    p_rating: input.rating ?? null,
    p_watched_at: input.watchedAt ?? null,
    p_review_body: input.reviewBody?.trim() ? input.reviewBody.trim() : null,
    p_contains_spoilers: input.containsSpoilers ?? false,
    p_is_rewatch: input.isRewatch ?? false,
    p_create_diary_entry: input.createDiaryEntry ?? false,
  });
  if (error) throw new Error(error.message);
  return data as unknown as LogTitleResult;
}

/** Onboarding seed ratings: quiet watched+rating rows, no feed noise. */
export async function rateInitialTitle(
  userId: string,
  title: TitleSummary,
  rating: number,
): Promise<void> {
  const supabase = requireSupabase();
  const titleId = await ensureReference(title);
  const { error } = await supabase.from('user_title_status').upsert(
    {
      user_id: userId,
      title_id: titleId,
      status: 'watched' as WatchStatusRow,
      rating,
    },
    { onConflict: 'user_id,title_id' },
  );
  if (error) throw new Error(error.message);
}

export async function setFavourite(
  userId: string,
  title: TrackableMedia,
  isFavourite: boolean,
): Promise<void> {
  const supabase = requireSupabase();
  const titleId = await ensureReference(title);
  const { error } = await supabase.from('user_title_status').upsert(
    { user_id: userId, title_id: titleId, is_favourite: isFavourite },
    { onConflict: 'user_id,title_id' },
  );
  if (error) throw new Error(error.message);
}

export async function updateTvProgress(
  title: TitleSummary,
  seasonNumber: number,
  episodeNumber: number,
  completed: boolean,
): Promise<void> {
  const supabase = requireSupabase();
  const titleId = await ensureReference(title);
  const { error } = await supabase.rpc('set_tv_progress', {
    p_title_id: titleId,
    p_season_number: seasonNumber,
    p_episode_number: episodeNumber,
    p_completed: completed,
  });
  if (error) throw new Error(error.message);
}
