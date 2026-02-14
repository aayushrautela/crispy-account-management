# Crispy Account Management

Household-aware account portal for Crispy. This app manages authentication, profiles, and account security against the updated Supabase schema.

## What changed

- Migrated from legacy account-scoped profile access to household-scoped access (`household_id`).
- Added household bootstrap flow using `ensure_household_membership`.
- Added a shared contract package from npm (`@crispy-streaming/supabase-contract`).
- Refactored Supabase writes into service modules with shared validation and error mapping.
- Replaced simulated account deletion with Edge Function invocation (`delete-account`).
- Added CI checks (`lint`, `test`, `build`) and baseline unit tests.

## Architecture

- **Frontend**: React 19 + Vite + TypeScript
- **State**: Zustand (`src/store/useAuthStore.ts`)
- **Data layer**: service modules in `src/services/`
- **Contract**: `@crispy-streaming/supabase-contract` package with typed tables/RPCs and Zod validators
- **Backend**: Supabase Auth + Postgres + Storage + Edge Functions

## Required Supabase contract

This app assumes the updated schema with:

- `public.households`
- `public.household_members`
- `public.profiles`
- `public.profile_data`
- `public.addons`
- RPC: `ensure_household_membership`

## Environment variables

Create `.env` in repo root:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_DOWNLOAD_URL_WINDOWS=
VITE_DOWNLOAD_URL_ANDROID=
VITE_DOWNLOAD_URL_LINUX=
```

Optional download URLs power the **Get the app** page. If unset, the UI shows "Coming soon".

## Edge function dependency

Account deletion requires a deployed Supabase Edge Function named:

- `delete-account`

The function should perform authenticated user deletion server-side (service role) and cascade according to your database policies.

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

- `src/services/`: auth/account/profile/household APIs
- `src/store/`: session + household bootstrap state
- `src/pages/`: auth and dashboard routes
- `src/components/`: shared UI and feature forms

## Contract dependency

`@crispy-streaming/supabase-contract` is consumed from npm (see `package.json`).
