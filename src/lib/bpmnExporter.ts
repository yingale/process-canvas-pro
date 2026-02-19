/**
 * BPMN Exporter – Case IR → Camunda 7 BPMN 2.0 XML
 * Updated for Section → Groups → Steps: all steps from all groups are flattened per stage.
 */
import type { CaseIR, Stage, Step, DecisionStep, ForeachStep, CallActivityStep } from "@/types/caseIr";

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

let _uidCounter = 0;
function uid(prefix = "el"): string {
  return `${prefix}_${(++_uidCounter).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function camundaAttrs(step: Step): string {
  const tech = step.tech ?? {};
  const parts: string[] = [];
  if (tech.topic) parts.push(`camunda:topic="${escapeXml(tech.topic)}"`);
  if (tech.asyncBefore) parts.push(`camunda:asyncBefore="true"`);
  if (tech.asyncAfter) parts.push(`camunda:asyncAfter="true"`);
  return parts.length ? " " + parts.join(" ") : "";
}

/** Flatten all steps from all groups in a stage */
function flattenSteps(stage: Stage): Step[] {
  return stage.groups.flatMap(g => g.steps);
}

function renderStepElement(step: Step, ind: string): string {
  const id = step.source?.bpmnElementId ?? step.id;
  const name = escapeXml(step.name);

  switch (step.type) {
    case "automation":
      return `${ind}<serviceTask id="${id}" name="${name}"${camundaAttrs(step)} />`;
    case "user": {
      const assignee = step.assignee ? ` camunda:assignee="${escapeXml(step.assignee)}"` : "";
      const grps = step.candidateGroups?.length ? ` camunda:candidateGroups="${step.candidateGroups.map(escapeXml).join(",")}"` : "";
      return `${ind}<userTask id="${id}" name="${name}"${assignee}${grps} />`;
    }
    case "decision":
      return `${ind}<exclusiveGateway id="${id}" name="${name}" />`;
    case "foreach": {
      const fs = step as ForeachStep;
      const nestedContent = renderStepsChain(fs.steps, ind + "  ");
      const mi = `${ind}  <multiInstanceLoopCharacteristics isSequential="${fs.isSequential ?? false}"\n${ind}    camunda:collection="${escapeXml(fs.collectionExpression)}"\n${ind}    camunda:elementVariable="${escapeXml(fs.elementVariable)}" />`;
      return `${ind}<subProcess id="${id}" name="${name}">\n${mi}\n${nestedContent}\n${ind}</subProcess>`;
    }
    case "callActivity": {
      const cs = step as CallActivityStep;
      const inMaps = cs.inMappings ?? [];
      const outMaps = cs.outMappings ?? [];
      if (!inMaps.length && !outMaps.length) return `${ind}<callActivity id="${id}" name="${name}" calledElement="${escapeXml(cs.calledElement)}" />`;
      const ins = inMaps.map(m => `${ind}    <camunda:in source="${escapeXml(m.source)}" target="${escapeXml(m.target)}" />`).join("\n");
      const outs = outMaps.map(m => `${ind}    <camunda:out source="${escapeXml(m.source)}" target="${escapeXml(m.target)}" />`).join("\n");
      return `${ind}<callActivity id="${id}" name="${name}" calledElement="${escapeXml(cs.calledElement)}">\n${ind}  <extensionElements>\n${ins}${outs ? "\n" + outs : ""}\n${ind}  </extensionElements>\n${ind}</callActivity>`;
    }
    case "intermediateEvent": {
      const evtId = step.source?.bpmnElementId ?? step.id;
      const msgName = step.messageRef ? ` name="${escapeXml(step.messageRef)}"` : "";
      if (step.eventSubType === "message") {
        const msgId = uid("msg");
        return `${ind}<intermediateCatchEvent id="${evtId}" name="${name}">\n${ind}  <messageEventDefinition id="${msgId}" messageRef="${msgId}_ref" />\n${ind}</intermediateCatchEvent>`;
      }
      return `${ind}<intermediateCatchEvent id="${evtId}" name="${name}"${msgName} />`;
    }
    default:
      return `${ind}<serviceTask id="${id}" name="${name}" />`;
  }
}

function renderDecisionFlows(step: Step, nextId: string | null, endId: string, ind: string): string {
  if (step.type !== "decision") return "";
  const ds = step as DecisionStep;
  const gwId = step.source?.bpmnElementId ?? step.id;
  return ds.branches.map((b, i) => {
    const target = b.targetStepId ?? nextId ?? endId;
    const condTag = b.condition && b.condition !== "${default}" ? `\n${ind}  <conditionExpression xsi:type="tFormalExpression">${escapeXml(b.condition)}</conditionExpression>\n${ind}` : "";
    return `${ind}<sequenceFlow id="flow_gw_${gwId}_${i}" name="${escapeXml(b.label)}" sourceRef="${gwId}" targetRef="${target}">${condTag}</sequenceFlow>`;
  }).join("\n");
}

function renderStepsChain(steps: Step[], ind: string): string {
  const startId = uid("start");
  const endId = uid("end");
  const lines: string[] = [];
  lines.push(`${ind}<startEvent id="${startId}" />`);
  steps.forEach(step => lines.push(renderStepElement(step, ind)));
  lines.push(`${ind}<endEvent id="${endId}" />`);
  const firstId = steps.length > 0 ? (steps[0].source?.bpmnElementId ?? steps[0].id) : endId;
  lines.push(`${ind}<sequenceFlow id="${uid("sf")}" sourceRef="${startId}" targetRef="${firstId}" />`);
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepId = step.source?.bpmnElementId ?? step.id;
    const nextStep = steps[i + 1];
    const nextId = nextStep ? (nextStep.source?.bpmnElementId ?? nextStep.id) : endId;
    if (step.type !== "decision") {
      lines.push(`${ind}<sequenceFlow id="${uid("sf")}" sourceRef="${stepId}" targetRef="${nextId}" />`);
    } else {
      lines.push(renderDecisionFlows(step, nextId !== endId ? nextId : null, endId, ind));
    }
  }
  return lines.join("\n");
}

function renderStageAsSubProcess(stage: Stage, asyncBefore?: boolean): string {
  const id = stage.source?.bpmnElementId ?? stage.id;
  const name = escapeXml(stage.name);
  const asyncAttr = asyncBefore ? ` camunda:asyncBefore="true"` : "";
  const allSteps = flattenSteps(stage);
  const innerContent = renderStepsChain(allSteps, "      ");
  return `    <subProcess id="${id}" name="${name}"${asyncAttr}>\n${innerContent}\n    </subProcess>`;
}

function renderTrigger(ir: CaseIR): { xml: string; id: string } {
  const id = `start_${ir.id}`;
  const name = ir.trigger.name ? ` name="${escapeXml(ir.trigger.name)}"` : "";
  switch (ir.trigger.type) {
    case "timer": {
      const expr = ir.trigger.expression ?? "";
      return { id, xml: `    <startEvent id="${id}"${name}>\n      <timerEventDefinition>\n        <timeCycle xsi:type="tFormalExpression">${escapeXml(expr)}</timeCycle>\n      </timerEventDefinition>\n    </startEvent>` };
    }
    case "message": return { id, xml: `    <startEvent id="${id}"${name}>\n      <messageEventDefinition />\n    </startEvent>` };
    case "signal": return { id, xml: `    <startEvent id="${id}"${name}>\n      <signalEventDefinition />\n    </startEvent>` };
    default: return { id, xml: `    <startEvent id="${id}" />` };
  }
}

function isFlatStage(stage: Stage): boolean {
  return stage.source?.bpmnElementType === "synthetic";
}

interface FlowItem { type: "flat" | "subProcess"; id: string; xml: string; stepIds?: string[]; }

function buildFlowItems(ir: CaseIR): FlowItem[] {
  const items: FlowItem[] = [];
  for (const stage of ir.stages) {
    const allSteps = flattenSteps(stage);
    if (isFlatStage(stage)) {
      const stepXmls: string[] = [];
      const stepIds: string[] = [];
      for (const step of allSteps) {
        stepXmls.push(renderStepElement(step, "    "));
        stepIds.push(step.source?.bpmnElementId ?? step.id);
      }
      if (stepIds.length > 0) items.push({ type: "flat", id: stepIds[0], xml: stepXmls.join("\n"), stepIds });
    } else {
      items.push({ type: "subProcess", id: stage.source?.bpmnElementId ?? stage.id, xml: renderStageAsSubProcess(stage) });
    }
  }
  return items;
}

export function exportBpmn(ir: CaseIR): string {
  _uidCounter = 0;
  const processId = ir.id;
  const processName = escapeXml(ir.name);
  const endId = `end_${processId}`;
  const trigger = renderTrigger(ir);
  const flowItems = buildFlowItems(ir);
  const bodyXmlParts = flowItems.map(i => i.xml);
  const topFlows: string[] = [];

  if (flowItems.length === 0) {
    topFlows.push(`    <sequenceFlow id="${uid("sf")}" sourceRef="${trigger.id}" targetRef="${endId}" />`);
  } else {
    const chainIds: string[] = [trigger.id];
    for (const item of flowItems) {
      if (item.type === "flat" && item.stepIds?.length) { for (const sid of item.stepIds) chainIds.push(sid); }
      else chainIds.push(item.id);
    }
    chainIds.push(endId);
    for (let i = 0; i < chainIds.length - 1; i++) {
      topFlows.push(`    <sequenceFlow id="${uid("sf")}" sourceRef="${chainIds[i]}" targetRef="${chainIds[i + 1]}" />`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
             targetNamespace="http://bpmn.io/schema/bpmn"
             xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd">

  <process id="${processId}" name="${processName}" isExecutable="true">

${trigger.xml}

${bodyXmlParts.join("\n\n")}

    <endEvent id="${endId}" />

${topFlows.join("\n")}

  </process>

</definitions>`;
}
