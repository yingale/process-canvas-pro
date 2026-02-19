/**
 * BPMN Exporter – Case IR → Camunda 7 BPMN 2.0 XML
 * Two-pass approach: collect layout model first, then emit process XML + bpmndi diagram.
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

// ─── Layout types ─────────────────────────────────────────────────────────────

interface Pt { x: number; y: number; }
interface ShapeInfo {
  bpmnElementId: string;
  x: number; y: number; w: number; h: number;
  isExpanded?: boolean;
}
interface EdgeInfo {
  sequenceFlowId: string;    // matches the <sequenceFlow id="..."> in process XML
  waypoints: Pt[];
}
interface ChainNode {
  id: string;                // bpmnElement id
  x: number; y: number;
  w: number; h: number;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const START_W = 36; const START_H = 36;
const TASK_W = 120; const TASK_H = 60;
const EVT_W = 36;   const EVT_H = 36;
const GW_W = 50;    const GW_H = 50;
const H_GAP = 40;
const MAIN_MID_Y = 168;      // vertical centre of the top-level process lane

// padding inside an expanded subProcess shape
const SP_PAD_LEFT = 40;
const SP_PAD_RIGHT = 40;
const SP_PAD_TOP = 40;
const SP_PAD_BOTTOM = 40;
const SP_MIN_W = 260;
const SP_MIN_H = 160;

// ─── Step element dimensions ──────────────────────────────────────────────────

function stepDims(step: Step): { w: number; h: number } {
  switch (step.type) {
    case "decision": return { w: GW_W, h: GW_H };
    case "intermediateEvent": return { w: EVT_W, h: EVT_H };
    default: return { w: TASK_W, h: TASK_H };
  }
}

// ─── Layout builder ───────────────────────────────────────────────────────────

interface LayoutResult {
  shapes: ShapeInfo[];
  edges: EdgeInfo[];
}

/**
 * Layout a linear chain of steps inside a container.
 * Returns shapes for inner start/end events and all steps, plus edges.
 * The caller owns the allocated pre-generated flow IDs.
 */
function layoutChain(
  steps: Step[],
  containerX: number,
  containerY: number,
  containerH: number,
  /** pre-generated sequenceFlow IDs for: start→steps[0], steps[0]→steps[1], ..., steps[n-1]→end */
  flowIds: string[],
  /** pre-generated element IDs for inner start and end events */
  innerStartId: string,
  innerEndId: string,
): LayoutResult {
  const shapes: ShapeInfo[] = [];
  const edges: EdgeInfo[] = [];

  const midY = containerY + SP_PAD_TOP + (containerH - SP_PAD_TOP - SP_PAD_BOTTOM) / 2;
  let cx = containerX + SP_PAD_LEFT;

  // inner start
  shapes.push({ bpmnElementId: innerStartId, x: cx, y: midY - START_H / 2, w: START_W, h: START_H });
  cx += START_W + H_GAP;

  const nodeChain: ChainNode[] = [{ id: innerStartId, x: shapes[0].x, y: midY - START_H / 2, w: START_W, h: START_H }];

  for (const step of steps) {
    const sid = step.source?.bpmnElementId ?? step.id;
    const { w, h } = stepDims(step);
    const sy = midY - h / 2;
    shapes.push({ bpmnElementId: sid, x: cx, y: sy, w, h });
    nodeChain.push({ id: sid, x: cx, y: sy, w, h });
    cx += w + H_GAP;
  }

  // inner end
  shapes.push({ bpmnElementId: innerEndId, x: cx, y: midY - START_H / 2, w: START_W, h: START_H });
  nodeChain.push({ id: innerEndId, x: cx, y: midY - START_H / 2, w: START_W, h: START_H });

  // edges between chain nodes
  for (let i = 0; i < nodeChain.length - 1; i++) {
    const src = nodeChain[i];
    const tgt = nodeChain[i + 1];
    const srcMid = src.y + src.h / 2;
    const tgtMid = tgt.y + tgt.h / 2;
    edges.push({
      sequenceFlowId: flowIds[i],
      waypoints: [
        { x: src.x + src.w, y: srcMid },
        { x: tgt.x, y: tgtMid },
      ],
    });
  }

  return { shapes, edges };
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
  const params = (step as any).inputParameters ?? [];
  const outParams = (step as any).outputParameters ?? [];
  if (!params.length && !outParams.length) return "";
  const ins = params.map((p: any) => `${ind}      <camunda:inputParameter name="${escapeXml(p.name)}">${escapeXml(p.value ?? "")}</camunda:inputParameter>`).join("\n");
  const outs = outParams.map((p: any) => `${ind}      <camunda:outputParameter name="${escapeXml(p.name)}">${escapeXml(p.value ?? "")}</camunda:outputParameter>`).join("\n");
  return `${ind}    <camunda:inputOutput>\n${[ins, outs].filter(Boolean).join("\n")}\n${ind}    </camunda:inputOutput>`;
}

function renderStepElement(step: Step, ind: string): string {
  const id = step.source?.bpmnElementId ?? step.id;
  const name = escapeXml(step.name);
  const io = camundaIoXml(step, ind);

  switch (step.type) {
    case "automation": {
      if (io) {
        return `${ind}<serviceTask id="${id}" name="${name}"${camundaAttrs(step)}>\n${ind}  <extensionElements>\n${io}\n${ind}  </extensionElements>\n${ind}</serviceTask>`;
      }
      return `${ind}<serviceTask id="${id}" name="${name}"${camundaAttrs(step)} />`;
    }
    case "user": {
      const assignee = step.assignee ? ` camunda:assignee="${escapeXml(step.assignee)}"` : "";
      const grps = step.candidateGroups?.length ? ` camunda:candidateGroups="${step.candidateGroups.map(escapeXml).join(",")}"` : "";
      if (io) {
        return `${ind}<userTask id="${id}" name="${name}"${assignee}${grps}>\n${ind}  <extensionElements>\n${io}\n${ind}  </extensionElements>\n${ind}</userTask>`;
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
      if (step.eventSubType === "message") {
        const msgId = uid("msg");
        return `${ind}<intermediateCatchEvent id="${evtId}" name="${name}">\n${ind}  <messageEventDefinition id="${msgId}" messageRef="${msgId}_ref" />\n${ind}</intermediateCatchEvent>`;
      }
      return `${ind}<intermediateCatchEvent id="${evtId}" name="${name}" />`;
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

/**
 * Render a linear steps chain as process XML.
 * Uses pre-generated IDs so layout pass can reuse the same IDs.
 */
function renderStepsChainXml(steps: Step[], ind: string,
  preIds?: { startId: string; endId: string; flowIds: string[] }
): string {
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

  // start → first (or end)
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

function renderStageAsSubProcess(stage: Stage,
  preIds?: { startId: string; endId: string; flowIds: string[] }
): string {
  const id = stage.source?.bpmnElementId ?? stage.id;
  const name = escapeXml(stage.name);
  const asyncAttr = (stage as any).asyncBefore ? ` camunda:asyncBefore="true"` : "";
  const allSteps = flattenSteps(stage);

  const miAttr = (stage as any).collectionExpression
    ? `\n      <multiInstanceLoopCharacteristics isSequential="${(stage as any).isSequential ?? false}" camunda:collection="${escapeXml((stage as any).collectionExpression)}" camunda:elementVariable="${escapeXml((stage as any).elementVariable ?? "item")}" />`
    : "";

  const innerContent = renderStepsChainXml(allSteps, "      ", preIds);
  return `    <subProcess id="${id}" name="${name}"${asyncAttr}>${miAttr}\n${innerContent}\n    </subProcess>`;
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

// ─── Main export ──────────────────────────────────────────────────────────────

export function exportBpmn(ir: CaseIR): string {
  _uidCounter = 0;
  const processId = ir.id;
  const processName = escapeXml(ir.name);
  const endId = `end_${processId}`;
  const trigger = renderTrigger(ir);

  // ── Step 1: Pre-generate IDs for all subProcess inner chains ─────────────
  // For each non-synthetic stage, pre-allocate startId, endId, and flowIds
  // so layout and XML emission share the same IDs.
  interface SubProcessIds { startId: string; endId: string; flowIds: string[]; }
  const stagePreIds = new Map<string, SubProcessIds>();

  for (const stage of ir.stages) {
    if (!isFlatStage(stage)) {
      const allSteps = flattenSteps(stage);
      stagePreIds.set(stage.id, {
        startId: uid("start"),
        endId: uid("end"),
        flowIds: Array.from({ length: allSteps.length + 1 }, () => uid("sf")),
      });
    }
  }

  // Pre-generate top-level flow IDs
  // chain: trigger → (flat steps or subProcesses) → endEvent
  const flatItems: { type: "flat" | "sub"; id: string; stageId?: string; stepIds?: string[] }[] = [];
  for (const stage of ir.stages) {
    const allSteps = flattenSteps(stage);
    if (isFlatStage(stage)) {
      const stepIds = allSteps.map(s => s.source?.bpmnElementId ?? s.id);
      if (stepIds.length > 0) flatItems.push({ type: "flat", id: stepIds[0], stepIds });
    } else {
      flatItems.push({ type: "sub", id: stage.source?.bpmnElementId ?? stage.id, stageId: stage.id });
    }
  }

  const chainIds: string[] = [trigger.id];
  for (const item of flatItems) {
    if (item.type === "flat" && item.stepIds) { for (const sid of item.stepIds) chainIds.push(sid); }
    else chainIds.push(item.id);
  }
  chainIds.push(endId);

  const topFlowIds: string[] = Array.from({ length: chainIds.length - 1 }, () => uid("sf"));

  // ── Step 2: Build process XML ──────────────────────────────────────────────
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

  const topFlowXmls: string[] = [];
  for (let i = 0; i < chainIds.length - 1; i++) {
    topFlowXmls.push(`    <sequenceFlow id="${topFlowIds[i]}" sourceRef="${chainIds[i]}" targetRef="${chainIds[i + 1]}" />`);
  }

  // ── Step 3: Build layout / diagram data ───────────────────────────────────
  const allShapes: ShapeInfo[] = [];
  const allEdges: EdgeInfo[] = [];

  let cx = 60;
  const mainMidY = MAIN_MID_Y;

  const mainChainNodes: { id: string; x: number; y: number; w: number; h: number }[] = [];

  // trigger shape
  const trigX = cx;
  const trigShape: ShapeInfo = { bpmnElementId: trigger.id, x: trigX, y: mainMidY - START_H / 2, w: START_W, h: START_H };
  allShapes.push(trigShape);
  mainChainNodes.push({ id: trigger.id, x: trigX, y: mainMidY - START_H / 2, w: START_W, h: START_H });
  cx += START_W + H_GAP;

  for (const item of flatItems) {
    if (item.type === "flat" && item.stepIds) {
      // find steps
      for (const stage of ir.stages) {
        if (!isFlatStage(stage)) continue;
        for (const g of stage.groups) {
          for (const step of g.steps) {
            const sid = step.source?.bpmnElementId ?? step.id;
            if (!item.stepIds.includes(sid)) continue;
            const { w, h } = stepDims(step);
            const sy = mainMidY - h / 2;
            allShapes.push({ bpmnElementId: sid, x: cx, y: sy, w, h });
            mainChainNodes.push({ id: sid, x: cx, y: sy, w, h });
            cx += w + H_GAP;
          }
        }
      }
    } else {
      // subProcess
      const stage = ir.stages.find(s => (s.source?.bpmnElementId ?? s.id) === item.id);
      const allSteps = stage ? flattenSteps(stage) : [];
      const preIds = item.stageId ? stagePreIds.get(item.stageId) : undefined;

      // Calculate inner width
      let innerW = SP_PAD_LEFT + START_W + H_GAP;
      for (const step of allSteps) {
        const { w } = stepDims(step);
        innerW += w + H_GAP;
      }
      innerW += START_W + SP_PAD_RIGHT;

      const subW = Math.max(innerW, SP_MIN_W);
      const subH = SP_MIN_H + SP_PAD_TOP + SP_PAD_BOTTOM;
      const subY = mainMidY - subH / 2;

      allShapes.push({ bpmnElementId: item.id, x: cx, y: subY, w: subW, h: subH, isExpanded: true });
      mainChainNodes.push({ id: item.id, x: cx, y: subY, w: subW, h: subH });

      // inner content layout
      if (preIds && stage) {
        const innerFlowIds = preIds.flowIds;
        const innerStartId = preIds.startId;
        const innerEndId = preIds.endId;
        const inner = layoutChain(allSteps, cx, subY, subH, innerFlowIds, innerStartId, innerEndId);
        for (const s of inner.shapes) allShapes.push(s);
        for (const e of inner.edges) allEdges.push(e);
      }

      cx += subW + H_GAP;
    }
  }

  // end event shape
  const endShape: ShapeInfo = { bpmnElementId: endId, x: cx, y: mainMidY - START_H / 2, w: START_W, h: START_H };
  allShapes.push(endShape);
  mainChainNodes.push({ id: endId, x: cx, y: mainMidY - START_H / 2, w: START_W, h: START_H });

  // main lane edges (using pre-generated topFlowIds)
  for (let i = 0; i < mainChainNodes.length - 1; i++) {
    const src = mainChainNodes[i];
    const tgt = mainChainNodes[i + 1];
    const srcMidY = src.y + src.h / 2;
    const tgtMidY = tgt.y + tgt.h / 2;
    allEdges.push({
      sequenceFlowId: topFlowIds[i],
      waypoints: [
        { x: src.x + src.w, y: srcMidY },
        { x: tgt.x, y: tgtMidY },
      ],
    });
  }

  // ── Step 4: Render bpmndi XML ─────────────────────────────────────────────
  const shapeXmls = allShapes.map(s => {
    const expanded = s.isExpanded ? ` isExpanded="true"` : "";
    return `    <bpmndi:BPMNShape id="Shape_${s.bpmnElementId}" bpmnElement="${s.bpmnElementId}"${expanded}>\n      <dc:Bounds x="${Math.round(s.x)}" y="${Math.round(s.y)}" width="${Math.round(s.w)}" height="${Math.round(s.h)}" />\n    </bpmndi:BPMNShape>`;
  });

  const edgeXmls = allEdges.map((e, i) => {
    const wps = e.waypoints.map(p => `      <di:waypoint x="${Math.round(p.x)}" y="${Math.round(p.y)}" />`).join("\n");
    return `    <bpmndi:BPMNEdge id="Edge_${i}_di" bpmnElement="${e.sequenceFlowId}">\n${wps}\n    </bpmndi:BPMNEdge>`;
  });

  const diagramXml = `  <bpmndi:BPMNDiagram id="BPMNDiagram_1">\n    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">\n${shapeXmls.join("\n")}\n${edgeXmls.join("\n")}\n    </bpmndi:BPMNPlane>\n  </bpmndi:BPMNDiagram>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  id="Definitions_${processId}"
                  targetNamespace="http://bpmn.io/schema/bpmn">

  <bpmn:process id="${processId}" name="${processName}" isExecutable="true">

${trigger.xml}

${bodyXmlParts.join("\n\n")}

    <bpmn:endEvent id="${endId}" />

${topFlowXmls.join("\n")}

  </bpmn:process>

${diagramXml}

</bpmn:definitions>`;
}
