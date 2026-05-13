import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// The backend writes timestamps as UTC (datetime.now(timezone.utc)) but
// SQLModel/SQLite serializes them as naive ISO strings (no "Z" suffix), so
// the browser would otherwise parse them as local time and show the wrong
// "X ago" label. Treat any string without an explicit timezone as UTC.
function parseUtcIso(iso: string): Date {
  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasTz ? iso : iso + "Z");
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseUtcIso(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (Number.isNaN(diff)) return "—";
  if (diff < 60) return `${Math.max(0, Math.floor(diff))}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
}

export function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}
