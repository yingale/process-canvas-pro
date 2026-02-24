import { Loader2 } from "lucide-react";
import "../studio/studio.css";

interface PageLoaderProps {
  message?: string;
}

export default function PageLoader({ message = "Loading…" }: PageLoaderProps) {
  return (
    <div className="page-loader">
      <Loader2 size={28} className="page-loader-icon" />
      <span className="page-loader-text">{message}</span>
    </div>
  );
}
