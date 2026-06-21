import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthzContextValue, AuthzUser, PermissionKey, Policy } from "@/lib/authz/types";
import { authorize } from "@/lib/authz/authorize";

const Ctx = createContext<AuthzContextValue | null>(null);

export function AuthzProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthzUser | null>(null);
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [personas, setPersonas] = useState<Array<{ id: string; name: string }>>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const clearContext = useCallback(() => {
    setUser(null);
    setPermissions(new Set());
    setPersonas([]);
    setTeams([]);
    setRoles([]);
    setPolicies([]);
  }, []);

  const loadContext = useCallback(async (userId: string, email: string) => {
    // Profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id,email,name,status,attributes")
      .eq("id", userId)
      .maybeSingle();

    // App roles (platform-level)
    const { data: appRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    // Personas
    const { data: userPersonas } = await supabase
      .from("user_personas")
      .select("personas(id,name)")
      .eq("user_id", userId);

    const personaList = (userPersonas ?? [])
      .map(up => (up as { personas: { id: string; name: string } | null }).personas)
      .filter((p): p is { id: string; name: string } => !!p);

    // Teams
    const { data: userTeams } = await supabase
      .from("user_teams")
      .select("teams(id,name)")
      .eq("user_id", userId);
    const teamList = (userTeams ?? [])
      .map(ut => (ut as { teams: { id: string; name: string } | null }).teams)
      .filter((t): t is { id: string; name: string } => !!t);

    // Resolve roles → permissions
    const permSet = new Set<PermissionKey>();
    const roleList: Array<{ id: string; name: string }> = [];

    if (personaList.length > 0) {
      const personaIds = personaList.map(p => p.id);
      const { data: pr } = await supabase
        .from("persona_roles")
        .select("roles(id,name)")
        .in("persona_id", personaIds);
      const seen = new Set<string>();
      for (const row of pr ?? []) {
        const r = (row as { roles: { id: string; name: string } | null }).roles;
        if (r && !seen.has(r.id)) { seen.add(r.id); roleList.push(r); }
      }
      if (roleList.length > 0) {
        const { data: rp } = await supabase
          .from("role_permissions")
          .select("permissions(key)")
          .in("role_id", roleList.map(r => r.id));
        for (const row of rp ?? []) {
          const key = (row as { permissions: { key: string } | null }).permissions?.key;
          if (key) permSet.add(key);
        }
      }
    }

    // Platform admin bypass — admin role grants wildcard
    const appRoleNames = (appRoles ?? []).map(r => (r as { role: string }).role);
    if (appRoleNames.includes("admin")) {
      permSet.add("*");
    }

    // Policies
    const { data: pol } = await supabase
      .from("policies")
      .select("id,name,effect,action,resource_pattern,condition,priority,enabled");

    setUser({
      id: userId,
      email: profile?.email ?? email,
      name: profile?.name ?? null,
      status: (profile?.status as AuthzUser["status"]) ?? "ACTIVE",
      attributes: (profile?.attributes as Record<string, unknown>) ?? {},
      appRoles: appRoleNames,
    });
    setPermissions(permSet);
    setPersonas(personaList);
    setTeams(teamList);
    setRoles(roleList);
    setPolicies((pol ?? []) as Policy[]);
  }, []);

  const refresh = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) await loadContext(u.id, u.email ?? "");
    else clearContext();
  }, [clearContext, loadContext]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setLoading(true);
      clearContext();
      if (session?.user) {
        // Defer to avoid deadlock in Supabase listener
        setTimeout(async () => {
          await loadContext(session.user.id, session.user.email ?? "");
          if (mounted) setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) await loadContext(session.user.id, session.user.email ?? "");
      setLoading(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [clearContext, loadContext]);

  const value = useMemo<AuthzContextValue>(() => ({
    user, permissions, personas, teams, roles, loading,
    can: (action, resource) => {
      if (!user) return false;
      return authorize({ user, permissions, policies, action, resource }).allowed;
    },
    cannot: (action, resource) => {
      if (!user) return true;
      return !authorize({ user, permissions, policies, action, resource }).allowed;
    },
    refresh,
  }), [user, permissions, personas, teams, roles, policies, loading, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthz() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuthz must be used inside <AuthzProvider>");
  return ctx;
}
