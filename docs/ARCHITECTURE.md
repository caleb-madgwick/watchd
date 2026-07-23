# Watchd — Technical Architecture

## Stack

- **Client:** Expo SDK 57 · React Native 0.86 · React 19 · React Native Web · Expo Router
  (typed routes) · TypeScript strict · TanStack Query · Zustand (transient state) ·
  React Hook Form + Zod · Expo Image · Reanimated (sparingly)
- **Backend:** Supabase — Postgres 17, Auth, Storage (avatars), SQL functions + triggers,
  RLS everywhere, one Edge Function (`tmdb-proxy`)
- **Metadata:** TMDB API v3 endpoints with a v4 read token, held server-side

## High-level data flow

```
UI screens ── hooks (features/*) ── TanStack Query
                                   │
              ┌────────────────────┴───────────────────┐
              ▼                                        ▼
   lib/tmdb (typed client)                  lib/supabase (anon client)
   transport: proxy | direct | demo         RLS-enforced tables + RPCs
              │                                        │
              ▼                                        ▼
   Edge Fn tmdb-proxy ──► TMDB API          Postgres (profiles, titles,
   (token secret, cache, allowlist)         statuses, diary, tv_progress,
                                            reviews, likes, follows, blocks,
                                            lists, activities, reports)
```

### Trust boundaries

1. **TMDB payloads** are normalised in `src/lib/tmdb/normalize.ts` into domain models
   (`TitleSummary`, `MovieDetails`, `TvDetails`, …). The UI never touches raw TMDB JSON.
2. **Supabase rows** are typed via `src/types/database.ts` and mapped into domain types in
   feature hooks. All user-generated writes are validated with Zod before sending and by
   CHECK constraints + RLS in Postgres.
3. **Secrets:** only `EXPO_PUBLIC_*` values ship to clients (Supabase URL + anon key —
   designed to be public, safety comes from RLS). The TMDB token lives in Edge Function
   secrets. There is no service-role key anywhere in the app.

## TMDB transports

| Mode | When | How |
| --- | --- | --- |
| `proxy` (default) | Production and any env with a deployed Supabase project | `functions/v1/tmdb-proxy?path=/trending/movie/week` with endpoint allowlist, server cache (TTL by endpoint class), per-IP rate limiting |
| `direct` | Local development convenience only | Developer's own TMDB token via `EXPO_PUBLIC_TMDB_ACCESS_TOKEN`; never ship a shared key this way |
| `demo` | No keys configured (fresh clone) | Bundled, clearly-labelled fixture JSON for a handful of titles so the app is navigable offline |

Mode is resolved in `src/lib/tmdb/transport.ts`: explicit `EXPO_PUBLIC_TMDB_MODE` wins,
otherwise `direct` if a token is present, otherwise `proxy` if Supabase is configured,
otherwise `demo`.

## Server state and caching

- Query keys live in `src/lib/queryKeys.ts` (single source of truth).
- TMDB staleness: trending/popular 30 min, details/credits 24 h, search 5 min, config 7 days.
- Supabase staleness: feed/profile/statuses 30 s–2 min with invalidation on mutation.
- Optimistic updates only where rollback is trivial: follow/unfollow, watchlist toggle,
  review like. Everything else invalidates and refetches.
- Community aggregates (avg rating, watched count) come from `get_title_community_summary`
  RPC — one round trip, no client-side N+1.

## Activity generation

Clients cannot insert into `activities`. Rows are produced by:

- `log_title()` RPC — one **combined** activity per log action (watched + rating + review
  in one row, metadata describes which parts exist) → no triple-posting.
- `AFTER INSERT` trigger on `follows` → `followed` activity.
- `AFTER INSERT` trigger on `lists` (public only) → `list_created` activity.
- `set_tv_progress()` RPC emits `tv_completed` when a show is finished.

Feed reads go through `get_activity_feed()` (SECURITY DEFINER): follows ∪ self, minus
blocked/blocking, joined to profiles/titles/reviews/lists in one query, keyset-paginated
by `(created_at, id)`.

## Navigation map

```
src/app/
  _layout.tsx            root: providers, fonts, splash, auth gate
  index.tsx              entry redirect (session → tabs | sign-in)
  (auth)/sign-in|sign-up|forgot-password
  onboarding/username → profile → genres → rate-titles
  (tabs)/home | search | log | activity | profile     (sidebar on desktop web)
  movie/[id]             id = TMDB id
  tv/[id] (+ /season/[seasonNumber])
  person/[id]
  user/[username] (+ /reviews /watched /lists /followers /following)
  review/[id]
  list/[id] | list/create | list/edit/[id]
  watchlist.tsx
  settings.tsx
```

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | client | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | client | Supabase anon/publishable key (RLS-protected) |
| `EXPO_PUBLIC_TMDB_MODE` | client | `proxy` \| `direct` \| `demo` (optional override) |
| `EXPO_PUBLIC_TMDB_ACCESS_TOKEN` | client, dev only | TMDB v4 read token for `direct` mode |
| `EXPO_PUBLIC_DEMO_SEED` | client | `1` shows demo hints on auth screens |
| `TMDB_API_TOKEN` | Edge Function secret | TMDB v4 read token used by `tmdb-proxy` |

## Risk register

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| TMDB terms disallow client-held keys | High (for prod) | Proxy is the default transport; direct mode documented as dev-only; commercial-use note in README |
| RLS mistake exposes private data | Medium | Policies written per-table with tests in `supabase/tests/rls.test.sql`; deny-by-default |
| Session token > SecureStore 2 KB limit | Certain | AES key in SecureStore, ciphertext in AsyncStorage (`LargeSecureStore`) |
| Feed slow at scale | Low (MVP) | Keyset pagination, composite indexes, single RPC round trip |
| SDK 57 is new; library lag | Medium | Stick to Expo-bundled libs + mature JS-only deps; jest-expo pinned to SDK |
| No Supabase project yet | Certain (now) | App boots into labelled demo mode; `docs/DEPLOYMENT.md` runbook |
| Duplicate/impersonated activity | Medium | Activities only via definer functions/triggers; no client insert policy |
| Abuse of write endpoints | Medium | DB CHECK limits, Zod limits, per-user rate limit in `log_title`/reviews via statement checks |

## Definition of done

See `docs/PRD.md` — plus each phase ends with `npm run typecheck && npm run lint && npm test`
green and a focused git commit.
