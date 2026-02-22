# StoryVote

StoryVote is an online voting system for scrum teams.

## Current reboot status
This branch is the reboot foundation:
- Tailwind CSS setup (Pico removed)
- Supabase client + initial schema migration
- Firebase runtime usage removed
- Updated UI shell and voting screens

## Stack
- Next.js (App Router)
- React
- Tailwind CSS
- Supabase

## Environment variables
Create a `.env.local` file using `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Supabase migration
Initial SQL schema is at:
- `supabase/migrations/001_init_rooms.sql`

## Run
```bash
pnpm install
pnpm dev
```
