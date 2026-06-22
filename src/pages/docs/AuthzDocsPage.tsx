/**
 * AuthzDocsPage — End-to-end documentation for the project's authorization
 * stack: RBAC, ABAC, Personas, Teams, Workflow roles, and the runtime
 * evaluation pipeline. Describes the actual implementation in this codebase.
 */
import { useCallback, useState } from "react";
import { Copy, Check, ShieldCheck, Users, UserCog, Layers, KeyRound, ScrollText, Workflow } from "lucide-react";
import { DocCard, CardContent, CardHeader, CardTitle } from "@/components/docs/DocCard";
import ModuleDocLayout from "@/components/docs/ModuleDocLayout";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function Code({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);
  return (
    <div className="relative group/code">
      {label && (
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      )}
      <pre className="bg-muted/50 border border-border rounded-lg p-4 text-[11px] leading-relaxed font-mono overflow-x-auto whitespace-pre-wrap">{code}</pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity inline-flex items-center gap-1 rounded border border-border bg-card/90 px-1.5 py-0.5 text-[9px] font-medium hover:bg-muted"
      >
        {copied ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
      </button>
    </div>
  );
}

const ARCH = `┌──────────────────────────────────────────────────────────────────────┐
│                            Browser (React)                          │
│                                                                      │
│   AuthzProvider ──► loads: profile, app roles, personas, teams,     │
│                     persona→roles→permissions, ABAC policies         │
│                                                                      │
│   useAuthz()       → global   can(action, resource)                 │
│   useWorkflowRole(wfId) → per-workflow role + permissions[]          │
│   <Can/> <CanOnWorkflow/> <ProtectedRoute/>  guard UI & routes       │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  Supabase JS (JWT)
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Lovable Cloud (Postgres)                       │
│                                                                      │
│   SECURITY DEFINER functions (RLS-safe):                            │
│     • has_role(uid, app_role)       — platform admin/viewer         │
│     • is_super_admin(uid)                                            │
│     • workflow_role(uid, wf)        — legacy text role              │
│     • workflow_permissions(uid, wf) — resolved permission[]          │
│     • has_workflow_perm(uid, wf, perm)                               │
│     • can_view/edit/manage_workflow(uid, wf)                         │
│                                                                      │
│   Every public.* table: GRANT + RLS using the helpers above.        │
└──────────────────────────────────────────────────────────────────────┘`;

const RESOLVE = `Permission resolution (per request):

  1. is_super_admin?                       → grant '*'
  2. workflow_members.custom_role_id?      → workflow_custom_roles.permissions
  3. workflow_members.template_id?         → workflow_role_templates.permissions
  4. workflow_members.role  (legacy text)  → matching template.permissions
  5. Personas (global)                     → persona_roles → role_permissions → permissions.key
  6. ABAC node_access_rules + policies     → evaluated against {user, case, node, time}
  7. None of the above                     → DENY`;

const TABLES = `Authorization tables (public schema)

  Platform RBAC
    user_roles(user_id, role app_role)        -- admin | viewer
    profiles                                   -- attributes jsonb (used by ABAC)

  Persona model (global, reusable)
    personas(id, name, description, attributes)
    user_personas(user_id, persona_id)
    persona_roles(persona_id, role_id)
    roles(id, name, description)
    role_permissions(role_id, permission_id)
    permissions(id, key, description)          -- e.g. workflow.update, node.approve

  Teams
    teams(id, name, attributes)
    user_teams(user_id, team_id)

  Per-workflow RBAC
    workflow_role_templates(key, name, permissions jsonb, is_builtin)
    workflow_custom_roles(id, workflow_id, name, permissions jsonb, template_id?)
    workflow_members(workflow_id, user_id, role text, template_id?, custom_role_id?, persona_id?)
    workflow_personas(workflow_id, persona_id)        -- workflow-scoped personas
    workflow_team_members(workflow_id, team_id, role)

  ABAC
    node_access_rules(workflow_id, step_id, action, effect, expression jsonb, priority, enabled)
    policies(name, effect, action, resource_pattern, condition jsonb, priority, enabled)

  Observability
    audit_events(actor_id, action, resource_type, resource_id, workflow_id, meta jsonb, ip, created_at)`;

const ABAC_DSL = `{
  "all": [
    { "fact": "user.persona",    "op": "in", "value": ["cfo", "finance_lead"] },
    { "any": [
      { "fact": "case.amount",   "op": ">=", "value": 10000 },
      { "fact": "case.priority", "op": "==", "value": "high" }
    ]},
    { "not": { "fact": "user.role", "op": "==", "value": "viewer" } }
  ]
}

Facts:  user.id | user.email | user.role | user.persona | user.team |
        user.permission | case.<dataField> | node.id | node.type |
        time.now | time.dayOfWeek
Ops:    == != > >= < <= in not_in contains matches
Groups: all | any | not`;

const REACT_USAGE = `// Route guard
<Route path="/studio" element={
  <ProtectedRoute perm="workflow.update"><StudioPage/></ProtectedRoute>
}/>

// Global capability gate
<Can action="workflow.delete" resource={\`workflow:\${id}\`}>
  <button onClick={remove}>Delete</button>
</Can>

// Per-workflow gate
<CanOnWorkflow workflowId={id} permission="workflow.deploy">
  <DeployButton/>
</CanOnWorkflow>

// In a component
const { can, personas, teams, user } = useAuthz();
const { role, permissions, hasPerm, canEdit, canApprove } = useWorkflowRole(id);`;

const EVAL_FN = `// src/lib/abac/evaluator.ts
import { evaluateRule } from "@/lib/abac/evaluator";

const allowed = evaluateRule(rule.expression, {
  user: { id, email, role, persona: personaNames, team: teamNames, permission: perms },
  case: dataModelValues,           // current Case IR data
  node: { id: step.id, type: step.type },
  time: { now: new Date(), dayOfWeek: new Date().getDay() },
});

// Used in two places:
//  1. Studio — preview "would this rule allow you?" in NodeAccessRulesSection
//  2. Runtime worker — gate node execution before invoking the module`;

const SCOPES = `Where you assign access (UI → table)

  Persona → User           /admin/users  → user_personas
  Persona → Roles bundle   /admin/personas → persona_roles
  Role    → Permissions    /admin/roles  → role_permissions
  Team    → User           /admin/teams  → user_teams
  Workflow member          Studio · Members tab → workflow_members
  Workflow custom role     Studio · Roles tab   → workflow_custom_roles
  Node RACI persona        Studio · node · RACI → node_instance_configs.personas
  Node ABAC rule           Studio · node · Access Rules → node_access_rules
  Form/field visibility    Form Builder · field rules (uses ABAC DSL client-side)
  Global ABAC policy       /admin/policies → policies`;

const RLS = `-- Example pattern used by every workflow-scoped table
CREATE POLICY "select if member or super admin"
  ON public.workflow_business_rules FOR SELECT
  TO authenticated
  USING (public.can_view_workflow(auth.uid(), workflow_id));

CREATE POLICY "write if editor"
  ON public.workflow_business_rules FOR ALL
  TO authenticated
  USING (public.can_edit_workflow(auth.uid(), workflow_id))
  WITH CHECK (public.can_edit_workflow(auth.uid(), workflow_id));

-- For lookup tables (personas, roles, permissions) authenticated users
-- have GRANT SELECT so the global pickers can populate.`;

export default function AuthzDocsPage() {
  return (
    <ModuleDocLayout
      title="Authorization — RBAC · ABAC · Personas · Teams"
      subtitle="End-to-end reference for how identity, permissions, and policies flow from the database to the React UI and the workflow runtime."
      badges={["RBAC", "ABAC", "Personas", "Teams", "Per-Workflow Roles", "Audit"]}
    >
      {/* Overview */}
      <DocCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck size={16}/> Model at a glance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Authorization is a layered model. <b>RBAC</b> answers <i>"what can this identity do, in general?"</i>{" "}
            <b>ABAC</b> answers <i>"under these conditions, does this specific action on this specific resource pass?"</i>{" "}
            <b>Personas</b> bundle roles for reuse, <b>Teams</b> group users for ownership, and <b>per-workflow roles</b>{" "}
            scope all of the above to a single workflow.
          </p>
          <Code label="High-level architecture" code={ARCH}/>
        </CardContent>
      </DocCard>

      {/* RBAC */}
      <DocCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound size={16}/> RBAC — Roles &amp; Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Two RBAC layers coexist:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Platform RBAC</b> — <code>user_roles.role</code> (<code>admin</code> | <code>viewer</code>). Admin is a wildcard (<code>*</code>) bypass enforced in <code>AuthzContext</code> and <code>is_super_admin()</code>.</li>
            <li><b>Application RBAC</b> — <code>roles</code> + <code>permissions</code> joined through <code>role_permissions</code>; users acquire them via <code>user_personas → persona_roles</code>.</li>
            <li><b>Per-workflow RBAC</b> — <code>workflow_role_templates</code> (global) and <code>workflow_custom_roles</code> (per workflow). A <code>workflow_members</code> row picks one.</li>
          </ul>
          <p>Permission keys are flat strings, e.g. <code>workflow.view</code>, <code>workflow.update</code>, <code>workflow.deploy</code>, <code>workflow.manage_members</code>, <code>node.approve</code>, <code>audit.view</code>. The catalog is seeded in <code>workflow_permission_catalog</code> and surfaced in role-editor checkboxes.</p>
          <Code label="Resolution order" code={RESOLVE}/>
        </CardContent>
      </DocCard>

      {/* Personas */}
      <DocCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCog size={16}/> Personas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            A <b>persona</b> is a named bundle of roles representing a job function (Reviewer, CFO, Field Engineer).
            Personas decouple <i>who someone is</i> from <i>what permissions they get</i> — change the persona's role set
            and every user mapped to it updates instantly.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Global personas</b> live in <code>personas</code> and are managed at <code>/admin/personas</code>. Bind users via the dialog at <code>/admin/users</code>.</li>
            <li><b>Workflow personas</b> live in the Case IR (<code>caseIr.personas</code>) and are managed in Studio · Personas. New entries are mirrored into the global <code>personas</code> table so they appear in Members and RACI pickers.</li>
            <li>Personas are also used by ABAC: <code>user.persona</code> resolves to the list of persona names attached to the current user.</li>
            <li>Persona-specific step variants are stored on the step (<code>personaVariants</code>) so the same node can present different forms / module config per persona.</li>
          </ul>
        </CardContent>
      </DocCard>

      {/* Teams */}
      <DocCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users size={16}/> Teams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            A <b>team</b> is an organizational grouping (Finance, Ops, Region-EMEA). Teams are used for ownership,
            routing, and ABAC filtering — they do <i>not</i> grant permissions directly.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Managed at <code>/admin/teams</code>. Membership lives in <code>user_teams</code>.</li>
            <li>Workflows can pin team membership via <code>workflow_team_members</code> (Studio · Team tab).</li>
            <li>ABAC fact <code>user.team</code> resolves to all team names the user belongs to; combine with <code>in</code> / <code>not_in</code> to scope routing.</li>
          </ul>
        </CardContent>
      </DocCard>

      {/* Per-workflow */}
      <DocCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Workflow size={16}/> Per-Workflow Roles &amp; Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Each workflow has its own membership list with one of three role sources:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Built-in template</b> — <code>workflow_admin</code>, <code>designer</code>, <code>approver</code>, <code>viewer</code> (seeded as <code>is_builtin=true</code>).</li>
            <li><b>Custom template</b> — any row in <code>workflow_role_templates</code> manageable at <code>/admin/role-templates</code> by super admins.</li>
            <li><b>Workflow-local custom role</b> — clone a template and tweak in Studio · Members · Roles. Persisted in <code>workflow_custom_roles</code>.</li>
          </ul>
          <p>
            The creator of a workflow is auto-seeded as <code>workflow_admin</code> by the
            <code>seed_workflow_admin_member()</code> trigger. The hook <code>useWorkflowRole(id)</code> returns
            <code>{` { role, permissions, hasPerm, canEdit, canApprove, canManage, canDeploy, canAudit } `}</code>
            and is the canonical guard inside Studio.
          </p>
          <Code label="React usage" code={REACT_USAGE}/>
        </CardContent>
      </DocCard>

      {/* ABAC */}
      <DocCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers size={16}/> ABAC — Node &amp; Policy Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            ABAC adds <b>conditional</b> authorization on top of RBAC. Rules are stored as a JSON expression tree
            so they're queryable, editable in a visual builder, and evaluatable identically in the browser and the
            external worker.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Node rules</b> — <code>node_access_rules</code>. Scoped to a (<code>workflow_id</code>, <code>step_id</code>, <code>action</code>) triple with <code>effect: allow | deny</code> and <code>priority</code>. Edited in Studio · node · <i>Access Rules</i>.</li>
            <li><b>Global policies</b> — <code>policies</code>. Apply across resources via <code>resource_pattern</code> glob (e.g. <code>workflow:*</code>). Managed at <code>/admin/policies</code>.</li>
            <li><b>Evaluation order</b> — sort by <code>priority ASC</code>, first matching rule wins; <code>deny</code> overrides <code>allow</code> at equal priority.</li>
          </ul>
          <Code label="Expression DSL" code={ABAC_DSL}/>
          <Code label="Evaluator API" code={EVAL_FN}/>
        </CardContent>
      </DocCard>

      {/* Tables */}
      <DocCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers size={16}/> Database Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <Code label="Tables" code={TABLES}/>
          <Separator/>
          <p>Every table is locked down by RLS using the SECURITY DEFINER helpers; lookup tables are <code>GRANT SELECT</code> to <code>authenticated</code> so pickers can read them.</p>
          <Code label="RLS pattern" code={RLS}/>
        </CardContent>
      </DocCard>

      {/* Assignment matrix */}
      <DocCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck size={16}/> Where to assign what</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <Code label="UI → underlying table" code={SCOPES}/>
        </CardContent>
      </DocCard>

      {/* Audit */}
      <DocCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ScrollText size={16}/> Audit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Authorization mutations emit rows into <code>audit_events</code> via the <code>auditLog()</code> helper
            (<code>src/lib/audit/log.ts</code>). Captured events include member add/remove/role-change, custom-role
            CRUD, node-rule CRUD, persona binding, and workflow deploy/delete.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Global view</b> — <code>/admin/audit</code> renders <code>&lt;AuditLogTable/&gt;</code> with actor/action/resource/date filters and CSV export.</li>
            <li><b>Per-workflow</b> — Studio · Members · <i>Audit</i> sub-tab reuses the same component with <code>workflowId={"{id}"}</code>.</li>
            <li>Visibility is RLS-controlled: super admin sees everything; workflow admin sees only rows for workflows where <code>can_manage_workflow()</code> returns true.</li>
          </ul>
        </CardContent>
      </DocCard>

      {/* Failure modes */}
      <DocCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck size={16}/> Common failure modes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex gap-2 items-start"><Badge variant="outline">Empty picker</Badge><p>The table has RLS but no <code>GRANT SELECT</code> to <code>authenticated</code>. PostgREST returns an empty array silently. Fix with a migration adding the grant.</p></div>
          <div className="flex gap-2 items-start"><Badge variant="outline">"permission denied"</Badge><p>Resolution returned an empty permission set. Check <code>workflow_members</code> for the user, then walk <code>custom_role_id → template_id → role</code>.</p></div>
          <div className="flex gap-2 items-start"><Badge variant="outline">ABAC silently denies</Badge><p>Default is <i>deny</i>. Either no rule matched, or a higher-priority <code>deny</code> shadowed an <code>allow</code>. Use the "Preview" button in the rule builder to test against your own context.</p></div>
          <div className="flex gap-2 items-start"><Badge variant="outline">Stale role in UI</Badge><p>The per-workflow role is cached in-memory. Call <code>invalidateWorkflowRole(id)</code> after membership changes.</p></div>
        </CardContent>
      </DocCard>
    </ModuleDocLayout>
  );
}
