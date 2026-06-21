import { Navigate, useLocation } from "react-router-dom";
import { useAuthz } from "@/contexts/AuthzContext";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  perm?: string;
}

export default function ProtectedRoute({ children, perm }: ProtectedRouteProps) {
  const { user, loading, can } = useAuthz();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  if (perm && !can(perm)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2">
        <h2 className="text-lg font-semibold">Access denied</h2>
        <p className="text-sm text-muted-foreground">You do not have permission: <code className="text-xs">{perm}</code></p>
      </div>
    );
  }
  return <>{children}</>;
}
