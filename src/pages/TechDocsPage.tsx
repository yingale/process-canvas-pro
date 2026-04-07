import { useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileText, FileCode, ShieldOff, ExternalLink, Copy, Check } from "lucide-react";
import { TECH_DOC_CONTENT } from "@/lib/techDocContent";
import "../components/studio/studio.css";

const MODULE_SUMMARIES = [
  { name: "Email Reader", category: "Communication", desc: "Read emails and download attachments via Core API (MS Graph)", searchKey: "Module 1: Email Reader", docPath: "/docs/email-reader" },
  { name: "Data Extractor", category: "Data Processing", desc: "Parse CSV/XLSX files, extract columns and rows", searchKey: "Module 2: Data Extractor", docPath: "/docs/data-extractor" },
  { name: "AI Processor", category: "Intelligence", desc: "Run LLM prompts with variable substitution, structured output", searchKey: "Module 3: AI Processor", docPath: "/docs/ai-processor" },
  { name: "Send Email Notification", category: "Communication", desc: "Send templated emails with attachments via Core API", searchKey: "Module 4: Send Email", docPath: "/docs/send-email" },
  { name: "Form Builder", category: "User Interaction", desc: "Dynamic forms with validation — existing, new, or API-driven", searchKey: "Module 5: Form Builder", docPath: "/docs/form-builder" },
  { name: "Approval / Reviewer", category: "Governance", desc: "Multi-level approval with escalation and auto-approve rules", searchKey: "Module 6: Approval", docPath: "/docs/approval" },
  { name: "Automation Nodes", category: "Integration", desc: "5-node automation pipeline — Email Fetcher, Chunk Extractor, AI Processor, Column Extractor, Email Notification", searchKey: "Automation Nodes", docPath: "/docs/automation-nodes" },
  { name: "Camunda Topics & Processor", category: "Runtime", desc: "External Task Workers, topic subscriptions, variable resolution engine, BPMN XML generation, error handling & retry strategy", searchKey: "Camunda Topics", docPath: "/docs/camunda-topics" },
  { name: "RBAC — Access Control", category: "Security", desc: "Okta JWT auth, per-workflow roles (admin/editor/executor/viewer), MongoDB role mapping, permission middleware, audit logging", searchKey: "RBAC", docPath: "/docs/rbac" },
];

function stripBranding(content: string): string {
  return content
    .replace(/WorkflowStudio/gi, "[Your Platform]")
    .replace(/Workflow Studio/gi, "[Your Platform]")
    .replace(/BPMN\s*⇄\s*Case IR/gi, "Process Automation")
    .replace(/Pega[- ]?style/gi, "Enterprise")
    .replace(/Pega/gi, "Platform");
}

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
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  const [docCopied, setDocCopied] = useState(false);

  const handleCopyDoc = useCallback(async () => {
    await navigator.clipboard.writeText(TECH_DOC_CONTENT);
    setDocCopied(true);
    setTimeout(() => setDocCopied(false), 2000);
  }, []);

  const scrollToModule = useCallback((searchKey: string) => {
    const container = previewRef.current;
    if (!container) return;
    const pre = container.querySelector("pre");
    if (!pre) return;
    const text = pre.textContent || "";
    const idx = text.indexOf(searchKey);
    if (idx === -1) return;

    // Estimate scroll position based on character index
    const totalHeight = pre.scrollHeight;
    const totalChars = text.length;
    const ratio = idx / totalChars;
    container.scrollTo({ top: ratio * totalHeight - 40, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Technical Design Document</h1>
        <p className="text-sm text-muted-foreground">
          Complete specification for the 6-module reusable automation library — architecture, config schemas, API contracts, variable chaining, and BPMN export mapping.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Download + Preview */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-3 mb-6">
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

          <div className="flex gap-3 mb-6">
            <button
              className="toolbar-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border-dashed"
              onClick={() => downloadFile(stripBranding(TECH_DOC_CONTENT), "tech-doc-unbranded.md", "text/markdown")}
            >
              <ShieldOff size={16} />
              Markdown (No Branding)
            </button>
            <button
              className="toolbar-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border-dashed"
              onClick={() => downloadFile(stripBranding(TECH_DOC_CONTENT), "tech-doc-unbranded.txt", "text/plain")}
            >
              <ShieldOff size={16} />
              Text (No Branding)
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Document Preview</h2>
            <button
              onClick={handleCopyDoc}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border bg-card transition-all hover:bg-muted ${docCopied ? "border-emerald-500/40 text-emerald-600" : ""}`}
            >
              {docCopied ? <Check size={13} /> : <Copy size={13} />}
              {docCopied ? "Copied!" : "Copy All"}
            </button>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 overflow-auto max-h-[600px]" ref={previewRef}>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {TECH_DOC_CONTENT}
            </pre>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Download size={12} />
            <span>Use the download buttons above to save the full document locally.</span>
          </div>
        </div>

        {/* Right: Module summary cards */}
        <div className="w-full lg:w-72 shrink-0">
          <h2 className="text-lg font-semibold text-foreground mb-4">Module Summary</h2>
          <div className="grid gap-3">
            {MODULE_SUMMARIES.map((m) => (
              <button
                key={m.name}
                className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-sm cursor-pointer group"
                onClick={() => scrollToModule(m.searchKey)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{m.name}</span>
                  <span className="toolbar-badge text-[10px] px-1.5 py-0.5 rounded font-mono">{m.category}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{m.desc}</p>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                  onClick={(e) => { e.stopPropagation(); navigate(m.docPath); }}
                >
                  <ExternalLink size={10} /> View Full Docs
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
