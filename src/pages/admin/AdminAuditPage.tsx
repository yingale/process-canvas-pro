import AuditLogTable from "@/components/audit/AuditLogTable";

export default function AdminAuditPage() {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Audit Log</h2>
        <p className="text-xs text-muted-foreground">
          Every authorization decision and management action across the platform. Filter, expand a row for full metadata, or export to CSV.
        </p>
      </div>
      <AuditLogTable />
    </div>
  );
}
