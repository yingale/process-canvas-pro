

# Plan: Create Downloadable Technical Design Document

## What
Add a `/docs` page with a "Download Technical Document" button that generates and downloads the full 6-module technical design document as a Markdown (.md) file. The document content will be embedded in a dedicated module and rendered as a preview on the page with a download button.

## Files to Create/Modify

### 1. Create `src/lib/techDocContent.ts`
- Export a constant string containing the complete technical design document in Markdown format
- Covers all 6 modules: Email Reader, Data Extractor, AI Processor, Send Email, Form Builder, Approval/Reviewer
- Includes architecture diagrams (ASCII), config schemas, API contracts, variable chaining, BPMN export mapping, database schema, reusability design, security notes

### 2. Create `src/pages/TechDocsPage.tsx`
- Page with document title, summary, and two download buttons:
  - **Download as Markdown (.md)**
  - **Download as Text (.txt)**
- Preview section showing a formatted summary of the document contents
- Uses Blob + URL.createObjectURL for client-side file download (same pattern as existing BPMN/JSON export in `Toolbar.tsx`)

### 3. Modify `src/App.tsx`
- Add route: `/docs` → `<TechDocsPage />`

### 4. Modify `src/components/layout/AppSidebar.tsx` (if sidebar has nav links)
- Add "Tech Docs" link to navigation

## Technical Approach
- Pure client-side download — no backend needed
- Reuses the existing Blob download pattern from `Toolbar.tsx`
- Document content stored as a template literal for easy maintenance
- Styled consistently with existing pages using `studio.css` classes

