

# Agentic AI for Workflow Lifecycle Management

## Overview

This plan extends the existing AI chat assistant and workflow creation wizard to cover the **full lifecycle** of a workflow application -- not just the flow diagram, but also **personas, metadata, team members, business rules, data model, and deployment**. Additionally, it introduces a **dropdown in Group sections** to insert pre-built reusable modules.

The approach expands the current Case IR model with new top-level sections, adds new AI edge function capabilities, and builds new UI tabs/panels in the Studio to manage each concern.

---

## What Changes

### 1. Expand the Case IR Data Model

Add new top-level properties to `CaseIR` in `src/types/caseIr.ts`:

```text
CaseIR (existing)
  +-- personas: Persona[]          (roles like "Manager", "Analyst")
  +-- teamMembers: TeamMember[]    (assigned people)
  +-- businessRules: BusinessRule[] (conditions, validations, SLAs)
  +-- dataModel: DataField[]       (fields, types, required flags)
  +-- deployment: DeploymentConfig  (target env, version, status)
  +-- reusableModules: Module[]    (library of insertable step groups)
```

**New types:**

- **Persona**: `{ id, name, role, description, permissions[] }`
- **TeamMember**: `{ id, name, email, personaId, department }`
- **BusinessRule**: `{ id, name, type (validation|routing|sla|condition), expression, description, appliesTo }`
- **DataField**: `{ id, name, dataType (string|number|boolean|date|object|array), required, defaultValue, description }`
- **DeploymentConfig**: `{ targetEnvironment, version, status (draft|staging|production), deployedAt, deployedBy, notes }`
- **Module**: `{ id, name, description, category, steps: Step[] }` -- reusable step templates

### 2. New Database Tables

Create tables to persist these new entities per workflow:

- `workflow_personas` -- personas linked to a workflow
- `workflow_team_members` -- team members assigned
- `workflow_business_rules` -- rules and conditions
- `workflow_data_model` -- data field definitions
- `workflow_deployments` -- deployment history/config
- `reusable_modules` -- library of reusable step groups (shared across workflows)

All tables include RLS policies for public read/write (matching the existing `workflows` table pattern).

### 3. Upgrade the AI Edge Function (`ai-plan`)

Expand the system prompt to understand and generate patches for the new sections:

- "Add a persona called Reviewer who can approve or reject"
- "Add a business rule: if amount > 10000, require VP approval"
- "Add a data field: invoiceAmount (number, required)"
- "Set deployment target to staging"
- "Add John (john@company.com) as a team member with Reviewer role"

The AI already operates on JSON Patch -- extending the schema means the AI simply patches new paths like `/personas/-`, `/businessRules/-`, `/dataModel/-`, etc.

### 4. New Studio UI Tabs

Add a tab bar or sidebar sections in the WorkflowStudio for:

| Tab | What it shows | AI can manage |
|---|---|---|
| **Flow** (existing) | Stages, Groups, Steps diagram | Yes (current) |
| **Personas** | List of personas with role/permissions | Yes |
| **Team** | Team member assignments linked to personas | Yes |
| **Business Rules** | Conditions, SLAs, routing rules | Yes |
| **Data Model** | Field definitions with types | Yes |
| **Deployment** | Environment config, deploy button | Yes |

Each tab renders a dedicated panel component (e.g., `PersonasPanel.tsx`, `TeamPanel.tsx`, etc.) with:
- A list/table view of current items
- Add/Edit/Delete buttons for manual editing
- The AI chat panel remains visible and can modify any tab's data

### 5. Reusable Modules Dropdown in Groups

In the `GroupSection` component within `LifecycleDiagram.tsx`:

- Add a dropdown button next to "Add Step" labeled **"Add Module"**
- Clicking it shows a popover/dropdown listing available reusable modules (fetched from `reusable_modules` table)
- Selecting a module inserts all its steps into the current group
- Modules can be pre-seeded (e.g., "Email Notification", "Approval Chain", "Data Validation") and also created by users from existing groups ("Save as Module")

### 6. AI Chat Enhancements

Update the `AiChatPanel` suggestions to include the new capabilities:

```
"Add a Manager persona"
"Create a business rule for approval routing"
"Define the data model fields"
"Assign team members"
"Prepare for staging deployment"
"Insert the Approval Chain module"
```

### 7. Create Workflow Wizard Updates

Add optional steps in the wizard checklist for:
- **Step 3**: Define Personas (AI can auto-suggest from the workflow description)
- **Step 4**: Configure Business Rules
- **Step 5**: Set up Data Model
- **Step 6**: Deployment settings

The AI generation can pre-populate these based on the user's natural language description.

---

## File Changes Summary

| File | Action |
|---|---|
| `src/types/caseIr.ts` | Add Persona, TeamMember, BusinessRule, DataField, DeploymentConfig, Module types; extend CaseIR |
| `supabase/migrations/` (new) | Create 6 new tables with RLS |
| `supabase/functions/ai-plan/index.ts` | Expand system prompt to handle new entity types |
| `src/components/studio/PersonasPanel.tsx` | New -- manage personas |
| `src/components/studio/TeamPanel.tsx` | New -- manage team members |
| `src/components/studio/BusinessRulesPanel.tsx` | New -- manage business rules |
| `src/components/studio/DataModelPanel.tsx` | New -- manage data fields |
| `src/components/studio/DeploymentPanel.tsx` | New -- deployment config and actions |
| `src/components/studio/ModulePickerDropdown.tsx` | New -- reusable module selector for groups |
| `src/components/studio/WorkflowStudio.tsx` | Add tab navigation between Flow/Personas/Team/Rules/Data/Deploy |
| `src/components/studio/LifecycleDiagram.tsx` | Add "Add Module" dropdown in GroupSection |
| `src/components/studio/AiChatPanel.tsx` | Update suggestions for new capabilities |
| `src/pages/CreateWorkflowWizard.tsx` | Add optional wizard steps for personas, rules, data model |
| `src/components/studio/studio.css` | Styles for new panels and tabs |

---

## Technical Details

### AI Patch Flow (unchanged pattern, expanded scope)

```text
User says: "Add a persona called Approver with approve/reject permissions"
     |
     v
AI receives current CaseIR (now includes personas[], businessRules[], etc.)
     |
     v
AI returns JSON Patch:
  [{ "op": "add", "path": "/personas/-", "value": { "id": "persona_abc", "name": "Approver", "role": "approver", "permissions": ["approve", "reject"] } }]
     |
     v
applyCaseIRPatch() applies it (no changes needed -- it's generic JSON Patch)
     |
     v
UI re-renders the Personas tab with the new entry
```

### Module Insertion Flow

```text
User clicks "Add Module" in a Group
     |
     v
Dropdown shows available modules (from DB + built-in)
     |
     v
User selects "Approval Chain"
     |
     v
Module's steps are deep-cloned with new IDs
     |
     v
JSON Patch: [{ "op": "add", "path": "/stages/X/groups/Y/steps/-", "value": step1 }, ...]
     |
     v
Steps appear in the group
```

### Database Schema

```sql
-- Reusable modules (shared library)
CREATE TABLE reusable_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow-specific tables follow same pattern
-- (workflow_personas, workflow_team_members, etc.)
-- Each has workflow_id FK to workflows table
```

### Tab Navigation in Studio

The WorkflowStudio component will add a horizontal tab bar below the toolbar:

```text
[ Flow | Personas | Team | Business Rules | Data Model | Deployment ]
```

Only the active tab's panel renders. The AI chat panel stays pinned on the left regardless of active tab.

