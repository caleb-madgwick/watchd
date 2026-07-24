/**
 * Bundled MusicBrainz fixtures for demo mode (no backend). Just enough to make
 * search and the artist/album/song pages render without a network call.
 */

import type {
  MbArtist,
  MbRecording,
  MbRelease,
  MbReleaseGroup,
} from './types';

const LORDE: MbArtist = {
  id: 'e9e78846-b6a1-4a08-a1e9-1f4b6f4b8f8f',
  name: 'Lorde',
  'sort-name': 'Lorde',
  disambiguation: 'New Zealand singer-songwriter',
  country: 'NZ',
  type: 'Person',
  'life-span': { begin: '1996-11-07' },
};

const MELODRAMA_RG: MbReleaseGroup = {
  id: '82e28dd7-9c8f-4d6a-8b3a-6b1f3f9a0000',
  title: 'Melodrama',
  'primary-type': 'Album',
  'secondary-types': [],
  'first-release-date': '2017-06-16',
  'artist-credit': [{ name: 'Lorde', artist: { id: LORDE.id, name: 'Lorde' } }],
};

const PURE_HEROINE_RG: MbReleaseGroup = {
  id: '6b1f3f9a-1111-4d6a-8b3a-82e28dd79c8f',
  title: 'Pure Heroine',
  'primary-type': 'Album',
  'secondary-types': [],
  'first-release-date': '2013-09-27',
  'artist-credit': [{ name: 'Lorde', artist: { id: LORDE.id, name: 'Lorde' } }],
};

const MELODRAMA_RELEASE: MbRelease = {
  id: 'aa111111-2222-3333-4444-555566667777',
  title: 'Melodrama',
  date: '2017-06-16',
  country: 'NZ',
  status: 'Official',
  'release-group': MELODRAMA_RG,
  'artist-credit': [{ name: 'Lorde', artist: { id: LORDE.id, name: 'Lorde' } }],
  media: [
    {
      position: 1,
      'track-count': 3,
      tracks: [
        { position: 1, number: '1', title: 'Green Light', length: 234000, recording: { id: 'rec-green-light', title: 'Green Light', length: 234000 } },
        { position: 2, number: '2', title: 'Sober', length: 195000, recording: { id: 'rec-sober', title: 'Sober', length: 195000 } },
        { position: 3, number: '3', title: 'Homemade Dynamite', length: 229000, recording: { id: 'rec-homemade-dynamite', title: 'Homemade Dynamite', length: 229000 } },
      ],
    },
  ],
};

const GREEN_LIGHT: MbRecording = {
  id: 'rec-green-light',
  title: 'Green Light',
  length: 234000,
  'artist-credit': [{ name: 'Lorde', artist: { id: LORDE.id, name: 'Lorde' } }],
  releases: [MELODRAMA_RELEASE],
};

export const FIXTURE_ARTISTS: MbArtist[] = [LORDE];
export const FIXTURE_RELEASE_GROUPS: MbReleaseGroup[] = [MELODRAMA_RG, PURE_HEROINE_RG];
export const FIXTURE_RECORDINGS: MbRecording[] = [GREEN_LIGHT];
export const FIXTURE_RELEASES: Record<string, MbRelease> = { [MELODRAMA_RELEASE.id]: MELODRAMA_RELEASE };
export const FIXTURE_RELEASE_GROUP_RELEASE: Record<string, MbRelease> = {
  [MELODRAMA_RG.id]: MELODRAMA_RELEASE,
};
export const FIXTURE_ARTIST_RELEASE_GROUPS: Record<string, MbReleaseGroup[]> = {
  [LORDE.id]: [MELODRAMA_RG, PURE_HEROINE_RG],
};
