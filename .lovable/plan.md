
# Custom Roles, Node ABAC, and Audit Log UI

Three independent features, one ship.

---

## 1. Custom workflow roles

Two layers, both usable from the same picker:

**Layer A — Global role templates** (managed by super admin under `/admin/role-templates`):
```text
workflow_role_templates
  id, key, name, description
  permissions (jsonb array of permission keys)
  is_builtin (bool)   -- the 4 fixed roles are seeded as builtin
```
Workflow admins can pick any template when adding a member.

**Layer B — Per-workflow custom roles** (managed inside each workflow's Members tab, "Roles" sub-tab):
```text
workflow_custom_roles
  id, workflow_id, name, description
  template_id (nullable)        -- optional: cloned from a template
  permissions (jsonb array)     -- overridden permission set
```
A workflow admin can clone a template and tweak permissions, or build from scratch.

**Membership update:** `workflow_members.role` becomes nullable text, plus two new optional FKs:
- `template_id → workflow_role_templates.id`
- `custom_role_id → workflow_custom_roles.id`

If `custom_role_id` is set, its permissions win. Else `template_id`. Else the legacy `role` text (kept for backward compat — the 4 builtin templates map 1:1 to it).

**Helper functions** updated:
- `workflow_permissions(uid, wf_id) returns text[]` — returns the resolved permission keys for that user on that workflow.
- `has_workflow_perm(uid, wf_id, perm)` — convenience boolean.
- `can_view/edit/manage_workflow` keep working: they now check the resolved permission set (`workflow.view`, `workflow.edit`, `workflow.manage`).

**Permission catalog** (seeded into a `workflow_permissions_catalog` table for UI listing):
```
workflow.view, workflow.edit, workflow.delete, workflow.deploy, workflow.manage_members,
workflow.manage_roles, workflow.manage_rules, workflow.edit_forms, workflow.edit_data_model,
node.execute, node.approve, node.edit, audit.view
```

**Builtin template seeds:**
- `workflow_admin` → all
- `designer` → view/edit/edit_forms/edit_data_model/edit_rules/node.edit
- `approver` → view/node.approve
- `viewer` → view

**UI:**
- `/admin/role-templates` → CRUD page (super admin only). Permission checkboxes from catalog.
- Studio → Members tab → "Roles" sub-tab → CRUD custom roles for this workflow, clone-from-template button.
- Members add/edit form: role picker shows both global templates and this workflow's custom roles in two groups.

---

## 2. ABAC node-level rules

New table:
```text
node_access_rules
  id, workflow_id, step_id           -- step_id is the Case IR step id
  name, description
  effect (allow | deny)
  action (view | edit | execute | approve)
  expression (jsonb)                 -- structured condition tree
  priority int                       -- lower = evaluated first
  enabled bool
```

**Expression DSL** (JSON, easy to render and evaluate):
```json
{ "all": [
  { "fact": "user.persona",    "op": "in",    "value": ["cfo","finance_lead"] },
  { "any": [
    { "fact": "case.amount",   "op": ">=",    "value": 10000 },
    { "fact": "case.priority", "op": "==",    "value": "high" }
  ]},
  { "fact": "user.role",       "op": "!=",    "value": "viewer" }
]}
```

Supported facts:
- `user.id`, `user.email`, `user.role`, `user.persona`, `user.team`, `user.permission`
- `case.<dataField>` — any field from the workflow's data model
- `node.id`, `node.type`, `time.now`, `time.dayOfWeek`

Supported ops: `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`, `contains`, `matches` (regex).

Combinators: `all`, `any`, `not`.

**Evaluator:** pure TS function `evaluateRule(expr, context)` shipped in `src/lib/abac/`. Used both:
- in the Studio property panel preview ("would this rule allow you?"), and
- by the runtime worker before executing node logic.

**Persistence helper:** the existing `node_instance_configs.personas` (RACI) stays unchanged. New rules live in their own table so they're query-able and listable per workflow.

**UI:**
- `NodeConfigDialog` gets a new **Access Rules** tab beside RACI: list of rules for this node, "Add rule" opens a visual rule builder.
- Rule builder: drag-style nested groups (all/any/not), `fact → op → value` rows. No raw JSON unless user clicks "Advanced".
- Per workflow, a top-level "Rules" tab (in Studio) lists all node rules with filter by node.

---

## 3. Audit log UI

**Backend:** `audit_events` already exists. Add helper view `audit_events_with_actor` joining `profiles` for email/name. RLS:
- Super admin sees all.
- Workflow admin sees rows where `workflow_id = ?` and `can_manage_workflow(uid, workflow_id)`.

**Frontend:**
- **Global** — `/admin/audit` (already routed; currently a stub). Rebuild as a filterable table:
  - filters: actor (search by email), action, resource type, workflow, date range
  - columns: when · who · action · resource · workflow · IP · details (expand JSON)
  - pagination, CSV export
- **Per-workflow** — new "Audit" sub-tab in Studio Members area, scoped to that workflow.

Both views share one component `<AuditLogTable workflowId?={id} />` to avoid duplication.

**Emit more events:** wire `audit_events` inserts (via a tiny `auditLog()` helper) on:
- member add/remove/role-change
- custom-role create/update/delete
- node rule create/update/delete
- workflow create/delete/deploy

---

## Migrations

One migration, in order: tables → grants → RLS → seed builtin templates and permission catalog → upgrade helper functions.

## Out of scope (deliberately, this turn)

- Runtime enforcement of ABAC rules inside the external worker (the evaluator is shipped, calling it from the worker is a separate Mastra-side change).
- Audit log retention / archival.

## Technical notes

- All new tables: `GRANT` to authenticated, RLS that delegates to `can_manage_workflow` / `is_super_admin`. Role templates table is readable by all authenticated users (so the picker works).
- `workflow_role` RPC keeps returning the legacy text role for back-compat; new RPC `workflow_permissions` returns the resolved permission set.
- `useWorkflowRole` hook gains `permissions: string[]` and `hasPerm(key)`.
- `<CanOnWorkflow>` gets `permission="..."` as an alternative to `action`.
