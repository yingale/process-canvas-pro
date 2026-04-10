/**
 * Automation Node definitions for the Studio Nodes Panel.
 * Each node maps to a Camunda External Task topic with specific I/O configuration.
 * 
 * Uses JSON Schema pattern: inputSchema, outputSchema, defaultConfig for
 * backend validation and Camunda worker integration.
 */
import type { ModuleConfigField } from "@/types/caseIr";

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  items?: { type: string };
  pattern?: string;
}

export interface JsonSchemaObject {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
}

export interface AutomationNodeDef {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  color: string;
  topic: string; // Camunda external task topic
  category: "communication" | "extraction" | "ai" | "notification" | "governance";
  version: string;
  inputSchema: JsonSchemaObject;
  outputSchema: JsonSchemaObject;
  defaultConfig: Record<string, unknown>;
  additionalOutputs?: NodeIoField[];
  // KEPT for backward compat — UI rendering in NodeConfigDialog & StepPropertiesPanel
  inputs: NodeIoField[];
  outputs: NodeIoField[];
  configFields: ModuleConfigField[];
}

export interface NodeIoField {
  name: string;
  type: "string" | "file" | "object" | "array";
  description: string;
}

export const AUTOMATION_NODES: AutomationNodeDef[] = [
  {
    id: "email-fetcher",
    name: "Email Fetcher",
    description: "Fetch emails from mailbox with filters, optionally download attachments",
    icon: "Mail",
    color: "hsl(213 88% 42%)",
    topic: "email-fetcher-fetch",
    category: "communication",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        emailId: { type: "string", description: "Email address / mailbox identifier" },
        subjectFilter: { type: "string", description: "Filter emails by subject (contains)" },
        bodyFilter: { type: "string", description: "Filter emails by body content" },
        downloadAttachment: { type: "boolean", description: "Whether to download email attachments", default: true },
        maxEmails: { type: "integer", description: "Maximum emails to fetch", default: 10, minimum: 1, maximum: 100 },
        moveAfterRead: { type: "string", description: "Action after reading email", enum: ["archive", "trash", "none", "custom-folder"], default: "archive" },
        outputVariable: { type: "string", description: "Variable name for downstream nodes", default: "emailFetcherResult" },
      },
      required: ["emailId", "outputVariable"],
    },
    outputSchema: {
      type: "object",
      properties: {
        emails: { type: "array", description: "List of fetched email objects", items: { type: "object" } },
        attachmentDocIds: { type: "array", description: "Document IDs of downloaded attachments", items: { type: "string" } },
        attachmentPaths: { type: "array", description: "File paths of downloaded attachments", items: { type: "string" } },
        emailCount: { type: "integer", description: "Total number of emails fetched" },
        fetchedAt: { type: "string", description: "ISO 8601 timestamp of fetch" },
      },
      required: [],
    },
    defaultConfig: {
      emailId: "",
      subjectFilter: "",
      bodyFilter: "",
      downloadAttachment: true,
      maxEmails: 10,
      moveAfterRead: "archive",
      outputVariable: "emailFetcherResult",
    },
    inputs: [],
    outputs: [
      { name: "emails", type: "array", description: "List of fetched email objects" },
      { name: "attachmentDocIds", type: "array", description: "Document IDs of downloaded attachments" },
      { name: "attachmentPaths", type: "array", description: "File paths of downloaded attachments" },
    ],
    configFields: [
      { key: "emailId", label: "Email ID / Mailbox", type: "string", required: true, hint: "e.g. user@company.com" },
      { key: "subjectFilter", label: "Subject Filter", type: "string", required: false, hint: "Filter emails by subject (contains)" },
      { key: "bodyFilter", label: "Body Filter", type: "string", required: false, hint: "Filter emails by body content" },
      { key: "downloadAttachment", label: "Download Attachments", type: "boolean", required: false, defaultValue: "true" },
      { key: "maxEmails", label: "Max Emails to Fetch", type: "number", required: false, defaultValue: "10", min: 1, max: 100 },
      { key: "moveAfterRead", label: "Move After Read", type: "select", required: false, defaultValue: "archive", options: ["archive", "trash", "none", "custom-folder"] },
      { key: "outputVariable", label: "Output Variable", type: "string", required: true, defaultValue: "emailFetcherResult", hint: "Variable name for downstream nodes" },
    ],
  },
  {
    id: "chunk-extractor",
    name: "Chunk Extractor",
    description: "Extract rows/chunks from a file (CSV, XLSX) for processing",
    icon: "FileSpreadsheet",
    color: "hsl(32 90% 48%)",
    topic: "chunk-extractor-execute",
    category: "extraction",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        inputVariable: { type: "string", description: "Variable from previous node (e.g. emailFetcherResult.attachmentPaths[0])" },
        chunkSize: { type: "integer", description: "Number of rows per chunk", default: 100, minimum: 1, maximum: 10000 },
        startRow: { type: "integer", description: "Row number to start extraction from", default: 1, minimum: 1 },
        hasHeader: { type: "boolean", description: "Whether the file has a header row", default: true },
        outputVariable: { type: "string", description: "Variable name for downstream nodes", default: "chunkExtractorResult" },
      },
      required: ["inputVariable", "chunkSize", "outputVariable"],
    },
    outputSchema: {
      type: "object",
      properties: {
        chunks: { type: "array", description: "Array of extracted data chunks", items: { type: "object" } },
        totalRows: { type: "integer", description: "Total number of rows in the file" },
        totalChunks: { type: "integer", description: "Number of chunks produced" },
        headers: { type: "array", description: "Column header names", items: { type: "string" } },
      },
      required: [],
    },
    defaultConfig: {
      inputVariable: "",
      chunkSize: 100,
      startRow: 1,
      hasHeader: true,
      outputVariable: "chunkExtractorResult",
    },
    inputs: [
      { name: "inputFile", type: "file", description: "File document ID or path from previous node" },
    ],
    outputs: [
      { name: "chunks", type: "array", description: "Array of extracted data chunks" },
      { name: "totalRows", type: "string", description: "Total number of rows in the file" },
    ],
    configFields: [
      { key: "inputVariable", label: "Input Variable", type: "string", required: true, hint: "Variable from previous node (e.g. emailFetcherResult.attachmentPaths[0])" },
      { key: "chunkSize", label: "Rows per Chunk", type: "number", required: true, defaultValue: "100", min: 1, max: 10000 },
      { key: "startRow", label: "Start Row", type: "number", required: false, defaultValue: "1", min: 1 },
      { key: "hasHeader", label: "File Has Header Row", type: "boolean", required: false, defaultValue: "true" },
      { key: "outputVariable", label: "Output Variable", type: "string", required: true, defaultValue: "chunkExtractorResult" },
    ],
  },
  {
    id: "ai-processor",
    name: "AI Processor",
    description: "Process data with AI using custom prompts and output formats",
    icon: "Brain",
    color: "hsl(268 62% 52%)",
    topic: "ai-processor-execute",
    category: "ai",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        inputVariable: { type: "string", description: "Variable from previous node (e.g. chunkExtractorResult.chunks)" },
        prompt: { type: "string", description: "AI prompt template. Use ${variable} for interpolation." },
        outputFormat: { type: "string", description: "Expected output format", enum: ["json", "csv", "text", "column-names"], default: "json" },
        model: { type: "string", description: "AI model to use", enum: ["auto", "gpt-4", "gpt-3.5", "gemini-pro"], default: "auto" },
        temperature: { type: "number", description: "Sampling temperature", default: 0.3, minimum: 0, maximum: 1 },
        outputVariable: { type: "string", description: "Variable name for downstream nodes", default: "aiProcessorResult" },
      },
      required: ["inputVariable", "prompt", "outputFormat", "outputVariable"],
    },
    outputSchema: {
      type: "object",
      properties: {
        aiResponse: { type: "object", description: "AI-generated response" },
        columnNames: { type: "array", description: "Extracted column names (when applicable)", items: { type: "string" } },
        tokensUsed: { type: "integer", description: "Total tokens consumed" },
        model: { type: "string", description: "Model used for processing" },
      },
      required: [],
    },
    defaultConfig: {
      inputVariable: "",
      prompt: "",
      outputFormat: "json",
      model: "auto",
      temperature: 0.3,
      outputVariable: "aiProcessorResult",
    },
    inputs: [
      { name: "inputData", type: "object", description: "Data from previous node to process" },
    ],
    outputs: [
      { name: "aiResponse", type: "object", description: "AI-generated response" },
      { name: "columnNames", type: "array", description: "Extracted column names (when applicable)" },
    ],
    configFields: [
      { key: "inputVariable", label: "Input Variable", type: "string", required: true, hint: "Variable from previous node (e.g. chunkExtractorResult.chunks)" },
      { key: "prompt", label: "AI Prompt", type: "multiline", required: true, hint: "Prompt template. Use ${variable} for interpolation." },
      { key: "outputFormat", label: "Output Format", type: "select", required: true, defaultValue: "json", options: ["json", "csv", "text", "column-names"] },
      { key: "model", label: "AI Model", type: "select", required: false, defaultValue: "auto", options: ["auto", "gpt-4", "gpt-3.5", "gemini-pro"] },
      { key: "temperature", label: "Temperature", type: "slider", required: false, defaultValue: "0.3", min: 0, max: 1, step: 0.1 },
      { key: "outputVariable", label: "Output Variable", type: "string", required: true, defaultValue: "aiProcessorResult" },
    ],
  },
  {
    id: "column-extractor",
    name: "File Column Extractor",
    description: "Extract specific columns from a file and create a new output file",
    icon: "Columns3",
    color: "hsl(152 68% 38%)",
    topic: "column-extractor-execute",
    category: "extraction",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        inputFileVariable: { type: "string", description: "Variable pointing to the source file" },
        columnsVariable: { type: "string", description: "Variable from AI processor with column names" },
        manualColumns: { type: "string", description: "Comma-separated column names (if not using variable)" },
        outputFormat: { type: "string", description: "Output file format", enum: ["csv", "xlsx", "json"], default: "csv" },
        includeHeader: { type: "boolean", description: "Include header row in output", default: true },
        outputVariable: { type: "string", description: "Variable name for downstream nodes", default: "columnExtractorResult" },
      },
      required: ["inputFileVariable", "outputFormat", "outputVariable"],
    },
    outputSchema: {
      type: "object",
      properties: {
        outputFile: { type: "string", description: "Path to the generated output file" },
        outputDocId: { type: "string", description: "Document ID of the output file" },
        extractedColumns: { type: "array", description: "Confirmed list of extracted column names", items: { type: "string" } },
        totalRows: { type: "integer", description: "Number of rows in output" },
      },
      required: [],
    },
    defaultConfig: {
      inputFileVariable: "",
      columnsVariable: "",
      manualColumns: "",
      outputFormat: "csv",
      includeHeader: true,
      outputVariable: "columnExtractorResult",
    },
    inputs: [
      { name: "inputFile", type: "file", description: "Original file to extract columns from" },
      { name: "columnNames", type: "array", description: "Column names to extract" },
    ],
    outputs: [
      { name: "outputFile", type: "file", description: "New file with extracted columns" },
      { name: "outputDocId", type: "string", description: "Document ID of the output file" },
    ],
    configFields: [
      { key: "inputFileVariable", label: "Input File Variable", type: "string", required: true, hint: "Variable pointing to the source file" },
      { key: "columnsVariable", label: "Columns Variable", type: "string", required: false, hint: "Variable from AI processor with column names" },
      { key: "manualColumns", label: "Manual Column Names", type: "string", required: false, hint: "Comma-separated column names (if not using variable)" },
      { key: "outputFormat", label: "Output File Format", type: "select", required: true, defaultValue: "csv", options: ["csv", "xlsx", "json"] },
      { key: "includeHeader", label: "Include Header Row", type: "boolean", required: false, defaultValue: "true" },
      { key: "outputVariable", label: "Output Variable", type: "string", required: true, defaultValue: "columnExtractorResult" },
    ],
  },
  {
    id: "email-notification",
    name: "Email Notification",
    description: "Send email notification with optional file attachments",
    icon: "Send",
    color: "hsl(199 80% 42%)",
    topic: "email-notification-send",
    category: "notification",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Comma-separated email addresses or ${variable}" },
        cc: { type: "string", description: "CC recipients" },
        subject: { type: "string", description: "Email subject. Use ${variable} for dynamic values." },
        body: { type: "string", description: "Email body (HTML supported). Use ${variable} for interpolation." },
        attachFileVariable: { type: "string", description: "Variable pointing to file from previous node" },
        fromAlias: { type: "string", description: "Display name for the sender" },
        priority: { type: "string", description: "Email priority", enum: ["low", "normal", "high"], default: "normal" },
        outputVariable: { type: "string", description: "Variable name for downstream nodes", default: "emailNotificationResult" },
      },
      required: ["to", "subject", "body", "outputVariable"],
    },
    outputSchema: {
      type: "object",
      properties: {
        sentStatus: { type: "string", description: "Email send status" },
        messageId: { type: "string", description: "Sent message ID" },
        recipients: { type: "integer", description: "Number of recipients" },
        attachmentCount: { type: "integer", description: "Number of attachments sent" },
        sentAt: { type: "string", description: "ISO 8601 timestamp of send" },
      },
      required: [],
    },
    defaultConfig: {
      to: "",
      cc: "",
      subject: "",
      body: "",
      attachFileVariable: "",
      fromAlias: "",
      priority: "normal",
      outputVariable: "emailNotificationResult",
    },
    inputs: [
      { name: "attachmentFile", type: "file", description: "File to attach (optional)" },
    ],
    outputs: [
      { name: "sentStatus", type: "string", description: "Email send status" },
      { name: "messageId", type: "string", description: "Sent message ID" },
    ],
    configFields: [
      { key: "to", label: "To (Recipients)", type: "string", required: true, hint: "Comma-separated email addresses or ${variable}" },
      { key: "cc", label: "CC", type: "string", required: false },
      { key: "subject", label: "Subject", type: "string", required: true, hint: "Email subject. Use ${variable} for dynamic values." },
      { key: "body", label: "Email Body", type: "multiline", required: true, hint: "Email body (HTML supported). Use ${variable} for interpolation." },
      { key: "attachFileVariable", label: "Attach File Variable", type: "string", required: false, hint: "Variable pointing to file from previous node" },
      { key: "fromAlias", label: "From Alias", type: "string", required: false, hint: "Display name for the sender" },
      { key: "outputVariable", label: "Output Variable", type: "string", required: true, defaultValue: "emailNotificationResult" },
    ],
  },
  {
    id: "approval",
    name: "Approval Gate",
    description: "Human review decision gate — approve to continue or reject to fail/reroute",
    icon: "ShieldCheck",
    color: "hsl(45 90% 48%)",
    topic: "approval-review",
    category: "governance",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        inputVariable: { type: "string", description: "Variable from previous node to present for review (e.g. aiProcessorResult)" },
        approverRole: { type: "string", description: "Persona/role that should review (from workflow personas)" },
        approverEmail: { type: "string", description: "Specific reviewer email (overrides role)" },
        approvalType: { type: "string", description: "Approval routing type", enum: ["single", "sequential", "parallel"], default: "single" },
        slaHours: { type: "integer", description: "Hours before auto-escalation", default: 24, minimum: 1, maximum: 720 },
        escalateTo: { type: "string", description: "Persona/email for escalation on SLA breach" },
        onReject: { type: "string", description: "Behaviour when reviewer rejects", enum: ["terminate", "reroute", "return"], default: "terminate" },
        rerouteTo: { type: "string", description: "Step ID to reroute to (when onReject = reroute)" },
        instructions: { type: "string", description: "Instructions shown to the reviewer in the task form" },
        outputVariable: { type: "string", description: "Variable name for downstream nodes", default: "approvalResult" },
      },
      required: ["inputVariable", "approverRole", "outputVariable"],
    },
    outputSchema: {
      type: "object",
      properties: {
        decision: { type: "string", description: "Reviewer decision: approved | rejected" },
        reviewerEmail: { type: "string", description: "Email of the person who decided" },
        comments: { type: "string", description: "Reviewer comments / reason" },
        decidedAt: { type: "string", description: "ISO 8601 timestamp of the decision" },
        escalated: { type: "boolean", description: "Whether the task was escalated before decision" },
      },
      required: [],
    },
    defaultConfig: {
      inputVariable: "",
      approverRole: "",
      approverEmail: "",
      approvalType: "single",
      slaHours: 24,
      escalateTo: "",
      onReject: "terminate",
      rerouteTo: "",
      instructions: "",
      outputVariable: "approvalResult",
    },
    inputs: [
      { name: "reviewData", type: "object", description: "Data from previous node to present for review" },
    ],
    outputs: [
      { name: "decision", type: "string", description: "approved or rejected" },
      { name: "reviewerEmail", type: "string", description: "Email of the reviewer" },
      { name: "comments", type: "string", description: "Reviewer comments" },
    ],
    configFields: [
      { key: "inputVariable", label: "Input Variable", type: "string", required: true, hint: "Variable from previous node (e.g. aiProcessorResult)" },
      { key: "approverRole", label: "Approver Role", type: "string", required: true, hint: "Persona/role for review (e.g. DataSteward)" },
      { key: "approverEmail", label: "Approver Email", type: "string", required: false, hint: "Specific reviewer email (overrides role)" },
      { key: "approvalType", label: "Approval Type", type: "select", required: false, defaultValue: "single", options: ["single", "sequential", "parallel"] },
      { key: "slaHours", label: "SLA (hours)", type: "number", required: false, defaultValue: "24", min: 1, max: 720 },
      { key: "escalateTo", label: "Escalate To", type: "string", required: false, hint: "Persona/email for escalation on SLA breach" },
      { key: "onReject", label: "On Reject", type: "select", required: false, defaultValue: "terminate", options: ["terminate", "reroute", "return"] },
      { key: "rerouteTo", label: "Reroute To Step", type: "string", required: false, hint: "Step ID when onReject = reroute" },
      { key: "instructions", label: "Reviewer Instructions", type: "multiline", required: false, hint: "Instructions shown in the review task form" },
      { key: "outputVariable", label: "Output Variable", type: "string", required: true, defaultValue: "approvalResult" },
    ],
  },
];

export function getNodeDef(nodeId: string): AutomationNodeDef | undefined {
  return AUTOMATION_NODES.find(n => n.id === nodeId);
}
