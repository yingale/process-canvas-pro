/**
 * FormBuilderPage – Full-page questionnaire/flow builder.
 * 3-panel layout: Left (settings + questions list), Center (question editor), Right (branching + summary).
 * Replaces the old form builder.
 */
import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Upload, Eye, FileJson, Copy, Check, X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import LeftPanel from "@/components/form-builder/LeftPanel";
import CenterPanel from "@/components/form-builder/CenterPanel";
import RightPanel from "@/components/form-builder/RightPanel";
import type { QuestionnaireDocument, ValidationIssue } from "@/types/questionnaire";

export default function FormBuilderPage() {
  const navigate = useNavigate();
  const store = useQuestionnaireStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  const [copied, setCopied] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  // Export
  const exportedJson = exportOpen ? JSON.stringify(store.exportDocument(), null, 2) : "";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(exportedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportedJson]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([exportedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${store.flow.flowId || "questionnaire"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportedJson, store.flow.flowId]);

  // Import
  const handleImport = useCallback(() => {
    setImportError("");
    try {
      const doc: QuestionnaireDocument = JSON.parse(importJson);
      if (!doc.flow || !doc.questions) {
        throw new Error("Invalid document: missing 'flow' or 'questions' property");
      }
      store.importDocument(doc);
      setImportOpen(false);
      setImportJson("");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Invalid JSON");
    }
  }, [importJson, store]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportJson(reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // Validate
  const handleValidate = useCallback(() => {
    const issues = store.validate();
    setValidationIssues(issues);
    setValidationOpen(true);
  }, [store]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <div className="w-px h-5 bg-border" />
          <h1 className="text-[14px] font-bold text-foreground">Form Builder</h1>
          <Badge variant="outline" className="text-[10px]">
            {store.flow.status}
          </Badge>
          <span className="text-[11px] text-muted-foreground font-mono">
            {store.flow.flowId}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setImportOpen(true)}>
            <Upload size={12} className="mr-1" /> Import
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setExportOpen(true)}>
            <Download size={12} className="mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <CenterPanel onImport={() => setImportOpen(true)} />
        <RightPanel onValidate={handleValidate} />
      </div>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson size={18} /> Export Questionnaire JSON
            </DialogTitle>
            <DialogDescription>
              Copy or download the complete QuestionnaireDocument.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Textarea
              readOnly
              value={exportedJson}
              className="font-mono text-[11px] h-[400px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCopy} className="text-[12px]">
              {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
            <Button onClick={handleDownload} className="text-[12px]">
              <Download size={14} className="mr-1" /> Download .json
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload size={18} /> Import Questionnaire JSON
            </DialogTitle>
            <DialogDescription>
              Paste JSON or upload a .json file containing a QuestionnaireDocument.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{"flow": {...}, "questions": [...]}'
            className="font-mono text-[11px] h-[300px] resize-none"
          />
          {importError && (
            <div className="flex items-center gap-2 text-destructive text-[12px]">
              <AlertCircle size={14} /> {importError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="text-[12px]">
              <Upload size={14} className="mr-1" /> Upload File
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
            <Button
              onClick={handleImport}
              disabled={!importJson.trim()}
              className="text-[12px]"
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Dialog */}
      <Dialog open={validationOpen} onOpenChange={setValidationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} /> Validation Report
            </DialogTitle>
            <DialogDescription>
              {validationIssues.length === 0
                ? "No issues found! Your workflow is valid."
                : `Found ${validationIssues.length} issue(s).`}
            </DialogDescription>
          </DialogHeader>
          {validationIssues.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {validationIssues.map((issue, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-2.5 rounded-md text-[12px] ${
                    issue.type === "error"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/10 text-foreground"
                  }`}
                >
                  {issue.type === "error" ? (
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  ) : (
                    <Info size={14} className="flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-medium">{issue.type === "error" ? "Error" : "Warning"}: </span>
                    {issue.message}
                    {issue.questionId && (
                      <Badge variant="outline" className="ml-1.5 text-[9px] px-1">
                        {issue.questionId}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {validationIssues.length === 0 && (
            <div className="flex items-center justify-center py-6 text-[13px] text-muted-foreground">
              <Check size={20} className="mr-2 text-green-600" /> All checks passed
            </div>
          )}
          <DialogFooter>
            <div className="flex gap-4 text-[11px] text-muted-foreground">
              <span>Questions: {store.questions.length}</span>
              <span>Errors: {validationIssues.filter((i) => i.type === "error").length}</span>
              <span>Warnings: {validationIssues.filter((i) => i.type === "warning").length}</span>
            </div>
            <Button variant="outline" onClick={() => setValidationOpen(false)} className="text-[12px]">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
