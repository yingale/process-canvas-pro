
# Per-Workflow Authorization + RACI Personas on Nodes

Rebuilds authorization around **per-workflow membership** instead of global roles. Ships in one pass: DB + RLS + edge functions + Studio UI.

---

## 1. Authorization model

**Three layers:**

| Layer | Who | Scope |
|---|---|---|
| Platform | `super_admin` (the first signup) | Everything, everywhere |
| Workflow | `workflow_admin`, `designer`, `approver`, `viewer` | One workflow each |
| Node | RACI persona assignments | One activity each |

**Rules:**
- Creating a workflow auto-inserts the creator as `workflow_admin` for that workflow.
- A non-super-admin user sees a workflow **only if** they have any membership row for it (creator or assigned). No "public/org" tab.
- Only `super_admin` or that workflow's `workflow_admin` can add/remove members, change roles, assign personas/teams on that workflow.
- A user can be `workflow_admin` on A, `viewer` on B, `approver` on C simultaneously.
- `viewer` is truly read-only: no node drag, no property edit, no deploy, no settings.

---

## 2. Database changes

New table:

```text
workflow_members
  workflow_id  -> workflows.id
  user_id      -> auth.users.id
  role         (workflow_admin | designer | approver | viewer)
  persona_id   nullable -> personas.id
  team_id      nullable -> teams.id
  added_by     -> auth.users.id
  unique(workflow_id, user_id)
```

New security-definer functions:
- `is_super_admin(uid)` — wraps `has_role(uid, 'admin')`
- `workflow_role(uid, wf_id)` returns the role text, or null
- `can_manage_workflow(uid, wf_id)` = super_admin OR workflow_admin
- `can_edit_workflow(uid, wf_id)` = super_admin OR admin/designer
- `can_view_workflow(uid, wf_id)` = membership exists OR super_admin

Trigger on `workflows` INSERT: insert `{workflow_id, creator, workflow_admin}` into `workflow_members`.

Migrate node-instance RACI: add a JSONB `personas` column to `node_instance_configs`:
```json
{ "responsible": ["personaId"], "accountable": "personaId",
  "consulted": ["personaId"], "informed": ["personaId"] }
```

**RLS rewrite** (all use the new helpers, no recursion):
- `workflows` SELECT/UPDATE/DELETE → `can_view_workflow` / `can_manage_workflow`
- `workflow_personas`, `workflow_team_members`, `workflow_business_rules`, `workflow_data_model`, `workflow_deployments`, `node_instance_configs`, `reusable_modules` → gated by `can_view_workflow` (read) and `can_edit_workflow` (write); deploy gated by `can_manage_workflow`
- `workflow_members` → readable by any member of that workflow; writable only by `can_manage_workflow`

---

## 3. Edge functions

- `list-workflows` — drop service-role bypass. Use the caller's JWT. RLS filters automatically.
- `create-workflow` — after insert, trigger seeds the admin membership. Function just returns id.
- New `manage-workflow-members` — list/add/update/remove members, enforces `can_manage_workflow` server-side.

---

## 4. Frontend

**Routing (`App.tsx`):** every workflow route gets a `requireWorkflowAccess` wrapper that 404s on miss.

**Permission utility:** replace flat `can(perm)` with `canOnWorkflow(wfId, action)` driven by a new `useWorkflowRole(wfId)` hook that calls `workflow_role` via RPC and caches per workflow.

**Action gating** in Studio toolbar, node context menus, deploy button, settings, personas/teams tabs — wrap with `<CanOnWorkflow wfId action="edit|manage|deploy">`.

**New Members tab** on each workflow (visible only to admins): add user, pick persona + team + role, remove.

**RACI on nodes:** Studio properties panel gets a "Personas (RACI)" section with four pickers (R/A/C/I) populated from that workflow's personas. Persisted in `node_instance_configs.personas`. BPMN export writes to `camunda:property` extension elements for round-trip.

**Profile page:** already pulls from `useAuthz()`. Add a "My Workflows" section grouped by role.

**All Workflows list:** server already filters; just remove the "Create" button for users with no `workflow.create` global perm (kept as a platform perm — anyone authenticated can create, becoming admin of their own).

---

## 5. Migration of existing data

- Seed `workflow_members` from existing `workflows.created_by` → role `workflow_admin`.
- Existing `workflow_personas` / `workflow_team_members` rows are kept as-is (they remain the assignment source); a one-time backfill inserts a `viewer` membership for any user referenced there who isn't already a member.

---

## 6. Out of scope (deliberately)

- Custom per-workflow role definitions (sticking to the 4 fixed roles).
- Granular per-node permission overrides beyond RACI display.
- Audit log UI (events are still written to `audit_events`).

---

## Technical notes

- Helpers are `SECURITY DEFINER` with `SET search_path = public` to avoid the recursive-RLS trap on `workflow_members`.
- `workflow_members` itself uses simple `user_id = auth.uid()` SELECT plus a definer-function policy for admin writes — no self-reference in policies.
- Frontend `useWorkflowRole` uses React Query with `['wfRole', wfId, userId]` and invalidates on any `manage-workflow-members` mutation.
- BPMN export adds `<camunda:property name="raci.responsible" value="..."/>` etc. inside `extensionElements`; importer reads them back.
