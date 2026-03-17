import { Download, FileText, FileCode } from "lucide-react";
import { TECH_DOC_CONTENT } from "@/lib/techDocContent";
import "../components/studio/studio.css";

const MODULE_SUMMARIES = [
  { name: "Email Reader", category: "Communication", desc: "Read emails and download attachments via Core API (MS Graph)" },
  { name: "Data Extractor", category: "Data Processing", desc: "Parse CSV/XLSX files, extract columns and rows" },
  { name: "AI Processor", category: "Intelligence", desc: "Run LLM prompts with variable substitution, structured output" },
  { name: "Send Email Notification", category: "Communication", desc: "Send templated emails with attachments via Core API" },
  { name: "Form Builder", category: "User Interaction", desc: "Dynamic forms with validation — existing, new, or API-driven" },
  { name: "Approval / Reviewer", category: "Governance", desc: "Multi-level approval with escalation and auto-approve rules" },
];

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TechDocsPage() {
  return (
    <div className="min-h-screen p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Technical Design Document</h1>
        <p className="text-sm text-muted-foreground">
          Complete specification for the 6-module reusable automation library — architecture, config schemas, API contracts, variable chaining, and BPMN export mapping.
        </p>
      </div>

      {/* Download buttons */}
      <div className="flex gap-3 mb-8">
        <button
          className="toolbar-btn--primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          onClick={() => downloadFile(TECH_DOC_CONTENT, "module-library-tech-doc.md", "text/markdown")}
        >
          <FileCode size={16} />
          Download as Markdown
        </button>
        <button
          className="toolbar-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          onClick={() => downloadFile(TECH_DOC_CONTENT, "module-library-tech-doc.txt", "text/plain")}
        >
          <FileText size={16} />
          Download as Text
        </button>
      </div>

      {/* Module summary cards */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Module Summary</h2>
      <div className="grid gap-3 md:grid-cols-2 mb-8">
        {MODULE_SUMMARIES.map((m) => (
          <div key={m.name} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">{m.name}</span>
              <span className="toolbar-badge text-[10px] px-1.5 py-0.5 rounded font-mono">{m.category}</span>
            </div>
            <p className="text-xs text-muted-foreground">{m.desc}</p>
          </div>
        ))}
      </div>

      {/* Document preview */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Document Preview</h2>
      <div className="rounded-lg border border-border bg-card p-6 overflow-auto max-h-[600px]">
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
          {TECH_DOC_CONTENT}
        </pre>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Download size={12} />
        <span>Use the download buttons above to save the full document locally.</span>
      </div>
    </div>
  );
}
