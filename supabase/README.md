# ScopeGrade AI — database

Run the files in `supabase/migrations/` **in numerical order** from the Supabase
SQL Editor (Dashboard → SQL Editor → New query → paste → Run).

| File | What it adds |
| --- | --- |
| `0001_initial_schema.sql` | `profiles`, `clients`, `assessments`, `proposals`, owner-only RLS policies, `updated_at` triggers and the sign-up trigger that creates a profile row. |
| `0002_public_proposal_links.sql` | Private share links (`public_token`, `public_enabled`) and the read-only `get_public_proposal` / `track_public_proposal_view` functions. |
| `0003_proposal_decisions.sql` | Client acceptance and decline from the public link (`accept_public_proposal`, `decline_public_proposal`). |

Every file is idempotent, so re-running one is safe and an existing
installation can be brought up to date by running only the newer files.

## Security model

- All four tables have row level security enabled, and every policy compares
  `auth.uid()` with `owner_id` (`id` for `profiles`). A signed-in user can only
  ever reach their own rows.
- Anonymous visitors never read a table directly. The public proposal page calls
  `security definer` functions that return a fixed, safe JSON payload and only
  for a token whose `public_enabled` flag is still `true`.
- `public_token` is a random UUID. Revoking a link sets `public_enabled` to
  `false`; creating a new link issues a brand new token, so an old URL stops
  working immediately.

## Auth settings

The workspace signs in with email and password. In Supabase go to
**Authentication → Providers → Email** and make sure the provider is enabled.
Leave "Confirm email" on for production; the app handles the confirmation step
and asks the user to verify before the first sign-in.
