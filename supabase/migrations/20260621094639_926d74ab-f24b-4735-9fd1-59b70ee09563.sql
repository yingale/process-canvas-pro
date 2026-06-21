
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.workflows w
SET created_by = p.id
FROM public.profiles p
WHERE w.created_by IS NULL AND w.owner IS NOT NULL AND lower(p.email) = lower(w.owner);

CREATE TABLE IF NOT EXISTS public.workflow_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('workflow_admin','designer','approver','viewer')),
  persona_id uuid REFERENCES public.personas(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_members TO authenticated;
GRANT ALL ON public.workflow_members TO service_role;
ALTER TABLE public.workflow_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wm_workflow ON public.workflow_members(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wm_user ON public.workflow_members(user_id);

DROP TRIGGER IF EXISTS trg_wm_updated_at ON public.workflow_members;
CREATE TRIGGER trg_wm_updated_at BEFORE UPDATE ON public.workflow_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.node_instance_configs ADD COLUMN IF NOT EXISTS personas jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.is_super_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.workflow_role(_uid uuid, _wf uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_super_admin(_uid) THEN 'workflow_admin'
              ELSE (SELECT role FROM public.workflow_members
                    WHERE user_id = _uid AND workflow_id = _wf LIMIT 1)
         END
$$;

CREATE OR REPLACE FUNCTION public.can_view_workflow(_uid uuid, _wf uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid)
      OR EXISTS (SELECT 1 FROM public.workflow_members WHERE user_id = _uid AND workflow_id = _wf)
$$;

CREATE OR REPLACE FUNCTION public.can_edit_workflow(_uid uuid, _wf uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid)
      OR EXISTS (SELECT 1 FROM public.workflow_members
                 WHERE user_id = _uid AND workflow_id = _wf
                   AND role IN ('workflow_admin','designer'))
$$;

CREATE OR REPLACE FUNCTION public.can_manage_workflow(_uid uuid, _wf uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid)
      OR EXISTS (SELECT 1 FROM public.workflow_members
                 WHERE user_id = _uid AND workflow_id = _wf AND role = 'workflow_admin')
$$;

CREATE OR REPLACE FUNCTION public.seed_workflow_admin_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.workflow_members (workflow_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.created_by, 'workflow_admin', NEW.created_by)
    ON CONFLICT (workflow_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_workflow_admin ON public.workflows;
CREATE TRIGGER trg_seed_workflow_admin AFTER INSERT ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.seed_workflow_admin_member();

INSERT INTO public.workflow_members (workflow_id, user_id, role, added_by)
SELECT id, created_by, 'workflow_admin', created_by
FROM public.workflows
WHERE created_by IS NOT NULL
ON CONFLICT (workflow_id, user_id) DO NOTHING;

INSERT INTO public.workflow_members (workflow_id, user_id, role, added_by)
SELECT DISTINCT wtm.workflow_id, p.id, 'viewer', NULL::uuid
FROM public.workflow_team_members wtm
JOIN public.profiles p ON lower(p.email) = lower(wtm.email)
ON CONFLICT (workflow_id, user_id) DO NOTHING;

DROP POLICY IF EXISTS wm_select ON public.workflow_members;
CREATE POLICY wm_select ON public.workflow_members FOR SELECT TO authenticated
  USING (public.can_view_workflow(auth.uid(), workflow_id));
DROP POLICY IF EXISTS wm_insert ON public.workflow_members;
CREATE POLICY wm_insert ON public.workflow_members FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_workflow(auth.uid(), workflow_id));
DROP POLICY IF EXISTS wm_update ON public.workflow_members;
CREATE POLICY wm_update ON public.workflow_members FOR UPDATE TO authenticated
  USING (public.can_manage_workflow(auth.uid(), workflow_id))
  WITH CHECK (public.can_manage_workflow(auth.uid(), workflow_id));
DROP POLICY IF EXISTS wm_delete ON public.workflow_members;
CREATE POLICY wm_delete ON public.workflow_members FOR DELETE TO authenticated
  USING (public.can_manage_workflow(auth.uid(), workflow_id));

DROP POLICY IF EXISTS "Admins can read all workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can read own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can create own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can update own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Admins can delete workflows" ON public.workflows;

CREATE POLICY workflows_select ON public.workflows FOR SELECT TO authenticated
  USING (public.can_view_workflow(auth.uid(), id));
CREATE POLICY workflows_insert ON public.workflows FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY workflows_update ON public.workflows FOR UPDATE TO authenticated
  USING (public.can_manage_workflow(auth.uid(), id))
  WITH CHECK (public.can_manage_workflow(auth.uid(), id));
CREATE POLICY workflows_delete ON public.workflows FOR DELETE TO authenticated
  USING (public.can_manage_workflow(auth.uid(), id));

DO $$
DECLARE t text; edit_tables text[] := ARRAY[
  'workflow_personas','workflow_team_members','workflow_business_rules',
  'workflow_data_model','node_instance_configs'
];
BEGIN
  FOREACH t IN ARRAY edit_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can read %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can update %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can delete %1$s" ON public.%1$s', t);

    EXECUTE format('CREATE POLICY %1$s_select ON public.%1$s FOR SELECT TO authenticated USING (public.can_view_workflow(auth.uid(), workflow_id))', t);
    EXECUTE format('CREATE POLICY %1$s_insert ON public.%1$s FOR INSERT TO authenticated WITH CHECK (public.can_edit_workflow(auth.uid(), workflow_id))', t);
    EXECUTE format('CREATE POLICY %1$s_update ON public.%1$s FOR UPDATE TO authenticated USING (public.can_edit_workflow(auth.uid(), workflow_id)) WITH CHECK (public.can_edit_workflow(auth.uid(), workflow_id))', t);
    EXECUTE format('CREATE POLICY %1$s_delete ON public.%1$s FOR DELETE TO authenticated USING (public.can_edit_workflow(auth.uid(), workflow_id))', t);
  END LOOP;

  EXECUTE 'DROP POLICY IF EXISTS "Anyone can read workflow_deployments" ON public.workflow_deployments';
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can insert workflow_deployments" ON public.workflow_deployments';
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can update workflow_deployments" ON public.workflow_deployments';
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can delete workflow_deployments" ON public.workflow_deployments';
  EXECUTE 'CREATE POLICY workflow_deployments_select ON public.workflow_deployments FOR SELECT TO authenticated USING (public.can_view_workflow(auth.uid(), workflow_id))';
  EXECUTE 'CREATE POLICY workflow_deployments_insert ON public.workflow_deployments FOR INSERT TO authenticated WITH CHECK (public.can_manage_workflow(auth.uid(), workflow_id))';
  EXECUTE 'CREATE POLICY workflow_deployments_update ON public.workflow_deployments FOR UPDATE TO authenticated USING (public.can_manage_workflow(auth.uid(), workflow_id)) WITH CHECK (public.can_manage_workflow(auth.uid(), workflow_id))';
  EXECUTE 'CREATE POLICY workflow_deployments_delete ON public.workflow_deployments FOR DELETE TO authenticated USING (public.can_manage_workflow(auth.uid(), workflow_id))';

  EXECUTE 'DROP POLICY IF EXISTS "Anyone can read reusable_modules" ON public.reusable_modules';
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can insert reusable_modules" ON public.reusable_modules';
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can update reusable_modules" ON public.reusable_modules';
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can delete reusable_modules" ON public.reusable_modules';
  EXECUTE 'CREATE POLICY reusable_modules_select ON public.reusable_modules FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY reusable_modules_insert ON public.reusable_modules FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()))';
  EXECUTE 'CREATE POLICY reusable_modules_update ON public.reusable_modules FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()))';
  EXECUTE 'CREATE POLICY reusable_modules_delete ON public.reusable_modules FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()))';
END $$;
