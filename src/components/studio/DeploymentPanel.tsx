import { Rocket, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { CaseIR, JsonPatch, DeploymentStatus } from "@/types/caseIr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const STATUS_BADGES: Record<DeploymentStatus, { icon: typeof CheckCircle2; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { icon: Clock, variant: "secondary" },
  staging: { icon: AlertCircle, variant: "outline" },
  production: { icon: CheckCircle2, variant: "default" },
};

interface DeploymentPanelProps {
  caseIr: CaseIR;
  onPatch: (patch: JsonPatch) => void;
}

export default function DeploymentPanel({ caseIr, onPatch }: DeploymentPanelProps) {
  const deploy = caseIr.deployment ?? { targetEnvironment: "development", version: "1.0.0", status: "draft" as DeploymentStatus };

  const updateField = (field: string, value: string) => {
    if (!caseIr.deployment) {
      onPatch([{ op: "add", path: "/deployment", value: { ...deploy, [field]: value } }]);
    } else {
      onPatch([{ op: "replace", path: `/deployment/${field}`, value }]);
    }
  };

  const StatusIcon = STATUS_BADGES[deploy.status]?.icon ?? Clock;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Rocket size={20} className="text-primary" /> Deployment
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Configure deployment target and version settings.</p>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium w-32">Status</span>
          <Badge variant={STATUS_BADGES[deploy.status]?.variant ?? "secondary"} className="flex items-center gap-1">
            <StatusIcon size={12} /> {deploy.status}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium w-32">Environment</label>
          <Select value={deploy.targetEnvironment} onValueChange={v => updateField("targetEnvironment", v)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium w-32">Version</label>
          <Input value={deploy.version} onChange={e => updateField("version", e.target.value)} className="max-w-[200px]" />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium w-32">Deploy Status</label>
          <Select value={deploy.status} onValueChange={v => updateField("status", v)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-start gap-3">
          <label className="text-sm font-medium w-32 pt-2">Notes</label>
          <Textarea
            value={deploy.notes ?? ""}
            onChange={e => updateField("notes", e.target.value)}
            placeholder="Deployment notes..."
            className="max-w-[400px]"
            rows={3}
          />
        </div>

        {deploy.deployedAt && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="w-32">Last deployed</span>
            <span>{new Date(deploy.deployedAt).toLocaleString()}{deploy.deployedBy ? ` by ${deploy.deployedBy}` : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}
