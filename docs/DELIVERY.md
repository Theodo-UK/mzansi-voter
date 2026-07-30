# Delivery

Mzansi Voter uses `main` as its only long-lived branch. Pull requests prove a
change is safe, merging deploys it to development, and production is a manual
promotion of a tested `main` commit.

## Release path

1. Create a short-lived branch from `main`.
2. Open a pull request to `main`.
3. Wait for the application and database migration checks to pass.
4. Merge the pull request.
5. GitHub Actions applies development database migrations, deploys the Supabase
   Edge Function, and deploys the development Worker.
6. Verify the change at <https://dev.mzansivoter.co.za>.
7. In GitHub Actions, run **Deploy production** from `main`.
8. Verify the change at <https://mzansivoter.co.za>.

Do not use `develop` or release branches. Do not deploy from a contributor
branch.

## Workflows

- `CI` runs on pull requests to `main`. It has no deployment credentials. It
  runs linting, application tests, the production build, and every Supabase
  migration against a clean local database.
- `Deploy development` runs after a commit reaches `main`. It repeats the
  application checks before touching development.
- `Deploy production` runs only when a maintainer starts it manually from
  `main`. Production deployments are serialized and are never cancelled by a
  newer run.

Both deployment workflows apply changes in this order:

1. Build and test the Worker.
2. Apply pending Supabase migrations.
3. Deploy the `product-preview` Edge Function.
4. Deploy the Cloudflare Worker.

Database migrations must remain backward-compatible with the currently
deployed Worker. A failed Worker deployment can be rolled back; an applied
database migration cannot. Correct a database problem with a new forward
migration.

## GitHub environments

Create `development` and `production` environments. Each environment uses the
same names but different values.

### Variables

- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_PROJECT_ID`

The Supabase URL and publishable key are public application configuration. They
are variables, not secrets.

### Secrets

- `CLOUDFLARE_API_TOKEN`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

Use a Cloudflare token restricted to the account that owns the Mzansi Voter
Workers, with only the Worker editing permissions needed by Wrangler. Use a
dedicated Supabase CI account rather than a personal access token where
possible.

The projects are:

| Environment | Cloudflare Worker | Supabase project |
| --- | --- | --- |
| Development | `mzansi-voter-dev` | `aksfajzlkhlslqsexzus` |
| Production | `mzansi-voter` | `hsqdrrebcowvieyvmxvl` |

## One-time provider setup

The workflows deploy code and database changes, but they do not configure
Google OAuth or Supabase Auth settings. For each Supabase project:

1. Enable Google as the only sign-in provider.
2. Configure `public.hook_restrict_theodo_signup` as the Before User Created
   hook.
3. Add the environment's `/auth/callback` URL to the redirect allowlist.
4. Confirm the `product-previews` storage bucket and policies created by the
   migrations.
5. Before the first automated deployment, compare `supabase migration list`
   with the committed migrations. If a migration was previously applied through
   the SQL editor, reconcile its history before running `db push`; do not mark a
   migration as applied without verifying the schema change.

## GitHub plan limitation

The current private-repository plan does not provide branch protection or
required environment reviewers. CI results and the manual production action
are available, but GitHub cannot enforce review or successful checks before a
merge. If Theodo enables those features later, require both CI jobs on `main`
and require a reviewer for the `production` environment.
