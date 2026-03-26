/**
 * NewFormDialog – popup for creating a new form after drag-drop onto a step
 */
import { useState } from "react";
import { FormInput, Eye, Loader2, X, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface NewFormDialogProps {
  open: boolean;
  onClose: () => void;
  targetStepName?: string;
  onCreateForm: (formName: string) => void;
  hasExistingForm?: boolean;
  createdFormId?: string;
  createdFormName?: string;
}

export default function NewFormDialog({
  open, onClose, targetStepName, onCreateForm, hasExistingForm, createdFormId, createdFormName,
}: NewFormDialogProps) {
  const [formName, setFormName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleCreate = () => {
    if (!formName.trim()) return;
    setCreating(true);
    onCreateForm(formName.trim());
    setFormName("");
    setCreating(false);
  };

  const handleClose = () => {
    setFormName("");
    setShowPreview(false);
    onClose();
  };

  // If form was just created, show success + preview option
  const justCreated = !!createdFormId;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FormInput size={18} className="text-primary" />
            {justCreated ? "Form Created" : "New Form"}
          </DialogTitle>
          <DialogDescription>
            {justCreated
              ? `Form "${createdFormName}" has been attached to step "${targetStepName}"`
              : targetStepName
                ? `Create a form for step "${targetStepName}"`
                : "Create a new form and attach it to the selected step"}
          </DialogDescription>
        </DialogHeader>

        {justCreated ? (
          <div className="space-y-4 py-2">
            {/* Success state */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/30 border border-accent">
              <CheckCircle2 size={18} className="text-primary shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-foreground">Form ID:</span>{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{createdFormId}</code>
              </div>
            </div>

            {showPreview && (
              <div className="border rounded-lg p-4 space-y-3 bg-card">
                <h4 className="text-sm font-semibold text-foreground">{createdFormName} — Preview</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">First Name <span className="text-destructive">*</span></Label>
                    <Input placeholder="Enter first name" disabled className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Last Name <span className="text-destructive">*</span></Label>
                    <Input placeholder="Enter last name" disabled className="h-8 text-sm" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">Default fields — customize in Form Builder</p>
              </div>
            )}

            <DialogFooter className="flex gap-2 sm:gap-2">
              {!showPreview && (
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} className="gap-1.5">
                  <Eye size={14} />
                  Preview
                </Button>
              )}
              <Button size="sm" onClick={handleClose} className="gap-1.5">
                <X size={14} />
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Form Name</Label>
                <Input
                  placeholder="e.g. Customer Onboarding Form"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                  autoFocus
                />
              </div>
              {hasExistingForm && (
                <p className="text-xs text-muted-foreground">This step already has a form attached. Creating a new one will replace it.</p>
              )}
            </div>

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button variant="outline" size="sm" onClick={handleClose} className="gap-1.5">
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formName.trim() || creating}
                size="sm"
                className="gap-1.5"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <FormInput size={14} />}
                Create Form
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
