/**
 * BPMN Exporter – converts Case IR → Camunda 7 compatible BPMN XML
 */

import type { CaseIR, Stage, Step, DecisionStep, ForeachStep, CallActivityStep } from "@/types/caseIr";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function uid(prefix = "el"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function renderCamundaAttrs(step: Step): string {
  const tech = step.tech ?? {};
  const parts: string[] = [];
  if (tech.topic) parts.push(`camunda:topic="${escapeXml(tech.topic)}"`);
  if (tech.asyncBefore) parts.push(`camunda:asyncBefore="true"`);
  if (tech.asyncAfter) parts.push(`camunda:asyncAfter="true"`);
  return parts.length ? " " + parts.join(" ") : "";
}

function renderExtensions(step: Step): string {
  const tech = step.tech ?? {};
  if (!tech.callActivity?.inMappings?.length && !tech.callActivity?.outMappings?.length) return "";
  const ins = (tech.callActivity?.inMappings ?? [])
    .map(m => `      <camunda:in source="${escapeXml(m.source)}" target="${escapeXml(m.target)}" />`)
    .join("\n");
  const outs = (tech.callActivity?.outMappings ?? [])
    .map(m => `      <camunda:out source="${escapeXml(m.source)}" target="${escapeXml(m.target)}" />`)
    .join("\n");
  return `    <extensionElements>\n${ins}${outs}\n    </extensionElements>`;
}

function renderMultiInstance(step: ForeachStep): string {
  return `    <multiInstanceLoopCharacteristics isSequential="${step.isSequential ?? false}"
      camunda:collection="${escapeXml(step.collectionExpression)}"
      camunda:elementVariable="${escapeXml(step.elementVariable)}">
    </multiInstanceLoopCharacteristics>`;
}

function renderStep(step: Step, indent = "    "): { xml: string; flows: string[] } {
  const id = step.source?.bpmnElementId ?? uid();
  const name = escapeXml(step.name);
  const flows: string[] = [];

  switch (step.type) {
    case "automation": {
      const attrs = renderCamundaAttrs(step);
      return {
        xml: `${indent}<serviceTask id="${id}" name="${name}"${attrs} />`,
        flows,
      };
    }

    case "user": {
      const assignee = step.assignee ? ` camunda:assignee="${escapeXml(step.assignee)}"` : "";
      const candidates = step.candidateGroups?.length
        ? ` camunda:candidateGroups="${step.candidateGroups.map(escapeXml).join(",")}"`
        : "";
      return {
        xml: `${indent}<userTask id="${id}" name="${name}"${assignee}${candidates} />`,
        flows,
      };
    }

    case "decision": {
      const gwId = id;
      const branches = (step as DecisionStep).branches.map(b => {
        const flowId = `flow_${b.id}`;
        const targetId = b.targetStepId ?? uid("end");
        flows.push(
          `${indent}<sequenceFlow id="${flowId}" name="${escapeXml(b.label)}" sourceRef="${gwId}" targetRef="${targetId}">
${indent}  <conditionExpression xsi:type="tFormalExpression">${escapeXml(b.condition)}</conditionExpression>
${indent}</sequenceFlow>`
        );
        return b;
      });
      void branches;
      return {
        xml: `${indent}<exclusiveGateway id="${gwId}" name="${name}" />`,
        flows,
      };
    }

    case "foreach": {
      const fStep = step as ForeachStep;
      const nestedXml = fStep.steps.map(s => renderStep(s, indent + "  ").xml).join("\n");
      return {
        xml: `${indent}<subProcess id="${id}" name="${name}">\n${renderMultiInstance(fStep)}\n${nestedXml}\n${indent}</subProcess>`,
        flows,
      };
    }

    case "callActivity": {
      const cStep = step as CallActivityStep;
      const ext = renderExtensions(step);
      const inner = ext ? `\n${ext}\n${indent}` : " /";
      return {
        xml: `${indent}<callActivity id="${id}" name="${name}" calledElement="${escapeXml(cStep.calledElement)}"${inner}>`,
        flows,
      };
    }
  }
}

function renderStage(stage: Stage): string {
  const id = stage.source?.bpmnElementId ?? uid("stage");
  const name = escapeXml(stage.name);
  const allFlows: string[] = [];

  const stepsXml = stage.steps.map(step => {
    const { xml, flows } = renderStep(step, "      ");
    allFlows.push(...flows);
    return xml;
  }).join("\n");

  // Generate linear sequence flows between steps
  for (let i = 0; i < stage.steps.length - 1; i++) {
    const src = stage.steps[i].source?.bpmnElementId ?? stage.steps[i].id;
    const tgt = stage.steps[i + 1].source?.bpmnElementId ?? stage.steps[i + 1].id;
    allFlows.push(`      <sequenceFlow id="flow_${src}_${tgt}" sourceRef="${src}" targetRef="${tgt}" />`);
  }

  return `    <subProcess id="${id}" name="${name}">
      <startEvent id="${id}_start" />
${stepsXml}
      <endEvent id="${id}_end" />
${allFlows.join("\n")}
    </subProcess>`;
}

function renderTrigger(ir: CaseIR): string {
  const { trigger } = ir;
  const id = `start_${ir.id}`;
  switch (trigger.type) {
    case "timer":
      return `    <startEvent id="${id}" name="${escapeXml(trigger.name ?? "Timer Start")}">
      <timerEventDefinition>
        <timeCycle>${escapeXml(trigger.expression ?? "")}</timeCycle>
      </timerEventDefinition>
    </startEvent>`;
    case "message":
      return `    <startEvent id="${id}" name="${escapeXml(trigger.name ?? "Message Start")}">
      <messageEventDefinition />
    </startEvent>`;
    default:
      return `    <startEvent id="${id}" />`;
  }
}

export function exportBpmn(ir: CaseIR): string {
  const processId = ir.id;
  const processName = escapeXml(ir.name);

  // Build inter-stage sequence flows
  const stageFlows: string[] = [];
  for (let i = 0; i < ir.stages.length - 1; i++) {
    const src = ir.stages[i].source?.bpmnElementId ?? ir.stages[i].id;
    const tgt = ir.stages[i + 1].source?.bpmnElementId ?? ir.stages[i + 1].id;
    stageFlows.push(`    <sequenceFlow id="flow_stage_${i}" sourceRef="${src}" targetRef="${tgt}" />`);
  }

  const stagesXml = ir.stages.map(renderStage).join("\n\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
             xmlns:activiti="http://activiti.org/bpmn"
             targetNamespace="http://bpmn.io/schema/bpmn"
             xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd">

  <process id="${processId}" name="${processName}" isExecutable="true">

${renderTrigger(ir)}

${stagesXml}

    <endEvent id="end_${processId}" />

${stageFlows.join("\n")}

  </process>

</definitions>`;
}
