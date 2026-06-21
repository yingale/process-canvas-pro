/**
 * NodeConfigDialog – opens when an automation node is dropped onto a step.
 * Three sections: Previous Step I/O → Current Step Config → Output Mapping
 * Supports drag-and-drop of I/O variables between sections.
 */
import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, GripVertical, Zap, ChevronRight, Save, Loader2 } from "lucide-react";
import type { Step } from "@/types/caseIr";
import type { AutomationNodeDef, NodeIoField } from "./automationNodes";
import { getNodeDef } from "./automationNodes";
import { supabase } from "@/integrations/supabase/client";
import NodeRaciSection, { EMPTY_RACI, type NodeRaci } from "./NodeRaciSection";

interface NodeConfigDialogProps {
  open: boolean;
  onClose: () => void;
  currentStep: Step | null;
  previousStep: Step | null;
  workflowId: string;
  onSave: (config: Record<string, unknown>, inputMappings: IoMapping[], outputMappings: IoMapping[]) => void;
}

export interface IoMapping {
  sourceVariable: string;
  sourceField: string;
  targetField: string;
}

function getStepNodeDef(step: Step | null): AutomationNodeDef | undefined {
  if (!step?.moduleRef) return undefined;
  return getNodeDef(step.moduleRef.moduleId);
}

function getPreviousOutputs(step: Step | null): NodeIoField[] {
  const def = getStepNodeDef(step);
  if (!def) return [];
  return def.outputs;
}

function getCurrentInputs(step: Step | null): NodeIoField[] {
  const def = getStepNodeDef(step);
  if (!def) return [];
  return def.inputs;
}

function getCurrentOutputs(step: Step | null): NodeIoField[] {
  const def = getStepNodeDef(step);
  if (!def) return [];
  return def.outputs;
}

/* ── Draggable I/O Chip ─────────────────────────────────────── */
function IoChip({ field, stepName, draggable }: { field: NodeIoField; stepName: string; draggable?: boolean }) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-io-field", JSON.stringify({ ...field, stepName }));
        e.dataTransfer.effectAllowed = "copy";
      }}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-colors ${
        draggable ? "cursor-grab hover:border-primary hover:bg-primary/5 active:cursor-grabbing" : ""
      } bg-muted/50`}
    >
      {draggable && <GripVertical size={10} className="text-muted-foreground/50" />}
      <span className="text-foreground font-medium">{field.name}</span>
      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{field.type}</Badge>
    </div>
  );
}

/* ── Drop Zone for mapping ──────────────────────────────────── */
function MappingDropZone({
  targetField,
  mappings,
  onAddMapping,
  onRemoveMapping,
}: {
  targetField: NodeIoField;
  mappings: IoMapping[];
  onAddMapping: (m: IoMapping) => void;
  onRemoveMapping: (idx: number) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const fieldMappings = mappings.filter((m) => m.targetField === targetField.name);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed transition-colors min-h-[40px] ${
        dragOver ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        try {
          const data = JSON.parse(e.dataTransfer.getData("application/x-io-field"));
          onAddMapping({
            sourceVariable: `\${${data.stepName}.${data.name}}`,
            sourceField: data.name,
            targetField: targetField.name,
          });
        } catch {}
      }}
    >
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-medium text-foreground">{targetField.name}</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{targetField.type}</Badge>
        </div>
        {fieldMappings.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {fieldMappings.map((m, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <ArrowRight size={10} className="text-primary" />
                <code className="text-primary font-mono">{m.sourceVariable}</code>
                <button
                  className="ml-auto text-destructive/60 hover:text-destructive text-[10px]"
                  onClick={() => onRemoveMapping(mappings.indexOf(m))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {fieldMappings.length === 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">Drop variable here or enter manually</p>
        )}
      </div>
    </div>
  );
}

export default function NodeConfigDialog({
  open,
  onClose,
  currentStep,
  previousStep,
  workflowId,
  onSave,
}: NodeConfigDialogProps) {
  const nodeDef = getStepNodeDef(currentStep);
  const prevDef = getStepNodeDef(previousStep);

  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [inputMappings, setInputMappings] = useState<IoMapping[]>([]);
  const [outputMappings, setOutputMappings] = useState<IoMapping[]>([]);
  const [raci, setRaci] = useState<NodeRaci>(EMPTY_RACI);
  const [saving, setSaving] = useState(false);

  // Initialize config from step's existing instanceConfig
  useEffect(() => {
    if (!currentStep?.moduleRef || !nodeDef) return;
    const initial: Record<string, unknown> = { ...nodeDef.defaultConfig };
    const existing = currentStep.moduleRef!.instanceConfig;
    for (const key of Object.keys(initial)) {
      if (existing[key] !== undefined) initial[key] = existing[key];
    }
    setConfig(initial);
    setInputMappings([]);
    setOutputMappings([]);
    setRaci(EMPTY_RACI);

    if (workflowId && currentStep.id && nodeDef.id) {
      supabase
        .from("node_instance_configs")
        .select("*")
        .eq("workflow_id", workflowId)
        .eq("step_id", currentStep.id)
        .eq("node_id", nodeDef.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setConfig(data.config as unknown as Record<string, unknown>);
            setInputMappings((data.input_mappings as unknown as IoMapping[]) || []);
            setOutputMappings((data.output_mappings as unknown as IoMapping[]) || []);
            const p = (data as unknown as { personas?: NodeRaci }).personas;
            if (p && typeof p === "object") {
              setRaci({
                responsible: Array.isArray(p.responsible) ? p.responsible : [],
                accountable: p.accountable ?? null,
                consulted: Array.isArray(p.consulted) ? p.consulted : [],
                informed: Array.isArray(p.informed) ? p.informed : [],
              });
            }
          }
        });
    }
  }, [currentStep, nodeDef, workflowId]);

  const updateConfigField = useCallback((key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addInputMapping = useCallback((m: IoMapping) => {
    setInputMappings((prev) => [...prev.filter((x) => x.targetField !== m.targetField), m]);
  }, []);

  const removeInputMapping = useCallback((idx: number) => {
    setInputMappings((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(async () => {
    if (!currentStep || !nodeDef) return;
    setSaving(true);
    try {
      const payload = {
        workflow_id: workflowId,
        step_id: currentStep.id,
        node_id: nodeDef.id,
        node_type: nodeDef.category,
        config,
        input_mappings: inputMappings,
        output_mappings: outputMappings,
        personas: raci,
      };

      await supabase
        .from("node_instance_configs")
        .upsert(payload as any, { onConflict: "workflow_id,step_id,node_id" });

      onSave(config, inputMappings, outputMappings);
      onClose();
    } catch (e) {
      console.error("Failed to save node config:", e);
    } finally {
      setSaving(false);
    }
  }, [currentStep, nodeDef, workflowId, config, inputMappings, outputMappings, raci, onSave, onClose]);

  if (!nodeDef || !currentStep) return null;

  const prevOutputs = getPreviousOutputs(previousStep);
  const curInputs = getCurrentInputs(currentStep);
  const curOutputs = getCurrentOutputs(currentStep);
  const prevOutputVariable = previousStep?.moduleRef?.instanceConfig?.outputVariable as string | undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1100px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Zap size={16} className="text-primary" />
            Configure: {nodeDef.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Map inputs from previous step, configure this node, and define outputs for downstream nodes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_1.2fr_auto_1fr] gap-0 h-full min-h-[400px]">
            {/* ── LEFT: Previous Step ──────────────────────────── */}
            <ScrollArea className="pr-3">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">1</div>
                  <h3 className="text-sm font-semibold text-foreground">Previous Step</h3>
                </div>
                {previousStep && (
                  <Badge variant="secondary" className="text-[10px]">
                    {previousStep.name}
                  </Badge>
                )}

                {!previousStep ? (
                  <p className="text-xs text-muted-foreground italic">No previous step — this is the first node in the flow.</p>
                ) : prevOutputs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Previous step has no defined outputs.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Available Outputs (drag to map)</p>
                    {prevOutputVariable && (
                      <p className="text-[10px] text-muted-foreground">
                        Output variable: <code className="text-primary">${`{${prevOutputVariable}}`}</code>
                      </p>
                    )}
                    <div className="flex flex-col gap-2">
                      {prevOutputs.map((o) => (
                        <IoChip key={o.name} field={o} stepName={prevOutputVariable || previousStep!.name} draggable />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* ── Arrow Left→Middle ──────────────────────────── */}
            <div className="flex items-center justify-center px-1">
              <ChevronRight size={20} className="text-muted-foreground" />
            </div>

            {/* ── MIDDLE: Current Step Configuration ─────────── */}
            <ScrollArea className="px-3 border-x border-border">
              <div className="p-4 space-y-4" style={{ borderColor: nodeDef.color + "40" }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: nodeDef.color }}>2</div>
                  <h3 className="text-sm font-semibold text-foreground">{nodeDef.name} Configuration</h3>
                </div>

                {/* Input Mappings (drop zones) */}
                {curInputs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Input Mappings</p>
                    {curInputs.map((inp) => (
                      <MappingDropZone
                        key={inp.name}
                        targetField={inp}
                        mappings={inputMappings}
                        onAddMapping={addInputMapping}
                        onRemoveMapping={removeInputMapping}
                      />
                    ))}
                  </div>
                )}

                {curInputs.length > 0 && nodeDef.configFields.length > 0 && <Separator />}

                {/* Config Fields */}
                <div className="grid grid-cols-1 gap-3">
                  {nodeDef.configFields.map((field) => (
                    <div key={field.key}>
                      <Label className="text-[11px] font-medium mb-1 block">
                        {field.label}
                        {field.required && <span className="text-destructive ml-0.5">*</span>}
                      </Label>
                      {field.type === "boolean" ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config[field.key] === "true" || config[field.key] === true}
                            onCheckedChange={(v) => updateConfigField(field.key, v ? "true" : "false")}
                          />
                          <span className="text-[10px] text-muted-foreground">{config[field.key] === "true" || config[field.key] === true ? "Yes" : "No"}</span>
                        </div>
                      ) : field.type === "select" ? (
                        <Select
                          value={String(config[field.key] ?? field.defaultValue ?? "")}
                          onValueChange={(v) => updateConfigField(field.key, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((opt) => (
                              <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === "multiline" ? (
                        <Textarea
                          value={String(config[field.key] ?? "")}
                          onChange={(e) => updateConfigField(field.key, e.target.value)}
                          className="text-xs min-h-[60px]"
                          placeholder={field.hint}
                        />
                      ) : field.type === "slider" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={field.min ?? 0}
                            max={field.max ?? 1}
                            step={field.step ?? 0.1}
                            value={Number(config[field.key] ?? field.defaultValue ?? 0)}
                            onChange={(e) => updateConfigField(field.key, e.target.value)}
                            className="flex-1"
                          />
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{String(config[field.key] ?? field.defaultValue ?? "")}</span>
                        </div>
                      ) : (
                        <Input
                          type={field.type === "number" ? "number" : "text"}
                          value={String(config[field.key] ?? "")}
                          onChange={(e) => updateConfigField(field.key, e.target.value)}
                          className="h-8 text-xs"
                          placeholder={field.hint}
                          min={field.min}
                          max={field.max}
                        />
                      )}
                      {field.hint && field.type !== "multiline" && (
                        <p className="text-[9px] text-muted-foreground mt-0.5">{field.hint}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>

            {/* ── Arrow Middle→Right ─────────────────────────── */}
            <div className="flex items-center justify-center px-1">
              <ChevronRight size={20} className="text-muted-foreground" />
            </div>

            {/* ── RIGHT: Output of Current Step ─────────────── */}
            <ScrollArea className="pl-3">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-accent-foreground">3</div>
                  <h3 className="text-sm font-semibold text-foreground">Output</h3>
                </div>

                {curOutputs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">This node has no defined outputs.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Available for next step
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Variable: <code className="text-primary">${`{${config.outputVariable || nodeDef.id + "Result"}}`}</code>
                    </p>
                    <div className="flex flex-col gap-2">
                      {curOutputs.map((o) => (
                        <IoChip key={o.name} field={o} stepName={String(config.outputVariable || nodeDef.id + "Result")} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
