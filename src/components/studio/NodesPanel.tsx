/**
 * NodesPanel – draggable automation node palette for the Studio.
 * Nodes can be dragged onto stages/groups in the lifecycle diagram.
 */
import { useState } from "react";
import {
  Mail, FileSpreadsheet, Brain, Columns3, Send,
  ChevronDown, ChevronRight, GripVertical, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { AUTOMATION_NODES, type AutomationNodeDef } from "./automationNodes";
import "./studio.css";

const ICON_MAP: Record<string, LucideIcon> = {
  Mail, FileSpreadsheet, Brain, Columns3, Send,
};

const CATEGORY_LABELS: Record<string, string> = {
  communication: "Communication",
  extraction: "Data Extraction",
  ai: "AI & Processing",
  notification: "Notification",
};

function NodeCard({ node }: { node: AutomationNodeDef }) {
  const Icon = ICON_MAP[node.icon] ?? Mail;

  return (
    <div
      className="node-palette-card flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-automation-node", node.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      style={{ "--node-color": node.color } as React.CSSProperties}
    >
      <GripVertical size={10} className="text-foreground-subtle flex-shrink-0 opacity-40" />
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: `${node.color}15`, color: node.color }}
      >
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-foreground truncate">{node.name}</div>
        <div className="text-[9px] text-foreground-muted truncate">{node.description}</div>
      </div>
      <ArrowRight size={10} className="text-foreground-subtle flex-shrink-0 opacity-40" />
    </div>
  );
}

function CategoryGroup({ category, nodes }: { category: string; nodes: AutomationNodeDef[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-3">
      <button
        className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground-muted hover:text-foreground transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {CATEGORY_LABELS[category] ?? category}
        <span className="ml-auto text-foreground-subtle font-mono">{nodes.length}</span>
      </button>
      {open && (
        <div className="mt-1 space-y-1.5 px-1">
          {nodes.map(node => <NodeCard key={node.id} node={node} />)}
        </div>
      )}
    </div>
  );
}

export default function NodesPanel() {
  const categories = Array.from(new Set(AUTOMATION_NODES.map(n => n.category)));

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b flex-shrink-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
          Automation Nodes
        </div>
        <div className="text-[9px] text-foreground-subtle mt-0.5">
          Drag a node onto any group to add it as a step
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {categories.map(cat => (
          <CategoryGroup
            key={cat}
            category={cat}
            nodes={AUTOMATION_NODES.filter(n => n.category === cat)}
          />
        ))}
      </div>

      {/* Example workflow hint */}
      <div className="border-t px-3 py-2 flex-shrink-0">
        <div className="text-[9px] font-semibold text-foreground-muted mb-1">Example Pipeline</div>
        <div className="flex items-center gap-1 text-[8px] text-foreground-subtle flex-wrap">
          <span className="px-1.5 py-0.5 rounded" style={{ background: "hsl(213 88% 42% / 0.12)" }}>Email Fetcher</span>
          <ArrowRight size={8} />
          <span className="px-1.5 py-0.5 rounded" style={{ background: "hsl(32 90% 48% / 0.12)" }}>Chunk Extractor</span>
          <ArrowRight size={8} />
          <span className="px-1.5 py-0.5 rounded" style={{ background: "hsl(268 62% 52% / 0.12)" }}>AI Processor</span>
          <ArrowRight size={8} />
          <span className="px-1.5 py-0.5 rounded" style={{ background: "hsl(152 68% 38% / 0.12)" }}>Column Extractor</span>
          <ArrowRight size={8} />
          <span className="px-1.5 py-0.5 rounded" style={{ background: "hsl(199 80% 42% / 0.12)" }}>Email Notification</span>
        </div>
      </div>
    </div>
  );
}
