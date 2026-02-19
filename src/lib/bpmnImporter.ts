/**
 * BPMN Importer – converts BPMN 2.0 XML → Case IR
 * Supports Camunda 7 extension elements.
 * Handles BOTH flat processes (tasks only) AND mixed processes
 * (top-level tasks interleaved with subProcesses).
 *
 * Strategy:
 *  1. Walk the top-level children of <process> in document order.
 *  2. Collect consecutive "task-like" elements into a synthetic stage.
 *  3. Treat every <subProcess> as its own stage (with its inner tasks).
 *  4. Result: one stage per contiguous group of flat tasks + one per subProcess.
 */

import type {
  CaseIR, Stage, Step, AutomationStep, UserStep, DecisionStep,
  ForeachStep, CallActivityStep, Trigger, ImportResult, Camunda7Tech, DecisionBranch,
} from "@/types/caseIr";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return `ir_${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

function attr(el: Element, name: string): string | undefined {
  return el.getAttribute(name) ?? undefined;
}

function childrenByLocalName(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter(c => localName(c) === tag);
}

function firstChildByLocalName(el: Element, tag: string): Element | undefined {
  return childrenByLocalName(el, tag)[0];
}

function localName(el: Element): string {
  return el.localName ?? el.tagName.split(":")[1];
}

function textContent(el: Element | undefined): string {
  return el?.textContent?.trim() ?? "";
}

// ─── Parse Camunda extensions ─────────────────────────────────────────────────

function parseCamundaExtensions(el: Element): Camunda7Tech {
  const tech: Camunda7Tech = {};

  const topic = attr(el, "camunda:topic") ?? attr(el, "topic");
  if (topic) tech.topic = topic;

  const asyncBefore = attr(el, "camunda:asyncBefore") ?? attr(el, "flowable:asyncBefore");
  if (asyncBefore === "true") tech.asyncBefore = true;

  const asyncAfter = attr(el, "camunda:asyncAfter") ?? attr(el, "flowable:asyncAfter");
  if (asyncAfter === "true") tech.asyncAfter = true;

  // Multi-instance
  const miEl = firstChildByLocalName(el, "multiInstanceLoopCharacteristics");
  if (miEl) {
    const loopCardinality = firstChildByLocalName(miEl, "loopCardinality");
    const completionCondition = firstChildByLocalName(miEl, "completionCondition");
    const collectionEl = miEl.getAttribute("camunda:collection") ?? miEl.getAttribute("collection") ?? "";
    const elementVar = miEl.getAttribute("camunda:elementVariable") ?? miEl.getAttribute("elementVariable") ?? "";
    tech.multiInstance = {
      isSequential: miEl.getAttribute("isSequential") === "true",
      collectionExpression: collectionEl || textContent(loopCardinality),
      elementVariable: elementVar,
      completionCondition: textContent(completionCondition) || undefined,
    };
  }

  return Object.keys(tech).length > 0 ? tech : {};
}

// ─── Parse a single flow element into a Step ─────────────────────────────────

// Tags that are "task-like" at the top level (i.e. map to Step types)
const TASK_LIKE_TAGS = new Set([
  "serviceTask", "scriptTask", "sendTask", "receiveTask", "businessRuleTask",
  "userTask", "manualTask",
  "exclusiveGateway", "inclusiveGateway", "complexGateway",
  "callActivity",
]);

function parseFlowElement(el: Element, sequenceFlows: Map<string, Element>): Step | null {
  const tag = localName(el);
  const id = attr(el, "id") ?? uid();
  const name = attr(el, "name") ?? tag;
  const tech = parseCamundaExtensions(el);

  const source = { bpmnElementId: id, bpmnElementType: tag };

  switch (tag) {
    case "serviceTask":
    case "scriptTask":
    case "sendTask":
    case "receiveTask":
    case "businessRuleTask": {
      const step: AutomationStep = { id, name, type: "automation", tech, source };
      return step;
    }

    case "userTask":
    case "manualTask": {
      const step: UserStep = {
        id, name, type: "user",
        assignee: attr(el, "camunda:assignee"),
        candidateGroups: attr(el, "camunda:candidateGroups")?.split(",").map(s => s.trim()),
        tech, source,
      };
      return step;
    }

    case "exclusiveGateway":
    case "inclusiveGateway":
    case "complexGateway": {
      const outgoing = Array.from(el.children)
        .filter(c => localName(c) === "outgoing")
        .map(o => o.textContent?.trim() ?? "")
        .filter(Boolean);

      const branches: DecisionBranch[] = outgoing.map((flowId, idx) => {
        const flow = sequenceFlows.get(flowId);
        const condEl = flow ? firstChildByLocalName(flow, "conditionExpression") : undefined;
        return {
          id: `branch_${flowId}`,
          label: attr(flow ?? el, "name") ?? `Branch ${idx + 1}`,
          condition: textContent(condEl) || "${default}",
          targetStepId: flow?.getAttribute("targetRef") ?? undefined,
        };
      });

      const step: DecisionStep = { id, name, type: "decision", branches, tech, source };
      return step;
    }

    case "subProcess": {
      // Multi-instance subProcess → foreach step
      const miEl = firstChildByLocalName(el, "multiInstanceLoopCharacteristics");
      if (miEl) {
        const collectionEl = miEl.getAttribute("camunda:collection") ?? "";
        const elementVar = miEl.getAttribute("camunda:elementVariable") ?? "";
        const nestedSteps = parseInnerFlowElements(el, sequenceFlows);
        const step: ForeachStep = {
          id, name, type: "foreach",
          collectionExpression: collectionEl,
          elementVariable: elementVar,
          isSequential: miEl.getAttribute("isSequential") === "true",
          steps: nestedSteps,
          tech, source,
        };
        return step;
      }
      // Plain subProcess inline → automation
      const step: AutomationStep = { id, name, type: "automation", tech, source };
      return step;
    }

    case "callActivity": {
      const extEl = firstChildByLocalName(el, "extensionElements");
      const inEls = extEl ? Array.from(extEl.children).filter(c => localName(c) === "in") : [];
      const outEls = extEl ? Array.from(extEl.children).filter(c => localName(c) === "out") : [];
      const step: CallActivityStep = {
        id, name, type: "callActivity",
        calledElement: attr(el, "calledElement") ?? "",
        inMappings: inEls.map(e => ({ source: attr(e, "source") ?? "", target: attr(e, "target") ?? "" })),
        outMappings: outEls.map(e => ({ source: attr(e, "source") ?? "", target: attr(e, "target") ?? "" })),
        tech, source,
      };
      return step;
    }

    default:
      return null;
  }
}

// ─── Parse inner flow elements (inside a subProcess container) ────────────────

const INNER_SKIP_TAGS = new Set([
  "startEvent", "endEvent", "boundaryEvent", "sequenceFlow",
  "textAnnotation", "association",
  "dataObject", "dataStore", "dataStoreReference", "dataObjectReference",
  "message", "error", "signal",
  "messageEventDefinition", "timerEventDefinition",
  "errorEventDefinition", "signalEventDefinition",
  "multiInstanceLoopCharacteristics",
  // intermediate events – map to automation steps
]);

const INTERMEDIATE_EVENT_TAGS = new Set([
  "intermediateCatchEvent", "intermediateThrowEvent",
]);

function parseInnerFlowElements(container: Element, sequenceFlows: Map<string, Element>): Step[] {
  return Array.from(container.children)
    .filter(el => {
      const tag = localName(el);
      if (INNER_SKIP_TAGS.has(tag)) return false;
      if (INTERMEDIATE_EVENT_TAGS.has(tag)) return true; // treat as automation
      return true;
    })
    .map(el => {
      const tag = localName(el);
      if (INTERMEDIATE_EVENT_TAGS.has(tag)) {
        // Map intermediate events to automation steps
        const id = attr(el, "id") ?? uid();
        const name = attr(el, "name") ?? "Wait";
        const tech = parseCamundaExtensions(el);
        const step: AutomationStep = { id, name, type: "automation", tech, source: { bpmnElementId: id, bpmnElementType: tag } };
        return step;
      }
      return parseFlowElement(el, sequenceFlows);
    })
    .filter((s): s is Step => s !== null);
}

// ─── Build sequence flow map ──────────────────────────────────────────────────

function buildSeqFlowMap(doc: Document): Map<string, Element> {
  const map = new Map<string, Element>();
  // Use querySelectorAll with both prefixed and unprefixed
  doc.querySelectorAll("sequenceFlow").forEach(el => {
    const id = el.getAttribute("id");
    if (id) map.set(id, el);
  });
  // Also handle namespace-prefixed (bpmn:sequenceFlow)
  Array.from(doc.getElementsByTagNameNS("*", "sequenceFlow")).forEach(el => {
    const id = el.getAttribute("id");
    if (id && !map.has(id)) map.set(id, el);
  });
  return map;
}

// ─── Parse trigger from start events ─────────────────────────────────────────

function parseTrigger(doc: Document): Trigger {
  // Find the top-level startEvent (not inside a subProcess)
  const processEl = doc.querySelector("process, [localName='process']");
  if (!processEl) return { type: "none" };

  const startEvent = Array.from(processEl.children).find(el => localName(el) === "startEvent");
  if (!startEvent) return { type: "none" };

  if (firstChildByLocalName(startEvent, "timerEventDefinition")) {
    const timer = firstChildByLocalName(startEvent, "timerEventDefinition");
    const expr = timer ? (
      textContent(firstChildByLocalName(timer, "timeCycle")) ||
      textContent(firstChildByLocalName(timer, "timeDate")) ||
      textContent(firstChildByLocalName(timer, "timeDuration"))
    ) : "";
    return { type: "timer", expression: expr || undefined, name: attr(startEvent, "name") };
  }

  if (firstChildByLocalName(startEvent, "messageEventDefinition")) {
    return { type: "message", name: attr(startEvent, "name") };
  }

  if (firstChildByLocalName(startEvent, "signalEventDefinition")) {
    return { type: "signal", name: attr(startEvent, "name") };
  }

  return { type: "none" };
}

// ─── Build stages from process children (document order) ─────────────────────
/**
 * Walk top-level children of <process> in order.
 * - Skip non-flow elements (startEvent, endEvent, sequenceFlow, etc.)
 * - Accumulate consecutive "task-like" elements into a synthetic stage
 * - Each <subProcess> becomes its own stage
 */
function buildStages(
  processEl: Element,
  sequenceFlows: Map<string, Element>,
  processName: string,
): { stages: Stage[]; warnings: string[] } {
  const warnings: string[] = [];
  const stages: Stage[] = [];

  const SKIP_TOP = new Set([
    "startEvent", "endEvent", "sequenceFlow",
    "boundaryEvent", "textAnnotation", "association",
    "dataObject", "dataStore", "dataStoreReference", "dataObjectReference",
    "message", "error", "signal",
    "laneSet", "lane", "collaboration", "participant",
  ]);

  let flatBuffer: Step[] = [];

  const flushBuffer = () => {
    if (flatBuffer.length === 0) return;
    // Give the stage a name based on first step
    const stageName = flatBuffer.length === 1 ? flatBuffer[0].name : `${flatBuffer[0].name} & more`;
    stages.push({
      id: uid(),
      name: stageName,
      steps: flatBuffer,
      source: { bpmnElementId: undefined, bpmnElementType: "synthetic" },
    });
    flatBuffer = [];
  };

  for (const child of Array.from(processEl.children)) {
    const tag = localName(child);

    if (SKIP_TOP.has(tag)) continue;

    if (tag === "subProcess") {
      // Flush any accumulated flat tasks first
      flushBuffer();

      // Check: is this a multi-instance subProcess (foreach)?
      const miEl = firstChildByLocalName(child, "multiInstanceLoopCharacteristics");
      const stageId = attr(child, "id") ?? uid();
      const stageName = attr(child, "name") ?? "Stage";

      if (miEl) {
        // Multi-instance subProcess → stage whose steps are the inner tasks
        const innerSteps = parseInnerFlowElements(child, sequenceFlows);
        stages.push({
          id: stageId,
          name: stageName,
          steps: innerSteps,
          source: { bpmnElementId: stageId, bpmnElementType: "subProcess" },
        });
      } else {
        // Plain subProcess → stage
        const innerSteps = parseInnerFlowElements(child, sequenceFlows);
        stages.push({
          id: stageId,
          name: stageName,
          steps: innerSteps,
          source: { bpmnElementId: stageId, bpmnElementType: "subProcess" },
        });
      }
    } else if (TASK_LIKE_TAGS.has(tag)) {
      const step = parseFlowElement(child, sequenceFlows);
      if (step) flatBuffer.push(step);
    } else if (INTERMEDIATE_EVENT_TAGS.has(tag)) {
      // Treat intermediate events as automation steps in the current flat stage
      const id = attr(child, "id") ?? uid();
      const name = attr(child, "name") ?? "Wait";
      const tech = parseCamundaExtensions(child);
      flatBuffer.push({ id, name, type: "automation", tech, source: { bpmnElementId: id, bpmnElementType: tag } });
    }
    // else: unknown element, skip
  }

  // Flush any trailing flat tasks
  flushBuffer();

  if (stages.length === 0) {
    // No stages at all — make a single stage from the entire flat process
    warnings.push("No task or subProcess elements found – placed all tasks in one stage.");
    const steps = parseInnerFlowElements(processEl, sequenceFlows);
    stages.push({
      id: uid(),
      name: processName,
      steps,
      source: { bpmnElementId: undefined, bpmnElementType: "process" },
    });
  }

  return { stages, warnings };
}

// ─── Main import function ─────────────────────────────────────────────────────

export async function importBpmn(bpmnXml: string, fileName?: string): Promise<ImportResult> {
  const warnings: string[] = [];

  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(bpmnXml, "text/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Invalid XML: " + parseError.textContent?.slice(0, 200));
    }
  } catch (e) {
    throw new Error(`BPMN parse failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const sequenceFlows = buildSeqFlowMap(doc);
  const trigger = parseTrigger(doc);

  // Find the main process element (handle namespace prefix)
  let processEl: Element | null = null;
  // Try unprefixed first, then prefixed
  processEl = doc.querySelector("process");
  if (!processEl) {
    // Try with namespace prefix (bpmn:process etc.)
    const allEls = Array.from(doc.getElementsByTagName("*"));
    processEl = allEls.find(el => localName(el) === "process" && localName(el.parentElement ?? el) !== "process") ?? null;
  }

  if (!processEl) {
    throw new Error("No <process> element found in BPMN XML");
  }

  const processId = attr(processEl, "id") ?? uid();
  const processName = attr(processEl, "name") ?? "Unnamed Process";

  const { stages, warnings: stageWarnings } = buildStages(processEl, sequenceFlows, processName);
  warnings.push(...stageWarnings);

  if (stages.every(s => s.steps.length === 0)) {
    warnings.push("No recognizable task elements found. Check your BPMN file.");
  }

  const caseIr: CaseIR = {
    id: processId,
    name: processName,
    version: "1.0.0",
    trigger,
    stages,
    metadata: {
      createdAt: now(),
      updatedAt: now(),
      sourceFile: fileName,
      exportedFrom: "bpmn",
    },
  };

  return { caseIr, warnings };
}
