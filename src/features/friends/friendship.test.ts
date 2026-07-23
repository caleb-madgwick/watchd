import { deriveFriendshipState } from './api';

const ME = 'user-me';
const THEM = 'user-them';

describe('deriveFriendshipState', () => {
  it('returns none when there is no relationship row', () => {
    expect(deriveFriendshipState(null, ME)).toEqual({ status: 'none' });
  });

  it('treats an accepted row as friends regardless of direction', () => {
    expect(
      deriveFriendshipState(
        { id: 'r1', requester_id: THEM, addressee_id: ME, status: 'accepted' },
        ME,
      ),
    ).toEqual({ status: 'friends', requestId: 'r1' });
  });

  it('marks a pending request I sent as outgoing', () => {
    expect(
      deriveFriendshipState(
        { id: 'r2', requester_id: ME, addressee_id: THEM, status: 'pending' },
        ME,
      ),
    ).toEqual({ status: 'outgoing', requestId: 'r2' });
  });

  it('marks a pending request I received as incoming', () => {
    expect(
      deriveFriendshipState(
        { id: 'r3', requester_id: THEM, addressee_id: ME, status: 'pending' },
        ME,
      ),
    ).toEqual({ status: 'incoming', requestId: 'r3' });
  });
});
