import { useQuery } from '@tanstack/react-query';

import { coverArtByReleaseGroup } from '@/lib/coverart/images';
import { musicbrainz } from '@/lib/musicbrainz/client';
import type { AlbumSummary } from '@/types/domain';

/**
 * A curated, verified set of well-known albums so the Music tab always has real,
 * tappable content — no network, no rate limits. Each MBID was resolved from
 * MusicBrainz; covers load from Cover Art Archive by that id. Community-popular
 * albums layer in on top once people start listening.
 */
const FEATURED: { mbid: string; title: string; artist: string; year: number }[] = [
  { mbid: '668e80e0-b35e-4471-9788-0a3d797fe42c', title: 'Melodrama', artist: 'Lorde', year: 2017 },
  { mbid: '0da340a0-6ad7-4fc2-a272-6f94393a7831', title: 'Blonde', artist: 'Frank Ocean', year: 2016 },
  { mbid: 'd9103c72-3807-4378-9ce7-b6f3e8fdd547', title: 'To Pimp a Butterfly', artist: 'Kendrick Lamar', year: 2015 },
  { mbid: 'b1392450-e666-3926-a536-22c65f834433', title: 'OK Computer', artist: 'Radiohead', year: 1997 },
  { mbid: '08aa7a6c-3e43-4459-87b2-e47faf3a088a', title: 'Currents', artist: 'Tame Impala', year: 2015 },
  { mbid: 'aa997ea0-2936-40bd-884d-3af8a0e064dc', title: 'Random Access Memories', artist: 'Daft Punk', year: 2013 },
  { mbid: 'a348ba2f-f8b3-4686-b928-e63d8d94d543', title: 'AM', artist: 'Arctic Monkeys', year: 2013 },
  { mbid: '1646286a-d0ad-4288-bfab-34b0fb7b22c1', title: 'SOS', artist: 'SZA', year: 2022 },
  { mbid: '9162580e-5df4-32de-80cc-f45a8d8a9b1d', title: 'Abbey Road', artist: 'The Beatles', year: 1969 },
  { mbid: '2c385052-5083-43a2-b1e5-36566d2ae3c0', title: 'RENAISSANCE', artist: 'Beyoncé', year: 2022 },
  { mbid: 'ea39e3d6-4dd7-4ae4-b205-527657369155', title: 'Norman Fucking Rockwell', artist: 'Lana Del Rey', year: 2019 },
  { mbid: 'f8f4167d-897c-4b25-a171-638374d1dfa4', title: 'channel ORANGE', artist: 'Frank Ocean', year: 2012 },
];

export const FEATURED_ALBUMS: AlbumSummary[] = FEATURED.map((a) => ({
  musicBrainzId: a.mbid,
  mediaType: 'album',
  title: a.title,
  artistNames: [a.artist],
  artistCredit: a.artist,
  coverUrl: coverArtByReleaseGroup(a.mbid),
  releaseYear: a.year,
  albumType: 'album',
}));

/** Featured albums — static and instant, so the Music tab never renders empty. */
export function useFeaturedAlbums(): { data: AlbumSummary[]; isLoading: boolean } {
  return { data: FEATURED_ALBUMS, isLoading: false };
}

/** Browse rails by genre. MusicBrainz genre tags — kept broad and recognisable. */
export const MUSIC_GENRES: { label: string; tag: string }[] = [
  { label: 'Pop', tag: 'pop' },
  { label: 'Hip-hop', tag: 'hip hop' },
  { label: 'Rock', tag: 'rock' },
  { label: 'Electronic', tag: 'electronic' },
  { label: 'Soul & R&B', tag: 'soul' },
  { label: 'Indie', tag: 'indie' },
];

/**
 * Albums for one genre tag (MusicBrainz tag search, albums only). Best-effort:
 * MusicBrainz rate-limits, so a rail may lag or stay empty on a cold load — the
 * static featured shelf guarantees the tab always has content regardless.
 */
export function useGenreAlbums(tag: string) {
  return useQuery({
    queryKey: ['music', 'genre', tag],
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: 3,
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
