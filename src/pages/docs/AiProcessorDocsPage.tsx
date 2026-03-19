/**
 * AI Processor Module – Documentation Page
 */
import ModuleDocLayout from "@/components/docs/ModuleDocLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Brain, Settings2, Database, Zap, GitBranch, Shield } from "lucide-react";

export default function AiProcessorDocsPage() {
  return (
    <ModuleDocLayout
      title="AI Processor — Technical Documentation"
      subtitle="Run LLM prompts against input data with variable substitution, producing structured output for downstream modules. Supports multiple model providers and output formatting."
      badges={["LLM", "Prompt Templates", "Variable Substitution", "Structured Output", "JSON Schema", "Camunda Topics"]}
    >
      {/* Purpose */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Brain size={18} className="text-primary" /> Purpose & Scope
        </h2>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
            <p>The AI Processor module integrates Large Language Models into workflow automation:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Execute prompt templates with dynamic variable substitution from upstream data</li>
              <li>Support structured output via JSON schema constraints</li>
              <li>Handle multi-turn reasoning with configurable temperature and max tokens</li>
              <li>Format LLM output for consumption by downstream modules</li>
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
              <CardTitle className="text-xs font-bold text-primary">Prompt Settings</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">promptTemplate</span>: string — template with $&#123;variable&#125; placeholders</p>
                <p><span className="text-primary">inputVariable</span>: string — upstream data reference</p>
                <p><span className="text-primary">systemPrompt</span>: string — optional system instruction</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-primary">Model Configuration</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">model</span>: string — model identifier</p>
                <p><span className="text-primary">temperature</span>: number — 0.0–1.0 (default: 0.3)</p>
                <p><span className="text-primary">maxTokens</span>: number — response limit (default: 2048)</p>
                <p><span className="text-primary">outputFormat</span>: "text" | "json" — default: "text"</p>
                <p><span className="text-primary">outputSchema</span>: JSONSchema — for structured JSON output</p>
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
              <p><span className="text-primary">aiProcessorOutput</span>: object</p>
              <p className="pl-4"><span className="text-primary">.result</span>: string | object — LLM response (text or parsed JSON)</p>
              <p className="pl-4"><span className="text-primary">.model</span>: string — model used</p>
              <p className="pl-4"><span className="text-primary">.tokensUsed</span>: number — total tokens consumed</p>
              <p className="pl-4"><span className="text-primary">.processedAt</span>: ISO timestamp</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">ai-processor-prepare</p>
            <p className="text-[11px] text-muted-foreground">Resolves variable references and builds the final prompt string from template.</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">ai-processor-execute</p>
            <p className="text-[11px] text-muted-foreground">Sends prompt to LLM API, handles retries, collects response.</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">ai-processor-format</p>
            <p className="text-[11px] text-muted-foreground">Validates and formats output against schema, stores result in output variable.</p>
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
            <div className="bg-muted/50 rounded p-3 space-y-1 font-mono">
              <p><span className="text-primary">Data Extractor</span> → AI Processor: extractedData.rows</p>
              <p><span className="text-primary">Email Reader</span> → AI Processor: emailReaderOutput.emails[0].body</p>
              <p>AI Processor → <span className="text-primary">Send Email</span>: $&#123;aiProcessorOutput.result&#125; in body</p>
              <p>AI Processor → <span className="text-primary">Form Builder</span>: aiProcessorOutput.result as pre-fill data</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Security */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Shield size={18} className="text-primary" /> Security & Limits
        </h2>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
            <ul className="list-disc pl-6 space-y-1">
              <li>API keys stored in secure vault — never exposed in workflow config</li>
              <li>Input data sanitized before prompt injection</li>
              <li>Token usage tracked per execution for cost monitoring</li>
              <li>Rate limiting applied per tenant/workflow</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </ModuleDocLayout>
  );
}
