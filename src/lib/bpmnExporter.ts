/**
 * BPMN Exporter – Case IR → Camunda 7 BPMN 2.0 XML
 *
 * Strategy (priority order):
 * 1. If original diagram XML was captured on import, emit it verbatim → perfect round-trip.
 * 2. For new elements not in the original diagram, auto-generate layout positions.
 * 3. If no diagram at all (manually-built IR), generate a full auto-layout diagram.
 */
import type { CaseIR, Stage, Step, DecisionStep, ForeachStep, CallActivityStep } from "@/types/caseIr";

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

let _uidCounter = 0;
function uid(prefix = "el"): string {
  return `${prefix}_${(++_uidCounter).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function flattenSteps(stage: Stage): Step[] {
  return stage.groups.flatMap(g => g.steps);
}

// ─── Process XML renderers ────────────────────────────────────────────────────

function camundaAttrs(step: Step): string {
  const tech = step.tech ?? {};
  const parts: string[] = [];
  if (tech.topic) parts.push(`camunda:topic="${escapeXml(tech.topic)}"`);
  if (tech.asyncBefore) parts.push(`camunda:asyncBefore="true"`);
  if (tech.asyncAfter) parts.push(`camunda:asyncAfter="true"`);
  return parts.length ? " " + parts.join(" ") : "";
}

function camundaIoXml(step: Step, ind: string): string {
  const params = step.tech?.inputParameters ?? [];
  const outParams = step.tech?.outputParameters ?? [];
  if (!params.length && !outParams.length) return "";
  const ins = params.map(p => `${ind}      <camunda:inputParameter name="${escapeXml(p.name)}">${escapeXml(p.value ?? "")}</camunda:inputParameter>`).join("\n");
  const outs = outParams.map(p => `${ind}      <camunda:outputParameter name="${escapeXml(p.name)}">${escapeXml(p.value ?? "")}</camunda:outputParameter>`).join("\n");
  return `${ind}    <camunda:inputOutput>\n${[ins, outs].filter(Boolean).join("\n")}\n${ind}    </camunda:inputOutput>`;
}

function renderStepElement(step: Step, ind: string): string {
  const id = step.source?.bpmnElementId ?? step.id;
  const name = escapeXml(step.name);
  const io = camundaIoXml(step, ind);
  const docXml = step.description ? `${ind}  <documentation>${escapeXml(step.description)}</documentation>\n` : "";

  switch (step.type) {
    case "automation": {
      if (io || docXml) {
        return `${ind}<serviceTask id="${id}" name="${name}"${camundaAttrs(step)}>\n${docXml}${io ? `${ind}  <extensionElements>\n${io}\n${ind}  </extensionElements>\n` : ""}${ind}</serviceTask>`;
      }
      return `${ind}<serviceTask id="${id}" name="${name}"${camundaAttrs(step)} />`;
    }
    case "user": {
      const assignee = step.assignee ? ` camunda:assignee="${escapeXml(step.assignee)}"` : "";
      const grps = step.candidateGroups?.length ? ` camunda:candidateGroups="${step.candidateGroups.map(escapeXml).join(",")}"` : "";
      if (io || docXml) {
        return `${ind}<userTask id="${id}" name="${name}"${assignee}${grps}>\n${docXml}${io ? `${ind}  <extensionElements>\n${io}\n${ind}  </extensionElements>\n` : ""}${ind}</userTask>`;
      }
      return `${ind}<userTask id="${id}" name="${name}"${assignee}${grps} />`;
    }
    case "decision":
      return `${ind}<exclusiveGateway id="${id}" name="${name}" />`;
    case "foreach": {
      const fs = step as ForeachStep;
      const nestedXml = renderStepsChainXml(fs.steps, ind + "  ");
      const mi = `${ind}  <multiInstanceLoopCharacteristics isSequential="${fs.isSequential ?? false}" camunda:collection="${escapeXml(fs.collectionExpression)}" camunda:elementVariable="${escapeXml(fs.elementVariable)}" />`;
      return `${ind}<subProcess id="${id}" name="${name}">\n${mi}\n${nestedXml}\n${ind}</subProcess>`;
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
      const doc = step.description ? `\n${ind}  <documentation>${escapeXml(step.description)}</documentation>` : "";
      if (step.eventSubType === "message") {
        const msgId = uid("msg");
        return `${ind}<intermediateCatchEvent id="${evtId}" name="${name}">${doc}\n${ind}  <messageEventDefinition id="${msgId}" messageRef="${msgId}_ref" />\n${ind}</intermediateCatchEvent>`;
      }
      if (step.eventSubType === "timer" && step.timerExpression) {
        return `${ind}<intermediateCatchEvent id="${evtId}" name="${name}">${doc}\n${ind}  <timerEventDefinition>\n${ind}    <timeCycle xsi:type="tFormalExpression">${escapeXml(step.timerExpression)}</timeCycle>\n${ind}  </timerEventDefinition>\n${ind}</intermediateCatchEvent>`;
      }
      return `${ind}<intermediateCatchEvent id="${evtId}" name="${name}" />${doc ? `\n${ind}  ${doc.trim()}` : ""}`;
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
    const condTag = b.condition && b.condition !== "${default}"
      ? `\n${ind}  <conditionExpression xsi:type="tFormalExpression">${escapeXml(b.condition)}</conditionExpression>\n${ind}`
      : "";
    return `${ind}<sequenceFlow id="flow_gw_${gwId}_${i}" name="${escapeXml(b.label)}" sourceRef="${gwId}" targetRef="${target}">${condTag}</sequenceFlow>`;
  }).join("\n");
}

interface ChainIds { startId: string; endId: string; flowIds: string[]; }

function renderStepsChainXml(steps: Step[], ind: string, preIds?: ChainIds): string {
  const ids = preIds ?? {
    startId: uid("start"),
    endId: uid("end"),
    flowIds: Array.from({ length: steps.length + 1 }, () => uid("sf")),
  };
  const { startId, endId, flowIds } = ids;
  const lines: string[] = [];
  lines.push(`${ind}<startEvent id="${startId}" />`);
  steps.forEach(step => lines.push(renderStepElement(step, ind)));
  lines.push(`${ind}<endEvent id="${endId}" />`);

  const firstId = steps.length > 0 ? (steps[0].source?.bpmnElementId ?? steps[0].id) : endId;
  lines.push(`${ind}<sequenceFlow id="${flowIds[0]}" sourceRef="${startId}" targetRef="${firstId}" />`);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepId = step.source?.bpmnElementId ?? step.id;
    const nextStep = steps[i + 1];
    const nextId = nextStep ? (nextStep.source?.bpmnElementId ?? nextStep.id) : endId;
    if (step.type !== "decision") {
      lines.push(`${ind}<sequenceFlow id="${flowIds[i + 1]}" sourceRef="${stepId}" targetRef="${nextId}" />`);
    } else {
      lines.push(renderDecisionFlows(step, nextId !== endId ? nextId : null, endId, ind));
    }
  }
  return lines.join("\n");
}

function renderStageAsSubProcess(stage: Stage, preIds?: ChainIds): string {
  const id = stage.source?.bpmnElementId ?? stage.id;
  const name = escapeXml(stage.name);
  const asyncAttr = (stage as any).asyncBefore ? ` camunda:asyncBefore="true"` : "";
  const allSteps = flattenSteps(stage);

  // multi-instance (stored in tech of first group's first step or on stage itself)
  const miAttr = (stage as any).collectionExpression
    ? `\n      <multiInstanceLoopCharacteristics isSequential="${(stage as any).isSequential ?? false}" camunda:collection="${escapeXml((stage as any).collectionExpression)}" camunda:elementVariable="${escapeXml((stage as any).elementVariable ?? "item")}" />`
    : "";

  const innerContent = renderStepsChainXml(allSteps, "      ", preIds);
  return `    <subProcess id="${id}" name="${name}"${asyncAttr}>${miAttr}\n${innerContent}\n    </subProcess>`;
}

function renderTrigger(ir: CaseIR): { xml: string; id: string } {
  // Prefer the original start event ID captured during import for perfect round-trip
  const id = ir.metadata.originalStartEventId ?? `start_${ir.id}`;
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

// ─── Auto-layout (fallback when no original diagram) ─────────────────────────

const AL_START_W = 36; const AL_START_H = 36;
const AL_TASK_W = 120; const AL_TASK_H = 60;
const AL_EVT_W = 36;   const AL_EVT_H = 36;
const AL_GAP = 40;
const AL_MID_Y = 168;
const AL_SP_PAD = 40;
const AL_SP_H = 240;

interface AutoRect { id: string; x: number; y: number; w: number; h: number; expanded?: boolean; }
interface AutoEdge { flowId: string; points: { x: number; y: number }[]; }

function autoLayoutDiagram(ir: CaseIR, triggerId: string, topFlowIds: string[], endId: string, stagePreIds: Map<string, ChainIds>): { shapes: AutoRect[]; edges: AutoEdge[] } {
  const shapes: AutoRect[] = [];
  const edges: AutoEdge[] = [];
  let cx = 60;

  const mainChain: AutoRect[] = [];

  // trigger
  const ts: AutoRect = { id: triggerId, x: cx, y: AL_MID_Y - AL_START_H / 2, w: AL_START_W, h: AL_START_H };
  shapes.push(ts); mainChain.push(ts); cx += AL_START_W + AL_GAP;

  for (const stage of ir.stages) {
    const allSteps = flattenSteps(stage);
    if (isFlatStage(stage)) {
      for (const step of allSteps) {
        const sid = step.source?.bpmnElementId ?? step.id;
        const isEvt = step.type === "intermediateEvent";
        const w = isEvt ? AL_EVT_W : AL_TASK_W;
        const h = isEvt ? AL_EVT_H : AL_TASK_H;
        const s: AutoRect = { id: sid, x: cx, y: AL_MID_Y - h / 2, w, h };
        shapes.push(s); mainChain.push(s); cx += w + AL_GAP;
      }
    } else {
      const stageId = stage.source?.bpmnElementId ?? stage.id;
      const preIds = stagePreIds.get(stage.id);

      // inner width
      let iw = AL_SP_PAD + AL_START_W + AL_GAP;
      for (const step of allSteps) {
        iw += (step.type === "intermediateEvent" ? AL_EVT_W : AL_TASK_W) + AL_GAP;
      }
      iw += AL_START_W + AL_SP_PAD;
      const spW = Math.max(iw, 260);
      const spY = AL_MID_Y - AL_SP_H / 2;

      const sp: AutoRect = { id: stageId, x: cx, y: spY, w: spW, h: AL_SP_H, expanded: true };
      shapes.push(sp); mainChain.push(sp);

      // inner shapes
      if (preIds) {
        let icx = cx + AL_SP_PAD;
        const imid = spY + AL_SP_PAD + (AL_SP_H - AL_SP_PAD * 2) / 2;
        const innerChain: AutoRect[] = [];

        const is: AutoRect = { id: preIds.startId, x: icx, y: imid - AL_START_H / 2, w: AL_START_W, h: AL_START_H };
        shapes.push(is); innerChain.push(is); icx += AL_START_W + AL_GAP;

        for (const step of allSteps) {
          const sid = step.source?.bpmnElementId ?? step.id;
          const isEvt = step.type === "intermediateEvent";
          const w = isEvt ? AL_EVT_W : AL_TASK_W; const h = isEvt ? AL_EVT_H : AL_TASK_H;
          const s: AutoRect = { id: sid, x: icx, y: imid - h / 2, w, h };
          shapes.push(s); innerChain.push(s); icx += w + AL_GAP;
        }

        const ie: AutoRect = { id: preIds.endId, x: icx, y: imid - AL_START_H / 2, w: AL_START_W, h: AL_START_H };
        shapes.push(ie); innerChain.push(ie);

        for (let i = 0; i < innerChain.length - 1; i++) {
          const src = innerChain[i]; const tgt = innerChain[i + 1];
          edges.push({ flowId: preIds.flowIds[i] ?? uid("sf"), points: [{ x: src.x + src.w, y: src.y + src.h / 2 }, { x: tgt.x, y: tgt.y + tgt.h / 2 }] });
        }
      }
      cx += spW + AL_GAP;
    }
  }

  // end event
  const es: AutoRect = { id: endId, x: cx, y: AL_MID_Y - AL_START_H / 2, w: AL_START_W, h: AL_START_H };
  shapes.push(es); mainChain.push(es);

  // main lane edges
  for (let i = 0; i < mainChain.length - 1; i++) {
    const src = mainChain[i]; const tgt = mainChain[i + 1];
    edges.push({ flowId: topFlowIds[i] ?? uid("sf"), points: [{ x: src.x + src.w, y: src.y + src.h / 2 }, { x: tgt.x, y: tgt.y + tgt.h / 2 }] });
  }

  return { shapes, edges };
}

function renderAutoLayoutDiagram(processId: string, shapes: AutoRect[], edges: AutoEdge[]): string {
  const shapeXmls = shapes.map(s => {
    const exp = s.expanded ? ` isExpanded="true"` : "";
    return `    <bpmndi:BPMNShape id="Shape_${s.id}" bpmnElement="${s.id}"${exp}>\n      <dc:Bounds x="${Math.round(s.x)}" y="${Math.round(s.y)}" width="${Math.round(s.w)}" height="${Math.round(s.h)}" />\n    </bpmndi:BPMNShape>`;
  });
  const edgeXmls = edges.map((e, i) => {
    const wps = e.points.map(p => `      <di:waypoint x="${Math.round(p.x)}" y="${Math.round(p.y)}" />`).join("\n");
    return `    <bpmndi:BPMNEdge id="Edge_${i}_di" bpmnElement="${e.flowId}">\n${wps}\n    </bpmndi:BPMNEdge>`;
  });
  return `  <bpmndi:BPMNDiagram id="BPMNDiagram_1">\n    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">\n${shapeXmls.join("\n")}\n${edgeXmls.join("\n")}\n    </bpmndi:BPMNPlane>\n  </bpmndi:BPMNDiagram>`;
}

// ─── Definitions attributes builder ──────────────────────────────────────────

function buildDefinitionsTag(ir: CaseIR, processId: string): string {
  const orig = ir.metadata.originalDefinitionsAttrs;
  if (orig && Object.keys(orig).length > 0) {
    // Re-emit original attributes (preserves targetNamespace, id, etc.)
    // Always ensure required namespaces are present
    const required: Record<string, string> = {
      "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "xmlns:bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
      "xmlns:bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
      "xmlns:dc": "http://www.omg.org/spec/DD/20100524/DC",
      "xmlns:di": "http://www.omg.org/spec/DD/20100524/DI",
      "xmlns:camunda": "http://camunda.org/schema/1.0/bpmn",
    };
    const merged = { ...required, ...orig };
    // Remove the default xmlns if present (it conflicts with bpmn: prefix)
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
  const processId = ir.id;
  const processName = escapeXml(ir.name);

  // Use original IDs if available (import round-trip) else generate stable new ones
  const endId = ir.metadata.originalEndEventId ?? `end_${processId}`;
  const trigger = renderTrigger(ir);

  // Pre-generate inner chain IDs for subProcess stages
  // Prefer original IDs captured during import
  const stagePreIds = new Map<string, ChainIds>();
  for (const stage of ir.stages) {
    if (!isFlatStage(stage)) {
      const allSteps = flattenSteps(stage);
      const stageId = stage.source?.bpmnElementId ?? stage.id;
      const origInner = ir.metadata.originalSubProcessEventIds?.[stageId];
      stagePreIds.set(stage.id, origInner ?? {
        startId: uid("start"),
        endId: uid("end"),
        flowIds: Array.from({ length: allSteps.length + 1 }, () => uid("sf")),
      });
    }
  }

  // Build top-level element chain IDs
  const chainIds: string[] = [trigger.id];
  for (const stage of ir.stages) {
    const allSteps = flattenSteps(stage);
    if (isFlatStage(stage)) {
      for (const step of allSteps) chainIds.push(step.source?.bpmnElementId ?? step.id);
    } else {
      chainIds.push(stage.source?.bpmnElementId ?? stage.id);
    }
  }
  chainIds.push(endId);

  // Use original top-level flow IDs if available (perfect round-trip), else generate new ones
  const origTopFlows = ir.metadata.originalTopLevelFlowIds;
  const topFlowIds = origTopFlows && origTopFlows.length >= chainIds.length - 1
    ? origTopFlows
    : Array.from({ length: chainIds.length - 1 }, () => uid("sf"));

  // Build process body XML
  const bodyXmlParts: string[] = [];
  for (const stage of ir.stages) {
    const allSteps = flattenSteps(stage);
    if (isFlatStage(stage)) {
      const parts = allSteps.map(s => renderStepElement(s, "    "));
      if (parts.length) bodyXmlParts.push(parts.join("\n"));
    } else {
      bodyXmlParts.push(renderStageAsSubProcess(stage, stagePreIds.get(stage.id)));
    }
  }

  // Build top-level sequence flows preserving original source/target refs
  const origFlowRefs = ir.metadata.originalSequenceFlowIds ?? {};
  const topFlowXmls = chainIds.slice(0, -1).map((srcId, i) => {
    const flowId = topFlowIds[i];
    // If this flow ID existed in the original, use original source/target refs
    const origRef = origFlowRefs[flowId];
    const src = origRef?.sourceRef ?? srcId;
    const tgt = origRef?.targetRef ?? chainIds[i + 1];
    return `    <sequenceFlow id="${flowId}" sourceRef="${src}" targetRef="${tgt}" />`;
  });

  // ── Diagram section: use original if available, else auto-layout ────────────
  let diagramXml: string;
  if (ir.metadata.originalDiagramXml) {
    // Verbatim round-trip: the original diagram coordinates are preserved exactly
    diagramXml = `  ${ir.metadata.originalDiagramXml.trim()}`;
  } else {
    // Auto-generate layout for manually-built IRs
    const { shapes, edges } = autoLayoutDiagram(ir, trigger.id, topFlowIds, endId, stagePreIds);
    diagramXml = renderAutoLayoutDiagram(processId, shapes, edges);
  }

  const defsTag = buildDefinitionsTag(ir, processId);

  return `<?xml version="1.0" encoding="UTF-8"?>
${defsTag}

  <bpmn:process id="${processId}" name="${processName}" isExecutable="true">

${trigger.xml}

${bodyXmlParts.join("\n\n")}

    <bpmn:endEvent id="${endId}" />

${topFlowXmls.join("\n")}

  </bpmn:process>

${diagramXml}

</bpmn:definitions>`;
}
