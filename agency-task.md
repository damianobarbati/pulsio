## Goal

- Add personal, agency workspace model.
- Scope sites, analytics access, subscriptions, billing, payments to workspace.
- Support agency owner, staff, billing roles.

## Domain

- `users`: authentication identity, credentials, verification, suspension, sessions.
- `workspaces`: data and billing ownership boundary.
- `workspace_members`: user membership and role.
- `sites.workspace_id`: site ownership boundary.
- `subscriptions.workspace_id`, `payments.workspace_id`: billing ownership boundary.
- Do not bind sites, subscriptions, payments directly to users.

```text
users -> workspace_members -> workspaces -> sites -> analytics data
                                      -> subscriptions
                                      -> payments
```

## Workspace types

- `workspaces.kind`: `personal` | `agency`.
- Registration creates one user, one personal workspace, one `owner` membership, one trial subscription, one registered site.
- Personal workspace accepts exactly one membership: workspace owner.
- Personal workspace rejects invitation, member update, member removal endpoints.
- Agency creation creates workspace and creator `owner` membership.
- User can belong to many agency workspaces.
- Existing accounts migrate to users.
- Existing sites, subscriptions, payments migrate to personal workspace created for matching user.

## Roles

- Owner: view sites, analytics, goals, members, plan, payments, invoices; manage sites, site data, goals, members, billing, subscription; delete workspace.
- Staff: view sites, analytics, goals, members; manage sites, site data, goals.
- Billing: view plan, payments, invoices; manage billing data, checkout, subscription cancellation, invoice download.

- Keep `owner` role for personal workspace.
- Require at least one owner for every agency workspace.
- Reject removal or downgrade of last agency owner.
- Require owner role in source and destination workspace for site transfer.
- Enforce permissions in controllers. Do not rely on hidden UI controls.

## Database

- Add `users` table from current `accounts` identity fields.
- Add `workspaces` table:

```sql
id uuid primary key
created_at timestamptz not null
updated_at timestamptz not null
name text not null
kind text not null check (kind in ('personal', 'agency'))
owner_user_id uuid not null references users(id)
```

- Add `workspace_members` table:

```sql
workspace_id uuid not null references workspaces(id) on delete cascade
user_id uuid not null references users(id) on delete cascade
role text not null check (role in ('owner', 'staff', 'billing'))
created_at timestamptz not null
updated_at timestamptz not null
primary key (workspace_id, user_id)
```

- Add unique index for one personal workspace per `owner_user_id`, filtered by `kind = 'personal'`.
- Replace `sites.account_id` with `sites.workspace_id`.
- Replace `subscriptions.account_id` with `subscriptions.workspace_id`.
- Replace `payments.account_id` with `payments.workspace_id`.
- Replace `sessions.account_id` with `sessions.user_id`.
- Preserve site IDs, domain uniqueness, events, goals, Stripe identifiers, invoice records.
- Use raw SQL only. Leave migration `down` handlers empty.

## Authentication and authorization

- Authenticate session to `AuthenticatedUser`:

```ts
type AuthenticatedUser = { userId: string; email: string };

type AuthenticatedMember = {
  userId: string;
  workspaceId: string;
  role: 'owner' | 'staff' | 'billing';
};
```

- Resolve `AuthenticatedMember` from authenticated user plus requested workspace ID.
- Reject missing membership with `403`.
- Use one permission helper with explicit allowed roles.
- Scope every site lookup by `workspace_id`.
- Scope every analytics query through authorized site workspace.
- Scope every billing and payment lookup by `workspace_id`.
- User suspension blocks access to all workspaces.
- Removing membership blocks workspace access without deleting user identity.

## Invitations

- Add `workspace_invitations` table with workspace ID, email, role, token hash, expiry, accepted timestamp, invited-by user ID.
- Agency owners can create invitations only.
- Invitation binds to normalized invited email address.
- Invitation expires after 7 days and accepts once.
- Existing user accepts invitation after authentication.
- New user registers from invitation, receives personal workspace, then accepts agency membership.
- Do not create sites during invitation or invitation acceptance.
- Reject invitation actions for personal workspace.

## Site transfer

- Add owner-only endpoint: `POST /sites/:id/transfer`.
- Input: destination `workspace` UUID.
- Allow transfer between personal and agency workspaces when caller owns both.
- Check destination plan limits before transfer.
- Update only `sites.workspace_id` inside transaction.
- Preserve site ID, domain, tracking snippet, events, analytics data, goals, detection state.
- Do not transfer subscription, payment, or invoice history.
- Show confirmation: destination members gain access to site analytics and configuration.
- After agency creation, offer optional site transfer. Do not move sites automatically.

## API

- Add `GET /workspaces`: authenticated user memberships and workspace summaries.
- Add `POST /workspaces`: create agency workspace.
- Add `GET /workspaces/:workspaceId/members`: owner, staff.
- Add `POST /workspaces/:workspaceId/invitations`: owner.
- Add `PATCH /workspaces/:workspaceId/members/:userId`: owner.
- Add `DELETE /workspaces/:workspaceId/members/:userId`: owner.
- Add `POST /invitations/:token/accept`: authenticated invited user.
- Require workspace UUID for workspace scoped endpoints.
- Update existing `/account`, `/sites`, `/analytics/*`, `/billing`, `/payments` endpoints for workspace scope.
- Validate all request and response payloads in `packages/types`.
- Add controller, service, repository layers for workspace and invitation resources.

## Web application

- Default active workspace: personal workspace.
- Hide workspace selector while user belongs only to personal workspace.
- Show selector when user belongs to more than one workspace.
- Selector labels personal workspace as `Personal`; agency workspace uses workspace name.
- Keep active workspace in application state.
- Send active workspace ID with every workspace scoped request.
- Do not render analytics, sites, goals, team controls for billing role.
- Do not render team controls for staff role.
- Render team management only for agency owner.
- Add agency creation flow.
- Add invitation, member role update, member removal flows.
- Add optional site transfer flow after agency creation and from site settings.
- Add confirmation prompt before site data deletion, membership removal, role downgrade, site transfer, workspace deletion.

## Billing

- Create Stripe customer and subscription per workspace.
- Checkout metadata uses workspace ID.
- Stripe webhook resolves workspace subscription.
- Billing role can open checkout, update billing data, cancel subscription, view payments, download invoices.
- Billing role cannot access site, analytics, goal, member data.

## Tests

- Registration creates user, personal workspace, owner membership, trial subscription, initial site.
- Personal workspace rejects invitation and member management operations.
- Agency owner can invite, assign role, remove member.
- Staff can manage sites and site data but cannot manage members or billing.
- Billing user can access billing and payments only.
- Removed member loses agency access and retains personal workspace.
- Last owner cannot be removed or downgraded.
- Site transfer preserves tracking identity and analytics access continuity.
- Site transfer rejects non-owner caller, unauthorized destination, destination plan limit failure.
- Existing account migration preserves site, subscription, payment, event, goal relationships.
