

# Configurable Reusable Modules System

## The Idea

Transform the current "insert steps" module system into a **configurable module framework** — modules are templates with a **configuration schema**. When inserted into a workflow, each instance gets its own user-specific configuration (e.g., which email server, which folder, which filters). Access can be restricted by persona/role.

## Current State vs. Target

```text
CURRENT:  Module = bag of steps → clone into group → done
TARGET:   Module = template + config schema → insert → user configures per-instance → role-gated
```

## What Changes

### 1. New `moduleRef` Concept on Steps

When a module is inserted, the step gets a `moduleRef` linking back to the source module and holding **instance-specific configuration**:

```typescript
// Added to BaseStep
moduleRef?: {
  moduleId: string;        // Which module template
  instanceConfig: Record<string, unknown>;  // User's values (server, folder, filters)
}
```

### 2. Configuration Schema on Modules

Each reusable module defines a **config schema** — the fields a user must fill when using it:

```typescript
interface ModuleConfigField {
  key: string;           // e.g., "emailServer", "folder"
  label: string;         // "Email Server URL"
  type: "string" | "number" | "boolean" | "select" | "multiline";
  required: boolean;
  defaultValue?: string;
  options?: string[];    // For "select" type
  hint?: string;         // Help text
  group?: string;        // Group fields visually (e.g., "Connection", "Filters")
}

interface ReusableModule {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;                    // Visual identifier
  steps: Step[];                    // Template steps
  configSchema: ModuleConfigField[]; // What the user configures
  allowedPersonas?: string[];       // Role-gating (empty = everyone)
}
```

### 3. Database Changes

**Alter `reusable_modules` table:**
- Add `config_schema` (JSONB) — array of config field definitions
- Add `allowed_personas` (TEXT[]) — persona/role restrictions
- Add `icon` (TEXT) — icon identifier

### 4. Module Configuration Panel

When a user clicks a step that has a `moduleRef`, the Properties Panel shows a **Module Configuration** section with:
- The module name and description at the top
- A form generated from `configSchema` (text inputs, selects, toggles)
- Grouped fields (e.g., "Connection Settings", "Filters")
- Save button that patches `moduleRef.instanceConfig`

### 5. Updated Insert Flow

```text
User clicks "Add Module" in a group
  → Dropdown shows modules (filtered by user's persona if allowedPersonas set)
  → User selects "Email Fetcher"
  → Steps are cloned with new IDs + moduleRef attached
  → Properties panel auto-opens showing the config form
  → User fills in: server URL, folder "INBOX", subject filter "Invoice*"
  → Config saved to step's moduleRef.instanceConfig
```

### 6. Email Fetcher Example (Seed Data)

```json
{
  "name": "Email Fetcher",
  "category": "Integration",
  "description": "Fetch emails from Microsoft Graph with filters and download attachments",
  "icon": "mail",
  "configSchema": [
    { "key": "graphEndpoint", "label": "Graph API Endpoint", "type": "string", "required": true, "defaultValue": "https://graph.microsoft.com/v1.0", "group": "Connection" },
    { "key": "authMethod", "label": "Authentication", "type": "select", "required": true, "options": ["OAuth2", "App Registration", "Delegated"], "group": "Connection" },
    { "key": "mailFolder", "label": "Mail Folder", "type": "string", "required": false, "defaultValue": "Inbox", "group": "Filters" },
    { "key": "subjectFilter", "label": "Subject Contains", "type": "string", "required": false, "group": "Filters" },
    { "key": "senderFilter", "label": "From Email", "type": "string", "required": false, "group": "Filters" },
    { "key": "bodyContains", "label": "Body Contains", "type": "string", "required": false, "group": "Filters" },
    { "key": "downloadAttachments", "label": "Download Attachments", "type": "boolean", "required": false, "defaultValue": "true", "group": "Attachments" },
    { "key": "attachmentFilter", "label": "Attachment File Types", "type": "string", "required": false, "hint": "e.g., .pdf,.xlsx", "group": "Attachments" }
  ],
  "allowedPersonas": [],
  "steps": [
    { "type": "automation", "name": "Authenticate with Graph API", "description": "Obtain access token" },
    { "type": "automation", "name": "Fetch Emails", "description": "Query mailbox with filters" },
    { "type": "decision", "name": "Has Attachments?", "branches": [
      { "label": "Yes", "condition": "${hasAttachments}" },
      { "label": "No", "condition": "${!hasAttachments}" }
    ]},
    { "type": "automation", "name": "Download Attachments", "description": "Save filtered attachments" }
  ]
}
```

## File Changes

| File | Action |
|------|--------|
| `src/types/caseIr.ts` | Add `ModuleConfigField`, `moduleRef` to `BaseStep`, update `ReusableModule` |
| `supabase/migrations/` (new) | Add `config_schema`, `allowed_personas`, `icon` columns to `reusable_modules` |
| `supabase/migrations/` (new) | Seed "Email Fetcher" module |
| `src/components/studio/ModulePicker.tsx` | Filter by persona, show config field count, show icon |
| `src/components/studio/properties/ModuleConfigPanel.tsx` | New — renders config form from schema |
| `src/components/studio/properties/StepPropertiesPanel.tsx` | Add Module Configuration section when `moduleRef` exists |
| `src/components/studio/WorkflowStudio.tsx` | Pass persona context to ModulePicker, auto-open config on insert |
| `src/components/studio/studio.css` | Styles for module config form |

## Architecture

```text
reusable_modules (DB)
  ├── steps[]          → Template steps to clone
  ├── configSchema[]   → What fields the user must configure
  └── allowedPersonas  → Who can use this module

When inserted into workflow:
  Step.moduleRef = {
    moduleId: "uuid-of-email-fetcher",
    instanceConfig: {            ← User's specific values
      graphEndpoint: "https://...",
      mailFolder: "Inbox",
      subjectFilter: "Invoice*",
      downloadAttachments: true
    }
  }
```

The config is **per-step-instance** — two different steps using the same Email Fetcher module can have completely different configurations (different servers, different filters).

