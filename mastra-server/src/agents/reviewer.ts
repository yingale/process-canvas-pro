/**
 * Reviewer Agent – validates proposed patches for correctness and best practices.
 */
import OpenAI from "openai";
import { TOOLS } from "./tools.js";

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a workflow review agent. You validate proposed JSON Patch operations before they are applied to a workflow Case IR.

Check for:
1. **Path correctness**: Do the JSON Pointer paths reference valid locations in the Case IR?
2. **ID uniqueness**: Are new element IDs unique and not reusing existing ones?
3. **Required fields**: Do new elements include all required fields (id, name, type for steps, etc.)?
4. **Type validity**: Are step types valid (automation, user, decision, foreach, callActivity)?
5. **Structural integrity**: Will the patch leave the IR in a valid state?
6. **Best practices**: Does the change follow workflow design best practices?
7. **Naming**: Are names descriptive and consistent with existing naming patterns?

If issues are found, provide a corrected patch in revisedPatch.
Approve minor style issues with suggestions but don't block for them.`;

export async function reviewPatch(
  patch: unknown[],
  caseIr: unknown,
  originalInstruction: string
): Promise<{
  approved: boolean;
  issues: Array<{ severity: string; message: string; patchIndex?: number }>;
  suggestions: string[];
  revisedPatch?: unknown[];
  summary: string;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Original instruction: "${originalInstruction}"

Current Case IR:
\`\`\`json
${JSON.stringify(caseIr, null, 2)}
\`\`\`

Proposed patch:
\`\`\`json
${JSON.stringify(patch, null, 2)}
\`\`\`

Review these changes for correctness and best practices.`,
      },
    ],
    tools: [{
      type: "function",
      function: {
        name: TOOLS.reviewChanges.name,
        description: TOOLS.reviewChanges.description,
        parameters: TOOLS.reviewChanges.parameters,
      },
    }],
    tool_choice: { type: "function", function: { name: "review_changes" } },
    temperature: 0.2,
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  throw new Error("Reviewer agent failed to produce structured output");
}
