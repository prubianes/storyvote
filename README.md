# StoryVote

StoryVote is an online voting system for scrum teams.

## Current reboot status
This branch is the reboot foundation:
- Tailwind CSS setup (Pico removed)
- Supabase client + initial schema migration
- Firebase runtime usage removed
- Updated UI shell and voting screens
- Rounds lifecycle/history and participants heartbeat

## Stack
- Next.js (App Router)
- React
- Tailwind CSS
- Supabase

## Environment variables
Create a `.env.local` file using `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SESSION_SECRET`

## Supabase migration
Apply migrations in order:
- `supabase/migrations/001_init_rooms.sql`
- `supabase/migrations/002_lockdown_admin.sql`
- `supabase/migrations/003_atomic_vote_delta.sql`
- `supabase/migrations/004_rounds_votes.sql`
- `supabase/migrations/005_round_lifecycle_history.sql`
- `supabase/migrations/006_participants_heartbeat.sql`
- `supabase/migrations/007_reset_votes_only.sql`
- `supabase/migrations/008_room_state_voted_users.sql`

## Presence behavior
- Participant joins room on lobby submit.
- Heartbeat updates every 60 seconds while user is active on the room page.
- Inactive users (no interaction for 5 minutes) are marked inactive.
- Participant is marked inactive on logout and room unmount (best effort).

## Run
```bash
pnpm install
pnpm dev
```
