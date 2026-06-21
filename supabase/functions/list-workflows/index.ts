import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "5", 10);
    const search = url.searchParams.get("search") || "";
    const sortBy = url.searchParams.get("sortBy") || "updated_at";
    const sortDir = url.searchParams.get("sortDir") || "desc";
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";

    // Validate sort column
    const allowedSortColumns = ["name", "updated_at", "owner", "type", "status", "created_at"];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "updated_at";
    const ascending = sortDir === "asc";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!token) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    const email = authData.user.email ?? "";
    const { data: appRoles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (appRoles ?? []).some((row) => row.role === "admin");

    const { data: userPersonas } = await supabase.from("user_personas").select("persona_id").eq("user_id", userId);
    const personaIds = (userPersonas ?? []).map((row) => row.persona_id);
    let roleIds: string[] = [];
    if (personaIds.length > 0) {
      const { data: personaRoles } = await supabase.from("persona_roles").select("role_id").in("persona_id", personaIds);
      roleIds = (personaRoles ?? []).map((row) => row.role_id);
    }
    let permissionKeys: string[] = [];
    if (roleIds.length > 0) {
      const { data: rolePermissions } = await supabase.from("role_permissions").select("permissions(key)").in("role_id", roleIds);
      permissionKeys = (rolePermissions ?? []).map((row) => row.permissions?.key).filter(Boolean) as string[];
    }

    const canReadWorkflows = isAdmin || permissionKeys.includes("workflow.read") || permissionKeys.includes("workflow.*") || permissionKeys.includes("*");
    if (!canReadWorkflows) {
      return new Response(JSON.stringify({ error: "Workflow access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("workflows")
      .select("*", { count: "exact" });

    if (!isAdmin) {
      query = query.eq("owner", email);
    }

    if (search.trim()) {
      query = query.or(
        `name.ilike.%${search}%,owner.ilike.%${search}%,type.ilike.%${search}%,status.ilike.%${search}%`
      );
    }

    query = query.order(safeSortBy, { ascending }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        data,
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
