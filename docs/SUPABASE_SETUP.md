# Supabase setup

The app can run against its local fixture without credentials. To enable the
real authentication and persistence path:

1. Create a Supabase project.
2. Apply `supabase/migrations/20260727000000_initial_mvp.sql`.
3. Configure that migration's `public.hook_restrict_theodo_signup` function as
   the project's **Before User Created** Auth Hook.
4. Enable Google as an authentication provider.
5. Disable email/password and anonymous signups. Google should be the only
   enabled provider.
6. Add the application's local and eventual production URLs to the Supabase
   redirect allowlist.
7. Copy `.env.example` to `.env.local` and supply:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The Google account chooser receives `hd=theodo.com` as a convenience, but the
database hook is the authoritative provider and domain guard.

The migration creates the Cape Town group, derives display names from verified
emails, assigns `liam.hitchcock@theodo.com` as admin, assigns every other
accepted Theodo account as a member, and enables row-level security.
