import { useEffect, useRef } from 'react';

import { config } from '@/constants/config';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import type { TitlePersonInput } from '@/types/database';
import type { MovieDetails, TvDetails } from '@/types/domain';

function peopleFrom(details: MovieDetails | TvDetails): TitlePersonInput[] {
  const people: TitlePersonInput[] = [];
  if (details.mediaType === 'movie') {
    details.directors.forEach((d, i) =>
      people.push({ person_tmdb_id: d.id, name: d.name, department: 'director', job: d.job, ord: i }),
    );
  } else {
    details.creators.forEach((c, i) =>
      people.push({ person_tmdb_id: c.id, name: c.name, department: 'creator', job: c.job, ord: i }),
    );
  }
  details.cast.forEach((c, i) =>
    people.push({ person_tmdb_id: c.id, name: c.name, department: 'cast', job: c.character ?? null, ord: i }),
  );
  return people;
}

/**
 * Populate the titles cache with genres/runtime/language + cast & crew so stats
 * can aggregate them. Best-effort: any failure is swallowed (enrichment is a
 * background nicety, never blocks the UI).
 */
async function enrichTitle(details: MovieDetails | TvDetails): Promise<void> {
  if (!supabase) return;
  try {
    const { data: titleId, error } = await supabase.rpc('upsert_title_reference', {
      p_tmdb_id: details.tmdbId,
      p_media_type: details.mediaType,
      p_title: details.title,
      p_original_title: details.originalTitle ?? null,
      p_poster_path: details.posterPath ?? null,
      p_backdrop_path: details.backdropPath ?? null,
      p_release_date: details.releaseDate ?? null,
      p_genre_ids: details.genres.map((g) => g.id),
      // TV stores per-episode runtime, which stats don't sum — pass movies only.
      p_runtime_minutes: details.mediaType === 'movie' ? (details.runtimeMinutes ?? null) : null,
      p_original_language: details.originalLanguage ?? null,
    });
    if (error || !titleId) return;
    const people = peopleFrom(details);
    if (people.length > 0) {
      await supabase.rpc('set_title_people', { p_title_id: titleId as string, p_people: people });
    }
  } catch {
    // best effort
  }
}

/** Enrich the titles cache once per viewed title (authenticated, non-demo). */
export function useTitleEnrichment(details: MovieDetails | TvDetails | undefined): void {
  const userId = useCurrentUserId();
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (config.demoMode || !userId || !details) return;
    const key = `${details.mediaType}-${details.tmdbId}`;
    if (done.current === key) return;
    done.current = key;
    void enrichTitle(details);
  }, [details, userId]);
}
