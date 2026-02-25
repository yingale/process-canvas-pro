/**
 * Builder Agent – generates JSON Patch operations to modify workflows.
 */
import OpenAI from "openai";
import { TOOLS } from "./tools.js";

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a workflow builder agent. You take natural language instructions and generate precise RFC 6902 JSON Patch operations to modify a workflow Case IR.

## Case IR Schema
{
  "id": string, "name": string, "version": string,
  "trigger": { "type": "none"|"timer"|"message"|"signal"|"manual", "expression"?: string, "name"?: string },
  "stages": [{ "id": string, "name": string, "groups": [{ "id": string, "name": string, "steps": Step[] }] }],
  "alternativePaths": Stage[],
  "personas": [{ "id": string, "name": string, "role": string, "description"?: string, "permissions": string[] }],
  "teamMembers": [{ "id": string, "name": string, "email"?: string, "personaId"?: string, "department"?: string }],
  "businessRules": [{ "id": string, "name": string, "ruleType": "validation"|"routing"|"sla"|"condition", "expression": string }],
  "dataModel": [{ "id": string, "name": string, "dataType": "string"|"number"|"boolean"|"date"|"object"|"array", "required": boolean }],
  "deployment": { "targetEnvironment": string, "version": string, "status": "draft"|"staging"|"production" }
}

Step types: automation, user, decision (with branches), foreach, callActivity

## Patch Rules
- Use 0-based JSON Pointer paths
- To append use "-": /stages/-, /stages/0/groups/0/steps/-
- Always include id (short unique like "step_abc123"), type, name for new elements
- Never reuse existing IDs
- Generate IDs as step_XXXXX, stage_XXXXX, group_XXXXX, persona_XXXXX, rule_XXXXX, field_XXXXX (6 random chars)`;

export async function buildPatch(
  instruction: string,
  caseIr: unknown,
  analysisContext?: string
): Promise<{ patch: unknown[]; reasoning: string }> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (analysisContext) {
    messages.push({
      role: "system",
      content: `The Analyst agent provided this context:\n${analysisContext}`,
    });
  }

  messages.push({
    role: "user",
    content: `Current Case IR:\n\`\`\`json\n${JSON.stringify(caseIr, null, 2)}\n\`\`\`\n\nInstruction: ${instruction}`,
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools: [{
      type: "function",
      function: {
        name: TOOLS.generatePatch.name,
        description: TOOLS.generatePatch.description,
        parameters: TOOLS.generatePatch.parameters,
      },
    }],
    tool_choice: { type: "function", function: { name: "generate_patch" } },
    temperature: 0.1,
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const result = JSON.parse(toolCall.function.arguments);
    return { patch: result.patch ?? [], reasoning: result.reasoning ?? "" };
  }
  throw new Error("Builder agent failed to produce structured output");
}
