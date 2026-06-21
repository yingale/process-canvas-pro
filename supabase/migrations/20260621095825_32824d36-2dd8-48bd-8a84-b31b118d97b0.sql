
-- ============================================================
-- 1. Permission catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_permission_catalog (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'workflow',
  sort_order int NOT NULL DEFAULT 100
);
GRANT SELECT ON public.workflow_permission_catalog TO authenticated;
GRANT ALL ON public.workflow_permission_catalog TO service_role;
ALTER TABLE public.workflow_permission_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wpc_select ON public.workflow_permission_catalog;
CREATE POLICY wpc_select ON public.workflow_permission_catalog FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS wpc_admin_write ON public.workflow_permission_catalog;
CREATE POLICY wpc_admin_write ON public.workflow_permission_catalog FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.workflow_permission_catalog (key, label, description, category, sort_order) VALUES
  ('workflow.view',              'View workflow',         'Open the workflow in Studio (read-only)',        'workflow',  10),
  ('workflow.edit',              'Edit workflow',         'Change diagram, steps, properties',              'workflow',  20),
  ('workflow.delete',            'Delete workflow',       'Permanently remove the workflow',                'workflow',  30),
  ('workflow.deploy',            'Deploy workflow',       'Publish to runtime / Camunda',                   'workflow',  40),
  ('workflow.manage_members',    'Manage members',        'Add, remove, and change role of members',        'workflow',  50),
  ('workflow.manage_roles',      'Manage custom roles',   'Create per-workflow custom roles',               'workflow',  60),
  ('workflow.manage_rules',      'Manage rules',          'Create/edit ABAC node access rules',             'rules',     70),
  ('workflow.edit_forms',        'Edit forms',            'Modify form templates',                          'forms',     80),
  ('workflow.edit_data_model',   'Edit data model',       'Add/remove data fields',                         'data',      90),
  ('node.execute',               'Execute node',          'Run an automation node at runtime',              'node',     100),
  ('node.approve',               'Approve at node',       'Take an approval action',                        'node',     110),
  ('node.edit',                  'Edit node config',      'Change node configuration in Studio',            'node',     120),
  ('audit.view',                 'View audit log',        'View the per-workflow audit log',                'audit',    130)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order;

-- ============================================================
-- 2. Global role templates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_role_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workflow_role_templates TO authenticated;
GRANT ALL ON public.workflow_role_templates TO service_role;
ALTER TABLE public.workflow_role_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wrt_select ON public.workflow_role_templates;
CREATE POLICY wrt_select ON public.workflow_role_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS wrt_admin_write ON public.workflow_role_templates;
CREATE POLICY wrt_admin_write ON public.workflow_role_templates FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_wrt_updated_at ON public.workflow_role_templates;
CREATE TRIGGER trg_wrt_updated_at BEFORE UPDATE ON public.workflow_role_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.workflow_role_templates (key, name, description, permissions, is_builtin) VALUES
  ('workflow_admin','Workflow Admin','Full control over this workflow',
    '["workflow.view","workflow.edit","workflow.delete","workflow.deploy","workflow.manage_members","workflow.manage_roles","workflow.manage_rules","workflow.edit_forms","workflow.edit_data_model","node.execute","node.approve","node.edit","audit.view"]'::jsonb, true),
  ('designer','Designer','Can build and edit the workflow but not deploy or manage access',
    '["workflow.view","workflow.edit","workflow.edit_forms","workflow.edit_data_model","workflow.manage_rules","node.edit"]'::jsonb, true),
  ('approver','Approver','Read-only, plus can approve at approval nodes',
    '["workflow.view","node.approve"]'::jsonb, true),
  ('viewer','Viewer','Read-only',
    '["workflow.view"]'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, permissions = EXCLUDED.permissions, is_builtin = true;

-- ============================================================
-- 3. Per-workflow custom roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template_id uuid REFERENCES public.workflow_role_templates(id) ON DELETE SET NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_custom_roles TO authenticated;
GRANT ALL ON public.workflow_custom_roles TO service_role;
ALTER TABLE public.workflow_custom_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wcr_workflow ON public.workflow_custom_roles(workflow_id);
DROP POLICY IF EXISTS wcr_select ON public.workflow_custom_roles;
CREATE POLICY wcr_select ON public.workflow_custom_roles FOR SELECT TO authenticated
  USING (public.can_view_workflow(auth.uid(), workflow_id));
DROP POLICY IF EXISTS wcr_write ON public.workflow_custom_roles;
CREATE POLICY wcr_write ON public.workflow_custom_roles FOR ALL TO authenticated
  USING (public.can_manage_workflow(auth.uid(), workflow_id))
  WITH CHECK (public.can_manage_workflow(auth.uid(), workflow_id));
DROP TRIGGER IF EXISTS trg_wcr_updated_at ON public.workflow_custom_roles;
CREATE TRIGGER trg_wcr_updated_at BEFORE UPDATE ON public.workflow_custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Add template/custom-role refs to workflow_members
-- ============================================================
ALTER TABLE public.workflow_members
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.workflow_role_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_role_id uuid REFERENCES public.workflow_custom_roles(id) ON DELETE SET NULL;

-- Backfill template_id from existing legacy role text
UPDATE public.workflow_members m
SET template_id = t.id
FROM public.workflow_role_templates t
WHERE m.template_id IS NULL AND t.key = m.role;

-- ============================================================
-- 5. Helper: resolved permission set for a user on a workflow
-- ============================================================
CREATE OR REPLACE FUNCTION public.workflow_permissions(_uid uuid, _wf uuid)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  perms jsonb;
  out_perms text[];
BEGIN
  IF public.is_super_admin(_uid) THEN
    SELECT array_agg(key) INTO out_perms FROM public.workflow_permission_catalog;
    RETURN COALESCE(out_perms, ARRAY[]::text[]);
  END IF;

  -- Try custom role first
  SELECT cr.permissions INTO perms
  FROM public.workflow_members m
  JOIN public.workflow_custom_roles cr ON cr.id = m.custom_role_id
  WHERE m.user_id = _uid AND m.workflow_id = _wf
  LIMIT 1;

  IF perms IS NULL THEN
    SELECT t.permissions INTO perms
    FROM public.workflow_members m
    JOIN public.workflow_role_templates t ON t.id = m.template_id
    WHERE m.user_id = _uid AND m.workflow_id = _wf
    LIMIT 1;
  END IF;

  IF perms IS NULL THEN
    SELECT t.permissions INTO perms
    FROM public.workflow_members m
    JOIN public.workflow_role_templates t ON t.key = m.role
    WHERE m.user_id = _uid AND m.workflow_id = _wf
    LIMIT 1;
  END IF;

  IF perms IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  SELECT array_agg(value::text) INTO out_perms
  FROM jsonb_array_elements_text(perms) AS value;
  RETURN COALESCE(out_perms, ARRAY[]::text[]);
END;
$$;

CREATE OR REPLACE FUNCTION public.has_workflow_perm(_uid uuid, _wf uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _perm = ANY(public.workflow_permissions(_uid, _wf))
$$;

-- ============================================================
-- 6. Node ABAC rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.node_access_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  name text NOT NULL,
  description text,
  effect text NOT NULL CHECK (effect IN ('allow','deny')),
  action text NOT NULL CHECK (action IN ('view','edit','execute','approve')),
  expression jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority int NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.node_access_rules TO authenticated;
GRANT ALL ON public.node_access_rules TO service_role;
ALTER TABLE public.node_access_rules ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_nar_workflow ON public.node_access_rules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_nar_step ON public.node_access_rules(workflow_id, step_id);
DROP POLICY IF EXISTS nar_select ON public.node_access_rules;
CREATE POLICY nar_select ON public.node_access_rules FOR SELECT TO authenticated
  USING (public.can_view_workflow(auth.uid(), workflow_id));
DROP POLICY IF EXISTS nar_write ON public.node_access_rules;
CREATE POLICY nar_write ON public.node_access_rules FOR ALL TO authenticated
  USING (public.can_edit_workflow(auth.uid(), workflow_id))
  WITH CHECK (public.can_edit_workflow(auth.uid(), workflow_id));
DROP TRIGGER IF EXISTS trg_nar_updated_at ON public.node_access_rules;
CREATE TRIGGER trg_nar_updated_at BEFORE UPDATE ON public.node_access_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. Audit events: per-workflow scoping
-- ============================================================
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS workflow_id uuid REFERENCES public.workflows(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_workflow ON public.audit_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON public.audit_events(ts DESC);

-- Backfill workflow_id from existing rows where the resource itself is a workflow
UPDATE public.audit_events
SET workflow_id = resource_id::uuid
WHERE workflow_id IS NULL
  AND resource_type = 'workflow'
  AND resource_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Replace permissive policies
DROP POLICY IF EXISTS "Authenticated read audit" ON public.audit_events;
DROP POLICY IF EXISTS "Authenticated insert audit" ON public.audit_events;

CREATE POLICY audit_select ON public.audit_events FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (workflow_id IS NOT NULL AND public.can_manage_workflow(auth.uid(), workflow_id))
    OR actor_user_id = auth.uid()
  );

CREATE POLICY audit_insert ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid() OR public.is_super_admin(auth.uid()));
