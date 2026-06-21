import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Download, Settings as SettingsIcon,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import PageLoader from "@/components/layout/PageLoader";
import { Can } from "@/components/authz/Can";
import { supabase } from "@/integrations/supabase/client";
import "../components/studio/studio.css";

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

export default function AllWorkflows() {
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
  const pageSize = 20;

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
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
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            "Content-Type": "application/json",
          },
        }
      );
      const json: WorkflowResponse = await res.json();
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Failed to fetch workflows");
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

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const handleSearchKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSearch(); };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setPage(1);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortDir === "asc" ? <ChevronUp size={12} className="landing-sort-icon" /> : <ChevronDown size={12} className="landing-sort-icon" />;
  };

  if (loading && workflows.length === 0) {
    return (
      <div className="landing-page">
        <PageLoader message="Loading workflows…" />
      </div>
    );
  }

  return (
    <div className="landing-page">
      <h1 className="landing-hero-title" style={{ fontSize: 22 }}>All Workflows</h1>
      <p className="landing-hero-subtitle" style={{ marginBottom: 28 }}>
        Browse and manage all your workflows.
      </p>

      <section className="landing-section">
        <div className="landing-section-header">
          <span className="landing-total-badge">{total} total</span>
          <div className="landing-workflows-actions">
            <button className="landing-export-btn">
              <Download size={14} />
              <span>Export</span>
            </button>
            <Can perm="workflow.create">
              <button className="landing-create-btn" onClick={() => navigate("/create")}>
                Create
              </button>
            </Can>
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
              <button className="landing-search-go" onClick={handleSearch}>Go</button>
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
                <tr><td colSpan={5} className="landing-table-loading">Loading…</td></tr>
              ) : workflows.length === 0 ? (
                <tr><td colSpan={5} className="landing-table-empty">No workflows found</td></tr>
              ) : (
                workflows.map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => navigate(`/studio?workflow=${w.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div className="landing-table-name-cell">
                        <div className="landing-table-icon"><SettingsIcon size={14} /></div>
                        <span>{w.name}</span>
                      </div>
                    </td>
                    <td>{formatDate(w.updated_at)}</td>
                    <td>{w.owner}</td>
                    <td>{w.type}</td>
                    <td>
                      <span className={`landing-status-badge landing-status-badge--${w.status.toLowerCase()}`}>
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="landing-pagination">
            <button className="landing-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
            <button className="landing-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
