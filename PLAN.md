# Crispy Account Management - Production Plan

## Goal

Keep this app production-grade and aligned with the household-based Supabase schema shared with client apps.

## Current status

### Done

- Household-aware auth bootstrap in `useAuthStore`.
- Contract package added locally: `crispy-supabase-contract`.
- Typed Supabase client with shared `Database` contract.
- Legacy `account_id` profile access removed.
- Profile CRUD refactored to service layer and household-scoped predicates.
- Auth pages refactored to `authService` with schema validation.
- Account settings refactored to `accountService` with real delete call via `delete-account` function.
- Accessibility improvements in `Input` and `Modal` components.
- App error boundary added.
- CI checks and baseline tests added (`npm run ci`).

### In scope for hardening

1. **Contract extraction**
   - Move `crispy-supabase-contract` to dedicated repository.
   - Publish and pin semver release in this app.

2. **Observability**
   - Add telemetry/error reporting integration (for example Sentry).
   - Add audit logs around destructive account actions.

3. **E2E coverage**
   - Add Playwright flows for signup, login, profile CRUD, account deletion.

4. **Bundle optimization**
   - Address Vite chunk-size warning by route-level code splitting.

5. **Operational readiness**
   - Add deployment smoke checklist and rollback playbook.

## Non-negotiable runtime dependencies

- Supabase RPC: `ensure_household_membership`
- Supabase Edge Function: `delete-account`
- RLS policies aligned with household roles (`owner`/`member`)

## Release checklist

- [ ] All env vars configured in deployment.
- [ ] `delete-account` function deployed and tested in staging.
- [ ] `npm run ci` passing.
- [ ] Signup flow tested for both email-verification and immediate-session modes.
- [ ] Profile create/update/delete verified for household-scoped behavior.
- [ ] Download URLs configured (or intentionally left unset for "Coming soon").
