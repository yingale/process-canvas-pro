import { User, Mail, Shield, Clock } from "lucide-react";
import "../components/studio/studio.css";

export default function ProfilePage() {
  return (
    <div className="landing-page" style={{ maxWidth: 700 }}>
      <h1 className="landing-hero-title" style={{ fontSize: 22 }}>My Profile</h1>
      <p className="landing-hero-subtitle" style={{ marginBottom: 28 }}>
        Manage your account information and preferences.
      </p>

      <div className="detail-card">
        <div className="detail-card-header" style={{ gap: 16 }}>
          <div className="profile-avatar-lg">
            <User size={32} />
          </div>
          <div>
            <h2 className="detail-title">Admin User</h2>
            <p style={{ fontSize: 12, color: "hsl(var(--foreground-muted))" }}>Administrator</p>
          </div>
        </div>

        <div className="detail-section" style={{ marginTop: 20 }}>
          <h3 className="detail-section-title">
            <Mail size={14} /> Contact
          </h3>
          <div className="profile-field">
            <span className="profile-field-label">Email</span>
            <span className="profile-field-value">admin@workflow.ai</span>
          </div>
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title">
            <Shield size={14} /> Role & Access
          </h3>
          <div className="profile-field">
            <span className="profile-field-label">Role</span>
            <span className="profile-field-value">Administrator</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Access Level</span>
            <span className="profile-field-value">Full Access</span>
          </div>
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title">
            <Clock size={14} /> Activity
          </h3>
          <div className="profile-field">
            <span className="profile-field-label">Member since</span>
            <span className="profile-field-value">January 2026</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Last login</span>
            <span className="profile-field-value">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
