# Supabase setup

The app runs against its local fixture only in development. Production fails
closed when Supabase credentials are absent. To enable authentication and
persistence:

1. Link the Supabase CLI to the target project.
2. Run `supabase db push` to apply every pending migration in order.
3. Deploy the `product-preview` Edge Function.
4. Configure `public.hook_restrict_theodo_signup` as
   the project's **Before User Created** Auth Hook.
5. Enable Google as an authentication provider.
6. Disable email/password and anonymous signups. Google should be the only
   enabled provider.
7. Set the site URL and add the environment's `/auth/callback` URL to the
   redirect allowlist.
8. Copy `.env.example` to `.env.local` and supply:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Google OAuth lives in the `mzansi-voter` Google Cloud project. Before handoff,
verify project ownership is assigned to a Theodo-managed Google group or
organization rather than an individual account. Its External audience is
published to production and the web client redirects to:

`https://hsqdrrebcowvieyvmxvl.supabase.co/auth/v1/callback`

Unauthenticated page requests redirect directly to Google. The database hook
and row-level security allow verified `@theodo.com` and `@aleios.com`
accounts.

The migrations create the Cape Town group, derive display names from verified
emails, configure group administrators, and enable row-level security.

GitHub Actions applies migrations and deploys the Edge Function for development
and production. See [the delivery guide](./DELIVERY.md) for the required
environment variables and secrets.
