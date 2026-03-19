/**
 * FormBuilderDocsPage – UI Wireframe & Technical Documentation for the Form Builder
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Layers, GitBranch, Eye, FileJson, Zap, LayoutGrid, Box, ListTree, Settings2, Database, CheckCircle2, AlertTriangle, BookOpen, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportPageAsPdf } from "@/lib/pdfExport";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ─── Wireframe Section Components ─── */

function WireframeBox({ label, children, className = "", accent = false }: {
  label: string; children?: React.ReactNode; className?: string; accent?: boolean;
}) {
  return (
    <div className={`border-2 border-dashed rounded-lg p-3 ${accent ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30"} ${className}`}>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${accent ? "text-primary" : "text-muted-foreground"}`}>
        {label}
      </span>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

function WireframePlaceholder({ text, h = "h-8" }: { text: string; h?: string }) {
  return (
    <div className={`${h} rounded bg-muted/60 border border-border flex items-center justify-center`}>
      <span className="text-[9px] text-muted-foreground font-medium">{text}</span>
    </div>
  );
}

/* ─── Main Page ─── */

export default function FormBuilderDocsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card flex-shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => navigate(-1)}>
            <ArrowLeft size={12} className="mr-1" /> Back
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            <h1 className="text-sm font-bold text-foreground">Form Builder — Wireframe & Documentation</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => exportPageAsPdf("Form Builder — Documentation")}>
            <FileDown size={12} className="mr-1" /> Download PDF
          </Button>
          <Button size="sm" className="h-7 text-[11px]" onClick={() => navigate("/studio/form-builder")}>
            Open Form Builder →
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

          {/* ─── Overview ─── */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Layers size={20} className="text-primary" /> Overview
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              The Form Builder is a visual editor for designing <strong>QuestionnaireDocument</strong> flows. It enables
              users to create branching questionnaires with support for multiple field types, conditional logic,
              subprocess references, and multi-entry-point flows. The builder produces a standardized JSON document
              compatible with downstream workflow engines.
            </p>
            <div className="flex flex-wrap gap-2">
              {["8 Field Types", "Branching Logic", "Subprocess Links", "Entry Points", "JSON Import/Export", "Validation", "Step-by-Step Preview", "ReactFlow Graph"].map(f => (
                <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
              ))}
            </div>
          </section>

          <Separator />

          {/* ─── UI Wireframes ─── */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <LayoutGrid size={20} className="text-primary" /> UI Wireframes
            </h2>

            <Tabs defaultValue="layout" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="layout" className="text-[11px]">Page Layout</TabsTrigger>
                <TabsTrigger value="question" className="text-[11px]">Question Card</TabsTrigger>
                <TabsTrigger value="graph" className="text-[11px]">Flow Graph</TabsTrigger>
                <TabsTrigger value="preview" className="text-[11px]">Preview Mode</TabsTrigger>
              </TabsList>

              {/* --- Layout wireframe --- */}
              <TabsContent value="layout">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Full Page Layout</CardTitle>
                    <CardDescription className="text-[11px]">Three-zone layout: top toolbar, left navigator, center canvas.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {/* Top Bar */}
                      <WireframeBox label="Top Toolbar" accent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <WireframePlaceholder text="← Back" />
                            <WireframePlaceholder text="Flow Name" />
                            <WireframePlaceholder text="Draft" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <WireframePlaceholder text="Q:12" />
                            <WireframePlaceholder text="Links:8" />
                            <WireframePlaceholder text="⚡ Auto-ID" />
                            <WireframePlaceholder text="⚠ Validate" />
                            <WireframePlaceholder text="🗑 Clear" />
                            <WireframePlaceholder text="👁 Preview" />
                            <WireframePlaceholder text="↑ Import" />
                            <WireframePlaceholder text="↓ Export" />
                          </div>
                        </div>
                      </WireframeBox>

                      {/* Body */}
                      <div className="flex gap-2">
                        {/* Left Panel */}
                        <WireframeBox label="Left Navigator (220px)" className="w-56 flex-shrink-0">
                          <div className="space-y-2 mt-1">
                            <WireframeBox label="Flow Settings">
                              <div className="space-y-1">
                                <WireframePlaceholder text="Flow Name" />
                                <WireframePlaceholder text="Flow ID" />
                                <WireframePlaceholder text="Status: Draft" />
                                <WireframePlaceholder text="Category" />
                              </div>
                            </WireframeBox>
                            <WireframeBox label="Entry Points">
                              <div className="space-y-1">
                                <WireframePlaceholder text="🏁 SRT_REF_01" />
                                <WireframePlaceholder text="🏁 SRT_REF_02" />
                                <WireframePlaceholder text="+ Toggle Entry" />
                              </div>
                            </WireframeBox>
                            <WireframeBox label="Question List">
                              <div className="space-y-1">
                                {["Q1 – Country", "Q2 – Type", "Q3 – Amount", "Q4 – Details", "..."].map((q, i) => (
                                  <WireframePlaceholder key={i} text={q} />
                                ))}
                              </div>
                            </WireframeBox>
                          </div>
                        </WireframeBox>

                        {/* Center Canvas */}
                        <WireframeBox label="Center Canvas (flex-1)" className="flex-1" accent>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <WireframePlaceholder text="🌲 Tree" />
                              <WireframePlaceholder text="🔀 Flow Graph" />
                            </div>
                            <div className="space-y-1.5">
                              <WireframeBox label="Question Card (expandable)">
                                <WireframePlaceholder text="Q1: What is the country?" h="h-6" />
                                <WireframePlaceholder text="[Dropdown] Options + Branching" h="h-10" />
                              </WireframeBox>
                              <WireframeBox label="Question Card">
                                <WireframePlaceholder text="Q2: Transaction type?" h="h-6" />
                              </WireframeBox>
                              <WireframeBox label="Question Card">
                                <WireframePlaceholder text="Q3: Amount?" h="h-6" />
                              </WireframeBox>
                              <WireframePlaceholder text="+ Add Question | + Section | Dropdown | Text | Radio | ..." h="h-8" />
                            </div>
                          </div>
                        </WireframeBox>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* --- Question Card wireframe --- */}
              <TabsContent value="question">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Question Card — Expanded View</CardTitle>
                    <CardDescription className="text-[11px]">Progressive disclosure: collapsed shows label, expanded shows full editor.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-w-lg mx-auto">
                      <WireframeBox label="Question Card" accent>
                        <div className="space-y-2">
                          {/* Header row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <WireframePlaceholder text="▶ Expand" />
                              <WireframePlaceholder text="🏁 Entry" />
                              <WireframePlaceholder text="Q_ID: SRT_REF_05" />
                            </div>
                            <div className="flex gap-1">
                              <WireframePlaceholder text="↑" />
                              <WireframePlaceholder text="↓" />
                              <WireframePlaceholder text="📋" />
                              <WireframePlaceholder text="🗑" />
                            </div>
                          </div>

                          <Separator />

                          {/* Metadata Grid */}
                          <WireframeBox label="Metadata Grid (2-col)">
                            <div className="grid grid-cols-2 gap-1.5">
                              <WireframePlaceholder text="Question ID" />
                              <WireframePlaceholder text="Type: Dropdown ▾" />
                              <WireframePlaceholder text="Label / Content" />
                              <WireframePlaceholder text="Mandatory: ☐" />
                              <WireframePlaceholder text="Category" />
                              <WireframePlaceholder text="Tags" />
                            </div>
                          </WireframeBox>

                          {/* Options */}
                          <WireframeBox label="Options (for Dropdown/Radio/MultiSelect)">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <WireframePlaceholder text="opt_1: Yes" />
                                <WireframePlaceholder text="→ Q_NEXT_01 (question)" />
                                <WireframePlaceholder text="🗑" />
                              </div>
                              <div className="flex items-center gap-1">
                                <WireframePlaceholder text="opt_2: No" />
                                <WireframePlaceholder text="→ END (end)" />
                                <WireframePlaceholder text="🗑" />
                              </div>
                              <div className="flex items-center gap-1">
                                <WireframePlaceholder text="opt_3: Other" />
                                <WireframePlaceholder text="→ SUB_FLOW (subprocess)" />
                                <WireframePlaceholder text="🗑" />
                              </div>
                              <WireframePlaceholder text="+ Add Option" h="h-6" />
                            </div>
                          </WireframeBox>

                          {/* Branching Legend */}
                          <div className="flex gap-2 text-[9px]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> question</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> end</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> subprocess</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> none</span>
                          </div>
                        </div>
                      </WireframeBox>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* --- Flow Graph wireframe --- */}
              <TabsContent value="graph">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">ReactFlow Graph View</CardTitle>
                    <CardDescription className="text-[11px]">Birds-eye view of question flow with nodes, edges, and converging paths.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative bg-muted/20 rounded-lg border border-border p-6 min-h-[300px]">
                      {/* Nodes */}
                      <div className="flex flex-col items-center gap-6">
                        {/* Entry row */}
                        <div className="flex gap-8">
                          <WireframeBox label="🏁 SRT_REF_01" accent className="w-36 text-center">
                            <WireframePlaceholder text="Country?" h="h-5" />
                          </WireframeBox>
                          <WireframeBox label="🏁 SRT_REF_02" accent className="w-36 text-center">
                            <WireframePlaceholder text="Referral Type?" h="h-5" />
                          </WireframeBox>
                        </div>

                        {/* Arrows */}
                        <div className="flex items-center gap-4 text-[9px] text-muted-foreground">
                          <span>↓ "Yes"</span>
                          <span>↓ "No"</span>
                          <span>↓ "Sanctions"</span>
                        </div>

                        {/* Middle row */}
                        <div className="flex gap-6">
                          <WireframeBox label="SRT_REF_05" className="w-32 text-center">
                            <WireframePlaceholder text="Amount?" h="h-5" />
                          </WireframeBox>
                          <WireframeBox label="SRT_REF_08" className="w-32 text-center">
                            <WireframePlaceholder text="Details?" h="h-5" />
                          </WireframeBox>
                          <WireframeBox label="🔶 Subprocess" className="w-32 text-center border-amber-400">
                            <WireframePlaceholder text="Sub-flow ref" h="h-5" />
                          </WireframeBox>
                        </div>

                        {/* Converging */}
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                          <span>↓ converging →</span>
                        </div>

                        {/* End */}
                        <div className="flex gap-8">
                          <WireframeBox label="SRT_REF_10" className="w-36 text-center">
                            <WireframePlaceholder text="Final Review" h="h-5" />
                          </WireframeBox>
                          <WireframeBox label="🔴 END" className="w-24 text-center border-destructive">
                            <WireframePlaceholder text="End" h="h-5" />
                          </WireframeBox>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[9px] text-muted-foreground bg-card/80 rounded px-2 py-1 border border-border">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Entry</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-card border border-border" /> Question</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Subprocess</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> End</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* --- Preview wireframe --- */}
              <TabsContent value="preview">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Step-by-Step Preview</CardTitle>
                    <CardDescription className="text-[11px]">Simulates the end-user experience with branching navigation.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-w-md mx-auto">
                      <WireframeBox label="Preview Dialog" accent>
                        <div className="space-y-3">
                          {/* Progress */}
                          <WireframeBox label="Progress Bar">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full w-1/3 bg-primary rounded-full" />
                            </div>
                            <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
                              <span>Page 1 (3 questions)</span>
                              <span>● ○ ○ ○</span>
                            </div>
                          </WireframeBox>

                          {/* Multi-question page */}
                          <WireframeBox label="Page Content (firstQuestions grouped)">
                            <div className="space-y-1.5">
                              <WireframePlaceholder text="Q1: Country of origin?" h="h-7" />
                              <WireframePlaceholder text="[Dropdown ▾] Select..." h="h-7" />
                              <Separator className="my-1" />
                              <WireframePlaceholder text="Q2: Referral source?" h="h-7" />
                              <WireframePlaceholder text="○ Internal  ○ External  ○ System" h="h-7" />
                              <Separator className="my-1" />
                              <WireframePlaceholder text="Q3: Transaction date?" h="h-7" />
                              <WireframePlaceholder text="[📅 Date Picker]" h="h-7" />
                            </div>
                          </WireframeBox>

                          {/* Navigation */}
                          <div className="flex justify-between">
                            <WireframePlaceholder text="← Previous" />
                            <WireframePlaceholder text="Next →" />
                          </div>
                        </div>
                      </WireframeBox>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>

          <Separator />

          {/* ─── Data Model ─── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Database size={20} className="text-primary" /> Data Model
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                    <Box size={12} /> QuestionnaireDocument
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-[11px] font-mono space-y-1">
                  <p className="text-muted-foreground">Root document containing:</p>
                  <div className="bg-muted/50 rounded p-2 space-y-0.5">
                    <p><span className="text-primary">flow</span>: Flow — metadata, entry points, path graph</p>
                    <p><span className="text-primary">questions</span>: Question[] — all question definitions</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                    <Box size={12} /> Flow
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-[11px] font-mono">
                  <div className="bg-muted/50 rounded p-2 space-y-0.5">
                    <p><span className="text-primary">flowId</span>: string</p>
                    <p><span className="text-primary">flowName</span>: string</p>
                    <p><span className="text-primary">status</span>: "Draft" | "Published" | "Archived"</p>
                    <p><span className="text-primary">firstQuestions</span>: string[] — entry point IDs</p>
                    <p><span className="text-primary">path</span>: FlowNode[] — branching graph</p>
                    <p><span className="text-primary">links</span>: FlowLink[] — GoJS edge data</p>
                    <p><span className="text-primary">nodes</span>: FlowNode[] — GoJS node data</p>
                    <p className="text-muted-foreground">+ category, tags, version, timestamps...</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                    <Box size={12} /> Question
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-[11px] font-mono">
                  <div className="bg-muted/50 rounded p-2 space-y-0.5">
                    <p><span className="text-primary">questionId</span>: string</p>
                    <p><span className="text-primary">content</span>: string — the question label</p>
                    <p><span className="text-primary">questionType</span>: QuestionType (8 types)</p>
                    <p><span className="text-primary">mandatory</span>: "True" | "False"</p>
                    <p><span className="text-primary">options</span>: QuestionOption[]</p>
                    <p><span className="text-primary">_branches</span>: Record&lt;optId, OptionBranch&gt;</p>
                    <p className="text-muted-foreground">+ category, tags, language, region, status...</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                    <Box size={12} /> OptionBranch (internal)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-[11px] font-mono">
                  <div className="bg-muted/50 rounded p-2 space-y-0.5">
                    <p><span className="text-primary">id</span>: string — matches option.id</p>
                    <p><span className="text-primary">nextEntityType</span>: "question" | "end" | "subprocess" | "none"</p>
                    <p><span className="text-primary">targetId</span>: string — destination ID</p>
                  </div>
                  <p className="text-muted-foreground mt-2">Stripped on export; rebuilt from <code>path</code> on import.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* ─── Field Types ─── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Settings2 size={20} className="text-primary" /> Supported Field Types
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: "Dropdown", desc: "Single-select dropdown with branching", branching: true },
                { type: "RadioButton", desc: "Single-select radio group with branching", branching: true },
                { type: "MultiSelect", desc: "Multi-select checkboxes with branching", branching: true },
                { type: "TextInput", desc: "Single-line text field", branching: false },
                { type: "TextArea", desc: "Multi-line text field", branching: false },
                { type: "DatePicker", desc: "Date selector", branching: false },
                { type: "NumberInput", desc: "Numeric input field", branching: false },
                { type: "FileUpload", desc: "File attachment field", branching: false },
              ].map(ft => (
                <Card key={ft.type} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-foreground">{ft.type}</span>
                    {ft.branching && <Badge className="text-[8px] h-4 bg-primary/10 text-primary border-primary/20">Branching</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{ft.desc}</p>
                </Card>
              ))}
            </div>
          </section>

          <Separator />

          {/* ─── Architecture ─── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ListTree size={20} className="text-primary" /> Component Architecture
            </h2>

            <Card>
              <CardContent className="pt-4">
                <div className="font-mono text-[11px] space-y-1 text-foreground">
                  <p className="font-bold text-primary">FormBuilderPage</p>
                  <p className="pl-4">├── <span className="text-primary">TopBar</span> — navigation, stats, actions (validate, export, import, preview)</p>
                  <p className="pl-4">├── <span className="text-primary">LeftPanel</span> — flow settings, entry points, question navigator</p>
                  <p className="pl-4">│   ├── Flow metadata fields (name, ID, status, category)</p>
                  <p className="pl-4">│   ├── Entry points list (firstQuestions toggle)</p>
                  <p className="pl-4">│   └── Scrollable question list (click to select & expand)</p>
                  <p className="pl-4">├── <span className="text-primary">CenterPanel</span> — main editing canvas</p>
                  <p className="pl-4">│   ├── View toggle: Tree | Flow Graph</p>
                  <p className="pl-4">│   ├── <span className="text-primary">TreeView</span> — hierarchical card editor</p>
                  <p className="pl-4">│   │   └── <span className="text-primary">QuestionCard</span> (expandable, progressive disclosure)</p>
                  <p className="pl-4">│   │       ├── Metadata grid (ID, type, label, mandatory, category, tags)</p>
                  <p className="pl-4">│   │       ├── Options editor (add/remove/edit options)</p>
                  <p className="pl-4">│   │       └── Branch targets (question / end / subprocess / none)</p>
                  <p className="pl-4">│   └── <span className="text-primary">FlowGraphView</span> — ReactFlow visualization</p>
                  <p className="pl-4">│       ├── BFS layered layout from entry points</p>
                  <p className="pl-4">│       ├── Color-coded nodes (entry, question, subprocess, end)</p>
                  <p className="pl-4">│       └── Labeled edges with MiniMap</p>
                  <p className="pl-4">├── <span className="text-primary">ExportDialog</span> — JSON viewer, copy, download</p>
                  <p className="pl-4">├── <span className="text-primary">ImportDialog</span> — paste JSON or upload .json file</p>
                  <p className="pl-4">├── <span className="text-primary">ValidationDialog</span> — error/warning report</p>
                  <p className="pl-4">└── <span className="text-primary">QuestionnairePreview</span> — step-by-step simulation</p>
                  <p className="pl-8">├── Groups firstQuestions on page 1</p>
                  <p className="pl-8">├── Follows branches for subsequent pages</p>
                  <p className="pl-8">└── Progress bar with page navigation</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* ─── Store / State ─── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Zap size={20} className="text-primary" /> State Management (Zustand)
            </h2>
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
                  <div>
                    <p className="font-bold text-foreground mb-1">CRUD Operations</p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      <li>• addQuestion(type?)</li>
                      <li>• addSection()</li>
                      <li>• updateQuestion(id, updates)</li>
                      <li>• removeQuestion(id)</li>
                      <li>• duplicateQuestion(id)</li>
                      <li>• moveQuestion(id, dir)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold text-foreground mb-1">Options & Branching</p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      <li>• addOption(qId)</li>
                      <li>• updateOption(qId, idx, field, val)</li>
                      <li>• removeOption(qId, idx)</li>
                      <li>• setBranch(qId, optId, branch)</li>
                      <li>• toggleFirstQuestion(qId)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold text-foreground mb-1">I/O & Validation</p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      <li>• importDocument(doc) — rebuilds _branches</li>
                      <li>• exportDocument() — strips _branches, builds path/links/nodes</li>
                      <li>• validate() — returns ValidationIssue[]</li>
                      <li>• autoGenerateIds()</li>
                      <li>• clearAll()</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* ─── Validation Rules ─── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 size={20} className="text-primary" /> Validation Rules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { level: "error", icon: <AlertTriangle size={12} className="text-destructive" />, rule: "Entry point references non-existent question" },
                { level: "error", icon: <AlertTriangle size={12} className="text-destructive" />, rule: "Question has empty ID" },
                { level: "error", icon: <AlertTriangle size={12} className="text-destructive" />, rule: "Branch targets non-existent question" },
                { level: "warning", icon: <AlertTriangle size={12} className="text-amber-500" />, rule: "No entry points defined" },
                { level: "warning", icon: <AlertTriangle size={12} className="text-amber-500" />, rule: "Question has no label" },
                { level: "warning", icon: <AlertTriangle size={12} className="text-amber-500" />, rule: "Dropdown/Radio/MultiSelect has no options" },
              ].map((v, i) => (
                <div key={i} className={`flex items-center gap-2 p-2.5 rounded-md text-[11px] border ${
                  v.level === "error" ? "bg-destructive/5 border-destructive/20" : "bg-amber-500/5 border-amber-500/20"
                }`}>
                  {v.icon}
                  <span className="text-foreground">{v.rule}</span>
                  <Badge variant="outline" className="ml-auto text-[8px]">{v.level}</Badge>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* ─── User Flows ─── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <GitBranch size={20} className="text-primary" /> Key User Flows
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "Create from Scratch",
                  steps: ["Open Form Builder", "Set flow name & metadata", "Add questions with quick-type buttons", "Add options to Dropdown/Radio questions", "Set branch targets for each option", "Mark entry point questions", "Validate & export JSON"],
                },
                {
                  title: "Import Existing Flow",
                  steps: ["Click Import button", "Paste JSON or upload .json file", "System rebuilds _branches from path data", "Questions appear in tree view", "Edit/extend as needed", "Export updated document"],
                },
                {
                  title: "Visual Review (Flow Graph)",
                  steps: ["Switch to Flow Graph tab", "BFS layout renders from entry points", "Color-coded nodes show question types", "Labeled edges show branching logic", "Click node to select & edit in tree", "Use MiniMap for large flows"],
                },
                {
                  title: "Preview as End User",
                  steps: ["Click Preview button", "firstQuestions shown together on page 1", "Answer questions, click Next", "System follows branch logic to next page", "Progress bar shows navigation state", "Navigate back to change answers"],
                },
              ].map(flow => (
                <Card key={flow.title}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold">{flow.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-1">
                      {flow.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px]">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <div className="h-12" />
        </div>
      </ScrollArea>
    </div>
  );
}
