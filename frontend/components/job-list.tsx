"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { api, type JobStatusResponse } from "@/lib/api";
import { formatRelative, shortId } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const POLL_MS = 3000;

export function JobList() {
  const [items, setItems] = React.useState<JobStatusResponse[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.listJobs(50, 0);
      setItems(res.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (items === null && error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          {error}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={load}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items === null) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-4 w-1/3 rounded shimmer" />
              <div className="mt-3 h-2 w-full rounded shimmer" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-muted-foreground">No jobs yet.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Start your first training run <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Auto-refreshing every {POLL_MS / 1000}s
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={refreshing}
          className="text-xs"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>
      <div className="grid gap-3">
        {items.map((job) => (
          <JobRow key={job.job_id} job={job} />
        ))}
      </div>
    </div>
  );
}

function JobRow({ job }: { job: JobStatusResponse }) {
  const isLive = job.status !== "Completed" && job.status !== "Failed";
  return (
    <Link href={`/jobs/${job.job_id}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{job.job_name}</CardTitle>
              <CardDescription className="font-mono text-xs">
                {shortId(job.job_id)} · {job.model}
              </CardDescription>
            </div>
            <StatusBadge status={job.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress
            value={job.progress}
            indeterminate={isLive && job.progress < 5}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{job.current_step ?? "—"}</span>
            <span>
              {job.progress}% · created {formatRelative(job.created_at)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
