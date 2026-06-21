# Enterprise Authorization Platform — Implementation Plan (Lovable Cloud auth)

Auth swap: **Lovable Cloud (Supabase) email/password + Google** replaces Okta. Everything else from the PDF spec stays. Storage moves from MongoDB → **Supabase Postgres** (it's already wired and gives us RLS for free as a second enforcement layer).

## Scope of this build (Phase 1)

Foundation only — model, engine, seed data, admin UI shell, and login. Task routing, advanced ABAC policies UI, and full enforcement sweep come in follow-up phases.

1. Supabase auth (email/password + Google) + `profiles` with user attributes
2. Postgres schema: users/teams/personas/roles/permissions/policies/resources/audit + join tables
3. Seed permission catalog + 4 system roles + 4 starter personas
4. `authorize()` server function with **Deny → Allow → Default Deny** evaluation
5. Audit writer (login, CRUD, authz decisions)
6. Admin pages: Users, Teams, Personas, Roles, Policies, Audit
7. Frontend `useAuthz()` + `<Can>` + sidebar nav filtering
8. Auth pages: `/auth` (login/signup), `/reset-password`

## Database schema

```text
profiles(id PK→auth.users, email, name, status, attributes jsonb, tenant_id, created_at)
teams(id, name, tenant_id)
personas(id, name, description, tenant_id)
roles(id, name, description, tenant_id, is_system)
permissions(id, key UNIQUE, resource, action, description)         -- catalog
resources(id, type, name, attributes jsonb, tenant_id)              -- registry
policies(id, effect ENUM(ALLOW,DENY), action, resource_pattern, condition jsonb, priority, tenant_id)
user_teams(user_id, team_id)
user_personas(user_id, persona_id)
persona_roles(persona_id, role_id)
role_permissions(role_id, permission_id)
user_roles(user_id, role app_role)                                  -- platform-level (admin gate)
audit_events(id, actor_user_id, actor_personas[], actor_teams[],
             resource_type, resource_id, action, decision, reason,
             ip, user_agent, ts, metadata jsonb)                    -- append-only
```

- All tables `tenant_id` default `'default'` for future multi-tenant.
- RLS on every table; `has_role(uid,'admin')` security-definer used in policies (avoids recursion).
- `audit_events` is insert-only for `authenticated`; no update/delete grants.

## Permission catalog (seeded)

Dot notation per spec:
- `navigation.view.{dashboard,workflowStudio,templates,instances,audit,admin}`
- `workflow.{create,read,update,delete,clone,publish,archive}` + `workflow.deploy.{nonprod,prod}`
- `workflowInstance.{read,retry,restart,cancel,forceComplete}`
- `node.{add,edit,delete,execute,read}`
- `template.{create,edit,delete,publish,read}`
- `user.{create,read,update,delete}`, `persona.assign`, `team.assign`
- `team.{create,update,delete,read}`
- `audit.{read,export}`

Single source of truth: `src/lib/authz/permissionCatalog.ts` — used by seed migration AND the role editor UI.

## Authorization Engine

Lives in `src/lib/authz/authorize.ts` (callable from React, edge functions, and supabase RPC).

```ts
authorize({ userId, action, resource? }): { allowed, reason, matched }
```

Sequence (per spec):
1. Load user + teams + personas + roles + permissions (one query w/ joins, cached per request)
2. Evaluate DENY policies → if any match, deny
3. Evaluate ALLOW policies + role permissions (wildcard aware: `workflow.*`, `*`)
4. Default deny
5. `audit_events.insert(...)` always

Condition evaluator: tiny JSON-AST safe evaluator over `user.*`, `resource.*`, `env.*`. Example: `{"and":[{"==":["user.attributes.department","Platform"]},{"==":["user.attributes.employmentType","Employee"]}]}`.

Also exposed as **edge function** `POST /authorize` for non-React callers (Mastra agents, future services).

## Frontend integration

- `src/contexts/AuthzContext.tsx` — fetches `{user, teams, personas, roles, permissions}` once after login, exposes `can(action, resource?)`.
- `src/components/authz/Can.tsx` — `<Can perm="workflow.deploy.prod">…</Can>`
- `src/hooks/useAuthz.ts` — `{ can, cannot, roles, personas, teams }`
- `AppSidebar` filters items via `navigation.view.*`
- Studio toolbar / NodesPanel / PropertiesPanel / DeploymentPanel / TeamPanel / PersonasPanel — every mutating button wrapped in `<Can>` or `disabled={!can(...)}`
- Protected route wrapper redirects to `/auth` if unauthenticated

## Auth pages

- `/auth` — Email/password tabs + Google button (Lovable Cloud)
- `/reset-password` — required for password reset flow
- First user to sign up gets `admin` role automatically (bootstrap); after that, admins invite others

## Admin pages (new)

- `/admin/users` — list, status, attributes (country/department/employmentType), assign personas + teams
- `/admin/teams`
- `/admin/personas` — assign roles
- `/admin/roles` — assign permissions from catalog
- `/admin/policies` — DENY/ALLOW editor with condition builder and "test evaluate" button
- `/admin/audit` — filter by actor/action/resource/decision/date, CSV export (gated by `audit.export`)

All admin pages gated by `navigation.view.admin` + relevant `*.manage` permissions.

## Audit producers (always-on)

- Auth state changes (login, logout, signup, password reset)
- Every `authorize()` call (allow + deny both)
- All admin CRUD (users/teams/personas/roles/policies)
- Workflow create/update/delete/deploy + node CRUD (hooks added at existing patch dispatch site)

## Seed data shipped in migration

Roles (system, non-deletable): `Admin`, `Designer`, `Reviewer`, `Viewer`
Personas: `Platform Administrator`, `Workflow Designer`, `Workflow Reviewer`, `Read Only Auditor`
Each persona pre-mapped to its matching role. Permission catalog fully seeded.

## What's NOT in Phase 1 (explicit deferral)

- Task Routing service (persona+team → least-loaded user) and Studio "Assigned Persona / Eligible Teams" step panel
- Multi-tenant activation (tenant_id stays `'default'`)
- Hierarchical teams/personas, delegation, time-based access, SoD, policy versioning, access certification
- Field-level form/data permissions

These will be Phase 2 once the foundation is in place.

## Open questions

1. **First-user bootstrap** — auto-admin the first signup (recommended for solo setup) or require seeded admin email in the migration?
2. **Auto-confirm email** for signups in dev? (Default: off, matching production behavior.)
3. **Google OAuth** — enable in Phase 1, or email/password only for now?
