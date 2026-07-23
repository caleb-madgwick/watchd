import { activityVerb } from './activity';

describe('activityVerb (combined feed entries)', () => {
  it('renders watch-only logs', () => {
    expect(activityVerb({ activity_type: 'logged', metadata: {} })).toBe('watched');
  });

  it('combines watch + rating into one phrase', () => {
    expect(activityVerb({ activity_type: 'logged', metadata: { rating: 4.5 } })).toBe(
      'watched and rated',
    );
  });

  it('combines watch + rating + review into one phrase (not three entries)', () => {
    expect(
      activityVerb({ activity_type: 'logged', metadata: { rating: 5, has_review: true } }),
    ).toBe('watched, rated and reviewed');
  });

  it('marks rewatches', () => {
    expect(activityVerb({ activity_type: 'logged', metadata: { is_rewatch: true } })).toBe(
      'rewatched',
    );
  });

  it('handles other activity types', () => {
    expect(activityVerb({ activity_type: 'tv_completed', metadata: {} })).toBe('finished');
    expect(activityVerb({ activity_type: 'list_created', metadata: {} })).toBe('created a list');
    expect(activityVerb({ activity_type: 'followed', metadata: {} })).toBe('followed');
  });
});
