import { normalizeArtist, normalizeReleaseGroup, normalizeRecording } from './normalize';
import type { MbArtist, MbRecording, MbReleaseGroup } from './types';

describe('musicbrainz normalizers', () => {
  it('normalizes a release group into an album summary', () => {
    const rg: MbReleaseGroup = {
      id: 'rg-1',
      title: 'Melodrama',
      'primary-type': 'Album',
      'secondary-types': [],
      'first-release-date': '2017-06-16',
      'artist-credit': [{ name: 'Lorde', artist: { id: 'a-1', name: 'Lorde' } }],
    };
    const album = normalizeReleaseGroup(rg);
    expect(album.musicBrainzId).toBe('rg-1');
    expect(album.mediaType).toBe('album');
    expect(album.title).toBe('Melodrama');
    expect(album.artistNames).toEqual(['Lorde']);
    expect(album.artistCredit).toBe('Lorde');
    expect(album.albumType).toBe('album');
    expect(album.releaseYear).toBe(2017);
    expect(album.coverUrl).toContain('coverartarchive.org/release-group/rg-1');
  });

  it('maps compilations and joins multi-artist credits', () => {
    const rg: MbReleaseGroup = {
      id: 'rg-2',
      title: 'Hits',
      'primary-type': 'Album',
      'secondary-types': ['Compilation'],
      'artist-credit': [
        { name: 'A', joinphrase: ' & ', artist: { id: 'a', name: 'A' } },
        { name: 'B', artist: { id: 'b', name: 'B' } },
      ],
    };
    const album = normalizeReleaseGroup(rg);
    expect(album.albumType).toBe('compilation');
    expect(album.artistCredit).toBe('A & B');
    expect(album.artistNames).toEqual(['A', 'B']);
  });

  it('normalizes an artist, falling back to a placeholder name', () => {
    const artist: MbArtist = { id: 'a-1', name: 'Lorde', country: 'NZ', disambiguation: 'NZ singer' };
    const summary = normalizeArtist(artist);
    expect(summary.mediaType).toBe('artist');
    expect(summary.name).toBe('Lorde');
    expect(summary.country).toBe('NZ');
    expect(normalizeArtist({ id: 'x' }).name).toBe('Unknown artist');
  });

  it('normalizes a recording with its album from the first release', () => {
    const rec: MbRecording = {
      id: 'rec-1',
      title: 'Green Light',
      length: 234000,
      'artist-credit': [{ name: 'Lorde', artist: { id: 'a-1', name: 'Lorde' } }],
      releases: [{ id: 'rel-1', 'release-group': { id: 'rg-1', title: 'Melodrama' } }],
    };
    const song = normalizeRecording(rec);
    expect(song.mediaType).toBe('song');
    expect(song.title).toBe('Green Light');
    expect(song.durationMs).toBe(234000);
    expect(song.album?.musicBrainzId).toBe('rg-1');
  });
});
