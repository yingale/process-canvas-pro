import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import WorkflowStudio from "@/components/studio/WorkflowStudio";
import { importBpmn } from "@/lib/bpmnImporter";
import { EMAIL_FETCHER_BPMN } from "@/lib/sampleBpmn";
import { createApprovalPipelineCaseIR } from "@/lib/sampleApprovalPipeline";
import type { CaseIR, FormTemplate } from "@/types/caseIr";

// Inline the file processing BPMN for template loading
const FILE_PROCESSING_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  id="Definitions_FileProcessingWorkflowV1"
                  targetNamespace="http://example.com/bpmn/FileProcessingWorkflowV1">
  <bpmn:process id="FileProcessingWorkflowV1" name="File Processing Workflow V1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_Timer" name="Timer Start">
      <bpmn:outgoing>Flow_FetchEmails</bpmn:outgoing>
      <bpmn:timerEventDefinition id="TimerEventDefinition_1h3xj23">
        <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">R/PT5M</bpmn:timeCycle>
      </bpmn:timerEventDefinition>
    </bpmn:startEvent>
    <bpmn:serviceTask id="Task_FetchEmails" name="Fetch Emails" camunda:type="external" camunda:topic="fetchMessages">
      <bpmn:extensionElements>
        <camunda:inputOutput>
          <camunda:inputParameter name="mailLimit">10</camunda:inputParameter>
        </camunda:inputOutput>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_FetchEmails</bpmn:incoming>
      <bpmn:outgoing>Flow_ProcessEmails</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:subProcess id="SubProcess_ProcessEachEmail" name="Process Each Attachment" camunda:asyncBefore="true">
      <bpmn:incoming>Flow_ProcessEmails</bpmn:incoming>
      <bpmn:outgoing>Flow_End</bpmn:outgoing>
      <bpmn:multiInstanceLoopCharacteristics isSequential="true"
          camunda:collection="\${keys.elements()}" camunda:elementVariable="key" />
      <bpmn:startEvent id="StartEvent_SubProcess" name="Start Subprocess">
        <bpmn:outgoing>Flow_StartProcess</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:serviceTask id="Task_ProcessAttachments" name="Process Attachments" camunda:type="external" camunda:topic="processAttachments" camunda:asyncBefore="true">
        <bpmn:incoming>Flow_StartProcess</bpmn:incoming>
        <bpmn:outgoing>Flow_WaitForProcessingComplete</bpmn:outgoing>
      </bpmn:serviceTask>
      <bpmn:intermediateCatchEvent id="Event_0h13toy" name="invoke_email_worker">
        <bpmn:incoming>Flow_WaitForProcessingComplete</bpmn:incoming>
        <bpmn:outgoing>Flow_SendEmail</bpmn:outgoing>
        <bpmn:messageEventDefinition id="MessageEventDefinition_0835gde" messageRef="Message_1jj8154"/>
      </bpmn:intermediateCatchEvent>
      <bpmn:serviceTask id="Task_SendEmail" name="Send Email" camunda:type="external" camunda:topic="emailSendMailbox">
        <bpmn:incoming>Flow_SendEmail</bpmn:incoming>
        <bpmn:outgoing>Flow_EndSubProcess</bpmn:outgoing>
      </bpmn:serviceTask>
      <bpmn:endEvent id="EndEvent_SubProcess" name="Subprocess End">
        <bpmn:incoming>Flow_EndSubProcess</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="Flow_StartProcess" sourceRef="StartEvent_SubProcess" targetRef="Task_ProcessAttachments" />
      <bpmn:sequenceFlow id="Flow_WaitForProcessingComplete" sourceRef="Task_ProcessAttachments" targetRef="Event_0h13toy" />
      <bpmn:sequenceFlow id="Flow_SendEmail" sourceRef="Event_0h13toy" targetRef="Task_SendEmail" />
      <bpmn:sequenceFlow id="Flow_EndSubProcess" sourceRef="Task_SendEmail" targetRef="EndEvent_SubProcess" />
    </bpmn:subProcess>
    <bpmn:endEvent id="EndEvent" name="End">
      <bpmn:incoming>Flow_End</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_FetchEmails" sourceRef="StartEvent_Timer" targetRef="Task_FetchEmails" />
    <bpmn:sequenceFlow id="Flow_ProcessEmails" sourceRef="Task_FetchEmails" targetRef="SubProcess_ProcessEachEmail" />
    <bpmn:sequenceFlow id="Flow_End" sourceRef="SubProcess_ProcessEachEmail" targetRef="EndEvent" />
  </bpmn:process>
  <bpmn:message id="Message_1jj8154" name="invoke_email_worker" />
</bpmn:definitions>`;

const TEMPLATE_MAP: Record<string, string> = {
  email_fetcher: EMAIL_FETCHER_BPMN,
  file_processing: FILE_PROCESSING_BPMN,
};

export default function StudioPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const templateId = searchParams.get("template");

  // Check for AI-generated IR passed via router state
  const routerState = location.state as {
    generatedIr?: CaseIR;
    generatedWarnings?: string[];
    savedFormTemplate?: FormTemplate;
    savedModuleConfig?: Record<string, unknown>;
    stepBasePath?: string;
    restoreStudio?: boolean;
  } | null;

  // Restore CaseIR from sessionStorage when returning from form builder
  const restoredIr = (() => {
    if (routerState?.restoreStudio) {
      try {
        const saved = sessionStorage.getItem("studio_caseIr");
        if (saved) {
          const parsed = JSON.parse(saved) as CaseIR;
          // Clean up after restore
          sessionStorage.removeItem("studio_caseIr");
          return parsed;
        }
      } catch {
        // ignore parse errors
      }
    }
    return null;
  })();

  const [initialIr, setInitialIr] = useState<{ ir: CaseIR; warnings: string[] } | null>(
    routerState?.generatedIr
      ? { ir: routerState.generatedIr, warnings: routerState.generatedWarnings ?? [] }
      : restoredIr
        ? { ir: restoredIr, warnings: [] }
        : null
  );
  const [loading, setLoading] = useState(!!templateId && !routerState?.generatedIr && !restoredIr);

  // Pass saved form template from form builder page
  const [pendingFormTemplate, setPendingFormTemplate] = useState<{
    template: FormTemplate;
    stepBasePath: string;
  } | null>(
    routerState?.savedFormTemplate && routerState?.stepBasePath
      ? { template: routerState.savedFormTemplate, stepBasePath: routerState.stepBasePath }
      : null
  );

  // Pass saved module config from module config page
  const [pendingModuleConfig, setPendingModuleConfig] = useState<{
    config: Record<string, unknown>;
    stepBasePath: string;
  } | null>(
    routerState?.savedModuleConfig && routerState?.stepBasePath
      ? { config: routerState.savedModuleConfig, stepBasePath: routerState.stepBasePath }
      : null
  );

  useEffect(() => {
    if (routerState?.generatedIr || restoredIr || !templateId) return;
    const xml = TEMPLATE_MAP[templateId];
    if (!xml) {
      setLoading(false);
      return;
    }
    importBpmn(xml, `${templateId}.bpmn`).then((result) => {
      setInitialIr({ ir: result.caseIr, warnings: result.warnings });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [templateId, routerState]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="empty-spinner w-10 h-10 border-2 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <WorkflowStudio
      initialCaseIr={initialIr?.ir}
      initialWarnings={initialIr?.warnings}
      pendingFormTemplate={pendingFormTemplate ?? undefined}
      onFormTemplateConsumed={() => setPendingFormTemplate(null)}
      pendingModuleConfig={pendingModuleConfig ?? undefined}
      onModuleConfigConsumed={() => setPendingModuleConfig(null)}
    />
  );
}
