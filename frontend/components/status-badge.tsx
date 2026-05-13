import type { JobStatus } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<
  JobStatus,
  "secondary" | "info" | "warning" | "success" | "destructive"
> = {
  Queued: "secondary",
  Provisioning: "info",
  Training: "warning",
  Completed: "success",
  Failed: "destructive",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant={VARIANTS[status]} className="uppercase tracking-wide">
      {status}
    </Badge>
  );
}
