# Mzansi Voter

A mobile-first office grocery voter inspired by Tesco Voter and built for the
Cape Town office.

## Run locally

```sh
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the development Supabase URL and publishable key from
the GitHub `development` environment. The local app uses the real development
database and Google sign-in; it does not fall back to sample data.

## Check it

```sh
npm test
npm run lint
```

## Delivery

Changes go through pull requests to `main`. Merging deploys development
automatically; production is promoted manually from GitHub Actions after the
development deployment has been verified.

The workflows deploy Cloudflare Workers, Supabase migrations, and the
`product-preview` Edge Function. See [the delivery guide](./docs/DELIVERY.md)
for the release path and environment configuration.

## Connect Supabase

The database schema, office-domain signup hook, administrator bootstrap, and
row-level policies live in
`supabase/migrations/20260727000000_initial_mvp.sql`.

Follow [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) when a Supabase
project is ready to be connected.
