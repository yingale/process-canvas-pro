/**
 * Edge function proxy to the external Mastra multi-agent server.
 * Handles auth, CORS, and forwards requests.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MASTRA_SERVER_URL = Deno.env.get("MASTRA_SERVER_URL");
    if (!MASTRA_SERVER_URL) {
      throw new Error("MASTRA_SERVER_URL is not configured");
    }

    const MASTRA_API_SECRET = Deno.env.get("MASTRA_API_SECRET");
    if (!MASTRA_API_SECRET) {
      throw new Error("MASTRA_API_SECRET is not configured");
    }

    const { prompt, caseIr, mode } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!caseIr || typeof caseIr !== "object") {
      return new Response(
        JSON.stringify({ error: "caseIr is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`${MASTRA_SERVER_URL}/api/orchestrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MASTRA_API_SECRET}`,
      },
      body: JSON.stringify({ prompt, caseIr, mode }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mastra server error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Agent server error [${response.status}]` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("mastra-proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
