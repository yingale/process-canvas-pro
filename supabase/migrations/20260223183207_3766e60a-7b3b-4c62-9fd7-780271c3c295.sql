
-- Create workflows table
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT 'Unknown',
  type TEXT NOT NULL DEFAULT 'App Framework Name 1',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  bpmn_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required for now)
CREATE POLICY "Workflows are publicly readable"
  ON public.workflows FOR SELECT
  USING (true);

-- Public insert (for seeding/demo)
CREATE POLICY "Anyone can insert workflows"
  ON public.workflows FOR INSERT
  WITH CHECK (true);

-- Public update
CREATE POLICY "Anyone can update workflows"
  ON public.workflows FOR UPDATE
  USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sample data
INSERT INTO public.workflows (name, owner, type, status, updated_at) VALUES
  ('Workflow Example', 'James Stewart', 'App Framework Name 1', 'DRAFT', '2023-06-05'),
  ('Email Processing Flow', 'Mike Smith', 'App Framework Name 1', 'PUBLISHED', '2022-05-22'),
  ('Document Classifier', 'Lisa Lang', 'App Framework Name 1', 'ARCHIVED', '2021-03-08'),
  ('Customer Onboarding', 'James Stewart', 'App Framework Name 2', 'PUBLISHED', '2023-11-15'),
  ('Invoice Processor', 'Sarah Chen', 'App Framework Name 1', 'DRAFT', '2024-01-20'),
  ('Support Ticket Router', 'Mike Smith', 'App Framework Name 2', 'PUBLISHED', '2023-09-10'),
  ('Data Migration Pipeline', 'Lisa Lang', 'App Framework Name 1', 'ARCHIVED', '2022-07-14'),
  ('Report Generator', 'Sarah Chen', 'App Framework Name 2', 'DRAFT', '2024-02-01'),
  ('Approval Chain', 'James Stewart', 'App Framework Name 1', 'PUBLISHED', '2023-04-18'),
  ('Notification Dispatcher', 'Mike Smith', 'App Framework Name 1', 'DRAFT', '2024-03-05'),
  ('Compliance Checker', 'Lisa Lang', 'App Framework Name 2', 'ARCHIVED', '2021-12-22'),
  ('File Archiver', 'Sarah Chen', 'App Framework Name 1', 'PUBLISHED', '2023-08-30');
