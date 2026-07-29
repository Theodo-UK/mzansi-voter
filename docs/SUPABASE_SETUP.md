# Supabase setup

Production and development use separate Supabase projects:

- Production: `hsqdrrebcowvieyvmxvl`
- Development: `aksfajzlkhlslqsexzus`

Local development uses the development project through `.env.local`.
Production data must not be used for local or development testing.

To configure a new environment:

1. Link the Supabase CLI to the intended project and confirm the project ref.
2. Dry-run pending migrations before applying them.
3. Configure `public.hook_restrict_theodo_signup` as
   the project's **Before User Created** Auth Hook.
4. Enable Google as an authentication provider.
5. Disable email/password and anonymous signups. Google should be the only
   enabled provider.
6. Set the environment's site URL and add its `/auth/callback` URL to the
   redirect allowlist.
7. Copy `.env.example` to `.env.local` and supply:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Google OAuth is owned by `liamhitchcock@gmail.com` in the `mzansi-voter`
Google Cloud project. Its External audience is published to production and the
web client redirects to:

`https://hsqdrrebcowvieyvmxvl.supabase.co/auth/v1/callback`

The same Google client also allows the development callback:

`https://aksfajzlkhlslqsexzus.supabase.co/auth/v1/callback`

Unauthenticated page requests redirect directly to Google. The account chooser
receives `hd=theodo.com` as a convenience, while the database hook and
row-level security are the authoritative provider and domain guards.

The migration creates the Cape Town group, derives display names from verified
emails, assigns `liam.hitchcock@theodo.com` as admin, assigns every other
accepted Theodo account as a member, and enables row-level security.
