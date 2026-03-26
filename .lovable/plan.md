

# Drag-and-Drop "New Form" Button in Studio Toolbar

## Overview
Add a draggable "New Form" button to the Studio toolbar. Users drag it onto any step in the lifecycle diagram. On drop, a modal popup opens with a form name input, a "Create Form" button (which navigates to the form builder), and a "Preview" button. Once the form is created and saved, the form ID is stored in CaseIR (`formTemplates` + step's `formRef`), the popup closes, and the step card shows the attached form name with a badge.

## Changes

### 1. Toolbar — Add draggable "New Form" button (`src/components/studio/Toolbar.tsx`)
- Add a new button with `draggable="true"` and `onDragStart` that sets `dataTransfer` with type `application/x-new-form`
- Styled consistently with existing toolbar buttons, using a `FormInput` icon
- Visual drag feedback via a ghost image or CSS class

### 2. Step cards — Accept drop (`src/components/studio/LifecycleDiagram.tsx`)
- Add `onDragOver` and `onDrop` handlers to each step card in the `StepCard` component
- On drop of `application/x-new-form`, call a new callback `onDropNewForm(stageId, groupId, stepId)`
- Visual drop indicator (highlight border) when dragging over a valid step

### 3. New Form Dialog component (`src/components/studio/NewFormDialog.tsx`)
- Modal dialog (using existing `Dialog` component) with:
  - Text input for form name
  - "Create Form" button — generates a `FormTemplate` with a unique ID and the entered name, adds it to `caseIr.formTemplates`, attaches `formRef` to the target step, then navigates to `/studio/form-builder` with the template context for editing
  - "Preview" button — opens the form preview if a form is already attached
  - Cancel/close button
- Props: `open`, `onClose`, `targetStep` (stageId, groupId, stepId), callbacks for create and preview

### 4. WorkflowStudio — Wire the flow (`src/components/studio/WorkflowStudio.tsx`)
- Add state for the new form dialog: `newFormDialogTarget` (stageId, groupId, stepId or null)
- Add `handleDropNewForm(stageId, groupId, stepId)` — opens the dialog
- Add `handleCreateFormFromDialog(name, stageId, groupId, stepId)`:
  1. Create a `FormTemplate` with `id: uid()`, `name`, empty `fields`
  2. Patch CaseIR to add to `formTemplates` array
  3. Patch the target step to add `formRef: { formId, fieldOverrides: {} }`
  4. Save IR to sessionStorage
  5. Navigate to `/studio/form-builder` with return state
  6. Close dialog
- Pass `onDropNewForm` down to `LifecycleDiagram`

### 5. Step card form badge (`src/components/studio/LifecycleDiagram.tsx`)
- In `StepCard`, when `step.formRef` exists, show a small purple badge with the form name (looked up from `formTemplates` array)
- Already partially implemented — verify and enhance if needed

## Files Modified
1. `src/components/studio/Toolbar.tsx` — draggable button
2. `src/components/studio/NewFormDialog.tsx` — new file, popup dialog
3. `src/components/studio/WorkflowStudio.tsx` — dialog state, handlers, pass props
4. `src/components/studio/LifecycleDiagram.tsx` — drop zone on steps, form badge display, pass through `onDropNewForm`

