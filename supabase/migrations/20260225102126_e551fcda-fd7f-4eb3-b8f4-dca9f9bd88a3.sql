
-- Workflow Personas
CREATE TABLE public.workflow_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read workflow_personas" ON public.workflow_personas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert workflow_personas" ON public.workflow_personas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update workflow_personas" ON public.workflow_personas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete workflow_personas" ON public.workflow_personas FOR DELETE USING (true);

-- Workflow Team Members
CREATE TABLE public.workflow_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  persona_id UUID REFERENCES public.workflow_personas(id) ON DELETE SET NULL,
  department TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read workflow_team_members" ON public.workflow_team_members FOR SELECT USING (true);
CREATE POLICY "Anyone can insert workflow_team_members" ON public.workflow_team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update workflow_team_members" ON public.workflow_team_members FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete workflow_team_members" ON public.workflow_team_members FOR DELETE USING (true);

-- Workflow Business Rules
CREATE TABLE public.workflow_business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'condition',
  expression TEXT DEFAULT '',
  description TEXT DEFAULT '',
  applies_to TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_business_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read workflow_business_rules" ON public.workflow_business_rules FOR SELECT USING (true);
CREATE POLICY "Anyone can insert workflow_business_rules" ON public.workflow_business_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update workflow_business_rules" ON public.workflow_business_rules FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete workflow_business_rules" ON public.workflow_business_rules FOR DELETE USING (true);

-- Workflow Data Model
CREATE TABLE public.workflow_data_model (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'string',
  required BOOLEAN NOT NULL DEFAULT false,
  default_value TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_data_model ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read workflow_data_model" ON public.workflow_data_model FOR SELECT USING (true);
CREATE POLICY "Anyone can insert workflow_data_model" ON public.workflow_data_model FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update workflow_data_model" ON public.workflow_data_model FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete workflow_data_model" ON public.workflow_data_model FOR DELETE USING (true);

-- Workflow Deployments
CREATE TABLE public.workflow_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  target_environment TEXT NOT NULL DEFAULT 'draft',
  version TEXT DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'draft',
  deployed_at TIMESTAMPTZ,
  deployed_by TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read workflow_deployments" ON public.workflow_deployments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert workflow_deployments" ON public.workflow_deployments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update workflow_deployments" ON public.workflow_deployments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete workflow_deployments" ON public.workflow_deployments FOR DELETE USING (true);

-- Reusable Modules (shared library)
CREATE TABLE public.reusable_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reusable_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reusable_modules" ON public.reusable_modules FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reusable_modules" ON public.reusable_modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reusable_modules" ON public.reusable_modules FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete reusable_modules" ON public.reusable_modules FOR DELETE USING (true);

-- Add updated_at triggers
CREATE TRIGGER update_workflow_personas_updated_at BEFORE UPDATE ON public.workflow_personas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workflow_team_members_updated_at BEFORE UPDATE ON public.workflow_team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workflow_business_rules_updated_at BEFORE UPDATE ON public.workflow_business_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workflow_data_model_updated_at BEFORE UPDATE ON public.workflow_data_model FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workflow_deployments_updated_at BEFORE UPDATE ON public.workflow_deployments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reusable_modules_updated_at BEFORE UPDATE ON public.reusable_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
