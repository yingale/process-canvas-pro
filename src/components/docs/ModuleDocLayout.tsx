/**
 * ModuleDocLayout – shared layout for module documentation pages with PDF download
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportPageAsPdf, exportPageAsDocx } from "@/lib/pdfExport";

interface ModuleDocLayoutProps {
  title: string;
  subtitle: string;
  badges: string[];
  children: React.ReactNode;
  studioLink?: string;
}

export default function ModuleDocLayout({ title, subtitle, badges, children, studioLink }: ModuleDocLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card flex-shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => navigate(-1)}>
            <ArrowLeft size={12} className="mr-1" /> Back
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            <h1 className="text-sm font-bold text-foreground">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => exportPageAsPdf(title)}
          >
            <FileDown size={12} className="mr-1" /> Download PDF
          </Button>
          {studioLink && (
            <Button size="sm" className="h-7 text-[11px]" onClick={() => navigate(studioLink)}>
              Open in Studio →
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-10 print:px-2 print:py-4">
          {/* Overview header */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{subtitle}</p>
            <div className="flex flex-wrap gap-2 print:hidden">
              {badges.map(b => (
                <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
              ))}
            </div>
          </section>

          <Separator />

          {children}
        </div>
      </ScrollArea>
    </div>
  );
}
