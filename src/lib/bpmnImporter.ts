/**
 * BPMN Importer – converts BPMN 2.0 XML → Case IR
 * Supports Camunda 7 extension elements.
 *
 * Captures:
 *  - camunda:inputOutput → inputParameters / outputParameters
 *  - bpmn:documentation
 *  - intermediateCatchEvent / intermediateThrowEvent with event sub-type & message ref
 *  - multiInstanceLoopCharacteristics (collection, elementVariable, isSequential)
 *  - asyncBefore / asyncAfter
 *  - external task topic
 *  - callActivity in/out mappings
 *  - exclusiveGateway decision branches with conditions
 *
 * Strategy:
 *  1. Walk the top-level children of <process> in document order.
 *  2. Collect consecutive "task-like" elements into a synthetic stage.
 *  3. Treat every <subProcess> as its own stage (with its inner tasks).
 */

import type {
  CaseIR, Stage, Step, AutomationStep, UserStep, DecisionStep,
  ForeachStep, CallActivityStep, IntermediateEventStep,
  Trigger, ImportResult, Camunda7Tech, DecisionBranch, IoParam,
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
  return Array.from(el.children).filter(c => lname(c) === tag);
}

function firstChild(el: Element, tag: string): Element | undefined {
  return childrenByLocalName(el, tag)[0];
}

function lname(el: Element): string {
  return el.localName ?? el.tagName.split(":")[1];
}

function textContent(el: Element | undefined): string {
  return el?.textContent?.trim() ?? "";
}

// ─── Parse camunda:inputOutput ────────────────────────────────────────────────

function parseInputOutput(el: Element): { inputs: IoParam[]; outputs: IoParam[] } {
  const extEl = firstChild(el, "extensionElements");
  if (!extEl) return { inputs: [], outputs: [] };

  const ioEl = Array.from(extEl.children).find(c => lname(c) === "inputOutput");
  if (!ioEl) return { inputs: [], outputs: [] };

  const inputs: IoParam[] = childrenByLocalName(ioEl, "inputParameter").map(p => ({
    name: attr(p, "name") ?? "",
    value: textContent(p),
  }));

  const outputs: IoParam[] = childrenByLocalName(ioEl, "outputParameter").map(p => ({
    name: attr(p, "name") ?? "",
    value: textContent(p),
  }));

  return { inputs, outputs };
}

// ─── Parse bpmn:documentation ────────────────────────────────────────────────

function parseDocumentation(el: Element): string | undefined {
  const docEl = firstChild(el, "documentation");
  const text = textContent(docEl);
  return text || undefined;
}

// ─── Parse Camunda core tech extensions ──────────────────────────────────────

function parseCamundaExtensions(el: Element): Camunda7Tech {
  const tech: Camunda7Tech = {};

  const topic = attr(el, "camunda:topic") ?? attr(el, "topic");
  if (topic) tech.topic = topic;

  if (attr(el, "camunda:asyncBefore") === "true") tech.asyncBefore = true;
  if (attr(el, "camunda:asyncAfter") === "true") tech.asyncAfter = true;

  // Multi-instance
  const miEl = firstChild(el, "multiInstanceLoopCharacteristics");
  if (miEl) {
    const loopCardinality = firstChild(miEl, "loopCardinality");
    const completionCondition = firstChild(miEl, "completionCondition");
    const collectionEl = miEl.getAttribute("camunda:collection") ?? miEl.getAttribute("collection") ?? "";
    const elementVar = miEl.getAttribute("camunda:elementVariable") ?? miEl.getAttribute("elementVariable") ?? "";
    tech.multiInstance = {
      isSequential: miEl.getAttribute("isSequential") === "true",
      collectionExpression: collectionEl || textContent(loopCardinality),
      elementVariable: elementVar,
      completionCondition: textContent(completionCondition) || undefined,
    };
  }

  // I/O params
  const { inputs, outputs } = parseInputOutput(el);
  if (inputs.length > 0) tech.inputParameters = inputs;
  if (outputs.length > 0) tech.outputParameters = outputs;

  return Object.keys(tech).length > 0 ? tech : {};
}

// ─── Tags ────────────────────────────────────────────────────────────────────

const TASK_LIKE_TAGS = new Set([
  "serviceTask", "scriptTask", "sendTask", "receiveTask", "businessRuleTask",
  "userTask", "manualTask",
  "exclusiveGateway", "inclusiveGateway", "complexGateway",
  "callActivity",
]);

const INTERMEDIATE_EVENT_TAGS = new Set([
  "intermediateCatchEvent", "intermediateThrowEvent",
]);

// ─── Determine intermediate event sub-type ───────────────────────────────────

function getEventSubType(el: Element): { subType: string; messageRef?: string; timerExpr?: string } {
  if (firstChild(el, "messageEventDefinition")) {
    const msgDef = firstChild(el, "messageEventDefinition");
    const messageRef = msgDef ? (attr(msgDef, "messageRef") ?? undefined) : undefined;
    return { subType: "message", messageRef };
  }
  if (firstChild(el, "timerEventDefinition")) {
    const timerDef = firstChild(el, "timerEventDefinition");
    const expr = timerDef
      ? (textContent(firstChild(timerDef, "timeCycle")) ||
         textContent(firstChild(timerDef, "timeDate")) ||
         textContent(firstChild(timerDef, "timeDuration")))
      : "";
    return { subType: "timer", timerExpr: expr || undefined };
  }
  if (firstChild(el, "signalEventDefinition")) return { subType: "signal" };
  if (firstChild(el, "errorEventDefinition")) return { subType: "error" };
  if (firstChild(el, "escalationEventDefinition")) return { subType: "escalation" };
  if (firstChild(el, "conditionalEventDefinition")) return { subType: "conditional" };
  return { subType: "generic" };
}

// ─── Parse a single flow element into a Step ─────────────────────────────────

function parseFlowElement(el: Element, sequenceFlows: Map<string, Element>): Step | null {
  const tag = lname(el);
  const id = attr(el, "id") ?? uid();
  const name = attr(el, "name") ?? tag;
  const tech = parseCamundaExtensions(el);
  const description = parseDocumentation(el);
  const source = { bpmnElementId: id, bpmnElementType: tag };

  switch (tag) {
    case "serviceTask":
    case "scriptTask":
    case "sendTask":
    case "receiveTask":
    case "businessRuleTask": {
      const step: AutomationStep = { id, name, type: "automation", tech, source, description };
      return step;
    }

    case "userTask":
    case "manualTask": {
      const step: UserStep = {
        id, name, type: "user",
        assignee: attr(el, "camunda:assignee"),
        candidateGroups: attr(el, "camunda:candidateGroups")?.split(",").map(s => s.trim()),
        tech, source, description,
      };
      return step;
    }

    case "exclusiveGateway":
    case "inclusiveGateway":
    case "complexGateway": {
      const outgoing = Array.from(el.children)
        .filter(c => lname(c) === "outgoing")
        .map(o => o.textContent?.trim() ?? "")
        .filter(Boolean);

      const branches: DecisionBranch[] = outgoing.map((flowId, idx) => {
        const flow = sequenceFlows.get(flowId);
        const condEl = flow ? firstChild(flow, "conditionExpression") : undefined;
        return {
          id: `branch_${flowId}`,
          label: attr(flow ?? el, "name") ?? `Branch ${idx + 1}`,
          condition: textContent(condEl) || "${default}",
          targetStepId: flow?.getAttribute("targetRef") ?? undefined,
        };
      });

      const step: DecisionStep = { id, name, type: "decision", branches, tech, source, description };
      return step;
    }

    case "subProcess": {
      const miEl = firstChild(el, "multiInstanceLoopCharacteristics");
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
          tech, source, description,
        };
        return step;
      }
      const step: AutomationStep = { id, name, type: "automation", tech, source, description };
      return step;
    }

    case "callActivity": {
      const extEl = firstChild(el, "extensionElements");
      const inEls = extEl ? Array.from(extEl.children).filter(c => lname(c) === "in") : [];
      const outEls = extEl ? Array.from(extEl.children).filter(c => lname(c) === "out") : [];
      const step: CallActivityStep = {
        id, name, type: "callActivity",
        calledElement: attr(el, "calledElement") ?? "",
        inMappings: inEls.map(e => ({ source: attr(e, "source") ?? "", target: attr(e, "target") ?? "" })),
        outMappings: outEls.map(e => ({ source: attr(e, "source") ?? "", target: attr(e, "target") ?? "" })),
        tech, source, description,
      };
      return step;
    }

    default:
      return null;
  }
}

// ─── Parse inner flow elements ────────────────────────────────────────────────

const INNER_SKIP_TAGS = new Set([
  "startEvent", "endEvent", "boundaryEvent", "sequenceFlow",
  "textAnnotation", "association",
  "dataObject", "dataStore", "dataStoreReference", "dataObjectReference",
  "message", "error", "signal",
  "messageEventDefinition", "timerEventDefinition",
  "errorEventDefinition", "signalEventDefinition",
  "multiInstanceLoopCharacteristics",
]);

function parseInnerFlowElements(container: Element, sequenceFlows: Map<string, Element>): Step[] {
  const steps: Step[] = [];

  for (const el of Array.from(container.children)) {
    const tag = lname(el);

    if (INNER_SKIP_TAGS.has(tag)) continue;

    if (INTERMEDIATE_EVENT_TAGS.has(tag)) {
      const id = attr(el, "id") ?? uid();
      const name = attr(el, "name") ?? "Wait";
      const description = parseDocumentation(el);
      const tech = parseCamundaExtensions(el);
      const { subType, messageRef, timerExpr } = getEventSubType(el);
      const step: IntermediateEventStep = {
        id, name, type: "intermediateEvent",
        eventSubType: subType,
        messageRef,
        timerExpression: timerExpr,
        tech, source: { bpmnElementId: id, bpmnElementType: tag },
        description,
      };
      steps.push(step);
      continue;
    }

    if (TASK_LIKE_TAGS.has(tag) || tag === "subProcess") {
      const step = parseFlowElement(el, sequenceFlows);
      if (step) steps.push(step);
    }
  }

  return steps;
}

// ─── Build sequence flow map ──────────────────────────────────────────────────

function buildSeqFlowMap(doc: Document): Map<string, Element> {
  const map = new Map<string, Element>();
  Array.from(doc.getElementsByTagNameNS("*", "sequenceFlow")).forEach(el => {
    const id = el.getAttribute("id");
    if (id) map.set(id, el);
  });
  doc.querySelectorAll("sequenceFlow").forEach(el => {
    const id = el.getAttribute("id");
    if (id && !map.has(id)) map.set(id, el);
  });
  return map;
}

// ─── Build a message name lookup map ─────────────────────────────────────────

function buildMessageMap(doc: Document): Map<string, string> {
  const map = new Map<string, string>();
  Array.from(doc.getElementsByTagNameNS("*", "message")).forEach(el => {
    const id = el.getAttribute("id");
    const name = el.getAttribute("name");
    if (id && name) map.set(id, name);
  });
  return map;
}

// ─── Parse trigger from start events ─────────────────────────────────────────

function parseTrigger(doc: Document): Trigger {
  const processEl = doc.querySelector("process") ??
    Array.from(doc.getElementsByTagName("*")).find(el => lname(el) === "process" && lname(el.parentElement ?? el) !== "process");
  if (!processEl) return { type: "none" };

  const startEvent = Array.from(processEl.children).find(el => lname(el) === "startEvent");
  if (!startEvent) return { type: "none" };

  if (firstChild(startEvent, "timerEventDefinition")) {
    const timer = firstChild(startEvent, "timerEventDefinition")!;
    const expr =
      textContent(firstChild(timer, "timeCycle")) ||
      textContent(firstChild(timer, "timeDate")) ||
      textContent(firstChild(timer, "timeDuration"));
    return { type: "timer", expression: expr || undefined, name: attr(startEvent, "name") };
  }
  if (firstChild(startEvent, "messageEventDefinition")) {
    return { type: "message", name: attr(startEvent, "name") };
  }
  if (firstChild(startEvent, "signalEventDefinition")) {
    return { type: "signal", name: attr(startEvent, "name") };
  }
  return { type: "none" };
}

// ─── Build stages from process children ──────────────────────────────────────

function buildStages(
  processEl: Element,
  sequenceFlows: Map<string, Element>,
  messageMap: Map<string, string>,
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
    const tag = lname(child);

    if (SKIP_TOP.has(tag)) continue;

    if (tag === "subProcess") {
      flushBuffer();

      const miEl = firstChild(child, "multiInstanceLoopCharacteristics");
      const stageId = attr(child, "id") ?? uid();
      const stageName = attr(child, "name") ?? "Stage";
      const innerSteps = parseInnerFlowElements(child, sequenceFlows);

      // Resolve message names in inner intermediate events
      resolveMessageNames(innerSteps, messageMap);

      if (miEl) {
        // multi-instance → stage source keeps the foreach info
        stages.push({
          id: stageId,
          name: stageName,
          steps: innerSteps,
          source: { bpmnElementId: stageId, bpmnElementType: "subProcess-multi" },
        });
      } else {
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
      const id = attr(child, "id") ?? uid();
      const name = attr(child, "name") ?? "Wait";
      const description = parseDocumentation(child);
      const tech = parseCamundaExtensions(child);
      const { subType, messageRef, timerExpr } = getEventSubType(child);
      flatBuffer.push({
        id, name, type: "intermediateEvent",
        eventSubType: subType,
        messageRef: messageRef ? (messageMap.get(messageRef) ?? messageRef) : undefined,
        timerExpression: timerExpr,
        tech, source: { bpmnElementId: id, bpmnElementType: tag },
        description,
      } as IntermediateEventStep);
    }
  }

  flushBuffer();

  if (stages.length === 0) {
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

// ─── Resolve message ID → name in steps ──────────────────────────────────────

function resolveMessageNames(steps: Step[], messageMap: Map<string, string>) {
  for (const step of steps) {
    if (step.type === "intermediateEvent" && step.messageRef) {
      step.messageRef = messageMap.get(step.messageRef) ?? step.messageRef;
    }
    if (step.type === "foreach") {
      resolveMessageNames(step.steps, messageMap);
    }
  }
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
  const messageMap = buildMessageMap(doc);
  const trigger = parseTrigger(doc);

  // Find the main process element
  let processEl: Element | null = doc.querySelector("process");
  if (!processEl) {
    processEl = Array.from(doc.getElementsByTagName("*"))
      .find(el => lname(el) === "process" && lname(el.parentElement ?? el) !== "process") ?? null;
  }
  if (!processEl) throw new Error("No <process> element found in BPMN XML");

  const processId = attr(processEl, "id") ?? uid();
  const processName = attr(processEl, "name") ?? "Unnamed Process";

  const { stages, warnings: stageWarnings } = buildStages(processEl, sequenceFlows, messageMap, processName);
  warnings.push(...stageWarnings);

  // Resolve message names at top level too
  for (const stage of stages) {
    resolveMessageNames(stage.steps, messageMap);
  }

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
