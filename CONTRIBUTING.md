# Contributing

Mzansi Voter accepts contributions from people working across Theodo. Keep
changes small, focused, and easy to review.

## Make a change

1. Create a short-lived branch from the latest `main`.
2. Install dependencies with `npm install`.
3. Run the app locally with `npm run dev`.
4. Add or update tests for behavioural changes.
5. Before pushing, run:

   ```sh
   npm test
   npm run lint
   ```

6. Open a pull request into `main`.
7. Wait for the application and database migration checks to pass before
   merging.

Do not target `develop`, create release branches, or deploy from a contributor
branch.

## Pull requests

- Keep each pull request focused on one change.
- Use a conventional commit-style title such as `feat:`, `fix:`, `docs:`, or
  `chore:`.
- Explain the user impact and how the change was verified.
- Include screenshots for visible interface changes.
- Call out database migrations, configuration changes, and follow-up work.
- Never commit credentials, access tokens, or local environment files.

## Database changes

Add schema changes as a new Supabase migration. Never edit a migration that has
already been applied. Migrations must remain compatible with the Worker
currently running in production because database changes cannot be rolled
back with the application.

CI applies every migration to a clean local database. A pull request cannot use
development or production deployment credentials.

## Releases

Merging to `main` deploys development automatically. Verify the change at
<https://dev.mzansivoter.co.za> before a maintainer manually promotes `main` to
production.

See the [delivery guide](./docs/DELIVERY.md) for the complete release path and
environment configuration.
