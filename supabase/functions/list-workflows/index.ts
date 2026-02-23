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

    // Validate sort column
    const allowedSortColumns = ["name", "updated_at", "owner", "type", "status", "created_at"];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "updated_at";
    const ascending = sortDir === "asc";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("workflows")
      .select("*", { count: "exact" });

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
