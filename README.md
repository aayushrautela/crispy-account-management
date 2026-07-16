# Crispy Account Management

Account portal for Crispy. This app manages authentication, profiles, and account security. It talks to **crispy-server** over its REST API using the Supabase-issued JWT as a bearer token.

## Architecture

- **Frontend**: React 19 + Vite + TypeScript
- **State**: Zustand (`src/store/useAuthStore.ts`)
- **Auth**: Supabase Auth (email/password), session persisted by the Supabase client
- **API client**: `src/lib/apiClient.ts` — wraps `fetch` with the Supabase session JWT and unwraps the server's `{ data, meta }` envelope
- **Data layer**: service modules in `src/services/`
- **Backend**: crispy-server REST API (`/v1/*`) + Supabase Auth + Supabase Storage (avatars only)

### Auth + API flow

1. User signs in with email/password via Supabase Auth (`src/services/authService.ts`).
2. On session restore, `useAuthStore` calls `GET /v1/me` to load the account id, settings, and profiles.
3. All subsequent calls send `Authorization: Bearer <supabase-jwt>` and hit crispy-server routes:
   - `GET /v1/me`
   - `GET /v1/profiles`, `POST /v1/profiles`, `PATCH /v1/profiles/:id`
   - `GET /v1/profiles/:id/settings`, `PATCH /v1/profiles/:id/settings`
   - `GET /v1/profiles/:id/import-connections`, `POST /v1/profiles/:id/imports/start`
   - `GET /v1/account/settings`, `PATCH /v1/account/settings`, `DELETE /v1/account`

Provider (Trakt/SIMKL) OAuth is fully server-side: `beginTraktAuth`/`beginSimklAuth` POSTs to `/v1/profiles/:id/imports/start` with `action: 'connect'`, and the server returns an `authUrl` that the browser is redirected to. The server owns the OAuth callback and secrets.

## Environment variables

Create `.env` in repo root:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CRISPY_API_URL=http://localhost:3100
VITE_DOWNLOAD_URL_WINDOWS=
VITE_DOWNLOAD_URL_ANDROID=
VITE_DOWNLOAD_URL_LINUX=
VITE_ONBOARDING_TORRENT_ADDON_URL=
VITE_ONBOARDING_HTTPS_ADDON_URL=
```

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Supabase project for auth and avatar storage.
- `VITE_CRISPY_API_URL` — **required.** Base URL of crispy-server's REST API. There is no fallback.
- Optional download/onboarding URLs power their respective pages. If unset, the UI shows "Coming soon".

## Development

```bash
npm install
npm run dev
```

## Quality gates

```bash
npm run lint
npm run test
npm run build

# full local gate
npm run ci
```

## Key folders

- `src/services/`: auth/account/profile/onboarding APIs
- `src/store/`: session + account bootstrap state
- `src/lib/`: `apiClient` (fetch wrapper), `supabase` (auth/storage client), `storage` (local persistence), `avatar`
- `src/pages/`: auth and dashboard routes
- `src/components/`: shared UI and feature forms
