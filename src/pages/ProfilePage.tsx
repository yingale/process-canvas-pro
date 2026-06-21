import { useEffect, useState } from "react";
import { User, Mail, Shield, Clock, Users as UsersIcon, Briefcase } from "lucide-react";
import PageLoader from "@/components/layout/PageLoader";
import { useAuthz } from "@/contexts/AuthzContext";
import { supabase } from "@/integrations/supabase/client";
import "../components/studio/studio.css";

export default function ProfilePage() {
  const { user, personas, teams, roles, loading } = useAuthz();
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCreatedAt(data.user?.created_at ?? null);
      setLastSignIn(data.user?.last_sign_in_at ?? null);
    });
  }, []);

  if (loading || !user) {
    return (
      <div className="landing-page" style={{ maxWidth: 700 }}>
        <PageLoader message="Loading profile…" />
      </div>
    );
  }

  const isAdmin = user.appRoles.includes("admin");
  const platformRole = isAdmin ? "Administrator" : user.appRoles[0] ?? "Viewer";
  const accessLevel = isAdmin
    ? "Full Access"
    : roles.length > 0
      ? `${roles.length} role${roles.length > 1 ? "s" : ""} assigned`
      : "Limited Access";

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const fmtMonth = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-US", { month: "long", year: "numeric" }) : "—";

  return (
    <div className="landing-page" style={{ maxWidth: 700 }}>
      <h1 className="landing-hero-title" style={{ fontSize: 22 }}>My Profile</h1>
      <p className="landing-hero-subtitle" style={{ marginBottom: 28 }}>
        Manage your account information and preferences.
      </p>

      <div className="detail-card">
        <div className="detail-card-header" style={{ gap: 16 }}>
          <div className="profile-avatar-lg"><User size={32} /></div>
          <div>
            <h2 className="detail-title">{user.name || user.email.split("@")[0]}</h2>
            <p style={{ fontSize: 12, color: "hsl(var(--foreground-muted))" }}>{platformRole}</p>
          </div>
        </div>

        <div className="detail-section" style={{ marginTop: 20 }}>
          <h3 className="detail-section-title"><Mail size={14} /> Contact</h3>
          <div className="profile-field">
            <span className="profile-field-label">Email</span>
            <span className="profile-field-value">{user.email}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Status</span>
            <span className="profile-field-value">{user.status}</span>
          </div>
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title"><Shield size={14} /> Role & Access</h3>
          <div className="profile-field">
            <span className="profile-field-label">Platform role</span>
            <span className="profile-field-value">{platformRole}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Access level</span>
            <span className="profile-field-value">{accessLevel}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Assigned roles</span>
            <span className="profile-field-value">{roles.length ? roles.map(r => r.name).join(", ") : "None"}</span>
          </div>
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title"><Briefcase size={14} /> Personas</h3>
          <div className="profile-field">
            <span className="profile-field-label">Assigned personas</span>
            <span className="profile-field-value">{personas.length ? personas.map(p => p.name).join(", ") : "None"}</span>
          </div>
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title"><UsersIcon size={14} /> Teams</h3>
          <div className="profile-field">
            <span className="profile-field-label">Member of</span>
            <span className="profile-field-value">{teams.length ? teams.map(t => t.name).join(", ") : "None"}</span>
          </div>
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title"><Clock size={14} /> Activity</h3>
          <div className="profile-field">
            <span className="profile-field-label">Member since</span>
            <span className="profile-field-value">{fmtMonth(createdAt)}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Last login</span>
            <span className="profile-field-value">{fmt(lastSignIn)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
