"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { api, ApiError, type JobStatusResponse } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
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

export function JobDetail({ jobId }: { jobId: string }) {
  const [job, setJob] = React.useState<JobStatusResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const j = await api.getJob(jobId);
      setJob(j);
      setError(null);
      setNotFound(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true);
      } else {
        setError(e instanceof Error ? e.message : "Failed to load job");
      }
    }
  }, [jobId]);

  React.useEffect(() => {
    load();
    const id = setInterval(() => {
      // Stop polling once terminal.
      setJob((current) => {
        if (
          current &&
          (current.status === "Completed" || current.status === "Failed")
        ) {
          return current;
        }
        load();
        return current;
      });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (notFound) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-sm">No job with that ID.</p>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (error && !job) {
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

  if (!job) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading job…
        </CardContent>
      </Card>
    );
  }

  const isLive = job.status !== "Completed" && job.status !== "Failed";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{job.job_name}</CardTitle>
              <CardDescription className="font-mono text-xs">
                {job.job_id}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={job.status} />
              <Button
                variant="ghost"
                size="sm"
                onClick={load}
                className="text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress
            value={job.progress}
            indeterminate={isLive && job.progress < 5}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">{job.current_step ?? "—"}</span>
            <span className="text-muted-foreground">{job.progress}%</span>
          </div>
          {isLive && (
            <p className="text-xs text-muted-foreground">
              Polling every {POLL_MS / 1000}s — leave this tab open.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard title="Model" value={job.model} />
        <InfoCard
          title="Droplet"
          value={
            job.droplet_id !== null
              ? `#${job.droplet_id}`
              : "Not provisioned yet"
          }
        />
        <InfoCard title="Created" value={formatRelative(job.created_at)} />
        <InfoCard title="Started" value={formatRelative(job.started_at)} />
        <InfoCard
          title="Completed"
          value={formatRelative(job.completed_at)}
          className="sm:col-span-2"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Dataset</CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href={job.dataset_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 break-all text-sm text-primary hover:underline"
          >
            {job.dataset_url} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </CardContent>
      </Card>

      {job.weights_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Trained weights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={job.weights_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 break-all text-sm text-primary hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              {job.weights_url}
            </a>
          </CardContent>
        </Card>
      )}

      {job.error && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">
            {job.error}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoCard({
  title,
  value,
  className,
}: {
  title: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 ${className ?? ""}`.trim()}
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
