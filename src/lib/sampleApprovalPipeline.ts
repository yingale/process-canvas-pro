/**
 * Sample CaseIR: Approval Pipeline
 * Email Fetcher → Chunk Extractor → AI Processor → Decision (Approve?) → Column Extractor / Failure
 */
import type { CaseIR } from "@/types/caseIr";

export function createApprovalPipelineCaseIR(): CaseIR {
  return {
    id: "approval-pipeline-001",
    name: "Data Extraction with Approval",
    version: "1.0.0",
    trigger: {
      type: "timer",
      expression: "0 */30 * * * ?",
      name: "Check mailbox every 30 min",
    },
    endEvent: {
      id: "end_1",
      eventType: "none",
    },
    processProperties: {
      isExecutable: true,
      historyTimeToLive: "P30D",
    },
    stages: [
      {
        id: "stage_ingest",
        name: "Data Ingestion",
        groups: [
          {
            id: "grp_fetch",
            name: "Fetch & Extract",
            steps: [
              {
                id: "step_email",
                name: "Fetch Email Attachments",
                type: "automation",
                description: "Download CSV/XLSX attachments from mailbox",
                tech: { topic: "email-fetcher-fetch" },
                moduleRef: {
                  moduleId: "email-fetcher",
                  instanceConfig: {
                    emailId: "data-inbox@company.com",
                    subjectFilter: "Monthly Report",
                    downloadAttachment: true,
                    maxEmails: 5,
                    outputVariable: "emailFetcherResult",
                  },
                },
              },
              {
                id: "step_chunk",
                name: "Extract Chunks",
                type: "automation",
                description: "Split attachment into processable chunks",
                tech: { topic: "chunk-extractor-execute" },
                moduleRef: {
                  moduleId: "chunk-extractor",
                  instanceConfig: {
                    inputVariable: "emailFetcherResult.attachmentPaths[0]",
                    chunkSize: 100,
                    hasHeader: true,
                    outputVariable: "chunkExtractorResult",
                  },
                },
              },
            ],
          },
        ],
      },
      {
        id: "stage_ai",
        name: "AI Analysis",
        groups: [
          {
            id: "grp_process",
            name: "Process with AI",
            steps: [
              {
                id: "step_ai",
                name: "Detect Columns & Preview",
                type: "automation",
                description: "AI identifies column names and returns first 10 rows for review",
                tech: { topic: "ai-processor-execute" },
                moduleRef: {
                  moduleId: "ai-processor",
                  instanceConfig: {
                    inputVariable: "chunkExtractorResult.chunks[0]",
                    prompt: "Analyze this data. Return the column names and first 10 rows as a preview table.",
                    outputFormat: "json",
                    model: "auto",
                    temperature: 0.2,
                    outputVariable: "aiProcessorResult",
                  },
                },
              },
            ],
          },
        ],
      },
      {
        id: "stage_review",
        name: "Review & Approve",
        groups: [
          {
            id: "grp_decision",
            name: "Human Review",
            steps: [
              {
                id: "step_approval",
                name: "Review AI Results",
                type: "user",
                description: "Reviewer checks column names and first 10 rows",
                assignee: "${reviewer}",
                candidateGroups: ["data-reviewers"],
                tech: { topic: "approval-review" },
                moduleRef: {
                  moduleId: "approval",
                  instanceConfig: {
                    inputVariable: "aiProcessorResult",
                    approverRole: "Data Reviewer",
                    slaHours: 24,
                    onReject: "reroute",
                    outputVariable: "approvalResult",
                  },
                },
              },
              {
                id: "step_decide",
                name: "Approved?",
                type: "decision",
                description: "Route based on reviewer decision",
                branches: [
                  {
                    id: "br_yes",
                    label: "✅ Approved",
                    condition: "${approvalResult.decision == 'approved'}",
                    targetStepId: "step_extract",
                  },
                  {
                    id: "br_no",
                    label: "❌ Rejected",
                    condition: "${approvalResult.decision == 'rejected'}",
                    targetStepId: "step_failure",
                  },
                ],
                defaultBranchId: "br_no",
              },
            ],
          },
        ],
      },
      {
        id: "stage_extract",
        name: "Full Extraction",
        groups: [
          {
            id: "grp_extract",
            name: "Extract & Notify",
            steps: [
              {
                id: "step_extract",
                name: "Extract All Columns",
                type: "automation",
                description: "Extract full dataset with approved columns",
                tech: { topic: "column-extractor-execute" },
                moduleRef: {
                  moduleId: "column-extractor",
                  instanceConfig: {
                    inputFileVariable: "emailFetcherResult.attachmentPaths[0]",
                    columnsVariable: "aiProcessorResult.columnNames",
                    outputFormat: "csv",
                    outputVariable: "columnExtractorResult",
                  },
                },
              },
              {
                id: "step_notify_success",
                name: "Send Success Email",
                type: "automation",
                description: "Notify team with extracted file",
                tech: { topic: "email-notification-send" },
                moduleRef: {
                  moduleId: "email-notification",
                  instanceConfig: {
                    to: "team@company.com",
                    subject: "Data extraction completed — ${columnExtractorResult.totalRows} rows",
                    body: "The data extraction pipeline has completed successfully.",
                    attachFileVariable: "columnExtractorResult.outputFile",
                    outputVariable: "emailNotificationResult",
                  },
                },
              },
            ],
          },
        ],
      },
    ],
    alternativePaths: [
      {
        id: "alt_failure",
        name: "Rejection Handler",
        groups: [
          {
            id: "grp_fail",
            name: "Rejection & Triage",
            steps: [
              {
                id: "step_failure",
                name: "Notify Submitter",
                type: "automation",
                description: "Send rejection email with reason to original submitter",
                tech: { topic: "email-notification-send" },
                moduleRef: {
                  moduleId: "email-notification",
                  instanceConfig: {
                    to: "${submitterEmail}",
                    subject: "Data extraction rejected",
                    body: "Your data extraction was rejected. Reason: ${approvalResult.comments}",
                    outputVariable: "failureNotifyResult",
                  },
                },
              },
              {
                id: "step_revise",
                name: "Revise & Resubmit",
                type: "user",
                description: "Submitter reviews rejection feedback and can correct data or re-upload",
                assignee: "${submitterEmail}",
                candidateGroups: ["data-submitters"],
                tech: { topic: "revision-task" },
                moduleRef: {
                  moduleId: "approval",
                  instanceConfig: {
                    inputVariable: "approvalResult",
                    approverRole: "Submitter",
                    slaHours: 48,
                    onReject: "terminate",
                    outputVariable: "revisionResult",
                  },
                },
              },
              {
                id: "step_revise_decide",
                name: "Resubmit or Escalate?",
                type: "decision",
                description: "Route based on submitter action — resubmit to AI or escalate to admin",
                branches: [
                  {
                    id: "br_resubmit",
                    label: "🔄 Resubmit",
                    condition: "${revisionResult.decision == 'approved'}",
                    targetStepId: "step_ai",
                  },
                  {
                    id: "br_escalate",
                    label: "⬆️ Escalate",
                    condition: "${revisionResult.decision == 'rejected'}",
                    targetStepId: "step_escalate",
                  },
                ],
                defaultBranchId: "br_escalate",
              },
            ],
          },
          {
            id: "grp_escalation",
            name: "Escalation Path",
            steps: [
              {
                id: "step_escalate",
                name: "Escalate to Admin",
                type: "user",
                description: "Pipeline admin reviews the rejected case and makes final decision",
                assignee: "${adminEmail}",
                candidateGroups: ["pipeline-admins"],
                tech: { topic: "escalation-review" },
                moduleRef: {
                  moduleId: "approval",
                  instanceConfig: {
                    inputVariable: "approvalResult",
                    approverRole: "Pipeline Admin",
                    slaHours: 72,
                    onReject: "terminate",
                    outputVariable: "escalationResult",
                  },
                },
              },
              {
                id: "step_escalate_decide",
                name: "Admin Decision",
                type: "decision",
                description: "Admin overrides approval or permanently closes the case",
                branches: [
                  {
                    id: "br_override",
                    label: "✅ Override Approve",
                    condition: "${escalationResult.decision == 'approved'}",
                    targetStepId: "step_extract",
                  },
                  {
                    id: "br_close",
                    label: "🛑 Close Case",
                    condition: "${escalationResult.decision == 'rejected'}",
                    targetStepId: "step_close",
                  },
                ],
                defaultBranchId: "br_close",
              },
              {
                id: "step_close",
                name: "Close & Archive",
                type: "automation",
                description: "Archive rejection and notify all stakeholders of final closure",
                tech: { topic: "email-notification-send" },
                moduleRef: {
                  moduleId: "email-notification",
                  instanceConfig: {
                    to: "${submitterEmail},${adminEmail}",
                    subject: "Case permanently closed — ${caseIr.name}",
                    body: "This data extraction case has been permanently closed after admin review.",
                    outputVariable: "closeNotifyResult",
                  },
                },
              },
            ],
          },
        ],
      },
    ],
    personas: [
      {
        id: "persona_reviewer",
        name: "Data Reviewer",
        role: "Reviewer",
        description: "Reviews AI-detected columns before full extraction",
        permissions: ["approve", "reject", "comment"],
      },
      {
        id: "persona_admin",
        name: "Pipeline Admin",
        role: "Admin",
        description: "Manages pipeline configuration and escalations",
        permissions: ["configure", "override", "escalate"],
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exportedFrom: "manual",
    },
  };
}
