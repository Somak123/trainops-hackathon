import Link from "next/link";
import { ArrowRight, Gauge, Server, Trash2 } from "lucide-react";
import { NewJobForm } from "@/components/new-job-form";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Fine-tune open-source LLMs without the DevOps.
        </h1>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View live jobs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <NewJobForm />

      <section className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
        <Feature
          icon={<Server className="h-5 w-5" />}
          title="Auto-provisioned GPUs"
          body="One API call spins up a DO Droplet pre-loaded with our worker."
        />
        <Feature
          icon={<Gauge className="h-5 w-5" />}
          title="Live progress"
          body="Watch Queued → Provisioning → Training → Completed in real time."
        />
        <Feature
          icon={<Trash2 className="h-5 w-5" />}
          title="Ruthless teardown"
          body="The droplet is destroyed the second the worker reports success."
        />
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
