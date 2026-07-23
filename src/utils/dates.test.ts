import { formatDate, timeAgo, todayISODate } from './dates';

describe('formatDate', () => {
  it('formats ISO dates', () => {
    expect(formatDate('2026-07-23')).toBe('23 Jul 2026');
  });

  it('formats timestamps', () => {
    expect(formatDate('2025-12-01T10:30:00Z')).toMatch(/Dec 2025/);
  });

  it('handles empty input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-07-23T12:00:00Z');

  it('returns just now for fresh timestamps', () => {
    expect(timeAgo(new Date('2026-07-23T11:59:40Z'), now)).toBe('just now');
  });

  it('returns minutes and hours', () => {
    expect(timeAgo(new Date('2026-07-23T11:45:00Z'), now)).toBe('15m');
    expect(timeAgo(new Date('2026-07-23T07:00:00Z'), now)).toBe('5h');
  });

  it('returns days then falls back to a date', () => {
    expect(timeAgo(new Date('2026-07-20T12:00:00Z'), now)).toBe('3d');
    expect(timeAgo(new Date('2026-06-01T12:00:00Z'), now)).toBe('1 Jun 2026');
  });
});

describe('todayISODate', () => {
  it('formats local date as YYYY-MM-DD', () => {
    expect(todayISODate(new Date(2026, 6, 5))).toBe('2026-07-05');
  });
});
