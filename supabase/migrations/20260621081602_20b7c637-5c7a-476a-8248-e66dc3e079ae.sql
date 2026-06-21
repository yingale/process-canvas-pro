
-- =========================================================
-- ENTERPRISE AUTHORIZATION PLATFORM — Phase 1 Schema
-- =========================================================

-- Reusable updated_at trigger already exists: public.update_updated_at_column()

-- ---------- ENUMS ----------
CREATE TYPE public.app_role AS ENUM ('admin', 'designer', 'reviewer', 'viewer');
CREATE TYPE public.user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE public.policy_effect AS ENUM ('ALLOW', 'DENY');
CREATE TYPE public.authz_decision AS ENUM ('ALLOW', 'DENY');

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status public.user_status NOT NULL DEFAULT 'ACTIVE',
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- user_roles (platform-level role gate)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- profiles policies ----------
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- =========================================================
-- teams
-- =========================================================
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read teams" ON public.teams
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage teams" ON public.teams
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- personas
-- =========================================================
CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personas TO authenticated;
GRANT ALL ON public.personas TO service_role;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_personas_updated_at BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read personas" ON public.personas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage personas" ON public.personas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- roles  (technical permission bundle)
-- =========================================================
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read roles" ON public.roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- permissions  (catalog)
-- =========================================================
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- resources registry
-- =========================================================
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  external_id TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_resources_updated_at BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read resources" ON public.resources
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage resources" ON public.resources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- policies (ABAC + Explicit DENY)
-- =========================================================
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  effect public.policy_effect NOT NULL,
  action TEXT NOT NULL,
  resource_pattern TEXT,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INT NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT true,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO authenticated;
GRANT ALL ON public.policies TO service_role;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_policies_updated_at BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read policies" ON public.policies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage policies" ON public.policies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Join tables
-- =========================================================
CREATE TABLE public.user_teams (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_teams TO authenticated;
GRANT ALL ON public.user_teams TO service_role;
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read user_teams" ON public.user_teams
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage user_teams" ON public.user_teams
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_personas (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, persona_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_personas TO authenticated;
GRANT ALL ON public.user_personas TO service_role;
ALTER TABLE public.user_personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read user_personas" ON public.user_personas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage user_personas" ON public.user_personas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.persona_roles (
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (persona_id, role_id)
);
GRANT SELECT, INSERT, DELETE ON public.persona_roles TO authenticated;
GRANT ALL ON public.persona_roles TO service_role;
ALTER TABLE public.persona_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read persona_roles" ON public.persona_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage persona_roles" ON public.persona_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);
GRANT SELECT, INSERT, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage role_permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- audit_events (append-only)
-- =========================================================
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  actor_email TEXT,
  actor_personas TEXT[] NOT NULL DEFAULT '{}',
  actor_teams TEXT[] NOT NULL DEFAULT '{}',
  resource_type TEXT,
  resource_id TEXT,
  action TEXT NOT NULL,
  decision public.authz_decision,
  reason TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Append-only: SELECT and INSERT only, no UPDATE/DELETE grants
GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_ts ON public.audit_events (ts DESC);
CREATE INDEX idx_audit_actor ON public.audit_events (actor_user_id);
CREATE INDEX idx_audit_action ON public.audit_events (action);
CREATE INDEX idx_audit_resource ON public.audit_events (resource_type, resource_id);

CREATE POLICY "Authenticated read audit" ON public.audit_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert audit" ON public.audit_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- =========================================================
-- handle_new_user trigger
-- First user becomes admin; subsequent users get viewer.
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- SEED DATA
-- =========================================================

-- Permissions catalog
INSERT INTO public.permissions (key, resource, action, description) VALUES
  -- Navigation
  ('navigation.view.dashboard',      'navigation', 'view.dashboard',      'View Dashboard'),
  ('navigation.view.workflowStudio', 'navigation', 'view.workflowStudio', 'View Workflow Studio'),
  ('navigation.view.templates',      'navigation', 'view.templates',      'View Templates'),
  ('navigation.view.instances',      'navigation', 'view.instances',      'View Workflow Instances'),
  ('navigation.view.audit',          'navigation', 'view.audit',          'View Audit Log'),
  ('navigation.view.admin',          'navigation', 'view.admin',          'View Admin Section'),
  -- Workflow
  ('workflow.create',         'workflow', 'create',         'Create workflow'),
  ('workflow.read',           'workflow', 'read',           'Read workflow'),
  ('workflow.update',         'workflow', 'update',         'Update workflow'),
  ('workflow.delete',         'workflow', 'delete',         'Delete workflow'),
  ('workflow.clone',          'workflow', 'clone',          'Clone workflow'),
  ('workflow.publish',        'workflow', 'publish',        'Publish workflow'),
  ('workflow.archive',        'workflow', 'archive',        'Archive workflow'),
  ('workflow.deploy.nonprod', 'workflow', 'deploy.nonprod', 'Deploy to non-prod'),
  ('workflow.deploy.prod',    'workflow', 'deploy.prod',    'Deploy to prod'),
  -- Workflow Instance
  ('workflowInstance.read',          'workflowInstance', 'read',          'Read instance'),
  ('workflowInstance.retry',         'workflowInstance', 'retry',         'Retry instance'),
  ('workflowInstance.restart',       'workflowInstance', 'restart',       'Restart instance'),
  ('workflowInstance.cancel',        'workflowInstance', 'cancel',        'Cancel instance'),
  ('workflowInstance.forceComplete', 'workflowInstance', 'forceComplete', 'Force complete instance'),
  -- Node
  ('node.add',     'node', 'add',     'Add node'),
  ('node.edit',    'node', 'edit',    'Edit node'),
  ('node.delete',  'node', 'delete',  'Delete node'),
  ('node.execute', 'node', 'execute', 'Execute node'),
  ('node.read',    'node', 'read',    'Read node'),
  -- Template
  ('template.create',  'template', 'create',  'Create template'),
  ('template.edit',    'template', 'edit',    'Edit template'),
  ('template.delete',  'template', 'delete',  'Delete template'),
  ('template.publish', 'template', 'publish', 'Publish template'),
  ('template.read',    'template', 'read',    'Read template'),
  -- User admin
  ('user.create',     'user', 'create',     'Create user'),
  ('user.read',       'user', 'read',       'Read users'),
  ('user.update',     'user', 'update',     'Update user'),
  ('user.delete',     'user', 'delete',     'Delete user'),
  ('persona.assign',  'user', 'persona.assign', 'Assign persona to user'),
  ('team.assign',     'user', 'team.assign',    'Assign team to user'),
  -- Team
  ('team.create', 'team', 'create', 'Create team'),
  ('team.update', 'team', 'update', 'Update team'),
  ('team.delete', 'team', 'delete', 'Delete team'),
  ('team.read',   'team', 'read',   'Read teams'),
  -- Persona admin
  ('persona.create', 'persona', 'create', 'Create persona'),
  ('persona.update', 'persona', 'update', 'Update persona'),
  ('persona.delete', 'persona', 'delete', 'Delete persona'),
  ('persona.read',   'persona', 'read',   'Read personas'),
  -- Role admin
  ('role.create', 'role', 'create', 'Create role'),
  ('role.update', 'role', 'update', 'Update role'),
  ('role.delete', 'role', 'delete', 'Delete role'),
  ('role.read',   'role', 'read',   'Read roles'),
  -- Policy admin
  ('policy.create', 'policy', 'create', 'Create policy'),
  ('policy.update', 'policy', 'update', 'Update policy'),
  ('policy.delete', 'policy', 'delete', 'Delete policy'),
  ('policy.read',   'policy', 'read',   'Read policies'),
  -- Audit
  ('audit.read',   'audit', 'read',   'Read audit log'),
  ('audit.export', 'audit', 'export', 'Export audit log');

-- Roles
INSERT INTO public.roles (name, description, is_system) VALUES
  ('Admin',    'Full platform control',                          true),
  ('Designer', 'Design and edit workflows',                      true),
  ('Reviewer', 'Review and approve workflow changes',            true),
  ('Viewer',   'Read-only access',                               true);

-- Personas
INSERT INTO public.personas (name, description) VALUES
  ('Platform Administrator', 'Full platform control'),
  ('Workflow Designer',      'Designs and builds workflows'),
  ('Workflow Reviewer',      'Reviews and approves workflows'),
  ('Read Only Auditor',      'Audits activity, read-only');

-- Default team
INSERT INTO public.teams (name, description) VALUES
  ('Default Team', 'Default organizational team');

-- Map personas → roles
INSERT INTO public.persona_roles (persona_id, role_id)
SELECT p.id, r.id FROM public.personas p, public.roles r
WHERE (p.name='Platform Administrator' AND r.name='Admin')
   OR (p.name='Workflow Designer'      AND r.name='Designer')
   OR (p.name='Workflow Reviewer'      AND r.name='Reviewer')
   OR (p.name='Read Only Auditor'      AND r.name='Viewer');

-- Map roles → permissions
-- Admin: every permission
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.name = 'Admin';

-- Designer: nav + workflow design + node + template read
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.key IN (
  'navigation.view.dashboard','navigation.view.workflowStudio','navigation.view.templates','navigation.view.instances',
  'workflow.create','workflow.read','workflow.update','workflow.clone','workflow.publish','workflow.deploy.nonprod',
  'workflowInstance.read',
  'node.add','node.edit','node.delete','node.read',
  'template.read','template.create','template.edit'
) WHERE r.name = 'Designer';

-- Reviewer: read + approve flows
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.key IN (
  'navigation.view.dashboard','navigation.view.workflowStudio','navigation.view.templates','navigation.view.instances','navigation.view.audit',
  'workflow.read','workflow.publish','workflow.deploy.nonprod','workflow.deploy.prod',
  'workflowInstance.read','workflowInstance.retry','workflowInstance.cancel',
  'node.read','template.read','audit.read'
) WHERE r.name = 'Reviewer';

-- Viewer: read-only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.key IN (
  'navigation.view.dashboard','navigation.view.workflowStudio','navigation.view.templates','navigation.view.instances',
  'workflow.read','workflowInstance.read','node.read','template.read'
) WHERE r.name = 'Viewer';
