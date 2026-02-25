/**
 * Analyst Agent – inspects workflows for bottlenecks, missing steps, and improvements.
 */
import OpenAI from "openai";
import { TOOLS } from "./tools.js";

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a senior workflow analyst. You examine business process workflows and identify:
- Bottlenecks and inefficiencies
- Missing steps or stages
- Naming inconsistencies
- Security or compliance gaps
- Performance optimization opportunities
- Structural improvements

You work with a JSON representation called "Case IR" that describes workflow stages, groups, steps, personas, business rules, and data models.

When analyzing, consider:
1. Are all steps properly named and typed?
2. Are there missing error handling or fallback paths?
3. Are personas and roles properly assigned?
4. Are business rules comprehensive?
5. Is the data model complete for the workflow needs?
6. Are there unnecessary sequential steps that could be parallelized?

Provide actionable, specific findings with severity levels.`;

export async function analyzeWorkflow(caseIr: unknown, focusArea?: string): Promise<unknown> {
  const userMessage = `Analyze this workflow:\n\`\`\`json\n${JSON.stringify(caseIr, null, 2)}\n\`\`\`${focusArea ? `\n\nFocus area: ${focusArea}` : ""}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    tools: [{
      type: "function",
      function: {
        name: TOOLS.analyzeWorkflow.name,
        description: TOOLS.analyzeWorkflow.description,
        parameters: TOOLS.analyzeWorkflow.parameters,
      },
    }],
    tool_choice: { type: "function", function: { name: "analyze_workflow" } },
    temperature: 0.3,
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  throw new Error("Analyst agent failed to produce structured output");
}
