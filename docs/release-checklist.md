# Release Checklist

Use this checklist before tagging a release.

## 1) Quality Gate

- [ ] `pnpm install`
- [ ] `pnpm verify`
- [ ] Confirm CI workflow `CI / Verify` passed on the release commit.

## 2) Environment & Config

- [ ] Validate `.env` values in target environment.
- [ ] Confirm `ADMIN_SESSION_SECRET` is set and rotated if needed.
- [ ] Confirm Supabase keys are correct and server key is not exposed.

## 3) Database

- [ ] Apply migrations in order, including:
  - `011_round_reveal_workflow.sql`
- [ ] Validate RPCs:
  - `get_room_state`
  - `get_room_history`
  - `start_new_round`
  - `end_active_round`
  - `reveal_active_round`
  - `reopen_revealed_round`

## 4) Smoke Validation

- [ ] Room join/create flow works.
- [ ] Admin auth/session works.
- [ ] Open -> Reveal -> Re-open -> Close lifecycle works.
- [ ] Vote distribution is hidden while open and animates on reveal.
- [ ] PDF export opens and renders history correctly.
- [ ] ES/EN toggle and dark/light toggle work.

## 5) Release

- [ ] Update release notes and changelog.
- [ ] Tag version and publish release.
- [ ] Monitor logs/errors for the first 24 hours.
