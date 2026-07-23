# Video Club

Video Club (formerly Watchd) is a social tracker for movies and TV. Discover what's trending, log what you
watch, track series progress, rate and review, keep a watchlist, build lists,
follow people, add friends, and plan viewing together with shared watchlists —
on iOS, Android and the web from one Expo codebase.

**Stack:** Expo SDK 57 · React Native · React Native Web · Expo Router ·
TypeScript (strict) · TanStack Query · Zustand · React Hook Form + Zod ·
Supabase (Postgres, Auth, Storage, RLS, Edge Functions) · TMDB API.

## Quick start

```bash
npm install
cp .env.example .env    # optional — see modes below
npm run web             # or: npm run ios / npm run android / npm start
```

Three ways to run:

| Mode | Setup | You get |
| --- | --- | --- |
| **Demo** | none — just `npm run web` | Full UI with a small bundled catalogue, no accounts |
| **Hosted** | Supabase URL + anon key in `.env` (see `docs/DEPLOYMENT.md`) | Real accounts, tracking, social features |
| **Local stack** | Docker + `npx supabase start && npx supabase db reset` | Everything, with seeded demo users (`ava@example.com` / `watchd-demo-1`) |

TMDB metadata transport is picked automatically: the deployed `tmdb-proxy`
Edge Function (production), your own dev token (`EXPO_PUBLIC_TMDB_ACCESS_TOKEN`,
development only), or bundled demo fixtures when nothing is configured.

## Scripts

```bash
npm run web / ios / android   # start the dev server per platform
npm run typecheck             # strict TypeScript
npm run lint                  # ESLint (expo config)
npm test                      # Jest + React Native Testing Library
npm run format                # Prettier
npx expo export -p web        # static web build → dist/
npx supabase test db          # RLS tests (needs local stack)
```

## Project layout

```
src/
  app/           Expo Router routes (tabs, auth, onboarding, titles, users, lists…)
  components/    Design-system primitives + media/review/activity/list cards
  features/      Feature modules: auth, onboarding, discovery, search, titles,
                 tracking, reviews, social, lists, activity, profile
  lib/           supabase client · typed TMDB client (proxy/direct/demo) ·
                 analytics abstraction · query keys
  theme/         Design tokens + dark/light themes + provider
  types/         Domain models · hand-maintained DB row types
supabase/
  migrations/    Schema, functions/triggers, RLS + storage policies
  functions/     tmdb-proxy Edge Function (Deno)
  seed.sql       Local-dev demo data (never for production)
  tests/         pgTAP RLS assertions
docs/            PRD · architecture · deployment runbook
```

## Security model (short version)

- RLS on every table; deny by default. Verified by `supabase/tests/rls_test.sql`
  and a behavioural smoke suite run against real Postgres.
- The client ships only the Supabase anon key. No service-role key anywhere.
- The TMDB token lives in Edge Function secrets, never in the bundle.
- Feed activities cannot be forged: no client insert path — only SECURITY
  DEFINER functions and triggers write them, and `log_title()` collapses
  watch + rate + review into **one** deduplicated feed entry.
- Counter columns (followers, likes, list sizes) are trigger-maintained and
  locked with column grants.
- Input limits enforced twice: Zod client-side, CHECK constraints in Postgres.

## Attribution & licensing

This product uses the TMDB API but is not endorsed or certified by TMDB.
Movie and TV metadata and artwork are supplied by
[The Movie Database (TMDB)](https://www.themoviedb.org/). Commercial use of
the TMDB API must be checked against their current licensing terms before this
product is monetised.

## Documentation

- `docs/PRD.md` — product scope and definition of done
- `docs/ARCHITECTURE.md` — technical architecture, data flow, risk register
- `docs/DEPLOYMENT.md` — Supabase/EAS/web deployment runbook
