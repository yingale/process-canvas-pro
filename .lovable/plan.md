

# Form Builder UX Redesign

## Problem
The current 3-panel layout (Left: settings + questions list, Center: question editor, Right: branching) overwhelms users. Too many fields are visible at once, branching is disconnected from the question being edited, and the flow settings compete for space with the question list.

## Proposed Approach: Guided, Card-Based Single-Column Builder

Replace the rigid 3-panel layout with a **single scrollable canvas** inspired by Typeform/Tally.so, where each question is an expandable card. Branching is configured inline, directly under each question's options.

### Layout

```text
 ┌──────────────────────────────────────────────────┐
 │  Top Bar: Back | Flow Name (editable) | Status   │
 │           Import | Export | Validate | Preview    │
 ├──────────────────────────────────────────────────┤
 │  Left Sidebar (220px, collapsible)               │
 │  ┌────────────────────────┐                      │
 │  │ ⚙ Flow Settings       │  Center Canvas       │
 │  │   (collapsible)       │  ┌──────────────────┐ │
 │  ├────────────────────────┤  │ Question Card 1  │ │
 │  │ 📋 Question Outline   │  │  [collapsed]     │ │
 │  │  1. Name ▼            │  ├──────────────────┤ │
 │  │  2. Email             │  │ Question Card 2  │ │
 │  │  3. Department ▼ EP   │  │  [EXPANDED]      │ │
 │  │                       │  │  Type | Label    │ │
 │  │  + Add Question       │  │  Options + inline│ │
 │  │  + Add Section        │  │  branching       │ │
 │  └────────────────────────┘  ├──────────────────┤ │
 │                              │ Question Card 3  │ │
 │                              │  [collapsed]     │ │
 │                              ├──────────────────┤ │
 │                              │ [+ Add Question] │ │
 │                              └──────────────────┘ │
 └──────────────────────────────────────────────────┘
```

### Key UX Changes

1. **Collapsible Question Cards** -- Each question is a card on the center canvas. Collapsed view shows: drag handle, type icon, label, badges (EP, branch count). Click to expand and edit all fields inline.

2. **Inline Branching** -- For Dropdown/Radio/MultiSelect, branching config appears directly under each option row (a small "arrow" icon toggles a branch target selector). No separate right panel needed.

3. **Simplified Left Sidebar** -- Just a compact outline/navigator (question labels as a clickable list for jumping) + collapsible flow settings. Can be hidden entirely on small screens.

4. **Progressive Disclosure** -- Collapsed card: just label + type icon. Expanded card shows core fields (label, type, mandatory, options). An "Advanced" toggle reveals category, subcategory, access roles, tags, default value.

5. **Drag-to-Reorder** -- Cards on the center canvas can be dragged to reorder (using the existing move up/down logic, visually presented as drag handles).

6. **Quick Add Bar** -- A persistent "+ Add Question" button at the bottom of the card stack with type shortcuts (click the "+" to get a Dropdown by default, or click a specific type icon to add that type directly).

7. **Flow Summary** -- Moved to the top bar as small stat chips (e.g., "5 Questions | 3 Links | 2 Entry Points") instead of occupying a full panel.

### Files to Change

| File | Action |
|---|---|
| `src/pages/FormBuilderPage.tsx` | Restructure to single-canvas layout with collapsible sidebar |
| `src/components/form-builder/LeftPanel.tsx` | Simplify to compact outline navigator + collapsible flow settings |
| `src/components/form-builder/CenterPanel.tsx` | Replace with card-stack view: all questions as expandable cards with inline branching |
| `src/components/form-builder/RightPanel.tsx` | Remove -- branching moves inline into each card |
| `src/components/form-builder/QuestionCard.tsx` | New -- single expandable card component with question editing + inline branch config |

### Interaction Flow
1. User lands on empty state with "Add your first question" prompt
2. Clicks "+" -- a new card appears expanded, ready for typing the label
3. User picks type from a dropdown on the card, types label
4. For option-based types, options appear with inline "+" to add more, and a small branch icon per option to set routing
5. Click another card or the collapse arrow to minimize the current card
6. Left sidebar shows the question outline for quick navigation
7. Top bar provides Import/Export/Validate actions + summary stats

