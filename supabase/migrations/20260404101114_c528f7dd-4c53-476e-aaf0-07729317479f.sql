
CREATE TABLE public.node_instance_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, step_id, node_id)
);

ALTER TABLE public.node_instance_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read node_instance_configs" ON public.node_instance_configs FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert node_instance_configs" ON public.node_instance_configs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update node_instance_configs" ON public.node_instance_configs FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete node_instance_configs" ON public.node_instance_configs FOR DELETE TO public USING (true);
