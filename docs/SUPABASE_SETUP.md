# Supabase setup

The app runs against its local fixture only in development. Production fails
closed when Supabase credentials are absent. To enable authentication and
persistence:

1. Apply `supabase/migrations/20260727000000_initial_mvp.sql`.
2. Apply `supabase/migrations/20260727000001_space_display_names.sql`.
3. Configure `public.hook_restrict_theodo_signup` as
   the project's **Before User Created** Auth Hook.
4. Enable Google as an authentication provider.
5. Disable email/password and anonymous signups. Google should be the only
   enabled provider.
6. Set the production site URL and add each `/auth/callback` URL to the
   redirect allowlist.
7. Copy `.env.example` to `.env.local` and supply:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Google OAuth is owned by `liamhitchcock@gmail.com` in the `mzansi-voter`
Google Cloud project. Its External audience is published to production and the
web client redirects to:

`https://hsqdrrebcowvieyvmxvl.supabase.co/auth/v1/callback`

Unauthenticated page requests redirect directly to Google. The database hook
and row-level security allow verified `@theodo.com` and `@aleios.com`
accounts.

The migration creates the Cape Town group, derives display names from verified
emails, assigns `liam.hitchcock@theodo.com` as admin, assigns every other
accepted office account as a member, and enables row-level security.
