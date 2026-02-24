import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star, Search, Download, Settings as SettingsIcon, Plus,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import GenerateFromDescriptionCard from "@/components/landing/GenerateFromDescriptionCard";
import PageLoader from "@/components/layout/PageLoader";

import "../components/studio/studio.css";

interface Template {
  id: string;
  name: string;
  description: string;
  bpmnFile: string;
  isDefault?: boolean;
}

const templates: Template[] = [
  {
    id: "blank",
    name: "Create New Workflow",
    description:
      "This framework has basic core functionality required in order to create a new workflow using our AI workflow assistant, forms and unique personas and users",
    bpmnFile: "",
    isDefault: true,
  },
  {
    id: "email-fetcher",
    name: "Email Miner",
    description:
      "Automated email processing workflow that validates, categorizes, and routes incoming emails to appropriate case actions (new, update, clone)",
    bpmnFile: "email_fetcher",
  },
  {
    id: "file-processing",
    name: "File Processing Workflow",
    description:
      "Scheduled workflow that fetches emails, processes attachments in parallel, and sends notification emails upon completion",
    bpmnFile: "file_processing",
  },
];

interface Workflow {
  id: string;
  name: string;
  owner: string;
  type: string;
  status: string;
  updated_at: string;
}

interface WorkflowResponse {
  data: Workflow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function Landing() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const pageSize = 5;

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      sortBy,
      sortDir,
    });

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-workflows?${params}`,
        {
          headers: {
            apikey: anonKey,
            "Content-Type": "application/json",
          },
        }
      );
      const json: WorkflowResponse = await res.json();
      setWorkflows(json.data ?? []);
      setTotalPages(json.totalPages ?? 1);
      setTotal(json.total ?? 0);
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortDir]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleTemplateClick = (template: Template) => {
    if (template.isDefault) {
      navigate("/create");
    } else {
      navigate("/create", {
        state: { templateId: template.bpmnFile, templateName: template.name },
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="landing-sort-icon" />
    ) : (
      <ChevronDown size={12} className="landing-sort-icon" />
    );
  };

  return (
    <div className="landing-page">
      {/* Hero */}
      <div className="landing-hero">
        <h1 className="landing-hero-title">AI Automated Workflow</h1>
        <p className="landing-hero-subtitle">
          The AI Automated Workflow allows for automating mundane tasks and business processes. You
          can design your workflow from scratch or base it off an existing template.
        </p>
      </div>

      {/* Templates Section */}
      <section className="landing-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">My Favorite Templates</h2>
          <button className="landing-view-all-btn" onClick={() => navigate("/templates")}>View All &gt;</button>
        </div>

        <div className="landing-templates-grid">
          <GenerateFromDescriptionCard />
          {templates.map((t) => (
            <div key={t.id} className="landing-template-card">
              <div className="landing-template-preview">
                <div className="landing-template-preview-lines">
                  <div className="landing-template-line landing-template-line--long" />
                  <div className="landing-template-line landing-template-line--med" />
                  <div className="landing-template-line landing-template-line--short" />
                  <div className="landing-template-line landing-template-line--long" />
                  <div className="landing-template-line landing-template-line--med" />
                </div>
                {!t.isDefault && (
                  <button className="landing-template-star">
                    <Star size={18} />
                  </button>
                )}
              </div>

              <div className="landing-template-body">
                <div className="landing-template-meta">
                  <span className="landing-template-label">
                    {t.isDefault ? "Default" : "Template"}
                  </span>
                  <div className="landing-template-name-row">
                    <div className="landing-template-icon">
                      {t.isDefault ? <Plus size={16} /> : <SettingsIcon size={16} />}
                    </div>
                    <h3 className="landing-template-name">{t.name}</h3>
                  </div>
                </div>
                <p className="landing-template-desc">{t.description}</p>
                <button
                  className="landing-create-btn"
                  onClick={() => handleTemplateClick(t)}
                >
                  Create
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Your Workflows Section */}
      <section className="landing-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Your Workflows</h2>
          <span className="landing-total-badge">{total} total</span>
          <button className="landing-view-all-btn" onClick={() => navigate("/workflows")}>View All &gt;</button>
          <div className="landing-workflows-actions">
            <button className="landing-export-btn">
              <Download size={14} />
              <span>Export</span>
            </button>
            <div className="landing-search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search"
                className="landing-search-input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              <button className="landing-search-go" onClick={handleSearch}>
                Go
              </button>
            </div>
          </div>
        </div>

        <div className="landing-table-wrap">
          <table className="landing-table">
            <thead>
              <tr>
                <th className="landing-th-sortable" onClick={() => handleSort("name")}>
                  Name <SortIcon column="name" />
                </th>
                <th className="landing-th-sortable" onClick={() => handleSort("updated_at")}>
                  Modified <SortIcon column="updated_at" />
                </th>
                <th className="landing-th-sortable" onClick={() => handleSort("owner")}>
                  Owner <SortIcon column="owner" />
                </th>
                <th className="landing-th-sortable" onClick={() => handleSort("type")}>
                  Type <SortIcon column="type" />
                </th>
                <th className="landing-th-sortable" onClick={() => handleSort("status")}>
                  Status <SortIcon column="status" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                   <td colSpan={5} style={{ padding: 0 }}>
                     <PageLoader message="Loading workflows…" />
                   </td>
                </tr>
              ) : workflows.length === 0 ? (
                <tr>
                   <td colSpan={5} className="landing-table-empty">No workflows found</td>
                </tr>
              ) : (
                workflows.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div className="landing-table-name-cell">
                        <div className="landing-table-icon">
                          <SettingsIcon size={14} />
                        </div>
                        <span>{w.name}</span>
                      </div>
                    </td>
                    <td>{formatDate(w.updated_at)}</td>
                    <td>{w.owner}</td>
                    <td>{w.type}</td>
                    <td>
                      <span
                        className={`landing-status-badge landing-status-badge--${w.status.toLowerCase()}`}
                      >
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="landing-pagination">
            <button
              className="landing-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`landing-page-num ${p === page ? "landing-page-num--active" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="landing-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
