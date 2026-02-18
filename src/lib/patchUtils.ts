/**
 * JSON Patch utilities wrapping fast-json-patch
 */
import { applyPatch, validate as validatePatch } from "fast-json-patch";
import type { CaseIR } from "@/types/caseIr";
import type { JsonPatch } from "@/types/caseIr";

export function applyCaseIRPatch(caseIr: CaseIR, patch: JsonPatch): CaseIR {
  // Deep clone to avoid mutation
  const clone = JSON.parse(JSON.stringify(caseIr)) as CaseIR;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const error = validatePatch(patch as any[], clone as any);
  if (error) {
    throw new Error(`Invalid patch: ${String(error)}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = applyPatch(clone as any, patch as any[], true, false);
  return result.newDocument as unknown as CaseIR;
}

/**
 * AI Plan (mock implementation – real AI needs Cloud/backend)
 * Returns plausible mock patches for common commands
 */
export function mockAiPlan(prompt: string, caseIr: CaseIR): { patch: JsonPatch; summary: string } {
  const lower = prompt.toLowerCase();

  // "add stage" pattern
  if (lower.includes("add stage")) {
    const match = prompt.match(/add stage[: ]+(.+)/i);
    const stageName = match?.[1]?.trim() ?? "New Stage";
    const newStage = {
      id: `stage_${Math.random().toString(36).slice(2, 8)}`,
      name: stageName,
      steps: [],
    };
    return {
      patch: [{ op: "add", path: `/stages/-`, value: newStage }],
      summary: `Added stage "${stageName}" at the end`,
    };
  }

  // "rename process" pattern
  if (lower.includes("rename process") || lower.includes("rename case")) {
    const match = prompt.match(/rename.*?to[: ]+(.+)/i);
    const newName = match?.[1]?.trim() ?? "Renamed Process";
    return {
      patch: [{ op: "replace", path: "/name", value: newName }],
      summary: `Renamed process to "${newName}"`,
    };
  }

  // "add step" pattern
  if (lower.includes("add step") || lower.includes("add task")) {
    const stageIdx = 0;
    const newStep = {
      id: `step_${Math.random().toString(36).slice(2, 8)}`,
      name: "New Step",
      type: "automation",
    };
    return {
      patch: [{ op: "add", path: `/stages/${stageIdx}/steps/-`, value: newStep }],
      summary: `Added automation step to stage 0`,
    };
  }

  // "set trigger" pattern
  if (lower.includes("timer trigger") || lower.includes("set trigger to timer")) {
    return {
      patch: [{ op: "replace", path: "/trigger", value: { type: "timer", expression: "0 0 * * *", name: "Daily Timer" } }],
      summary: "Set trigger to daily timer (0 0 * * *)",
    };
  }

  // Default: no-op patch with explanation
  return {
    patch: [],
    summary: `Could not parse intent from: "${prompt}". Try: "Add stage: Validation", "Add step to stage 0", "Rename process to X"`,
  };
}
