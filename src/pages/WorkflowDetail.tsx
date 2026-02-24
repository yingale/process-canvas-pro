import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Settings as SettingsIcon, Clock, User, Tag, Activity } from "lucide-react";
import "../components/studio/studio.css";

interface Workflow {
  id: string;
  name: string;
  owner: string;
  type: string;
  status: string;
  updated_at: string;
}

export default function WorkflowDetail() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchWorkflow = async () => {
      try {
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-workflows?page=1&pageSize=100&search=&sortBy=updated_at&sortDir=desc`,
          { headers: { apikey: anonKey, "Content-Type": "application/json" } }
        );
        const json = await res.json();
        const found = (json.data ?? []).find((w: Workflow) => w.id === id);
        setWorkflow(found ?? null);
      } catch (err) {
        console.error("Failed to fetch workflow:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflow();
  }, [id]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="landing-page" style={{ maxWidth: 800 }}>
        <p style={{ color: "hsl(var(--foreground-muted))" }}>Loading…</p>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="landing-page" style={{ maxWidth: 800 }}>
        <a href="/" className="landing-back-link">
          <ArrowLeft size={14} /> Back to Dashboard
        </a>
        <p style={{ color: "hsl(var(--foreground-muted))", marginTop: 24 }}>Workflow not found.</p>
      </div>
    );
  }

  return (
    <div className="landing-page" style={{ maxWidth: 800 }}>
      <a href="/" className="landing-back-link">
        <ArrowLeft size={14} /> Back to Dashboard
      </a>

      <div className="detail-card">
        <div className="detail-card-header">
          <div className="landing-table-icon" style={{ width: 40, height: 40 }}>
            <SettingsIcon size={20} />
          </div>
          <div>
            <span className="landing-template-label">Workflow</span>
            <h1 className="detail-title">{workflow.name}</h1>
          </div>
        </div>

        <div className="detail-meta-row" style={{ marginTop: 16 }}>
          <span className="detail-meta">
            <User size={12} /> {workflow.owner}
          </span>
          <span className="detail-meta">
            <Tag size={12} /> {workflow.type}
          </span>
          <span className="detail-meta">
            <Activity size={12} />{" "}
            <span
              className={`landing-status-badge landing-status-badge--${workflow.status.toLowerCase()}`}
            >
              {workflow.status}
            </span>
          </span>
          <span className="detail-meta">
            <Clock size={12} /> {formatDate(workflow.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
