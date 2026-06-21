import type { ReactNode } from "react";
import { useAuthz } from "@/contexts/AuthzContext";

interface CanProps {
  perm: string;
  resource?: Record<string, unknown>;
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ perm, resource, fallback = null, children }: CanProps) {
  const { can } = useAuthz();
  return <>{can(perm, resource) ? children : fallback}</>;
}
