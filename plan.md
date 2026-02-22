# StoryVote Reboot Plan

## Summary
Reboot StoryVote with a modern Next.js stack, migrate backend from Firebase to Supabase (big-bang switch), redesign UI with Tailwind (clean agile-board style), and harden reliability/security.

## Goals
- Upgrade framework and core libraries.
- Replace Firebase with Supabase.
- Move UI from Pico.CSS to Tailwind.
- Add dynamic rooms, guest nicknames, persistent rounds, and room admin passcode protection.
- Migrate codebase progressively toward strict TypeScript.

## Current-State Findings
- Firebase reads/writes are tightly coupled inside UI components.
- Header updates context during render using localStorage; this is fragile.
- Hooks exhaustive-deps rule is disabled.
- UI is dependent on Pico layout primitives and imperative DOM class toggling.
- Dependencies are not installed in this workspace yet, so runtime quality gates are currently blocked.

## Refactor Phases

### Phase 1: Foundation
- Create dedicated refactor branch.
- Introduce `plan.md` and migration docs.
- Upgrade Next/React/lint stack.
- Add TypeScript config and start migration with `allowJs` bridge.
- Add Tailwind setup and replace Pico global import.
- Add Supabase client scaffolding and environment contract.

### Phase 2: Data Layer Migration (Firebase -> Supabase)
- Implement Supabase schema for rooms/participants/rounds/votes.
- Add typed data-access module to centralize room operations.
- Replace all Firebase calls in pages/components with Supabase operations.
- Add realtime subscriptions for room updates.
- Remove Firebase module and related env vars.

### Phase 3: UI Rebuild (Tailwind)
- Rebuild lobby, room, and admin screens with Tailwind.
- Establish design tokens and reusable UI patterns.
- Remove Pico-specific classes/styles.
- Improve mobile-first layout and interaction feedback.

### Phase 4: Security + Product Hardening
- Add room admin passcode flow and secure validation path.
- Enforce data access policies (RLS) on Supabase tables.
- Add session lifecycle handling (join/leave/refresh).
- Add explicit empty/error/loading states.

### Phase 5: Quality Gates
- Re-enable strict hooks and linting rules.
- Add typecheck, lint, test, and build CI workflow.
- Add smoke tests for create room -> join -> vote -> reset.

## Public Interfaces / Contracts to Introduce
- URL contracts:
  - `/` lobby/create-join
  - `/{roomSlug}` room voting
  - `/{roomSlug}/admin` room administration
- Shared domain models:
  - `Room`, `Round`, `Participant`, `Vote`, `VoteValue`
- Data APIs:
  - Room create/get
  - Participant join/leave
  - Vote cast/remove
  - Story update/reset round

## Proposed Immediate Implementation Slice
1. Add Tailwind + global tokens and remove Pico import.
2. Add Supabase client and replace Firebase module usage with Supabase room operations.
3. Refactor header/session handling to avoid state updates during render.
4. Keep behavior parity while enabling next slices (dynamic rooms, rounds/history, security).

## Acceptance Criteria for Reboot
- No Firebase dependency in runtime code.
- Core flows work: join room, vote, update story, reset voting.
- App uses Tailwind-based layout/components.
- Build/lint/typecheck pass in CI.
- Supabase schema and setup docs are in-repo.

## Risks and Mitigations
- Realtime parity risk during migration:
  - Mitigation: keep a room-level realtime channel first, optimize later.
- Scope explosion from full redesign + backend migration:
  - Mitigation: deliver in vertical slices with behavior parity gates.
- Type migration churn:
  - Mitigation: `allowJs` initially, migrate high-churn modules first.
