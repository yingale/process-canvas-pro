/**
 * Toolbar – top bar with import/export actions and case info
 */
import { useState, useRef } from "react";
import {
  Upload, FileJson, Code, AlertTriangle, CheckCircle, X, Loader2
} from "lucide-react";
import type { CaseIR } from "@/types/caseIr";
import { importBpmn } from "@/lib/bpmnImporter";
import { exportBpmn } from "@/lib/bpmnExporter";

interface ToolbarProps {
  caseIr: CaseIR | null;
  onImportBpmn: (ir: CaseIR, warnings: string[]) => void;
  onLoadSample: () => void;
}

export default function Toolbar({ caseIr, onImportBpmn, onLoadSample }: ToolbarProps) {
  const [importing, setImporting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "warn"; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = (type: "success" | "error" | "warn", msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const xml = await file.text();
      const { caseIr: ir, warnings } = await importBpmn(xml, file.name);
      onImportBpmn(ir, warnings);
      if (warnings.length > 0) {
        notify("warn", `Imported with ${warnings.length} warning(s): ${warnings[0]}`);
      } else {
        notify("success", `Imported "${ir.name}" – ${ir.stages.length} stages, ${ir.stages.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.steps.length, 0), 0)} steps`);
      }
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleExportBpmn = () => {
    if (!caseIr) return;
    try {
      const xml = exportBpmn(caseIr);
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${caseIr.id}.bpmn`;
      a.click();
      URL.revokeObjectURL(url);
      notify("success", "BPMN XML exported successfully");
    } catch (err) {
      notify("error", "Export failed: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleExportJson = () => {
    if (!caseIr) return;
    const json = JSON.stringify(caseIr, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${caseIr.id}-case-ir.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("success", "Case IR JSON exported");
  };

  return (
    <div
      className="h-12 flex items-center gap-3 px-4 border-b flex-shrink-0"
      style={{
        background: "hsl(var(--surface))",
        borderColor: "hsl(var(--border))",
      }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-2.5 mr-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "hsl(var(--primary))" }}
        >
          <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(var(--primary-foreground))" }} />
        </div>
        <div>
          <span className="text-[13px] font-bold text-foreground tracking-tight">WorkflowStudio</span>
          <span className="text-[10px] font-mono text-foreground-muted ml-2 opacity-70">BPMN ⇄ Case IR</span>
        </div>
      </div>

      <div className="h-5 w-px" style={{ background: "hsl(var(--border))" }} />

      {/* Case name */}
      {caseIr && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{caseIr.name}</span>
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: "hsl(var(--surface-overlay))", color: "hsl(var(--foreground-muted))" }}
          >
            {caseIr.stages.length} stages
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* Notification */}
      {notification && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium animate-fade-in"
          style={{
            background: notification.type === "error"
              ? "hsl(var(--destructive) / 0.15)"
              : notification.type === "warn"
              ? "hsl(var(--warning) / 0.15)"
              : "hsl(var(--success) / 0.15)",
            color: notification.type === "error"
              ? "hsl(var(--destructive))"
              : notification.type === "warn"
              ? "hsl(var(--warning))"
              : "hsl(var(--success))",
          }}
        >
          {notification.type === "error" ? <AlertTriangle size={12} /> :
           notification.type === "warn" ? <AlertTriangle size={12} /> :
           <CheckCircle size={12} />}
          <span className="max-w-xs truncate">{notification.msg}</span>
          <button onClick={() => setNotification(null)}>
            <X size={11} className="opacity-70 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Actions */}
      {/* No sample button - users must upload their own BPMN */}

      <input
        ref={fileRef}
        type="file"
        accept=".bpmn,.xml"
        className="hidden"
        onChange={handleFileImport}
      />

      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
        style={{ background: "hsl(var(--surface-raised))", color: "hsl(var(--foreground-muted))" }}
        onMouseEnter={e => { e.currentTarget.style.color = "hsl(var(--primary))"; e.currentTarget.style.borderColor = "hsl(var(--primary))"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "hsl(var(--foreground-muted))"; }}
        onClick={() => fileRef.current?.click()}
        disabled={importing}
      >
        {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        Import BPMN
      </button>

      {caseIr && (
        <>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
            style={{ background: "hsl(var(--surface-raised))", color: "hsl(var(--foreground-muted))" }}
            onMouseEnter={e => { e.currentTarget.style.color = "hsl(var(--foreground))"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "hsl(var(--foreground-muted))"; }}
            onClick={handleExportJson}
          >
            <FileJson size={13} />
            Export IR
          </button>

          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            onClick={handleExportBpmn}
          >
            <Code size={13} />
            Export BPMN
          </button>
        </>
      )}
    </div>
  );
}
