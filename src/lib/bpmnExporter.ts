/**
 * BPMN Exporter – converts Case IR → valid Camunda 7 compatible BPMN 2.0 XML
 * Generates proper sequence flows: startEvent → stages → endEvent
 * Each stage is a subProcess with its own startEvent → steps → endEvent chain
 */

import type { CaseIR, Stage, Step, DecisionStep, ForeachStep, CallActivityStep } from "@/types/caseIr";

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

let _uidCounter = 0;
function uid(prefix = "el"): string {
  return `${prefix}_${(++_uidCounter).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Camunda attribute helpers ────────────────────────────────────────────────

function camundaAttrs(step: Step): string {
  const tech = step.tech ?? {};
  const parts: string[] = [];
  if (tech.topic) parts.push(`camunda:topic="${escapeXml(tech.topic)}"`);
  if (tech.asyncBefore) parts.push(`camunda:asyncBefore="true"`);
  if (tech.asyncAfter) parts.push(`camunda:asyncAfter="true"`);
  return parts.length ? " " + parts.join(" ") : "";
}

// ─── Render individual step elements ─────────────────────────────────────────

function renderStepElement(step: Step, ind: string): string {
  const id = step.source?.bpmnElementId ?? step.id;
  const name = escapeXml(step.name);

  switch (step.type) {
    case "automation":
      return `${ind}<serviceTask id="${id}" name="${name}"${camundaAttrs(step)} />`;

    case "user": {
      const assignee = step.assignee ? ` camunda:assignee="${escapeXml(step.assignee)}"` : "";
      const groups = step.candidateGroups?.length
        ? ` camunda:candidateGroups="${step.candidateGroups.map(escapeXml).join(",")}"`
        : "";
      return `${ind}<userTask id="${id}" name="${name}"${assignee}${groups} />`;
    }

    case "decision":
      return `${ind}<exclusiveGateway id="${id}" name="${name}" />`;

    case "foreach": {
      const fs = step as ForeachStep;
      // Render nested steps inside the subProcess
      const nestedContent = renderStepsChain(fs.steps, ind + "  ");
      const mi = `${ind}  <multiInstanceLoopCharacteristics isSequential="${fs.isSequential ?? false}"
${ind}    camunda:collection="${escapeXml(fs.collectionExpression)}"
${ind}    camunda:elementVariable="${escapeXml(fs.elementVariable)}" />`;
      return `${ind}<subProcess id="${id}" name="${name}">
${mi}
${nestedContent}
${ind}</subProcess>`;
    }

    case "callActivity": {
      const cs = step as CallActivityStep;
      const inMaps = cs.inMappings ?? [];
      const outMaps = cs.outMappings ?? [];
      if (inMaps.length === 0 && outMaps.length === 0) {
        return `${ind}<callActivity id="${id}" name="${name}" calledElement="${escapeXml(cs.calledElement)}" />`;
      }
      const ins = inMaps.map(m => `${ind}    <camunda:in source="${escapeXml(m.source)}" target="${escapeXml(m.target)}" />`).join("\n");
      const outs = outMaps.map(m => `${ind}    <camunda:out source="${escapeXml(m.source)}" target="${escapeXml(m.target)}" />`).join("\n");
      return `${ind}<callActivity id="${id}" name="${name}" calledElement="${escapeXml(cs.calledElement)}">
${ind}  <extensionElements>
${ins}${outs}
${ind}  </extensionElements>
${ind}</callActivity>`;
    }
  }
}

// ─── Render decision branch sequence flows ────────────────────────────────────

function renderDecisionFlows(step: Step, nextId: string | null, endId: string, ind: string): string {
  if (step.type !== "decision") return "";
  const ds = step as DecisionStep;
  const gwId = step.source?.bpmnElementId ?? step.id;
  return ds.branches.map((b, i) => {
    const target = b.targetStepId ?? nextId ?? endId;
    const condTag = b.condition && b.condition !== "${default}"
      ? `\n${ind}  <conditionExpression xsi:type="tFormalExpression">${escapeXml(b.condition)}</conditionExpression>\n${ind}`
      : "";
    return `${ind}<sequenceFlow id="flow_gw_${gwId}_${i}" name="${escapeXml(b.label)}" sourceRef="${gwId}" targetRef="${target}">${condTag}</sequenceFlow>`;
  }).join("\n");
}

// ─── Render a chain of steps with proper sequence flows ───────────────────────
// Returns XML string with startEvent, step elements, endEvent, and all sequenceFlows

function renderStepsChain(steps: Step[], ind: string): string {
  const startId = uid("start");
  const endId = uid("end");
  const lines: string[] = [];

  lines.push(`${ind}<startEvent id="${startId}" />`);

  // Step elements
  steps.forEach(step => {
    lines.push(renderStepElement(step, ind));
  });

  lines.push(`${ind}<endEvent id="${endId}" />`);

  // Sequence flows
  // startEvent → first step (or endEvent if no steps)
  const firstId = steps.length > 0 ? (steps[0].source?.bpmnElementId ?? steps[0].id) : endId;
  lines.push(`${ind}<sequenceFlow id="${uid("sf")}" sourceRef="${startId}" targetRef="${firstId}" />`);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepId = step.source?.bpmnElementId ?? step.id;
    const nextStep = steps[i + 1];
    const nextId = nextStep ? (nextStep.source?.bpmnElementId ?? nextStep.id) : endId;

    if (step.type !== "decision") {
      // Normal sequential flow to next step
      lines.push(`${ind}<sequenceFlow id="${uid("sf")}" sourceRef="${stepId}" targetRef="${nextId}" />`);
    } else {
      // Decision gateway flows are generated from branches
      lines.push(renderDecisionFlows(step, nextId !== endId ? nextId : null, endId, ind));
      // Also add a default flow if no branch covers the next step
    }
  }

  return lines.join("\n");
}

// ─── Render a stage as a subProcess ──────────────────────────────────────────

function renderStage(stage: Stage): string {
  const id = stage.source?.bpmnElementId ?? stage.id;
  const name = escapeXml(stage.name);
  const innerContent = renderStepsChain(stage.steps, "      ");

  return `    <subProcess id="${id}" name="${name}">
${innerContent}
    </subProcess>`;
}

// ─── Render trigger / startEvent ─────────────────────────────────────────────

function renderTrigger(ir: CaseIR): { xml: string; id: string } {
  const id = `start_${ir.id}`;
  const name = ir.trigger.name ? ` name="${escapeXml(ir.trigger.name)}"` : "";

  switch (ir.trigger.type) {
    case "timer": {
      const expr = ir.trigger.expression ?? "";
      return {
        id,
        xml: `    <startEvent id="${id}"${name}>
      <timerEventDefinition>
        <timeCycle xsi:type="tFormalExpression">${escapeXml(expr)}</timeCycle>
      </timerEventDefinition>
    </startEvent>`,
      };
    }
    case "message":
      return {
        id,
        xml: `    <startEvent id="${id}"${name}>
      <messageEventDefinition />
    </startEvent>`,
      };
    case "signal":
      return {
        id,
        xml: `    <startEvent id="${id}"${name}>
      <signalEventDefinition />
    </startEvent>`,
      };
    default:
      return { id, xml: `    <startEvent id="${id}" />` };
  }
}

// ─── Main export function ─────────────────────────────────────────────────────

export function exportBpmn(ir: CaseIR): string {
  _uidCounter = 0; // reset counter for deterministic IDs per export

  const processId = ir.id;
  const processName = escapeXml(ir.name);
  const endId = `end_${processId}`;

  const trigger = renderTrigger(ir);
  const stagesXml = ir.stages.map(renderStage).join("\n\n");

  // Top-level sequence flows: startEvent → stage[0] → stage[1] → ... → endEvent
  const topFlows: string[] = [];

  if (ir.stages.length > 0) {
    const firstStageId = ir.stages[0].source?.bpmnElementId ?? ir.stages[0].id;
    topFlows.push(`    <sequenceFlow id="${uid("sf")}" sourceRef="${trigger.id}" targetRef="${firstStageId}" />`);

    for (let i = 0; i < ir.stages.length - 1; i++) {
      const src = ir.stages[i].source?.bpmnElementId ?? ir.stages[i].id;
      const tgt = ir.stages[i + 1].source?.bpmnElementId ?? ir.stages[i + 1].id;
      topFlows.push(`    <sequenceFlow id="${uid("sf")}" sourceRef="${src}" targetRef="${tgt}" />`);
    }

    const lastStageId = ir.stages[ir.stages.length - 1].source?.bpmnElementId ?? ir.stages[ir.stages.length - 1].id;
    topFlows.push(`    <sequenceFlow id="${uid("sf")}" sourceRef="${lastStageId}" targetRef="${endId}" />`);
  } else {
    // No stages — connect start directly to end
    topFlows.push(`    <sequenceFlow id="${uid("sf")}" sourceRef="${trigger.id}" targetRef="${endId}" />`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
             targetNamespace="http://bpmn.io/schema/bpmn"
             xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd">

  <process id="${processId}" name="${processName}" isExecutable="true">

${trigger.xml}

${stagesXml}

    <endEvent id="${endId}" />

${topFlows.join("\n")}

  </process>

</definitions>`;
}
