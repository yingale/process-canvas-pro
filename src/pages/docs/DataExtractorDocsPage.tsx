/**
 * Data Extractor Module – Documentation Page
 */
import ModuleDocLayout from "@/components/docs/ModuleDocLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheet, Settings2, Database, Zap, GitBranch, AlertTriangle } from "lucide-react";

export default function DataExtractorDocsPage() {
  return (
    <ModuleDocLayout
      title="Data Extractor — Technical Documentation"
      subtitle="Parse structured data from CSV/XLSX files. Input can come from upstream module output (e.g. Email Reader attachments) or from a UI-uploaded file. Extract specific columns and limit rows."
      badges={["CSV", "XLSX", "Column Mapping", "Row Limits", "Variable Input", "Camunda Topics"]}
    >
      {/* Purpose */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-primary" /> Purpose & Scope
        </h2>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
            <p>The Data Extractor module parses tabular data from files and produces clean, structured output for downstream processing:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Accepts CSV and XLSX file formats</li>
              <li>Can reference files from upstream modules (variable chaining) or direct upload</li>
              <li>Extracts specific columns by name or index</li>
              <li>Supports row limits and offset for pagination</li>
              <li>Handles header detection and data type inference</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Config */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Settings2 size={18} className="text-primary" /> Configuration Schema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-primary">Input Source</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">inputVariable</span>: string — upstream variable ref (e.g. "emailReaderOutput.attachments[0]")</p>
                <p><span className="text-primary">fileUpload</span>: File — manual upload (alternative to variable)</p>
                <p><span className="text-primary">fileFormat</span>: "csv" | "xlsx" — auto-detected if omitted</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-primary">Extraction Rules</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">columns</span>: string[] — ["Vendor", "Amount", "Date"]</p>
                <p><span className="text-primary">maxRows</span>: number — limit rows (default: all)</p>
                <p><span className="text-primary">skipRows</span>: number — offset (default: 0)</p>
                <p><span className="text-primary">hasHeader</span>: boolean — first row is header (default: true)</p>
                <p><span className="text-primary">delimiter</span>: string — CSV delimiter (default: ",")</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Output */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Database size={18} className="text-primary" /> Output Variables
        </h2>
        <Card>
          <CardContent className="pt-4 text-[11px] font-mono">
            <div className="bg-muted/50 rounded p-3 space-y-1">
              <p><span className="text-primary">extractedData</span>: object</p>
              <p className="pl-4"><span className="text-primary">.rows</span>: Record&lt;string, string&gt;[] — array of row objects</p>
              <p className="pl-4"><span className="text-primary">.columns</span>: string[] — column names extracted</p>
              <p className="pl-4"><span className="text-primary">.totalRows</span>: number — total rows in source</p>
              <p className="pl-4"><span className="text-primary">.extractedRows</span>: number — rows returned after limit</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Camunda */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Zap size={18} className="text-primary" /> Camunda Topics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">data-extractor-load</p>
            <p className="text-[11px] text-muted-foreground">Loads the file from storage or upstream variable reference, validates format.</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">data-extractor-parse</p>
            <p className="text-[11px] text-muted-foreground">Parses the file content, applies column mapping and row limits, outputs structured data.</p>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Chaining */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <GitBranch size={18} className="text-primary" /> Variable Chaining
        </h2>
        <Card>
          <CardContent className="pt-4 text-[11px] text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Typical flow:</p>
            <div className="bg-muted/50 rounded p-3 space-y-1 font-mono">
              <p><span className="text-primary">Email Reader</span> → Data Extractor: emailReaderOutput.attachments[0]</p>
              <p>Data Extractor → <span className="text-primary">AI Processor</span>: extractedData.rows</p>
              <p>Data Extractor → <span className="text-primary">Send Email</span>: extractedData (as report attachment)</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Error Handling */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <AlertTriangle size={18} className="text-primary" /> Error Handling
        </h2>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
            <ul className="list-disc pl-6 space-y-1">
              <li>Unsupported file format → throws with suggested formats</li>
              <li>Missing columns → partial extract + warning in output</li>
              <li>Empty file → returns empty rows array with metadata</li>
              <li>Corrupt file → throws with parsing error details</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </ModuleDocLayout>
  );
}
