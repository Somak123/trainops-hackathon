"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2, Rocket } from "lucide-react";
import { api, type ModelName } from "@/lib/api";
import { uploadDatasetToSpaces } from "@/lib/spaces";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

const MODELS: { value: ModelName; label: string; hint: string }[] = [
  {
    value: "tinyllama-1.1b",
    label: "TinyLlama 1.1B",
    hint: "Fastest demo · runs on a small GPU",
  },
  {
    value: "mistral-7b",
    label: "Mistral 7B",
    hint: "Solid all-rounder for instruction tuning",
  },
  {
    value: "llama-3-8b",
    label: "Llama 3 8B",
    hint: "Highest quality · needs a beefier droplet",
  },
];

type Phase =
  | { kind: "idle" }
  | { kind: "uploading"; pct: number }
  | { kind: "creating" }
  | { kind: "done"; jobId: string }
  | { kind: "error"; message: string };

export function NewJobForm() {
  const router = useRouter();
  const [model, setModel] = React.useState<ModelName>("tinyllama-1.1b");
  const [jobName, setJobName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<Phase>({ kind: "idle" });

  const isBusy = phase.kind === "uploading" || phase.kind === "creating";

  const onFile = (f: File | null) => {
    setFile(f);
    if (phase.kind === "error") setPhase({ kind: "idle" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setPhase({ kind: "error", message: "Pick a .jsonl dataset first." });
      return;
    }

    try {
      setPhase({ kind: "uploading", pct: 0 });
      const { publicUrl } = await uploadDatasetToSpaces(file, (pct) =>
        setPhase({ kind: "uploading", pct }),
      );

      setPhase({ kind: "creating" });
      const created = await api.createJob({
        model,
        dataset_url: publicUrl,
        job_name: jobName.trim() || undefined,
      });

      setPhase({ kind: "done", jobId: created.job_id });
      router.push(`/jobs/${created.job_id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setPhase({ kind: "error", message });
    }
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>New Training Job</CardTitle>
        <CardDescription>
          Upload a JSONL dataset, pick a base model, and we&apos;ll spin up a
          DigitalOcean GPU droplet to fine-tune it. The droplet self-destructs
          when training finishes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="model">Base model</Label>
            <Select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value as ModelName)}
              disabled={isBusy}
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              {MODELS.find((m) => m.value === model)?.hint}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobName">Job name (optional)</Label>
            <Input
              id="jobName"
              placeholder="my-finetune-run-1"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              maxLength={255}
              disabled={isBusy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataset">Dataset (.jsonl)</Label>
            <FileDropZone
              file={file}
              onChange={onFile}
              disabled={isBusy}
            />
            <p className="text-xs text-muted-foreground">
              Uploaded directly from your browser to DigitalOcean Spaces — the
              backend only ever sees the resulting object URL.
            </p>
          </div>

          {phase.kind === "uploading" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Uploading to DO Spaces…</span>
                <span>{phase.pct}%</span>
              </div>
              <Progress value={phase.pct} />
            </div>
          )}

          {phase.kind === "creating" && (
            <p className="text-xs text-muted-foreground">
              Telling the control plane to provision a droplet…
            </p>
          )}

          {phase.kind === "error" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {phase.message}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isBusy || !file}
          >
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Working…
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Start training
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FileDropZone({
  file,
  onChange,
  disabled,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = React.useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        if (disabled) return;
        const f = e.dataTransfer.files?.[0];
        if (f) onChange(f);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={[
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        isOver
          ? "border-primary bg-primary/5"
          : "border-input hover:border-primary/60 hover:bg-accent/40",
        disabled ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
    >
      <CloudUpload className="h-6 w-6 text-muted-foreground" />
      {file ? (
        <div className="text-sm">
          <span className="font-medium">{file.name}</span>{" "}
          <span className="text-muted-foreground">
            ({(file.size / 1024).toFixed(1)} KB)
          </span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Click to upload</span>{" "}
          or drag a <code>.jsonl</code> file here
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".jsonl,application/x-ndjson,application/json"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        disabled={disabled}
      />
    </div>
  );
}
