import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a BPMN 2.0 XML generator. Given a workflow description in plain English, you output valid, well-formed Camunda-compatible BPMN 2.0 XML.

## Output Rules
- Output ONLY raw XML. No markdown fences, no explanations, no comments before or after.
- The XML must be valid and parseable.

## Required Structure
Every output MUST include:
1. \`bpmn:definitions\` root element with these namespaces:
   - xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
   - xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
   - xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   - targetNamespace="http://example.com/bpmn"
2. Exactly one \`bpmn:process\` with isExecutable="true"
3. Exactly one \`bpmn:startEvent\` with a name
4. At least one \`bpmn:endEvent\` with a name
5. \`bpmn:sequenceFlow\` elements connecting ALL nodes in a valid graph (every node must have incoming/outgoing flows except start/end)

## Element Types to Use
- \`bpmn:serviceTask\` for automated tasks: include camunda:type="external" and camunda:topic="topicName"
- \`bpmn:userTask\` for human/manual tasks
- \`bpmn:exclusiveGateway\` for decisions/branches — use pairs (split + join) with conditionExpression on outgoing flows
- \`bpmn:subProcess\` with \`bpmn:multiInstanceLoopCharacteristics\` for loops/iterations
- \`bpmn:intermediateCatchEvent\` with \`bpmn:messageEventDefinition\` for wait states

## ID Conventions
- Process: "Process_1"
- Start event: "StartEvent_1"
- End events: "EndEvent_1", "EndEvent_2", etc.
- Tasks: "Task_ShortName" (e.g., "Task_ReviewInvoice")
- Gateways: "Gateway_ShortName" (e.g., "Gateway_ApprovalDecision")
- Sequence flows: "Flow_SourceToTarget" (e.g., "Flow_StartToReview")

## Decision/Branch Pattern
For exclusive gateways, always:
1. Create a split gateway with descriptive name
2. Create sequence flows from the gateway to each branch target
3. Add \`bpmn:conditionExpression\` on each conditional flow: \`<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">\${condition}</bpmn:conditionExpression>\`
4. Mark exactly one flow as the default (no condition)
5. Create a join gateway to merge branches back (unless branches end at different end events)

## Example Template
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  id="Definitions_1"
                  targetNamespace="http://example.com/bpmn">
  <bpmn:process id="Process_1" name="Sample Process" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="Task_DoWork" name="Do Work" camunda:type="external" camunda:topic="doWork">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_DoWork" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_DoWork" targetRef="EndEvent_1" />
  </bpmn:process>
</bpmn:definitions>

Now generate BPMN XML for the user's description.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { description } = await req.json();

    if (!description || typeof description !== "string" || description.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Please provide a workflow description (at least 5 characters)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          { role: "user", content: description.trim() },
        ],
        temperature: 0.2,
        max_tokens: 4096,
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
      throw new Error(`AI gateway error [${response.status}]`);
    }

    const aiResponse = await response.json();
    let bpmnXml = aiResponse.choices?.[0]?.message?.content ?? "";

    // Strip markdown fences if present
    bpmnXml = bpmnXml
      .replace(/^```(?:xml)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    // Basic validation: must contain bpmn:definitions
    if (!bpmnXml.includes("bpmn:definitions") && !bpmnXml.includes("<definitions")) {
      console.error("AI returned non-BPMN content:", bpmnXml.slice(0, 300));
      return new Response(
        JSON.stringify({ error: "AI failed to generate valid BPMN XML. Please try rephrasing your description." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ bpmnXml }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-bpmn error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
