/**
 * NewFormDialog – popup for creating a new form after drag-drop onto a step
 */
import { useState } from "react";
import { FormInput, Eye, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NewFormDialogProps {
  open: boolean;
  onClose: () => void;
  targetStepName?: string;
  onCreateForm: (formName: string) => void;
  onPreview?: () => void;
  hasExistingForm?: boolean;
}

export default function NewFormDialog({
  open, onClose, targetStepName, onCreateForm, onPreview, hasExistingForm,
}: NewFormDialogProps) {
  const [formName, setFormName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    if (!formName.trim()) return;
    setCreating(true);
    onCreateForm(formName.trim());
    setFormName("");
    setCreating(false);
  };

  const handleClose = () => {
    setFormName("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FormInput size={18} className="text-primary" />
            New Form
          </DialogTitle>
          <DialogDescription>
            {targetStepName
              ? `Create a form for step "${targetStepName}"`
              : "Create a new form and attach it to the selected step"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Form Name</label>
            <Input
              placeholder="e.g. Customer Onboarding Form"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          {hasExistingForm && onPreview && (
            <Button variant="outline" size="sm" onClick={onPreview} className="gap-1.5">
              <Eye size={14} />
              Preview
            </Button>
          )}
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
      </DialogContent>
    </Dialog>
  );
}
