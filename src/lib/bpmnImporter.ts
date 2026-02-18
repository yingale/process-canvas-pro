/**
 * BPMN Importer – converts BPMN 2.0 XML → Case IR
 * Supports Camunda 7 extension elements
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

function childrenByTag(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter(c => c.localName === tag || c.tagName.split(":")[1] === tag);
}

function firstChildByTag(el: Element, tag: string): Element | undefined {
  return childrenByTag(el, tag)[0];
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
  const miEl = firstChildByTag(el, "multiInstanceLoopCharacteristics");
  if (miEl) {
    const loopCardinality = firstChildByTag(miEl, "loopCardinality");
    const completionCondition = firstChildByTag(miEl, "completionCondition");
    const collectionEl = miEl.getAttribute("camunda:collection") ?? miEl.getAttribute("collection") ?? "";
    const elementVar = miEl.getAttribute("camunda:elementVariable") ?? miEl.getAttribute("elementVariable") ?? "";
    tech.multiInstance = {
      isSequential: miEl.getAttribute("isSequential") === "true",
      collectionExpression: collectionEl || textContent(loopCardinality),
      elementVariable: elementVar,
      completionCondition: textContent(completionCondition) || undefined,
    };
  }

  // CallActivity in/out mappings
  const extEl = firstChildByTag(el, "extensionElements");
  if (extEl) {
    const inEls = Array.from(extEl.querySelectorAll("in, [localName='in']"));
    const outEls = Array.from(extEl.querySelectorAll("out, [localName='out']"));
    if (inEls.length || outEls.length) {
      tech.callActivity = {
        calledElement: attr(el, "calledElement") ?? "",
        inMappings: inEls.map(e => ({ source: attr(e, "source") ?? "", target: attr(e, "target") ?? "" })),
        outMappings: outEls.map(e => ({ source: attr(e, "source") ?? "", target: attr(e, "target") ?? "" })),
      };
    }
  }

  return Object.keys(tech).length > 0 ? tech : {};
}

// ─── Parse a single flow element into a Step ─────────────────────────────────

function parseFlowElement(el: Element, sequenceFlows: Map<string, Element>): Step | null {
  const tag = el.localName ?? el.tagName.split(":")[1];
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
      // Collect outgoing sequence flows as decision branches
      const outgoing = Array.from(el.querySelectorAll("outgoing, [localName='outgoing']"))
        .map(o => o.textContent?.trim() ?? "")
        .filter(Boolean);

      const branches: DecisionBranch[] = outgoing.map((flowId, idx) => {
        const flow = sequenceFlows.get(flowId);
        const condEl = flow ? firstChildByTag(flow, "conditionExpression") : undefined;
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
      // Check if it's multi-instance (foreach)
      const miEl = firstChildByTag(el, "multiInstanceLoopCharacteristics");
      if (miEl) {
        const collectionEl = miEl.getAttribute("camunda:collection") ?? "";
        const elementVar = miEl.getAttribute("camunda:elementVariable") ?? "";
        const nestedSteps = parseFlowElements(el, sequenceFlows);
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
      // Plain subProcess → treat as automation
      const step: AutomationStep = { id, name, type: "automation", tech, source };
      return step;
    }

    case "callActivity": {
      const extEl = firstChildByTag(el, "extensionElements");
      const inEls = extEl ? Array.from(extEl.querySelectorAll("[localName='in']")) : [];
      const outEls = extEl ? Array.from(extEl.querySelectorAll("[localName='out']")) : [];
      const step: CallActivityStep = {
        id, name, type: "callActivity",
        calledElement: attr(el, "calledElement") ?? "",
        inMappings: inEls.map(e => ({ source: attr(e, "source") ?? "", target: attr(e, "target") ?? "" })),
        outMappings: outEls.map(e => ({ source: attr(e, "source") ?? "", target: attr(e, "target") ?? "" })),
        tech, source,
      };
      return step;
    }

    // Skip non-task elements
    default:
      return null;
  }
}

// ─── Parse flow elements from a container ────────────────────────────────────

function parseFlowElements(container: Element, sequenceFlows: Map<string, Element>): Step[] {
  const skipped = new Set(["startEvent", "endEvent", "boundaryEvent", "sequenceFlow", "textAnnotation", "association", "process", "collaboration", "participant", "lane", "laneSet", "dataObject", "dataStore", "dataStoreReference", "dataObjectReference", "message", "error", "signal", "messageEventDefinition", "timerEventDefinition", "errorEventDefinition", "signalEventDefinition"]);

  return Array.from(container.children)
    .filter(el => !skipped.has(el.localName ?? el.tagName.split(":")[1]))
    .map(el => parseFlowElement(el, sequenceFlows))
    .filter((s): s is Step => s !== null);
}

// ─── Build sequence flow map ──────────────────────────────────────────────────

function buildSeqFlowMap(doc: Document): Map<string, Element> {
  const map = new Map<string, Element>();
  doc.querySelectorAll("sequenceFlow, [localName='sequenceFlow']").forEach(el => {
    const id = el.getAttribute("id");
    if (id) map.set(id, el);
  });
  return map;
}

// ─── Parse trigger from start events ─────────────────────────────────────────

function parseTrigger(doc: Document): Trigger {
  const startEvent = doc.querySelector("startEvent, [localName='startEvent']");
  if (!startEvent) return { type: "none" };

  if (firstChildByTag(startEvent, "timerEventDefinition")) {
    const timer = firstChildByTag(startEvent, "timerEventDefinition");
    const expr = timer ? (
      textContent(firstChildByTag(timer, "timeCycle")) ||
      textContent(firstChildByTag(timer, "timeDate")) ||
      textContent(firstChildByTag(timer, "timeDuration"))
    ) : "";
    return { type: "timer", expression: expr || undefined, name: attr(startEvent, "name") };
  }

  if (firstChildByTag(startEvent, "messageEventDefinition")) {
    return { type: "message", name: attr(startEvent, "name") };
  }

  if (firstChildByTag(startEvent, "signalEventDefinition")) {
    return { type: "signal", name: attr(startEvent, "name") };
  }

  return { type: "none" };
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

  // Find the main process element
  const processEl = doc.querySelector("process, [localName='process']");
  if (!processEl) {
    throw new Error("No <process> element found in BPMN XML");
  }

  const processId = attr(processEl, "id") ?? uid();
  const processName = attr(processEl, "name") ?? "Unnamed Process";

  // Find top-level subProcesses as stages
  const subProcessEls = Array.from(processEl.children).filter(
    el => el.localName === "subProcess"
  );

  let stages: Stage[];

  if (subProcessEls.length > 0) {
    // SubProcess elements → stages
    stages = subProcessEls.map(spEl => {
      const stageId = attr(spEl, "id") ?? uid();
      const stageName = attr(spEl, "name") ?? "Unnamed Stage";
      const steps = parseFlowElements(spEl, sequenceFlows);
      return {
        id: stageId,
        name: stageName,
        steps,
        source: { bpmnElementId: stageId, bpmnElementType: "subProcess" },
      };
    });
  } else {
    // Flat process → single stage containing all tasks
    warnings.push("No subProcess elements found – all tasks placed in a single stage.");
    const steps = parseFlowElements(processEl, sequenceFlows);
    stages = [
      {
        id: uid(),
        name: processName,
        steps,
        source: { bpmnElementId: processId, bpmnElementType: "process" },
      },
    ];
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
