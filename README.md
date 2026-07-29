# Mzansi Voter

A mobile-first office grocery voter inspired by Tesco Voter and built for the
Cape Town office.

## Run locally

```sh
npm install
npm run dev
```

With `.env.local` configured, the app uses the isolated development Supabase
project. The local-only fixture remains available at `/fixture`.

## Check it

```sh
npm test
npm run lint
```

## Deploy

Pushes to `main` run the full test suite and deploy the resulting Worker build
through `.github/workflows/deploy.yml`.

Pushes to `develop` run the same checks and deploy the development Worker to
`https://dev.mzansivoter.co.za` through
`.github/workflows/deploy-dev.yml`.

`npm run deploy` is deliberately development-only. Production deploys come
from the `main` workflow.

The GitHub repository needs these Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The `development` GitHub environment also needs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Create a custom Cloudflare token with **Workers Scripts: Write** permission,
scoped to the account that owns the `mzansi-voter` Worker.

## Connect Supabase

The database schema, office-domain signup hook, Liam admin bootstrap, and
row-level policies live in
`supabase/migrations/20260727000000_initial_mvp.sql`.

Follow [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) when a Supabase
project is ready to be connected.

See [PLAN.md](./PLAN.md) for the agreed scope and delivery sequence.
