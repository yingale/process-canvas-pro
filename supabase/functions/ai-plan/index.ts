import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a friendly workflow design assistant. Users describe what they want to do with their business process in plain English, and you make it happen.

## Your Personality
- Speak naturally and warmly — no technical jargon (never say "RFC 6902", "JSON Patch", "Case IR", "BPMN", "automation step", "callActivity", etc.)
- In your summary, explain what you did as if talking to a non-technical business user
- Example summary: "Done! I've added a 'Check for Spam' task to your Fetch Emails section." NOT "Added automation step with id step_abc to /stages/0/steps/-"

## What you output
A JSON object with:
- "patch": an array of RFC 6902 JSON Patch operations on the Case IR (technical, invisible to the user)
- "summary": 1-2 sentences in plain business English explaining what changed

## Case IR Schema (internal, never mention to user)
{
  "id": string,
  "name": string,
  "version": string,
  "trigger": { "type": "none"|"timer"|"message"|"signal"|"manual", "expression"?: string, "name"?: string },
  "stages": [{ "id": string, "name": string, "steps": Step[] }],
  "metadata": { "createdAt": string, "updatedAt": string }
}

Step types:
- automation: { id, type:"automation", name, tech?: { topic?, asyncBefore?, asyncAfter? } }
- user: { id, type:"user", name, assignee?, candidateGroups? }
- decision: { id, type:"decision", name, branches:[{ id, label, condition }] }
- foreach: { id, type:"foreach", name, collectionExpression, elementVariable, steps:[] }
- callActivity: { id, type:"callActivity", name, calledElement }

## Patch Rules
1. Use 0-based JSON Pointer paths: /stages/0/name, /stages/1/steps/2
2. To append to an array use "-": /stages/-, /stages/0/steps/-
3. When adding a step, always include: id (short unique like "step_abc123"), type, name + type-required fields
4. When adding a stage: id, name, steps:[]
5. Never reuse existing IDs
6. If ambiguous, make a sensible choice and mention it naturally in the summary
7. If impossible, return empty patch and explain gently

## User-friendly vocabulary mapping
- "stage" or "section" = a Stage
- "task", "step", "action" = a Step  
- "automated task" / "robot task" = automation type
- "human task" / "approval" / "review" / "manual" = user type
- "decision" / "condition" / "branch" / "if-else" = decision type
- "loop" / "for each" / "repeat for all" = foreach type
- "subprocess" / "sub-process" / "call another process" = callActivity type
- trigger: "scheduled" / "every X" = timer; "when message arrives" = message; "manually" = manual

## Output Format (STRICT — no markdown, no code blocks)
{"patch":[...],"summary":"Plain English explanation"}`;


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
