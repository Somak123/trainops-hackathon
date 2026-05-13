import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobList } from "@/components/job-list";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            All training jobs, newest first.
          </p>
        </div>
        <Link href="/">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New job
          </Button>
        </Link>
      </div>
      <JobList />
    </div>
  );
}
