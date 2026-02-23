# StoryVote

StoryVote is a real-time planning poker app for scrum teams.

This repository is the rebooted version of the original project, now based on Next.js App Router, TypeScript, Tailwind, and Supabase.

## What It Does

- Create or join a room with a display name.
- Run estimation rounds with Fibonacci-like cards: `1, 2, 3, 5, 8, 13, 20, ∞`.
- Keep participants synced in real time with heartbeat presence.
- Use inline admin controls (inside the room screen) to:
  - Update story
  - Open/close round
  - Reset votes (without closing round)
- Track closed rounds in a history panel with:
  - Round value (most voted value / tie)
  - Vote distribution visualization
  - Round timestamps

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (Postgres + Realtime)

## Current UX Model

- Admin is inline in the room page (no separate admin workflow needed).
- Non-admin users only see a `Modo admin` entry button.
- Admin auth uses server-validated passcode and httpOnly cookie session.
- Presence goes inactive after 5 minutes without interaction.

## Project Structure

- `/Users/pablo/Projects/storyvote/app` - Next.js routes and pages
- `/Users/pablo/Projects/storyvote/components` - UI and feature components
- `/Users/pablo/Projects/storyvote/system` - Supabase and session helpers
- `/Users/pablo/Projects/storyvote/supabase/migrations` - SQL migrations

## Environment Variables

Create `/Users/pablo/Projects/storyvote/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_SESSION_SECRET=
```

Notes:
- `NEXT_PUBLIC_*` values are client-visible.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed.
- `ADMIN_SESSION_SECRET` should be a long random string.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure `.env.local`.

3. Apply migrations in order:
- `/Users/pablo/Projects/storyvote/supabase/migrations/001_init_rooms.sql`
- `/Users/pablo/Projects/storyvote/supabase/migrations/002_lockdown_admin.sql`
- `/Users/pablo/Projects/storyvote/supabase/migrations/003_atomic_vote_delta.sql`
- `/Users/pablo/Projects/storyvote/supabase/migrations/004_rounds_votes.sql`
- `/Users/pablo/Projects/storyvote/supabase/migrations/005_round_lifecycle_history.sql`
- `/Users/pablo/Projects/storyvote/supabase/migrations/006_participants_heartbeat.sql`
- `/Users/pablo/Projects/storyvote/supabase/migrations/007_reset_votes_only.sql`
- `/Users/pablo/Projects/storyvote/supabase/migrations/008_room_state_voted_users.sql`

4. Start development server:
```bash
pnpm dev
```

5. Open:
- [http://localhost:3000](http://localhost:3000)

## Scripts

- `pnpm dev` - start dev server
- `pnpm build` - production build
- `pnpm start` - run production build
- `pnpm lint` - lint project
- `pnpm typecheck` - generate route types + TypeScript checks

## Presence / Heartbeat Rules

- User becomes active on room join.
- Heartbeat runs every 60 seconds while the user is active.
- If no interaction for 5 minutes, user is marked inactive.
- On logout and page leave, app performs best-effort inactive mark.

## Security Model (Current)

- Admin passcode is hashed in DB.
- Admin session is stored as signed httpOnly cookie.
- Admin actions go through server routes:
  - `/api/admin/session`
  - `/api/admin/story`
  - `/api/admin/round/start`
  - `/api/admin/round/end`
  - `/api/admin/reset`

## Known Next Improvements

- Tighten RLS further for `rounds`, `votes`, and `participants`.
- Complete participants normalization by deprecating legacy `rooms.users` writes.
- Add CI and E2E smoke tests.
- Add export/reporting for round history.

## Versioning Note

Given the migration and feature expansion, this reboot is a strong candidate for `v0.2.0`.
