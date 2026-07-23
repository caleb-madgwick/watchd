# Watchd — Deployment Runbook

Target Supabase project: **Watchd** (`hotkhazclabrzaipvspl`, Caleb's personal org, ap-northeast-1).

## 1. Supabase (one-time)

```bash
# Authenticate the CLI with YOUR personal account (browser flow):
npx supabase login

# Link this repo to the project:
npx supabase link --project-ref hotkhazclabrzaipvspl

# Apply the schema, functions, RLS and storage policies:
npx supabase db push

# Deploy the TMDB proxy:
npx supabase functions deploy tmdb-proxy

# Give the proxy its TMDB token (v4 "API Read Access Token" from
# https://www.themoviedb.org/settings/api):
npx supabase secrets set TMDB_API_TOKEN=<your token>
```

If you connected the **GitHub integration** in the Supabase dashboard, pushing
to the tracked branch applies `supabase/migrations/**` automatically — you then
only need the function deploy + secret steps.

Auth settings to review in the dashboard (Authentication → URL Configuration):

- Site URL: your deployed web URL (or `http://localhost:8081` while developing)
- Additional redirect URLs: `http://localhost:8081`, plus your web origin,
  each with `/reset-password` reachable (used by the password recovery email)

`supabase/seed.sql` is for the **local** stack only (`supabase db reset` with
Docker). Never run it in production — it creates demo users with a shared
password.

## 2. App environment

```bash
cp .env.example .env
```

Fill in (Dashboard → Project Settings → API Keys):

```
EXPO_PUBLIC_SUPABASE_URL=https://hotkhazclabrzaipvspl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
```

Leave `EXPO_PUBLIC_TMDB_MODE` empty (defaults to `proxy` once Supabase is set).
For local development without the deployed function you may set
`EXPO_PUBLIC_TMDB_MODE=direct` and `EXPO_PUBLIC_TMDB_ACCESS_TOKEN=<your own
token>` — dev only; never ship a shared TMDB credential in a client build.

## 3. Web deployment

### Vercel (recommended for test links)

One-time setup, then a single command per deploy:

```bash
npx vercel login              # one-time, opens browser
npm run deploy:web            # export with your local .env baked in → deploy
```

The first deploy asks to create a Vercel project (accept defaults). It prints
a production URL like `https://watchd-xxxx.vercel.app` — share that with
testers. `vercel.json` handles clean URLs and the SPA fallback so deep links
(`/movie/27205`, `/user/name`) resolve without breaking asset requests.

`deploy:web` builds locally, so the `EXPO_PUBLIC_*` values in your local
`.env` are baked into the bundle (they're public-safe by design — anon key +
URL only; security lives in RLS).

**After the first deploy**, add the Vercel URL in Supabase → Authentication →
URL Configuration:

- Site URL: `https://<your-app>.vercel.app`
- Additional redirect URLs: `https://<your-app>.vercel.app/reset-password`

so password-reset emails (and confirmation links, if re-enabled) land on the
deployed app instead of localhost.

**Alternative — Git integration:** push the repo to GitHub, import it in the
Vercel dashboard (it reads `vercel.json` for build settings), and set
`EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` as project
environment variables. Every push then auto-deploys with preview URLs.

### Any other static host

```bash
npx expo export -p web        # outputs static site to ./dist
```

Deploy `dist/` to Netlify/Cloudflare Pages with an SPA fallback to
`/index.html` for extensionless paths (Netlify `_redirects`:
`/*  /index.html  200`).

## 4. iOS / Android (EAS)

```bash
npm i -g eas-cli
eas login
eas build --profile preview --platform ios     # or android
```

`app.json` already carries bundle ids (`app.watchd.mobile`) and `eas.json` the
build profiles. Set the two `EXPO_PUBLIC_SUPABASE_*` values as EAS environment
variables (they are public-safe). For quick device testing without builds:
`npx expo start` + Expo Go.

## 5. Local development options

| Setup | What works |
| --- | --- |
| No `.env` | Demo mode: bundled fixture catalogue, no accounts |
| `.env` with Supabase keys | Full product against the hosted project |
| Docker + `npx supabase start` && `npx supabase db reset` | Full product against a local stack with seeded demo users (password `watchd-demo-1`) |

RLS verification: `npx supabase test db` (local stack) runs
`supabase/tests/rls_test.sql` (pgTAP).

## 6. TMDB licensing note

This product uses the TMDB API and displays the required attribution. TMDB's
terms permit free non-commercial use; **before monetising Watchd, review the
current TMDB licensing terms** (https://www.themoviedb.org/api-terms-of-use)
and obtain a commercial licence if required.
