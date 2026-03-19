/**
 * DocContentBlock — wraps any doc content with a "Copy" button.
 * DocCodeBlock — code/schema blocks with copy + syntax label.
 * DocImageBlock — renders content as a downloadable image (captures via canvas).
 */
import { useState, useRef, useCallback } from "react";
import { Copy, Check, Download, Image } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Copy to clipboard helper ─── */
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  }
}

/* ─── CopyButton ─── */
function CopyButton({ getText, size = "sm" }: { getText: () => string; size?: "sm" | "xs" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = getText();
    if (!text) return;
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 transition-all hover:bg-muted print:hidden",
        size === "xs" ? "text-[9px]" : "text-[10px]",
        copied && "border-green-500/40 text-green-600"
      )}
      title="Copy to clipboard"
    >
      {copied ? <Check size={size === "xs" ? 10 : 12} /> : <Copy size={size === "xs" ? 10 : 12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ─── Download as image button ─── */
function DownloadImageButton({ targetRef, filename }: { targetRef: React.RefObject<HTMLElement>; filename: string }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    const el = targetRef.current;
    if (!el) return;
    setDownloading(true);

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
      a.download = `${filename}.png`;
      a.click();
    } catch {
      // Fallback: use SVG serialization
      const svgData = new XMLSerializer().serializeToString(el);
      const blob = new Blob([svgData], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, [targetRef, filename]);

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] transition-all hover:bg-muted print:hidden"
      title="Download as image"
    >
      <Download size={12} />
      {downloading ? "Saving..." : "Image"}
    </button>
  );
}

/* ─── DocContentBlock: wraps content sections with copy ─── */
export function DocContentBlock({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const getText = () => ref.current?.innerText || "";

  return (
    <div className={cn("group/block relative", className)}>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity z-10">
        {label && <span className="text-[9px] text-muted-foreground font-mono mr-1 self-center">{label}</span>}
        <CopyButton getText={getText} />
      </div>
      <div ref={ref}>{children}</div>
    </div>
  );
}

/* ─── DocCodeBlock: for code/schema/config blocks ─── */
export function DocCodeBlock({
  children,
  className,
  label = "Code",
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const getText = () => ref.current?.innerText || "";

  return (
    <div className={cn("group/code relative", className)}>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
        <span className="text-[9px] text-muted-foreground font-mono mr-1 self-center">{label}</span>
        <CopyButton getText={getText} size="xs" />
      </div>
      <div ref={ref}>{children}</div>
    </div>
  );
}

/* ─── DocDiagramBlock: for wireframes/diagrams with copy + download image ─── */
export function DocDiagramBlock({
  children,
  className,
  filename = "diagram",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  filename?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const getText = () => ref.current?.innerText || "";

  return (
    <div className={cn("group/diagram relative", className)}>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/diagram:opacity-100 transition-opacity z-10">
        {label && <span className="text-[9px] text-muted-foreground font-mono mr-1 self-center">{label}</span>}
        <CopyButton getText={getText} size="xs" />
        <DownloadImageButton targetRef={ref as React.RefObject<HTMLElement>} filename={filename} />
      </div>
      <div ref={ref as React.RefObject<HTMLDivElement>}>{children}</div>
    </div>
  );
}

export { CopyButton, DownloadImageButton };
