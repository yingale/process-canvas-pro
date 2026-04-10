/**
 * BPMN Exporter – Case IR → Camunda 7 BPMN 2.0 XML
 *
 * Strategy (priority order):
 * 1. If original BPMN XML was captured on import → re-emit verbatim (perfect lossless round-trip).
 * 2. If no original XML (manually-built IR) → generate full XML with auto-layout diagram.
 */
import type { CaseIR, Stage, Step, DecisionStep, ForeachStep, CallActivityStep, IoParam } from "@/types/caseIr";

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

let _uidCounter = 0;
function uid(prefix = "el"): string {
  return `${prefix}_${(++_uidCounter).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function stepId(step: Step): string {
  return step.source?.bpmnElementId ?? step.id;
}

// ─── Collect all steps flat ───────────────────────────────────────────────────

function collectAllSteps(ir: CaseIR): Step[] {
  const steps: Step[] = [];
  for (const stage of ir.stages) {
    for (const group of stage.groups) {
      steps.push(...group.steps);
    }
  }
  if (ir.alternativePaths) {
    for (const alt of ir.alternativePaths) {
      for (const group of alt.groups) {
        steps.push(...group.steps);
      }
    }
  }
  return steps;
}

// ─── Process XML renderers ───────────────────────────────────────────────────

function camundaAttrs(step: Step): string {
  const tech = step.tech ?? {};
  const parts: string[] = [];
  if (tech.implementationType === "external") parts.push(`camunda:type="external"`);
  if (tech.topic) parts.push(`camunda:topic="${escapeXml(tech.topic)}"`);
  if (tech.asyncBefore) parts.push(`camunda:asyncBefore="true"`);
  if (tech.asyncAfter) parts.push(`camunda:asyncAfter="true"`);
  return parts.length ? " " + parts.join(" ") : "";
}

function moduleConfigToIoParams(step: Step): IoParam[] {
  if (!step.moduleRef?.instanceConfig) return [];
  return Object.entries(step.moduleRef.instanceConfig)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([name, value]) => ({ name, value: String(value) }));
}

function camundaIoXml(step: Step, ind: string): string {
  const moduleParams = moduleConfigToIoParams(step);
  const params = [...(step.tech?.inputParameters ?? []), ...moduleParams];
  const outParams = step.tech?.outputParameters ?? [];
  if (!params.length && !outParams.length) return "";
  const ins = params.map(p => `${ind}      <camunda:inputParameter name="${escapeXml(p.name)}">${escapeXml(p.value ?? "")}</camunda:inputParameter>`).join("\n");
  const outs = outParams.map(p => `${ind}      <camunda:outputParameter name="${escapeXml(p.name)}">${escapeXml(p.value ?? "")}</camunda:outputParameter>`).join("\n");
  return `${ind}    <camunda:inputOutput>\n${[ins, outs].filter(Boolean).join("\n")}\n${ind}    </camunda:inputOutput>`;
}

function renderStepElement(step: Step, ind: string): string {
  const id = stepId(step);
  const name = escapeXml(step.name);
  const io = camundaIoXml(step, ind);
  const docXml = step.description ? `${ind}  <bpmn:documentation>${escapeXml(step.description)}</bpmn:documentation>\n` : "";

  switch (step.type) {
    case "automation": {
      if (io || docXml) {
        return `${ind}<bpmn:serviceTask id="${id}" name="${name}"${camundaAttrs(step)}>\n${docXml}${io ? `${ind}  <bpmn:extensionElements>\n${io}\n${ind}  </bpmn:extensionElements>\n` : ""}${ind}</bpmn:serviceTask>`;
      }
      return `${ind}<bpmn:serviceTask id="${id}" name="${name}"${camundaAttrs(step)} />`;
    }
    case "user": {
      const assignee = step.assignee ? ` camunda:assignee="${escapeXml(step.assignee)}"` : "";
      const grps = step.candidateGroups?.length ? ` camunda:candidateGroups="${step.candidateGroups.map(escapeXml).join(",")}"` : "";
      if (io || docXml) {
        return `${ind}<bpmn:userTask id="${id}" name="${name}"${assignee}${grps}>\n${docXml}${io ? `${ind}  <bpmn:extensionElements>\n${io}\n${ind}  </bpmn:extensionElements>\n` : ""}${ind}</bpmn:userTask>`;
      }
      return `${ind}<bpmn:userTask id="${id}" name="${name}"${assignee}${grps} />`;
    }
    case "decision":
      return `${ind}<bpmn:exclusiveGateway id="${id}" name="${name}" />`;
    case "foreach": {
      const fs = step as ForeachStep;
      const nestedSteps = fs.steps ?? [];
      const nestedXml = renderFlatStepsXml(nestedSteps, ind + "  ");
      const mi = `${ind}  <bpmn:multiInstanceLoopCharacteristics isSequential="${fs.isSequential ?? false}" camunda:collection="${escapeXml(fs.collectionExpression)}" camunda:elementVariable="${escapeXml(fs.elementVariable)}" />`;
      return `${ind}<bpmn:subProcess id="${id}" name="${name}">\n${mi}\n${nestedXml}\n${ind}</bpmn:subProcess>`;
    }
    case "callActivity": {
      const cs = step as CallActivityStep;
      const inMaps = cs.inMappings ?? [];
      const outMaps = cs.outMappings ?? [];
      if (!inMaps.length && !outMaps.length) return `${ind}<bpmn:callActivity id="${id}" name="${name}" calledElement="${escapeXml(cs.calledElement)}" />`;
      const ins = inMaps.map(m => `${ind}    <camunda:in source="${escapeXml(m.source)}" target="${escapeXml(m.target)}" />`).join("\n");
      const outs = outMaps.map(m => `${ind}    <camunda:out source="${escapeXml(m.source)}" target="${escapeXml(m.target)}" />`).join("\n");
      return `${ind}<bpmn:callActivity id="${id}" name="${name}" calledElement="${escapeXml(cs.calledElement)}">\n${ind}  <bpmn:extensionElements>\n${ins}${outs ? "\n" + outs : ""}\n${ind}  </bpmn:extensionElements>\n${ind}</bpmn:callActivity>`;
    }
    case "intermediateEvent": {
      const evtId = stepId(step);
      const doc = step.description ? `\n${ind}  <bpmn:documentation>${escapeXml(step.description)}</bpmn:documentation>` : "";
      if (step.eventSubType === "message") {
        const msgId = uid("msg");
        return `${ind}<bpmn:intermediateCatchEvent id="${evtId}" name="${name}">${doc}\n${ind}  <bpmn:messageEventDefinition id="${msgId}" messageRef="${msgId}_ref" />\n${ind}</bpmn:intermediateCatchEvent>`;
      }
      if (step.eventSubType === "timer" && step.timerExpression) {
        return `${ind}<bpmn:intermediateCatchEvent id="${evtId}" name="${name}">${doc}\n${ind}  <bpmn:timerEventDefinition>\n${ind}    <bpmn:timeCycle xsi:type="tFormalExpression">${escapeXml(step.timerExpression)}</bpmn:timeCycle>\n${ind}  </bpmn:timerEventDefinition>\n${ind}</bpmn:intermediateCatchEvent>`;
      }
      return `${ind}<bpmn:intermediateCatchEvent id="${evtId}" name="${name}" />${doc ? `\n${ind}  ${doc.trim()}` : ""}`;
    }
    default:
      return `${ind}<bpmn:serviceTask id="${id}" name="${name}" />`;
  }
}

/** Render a flat list of steps with start/end events and sequence flows (used inside subprocesses) */
function renderFlatStepsXml(steps: Step[], ind: string): string {
  const startId = uid("start");
  const endId = uid("end");
  const lines: string[] = [];
  lines.push(`${ind}<bpmn:startEvent id="${startId}" />`);
  steps.forEach(step => lines.push(renderStepElement(step, ind)));
  lines.push(`${ind}<bpmn:endEvent id="${endId}" />`);

  const firstTarget = steps.length > 0 ? stepId(steps[0]) : endId;
  lines.push(`${ind}<bpmn:sequenceFlow id="${uid("sf")}" sourceRef="${startId}" targetRef="${firstTarget}" />`);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const sid = stepId(step);
    const nextTarget = i + 1 < steps.length ? stepId(steps[i + 1]) : endId;
    if (step.type === "decision") {
      const ds = step as DecisionStep;
      ds.branches.forEach((b, bi) => {
        const target = b.targetStepId ?? nextTarget;
        const cond = b.condition && b.condition !== "${default}"
          ? `\n${ind}  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(b.condition)}</bpmn:conditionExpression>\n${ind}`
          : "";
        lines.push(`${ind}<bpmn:sequenceFlow id="${uid("sf")}" name="${escapeXml(b.label)}" sourceRef="${sid}" targetRef="${target}">${cond}</bpmn:sequenceFlow>`);
      });
    } else {
      lines.push(`${ind}<bpmn:sequenceFlow id="${uid("sf")}" sourceRef="${sid}" targetRef="${nextTarget}" />`);
    }
  }
  return lines.join("\n");
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

function renderTrigger(ir: CaseIR): { xml: string; id: string } {
  const id = ir.metadata.originalStartEventId ?? `start_${ir.id}`;
  const name = ir.trigger.name ? ` name="${escapeXml(ir.trigger.name)}"` : "";
  const tech = ir.trigger.tech ?? {};
  const asyncAttrs = [
    tech.asyncBefore ? ` camunda:asyncBefore="true"` : "",
    tech.asyncAfter ? ` camunda:asyncAfter="true"` : "",
    tech.exclusive === false ? ` camunda:exclusive="false"` : "",
    tech.jobPriority ? ` camunda:jobPriority="${escapeXml(tech.jobPriority)}"` : "",
  ].join("");
  switch (ir.trigger.type) {
    case "timer": {
      const expr = ir.trigger.expression ?? "";
      return { id, xml: `    <bpmn:startEvent id="${id}"${name}${asyncAttrs}>\n      <bpmn:timerEventDefinition>\n        <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${escapeXml(expr)}</bpmn:timeCycle>\n      </bpmn:timerEventDefinition>\n    </bpmn:startEvent>` };
    }
    case "message": return { id, xml: `    <bpmn:startEvent id="${id}"${name}${asyncAttrs}>\n      <bpmn:messageEventDefinition />\n    </bpmn:startEvent>` };
    case "signal": return { id, xml: `    <bpmn:startEvent id="${id}"${name}${asyncAttrs}>\n      <bpmn:signalEventDefinition />\n    </bpmn:startEvent>` };
    default: return { id, xml: `    <bpmn:startEvent id="${id}"${asyncAttrs} />` };
  }
}

// ─── Auto-layout with gateway branching ───────────────────────────────────────

const AL_TASK_W = 120; const AL_TASK_H = 60;
const AL_GW_W = 50;    const AL_GW_H = 50;
const AL_EVT_W = 36;   const AL_EVT_H = 36;
const AL_GAP = 50;
const AL_MAIN_Y = 200;
const AL_ALT_Y = 400;

interface AutoRect { id: string; x: number; y: number; w: number; h: number; expanded?: boolean; }
interface AutoEdge { flowId: string; points: { x: number; y: number }[]; }

function stepDimensions(step: Step): { w: number; h: number } {
  if (step.type === "decision") return { w: AL_GW_W, h: AL_GW_H };
  if (step.type === "intermediateEvent") return { w: AL_EVT_W, h: AL_EVT_H };
  return { w: AL_TASK_W, h: AL_TASK_H };
}

// ─── Build definitions tag ────────────────────────────────────────────────────

function buildDefinitionsTag(ir: CaseIR, processId: string): string {
  const orig = ir.metadata.originalDefinitionsAttrs;
  if (orig && Object.keys(orig).length > 0) {
    const required: Record<string, string> = {
      "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "xmlns:bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
      "xmlns:bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
      "xmlns:dc": "http://www.omg.org/spec/DD/20100524/DC",
      "xmlns:di": "http://www.omg.org/spec/DD/20100524/DI",
      "xmlns:camunda": "http://camunda.org/schema/1.0/bpmn",
    };
    const merged = { ...required, ...orig };
    delete merged["xmlns"];
    const attrStr = Object.entries(merged).map(([k, v]) => `\n                  ${k}="${escapeXml(v)}"`).join("");
    return `<bpmn:definitions${attrStr}>`;
  }
  return `<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  id="Definitions_${processId}"
                  targetNamespace="http://bpmn.io/schema/bpmn">`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function exportBpmn(ir: CaseIR): string {
  _uidCounter = 0;

  // ── STRATEGY 1: Verbatim round-trip ─────────────────────────────────────────
  if (ir.metadata.originalBpmnXml) {
    return ir.metadata.originalBpmnXml;
  }

  // ── STRATEGY 2: Reconstruct from IR (new/manually-built workflows) ─────────
  const processId = ir.id;
  const processName = escapeXml(ir.name);
  const triggerId = ir.metadata.originalStartEventId ?? `start_${processId}`;
  const endId = ir.metadata.originalEndEventId ?? `end_${processId}`;
  const trigger = renderTrigger(ir);

  // Collect ALL steps (main + alternative) flat
  const allSteps = collectAllSteps(ir);

  // Build a set of all step IDs for target resolution
  const allStepIds = new Set(allSteps.map(s => stepId(s)));

  // Determine the linear chain order: main stages first, then alt paths
  const mainSteps: Step[] = [];
  for (const stage of ir.stages) {
    for (const group of stage.groups) {
      mainSteps.push(...group.steps);
    }
  }
  const altSteps: Step[] = [];
  if (ir.alternativePaths) {
    for (const alt of ir.alternativePaths) {
      for (const group of alt.groups) {
        altSteps.push(...group.steps);
      }
    }
  }

  // Render all step elements
  const stepElements = allSteps.map(s => renderStepElement(s, "    ")).join("\n\n");

  // Build sequence flows
  const flowLines: string[] = [];
  const flowMeta: { id: string; src: string; tgt: string }[] = []; // for diagram edges

  // Helper: get next step in a linear list, or endId
  function buildFlowsForList(steps: Step[], fallbackEndId: string) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const sid = stepId(step);
      const nextTarget = i + 1 < steps.length ? stepId(steps[i + 1]) : fallbackEndId;

      if (step.type === "decision") {
        const ds = step as DecisionStep;
        ds.branches.forEach((b) => {
          const target = b.targetStepId && allStepIds.has(b.targetStepId) ? b.targetStepId : nextTarget;
          const fid = uid("sf");
          const cond = b.condition && b.condition !== "${default}"
            ? `\n      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(b.condition)}</bpmn:conditionExpression>\n    `
            : "";
          flowLines.push(`    <bpmn:sequenceFlow id="${fid}" name="${escapeXml(b.label)}" sourceRef="${sid}" targetRef="${target}">${cond}</bpmn:sequenceFlow>`);
          flowMeta.push({ id: fid, src: sid, tgt: target });
        });
      } else {
        const fid = uid("sf");
        flowLines.push(`    <bpmn:sequenceFlow id="${fid}" sourceRef="${sid}" targetRef="${nextTarget}" />`);
        flowMeta.push({ id: fid, src: sid, tgt: nextTarget });
      }
    }
  }

  // Flow: trigger → first main step
  const triggerFlowId = uid("sf");
  const firstMainTarget = mainSteps.length > 0 ? stepId(mainSteps[0]) : endId;
  flowLines.push(`    <bpmn:sequenceFlow id="${triggerFlowId}" sourceRef="${triggerId}" targetRef="${firstMainTarget}" />`);
  flowMeta.push({ id: triggerFlowId, src: triggerId, tgt: firstMainTarget });

  // Main flow sequence flows (last non-decision step → endId)
  buildFlowsForList(mainSteps, endId);

  // Alt path sequence flows (last step → endId)
  buildFlowsForList(altSteps, endId);

  // ── Auto-layout diagram ────────────────────────────────────────────────────
  const shapes: AutoRect[] = [];
  const edges: AutoEdge[] = [];
  const posMap = new Map<string, AutoRect>();

  // Layout main flow horizontally
  let cx = 80;

  // Trigger
  const trigShape: AutoRect = { id: triggerId, x: cx, y: AL_MAIN_Y - AL_EVT_H / 2, w: AL_EVT_W, h: AL_EVT_H };
  shapes.push(trigShape);
  posMap.set(triggerId, trigShape);
  cx += AL_EVT_W + AL_GAP;

  // Main steps
  for (const step of mainSteps) {
    const sid = stepId(step);
    const dim = stepDimensions(step);
    const shape: AutoRect = { id: sid, x: cx, y: AL_MAIN_Y - dim.h / 2, w: dim.w, h: dim.h };
    shapes.push(shape);
    posMap.set(sid, shape);
    cx += dim.w + AL_GAP;
  }

  // End event
  const endShape: AutoRect = { id: endId, x: cx, y: AL_MAIN_Y - AL_EVT_H / 2, w: AL_EVT_W, h: AL_EVT_H };
  shapes.push(endShape);
  posMap.set(endId, endShape);

  // Alt path steps below
  let acx = 200;
  for (const step of altSteps) {
    const sid = stepId(step);
    const dim = stepDimensions(step);
    const shape: AutoRect = { id: sid, x: acx, y: AL_ALT_Y - dim.h / 2, w: dim.w, h: dim.h };
    shapes.push(shape);
    posMap.set(sid, shape);
    acx += dim.w + AL_GAP;
  }

  // Build edges from flowMeta
  for (const fm of flowMeta) {
    const src = posMap.get(fm.src);
    const tgt = posMap.get(fm.tgt);
    if (src && tgt) {
      const srcCx = src.x + src.w;
      const srcCy = src.y + src.h / 2;
      const tgtCx = tgt.x;
      const tgtCy = tgt.y + tgt.h / 2;

      // If target is below (alt path) or backwards, add waypoints
      if (Math.abs(srcCy - tgtCy) > 10 || tgtCx < srcCx) {
        const midX = (srcCx + tgtCx) / 2;
        edges.push({
          flowId: fm.id,
          points: [
            { x: srcCx, y: srcCy },
            { x: midX, y: srcCy },
            { x: midX, y: tgtCy },
            { x: tgtCx, y: tgtCy },
          ],
        });
      } else {
        edges.push({
          flowId: fm.id,
          points: [
            { x: srcCx, y: srcCy },
            { x: tgtCx, y: tgtCy },
          ],
        });
      }
    }
  }

  // Render diagram XML
  const shapeXmls = shapes.map(s => {
    return `    <bpmndi:BPMNShape id="Shape_${s.id}" bpmnElement="${s.id}">\n      <dc:Bounds x="${Math.round(s.x)}" y="${Math.round(s.y)}" width="${Math.round(s.w)}" height="${Math.round(s.h)}" />\n    </bpmndi:BPMNShape>`;
  });
  const edgeXmls = edges.map(e => {
    const wps = e.points.map(p => `      <di:waypoint x="${Math.round(p.x)}" y="${Math.round(p.y)}" />`).join("\n");
    return `    <bpmndi:BPMNEdge id="Edge_${e.flowId}" bpmnElement="${e.flowId}">\n${wps}\n    </bpmndi:BPMNEdge>`;
  });
  const diagramXml = `  <bpmndi:BPMNDiagram id="BPMNDiagram_1">\n    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">\n${shapeXmls.join("\n")}\n${edgeXmls.join("\n")}\n    </bpmndi:BPMNPlane>\n  </bpmndi:BPMNDiagram>`;

  const defsTag = buildDefinitionsTag(ir, processId);

  return `<?xml version="1.0" encoding="UTF-8"?>
${defsTag}

  <bpmn:process id="${processId}" name="${processName}" isExecutable="true">

${trigger.xml}

${stepElements}

    <bpmn:endEvent id="${endId}" />

${flowLines.join("\n")}

  </bpmn:process>

${diagramXml}

</bpmn:definitions>`;
}
