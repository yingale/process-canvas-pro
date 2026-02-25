/**
 * Orchestrator Agent – routes user requests to the right agents
 * and coordinates multi-agent collaboration.
 *
 * Modes:
 * - "auto"    (default): Orchestrator decides which agents to use
 * - "build"   : Builder only (fast, no review)
 * - "analyze" : Analyst only
 * - "full"    : Analyst → Builder → Reviewer pipeline
 */
import OpenAI from "openai";
import { analyzeWorkflow } from "./analyst.js";
import { buildPatch } from "./builder.js";
import { reviewPatch } from "./reviewer.js";

const openai = new OpenAI();

interface OrchestrationResult {
  patch: unknown[];
  summary: string;
  analysis?: unknown;
  review?: unknown;
  agentsUsed: string[];
}

/** Classify the user's intent to decide which agents to invoke */
async function classifyIntent(prompt: string): Promise<"build" | "analyze" | "full"> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Classify the user's workflow request into one category:
- "analyze": User wants to understand, audit, review, or get suggestions about their workflow (e.g. "what's wrong", "find bottlenecks", "review my process", "suggest improvements")
- "build": Simple modification (e.g. "add a step", "rename stage", "set trigger to timer")
- "full": Complex change that benefits from analysis + building + review (e.g. "redesign the approval flow", "optimize the entire process", "add error handling everywhere")

Respond with ONLY the category word.`,
      },
      { role: "user", content: prompt },
    ],
    temperature: 0,
    max_tokens: 10,
  });

  const result = response.choices[0]?.message?.content?.trim().toLowerCase() ?? "build";
  if (result === "analyze" || result === "full") return result;
  return "build";
}

export async function orchestrate(
  prompt: string,
  caseIr: unknown,
  mode?: string
): Promise<OrchestrationResult> {
  const effectiveMode = mode ?? (await classifyIntent(prompt));
  const agentsUsed: string[] = ["orchestrator"];

  // ── Analyze-only mode ──
  if (effectiveMode === "analyze") {
    agentsUsed.push("analyst");
    const analysis = await analyzeWorkflow(caseIr, prompt);
    return {
      patch: [],
      summary: (analysis as any).summary ?? "Analysis complete.",
      analysis,
      agentsUsed,
    };
  }

  // ── Build-only mode (fast path) ──
  if (effectiveMode === "build") {
    agentsUsed.push("builder");
    const { patch, reasoning } = await buildPatch(prompt, caseIr);
    return {
      patch,
      summary: reasoning || "Changes applied.",
      agentsUsed,
    };
  }

  // ── Full pipeline: Analyst → Builder → Reviewer ──
  agentsUsed.push("analyst", "builder", "reviewer");

  // Step 1: Analyst examines the workflow
  const analysis = await analyzeWorkflow(caseIr, prompt);
  const analysisContext = JSON.stringify(analysis);

  // Step 2: Builder creates the patch with analyst context
  const { patch, reasoning } = await buildPatch(prompt, caseIr, analysisContext);

  if (patch.length === 0) {
    return {
      patch: [],
      summary: reasoning || "No changes needed based on the analysis.",
      analysis,
      agentsUsed,
    };
  }

  // Step 3: Reviewer validates the patch
  const review = await reviewPatch(patch, caseIr, prompt);

  // Use revised patch if reviewer provided corrections
  const finalPatch = review.approved ? patch : (review.revisedPatch ?? patch);
  const reviewNote = review.approved
    ? ""
    : ` (Reviewer made corrections: ${review.summary})`;

  return {
    patch: finalPatch,
    summary: `${reasoning}${reviewNote}`,
    analysis,
    review,
    agentsUsed,
  };
}
