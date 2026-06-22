
GRANT SELECT ON public.personas TO authenticated;
GRANT ALL ON public.personas TO service_role;

GRANT SELECT ON public.persona_roles TO authenticated;
GRANT ALL ON public.persona_roles TO service_role;

GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_personas TO authenticated;
GRANT ALL ON public.workflow_personas TO service_role;

GRANT SELECT ON public.user_personas TO authenticated;
GRANT ALL ON public.user_personas TO service_role;
