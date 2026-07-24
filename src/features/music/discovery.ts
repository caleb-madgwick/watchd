import { useQuery } from '@tanstack/react-query';

import { musicbrainz } from '@/lib/musicbrainz/client';
import type { AlbumSummary } from '@/types/domain';

/**
 * A curated seed of well-known albums so the Music tab has real, tappable
 * content before the community has logged anything. Resolved live from
 * MusicBrainz (real release-group MBIDs + Cover Art Archive covers), so tapping
 * a card opens a fully working album page. Community-popular albums take over
 * once people start listening.
 */
const FEATURED_QUERIES = [
  'Melodrama Lorde',
  'Blonde Frank Ocean',
  'Rumours Fleetwood Mac',
  'To Pimp a Butterfly Kendrick Lamar',
  '1989 Taylor Swift',
  'OK Computer Radiohead',
  'Currents Tame Impala',
  'Random Access Memories Daft Punk',
  'AM Arctic Monkeys',
  'SOS SZA',
  'Abbey Road Beatles',
  'Renaissance Beyoncé',
];

export function useFeaturedAlbums() {
  return useQuery({
    queryKey: ['music', 'featured'],
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    queryFn: async (): Promise<AlbumSummary[]> => {
      const out: AlbumSummary[] = [];
      const seen = new Set<string>();
      // Sequential — MusicBrainz asks callers to stay near ~1 req/s, and the
      // proxy caches each search, so subsequent loads are instant.
      for (const q of FEATURED_QUERIES) {
        try {
          const page = await musicbrainz.searchAlbums(q, 1);
          const top = page.results.find((a) => a.musicBrainzId && !seen.has(a.musicBrainzId));
          if (top) {
            seen.add(top.musicBrainzId);
            out.push(top);
          }
        } catch {
          // skip a miss; a partial shelf is fine
        }
      }
      return out;
    },
  });
}

/** Browse rails by genre. MusicBrainz genre tags — kept broad and recognisable. */
export const MUSIC_GENRES: { label: string; tag: string }[] = [
  { label: 'Pop', tag: 'pop' },
  { label: 'Hip-hop', tag: 'hip hop' },
  { label: 'Rock', tag: 'rock' },
  { label: 'Electronic', tag: 'electronic' },
  { label: 'Soul & R&B', tag: 'soul' },
  { label: 'Indie', tag: 'indie' },
  { label: 'Jazz', tag: 'jazz' },
  { label: 'Metal', tag: 'metal' },
  { label: 'Folk', tag: 'folk' },
  { label: 'Country', tag: 'country' },
];

/** Albums for one genre tag, newest-leaning (MusicBrainz tag search, albums only). */
export function useGenreAlbums(tag: string) {
  return useQuery({
    queryKey: ['music', 'genre', tag],
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    queryFn: async (): Promise<AlbumSummary[]> => {
      const page = await musicbrainz.searchAlbums(`tag:"${tag}" AND primarytype:album`, 1);
      const seen = new Set<string>();
      return page.results.filter((a) => {
        if (!a.musicBrainzId || seen.has(a.musicBrainzId)) return false;
        seen.add(a.musicBrainzId);
        return true;
      });
    },
  });
}
