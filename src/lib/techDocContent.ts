export const TECH_DOC_CONTENT = `# Technical Design Document: Reusable Automation Module Library

## Module Library Overview

| # | Module | Category | Icon | Camunda Topics | Purpose |
|---|--------|----------|------|----------------|---------|
| 1 | Email Reader | Communication | mail | email-reader-fetch, email-reader-download-attachments | Read emails from a mailbox via Core API (MS Graph), optionally download attachments |
| 2 | Data Extractor | Data Processing | zap | data-extractor-load, data-extractor-parse | Parse CSV/XLSX files from upstream variable or UI upload, extract specific columns/rows |
| 3 | AI Processor | Intelligence | zap | ai-processor-prepare, ai-processor-execute, ai-processor-format | Run LLM prompts against input data, produce structured output |
| 4 | Send Email Notification | Communication | mail | send-email-prepare, send-email-dispatch | Send email via Core API with templates, variable substitution, optional attachments |
| 5 | Form Builder | User Interaction | form-input | form-render (user task), form-validate | Attach dynamic forms to user steps; supports existing templates, new creation, or API-driven schema |
| 6 | Approval / Reviewer | Governance | shield | approval-submit, approval-review (user task), approval-escalate | Enterprise approval workflow with configurable levels, escalation, and auto-approve conditions |

---

## Architecture

\`\`\`
┌──────────────────────────────────────────────────────────┐
│  React UI (Workflow Studio)                              │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ ModulePicker     │  │ ModuleConfigPanel             │  │
│  │ (categorized     │  │ (dynamic form rendered from   │  │
│  │  dropdown)       │  │  config_schema per instance)  │  │
│  └────────┬────────┘  └──────────────┬───────────────┘  │
│           │ clone steps + moduleRef   │ save instanceConfig│
│           ▼                           ▼                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │ CaseIR (in-memory JSON)                            │  │
│  │ stages[].groups[].steps[].moduleRef.instanceConfig │  │
│  └────────────────────┬───────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────┘
                        │ BPMN Export
                        ▼
┌──────────────────────────────────────────────────────────┐
│  BPMN XML                                                │
│  <serviceTask camunda:type="external"                    │
│               camunda:topic="email-reader-fetch">        │
│    <camunda:inputParameter name="emailId">               │
│      invoices@company.com                                │
│    </camunda:inputParameter>                             │
│  </serviceTask>                                          │
└──────────────────────┬───────────────────────────────────┘
                       │ deployed to
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Camunda Engine                                          │
│  External Task Workers (Node.js)                         │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ email-reader-*   │  │ data-extractor-*             │ │
│  │ send-email-*     │  │ ai-processor-*               │ │
│  │ form-render/val  │  │ approval-submit/review/esc   │ │
│  └────────┬─────────┘  └──────────────┬───────────────┘ │
└───────────┼───────────────────────────┼─────────────────┘
            │                           │
            ▼                           ▼
┌──────────────────────┐  ┌─────────────────────────────┐
│  Core API (Internal) │  │  LLM API / File Storage     │
│  POST /core/email/*  │  │  OpenAI / Azure / local     │
│  MS Graph SDK        │  │                             │
└──────────────────────┘  └─────────────────────────────┘
\`\`\`

---

## Module 1: Email Reader

**Purpose:** Connect to a mailbox via the internal Core API (which uses MS Graph), fetch emails matching filters, and optionally download attachments. No IMAP/SMTP/port/protocol config needed — the Core API handles authentication centrally.

### Config Schema (UI Fields)

| Field | Group | Type | Required | Default | Hint |
|-------|-------|------|----------|---------|------|
| emailId | Mailbox | string | yes | — | Mailbox address to read (e.g. invoices@company.com) |
| folder | Mailbox | string | no | Inbox | Folder name: Inbox, Sent Items, or custom |
| maxEmails | Filters | number | no | 10 | How many emails to fetch per run |
| unreadOnly | Filters | boolean | no | true | Only unread messages |
| subjectFilter | Filters | string | no | — | Keyword to match in subject |
| senderFilter | Filters | string | no | — | Filter by sender email address |
| downloadAttachments | Attachments | boolean | no | true | Download file attachments |
| attachmentTypes | Attachments | string | no | — | Allowed types: csv,pdf,xlsx (empty = all) |
| outputVariable | Output | string | yes | emailReaderOutput | Process variable name for chaining |

### Steps (Camunda External Tasks)

| Step | Name | Type | Topic | Description |
|------|------|------|-------|-------------|
| 1 | Fetch Emails | automation | email-reader-fetch | Calls POST /core/email/fetch with config. Returns email list. |
| 2 | Download Attachments | automation | email-reader-download-attachments | Calls POST /core/email/attachments. Downloads files to temp storage. |

### Core API Contract

**POST /core/email/fetch**
\`\`\`json
// Request
{
  "emailId": "invoices@company.com",
  "folder": "Inbox",
  "maxEmails": 10,
  "unreadOnly": true,
  "subjectFilter": "Invoice",
  "senderFilter": ""
}

// Response
{
  "emails": [
    {
      "id": "msgId123",
      "from": "vendor@partner.com",
      "subject": "Invoice #4521",
      "bodyPreview": "Please find attached...",
      "receivedAt": "2025-03-17T10:30:00Z",
      "hasAttachments": true
    }
  ],
  "totalFetched": 1
}
\`\`\`

**POST /core/email/attachments**
\`\`\`json
// Request
{ "emailId": "invoices@company.com", "messageIds": ["msgId123"], "attachmentTypes": "csv,pdf" }

// Response
{
  "attachments": [
    {
      "emailId": "msgId123",
      "filename": "invoice_4521.pdf",
      "storagePath": "/temp/run_abc/invoice_4521.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 24500
    }
  ]
}
\`\`\`

### Output Variable Shape
\`\`\`json
{
  "emails": [{ "id": "...", "from": "...", "subject": "...", "bodyPreview": "...", "receivedAt": "...", "hasAttachments": true }],
  "attachments": [{ "emailId": "...", "filename": "report.csv", "storagePath": "/temp/run_abc/report.csv", "mimeType": "text/csv", "sizeBytes": 24500 }],
  "totalFetched": 1
}
\`\`\`

---

## Module 2: Data Extractor

**Purpose:** Parse structured data from CSV/XLSX files. Input can come from an upstream module's output variable (e.g. Email Reader's attachments) or from a file uploaded via UI. Extract specific columns and limit rows.

### Config Schema (UI Fields)

| Field | Group | Type | Required | Default | Hint |
|-------|-------|------|----------|---------|------|
| inputSource | Input | select (variable / upload) | no | variable | Where the file comes from |
| inputVariable | Input | string | no | emailReaderOutput.attachments[0] | Variable path when source=variable |
| fileFormat | Input | select (csv / xlsx / auto-detect) | no | auto-detect | Expected format |
| sheetName | Input | string | no | — | XLSX sheet name (empty = first) |
| hasHeader | Parsing | boolean | no | true | First row is header |
| delimiter | Parsing | string | no | , | CSV delimiter character |
| columns | Extraction | string | yes | — | Comma-separated column names to extract |
| maxRows | Extraction | string | no | all | Number of rows or "all" |
| skipHeaderRows | Extraction | number | no | 0 | Extra rows to skip after header |
| outputVariable | Output | string | yes | extractedData | Variable name for chaining |

### Steps (Camunda External Tasks)

| Step | Name | Type | Topic | Description |
|------|------|------|-------|-------------|
| 1 | Load File | automation | data-extractor-load | Reads file from variable path or upload storage. Detects format. |
| 2 | Parse & Extract | automation | data-extractor-parse | Applies column filter, row limit, outputs structured JSON. |

### Output Variable Shape
\`\`\`json
{
  "headers": ["Name", "Amount", "Date"],
  "rows": [
    ["Acme Corp", "5000", "2025-01-15"],
    ["Beta Inc", "3200", "2025-01-16"]
  ],
  "totalRows": 2,
  "sourceFile": "report.csv"
}
\`\`\`

---

## Module 3: AI Processor

**Purpose:** Run LLM prompts against input data. Input can come from Data Extractor output, manual text, or any upstream variable. Supports prompt templates with \${variable} placeholders. Outputs structured results in configurable formats.

### Config Schema (UI Fields)

| Field | Group | Type | Required | Default | Hint |
|-------|-------|------|----------|---------|------|
| promptTemplate | Prompt | multiline | yes | — | Prompt text. Supports \${variable} substitution |
| inputSource | Input | select (variable / manual) | no | variable | Where input data comes from |
| inputVariable | Input | string | no | extractedData | Variable to inject into prompt |
| manualInput | Input | multiline | no | — | Direct text when source=manual |
| model | Settings | select (gpt-4 / gpt-3.5-turbo / gemini-pro / claude-3) | no | gpt-4 | LLM model to use |
| temperature | Settings | string | no | 0.3 | Creativity (0-1) |
| maxTokens | Settings | number | no | 2000 | Max output tokens |
| outputFormat | Output | select (text / json / csv / table) | no | text | Desired output structure |
| outputVariable | Output | string | yes | aiProcessorOutput | Variable name for chaining |

### Steps (Camunda External Tasks)

| Step | Name | Type | Topic | Description |
|------|------|------|-------|-------------|
| 1 | Prepare Prompt | automation | ai-processor-prepare | Resolves \${var} in promptTemplate, builds LLM request payload |
| 2 | Execute LLM | automation | ai-processor-execute | Calls LLM API, stores raw response |
| 3 | Format Output | automation | ai-processor-format | Converts raw LLM response to requested outputFormat |

### Output Variable Shape (varies by format)
\`\`\`json
// outputFormat=text
"The total amount across all invoices is $8,200."

// outputFormat=json
{ "summary": "...", "totalAmount": 8200, "lineItems": [] }

// outputFormat=table
{ "headers": ["Vendor", "Classification"], "rows": [["Acme", "Approved"], ["Beta", "Pending"]] }
\`\`\`

---

## Module 4: Send Email Notification

**Purpose:** Send emails via the internal Core API (MS Graph). Supports HTML templates with \${variable} placeholders for dynamic content. Can attach files from upstream variables or static paths.

### Config Schema (UI Fields)

| Field | Group | Type | Required | Default | Hint |
|-------|-------|------|----------|---------|------|
| senderEmail | Message | string | yes | — | From address (must be Graph-authorized) |
| recipientEmail | Message | string | yes | — | To address. Supports \${variable} |
| ccEmail | Message | string | no | — | CC recipients (comma-separated) |
| subject | Message | string | yes | — | Subject line. Supports \${variable} |
| body | Message | multiline | yes | — | Email body (HTML supported). Supports \${variable} |
| isHtml | Message | boolean | no | true | Treat body as HTML |
| addAttachment | Attachments | boolean | no | false | Include attachments |
| attachmentSource | Attachments | select (variable / static) | no | variable | Source of attachments |
| attachFromVariable | Attachments | string | no | — | e.g. emailReaderOutput.attachments |
| staticAttachmentPath | Attachments | string | no | — | File path for static files |
| outputVariable | Output | string | no | sendEmailOutput | Result variable |

### Steps (Camunda External Tasks)

| Step | Name | Type | Topic | Description |
|------|------|------|-------|-------------|
| 1 | Prepare Email | automation | send-email-prepare | Resolves \${var} in subject/body/recipients. Validates addresses. |
| 2 | Send Email | automation | send-email-dispatch | Calls POST /core/email/send. Attaches files if configured. |

### Core API Contract

**POST /core/email/send**
\`\`\`json
// Request
{
  "senderEmail": "notifications@company.com",
  "recipientEmail": "client@external.com",
  "ccEmail": "manager@company.com",
  "subject": "Your report is ready",
  "body": "<h1>Report</h1><p>See attached.</p>",
  "isHtml": true,
  "attachments": [
    { "filename": "report.pdf", "storagePath": "/temp/run_abc/report.pdf" }
  ]
}

// Response
{ "messageId": "graphMsgId456", "status": "sent", "sentAt": "2025-03-17T11:00:00Z" }
\`\`\`

---

## Module 5: Form Builder

**Purpose:** Attach dynamic forms to user-facing steps. The form can be an existing template from the library, a new one created in the Form Builder UI, or driven by an API endpoint that returns a ModuleConfigField[] schema at runtime.

### Config Schema (UI Fields)

| Field | Group | Type | Required | Default | Hint |
|-------|-------|------|----------|---------|------|
| formMode | Form Source | select (existing / new / api) | yes | existing | How the form is sourced |
| formTemplateId | Form Source | string | no | — | ID of saved template (when mode=existing) |
| formName | Form Source | string | no | — | Name for new form (when mode=new) |
| apiEndpoint | Form Source | string | no | — | URL returning ModuleConfigField[] (when mode=api) |
| requiredFields | Validation | string | no | — | Comma-separated field keys that must be filled |
| validationRules | Validation | multiline | no | — | JSON validation rules (e.g. {"amount": {"min": 0}}) |
| submitLabel | Appearance | string | no | Submit | Button label text |
| successMessage | Appearance | string | no | Form submitted successfully | Confirmation message |
| outputVariable | Output | string | yes | formSubmission | Variable storing submitted data |

### Steps (Camunda External Tasks)

| Step | Name | Type | Topic | Description |
|------|------|------|-------|-------------|
| 1 | Render Form | user (user task) | form-render | Presents the dynamic form to the assigned user. Waits for submission. |
| 2 | Validate Submission | automation | form-validate | Validates submitted data against rules. Rejects or passes through. |

### Output Variable Shape
\`\`\`json
{
  "submittedAt": "2025-03-17T12:00:00Z",
  "submittedBy": "john@company.com",
  "fields": {
    "invoiceNumber": "INV-4521",
    "amount": 5000,
    "approved": true,
    "notes": "Verified against PO"
  },
  "isValid": true
}
\`\`\`

---

## Module 6: Approval / Reviewer

**Purpose:** Enterprise governance module for structured approval workflows. Supports configurable approval levels (1-3), role-based routing, timeout-based escalation, and auto-approve conditions.

### Config Schema (UI Fields)

| Field | Group | Type | Required | Default | Hint |
|-------|-------|------|----------|---------|------|
| approverRole | Routing | string | yes | — | Role/group who reviews (e.g. "manager", "vp") |
| approverEmail | Routing | string | no | — | Specific approver email. Supports \${variable} |
| approvalLevels | Routing | select (1 / 2 / 3) | no | 1 | Number of approval levels required |
| level2ApproverRole | Routing | string | no | — | Role for 2nd level (when levels >= 2) |
| level3ApproverRole | Routing | string | no | — | Role for 3rd level (when levels = 3) |
| escalationTimeout | Escalation | string | no | 48h | Time before auto-escalation (e.g. 24h, 3d) |
| escalateTo | Escalation | string | no | — | Who to escalate to on timeout |
| autoApproveCondition | Rules | string | no | — | Expression for auto-approval (e.g. amount < 500) |
| rejectionAction | Rules | select (stop / loop-back / notify) | no | stop | What happens on rejection |
| commentsRequired | Rules | boolean | no | false | Require comments with decision |
| outputVariable | Output | string | yes | approvalResult | Variable storing decision |

### Steps (Camunda External Tasks)

| Step | Name | Type | Topic | Description |
|------|------|------|-------|-------------|
| 1 | Submit for Review | automation | approval-submit | Routes to correct approver based on config. Checks auto-approve condition. |
| 2 | Review & Decision | user (user task) | approval-review | Approver sees request details, enters decision (approve/reject) + comments. |
| 3 | Escalate if Needed | automation | approval-escalate | Triggered on timeout. Re-routes to escalateTo or next level. |

### Output Variable Shape
\`\`\`json
{
  "decision": "approved",
  "decidedBy": "manager@company.com",
  "decidedAt": "2025-03-17T14:30:00Z",
  "comments": "Approved - within budget",
  "level": 1,
  "totalLevels": 2,
  "wasAutoApproved": false,
  "wasEscalated": false
}
\`\`\`

---

## Variable Chaining Reference

| From Module | Output Variable | To Module | Input Reference | What's Passed |
|-------------|-----------------|-----------|-----------------|---------------|
| Email Reader | emailReaderOutput | Data Extractor | inputVariable = emailReaderOutput.attachments[0] | File path for parsing |
| Email Reader | emailReaderOutput | Send Email | attachFromVariable = emailReaderOutput.attachments | Files to attach |
| Data Extractor | extractedData | AI Processor | inputVariable = extractedData | Parsed rows/columns |
| AI Processor | aiProcessorOutput | Send Email | body contains \${aiProcessorOutput} | LLM result in email body |
| Form Builder | formSubmission | AI Processor | inputVariable = formSubmission.fields | User-entered form data |
| Form Builder | formSubmission | Approval | process context | Data for reviewer to see |
| Approval | approvalResult | Send Email | body contains \${approvalResult.decision} | Decision notification |

### Example Pipeline: Invoice Processing

\`\`\`
Email Reader                    Data Extractor              AI Processor                Send Email
(invoices@co.com, INBOX)  →    (columns: Vendor,Amount)  →  (prompt: "Classify          → (to: \${approverEmail}
 outputVar: emailData           inputVar: emailData           invoices by risk")           body: \${aiOutput})
                                 .attachments[0]              inputVar: extractedData
                                outputVar: extractedData      outputVar: aiOutput
                                                                    │
                                                                    ▼
                                                            Approval / Reviewer
                                                            (approverRole: finance-mgr
                                                             autoApprove: amount < 500
                                                             escalationTimeout: 24h)
                                                             outputVar: approvalResult
\`\`\`

---

## BPMN Export Mapping

Each module step exports as a Camunda service task (external type) with inputParameters from instanceConfig:

\`\`\`xml
<bpmn:serviceTask id="el_a8f3k2" name="Read Emails"
    camunda:type="external" camunda:topic="email-reader-fetch">
  <bpmn:extensionElements>
    <camunda:inputOutput>
      <camunda:inputParameter name="emailId">invoices@company.com</camunda:inputParameter>
      <camunda:inputParameter name="folder">Inbox</camunda:inputParameter>
      <camunda:inputParameter name="maxEmails">10</camunda:inputParameter>
      <camunda:inputParameter name="outputVariable">emailReaderOutput</camunda:inputParameter>
    </camunda:inputOutput>
  </bpmn:extensionElements>
</bpmn:serviceTask>
\`\`\`

User task steps (Form Builder's form-render, Approval's approval-review) export as \`<bpmn:userTask>\` with camunda:formKey or camunda:candidateGroups.

---

## Database Schema

### reusable_modules Table
\`\`\`json
{
  "id": "UUID",
  "name": "Email Reader",
  "category": "Communication",
  "icon": "mail",
  "description": "Read emails and download attachments from a mailbox",
  "allowed_personas": [],
  "config_schema": [],
  "steps": [],
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp"
}
\`\`\`

### Module Instance (embedded in CaseIR)
\`\`\`json
{
  "id": "el_a8f3k2",
  "name": "Read Emails",
  "type": "automation",
  "moduleRef": {
    "moduleId": "mod_email_reader_uuid",
    "instanceConfig": {
      "emailId": "invoices@company.com",
      "folder": "Inbox",
      "maxEmails": 10,
      "outputVariable": "emailReaderOutput"
    }
  },
  "engineBindings": {
    "camunda7": {
      "implementationType": "external",
      "topic": "email-reader-fetch"
    }
  }
}
\`\`\`

---

## Security Considerations

- **No credentials in config:** Email modules use Core API which manages MS Graph auth centrally (client credentials flow). No passwords stored in workflow config.
- **Role-gating:** allowed_personas on module templates restricts who can insert which modules.
- **API authentication:** Core API endpoints are internal-only, authenticated via service tokens.
- **LLM API keys:** Managed as environment secrets on the worker, not in module config.
- **Input sanitization:** All \${variable} substitutions must be sanitized to prevent injection in email bodies and LLM prompts.

---

*Document version: 1.0 | Generated: March 2026*
`;
