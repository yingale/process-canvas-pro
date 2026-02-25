/**
 * Zod validation schemas for Case IR
 * Separated from type definitions to keep files under 500 lines.
 */
import { z } from "zod";
import type { CaseIR } from "./caseIr";

const ioParamSchema = z.object({ name: z.string(), value: z.string() });

export const camunda7TechSchema = z.object({
  topic: z.string().optional(),
  asyncBefore: z.boolean().optional(),
  asyncAfter: z.boolean().optional(),
  inputParameters: z.array(ioParamSchema).optional(),
  outputParameters: z.array(ioParamSchema).optional(),
  multiInstance: z.object({
    isSequential: z.boolean(),
    collectionExpression: z.string(),
    elementVariable: z.string(),
    completionCondition: z.string().optional(),
  }).optional(),
  callActivity: z.object({
    calledElement: z.string(),
    inMappings: z.array(z.object({ source: z.string(), target: z.string() })),
    outMappings: z.array(z.object({ source: z.string(), target: z.string() })),
  }).optional(),
}).optional();

const sourceSchema = z.object({
  bpmnElementId: z.string().optional(),
  bpmnElementType: z.string().optional(),
}).optional();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stepSchema: z.ZodType<any> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      id: z.string().min(1), type: z.literal("automation"),
      name: z.string().min(1), description: z.string().optional(),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
    z.object({
      id: z.string().min(1), type: z.literal("user"),
      name: z.string().min(1), description: z.string().optional(),
      assignee: z.string().optional(),
      candidateGroups: z.array(z.string()).optional(),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
    z.object({
      id: z.string().min(1), type: z.literal("decision"),
      name: z.string().min(1), description: z.string().optional(),
      branches: z.array(z.object({
        id: z.string(), label: z.string(), condition: z.string(),
        targetStepId: z.string().optional(),
      })),
      defaultBranchId: z.string().optional(),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
    z.object({
      id: z.string().min(1), type: z.literal("foreach"),
      name: z.string().min(1), description: z.string().optional(),
      collectionExpression: z.string(), elementVariable: z.string(),
      isSequential: z.boolean().optional(),
      steps: z.array(z.lazy(() => stepSchema)),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
    z.object({
      id: z.string().min(1), type: z.literal("callActivity"),
      name: z.string().min(1), description: z.string().optional(),
      calledElement: z.string(),
      inMappings: z.array(z.object({ source: z.string(), target: z.string() })).optional(),
      outMappings: z.array(z.object({ source: z.string(), target: z.string() })).optional(),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
    z.object({
      id: z.string().min(1), type: z.literal("intermediateEvent"),
      name: z.string().min(1), description: z.string().optional(),
      eventSubType: z.string(),
      messageRef: z.string().optional(),
      timerExpression: z.string().optional(),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
  ])
);

export const groupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  steps: z.array(stepSchema),
});

export const stageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
  groups: z.array(groupSchema),
  source: z.object({
    bpmnElementId: z.string().optional(),
    bpmnElementType: z.string().optional(),
  }).optional(),
});

const endEventSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  eventType: z.string(),
  expression: z.string().optional(),
  tech: camunda7TechSchema,
  source: sourceSchema,
});

const processPropertiesSchema = z.object({
  isExecutable: z.boolean().optional(),
  versionTag: z.string().optional(),
  historyTimeToLive: z.string().optional(),
  candidateStarterGroups: z.string().optional(),
  candidateStarterUsers: z.string().optional(),
  jobPriority: z.string().optional(),
  taskPriority: z.string().optional(),
}).optional();

export const caseIrSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string(),
  trigger: z.object({
    type: z.enum(["none", "timer", "message", "signal", "manual"]),
    expression: z.string().optional(),
    name: z.string().optional(),
    tech: camunda7TechSchema,
    source: z.object({
      bpmnElementId: z.string().optional(),
      bpmnElementType: z.string().optional(),
    }).optional(),
  }),
  endEvent: endEventSchema,
  processProperties: processPropertiesSchema,
  stages: z.array(stageSchema),
  alternativePaths: z.array(stageSchema).optional(),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    sourceFile: z.string().optional(),
    exportedFrom: z.enum(["bpmn", "manual"]).optional(),
    originalDiagramXml: z.string().optional(),
    originalDefinitionsAttrs: z.record(z.string()).optional(),
    originalSequenceFlowIds: z.record(z.object({
      sourceRef: z.string(),
      targetRef: z.string(),
    })).optional(),
    originalStartEventId: z.string().optional(),
    originalEndEventId: z.string().optional(),
    originalSubProcessEventIds: z.record(z.object({
      startId: z.string(),
      endId: z.string(),
      flowIds: z.array(z.string()),
    })).optional(),
    originalTopLevelFlowIds: z.array(z.string()).optional(),
    originalBpmnXml: z.string().optional(),
  }),
});

export function validateCaseIR(
  data: unknown
): { success: true; data: CaseIR } | { success: false; errors: string[] } {
  const result = caseIrSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data as CaseIR };
  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
  };
}
