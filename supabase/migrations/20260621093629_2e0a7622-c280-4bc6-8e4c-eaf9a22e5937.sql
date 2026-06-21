DROP POLICY IF EXISTS "Workflows are publicly readable" ON public.workflows;
DROP POLICY IF EXISTS "Anyone can insert workflows" ON public.workflows;
DROP POLICY IF EXISTS "Anyone can update workflows" ON public.workflows;

CREATE POLICY "Admins can read all workflows"
ON public.workflows
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own workflows"
ON public.workflows
FOR SELECT
TO authenticated
USING (owner = COALESCE(auth.jwt() ->> 'email', ''));

CREATE POLICY "Users can create own workflows"
ON public.workflows
FOR INSERT
TO authenticated
WITH CHECK (owner = COALESCE(auth.jwt() ->> 'email', '') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own workflows"
ON public.workflows
FOR UPDATE
TO authenticated
USING (owner = COALESCE(auth.jwt() ->> 'email', '') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (owner = COALESCE(auth.jwt() ->> 'email', '') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete workflows"
ON public.workflows
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));