/**
 * MusicBrainz → domain model normalisation (the trust boundary). Cover art is
 * resolved from Cover Art Archive by release-group MBID; MusicBrainz terminology
 * (release-group, recording) never surfaces in user-facing copy.
 */

import { coverArtByReleaseGroup } from '@/lib/coverart/images';
import type {
  MbArtist,
  MbArtistCredit,
  MbRecording,
  MbRelease,
  MbReleaseGroup,
} from './types';
import type {
  AlbumDetails,
  AlbumKind,
  AlbumSummary,
  ArtistCredit,
  ArtistDetails,
  ArtistReleaseGroups,
  ArtistSummary,
  Paginated,
  SongSummary,
  TrackSummary,
} from '@/types/domain';

function yearFrom(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const m = date.match(/^\d{4}/);
  const year = m ? Number(m[0]) : NaN;
  return Number.isFinite(year) && year > 1000 ? year : undefined;
}

function artistNames(credit: MbArtistCredit[] | undefined): string[] {
  return (credit ?? [])
    .map((c) => c.artist?.name ?? c.name)
    .filter((n): n is string => !!n && n.trim().length > 0);
}

/** Rebuild the display credit line honouring MusicBrainz joinphrases ("A & B"). */
function creditLine(credit: MbArtistCredit[] | undefined): string | undefined {
  if (!credit || credit.length === 0) return undefined;
  const line = credit
    .map((c) => `${c.name ?? c.artist?.name ?? ''}${c.joinphrase ?? ''}`)
    .join('')
    .trim();
  return line.length > 0 ? line : undefined;
}

export function artistCredits(credit: MbArtistCredit[] | undefined): ArtistCredit[] {
  return (credit ?? [])
    .filter((c) => c.artist?.id && (c.artist.name || c.name))
    .map((c) => ({
      musicBrainzId: c.artist!.id!,
      name: c.artist!.name ?? c.name ?? '',
      creditName: c.name && c.name !== c.artist!.name ? c.name : undefined,
    }));
}

function albumKind(primaryType: string | undefined, secondaryTypes: string[] | undefined): AlbumKind {
  if (secondaryTypes?.some((t) => t.toLowerCase() === 'compilation')) return 'compilation';
  switch ((primaryType ?? '').toLowerCase()) {
    case 'album':
      return 'album';
    case 'single':
      return 'single';
    case 'ep':
      return 'ep';
    default:
      return 'other';
  }
}

export function normalizeArtist(a: MbArtist): ArtistSummary {
  return {
    musicBrainzId: a.id,
    mediaType: 'artist',
    name: a.name?.trim() || 'Unknown artist',
    disambiguation: a.disambiguation?.trim() || undefined,
    country: a.country?.trim() || undefined,
  };
}

export function normalizeReleaseGroup(rg: MbReleaseGroup): AlbumSummary {
  return {
    musicBrainzId: rg.id,
    mediaType: 'album',
    title: rg.title?.trim() || 'Untitled',
    artistNames: artistNames(rg['artist-credit']),
    artistCredit: creditLine(rg['artist-credit']),
    coverUrl: coverArtByReleaseGroup(rg.id),
    releaseYear: yearFrom(rg['first-release-date']),
    releaseDate: rg['first-release-date'] || undefined,
    albumType: albumKind(rg['primary-type'], rg['secondary-types']),
  };
}

export function normalizeRecording(r: MbRecording): SongSummary {
  const rg = r.releases?.[0]?.['release-group'];
  const album = rg ? normalizeReleaseGroup(rg) : undefined;
  return {
    musicBrainzId: r.id,
    mediaType: 'song',
    title: r.title?.trim() || 'Untitled',
    artistNames: artistNames(r['artist-credit']),
    artistCredit: creditLine(r['artist-credit']),
    durationMs: typeof r.length === 'number' && r.length > 0 ? r.length : undefined,
    coverUrl: album?.coverUrl,
    album,
  };
}

/** Build an album's tracklist from a chosen release's media/tracks. */
function normalizeTracks(release: MbRelease | undefined, fallbackCover?: string): TrackSummary[] {
  if (!release?.media) return [];
  const tracks: TrackSummary[] = [];
  for (const medium of release.media) {
    const disc = medium.position ?? 1;
    for (const t of medium.tracks ?? []) {
      const rec = t.recording;
      const durationMs = t.length ?? rec?.length;
      tracks.push({
        position: t.position ?? (Number(t.number) || tracks.length + 1),
        discNumber: disc,
        title: t.title?.trim() || rec?.title?.trim() || 'Untitled',
        durationMs: typeof durationMs === 'number' && durationMs > 0 ? durationMs : undefined,
        song: {
          musicBrainzId: rec?.id ?? t.id ?? '',
          mediaType: 'song',
          title: rec?.title?.trim() || t.title?.trim() || 'Untitled',
          artistNames: artistNames(rec?.['artist-credit'] ?? release['artist-credit']),
          artistCredit: creditLine(rec?.['artist-credit'] ?? release['artist-credit']),
          durationMs: typeof durationMs === 'number' && durationMs > 0 ? durationMs : undefined,
          coverUrl: fallbackCover,
        },
      });
    }
  }
  return tracks;
}

export function normalizeAlbumDetails(rg: MbReleaseGroup, release?: MbRelease): AlbumDetails {
  const summary = normalizeReleaseGroup(rg);
  const tracks = normalizeTracks(release, summary.coverUrl).filter((t) => t.song.musicBrainzId);
  const totalDurationMs = tracks.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  return {
    ...summary,
    artists: artistCredits(rg['artist-credit']),
    secondaryTypes: rg['secondary-types'] ?? [],
    trackCount: tracks.length || undefined,
    totalDurationMs: totalDurationMs > 0 ? totalDurationMs : undefined,
    tracks,
  };
}

const isKind = (rg: AlbumSummary, kind: AlbumKind) => rg.albumType === kind;

export function normalizeArtistDetails(a: MbArtist, releaseGroups: MbReleaseGroup[]): ArtistDetails {
  const summary = normalizeArtist(a);
  const all = releaseGroups
    .map(normalizeReleaseGroup)
    .sort((x, y) => (y.releaseYear ?? 0) - (x.releaseYear ?? 0));
  const groups: ArtistReleaseGroups = {
    albums: all.filter((rg) => isKind(rg, 'album')),
    eps: all.filter((rg) => isKind(rg, 'ep')),
    singles: all.filter((rg) => isKind(rg, 'single')),
    compilations: all.filter((rg) => isKind(rg, 'compilation')),
  };
  return {
    ...summary,
    releaseGroups: groups,
    topAlbums: groups.albums.slice(0, 12),
  };
}

export function paginate<T>(results: T[], page: number, pageSize: number, total: number): Paginated<T> {
  return {
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    totalResults: total,
    results,
  };
}
