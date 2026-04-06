/**
 * CamundaTopicsDocsPage — Camunda External Task Workers, Topics & Variable Processing
 */
import ModuleDocLayout from "@/components/docs/ModuleDocLayout";
import { DocCard, CardContent, CardHeader, CardTitle } from "@/components/docs/DocCard";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative group/code">
      {label && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>}
      <pre className="bg-muted/50 border border-border rounded-lg p-4 text-[11px] leading-relaxed font-mono overflow-x-auto whitespace-pre-wrap">{code}</pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity inline-flex items-center gap-1 rounded border border-border bg-card/90 px-1.5 py-0.5 text-[9px] font-medium hover:bg-muted"
      >
        {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
      </button>
    </div>
  );
}

export default function CamundaTopicsDocsPage() {
  return (
    <ModuleDocLayout
      title="Camunda Topics & Processor — Technical Documentation"
      subtitle="Complete reference for External Task Workers, topic subscriptions, variable resolution engine, BPMN XML generation, error handling, and the end-to-end processing pipeline for all 5 automation nodes."
      badges={["Camunda 7", "External Tasks", "Worker Code", "Variable Resolution", "BPMN XML", "Error Handling", "Retry Strategy"]}
    >
      {/* ─── Section 1: Topic Registry ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">1. Topic Registry — All Camunda Topics</h2>
        <p className="text-sm text-muted-foreground">
          Each automation node maps to one Camunda External Task topic. Workers subscribe to these topics
          and execute business logic when tasks are fetched.
        </p>
        <DocCard>
          <CardContent className="pt-4">
            <CopyBlock label="Topic → Node Mapping" code={`┌──────────────────────────────┬─────────────────────────┬────────────────────┐
│ Topic Name                   │ Node Type               │ Category           │
├──────────────────────────────┼─────────────────────────┼────────────────────┤
│ email-fetcher-fetch          │ Email Fetcher            │ Communication      │
│ chunk-extractor-execute      │ Chunk Extractor          │ Data Processing    │
│ ai-processor-execute         │ AI Processor             │ Intelligence       │
│ column-extractor-execute     │ File Column Extractor    │ Data Processing    │
│ email-notification-send      │ Email Notification       │ Communication      │
└──────────────────────────────┴─────────────────────────┴────────────────────┘`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">Worker Bootstrap — Client Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Client Initialization" code={`import { Client, logger, Variables } from "camunda-external-task-client-js";

const camundaClient = new Client({
  baseUrl: process.env.CAMUNDA_REST_URL || "http://localhost:8080/engine-rest",
  use: logger,
  asyncResponseTimeout: 30000,  // long polling: 30s
  workerId: \`worker-\${process.env.HOSTNAME || "local"}-\${process.pid}\`,
  maxTasks: 10,                 // fetch up to 10 tasks per poll
  maxParallelExecutions: 5,     // concurrent task processing
  autoPoll: true,
  lockDuration: 60000,          // 60s lock per task
});

const API_BASE = process.env.NODE_API_URL || "http://localhost:3001";
const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

// Register all 5 workers
import "./workers/emailFetcherWorker";
import "./workers/chunkExtractorWorker";
import "./workers/aiProcessorWorker";
import "./workers/columnExtractorWorker";
import "./workers/emailNotificationWorker";

console.log("All 5 Camunda workers registered and polling...");`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 2: Worker Implementations ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">2. Worker Implementations — Full Code</h2>

        {/* Email Fetcher */}
        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">① Email Fetcher Worker</CardTitle>
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-[9px]">Topic: email-fetcher-fetch</Badge>
              <Badge variant="outline" className="text-[9px]">MS Graph API</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Implementation" code={`camundaClient.subscribe("email-fetcher-fetch", async ({ task, taskService }) => {
  const instanceId = task.variables.get("nodeInstanceId");
  const workflowId = task.variables.get("workflowId");
  const stepId     = task.variables.get("stepId");

  // 1. Fetch config from Node API
  const { config } = await fetchNodeConfig(workflowId, stepId, instanceId);
  // config = {
  //   emailId: "invoices@company.com",
  //   subjectFilter: "Invoice",
  //   bodyFilter: "",
  //   downloadAttachment: true,
  //   maxEmails: 10,
  //   moveAfterRead: "archive",
  //   outputVariable: "emailFetcherResult"
  // }

  // 2. Connect to mailbox via Core API (MS Graph)
  const emails = await coreApi.fetchEmails({
    mailbox: config.emailId,
    filters: {
      subject: config.subjectFilter || undefined,
      body: config.bodyFilter || undefined,
    },
    limit: config.maxEmails,
  });

  // 3. Download attachments if enabled
  let attachmentDocIds = [];
  let attachmentPaths = [];
  if (config.downloadAttachment) {
    for (const email of emails) {
      for (const att of email.attachments) {
        const doc = await coreApi.downloadAttachment(att.id);
        attachmentDocIds.push(doc.documentId);
        attachmentPaths.push(doc.filePath);
      }
    }
  }

  // 4. Move emails after read
  if (config.moveAfterRead !== "none") {
    await coreApi.moveEmails(emails.map(e => e.id), config.moveAfterRead);
  }

  // 5. Set output variable in Camunda process scope
  const result = {
    emails: emails.map(e => ({
      id: e.id, subject: e.subject, from: e.from,
      receivedAt: e.receivedAt, hasAttachments: e.attachments.length > 0,
    })),
    attachmentDocIds,
    attachmentPaths,
    fetchedAt: new Date().toISOString(),
    totalEmails: emails.length,
  };

  const vars = new Variables();
  vars.set(config.outputVariable, JSON.stringify(result));
  await taskService.complete(task, vars);
});`} />
            <CopyBlock label="Output Variable: emailFetcherResult" code={`{
  "emails": [
    {
      "id": "msg-abc123",
      "subject": "Invoice #2024-0312",
      "from": "vendor@example.com",
      "receivedAt": "2024-03-12T09:15:00Z",
      "hasAttachments": true
    }
  ],
  "attachmentDocIds": ["doc-001", "doc-002"],
  "attachmentPaths": ["/tmp/wf-001/invoice_march.xlsx", "/tmp/wf-001/receipt.pdf"],
  "fetchedAt": "2024-03-12T10:00:00Z",
  "totalEmails": 3
}`} />
          </CardContent>
        </DocCard>

        {/* Chunk Extractor */}
        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">② Chunk Extractor Worker</CardTitle>
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-[9px]">Topic: chunk-extractor-execute</Badge>
              <Badge variant="outline" className="text-[9px]">CSV/XLSX Parsing</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Implementation" code={`camundaClient.subscribe("chunk-extractor-execute", async ({ task, taskService }) => {
  const { config, inputMappings } = await fetchNodeConfig(
    task.variables.get("workflowId"),
    task.variables.get("stepId"),
    task.variables.get("nodeInstanceId")
  );
  // config = { chunkSize: 100, startRow: 1, hasHeader: true, outputVariable: "chunkExtractorResult" }

  // Input resolved by Camunda: \${emailFetcherResult.attachmentPaths[0]}
  const inputFilePath = task.variables.get("inputVariable");
  // = "/tmp/wf-001/invoice_march.xlsx"

  // Read file and extract chunks
  const fileData = await fileService.readFile(inputFilePath);
  const allRows = parseSpreadsheet(fileData, { hasHeader: config.hasHeader });
  
  const startIdx = (config.startRow || 1) - 1;
  const chunkSize = config.chunkSize || 100;
  const chunks = [];
  
  for (let i = startIdx; i < allRows.length; i += chunkSize) {
    chunks.push({
      chunkIndex: Math.floor(i / chunkSize),
      rows: allRows.slice(i, i + chunkSize),
      startRow: i + 1,
      endRow: Math.min(i + chunkSize, allRows.length),
    });
  }

  const result = {
    chunks,
    totalRows: allRows.length,
    totalChunks: chunks.length,
    headers: config.hasHeader ? allRows[0] : null,
    sourceFile: inputFilePath,
    processedAt: new Date().toISOString(),
  };

  const vars = new Variables();
  vars.set(config.outputVariable, JSON.stringify(result));
  await taskService.complete(task, vars);
});`} />
            <CopyBlock label="Output Variable: chunkExtractorResult" code={`{
  "chunks": [
    {
      "chunkIndex": 0,
      "rows": [["John", "Doe", "50000"], ["Jane", "Smith", "62000"]],
      "startRow": 1,
      "endRow": 100
    },
    {
      "chunkIndex": 1,
      "rows": [["Bob", "Wilson", "45000"]],
      "startRow": 101,
      "endRow": 200
    }
  ],
  "totalRows": 5000,
  "totalChunks": 50,
  "headers": ["FirstName", "LastName", "Salary"],
  "sourceFile": "/tmp/wf-001/invoice_march.xlsx",
  "processedAt": "2024-03-12T10:02:00Z"
}`} />
          </CardContent>
        </DocCard>

        {/* AI Processor */}
        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">③ AI Processor Worker</CardTitle>
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-[9px]">Topic: ai-processor-execute</Badge>
              <Badge variant="outline" className="text-[9px]">LLM Integration</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Implementation" code={`camundaClient.subscribe("ai-processor-execute", async ({ task, taskService }) => {
  const { config } = await fetchNodeConfig(
    task.variables.get("workflowId"),
    task.variables.get("stepId"),
    task.variables.get("nodeInstanceId")
  );
  // config = {
  //   prompt: "Analyze the following data and identify relevant column names...",
  //   outputFormat: "json" | "text" | "column-names" | "csv",
  //   model: "auto",
  //   temperature: 0.3,
  //   outputVariable: "aiProcessorResult"
  // }

  // Resolve input — Camunda already resolved \${chunkExtractorResult.chunks}
  const inputData = JSON.parse(task.variables.get("inputVariable"));

  // Build prompt with variable substitution
  let finalPrompt = config.prompt;
  finalPrompt = finalPrompt.replace(
    /\\$\\{([^}]+)\\}/g,
    (_, varName) => {
      const val = resolveVariable(varName, task.variables);
      return typeof val === "object" ? JSON.stringify(val) : String(val);
    }
  );

  // Call LLM
  const llmResponse = await aiService.complete({
    model: config.model === "auto" ? selectBestModel(inputData) : config.model,
    prompt: finalPrompt,
    temperature: config.temperature,
    responseFormat: config.outputFormat === "json" ? { type: "json_object" } : undefined,
  });

  // Parse response based on output format
  let parsedResult;
  if (config.outputFormat === "json") {
    parsedResult = JSON.parse(llmResponse.text);
  } else if (config.outputFormat === "column-names") {
    parsedResult = { columnNames: extractColumnNames(llmResponse.text) };
  } else if (config.outputFormat === "csv") {
    parsedResult = { csv: llmResponse.text };
  } else {
    parsedResult = { text: llmResponse.text };
  }

  const result = {
    ...parsedResult,
    model: llmResponse.model,
    tokensUsed: llmResponse.usage.totalTokens,
    processedAt: new Date().toISOString(),
  };

  const vars = new Variables();
  vars.set(config.outputVariable, JSON.stringify(result));
  await taskService.complete(task, vars);
});`} />
            <CopyBlock label="Output Variable: aiProcessorResult (column-names format)" code={`{
  "columnNames": ["FirstName", "LastName", "Salary", "Department"],
  "model": "gpt-4",
  "tokensUsed": 1250,
  "processedAt": "2024-03-12T10:05:00Z"
}`} />
            <CopyBlock label="Output Variable: aiProcessorResult (json format)" code={`{
  "summary": "The data contains employee records with salary information...",
  "categories": ["payroll", "hr"],
  "confidence": 0.95,
  "model": "gpt-4",
  "tokensUsed": 890,
  "processedAt": "2024-03-12T10:05:00Z"
}`} />
          </CardContent>
        </DocCard>

        {/* Column Extractor */}
        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">④ File Column Extractor Worker</CardTitle>
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-[9px]">Topic: column-extractor-execute</Badge>
              <Badge variant="outline" className="text-[9px]">CSV/XLSX Output</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Implementation" code={`camundaClient.subscribe("column-extractor-execute", async ({ task, taskService }) => {
  const { config } = await fetchNodeConfig(
    task.variables.get("workflowId"),
    task.variables.get("stepId"),
    task.variables.get("nodeInstanceId")
  );
  // config = { outputFormat: "csv", includeHeader: true, outputVariable: "columnExtractorResult" }

  // Resolve two inputs:
  // 1. Source file from Email Fetcher (step-1)
  const sourceFilePath = task.variables.get("inputFileVariable");
  // = "/tmp/wf-001/invoice_march.xlsx"

  // 2. Column names from AI Processor (step-3)
  let columnNames;
  const columnsVar = task.variables.get("columnsVariable");
  if (columnsVar) {
    const aiResult = JSON.parse(columnsVar);
    columnNames = aiResult.columnNames || aiResult;
  } else if (config.manualColumns) {
    columnNames = config.manualColumns.split(",").map(c => c.trim());
  }

  // Read source file and extract specified columns
  const fileData = await fileService.readFile(sourceFilePath);
  const allRows = parseSpreadsheet(fileData, { hasHeader: true });
  const headers = allRows[0];
  
  const colIndices = columnNames.map(name => 
    headers.findIndex(h => h.toLowerCase() === name.toLowerCase())
  ).filter(i => i !== -1);

  const extractedRows = allRows.map(row => colIndices.map(i => row[i]));

  // Create output file
  const outputFileName = \`extracted_\${Date.now()}.\${config.outputFormat}\`;
  const outputPath = \`/tmp/\${task.variables.get("workflowId")}/\${outputFileName}\`;
  
  if (config.outputFormat === "csv") {
    await fileService.writeCsv(outputPath, extractedRows, { includeHeader: config.includeHeader });
  } else if (config.outputFormat === "xlsx") {
    await fileService.writeXlsx(outputPath, extractedRows);
  } else {
    await fileService.writeJson(outputPath, extractedRows);
  }

  const docId = await documentStore.upload(outputPath);

  const result = {
    outputFile: outputPath,
    outputDocId: docId,
    extractedColumns: columnNames,
    totalRows: extractedRows.length - (config.includeHeader ? 1 : 0),
    outputFormat: config.outputFormat,
    processedAt: new Date().toISOString(),
  };

  const vars = new Variables();
  vars.set(config.outputVariable, JSON.stringify(result));
  await taskService.complete(task, vars);
});`} />
            <CopyBlock label="Output Variable: columnExtractorResult" code={`{
  "outputFile": "/tmp/wf-001/extracted_1710245100.csv",
  "outputDocId": "doc-005",
  "extractedColumns": ["FirstName", "LastName", "Salary", "Department"],
  "totalRows": 4999,
  "outputFormat": "csv",
  "processedAt": "2024-03-12T10:08:00Z"
}`} />
          </CardContent>
        </DocCard>

        {/* Email Notification */}
        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">⑤ Email Notification Worker</CardTitle>
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-[9px]">Topic: email-notification-send</Badge>
              <Badge variant="outline" className="text-[9px]">MS Graph API</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Implementation" code={`camundaClient.subscribe("email-notification-send", async ({ task, taskService }) => {
  const { config } = await fetchNodeConfig(
    task.variables.get("workflowId"),
    task.variables.get("stepId"),
    task.variables.get("nodeInstanceId")
  );
  // config = {
  //   to: "manager@company.com,team-lead@company.com",
  //   cc: "",
  //   subject: "Processed Data Report - \${emailFetcherResult.emails[0].subject}",
  //   body: "<h1>Report Ready</h1><p>Extracted \${columnExtractorResult.totalRows} rows...</p>",
  //   attachFileVariable: "columnExtractorResult.outputFile",
  //   fromAlias: "Automation Bot",
  //   outputVariable: "emailNotificationResult"
  // }

  // Resolve template variables in subject and body
  const subject = resolveTemplateVars(config.subject, task.variables);
  const body = resolveTemplateVars(config.body, task.variables);

  // Resolve attachment file path
  let attachments = [];
  if (config.attachFileVariable) {
    const filePath = resolveVariable(config.attachFileVariable, task.variables);
    attachments.push({ path: filePath, filename: path.basename(filePath) });
  }

  // Send email via Core API (MS Graph)
  const sendResult = await coreApi.sendEmail({
    from: config.fromAlias || "noreply@company.com",
    to: config.to.split(",").map(e => e.trim()),
    cc: config.cc ? config.cc.split(",").map(e => e.trim()) : [],
    subject,
    htmlBody: body,
    attachments,
  });

  const result = {
    sentStatus: sendResult.status,
    messageId: sendResult.messageId,
    recipients: config.to.split(",").length,
    attachmentCount: attachments.length,
    sentAt: new Date().toISOString(),
  };

  const vars = new Variables();
  vars.set(config.outputVariable, JSON.stringify(result));
  await taskService.complete(task, vars);
});`} />
            <CopyBlock label="Output Variable: emailNotificationResult" code={`{
  "sentStatus": "sent",
  "messageId": "AAMkAGI2TG93AAA=",
  "recipients": 2,
  "attachmentCount": 1,
  "sentAt": "2024-03-12T10:10:00Z"
}`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 3: Variable Resolution Engine ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">3. Variable Resolution Engine</h2>
        <p className="text-sm text-muted-foreground">
          The variable resolution engine is the core utility used by all workers to resolve <code>{"${variable.path}"}</code> references
          against the Camunda process scope. It supports dot-notation, array indexing, and template string substitution.
        </p>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">resolveVariable() — Core Utility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Implementation" code={`/**
 * Resolves a dot-notation variable path against Camunda process variables.
 * 
 * Examples:
 *   "emailFetcherResult.attachmentPaths[0]"  → "/tmp/wf-001/invoice.xlsx"
 *   "aiProcessorResult.columnNames"           → ["FirstName", "LastName"]
 *   "chunkExtractorResult.totalRows"          → 5000
 */
function resolveVariable(path: string, variables: Variables): any {
  const parts = path.split(".");
  const rootVarName = parts[0];
  
  // Get root variable from Camunda process scope
  let value = variables.get(rootVarName);
  
  // If stored as JSON string, parse it
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch {}
  }
  
  // Traverse nested path
  for (let i = 1; i < parts.length; i++) {
    if (value == null) return undefined;
    
    const part = parts[i];
    // Handle array indexing: "attachmentPaths[0]"
    const arrayMatch = part.match(/^(\\w+)\\[(\\d+)\\]$/);
    if (arrayMatch) {
      value = value[arrayMatch[1]];
      value = value?.[parseInt(arrayMatch[2])];
    } else {
      value = value[part];
    }
  }
  
  return value;
}`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">resolveTemplateVars() — Template String Substitution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Implementation" code={`/**
 * Resolves all \${...} placeholders in a template string.
 * Used for email subject, body, and AI prompt templates.
 * 
 * Example input:
 *   "Report for \${emailFetcherResult.emails[0].subject} — \${columnExtractorResult.totalRows} rows"
 * 
 * Example output:
 *   "Report for Invoice #2024-0312 — 4999 rows"
 */
function resolveTemplateVars(template: string, variables: Variables): string {
  return template.replace(/\\$\\{([^}]+)\\}/g, (_, varPath) => {
    const resolved = resolveVariable(varPath, variables);
    if (resolved == null) return "";
    return typeof resolved === "object" ? JSON.stringify(resolved) : String(resolved);
  });
}`} />
            <CopyBlock label="Resolution Examples" code={`// Simple field access
"\${emailFetcherResult.totalEmails}"  →  "3"

// Array indexing
"\${emailFetcherResult.attachmentPaths[0]}"  →  "/tmp/wf-001/invoice.xlsx"

// Nested object
"\${emailFetcherResult.emails[0].subject}"  →  "Invoice #2024-0312"

// Object serialization (auto JSON.stringify)
"\${aiProcessorResult.columnNames}"  →  '["FirstName","LastName","Salary"]'

// Undefined → empty string
"\${nonExistent.field}"  →  ""`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 4: Variable Flow Diagram ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">4. Variable Flow — End-to-End 5-Node Chain</h2>
        <DocCard>
          <CardContent className="pt-4">
            <CopyBlock label="Complete Variable Flow Through Process Scope" code={`┌─────────────────────────────────────────────────────────────────────┐
│                    CAMUNDA PROCESS VARIABLE SCOPE                   │
│                                                                     │
│  Step 1 (Email Fetcher) WRITES:                                    │
│    emailFetcherResult = {                                          │
│      emails: [...],                                                │
│      attachmentPaths: ["/tmp/wf-001/invoice.xlsx"],                │
│      attachmentDocIds: ["doc-001"]                                 │
│    }                                                                │
│                                          ↓                          │
│  Step 2 (Chunk Extractor) READS:                                   │
│    inputVariable ← \${emailFetcherResult.attachmentPaths[0]}       │
│  Step 2 WRITES:                                                    │
│    chunkExtractorResult = {                                        │
│      chunks: [{rows: [...]}, ...],                                 │
│      totalRows: 5000, headers: ["Name","Salary"]                   │
│    }                                                                │
│                                          ↓                          │
│  Step 3 (AI Processor) READS:                                      │
│    inputVariable ← \${chunkExtractorResult.chunks}                 │
│  Step 3 WRITES:                                                    │
│    aiProcessorResult = {                                           │
│      columnNames: ["FirstName","LastName","Salary"],                │
│      model: "gpt-4", tokensUsed: 1250                              │
│    }                                                                │
│                                          ↓                          │
│  Step 4 (Column Extractor) READS:                                  │
│    inputFileVariable ← \${emailFetcherResult.attachmentPaths[0]}   │
│    columnsVariable   ← \${aiProcessorResult.columnNames}           │
│  Step 4 WRITES:                                                    │
│    columnExtractorResult = {                                       │
│      outputFile: "/tmp/wf-001/extracted.csv",                      │
│      outputDocId: "doc-005", totalRows: 4999                       │
│    }                                                                │
│                                          ↓                          │
│  Step 5 (Email Notification) READS:                                │
│    attachFileVariable ← \${columnExtractorResult.outputFile}       │
│    subject template   ← "Report: \${emailFetcherResult.emails...}" │
│    body template      ← "Extracted \${columnExtractorResult...}"   │
│  Step 5 WRITES:                                                    │
│    emailNotificationResult = {                                     │
│      sentStatus: "sent", messageId: "AAMk..."                      │
│    }                                                                │
└─────────────────────────────────────────────────────────────────────┘`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 5: BPMN XML Generation ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">5. BPMN XML Generation — How Topics & Variables Are Set</h2>
        <p className="text-sm text-muted-foreground">
          During BPMN export, each automation node generates a ServiceTask with <code>camunda:type="external"</code>,
          the topic name, and inputParameter/outputParameter elements for config and I/O mappings.
        </p>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">Email Fetcher — Generated BPMN XML</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock code={`<bpmn:serviceTask id="step-1" name="Fetch Emails"
    camunda:type="external"
    camunda:topic="email-fetcher-fetch">
  <bpmn:extensionElements>
    <camunda:inputOutput>
      <!-- System variables (always injected) -->
      <camunda:inputParameter name="nodeInstanceId">inst-001</camunda:inputParameter>
      <camunda:inputParameter name="workflowId">wf-001</camunda:inputParameter>
      <camunda:inputParameter name="stepId">step-1</camunda:inputParameter>
      
      <!-- Config fields from nodeInstanceConfig.config -->
      <camunda:inputParameter name="emailId">invoices@company.com</camunda:inputParameter>
      <camunda:inputParameter name="subjectFilter">Invoice</camunda:inputParameter>
      <camunda:inputParameter name="downloadAttachment">true</camunda:inputParameter>
      <camunda:inputParameter name="maxEmails">10</camunda:inputParameter>
      <camunda:inputParameter name="moveAfterRead">archive</camunda:inputParameter>
      <camunda:inputParameter name="outputVariable">emailFetcherResult</camunda:inputParameter>

      <!-- Output mapping — write result to process scope -->
      <camunda:outputParameter name="emailFetcherResult">
        \${emailFetcherResult}
      </camunda:outputParameter>
    </camunda:inputOutput>
  </bpmn:extensionElements>
</bpmn:serviceTask>`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">Chunk Extractor — Generated BPMN XML (with input from previous step)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock code={`<bpmn:serviceTask id="step-2" name="Extract Chunks"
    camunda:type="external"
    camunda:topic="chunk-extractor-execute">
  <bpmn:extensionElements>
    <camunda:inputOutput>
      <!-- System variables -->
      <camunda:inputParameter name="nodeInstanceId">inst-002</camunda:inputParameter>
      <camunda:inputParameter name="workflowId">wf-001</camunda:inputParameter>
      <camunda:inputParameter name="stepId">step-2</camunda:inputParameter>

      <!-- Input mapping from previous step (resolved at runtime by Camunda) -->
      <camunda:inputParameter name="inputVariable">
        \${emailFetcherResult.attachmentPaths[0]}
      </camunda:inputParameter>

      <!-- Config fields -->
      <camunda:inputParameter name="chunkSize">100</camunda:inputParameter>
      <camunda:inputParameter name="startRow">1</camunda:inputParameter>
      <camunda:inputParameter name="hasHeader">true</camunda:inputParameter>
      <camunda:inputParameter name="outputVariable">chunkExtractorResult</camunda:inputParameter>

      <!-- Output mapping -->
      <camunda:outputParameter name="chunkExtractorResult">
        \${chunkExtractorResult}
      </camunda:outputParameter>
    </camunda:inputOutput>
  </bpmn:extensionElements>
</bpmn:serviceTask>`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">BPMN Generation Logic — Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="How the Studio generates BPMN XML from node configs" code={`function generateServiceTaskXml(step, nodeConfig) {
  const { nodeId, config, inputMappings, outputMappings } = nodeConfig;
  const nodeDef = nodeRegistry[nodeId]; // e.g., { topic: "email-fetcher-fetch", ... }
  
  let xml = \`<bpmn:serviceTask id="\${step.id}" name="\${step.name}"
    camunda:type="external"
    camunda:topic="\${nodeDef.topic}">
  <bpmn:extensionElements>
    <camunda:inputOutput>\n\`;

  // 1. Always inject system variables
  xml += \`      <camunda:inputParameter name="nodeInstanceId">\${nodeConfig.id}</camunda:inputParameter>\n\`;
  xml += \`      <camunda:inputParameter name="workflowId">\${nodeConfig.workflowId}</camunda:inputParameter>\n\`;
  xml += \`      <camunda:inputParameter name="stepId">\${step.id}</camunda:inputParameter>\n\`;

  // 2. Inject input mappings (references to previous step outputs)
  for (const mapping of inputMappings) {
    xml += \`      <camunda:inputParameter name="\${mapping.target}">\\${\${mapping.source}}</camunda:inputParameter>\n\`;
  }

  // 3. Inject all config fields
  for (const [key, value] of Object.entries(config)) {
    xml += \`      <camunda:inputParameter name="\${key}">\${value}</camunda:inputParameter>\n\`;
  }

  // 4. Inject output mappings
  for (const mapping of outputMappings) {
    xml += \`      <camunda:outputParameter name="\${mapping.target}">\\${\${mapping.source}}</camunda:outputParameter>\n\`;
  }

  xml += \`    </camunda:inputOutput>
  </bpmn:extensionElements>
</bpmn:serviceTask>\`;

  return xml;
}`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 6: fetchNodeConfig Helper ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">6. fetchNodeConfig() — Shared Worker Helper</h2>
        <DocCard>
          <CardContent className="pt-4 space-y-3">
            <CopyBlock label="Implementation" code={`/**
 * Fetches node instance configuration from the Node API.
 * Called by every worker after receiving a task from Camunda.
 * 
 * Flow: Camunda fetchAndLock → Worker receives task → Worker calls this → Gets config → Executes
 */
async function fetchNodeConfig(
  workflowId: string, 
  stepId: string, 
  instanceId: string
): Promise<{
  config: Record<string, any>;
  inputMappings: Array<{ source: string; target: string; sourceStep: string }>;
  outputMappings: Array<{ source: string; target: string }>;
}> {
  const response = await fetch(
    \`\${API_BASE}/api/workflows/\${workflowId}/steps/\${stepId}/nodes/\${instanceId}\`,
    { headers: { Authorization: \`Bearer \${SERVICE_TOKEN}\` } }
  );
  
  if (!response.ok) {
    throw new ConfigNotFoundError(
      \`Failed to fetch node config: \${response.status} for instance \${instanceId}\`
    );
  }
  
  return response.json();
}

// Usage in any worker:
const { config, inputMappings, outputMappings } = await fetchNodeConfig(wfId, stepId, instId);
// config.emailId        → "invoices@company.com"
// inputMappings[0]      → { source: "emailFetcherResult.attachmentPaths[0]", target: "inputVariable", sourceStep: "step-1" }
// outputMappings[0]     → { source: "emailFetcherResult", target: "emailFetcherResult" }`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 7: Error Handling ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">7. Error Handling & Retry Strategy</h2>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">Structured Error Handling Pattern</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Error Classification & Handling" code={`// Every worker wraps execution in try/catch with structured error handling

try {
  // ... worker logic ...
  await taskService.complete(task, processVars);
} catch (err) {

  if (err instanceof ConfigNotFoundError) {
    // ❌ Permanent failure — don't retry, create incident
    await taskService.handleFailure(task, {
      errorMessage: "Node configuration not found",
      errorDetails: \`instanceId=\${instanceId} not found in API\`,
      retries: 0,           // → Creates Camunda Incident immediately
      retryTimeout: 0,
    });

  } else if (err instanceof VariableResolutionError) {
    // ❌ Variable from previous step not available or invalid path
    await taskService.handleFailure(task, {
      errorMessage: \`Variable resolution failed: \${err.variablePath}\`,
      errorDetails: err.stack,
      retries: 0,
      retryTimeout: 0,
    });

  } else if (err instanceof ExternalServiceError) {
    // ⟳ Transient failure (API timeout, rate limit) — retry with backoff
    const remainingRetries = (task.retries ?? 3) - 1;
    await taskService.handleFailure(task, {
      errorMessage: err.message,
      errorDetails: err.stack,
      retries: remainingRetries,
      retryTimeout: remainingRetries > 1 ? 10000 : 30000,  // exponential backoff
    });

  } else {
    // ⚠ Unknown error — retry once then create incident
    await taskService.handleFailure(task, {
      errorMessage: err.message,
      errorDetails: err.stack,
      retries: Math.min((task.retries ?? 1) - 1, 0),
      retryTimeout: 5000,
    });
  }
}`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">BPMN Error Events — Business-Level Errors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Business Error Codes" code={`// Workers throw BPMN errors for business-level handling
// These are caught by Error Boundary Events in the BPMN diagram

// Email Fetcher
if (emails.length === 0) {
  await taskService.handleBpmnError(task, "NO_EMAILS_FOUND", 
    "No emails matched the configured filters");
  return;  // → Camunda routes to Error Boundary Event → alternative path
}

// AI Processor
if (llmResponse.tokensUsed > MAX_TOKEN_BUDGET) {
  await taskService.handleBpmnError(task, "TOKEN_BUDGET_EXCEEDED",
    \`Used \${llmResponse.tokensUsed} tokens, budget is \${MAX_TOKEN_BUDGET}\`);
  return;
}

// Column Extractor
if (colIndices.every(i => i === -1)) {
  await taskService.handleBpmnError(task, "NO_COLUMNS_MATCHED",
    \`None of the requested columns found in file headers\`);
  return;
}

// Email Notification
if (sendResult.status === "bounced") {
  await taskService.handleBpmnError(task, "EMAIL_DELIVERY_FAILED",
    \`Email bounced for recipients: \${sendResult.bouncedAddresses.join(", ")}\`);
  return;
}`} />
            <CopyBlock label="Error Code Registry" code={`┌────────────────────────────┬───────────────────────────┬─────────────────────────────┐
│ Error Code                 │ Worker                    │ Description                 │
├────────────────────────────┼───────────────────────────┼─────────────────────────────┤
│ NO_EMAILS_FOUND            │ Email Fetcher             │ No emails match filters     │
│ ATTACHMENT_DOWNLOAD_FAILED │ Email Fetcher             │ File download failed        │
│ FILE_READ_ERROR            │ Chunk Extractor           │ Cannot read input file      │
│ INVALID_FILE_FORMAT        │ Chunk Extractor           │ Unsupported file type       │
│ LLM_API_ERROR              │ AI Processor              │ LLM provider returned error │
│ TOKEN_BUDGET_EXCEEDED      │ AI Processor              │ Token usage over budget     │
│ PARSE_OUTPUT_FAILED        │ AI Processor              │ Cannot parse LLM response   │
│ NO_COLUMNS_MATCHED         │ Column Extractor          │ No headers match columns    │
│ OUTPUT_FILE_WRITE_FAILED   │ Column Extractor          │ Cannot write output file    │
│ EMAIL_DELIVERY_FAILED      │ Email Notification        │ Email bounced / rejected    │
│ INVALID_RECIPIENTS         │ Email Notification        │ Invalid email addresses     │
└────────────────────────────┴───────────────────────────┴─────────────────────────────┘`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 8: Runtime Sequence ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">8. Runtime Execution Sequence</h2>
        <DocCard>
          <CardContent className="pt-4">
            <CopyBlock label="Step-by-step: What happens when Camunda reaches a Service Task" code={`┌───────────────────────────────────────────────────────────────────┐
│              RUNTIME EXECUTION — SINGLE SERVICE TASK              │
│                                                                   │
│  1. Camunda Engine reaches ServiceTask in BPMN process           │
│     ↓                                                             │
│  2. Engine evaluates camunda:inputParameter expressions           │
│     e.g. \${emailFetcherResult.attachmentPaths[0]}                │
│     → resolves against current process variable scope             │
│     ↓                                                             │
│  3. Engine creates External Task with topic + resolved variables  │
│     topic = "chunk-extractor-execute"                             │
│     variables = { inputVariable: "/tmp/wf-001/invoice.xlsx", ... }│
│     ↓                                                             │
│  4. Worker polls: POST /engine-rest/external-task/fetchAndLock    │
│     { workerId: "worker-1", topics: ["chunk-extractor-execute"] } │
│     ↓                                                             │
│  5. Worker receives task with pre-resolved input variables        │
│     task.variables.get("inputVariable") = "/tmp/.../invoice.xlsx" │
│     task.variables.get("nodeInstanceId") = "inst-002"             │
│     ↓                                                             │
│  6. Worker calls Node API: GET /api/workflows/:wfId/steps/:sId/  │
│     nodes/:instId → gets config + I/O mappings                    │
│     ↓                                                             │
│  7. Worker executes business logic using config + input data      │
│     ↓                                                             │
│  8. Worker completes: POST /engine-rest/external-task/:id/complete│
│     { variables: { chunkExtractorResult: "{...}" } }              │
│     ↓                                                             │
│  9. Engine evaluates camunda:outputParameter                      │
│     → writes worker output to process variable scope              │
│     ↓                                                             │
│  10. Engine moves to next task in BPMN sequence flow              │
│      (next task can access chunkExtractorResult)                  │
└───────────────────────────────────────────────────────────────────┘`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">Full 5-Node Chain — Runtime Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock code={`T=0    Camunda deploys process and starts instance
T=1    Engine reaches step-1 → creates External Task (topic: email-fetcher-fetch)
T=2    Email Fetcher worker polls → receives task
T=3    Worker calls GET /api/workflows/wf-001/steps/step-1/nodes/inst-001
T=4    Worker fetches emails via MS Graph → downloads attachments
T=5    Worker completes → sets emailFetcherResult in process scope
T=6    Engine resolves \${emailFetcherResult.attachmentPaths[0]} for step-2 input
T=7    Engine reaches step-2 → creates External Task (topic: chunk-extractor-execute)
T=8    Chunk Extractor worker polls → receives task with inputVariable resolved
T=9    Worker reads file → splits into 100-row chunks
T=10   Worker completes → sets chunkExtractorResult in process scope
T=11   Engine resolves \${chunkExtractorResult.chunks} for step-3 input
T=12   Engine reaches step-3 → creates External Task (topic: ai-processor-execute)
T=13   AI Processor worker polls → receives task
T=14   Worker builds prompt → calls LLM → parses column names
T=15   Worker completes → sets aiProcessorResult in process scope
T=16   Engine resolves \${aiProcessorResult.columnNames} + \${emailFetcherResult.attachmentPaths[0]}
T=17   Engine reaches step-4 → creates External Task (topic: column-extractor-execute)
T=18   Column Extractor worker polls → receives task with both inputs
T=19   Worker extracts columns → creates output file → uploads to doc store
T=20   Worker completes → sets columnExtractorResult in process scope
T=21   Engine resolves template vars in step-5 subject/body
T=22   Engine reaches step-5 → creates External Task (topic: email-notification-send)
T=23   Email Notification worker polls → sends email with attachment
T=24   Worker completes → sets emailNotificationResult
T=25   Process instance completes ✓`} />
          </CardContent>
        </DocCard>
      </section>
    </ModuleDocLayout>
  );
}
