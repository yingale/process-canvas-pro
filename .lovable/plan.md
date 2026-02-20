

# Make Start Event (Trigger) a First-Class Editable Element

## Problem
Currently, the BPMN start event (e.g., Timer triggering every 5 minutes) is displayed as a **static, non-editable pill** in the diagram header area. It shows "Timer: R/PT5M" but you cannot click it, select it, or edit its Camunda 7 properties.

## Solution
Promote the trigger/start event into a **clickable, selectable card** in the lifecycle diagram that opens the Properties Panel with full Camunda 7 property editing support (trigger type, timer expression, message name, async settings, etc.).

## Changes Required

### 1. Extend the Selection Model (`src/types/caseIr.ts`)
- Add a new `trigger` kind to the `SelectionTarget` union type:
  ```
  | { kind: "trigger" }
  ```
- This allows the trigger to participate in the existing selection/properties flow.

### 2. Extend the Trigger Type (`src/types/caseIr.ts`)
- Add optional `tech` (Camunda7Tech) and `source` (SourceMeta) fields to the `Trigger` interface so it can store Camunda 7 properties like asyncBefore, job priority, etc.
- Capture the original start event's BPMN element ID and type in `source`.

### 3. Update BPMN Importer (`src/lib/bpmnImporter.ts`)
- When parsing the start event, also capture Camunda extensions (async, job priority) and the element's source metadata into the `Trigger` object.

### 4. Add Trigger Card to Lifecycle Diagram (`src/components/studio/LifecycleDiagram.tsx`)
- Replace the static pill in the header with a **clickable TriggerCard** component placed before the stage cards in the "Main Flow" row.
- The card will show an icon (Timer/Message/Signal/Play), the trigger type, and the expression.
- Clicking it sets selection to `{ kind: "trigger" }`, highlighting it with a selected border.
- It will have similar visual treatment to stage cards (border, shadow, colored accent).

### 5. Add Trigger Properties Panel (`src/components/studio/PropertiesPanel.tsx`)
- Add a new `TriggerPropertiesPanel` sub-component that renders when `selection.kind === "trigger"`.
- Editable fields:
  - **Trigger Type** (select: none/timer/message/signal/manual)
  - **Name** (text)
  - **Timer Expression** (expression field, shown when type=timer, with placeholder like "R/PT5M")
  - **Message Name** (text, shown when type=message)
  - **Async Before/After** (boolean toggles)
  - **Job Priority** (expression)
- Save button emits a JSON Patch targeting `/trigger` path.

### 6. Add Trigger Property Schema (`src/components/studio/camundaSchema.ts`)
- Add a new `PropGroup` entry for the start event trigger with applicable fields for timer cycle/date/duration, message ref, signal ref.

### 7. Wire Up Selection in WorkflowStudio (`src/components/studio/WorkflowStudio.tsx`)
- Add an `onSelectTrigger` callback that sets selection to `{ kind: "trigger" }`.
- Pass it down to `LifecycleDiagram`.
- Handle `kind: "trigger"` in the PropertiesPanel routing.

### 8. Update BPMN Exporter (`src/lib/bpmnExporter.ts`)
- When exporting, apply any tech properties from `trigger.tech` back onto the start event element (asyncBefore, jobPriority, etc.).

## Visual Layout

```text
[Timer Start]  -->  [Stage 1]  [Stage 2]  [+ Add Section]
 (clickable)         (card)     (card)
```

The trigger card will sit at the left of the stage cards row, connected by an arrow indicator, replacing the current static pill in the header.

