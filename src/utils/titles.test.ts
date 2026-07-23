import { formatRuntime, mediaTypeLabel, titleHref, yearFromDate } from './titles';

describe('titleHref', () => {
  it('builds movie and tv routes from TMDB ids', () => {
    expect(titleHref('movie', 27205)).toBe('/movie/27205');
    expect(titleHref('tv', 1396)).toBe('/tv/1396');
  });
});

describe('mediaTypeLabel', () => {
  it('labels media types', () => {
    expect(mediaTypeLabel('movie')).toBe('Movie');
    expect(mediaTypeLabel('tv')).toBe('TV');
  });
});

describe('formatRuntime', () => {
  it('formats hours and minutes', () => {
    expect(formatRuntime(148)).toBe('2h 28m');
    expect(formatRuntime(60)).toBe('1h');
    expect(formatRuntime(45)).toBe('45m');
  });

  it('returns undefined for missing runtimes', () => {
    expect(formatRuntime(undefined)).toBeUndefined();
    expect(formatRuntime(0)).toBeUndefined();
  });
});

describe('yearFromDate', () => {
  it('extracts release years', () => {
    expect(yearFromDate('2010-07-16')).toBe(2010);
  });

  it('rejects junk', () => {
    expect(yearFromDate(null)).toBeUndefined();
    expect(yearFromDate('')).toBeUndefined();
    expect(yearFromDate('n/a')).toBeUndefined();
  });
});
