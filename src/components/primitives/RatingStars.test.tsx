import { clampRating } from './RatingStars';

describe('clampRating', () => {
  it('rounds to half steps', () => {
    expect(clampRating(3.3)).toBe(3.5);
    expect(clampRating(3.1)).toBe(3);
    expect(clampRating(4.75)).toBe(5);
  });

  it('clamps to the 0.5–5 range', () => {
    expect(clampRating(0.2)).toBe(0.5);
    expect(clampRating(7)).toBe(5);
  });

  it('treats zero and negatives as cleared', () => {
    expect(clampRating(0)).toBe(0);
    expect(clampRating(-2)).toBe(0);
  });
});
