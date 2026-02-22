# StoryVote Reboot Plan

## Summary
Reboot StoryVote with a modern Next.js stack, migrate backend from Firebase to Supabase (big-bang switch), redesign UI with Tailwind (clean agile-board style), and harden reliability/security.

## Status Legend
- `[x]` Done
- `[-]` In progress / partial
- `[ ]` Pending

## Goals
- [x] Upgrade framework and core libraries.
- [x] Replace Firebase with Supabase.
- [x] Move UI from Pico.CSS to Tailwind.
- [-] Add dynamic rooms, guest nicknames, persistent rounds, and room admin passcode protection.
- [-] Migrate codebase progressively toward strict TypeScript.

## Refactor Phases

### Phase 1: Foundation
- [x] Create dedicated refactor branch.
- [x] Introduce `plan.md` and migration docs.
- [x] Upgrade Next/React/lint stack.
- [x] Add TypeScript config with `allowJs` bridge.
- [x] Add Tailwind setup and replace Pico global import.
- [x] Add Supabase client scaffolding and environment contract.

### Phase 2: Data Layer Migration (Firebase -> Supabase)
- [-] Implement Supabase schema for rooms/participants/rounds/votes.
  - [x] Rooms schema + migrations `001`, `002`, `003`.
  - [ ] Participants/rounds/votes normalized schema.
- [x] Add centralized data-access module for room operations.
- [x] Replace Firebase calls in pages/components with Supabase operations.
- [-] Add realtime subscriptions for room updates.
  - [x] Realtime subscription on `rooms` table.
  - [x] Polling fallback for reliability.
  - [ ] Remove polling fallback after Realtime is fully validated.
- [x] Remove Firebase module and related env vars.

### Phase 3: UI Rebuild (Tailwind)
- [x] Rebuild lobby, room, and admin screens with Tailwind.
- [-] Establish design tokens and reusable UI patterns.
- [x] Remove Pico-specific classes/styles.
- [-] Improve mobile-first layout and interaction feedback.

### Phase 4: Security + Product Hardening
- [x] Add room admin passcode flow and secure validation path.
  - [x] Server-side admin session API (`/api/admin/session`) with signed httpOnly cookie.
  - [x] Server-side admin mutation APIs (`/api/admin/story`, `/api/admin/reset`).
- [-] Enforce data access policies (RLS) on Supabase tables.
  - [x] Restrict anon/authenticated column grants for `rooms`.
  - [ ] Tighten policies further after rounds/votes migration.
- [-] Add session lifecycle handling (join/leave/refresh).
  - [x] Join/leave user list and logout cleanup.
  - [ ] Presence heartbeat/stale cleanup.
- [-] Add explicit empty/error/loading states.

### Phase 5: Quality Gates
- [-] Re-enable strict hooks and linting rules.
- [ ] Add typecheck, lint, test, and build CI workflow.
- [ ] Add smoke tests for create room -> join -> vote -> reset.
- [x] Local quality gates pass: `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Public Interfaces / Contracts
- [x] URL contracts in use:
  - `/` lobby/create-join
  - `/{roomSlug}` room voting
  - `/{roomSlug}/admin` room administration
- [-] Shared domain models:
  - [x] Room-level model and vote array flow
  - [ ] `Round`, `Participant`, normalized `Vote` model
- [-] Data APIs:
  - [x] Room create/get
  - [x] Story update/reset round (server-side admin APIs)
  - [ ] Participant join/leave dedicated API
  - [ ] Vote cast/remove per-user per-round API

## Completed Implementation Slices
1. [x] Tailwind + global styles, Pico removed.
2. [x] Supabase client migration and Firebase runtime removal.
3. [x] Header/session handling fixed (no render-time state updates).
4. [x] Next 15 route params compatibility updates.
5. [x] Secure admin flow moved server-side.
6. [x] Atomic vote updates via SQL RPC to prevent fast-click race conditions.

## Acceptance Criteria Progress
- [x] No Firebase dependency in runtime code.
- [x] Core flows work: join room, vote, update story, reset voting.
- [x] App uses Tailwind-based layout/components.
- [ ] Build/lint/typecheck pass in CI.
- [x] Supabase schema/setup docs are in repo.

## Risks and Mitigations (Current)
- Realtime parity risk:
  - Mitigation applied: room subscription + 2s polling fallback.
- Scope expansion risk:
  - Mitigation applied: vertical slices shipped with validation on each slice.
- Security drift risk:
  - Mitigation applied: server-side admin mutations with service role; client no longer mutates admin fields.

## Next Recommended Slice
1. [ ] Implement normalized `rounds` + `votes` schema and migrate away from room vote arrays.
2. [ ] Add per-user vote identity to eliminate duplicate toggles across clients.
3. [ ] Add CI workflow and smoke tests.
