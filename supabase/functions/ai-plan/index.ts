import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an AI assistant for a BPMN Workflow Studio that converts natural-language editing instructions into RFC 6902 JSON Patch operations against a Case IR (Intermediate Representation) JSON document.

## Case IR Schema Overview

The Case IR has this top-level structure:
{
  "id": string,
  "name": string,
  "version": string,
  "trigger": { "type": "none"|"timer"|"message"|"signal"|"manual", "expression"?: string, "name"?: string },
  "stages": Stage[],
  "metadata": { "createdAt": string, "updatedAt": string }
}

A Stage looks like:
{
  "id": string,
  "name": string,
  "steps": Step[]
}

A Step is one of:
- { "id": string, "type": "automation", "name": string, "tech"?: { "topic"?: string, "asyncBefore"?: bool, "asyncAfter"?: bool } }
- { "id": string, "type": "user", "name": string, "assignee"?: string, "candidateGroups"?: string[] }
- { "id": string, "type": "decision", "name": string, "branches": [{ "id": string, "label": string, "condition": string }] }
- { "id": string, "type": "foreach", "name": string, "collectionExpression": string, "elementVariable": string, "steps": Step[] }
- { "id": string, "type": "callActivity", "name": string, "calledElement": string, "inMappings"?: [...], "outMappings"?: [...] }

## Your Task

Given:
1. A user's natural-language instruction
2. The current Case IR JSON

Produce a valid RFC 6902 JSON Patch array that implements the instruction.

## Rules

1. ONLY return a JSON object with two fields: "patch" (array of RFC 6902 operations) and "summary" (a short plain-English description of what was changed).
2. Use correct JSON Pointer paths (/stages/0/name, /stages/1/steps/2, etc.) – indices are 0-based.
3. To append to an array, use "-" as the last token: /stages/-
4. When adding a new step, always include: id (generate a short unique string like "step_abc123"), type, and name. Include required fields for the type (branches for decision, collectionExpression+elementVariable+steps for foreach, calledElement for callActivity).
5. When adding a new stage, always include: id, name, steps (empty array).
6. Never generate an "id" that already exists in the IR.
7. If the instruction is ambiguous, make a reasonable interpretation and note it in the summary.
8. If an operation is impossible (e.g. deleting a stage that doesn't exist), return an empty patch and explain in summary.
9. The "summary" should be concise (1-2 sentences) and describe exactly what changed.

## Output Format (STRICT)

Return ONLY valid JSON, no markdown, no code blocks, no explanation outside the JSON:
{
  "patch": [ ... RFC 6902 operations ... ],
  "summary": "Short description of changes"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { prompt, caseIr } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "prompt is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!caseIr || typeof caseIr !== "object") {
      return new Response(
        JSON.stringify({ error: "caseIr is required and must be an object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct user message with full Case IR context
    const userMessage = `Current Case IR:
\`\`\`json
${JSON.stringify(caseIr, null, 2)}
\`\`\`

Instruction: ${prompt}

Generate the JSON Patch operations to implement this instruction.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1, // Low temperature for precise JSON output
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error [${response.status}]: ${errorText.slice(0, 200)}`);
    }

    const aiResponse = await response.json();
    const rawContent = aiResponse.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if the model wrapped the JSON
    const cleaned = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let parsed: { patch: unknown[]; summary: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("AI returned non-JSON:", rawContent);
      return new Response(
        JSON.stringify({
          patch: [],
          summary: `AI returned an unparseable response. Raw: ${rawContent.slice(0, 200)}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic validation
    if (!Array.isArray(parsed.patch)) {
      parsed.patch = [];
      parsed.summary = "AI returned an invalid patch format (patch must be an array).";
    }

    return new Response(
      JSON.stringify({ patch: parsed.patch, summary: parsed.summary ?? "Patch applied." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-plan error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
