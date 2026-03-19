import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Eye, EyeOff, GripVertical, Settings2, LayoutDashboard } from "lucide-react";
import "../components/studio/studio.css";

/* ------------------------------------------------------------------ */
/*  Available case view fields                                         */
/* ------------------------------------------------------------------ */
interface CaseField {
  id: string;
  label: string;
  description: string;
  category: "identity" | "status" | "details" | "people" | "dates" | "custom";
  defaultEnabled: boolean;
}

const CASE_FIELDS: CaseField[] = [
  { id: "caseId", label: "Case ID", description: "Unique identifier for the case", category: "identity", defaultEnabled: true },
  { id: "caseName", label: "Case Name", description: "Display name of the case", category: "identity", defaultEnabled: true },
  { id: "caseDescription", label: "Case Description", description: "Brief summary of the case purpose", category: "details", defaultEnabled: true },
  { id: "status", label: "Status", description: "Current lifecycle status (Draft, Active, Resolved, Closed)", category: "status", defaultEnabled: true },
  { id: "priority", label: "Priority", description: "Priority level (Low, Medium, High, Critical)", category: "status", defaultEnabled: true },
  { id: "owner", label: "Owner", description: "Person responsible for the case", category: "people", defaultEnabled: true },
  { id: "assignee", label: "Assignee", description: "Currently assigned team member", category: "people", defaultEnabled: false },
  { id: "requestor", label: "Requestor", description: "Person who initiated the request", category: "people", defaultEnabled: true },
  { id: "requestInfo", label: "Request Information", description: "Details of the original request or submission", category: "details", defaultEnabled: true },
  { id: "category", label: "Category", description: "Business category or type classification", category: "details", defaultEnabled: false },
  { id: "tags", label: "Tags", description: "Labels for filtering and grouping", category: "details", defaultEnabled: false },
  { id: "createdDate", label: "Created Date", description: "When the case was created", category: "dates", defaultEnabled: true },
  { id: "updatedDate", label: "Last Updated", description: "Most recent modification date", category: "dates", defaultEnabled: false },
  { id: "dueDate", label: "Due Date", description: "Target completion date", category: "dates", defaultEnabled: false },
  { id: "slaDeadline", label: "SLA Deadline", description: "Service level agreement deadline", category: "dates", defaultEnabled: false },
  { id: "currentStage", label: "Current Stage", description: "Active stage in the workflow lifecycle", category: "status", defaultEnabled: true },
  { id: "resolution", label: "Resolution", description: "Outcome or resolution details", category: "details", defaultEnabled: false },
  { id: "attachmentCount", label: "Attachments", description: "Number of attached documents", category: "details", defaultEnabled: false },
  { id: "department", label: "Department", description: "Responsible department or business unit", category: "people", defaultEnabled: false },
  { id: "comments", label: "Comments / Activity", description: "Communication and activity log", category: "details", defaultEnabled: false },
];

const CATEGORY_LABELS: Record<string, string> = {
  identity: "Identity",
  status: "Status & Progress",
  details: "Details & Content",
  people: "People & Roles",
  dates: "Dates & Deadlines",
  custom: "Custom Fields",
};

const CATEGORY_ORDER = ["identity", "status", "details", "people", "dates", "custom"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function CaseViewConfigPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routerState = location.state as {
    generatedIr?: unknown;
    generatedWarnings?: string[];
  } | null;

  const [enabledFields, setEnabledFields] = useState<Set<string>>(() => {
    const defaults = new Set<string>();
    CASE_FIELDS.forEach((f) => { if (f.defaultEnabled) defaults.add(f.id); });
    return defaults;
  });

  const toggleField = (id: string) => {
    setEnabledFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (category: string) => {
    const catFields = CASE_FIELDS.filter((f) => f.category === category);
    const allEnabled = catFields.every((f) => enabledFields.has(f.id));
    setEnabledFields((prev) => {
      const next = new Set(prev);
      catFields.forEach((f) => { allEnabled ? next.delete(f.id) : next.add(f.id); });
      return next;
    });
  };

  const grouped = useMemo(() => {
    const map: Record<string, CaseField[]> = {};
    CASE_FIELDS.forEach((f) => {
      if (!map[f.category]) map[f.category] = [];
      map[f.category].push(f);
    });
    return map;
  }, []);

  const enabledList = useMemo(
    () => CASE_FIELDS.filter((f) => enabledFields.has(f.id)),
    [enabledFields]
  );

  const handleContinue = () => {
    // Store config in sessionStorage for studio to pick up
    sessionStorage.setItem(
      "caseViewConfig",
      JSON.stringify(Array.from(enabledFields))
    );
    navigate("/studio", {
      state: routerState ?? undefined,
    });
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="landing-page" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <button
          className="landing-page-btn"
          onClick={() => navigate(-1)}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}
        >
          <ChevronLeft size={14} /> Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <LayoutDashboard size={22} style={{ color: "hsl(var(--primary))" }} />
          <h1 className="landing-hero-title" style={{ fontSize: "1.4rem", margin: 0 }}>
            Configure Case View
          </h1>
        </div>
        <p className="landing-hero-subtitle" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
          Select which fields should be visible when viewing cases created by this workflow in the case management platform.
        </p>
      </div>

      {/* Main layout: checklist left, preview right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 24, alignItems: "start" }}>
        {/* Left: Field checklist */}
        <div
          style={{
            border: "1px solid hsl(var(--border))",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid hsl(var(--border))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "hsl(var(--surface-raised))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Settings2 size={16} style={{ color: "hsl(var(--primary))" }} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                Available Fields
              </span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--foreground-muted))" }}>
              {enabledFields.size} of {CASE_FIELDS.length} selected
            </span>
          </div>

          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {CATEGORY_ORDER.filter((c) => grouped[c]).map((cat) => {
              const fields = grouped[cat];
              const allOn = fields.every((f) => enabledFields.has(f.id));
              return (
                <div key={cat}>
                  <div
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "hsl(var(--muted) / 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid hsl(var(--border))",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "hsl(var(--foreground-muted))" }}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <button
                      onClick={() => toggleAll(cat)}
                      style={{
                        fontSize: "0.7rem",
                        color: "hsl(var(--primary))",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {allOn ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  {fields.map((field) => {
                    const on = enabledFields.has(field.id);
                    return (
                      <div
                        key={field.id}
                        onClick={() => toggleField(field.id)}
                        style={{
                          padding: "10px 20px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          cursor: "pointer",
                          borderBottom: "1px solid hsl(var(--border))",
                          backgroundColor: on ? "hsl(var(--primary) / 0.04)" : "transparent",
                          transition: "background-color 0.15s",
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: on ? "none" : "2px solid hsl(var(--border))",
                            backgroundColor: on ? "hsl(var(--primary))" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.15s",
                          }}
                        >
                          {on && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: "0.85rem" }}>{field.label}</div>
                          <div style={{ fontSize: "0.73rem", color: "hsl(var(--foreground-muted))", marginTop: 1 }}>
                            {field.description}
                          </div>
                        </div>
                        {on ? (
                          <Eye size={14} style={{ color: "hsl(var(--primary))", flexShrink: 0 }} />
                        ) : (
                          <EyeOff size={14} style={{ color: "hsl(var(--foreground-subtle))", flexShrink: 0 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live preview */}
        <div style={{ position: "sticky", top: 20 }}>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "hsl(var(--foreground-muted))",
            }}
          >
            <Eye size={14} /> Live Preview
          </div>
          <div
            style={{
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              overflow: "hidden",
              backgroundColor: "hsl(var(--card))",
              boxShadow: "0 4px 20px hsl(0 0% 0% / 0.06)",
            }}
          >
            {/* Preview header */}
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--primary) / 0.06)",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "hsl(var(--foreground-muted))", marginBottom: 2 }}>
                CASE MANAGEMENT VIEW
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                {enabledFields.has("caseName") ? "Invoice Approval Request" : "Case View"}
              </div>
            </div>

            {/* Preview fields */}
            <div style={{ padding: "16px 18px" }}>
              {enabledList.length === 0 && (
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--foreground-muted))", textAlign: "center", padding: "24px 0" }}>
                  No fields selected. Toggle fields from the left panel.
                </p>
              )}

              {enabledList.map((field) => (
                <div
                  key={field.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 0",
                    borderBottom: "1px solid hsl(var(--border) / 0.5)",
                  }}
                >
                  <GripVertical size={12} style={{ color: "hsl(var(--foreground-subtle))", marginTop: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.7rem", color: "hsl(var(--foreground-muted))", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      {field.label}
                    </div>
                    <div style={{ fontSize: "0.82rem", marginTop: 2 }}>
                      {getSampleValue(field.id)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Field count summary */}
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 8,
              backgroundColor: "hsl(var(--muted) / 0.4)",
              fontSize: "0.75rem",
              color: "hsl(var(--foreground-muted))",
            }}
          >
            <strong>{enabledFields.size}</strong> fields will be visible in the case management view.
            You can modify this later from the workflow settings.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid hsl(var(--border))",
        }}
      >
        <button
          className="landing-create-btn"
          style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <button
          className="landing-create-btn"
          onClick={handleContinue}
          disabled={enabledFields.size === 0}
          style={{ opacity: enabledFields.size === 0 ? 0.5 : 1, minWidth: 140 }}
        >
          Continue to Studio
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sample preview values                                              */
/* ------------------------------------------------------------------ */
function getSampleValue(fieldId: string): string {
  const samples: Record<string, string> = {
    caseId: "CASE-2026-00142",
    caseName: "Invoice Approval Request",
    caseDescription: "Monthly vendor invoice requiring finance team approval before payment processing.",
    status: "🟡 In Progress",
    priority: "🔴 High",
    owner: "Sarah Johnson",
    assignee: "Mike Chen",
    requestor: "David Williams",
    requestInfo: "Vendor invoice #INV-4521 for $12,450 from Acme Corp.",
    category: "Finance / Accounts Payable",
    tags: "invoice, urgent, q1-2026",
    createdDate: "Mar 15, 2026 09:30 AM",
    updatedDate: "Mar 18, 2026 02:15 PM",
    dueDate: "Mar 22, 2026",
    slaDeadline: "Mar 20, 2026 05:00 PM",
    currentStage: "Manager Review",
    resolution: "—",
    attachmentCount: "3 files attached",
    department: "Finance",
    comments: "2 comments, last activity 3h ago",
  };
  return samples[fieldId] ?? "—";
}
