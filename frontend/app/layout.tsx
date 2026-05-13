import type { Metadata } from "next";
import Link from "next/link";
import { Cpu } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrainOps — Managed Fine-Tuning",
  description:
    "Vercel for fine-tuning. Spin up GPU droplets on demand and tear them down the second training finishes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                <Cpu className="h-4 w-4" />
              </span>
              <span className="text-base">TrainOps</span>
              <span className="ml-2 hidden text-xs font-normal text-muted-foreground md:inline">
                Managed Fine-Tuning on DigitalOcean
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                New Job
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </header>
        <main className="container py-10">{children}</main>
      </body>
    </html>
  );
}
