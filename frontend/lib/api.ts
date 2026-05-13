/**
 * Typed client for Dev 2's FastAPI backend.
 * Endpoints: POST /train, GET /status/{id}, GET /jobs, GET /health.
 */

export type ModelName = "llama-3-8b" | "mistral-7b" | "tinyllama-1.1b";

export type JobStatus =
  | "Queued"
  | "Provisioning"
  | "Training"
  | "Completed"
  | "Failed";

export interface TrainRequest {
  model: ModelName;
  dataset_url: string;
  job_name?: string;
}

export interface TrainAcceptedResponse {
  job_id: string;
  status: JobStatus;
  created_at: string;
}

export interface JobStatusResponse {
  job_id: string;
  job_name: string;
  model: string;
  dataset_url: string;
  status: JobStatus;
  current_step: string | null;
  progress: number;
  weights_url: string | null;
  error: string | null;
  droplet_id: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface JobListResponse {
  items: JobStatusResponse[];
  total: number;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  createJob: (body: TrainRequest) =>
    request<TrainAcceptedResponse>("/train", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getJob: (jobId: string) =>
    request<JobStatusResponse>(`/status/${encodeURIComponent(jobId)}`),

  listJobs: (limit = 20, offset = 0) =>
    request<JobListResponse>(`/jobs?limit=${limit}&offset=${offset}`),
};

export { ApiError };
