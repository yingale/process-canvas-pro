/**
 * BPMN Importer – converts BPMN 2.0 XML → Case IR (Section → Groups → Steps)
 * Each stage gets a single default "Main" group containing all its steps.
 */

import type {
  CaseIR, Stage, Step, AutomationStep, UserStep, DecisionStep,
  ForeachStep, CallActivityStep, IntermediateEventStep,
  Trigger, ImportResult, Camunda7Tech, DecisionBranch, IoParam,
  BoundaryEvent, EndEvent, ProcessProperties,
} from "@/types/caseIr";

function uid(): string { return `ir_${Math.random().toString(36).slice(2, 10)}`; }
function now(): string { return new Date().toISOString(); }
function attr(el: Element, name: string): string | undefined { return el.getAttribute(name) ?? undefined; }
function childrenByLocalName(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter(c => lname(c) === tag);
}
function firstChild(el: Element, tag: string): Element | undefined {
  return childrenByLocalName(el, tag)[0];
}
function lname(el: Element): string { return el.localName ?? el.tagName.split(":")[1]; }
function textContent(el: Element | undefined): string { return el?.textContent?.trim() ?? ""; }

function parseInputOutput(el: Element): { inputs: IoParam[]; outputs: IoParam[] } {
  const extEl = firstChild(el, "extensionElements");
  if (!extEl) return { inputs: [], outputs: [] };
  const ioEl = Array.from(extEl.children).find(c => lname(c) === "inputOutput");
  if (!ioEl) return { inputs: [], outputs: [] };
  const inputs = childrenByLocalName(ioEl, "inputParameter").map(p => ({ name: attr(p, "name") ?? "", value: textContent(p) }));
  const outputs = childrenByLocalName(ioEl, "outputParameter").map(p => ({ name: attr(p, "name") ?? "", value: textContent(p) }));
  return { inputs, outputs };
}

function parseDocumentation(el: Element): string | undefined {
  const text = textContent(firstChild(el, "documentation"));
  return text || undefined;
}

function parseCamundaExtensions(el: Element): Camunda7Tech {
  const tech: Camunda7Tech = {};
  const topic = attr(el, "camunda:topic") ?? attr(el, "topic");
  if (topic) tech.topic = topic;
  if (attr(el, "camunda:asyncBefore") === "true") tech.asyncBefore = true;
  if (attr(el, "camunda:asyncAfter") === "true") tech.asyncAfter = true;
  const miEl = firstChild(el, "multiInstanceLoopCharacteristics");
  if (miEl) {
    const collectionEl = miEl.getAttribute("camunda:collection") ?? miEl.getAttribute("collection") ?? "";
    const elementVar = miEl.getAttribute("camunda:elementVariable") ?? miEl.getAttribute("elementVariable") ?? "";
    tech.multiInstance = {
      isSequential: miEl.getAttribute("isSequential") === "true",
      collectionExpression: collectionEl || textContent(firstChild(miEl, "loopCardinality")),
      elementVariable: elementVar,
      completionCondition: textContent(firstChild(miEl, "completionCondition")) || undefined,
    };
  }
  const { inputs, outputs } = parseInputOutput(el);
  if (inputs.length > 0) tech.inputParameters = inputs;
  if (outputs.length > 0) tech.outputParameters = outputs;
  return Object.keys(tech).length > 0 ? tech : {};
}

const TASK_LIKE_TAGS = new Set([
  "serviceTask", "scriptTask", "sendTask", "receiveTask", "businessRuleTask",
  "userTask", "manualTask", "exclusiveGateway", "inclusiveGateway", "complexGateway", "callActivity",
]);
const INTERMEDIATE_EVENT_TAGS = new Set(["intermediateCatchEvent", "intermediateThrowEvent"]);

function getEventSubType(el: Element): { subType: string; messageRef?: string; timerExpr?: string } {
  if (firstChild(el, "messageEventDefinition")) {
    const msgDef = firstChild(el, "messageEventDefinition");
    return { subType: "message", messageRef: msgDef ? (attr(msgDef, "messageRef") ?? undefined) : undefined };
  }
  if (firstChild(el, "timerEventDefinition")) {
    const t = firstChild(el, "timerEventDefinition")!;
    const expr = textContent(firstChild(t, "timeCycle")) || textContent(firstChild(t, "timeDate")) || textContent(firstChild(t, "timeDuration"));
    return { subType: "timer", timerExpr: expr || undefined };
  }
  if (firstChild(el, "signalEventDefinition")) return { subType: "signal" };
  if (firstChild(el, "errorEventDefinition")) return { subType: "error" };
  return { subType: "generic" };
}

function parseFlowElement(el: Element, sequenceFlows: Map<string, Element>): Step | null {
  const tag = lname(el);
  const id = attr(el, "id") ?? uid();
  const name = attr(el, "name") ?? tag;
  const tech = parseCamundaExtensions(el);
  const description = parseDocumentation(el);
  const source = { bpmnElementId: id, bpmnElementType: tag };

  switch (tag) {
    case "serviceTask": case "scriptTask": case "sendTask": case "receiveTask": case "businessRuleTask":
      return { id, name, type: "automation", tech, source, description } as AutomationStep;
    case "userTask": case "manualTask":
      return { id, name, type: "user", assignee: attr(el, "camunda:assignee"), candidateGroups: attr(el, "camunda:candidateGroups")?.split(",").map(s => s.trim()), tech, source, description } as UserStep;
    case "exclusiveGateway": case "inclusiveGateway": case "complexGateway": {
      const outgoing = Array.from(el.children).filter(c => lname(c) === "outgoing").map(o => o.textContent?.trim() ?? "").filter(Boolean);
      const branches: DecisionBranch[] = outgoing.map((flowId, idx) => {
        const flow = sequenceFlows.get(flowId);
        const condEl = flow ? firstChild(flow, "conditionExpression") : undefined;
        return { id: `branch_${flowId}`, label: attr(flow ?? el, "name") ?? `Branch ${idx + 1}`, condition: textContent(condEl) || "${default}", targetStepId: flow?.getAttribute("targetRef") ?? undefined };
      });
      return { id, name, type: "decision", branches, tech, source, description } as DecisionStep;
    }
    case "subProcess": {
      const miEl = firstChild(el, "multiInstanceLoopCharacteristics");
      if (miEl) {
        return { id, name, type: "foreach", collectionExpression: miEl.getAttribute("camunda:collection") ?? "", elementVariable: miEl.getAttribute("camunda:elementVariable") ?? "", isSequential: miEl.getAttribute("isSequential") === "true", steps: parseInnerFlowElements(el, sequenceFlows), tech, source, description } as ForeachStep;
      }
      return { id, name, type: "automation", tech, source, description } as AutomationStep;
    }
    case "callActivity": {
      const extEl = firstChild(el, "extensionElements");
      const inEls = extEl ? Array.from(extEl.children).filter(c => lname(c) === "in") : [];
      const outEls = extEl ? Array.from(extEl.children).filter(c => lname(c) === "out") : [];
      return { id, name, type: "callActivity", calledElement: attr(el, "calledElement") ?? "", inMappings: inEls.map(e => ({ source: attr(e, "source") ?? "", target: attr(e, "target") ?? "" })), outMappings: outEls.map(e => ({ source: attr(e, "source") ?? "", target: attr(e, "target") ?? "" })), tech, source, description } as CallActivityStep;
    }
    default: return null;
  }
}

const INNER_SKIP_TAGS = new Set(["startEvent", "endEvent", "boundaryEvent", "sequenceFlow", "textAnnotation", "association", "dataObject", "dataStore", "dataStoreReference", "dataObjectReference", "message", "error", "signal", "messageEventDefinition", "timerEventDefinition", "errorEventDefinition", "signalEventDefinition", "multiInstanceLoopCharacteristics"]);

function parseInnerFlowElements(container: Element, sequenceFlows: Map<string, Element>): Step[] {
  const steps: Step[] = [];
  for (const el of Array.from(container.children)) {
    const tag = lname(el);
    if (INNER_SKIP_TAGS.has(tag)) continue;
    if (INTERMEDIATE_EVENT_TAGS.has(tag)) {
      const id = attr(el, "id") ?? uid();
      const { subType, messageRef, timerExpr } = getEventSubType(el);
      steps.push({ id, name: attr(el, "name") ?? "Wait", type: "intermediateEvent", eventSubType: subType, messageRef, timerExpression: timerExpr, tech: parseCamundaExtensions(el), source: { bpmnElementId: id, bpmnElementType: tag }, description: parseDocumentation(el) } as IntermediateEventStep);
      continue;
    }
    if (TASK_LIKE_TAGS.has(tag) || tag === "subProcess") {
      const step = parseFlowElement(el, sequenceFlows);
      if (step) steps.push(step);
    }
  }
  return steps;
}

function buildSeqFlowMap(doc: Document): Map<string, Element> {
  const map = new Map<string, Element>();
  Array.from(doc.getElementsByTagNameNS("*", "sequenceFlow")).forEach(el => { const id = el.getAttribute("id"); if (id) map.set(id, el); });
  doc.querySelectorAll("sequenceFlow").forEach(el => { const id = el.getAttribute("id"); if (id && !map.has(id)) map.set(id, el); });
  return map;
}

function buildMessageMap(doc: Document): Map<string, string> {
  const map = new Map<string, string>();
  Array.from(doc.getElementsByTagNameNS("*", "message")).forEach(el => { const id = el.getAttribute("id"); const name = el.getAttribute("name"); if (id && name) map.set(id, name); });
  return map;
}

function parseTrigger(doc: Document): Trigger {
  const processEl = doc.querySelector("process") ?? Array.from(doc.getElementsByTagName("*")).find(el => lname(el) === "process");
  if (!processEl) return { type: "none" };
  const startEvent = Array.from(processEl.children).find(el => lname(el) === "startEvent");
  if (!startEvent) return { type: "none" };

  const tech = parseCamundaExtensions(startEvent);
  const source: { bpmnElementId?: string; bpmnElementType?: string } = {
    bpmnElementId: attr(startEvent, "id"),
    bpmnElementType: "startEvent",
  };

  if (firstChild(startEvent, "timerEventDefinition")) {
    const timer = firstChild(startEvent, "timerEventDefinition")!;
    const expr = textContent(firstChild(timer, "timeCycle")) || textContent(firstChild(timer, "timeDate")) || textContent(firstChild(timer, "timeDuration"));
    return { type: "timer", expression: expr || undefined, name: attr(startEvent, "name"), tech, source };
  }
  if (firstChild(startEvent, "messageEventDefinition")) return { type: "message", name: attr(startEvent, "name"), tech, source };
  if (firstChild(startEvent, "signalEventDefinition")) return { type: "signal", name: attr(startEvent, "name"), tech, source };
  return { type: "none", name: attr(startEvent, "name"), tech, source };
}

function resolveMessageNames(steps: Step[], messageMap: Map<string, string>) {
  for (const step of steps) {
    if (step.type === "intermediateEvent" && step.messageRef) step.messageRef = messageMap.get(step.messageRef) ?? step.messageRef;
    if (step.type === "foreach") resolveMessageNames(step.steps, messageMap);
  }
}

// ─── Boundary event parser ────────────────────────────────────────────────────

function parseBoundaryEvents(container: Element): BoundaryEvent[] {
  const events: BoundaryEvent[] = [];
  for (const el of Array.from(container.children)) {
    if (lname(el) !== "boundaryEvent") continue;
    const id = attr(el, "id") ?? uid();
    const name = attr(el, "name") ?? "Boundary Event";
    const attachedTo = attr(el, "attachedToRef");
    const cancelActivity = attr(el, "cancelActivity") !== "false"; // default true
    const { subType, messageRef, timerExpr } = getEventSubType(el);
    const tech = parseCamundaExtensions(el);
    events.push({
      id,
      name,
      eventType: subType as BoundaryEvent["eventType"],
      cancelActivity,
      expression: timerExpr ?? messageRef,
      tech,
      source: { bpmnElementId: id, bpmnElementType: `boundaryEvent:${subType}` },
    });
    // Store attachedToRef as a custom property for later wiring
    (events[events.length - 1] as any)._attachedTo = attachedTo;
  }
  return events;
}

function attachBoundaryEventsToSteps(stages: Stage[], boundaryEvents: BoundaryEvent[]) {
  const beMap = new Map<string, BoundaryEvent[]>();
  for (const be of boundaryEvents) {
    const attachedTo = (be as any)._attachedTo;
    if (!attachedTo) continue;
    delete (be as any)._attachedTo;
    if (!beMap.has(attachedTo)) beMap.set(attachedTo, []);
    beMap.get(attachedTo)!.push(be);
  }
  if (beMap.size === 0) return;
  for (const stage of stages) {
    for (const group of stage.groups) {
      for (const step of group.steps) {
        const matching = beMap.get(step.source?.bpmnElementId ?? "");
        if (matching) step.boundaryEvents = matching;
        if (step.type === "foreach") {
          // Also check nested steps
          for (const nested of step.steps) {
            const m = beMap.get(nested.source?.bpmnElementId ?? "");
            if (m) nested.boundaryEvents = m;
          }
        }
      }
    }
    // Also check if boundary is attached to the stage (subProcess) itself
    const stageBeList = beMap.get(stage.source?.bpmnElementId ?? "");
    if (stageBeList) {
      // Add as steps in a special "Boundary Events" group or attach to first group
      if (stage.groups.length > 0) {
        for (const be of stageBeList) {
          // Convert boundary event to an intermediateEvent step for visibility
          stage.groups[0].steps.push({
            id: be.id,
            name: be.name,
            type: "intermediateEvent",
            eventSubType: be.eventType,
            timerExpression: be.expression,
            tech: be.tech,
            source: be.source,
            boundaryEvents: [],
          } as IntermediateEventStep);
        }
      }
    }
  }
}

// ─── End event parser ─────────────────────────────────────────────────────────

function parseEndEvent(processEl: Element): EndEvent {
  const endEl = Array.from(processEl.children).find(el => lname(el) === "endEvent");
  if (!endEl) return { id: uid(), eventType: "none" };
  const id = attr(endEl, "id") ?? uid();
  const name = attr(endEl, "name");
  const tech = parseCamundaExtensions(endEl);
  const source = { bpmnElementId: id, bpmnElementType: "endEvent" };
  
  if (firstChild(endEl, "terminateEventDefinition")) return { id, name, eventType: "terminate", tech, source };
  if (firstChild(endEl, "errorEventDefinition")) {
    const errDef = firstChild(endEl, "errorEventDefinition")!;
    return { id, name, eventType: "error", expression: attr(errDef, "errorRef"), tech, source };
  }
  if (firstChild(endEl, "messageEventDefinition")) return { id, name, eventType: "message", tech, source };
  if (firstChild(endEl, "signalEventDefinition")) return { id, name, eventType: "signal", tech, source };
  if (firstChild(endEl, "escalationEventDefinition")) return { id, name, eventType: "escalation", tech, source };
  if (firstChild(endEl, "compensateEventDefinition")) return { id, name, eventType: "compensate", tech, source };
  return { id, name, eventType: "none", tech, source };
}

// ─── Process properties parser ────────────────────────────────────────────────

function parseProcessProperties(processEl: Element): ProcessProperties {
  const props: ProcessProperties = {};
  if (attr(processEl, "isExecutable") === "true") props.isExecutable = true;
  if (attr(processEl, "isExecutable") === "false") props.isExecutable = false;
  const vt = attr(processEl, "camunda:versionTag");
  if (vt) props.versionTag = vt;
  const htl = attr(processEl, "camunda:historyTimeToLive");
  if (htl) props.historyTimeToLive = htl;
  const csg = attr(processEl, "camunda:candidateStarterGroups");
  if (csg) props.candidateStarterGroups = csg;
  const csu = attr(processEl, "camunda:candidateStarterUsers");
  if (csu) props.candidateStarterUsers = csu;
  const jp = attr(processEl, "camunda:jobPriority");
  if (jp) props.jobPriority = jp;
  const tp = attr(processEl, "camunda:taskPriority");
  if (tp) props.taskPriority = tp;
  return props;
}

/** Wrap steps into a single default "Main" group */
function makeGroup(name: string, steps: Step[], bpmnId?: string) {
  return { id: bpmnId ? `grp_${bpmnId}` : uid(), name, steps };
}

function buildStages(processEl: Element, sequenceFlows: Map<string, Element>, messageMap: Map<string, string>, processName: string): { stages: Stage[]; warnings: string[] } {
  const warnings: string[] = [];
  const stages: Stage[] = [];

  const SKIP_TOP = new Set(["startEvent", "endEvent", "sequenceFlow", "boundaryEvent", "textAnnotation", "association", "dataObject", "dataStore", "dataStoreReference", "dataObjectReference", "message", "error", "signal", "laneSet", "lane", "collaboration", "participant"]);

  let flatBuffer: Step[] = [];
  const flushBuffer = () => {
    if (!flatBuffer.length) return;
    const stageName = flatBuffer.length === 1 ? flatBuffer[0].name : `${flatBuffer[0].name} & more`;
    stages.push({ id: uid(), name: stageName, groups: [makeGroup("Main", flatBuffer)], source: { bpmnElementId: undefined, bpmnElementType: "synthetic" } });
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
      resolveMessageNames(innerSteps, messageMap);
      stages.push({
        id: stageId,
        name: stageName,
        groups: [makeGroup("Main", innerSteps, stageId)],
        source: { bpmnElementId: stageId, bpmnElementType: miEl ? "subProcess-multi" : "subProcess" },
      });
    } else if (TASK_LIKE_TAGS.has(tag)) {
      const step = parseFlowElement(child, sequenceFlows);
      if (step) flatBuffer.push(step);
    } else if (INTERMEDIATE_EVENT_TAGS.has(tag)) {
      const id = attr(child, "id") ?? uid();
      const { subType, messageRef, timerExpr } = getEventSubType(child);
      flatBuffer.push({ id, name: attr(child, "name") ?? "Wait", type: "intermediateEvent", eventSubType: subType, messageRef: messageRef ? (messageMap.get(messageRef) ?? messageRef) : undefined, timerExpression: timerExpr, tech: parseCamundaExtensions(child), source: { bpmnElementId: id, bpmnElementType: tag }, description: parseDocumentation(child) } as IntermediateEventStep);
    }
  }
  flushBuffer();

  if (stages.length === 0) {
    warnings.push("No task or subProcess elements found – placed all tasks in one stage.");
    const steps = parseInnerFlowElements(processEl, sequenceFlows);
    stages.push({ id: uid(), name: processName, groups: [makeGroup("Main", steps)], source: { bpmnElementId: undefined, bpmnElementType: "process" } });
  }
  return { stages, warnings };
}

/** Extract the full bpmndi:BPMNDiagram XML block as a string */
function extractDiagramXml(bpmnXml: string): string | undefined {
  // Use regex to capture everything between <bpmndi:BPMNDiagram ...> and </bpmndi:BPMNDiagram>
  const match = bpmnXml.match(/<bpmndi:BPMNDiagram[\s\S]*?<\/bpmndi:BPMNDiagram>/);
  return match?.[0];
}

/** Extract definitions-level attributes (id, targetNamespace, etc.) */
function extractDefinitionsAttrs(doc: Document): Record<string, string> {
  const defsEl = doc.documentElement;
  const result: Record<string, string> = {};
  if (!defsEl) return result;
  for (const attr of Array.from(defsEl.attributes)) {
    result[attr.name] = attr.value;
  }
  return result;
}

/** Build a map of sequenceFlow id → { sourceRef, targetRef } for the full doc */
function buildAllFlowRefMap(doc: Document): Record<string, { sourceRef: string; targetRef: string }> {
  const result: Record<string, { sourceRef: string; targetRef: string }> = {};
  Array.from(doc.getElementsByTagNameNS("*", "sequenceFlow")).forEach(el => {
    const id = el.getAttribute("id");
    const src = el.getAttribute("sourceRef");
    const tgt = el.getAttribute("targetRef");
    if (id && src && tgt) result[id] = { sourceRef: src, targetRef: tgt };
  });
  return result;
}

export async function importBpmn(bpmnXml: string, fileName?: string): Promise<ImportResult> {
  const warnings: string[] = [];
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(bpmnXml, "text/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) throw new Error("Invalid XML: " + parseError.textContent?.slice(0, 200));
  } catch (e) {
    throw new Error(`BPMN parse failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const sequenceFlows = buildSeqFlowMap(doc);
  const messageMap = buildMessageMap(doc);
  const trigger = parseTrigger(doc);

  let processEl: Element | null = doc.querySelector("process");
  if (!processEl) processEl = Array.from(doc.getElementsByTagName("*")).find(el => lname(el) === "process" && lname(el.parentElement ?? el) !== "process") ?? null;
  if (!processEl) throw new Error("No <process> element found in BPMN XML");

  const processId = attr(processEl, "id") ?? uid();
  const processName = attr(processEl, "name") ?? "Unnamed Process";
  const { stages, warnings: stageWarnings } = buildStages(processEl, sequenceFlows, messageMap, processName);
  warnings.push(...stageWarnings);

  for (const stage of stages) {
    for (const group of stage.groups) resolveMessageNames(group.steps, messageMap);
  }

  if (stages.every(s => s.groups.every(g => g.steps.length === 0))) {
    warnings.push("No recognizable task elements found. Check your BPMN file.");
  }

  // Capture original diagram data for lossless round-trip
  const originalDiagramXml = extractDiagramXml(bpmnXml);
  const originalDefinitionsAttrs = extractDefinitionsAttrs(doc);
  const originalSequenceFlowIds = buildAllFlowRefMap(doc);

  // Capture original start/end event IDs from the top-level process
  const topLevelStartEvent = Array.from(processEl.children).find(el => lname(el) === "startEvent");
  const topLevelEndEvent = Array.from(processEl.children).find(el => lname(el) === "endEvent");
  const originalStartEventId = topLevelStartEvent ? (attr(topLevelStartEvent, "id") ?? undefined) : undefined;
  const originalEndEventId = topLevelEndEvent ? (attr(topLevelEndEvent, "id") ?? undefined) : undefined;

  // Capture original start/end event IDs and flow IDs per subProcess
  const originalSubProcessEventIds: Record<string, { startId: string; endId: string; flowIds: string[] }> = {};
  for (const child of Array.from(processEl.children)) {
    if (lname(child) !== "subProcess") continue;
    const spId = attr(child, "id");
    if (!spId) continue;
    const spStart = Array.from(child.children).find(el => lname(el) === "startEvent");
    const spEnd = Array.from(child.children).find(el => lname(el) === "endEvent");
    const spFlows = Array.from(child.children)
      .filter(el => lname(el) === "sequenceFlow")
      .map(el => attr(el, "id") ?? uid());
    if (spStart && spEnd) {
      originalSubProcessEventIds[spId] = {
        startId: attr(spStart, "id") ?? uid(),
        endId: attr(spEnd, "id") ?? uid(),
        flowIds: spFlows,
      };
    }
  }

  // Capture original top-level sequence flow IDs in order
  const originalTopLevelFlowIds = Array.from(processEl.children)
    .filter(el => lname(el) === "sequenceFlow")
    .map(el => attr(el, "id") ?? uid());

  // Parse end event, process properties, and boundary events
  const endEvent = parseEndEvent(processEl);
  const processProperties = parseProcessProperties(processEl);
  const boundaryEvents = parseBoundaryEvents(processEl);
  // Also parse boundary events inside subProcesses
  for (const child of Array.from(processEl.children)) {
    if (lname(child) === "subProcess") {
      boundaryEvents.push(...parseBoundaryEvents(child));
    }
  }
  attachBoundaryEventsToSteps(stages, boundaryEvents);

  const caseIr: CaseIR = {
    id: processId, name: processName, version: "1.0.0", trigger, endEvent, processProperties, stages,
    metadata: {
      createdAt: now(), updatedAt: now(), sourceFile: fileName, exportedFrom: "bpmn",
      originalBpmnXml: bpmnXml,
      originalDiagramXml,
      originalDefinitionsAttrs,
      originalSequenceFlowIds,
      originalStartEventId,
      originalEndEventId,
      originalSubProcessEventIds,
      originalTopLevelFlowIds,
    },
  };
  return { caseIr, warnings };
}
