/**
 * DocCard — drop-in replacement for Card in doc pages.
 * Adds hover-reveal "Copy" and "Download Image" buttons to any card content.
 */
import { useRef, useState, useCallback } from "react";
import { Copy, Check, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

export function DocCard({
  children,
  className,
  filename,
  ...props
}: React.ComponentProps<typeof Card> & { filename?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = ref.current?.innerText || "";
    if (!text.trim()) return;
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleDownloadImage = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    setSaving(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename || "doc-section"}.png`;
      a.click();
    } catch (err) {
      console.warn("Image export failed", err);
    } finally {
      setSaving(false);
    }
  }, [filename]);

  return (
    <Card className={cn("group/doc relative", className)} {...props}>
      {/* Action buttons — top-right, visible on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/doc:opacity-100 transition-opacity z-10 print:hidden">
        <button
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1 rounded border border-border bg-card/90 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-medium transition-all hover:bg-muted",
            copied && "border-emerald-500/40 text-emerald-600"
          )}
          title="Copy content"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={handleDownloadImage}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded border border-border bg-card/90 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-medium transition-all hover:bg-muted"
          title="Download as image"
        >
          <Download size={10} />
          {saving ? "..." : "Image"}
        </button>
      </div>
      <div ref={ref}>{children}</div>
    </Card>
  );
}

// Re-export card sub-components for convenience
export { CardContent, CardHeader, CardTitle, CardDescription };
