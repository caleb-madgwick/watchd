/**
 * Typed MusicBrainz client. Every method returns normalised domain models —
 * raw MusicBrainz shapes never escape this module. Cover art comes from Cover
 * Art Archive (resolved in the normalizers).
 */

import {
  normalizeAlbumDetails,
  normalizeArtist,
  normalizeArtistDetails,
  normalizeRecording,
  normalizeReleaseGroup,
  paginate,
} from './normalize';
import { fetchMusicBrainz } from './transport';
import type {
  MbArtist,
  MbArtistSearch,
  MbRecording,
  MbRecordingSearch,
  MbRelease,
  MbReleaseGroup,
  MbReleaseGroupBrowse,
  MbReleaseGroupSearch,
} from './types';
import type {
  AlbumDetails,
  AlbumSummary,
  ArtistDetails,
  ArtistSummary,
  Paginated,
  SongDetails,
  SongSummary,
} from '@/types/domain';

const PAGE_SIZE = 25;
type RgWithReleases = MbReleaseGroup & { releases?: MbRelease[] };

/** Pick the most canonical release of a group to read a tracklist from. */
function pickRelease(releases: MbRelease[] | undefined): MbRelease | undefined {
  if (!releases || releases.length === 0) return undefined;
  const official = releases.filter((r) => (r.status ?? 'Official') === 'Official');
  const pool = official.length > 0 ? official : releases;
  return [...pool].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))[0];
}

export const musicbrainz = {
  async searchArtists(query: string, page = 1): Promise<Paginated<ArtistSummary>> {
    const raw = await fetchMusicBrainz<MbArtistSearch>('/artist', {
      query,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    return paginate((raw.artists ?? []).map(normalizeArtist), page, PAGE_SIZE, raw.count ?? 0);
  },

  async searchAlbums(query: string, page = 1): Promise<Paginated<AlbumSummary>> {
    const raw = await fetchMusicBrainz<MbReleaseGroupSearch>('/release-group', {
      query,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    return paginate(
      (raw['release-groups'] ?? []).map(normalizeReleaseGroup),
      page,
      PAGE_SIZE,
      raw.count ?? 0,
    );
  },

  async searchSongs(query: string, page = 1): Promise<Paginated<SongSummary>> {
    const raw = await fetchMusicBrainz<MbRecordingSearch>('/recording', {
      query,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    return paginate(
      (raw.recordings ?? []).map(normalizeRecording),
      page,
      PAGE_SIZE,
      raw.count ?? 0,
    );
  },

  async artistDetails(mbid: string): Promise<ArtistDetails> {
    const [artist, groups] = await Promise.all([
      fetchMusicBrainz<MbArtist>(`/artist/${mbid}`, {}),
      fetchMusicBrainz<MbReleaseGroupBrowse>('/release-group', {
        artist: mbid,
        type: 'album|ep|single',
        limit: 100,
      }).catch(() => ({ 'release-groups': [] }) as MbReleaseGroupBrowse),
    ]);
    return normalizeArtistDetails(artist, groups['release-groups'] ?? []);
  },

  async albumDetails(mbid: string): Promise<AlbumDetails> {
    const rg = await fetchMusicBrainz<RgWithReleases>(`/release-group/${mbid}`, {
      inc: 'artist-credits+releases',
    });
    const chosen = pickRelease(rg.releases);
    let release: MbRelease | undefined;
    if (chosen) {
      release = await fetchMusicBrainz<MbRelease>(`/release/${chosen.id}`, {
        inc: 'recordings+artist-credits',
      }).catch(() => undefined);
    }
    return normalizeAlbumDetails(rg, release);
  },

  async songDetails(mbid: string): Promise<SongDetails> {
    const rec = await fetchMusicBrainz<MbRecording>(`/recording/${mbid}`, {
      inc: 'artist-credits+releases+release-groups',
    });
    const summary = normalizeRecording(rec);
    return { ...summary };
  },

  /** A single artist's release groups (used by the artist page rails). */
  async artistReleaseGroups(mbid: string): Promise<AlbumSummary[]> {
    const raw = await fetchMusicBrainz<MbReleaseGroupBrowse>('/release-group', {
      artist: mbid,
      type: 'album|ep|single',
      limit: 100,
    });
    return (raw['release-groups'] ?? []).map(normalizeReleaseGroup);
  },
} as const;
