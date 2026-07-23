# Watchd — Product Requirements (MVP)

Watchd is a social tracker for movies and television: discover titles, log what you watch,
rate and review, keep a watchlist, build lists, follow people, and see their activity.
Cinematic, modern, premium; simple for casual viewers, deep enough for film/TV nerds.

## Users and jobs

- **The casual viewer** — "What should I watch tonight, and where did I leave off on that show?"
- **The film/TV enthusiast** — "I want a diary of everything I watch, with ratings and reviews."
- **The social browser** — "What are my friends watching and loving right now?"

## MVP feature boundary

### In scope

| Area | Features |
| --- | --- |
| Auth | Email/password sign-up, sign-in, sign-out, password reset, persistent sessions, protected routes |
| Onboarding | Unique username (required), display name, optional avatar/bio, favourite genres, rate ≥5 titles |
| Discovery | Trending movies/TV, popular, genre-based suggestions, continue-watching, recent reviews from follows |
| Search | Unified movies + TV + users, debounced, recent searches, pagination, skeletons, empty/error states |
| Title pages | Movie & TV detail (poster, backdrop, overview, cast, crew, trailer link, similar, TMDB + community ratings), season pages, minimal person page |
| Tracking | Watch statuses (watchlist/watching/watched/paused/dropped), 0.5–5★ ratings, movie diary with rewatches, TV progress (show / season / last-episode), favourites |
| Reviews | One current review per user per title, spoiler flag + hidden-until-revealed text, likes, edit/delete own |
| Watchlist | Combined movies+TV, sort (added/title/release/community rating), filter by type, mark watched inline |
| Lists | Named lists, description, public/private, add/remove/reorder, view others' public lists |
| Shared watchlists | Dedicated couple/group "our watchlist"; invite-only membership (friends only), any member adds/removes titles, "watched together" toggle, owner transfer on leave |
| Social | Follow/unfollow, followers/following pages, public profiles, block table (data model only) |
| Friends | Symmetric friend requests (send/accept/decline/cancel) layered on follows; friends hub with request inbox; friends gate shared-watchlist invites |
| Activity | Chronological feed from followed users; combined entries for log+rate+review; pagination |
| Settings | Edit profile, avatar, genres, theme (dark default, light supported), legal links, sign out, delete account |

### Explicitly out of scope (extension points only)

DMs, review comments, group chats, collaborative voting, subscriptions, ads,
ML recommendations, AI chat, streaming-provider integration, watch-history imports,
Letterboxd import, episode-level reviews, watch parties, creator accounts, moderation
dashboards, push notifications, CMS, separate Next.js site.

## Success criteria (definition of done)

A new user can: open the app on web/iOS/Android → register → choose a username and finish
onboarding → search a title → open its page → watchlist it → mark watched → rate it →
publish a review → track a TV show → find and follow a user → see their activity → like a
review → create a list → send a friend request and, once accepted, create a shared watchlist
and invite that friend → view/edit their profile → sign out and return with the session intact.

Plus: no sensitive credentials in the client bundle, RLS enabled and exercised, zero
TypeScript/lint errors, core tests green, responsive mobile + desktop layouts, useful
loading/empty/error states everywhere, TMDB attribution present, documented local setup.

## Non-goals for MVP quality

- Full offline support (graceful degradation only).
- Algorithmic feed ranking (chronological only).
- Perfect SEO (public pages get sensible titles/metadata; no SSR).
