/**
 * Raw MusicBrainz /ws/2 JSON shapes. These never leave src/lib/musicbrainz —
 * everything is normalised to domain models (ArtistSummary / AlbumSummary /
 * SongSummary / *Details) at the trust boundary first.
 */

export interface MbArtistCredit {
  /** Credited name for this release/recording (may differ from the artist name). */
  name?: string;
  joinphrase?: string;
  artist?: {
    id?: string;
    name?: string;
    'sort-name'?: string;
    disambiguation?: string;
  };
}

export interface MbArtist {
  id: string;
  name?: string;
  'sort-name'?: string;
  disambiguation?: string;
  country?: string;
  type?: string;
  'life-span'?: { begin?: string; end?: string; ended?: boolean };
}

export interface MbReleaseGroup {
  id: string;
  title?: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'first-release-date'?: string;
  'artist-credit'?: MbArtistCredit[];
}

export interface MbTrack {
  id?: string;
  number?: string;
  position?: number;
  title?: string;
  length?: number;
  recording?: {
    id?: string;
    title?: string;
    length?: number;
    'artist-credit'?: MbArtistCredit[];
  };
}

export interface MbMedium {
  position?: number;
  'track-count'?: number;
  tracks?: MbTrack[];
}

export interface MbRelease {
  id: string;
  title?: string;
  date?: string;
  country?: string;
  status?: string;
  'release-group'?: MbReleaseGroup;
  'artist-credit'?: MbArtistCredit[];
  media?: MbMedium[];
}

export interface MbRecording {
  id: string;
  title?: string;
  length?: number;
  'artist-credit'?: MbArtistCredit[];
  releases?: MbRelease[];
}

// ── Search responses ─────────────────────────────────────────────────────────

export interface MbArtistSearch {
  count?: number;
  offset?: number;
  artists?: MbArtist[];
}

export interface MbReleaseGroupSearch {
  count?: number;
  offset?: number;
  'release-groups'?: MbReleaseGroup[];
}

export interface MbRecordingSearch {
  count?: number;
  offset?: number;
  recordings?: MbRecording[];
}

// ── Browse responses ───────────────────────────────────────────────────────

export interface MbReleaseGroupBrowse {
  'release-group-count'?: number;
  'release-groups'?: MbReleaseGroup[];
}

export interface MbReleaseBrowse {
  'release-count'?: number;
  releases?: MbRelease[];
}
