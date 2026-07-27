# Mzansi Voter implementation plan

## Goal

Build a mobile-first group-shopping app that recreates the useful behaviour of
Tesco Voter under an original South African brand.

Members suggest products, vote them up or down, and see which ranked products
fit inside the group's next shopping budget.

## Current checkpoint

Implemented locally:

- Original Mzansi Voter interface with a Cape Town fixture.
- Strict ranking and budget cutoff logic with unit coverage.
- Suggestions, vote toggling, voter-name tooltips, locked and skipped items.
- Admin item controls, group retailer, budget and order settings, and
  next-cycle reset.
- Supabase schema, Google-only exact-domain signup hook, Liam admin bootstrap,
  row-level policies, persistence adapter, and realtime subscriptions.
- Local fixture fallback when Supabase environment variables are absent.

Verified locally:

- ESLint passes.
- Nine ranking, budget, email-domain, and display-name tests pass.
- The Vinext production build passes.
- A built-worker test confirms the product shell server-renders.
- The production dependency audit reports no known vulnerabilities.
- The migration applies to a clean local Postgres database with Supabase
  compatibility shims.
- SQL probes confirm the Google/domain hook, derived names, Liam admin
  bootstrap, ordinary member bootstrap, and next-cycle transaction.

Pending a real Supabase project:

- Apply the migration in Supabase and enable its Before User Created hook.
- Configure Google OAuth and redirect URLs.
- Test Liam admin and ordinary member sessions against live row-level policies.
- Run the two-session realtime flow and browser-level acceptance suite.

## Working assumptions

- The brand is **Mzansi Voter**.
- The first use case is a shared office grocery order.
- The admin selects one retailer for the office ballot. It may be Checkers,
  Pick n Pay, Woolworths, Makro, or another South African retailer.
- Product names, prices, and links are entered manually in v1. Price scraping,
  retailer integrations, and automatic basket creation are explicitly deferred.
- Access is restricted to Google accounts with a verified email address whose
  domain is exactly `theodo.com`.
- In the single-group MVP, an authorised user is automatically added to the
  default Cape Town group on first sign-in.
- The ordinary application URL is shared around the office. There are no
  invitation links, codes, approval steps, or public group discovery.
- The verified email `liam.hitchcock@theodo.com` is hardcoded as the admin of
  that group. Every other authorised user receives the `member` role.
- The MVP has one working group. Multi-group support is a possible later
  direction, not an MVP requirement.
- The project will be built from scratch. We will reproduce product behaviour,
  not copy Tesco Voter's source, assets, or visual identity.

## Reference behaviour to emulate

The authenticated Tesco Voter flow inspected on 27 July 2026 has:

1. Google sign-in and office membership.
2. A group budget and next-order deadline.
3. Product suggestions containing a name, price, product link, and one-off flag.
4. One upvote or downvote per member per item. Selecting the same vote again
   removes it.
5. Live ranking by net score.
6. A green in-budget section and red out-of-budget section.
7. A strict ranked cutoff: when the next ranked item does not fit, every item
   below it is also out, even if a cheaper item would fit.
8. Vote details showing how many people voted each way and their derived display
   names.
9. Admin controls for editing, deleting, locking, skipping, and clearing the
   list.

Mzansi Voter should preserve that core loop while using its own copy and design.
Its explicit next-cycle workflow will replace the reference app's destructive
clear-list behaviour.

## MVP product contract

### Member experience

- Sign in with Google.
- Automatically enter the default Cape Town group after passing the email-domain
  check.
- See the group budget and order deadline.
- See items ordered by:
  1. locked items;
  2. net vote score, descending;
  3. creation time, ascending, for deterministic ties.
- See the running in-budget total and a clear cutoff between accepted and
  out-of-budget items.
- Open the original retailer product page.
- Suggest an item with:
  - name;
  - price in rand;
  - product URL;
  - recurring or one-off purchase.
- Upvote, downvote, change, or remove their vote.
- See aggregate upvote and downvote counts.
- Hover, focus, or tap an upvote or downvote control to see the derived display
  names of the members who cast that vote.

### Admin experience

- Change the group retailer, budget, next order date, and cutoff time.
- Edit or delete a suggested item.
- Lock a required item so it is pinned and cannot be voted on.
- Skip an item for the current cycle without deleting it.
- Start the next cycle:
  - retain recurring items;
  - remove accepted one-off items from the completed cycle;
  - clear votes;
  - unskip temporarily skipped items.

### Explicitly out of scope for v1

- Retailer catalogue search or price scraping.
- Checkers Sixty60, asap!, Woolies Dash, or other basket integrations.
- Payments, reimbursements, receipts, or delivery tracking.
- Optimising the basket to fill every remaining rand.
- Push notifications, native mobile applications, or a public social feed.
- Detailed purchasing history and analytics.

## Budget rules

All money is stored as integer cents.

1. Exclude skipped items.
2. Sort locked items first, followed by ordinary items ranked by net score.
3. Add prices from the top of the list until the next item would exceed the
   budget.
4. Stop at that item. Do not search lower-ranked items for a cheaper fit.
5. Display the accepted total, remaining budget, and first excluded item.
6. If locked items alone exceed the budget, display an explicit admin warning.

These rules deliberately match the reference app's voting contract. A later
"best budget fit" mode would be a separate product decision, not a quiet change.

## Proposed technical shape

Keep the application deliberately small:

- **Frontend:** React and TypeScript using the Vinext app-router scaffold and
  its Vite build.
- **Styling:** Tailwind CSS with a small set of project-owned components.
- **Backend:** Supabase Postgres, Auth, and Realtime.
- **Data fetching:** TanStack Query.
- **Validation:** Zod at UI boundaries plus database constraints.
- **Tests:** Vitest and React Testing Library for logic/components; Playwright
  for the critical browser flow.

React is sufficient because this is an authenticated application, not a
content-heavy website. A separate API server, Redux, microservices, and other
ceremonial furniture are not needed.

## Data model

### `profiles`

- `id` UUID, matching the authenticated user
- `display_name`, derived from the verified email local-part by splitting on
  dots, capitalising each segment, and joining the segments without spaces;
  for example, `liam.hitchcock@theodo.com` becomes `LiamHitchcock`
- `created_at`

### `groups`

- `id` UUID
- `name`
- `currency` fixed to `ZAR` initially
- `retailer`
- `budget_cents`
- `next_order_date`
- `cutoff_time`
- `created_at`

### `group_members`

- `group_id`
- `user_id`
- `role`: `member` or `admin`
- unique key on `(group_id, user_id)`

### `items`

- `id` UUID
- `group_id`
- `name`
- `price_cents`
- `product_url`
- `purchase_type`: `recurring` or `one_off`
- `locked` boolean
- `skipped` boolean
- `created_by`
- `created_at`
- `updated_at`

### `votes`

- `item_id`
- `user_id`
- `value`, constrained to `-1` or `1`
- `updated_at`
- unique key on `(item_id, user_id)`

### `shopping_cycles`

Defer until the next-cycle workflow is implemented:

- `id`
- `group_id`
- `cutoff_at`
- `budget_cents`
- `accepted_total_cents`
- `completed_at`

An item snapshot table can be introduced with cycle history. Do not add it
before the product needs history.

## Security rules

Supabase row-level security is part of the feature, not deployment garnish:

- Google OAuth is the only sign-in provider in v1.
- The OAuth domain parameter may hint `theodo.com` in Google's account chooser,
  but it is not trusted as an access control.
- The backend must normalise and validate the verified email address, then allow
  access only when the portion after the final `@` is exactly `theodo.com`.
- Accounts from any other domain are rejected before an application profile or
  group membership is created.
- Possession of the application URL grants no access by itself; the verified
  `theodo.com` email check is the entry gate.
- The trusted membership bootstrap assigns `admin` only when the normalised,
  verified email is exactly `liam.hitchcock@theodo.com`; this rule must not be
  implemented as a client-side role check.
- Every other authorised account is assigned `member` in the default Cape Town
  group.
- Members can read groups, items, and aggregate votes only for their groups.
- Group members can read the derived display names associated with votes in
  their groups.
- Members can create items and manage only their own vote.
- Admins can update group settings and any item in their groups.
- Membership and admin role changes cannot be performed by ordinary members.
- Product URLs must use HTTPS.
- Google account data beyond the minimum display identity is not copied into
  application tables.

## Delivery sequence

### Phase 1: foundation and product skeleton

- Scaffold React, TypeScript, Vite, linting, formatting, and tests.
- Establish the visual identity and mobile page shell.
- Implement a local fixture containing a Cape Town office, a R1,000 budget, and
  representative grocery items.

Verify:

- The app runs locally from a clean checkout.
- The core screen renders at mobile and desktop widths.
- No backend is required to review the initial interaction design.

### Phase 2: ranking and budget engine

- Implement score calculation, deterministic sorting, and strict cutoff logic as
  pure functions.
- Render in-budget and out-of-budget item cards with totals.

Verify:

- Unit tests cover ties, negative votes, locked items, skipped items, exact
  budget matches, and an expensive ranked item blocking cheaper items below it.
- Money is never calculated using floating-point rand values.

### Phase 3: authentication and persistence

- Create the Supabase schema, constraints, migrations, and row-level policies.
- Add Google authentication, the exact `theodo.com` access guard, display-name
  derivation, and trusted default-group membership bootstrap.
- Replace fixture reads with group-scoped queries.

Verify:

- `liam.hitchcock@theodo.com` is accepted and produces `LiamHitchcock`.
- `liam.hitchcock@theodo.com` receives the `admin` role in the default Cape Town
  group.
- Another valid Theodo account receives `member` and cannot promote itself.
- Addresses from other domains, including suffix tricks such as
  `liam@theodo.com.example`, are rejected.
- Domain matching is case-insensitive and uses the verified provider email.
- A member cannot read or modify another group's data.
- A member cannot grant themselves admin access.
- Refreshing the page preserves the authenticated group view.

### Phase 4: suggestions, voting, and realtime updates

- Add the suggestion form and validation.
- Add vote toggle/change behaviour with optimistic updates.
- Add vote-detail tooltips or popovers containing the derived voter names.
- Subscribe to item and vote changes for the active group.

Verify:

- Two browser sessions see suggestions and vote changes without refreshing.
- Repeating the same vote removes it.
- A failed write rolls the optimistic UI back cleanly.

### Phase 5: admin cycle controls

- Add retailer, budget, next-order date, and cutoff-time settings.
- Add edit, delete, lock, and skip controls.
- Implement the next-cycle transaction.

Verify:

- The next-cycle operation is atomic and idempotent.
- Recurring items remain, purchased one-offs are removed, and votes reset.
- Ordinary members cannot reach the admin operations through the API.

### Phase 6: polish and release readiness

- Accessibility pass for labelled icon buttons, keyboard navigation, focus, and
  colour-independent budget states.
- Ensure vote details are available through hover, keyboard focus, and touch,
  rather than hover alone.
- Responsive and loading/error-state pass.
- Add production environment documentation and deploy only after an explicit
  hosting decision.

Verify:

- Playwright covers sign-in handoff, suggestion, voting, budget movement, and an
  admin cycle.
- The production build is clean and the full test suite passes.

## MVP acceptance criteria

The MVP is complete when:

1. A signed-in member can view their private group.
2. A signed-in account outside the exact `theodo.com` domain cannot enter the
   application.
3. `liam.hitchcock@theodo.com` is the only MVP admin; every other authorised
   account enters the default group as a member.
4. Members can suggest products from the current group retailer and cast one
   current vote per item.
5. Hovering, focusing, or tapping a vote control reveals the derived names of
   the members who cast that vote.
6. Every connected member sees the same live ordering.
7. The accepted list and total follow the documented strict cutoff rules.
8. The admin can manage items, ballot settings, and the shopping cycle.
9. Row-level policies prevent cross-group access and unauthorised admin writes.
10. The critical workflow passes automated tests on a mobile-sized viewport.

## Recorded MVP decisions

- Permanent order history is deferred.
- The default Cape Town group remains hardcoded for the MVP.

Both can be revisited after the office has used the first version.
