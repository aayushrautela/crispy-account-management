# Crispy Account Management - Production Plan

## Goal

Keep this app production-grade and aligned with crispy-server's REST API (`/v1/*`), using Supabase Auth (email/password) for identity and the Supabase-issued JWT as a bearer token for all API calls.

## Architecture

- **Auth**: Supabase Auth (email/password). Session persisted by the Supabase client; auto-refreshed.
- **API client**: `src/lib/apiClient.ts` — thin `fetch` wrapper that attaches `Authorization: Bearer <supabase-jwt>` and unwraps the server's `{ data, meta }` envelope.
- **Bootstrap**: `useAuthStore.initialize()` restores the Supabase session, then calls `GET /v1/me` to resolve the account id, settings, and profiles. Onboarding state is derived from profile settings + provider connections.
- **Profiles / onboarding / account settings**: all go through crispy-server routes. There is no household concept; an account owns its profiles directly.
- **Provider OAuth (Trakt/SIMKL)**: fully server-side via `/v1/profiles/:id/imports/start`. The frontend only redirects to the server-returned `authUrl`.

## Current status

### Done

- Email/password sign-in, sign-up with optional referral code.
- JWT-bearer API client (`apiClient.ts`) — no `/portal` prefix, no cookie/handoff sessions.
- Account bootstrap via `GET /v1/me`; account id drives all downstream calls.
- Profile CRUD refactored to `profileService`, aligned to the server's `Profile` shape.
- Account settings, profile settings, and addon settings via `accountService` / `onboardingService` / `addonService`.
- Provider connection flow redirects to server-managed OAuth (`beginTraktAuth` / `beginSimklAuth`).
- Account deletion via `DELETE /v1/account`.
- Inlined Zod validation schemas (`src/contracts.ts`); dropped the EOL `@crispy-streaming/supabase-contract` package.
- Removed dead Supabase Edge Functions and the `household` abstraction entirely.
- Accessibility improvements in `Input` and `Modal` components.
- App error boundary added.
- CI checks and baseline tests (`npm run ci`).

### In scope for hardening

1. **Observability**
   - Add telemetry/error reporting (for example Sentry).
   - Audit logs around destructive account actions.

2. **E2E coverage**
   - Add Playwright flows for signup, login, profile CRUD, account deletion, and provider connect.

3. **OAuth completion UX**
   - After the Trakt/SIMKL redirect, poll `GET /v1/profiles/:id/import-connections` (or refresh onboarding state) so the UI reflects the connected provider without a manual reload.

4. **Bundle optimization**
   - Address Vite chunk-size warning by route-level code splitting.

5. **Operational readiness**
   - Deployment smoke checklist and rollback playbook.

## Non-negotiable runtime dependencies

- crispy-server routes: `GET /v1/me`, `/v1/profiles[*]`, `/v1/profiles/:id/settings[*]`, `/v1/profiles/:id/import-connections`, `/v1/profiles/:id/imports/start`, `GET|PATCH /v1/account/settings`, `DELETE /v1/account`.
- Supabase Auth + Supabase Storage (`avatars` bucket) for avatar uploads.
- `VITE_CRISPY_API_URL` configured (no fallback).

## Release checklist

- [ ] All env vars configured in deployment (including `VITE_CRISPY_API_URL`).
- [ ] `npm run ci` passing.
- [ ] Signup flow tested for both email-verification and immediate-session modes.
- [ ] Profile create/update verified. (Profile deletion is intentionally not supported server-side yet.)
- [ ] Provider connect verified end-to-end against the server's OAuth flow.
- [ ] Avatar uploads verified against the Supabase `avatars` bucket.
