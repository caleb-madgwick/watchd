import { backdropUrl, posterUrl, profileUrl, stillUrl } from './images';

describe('TMDB image URL builder', () => {
  it('builds sized URLs from raw paths', () => {
    expect(posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
    expect(posterUrl('/abc.jpg', 'w780')).toBe('https://image.tmdb.org/t/p/w780/abc.jpg');
    expect(backdropUrl('/bg.jpg')).toBe('https://image.tmdb.org/t/p/w1280/bg.jpg');
    expect(profileUrl('/face.jpg')).toBe('https://image.tmdb.org/t/p/w185/face.jpg');
    expect(stillUrl('/still.jpg')).toBe('https://image.tmdb.org/t/p/w300/still.jpg');
  });

  it('tolerates paths without a leading slash', () => {
    expect(posterUrl('abc.jpg')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
  });

  it('returns undefined for missing paths', () => {
    expect(posterUrl(null)).toBeUndefined();
    expect(posterUrl(undefined)).toBeUndefined();
    expect(backdropUrl('')).toBeUndefined();
  });
});
