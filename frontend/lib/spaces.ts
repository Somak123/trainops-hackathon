/**
 * Browser-side helper to upload a dataset directly to DigitalOcean Spaces.
 *
 * POC ONLY: credentials are read from NEXT_PUBLIC_* env vars, which means
 * they ship inside the browser bundle. That is acceptable for an internal
 * demo with a scoped, rotatable Spaces key — never ship this to production.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.NEXT_PUBLIC_DO_SPACES_REGION || "nyc3";
const BUCKET = process.env.NEXT_PUBLIC_DO_SPACES_BUCKET || "";
const ACCESS_KEY = process.env.NEXT_PUBLIC_DO_SPACES_KEY || "";
const SECRET_KEY = process.env.NEXT_PUBLIC_DO_SPACES_SECRET || "";

const ENDPOINT = `https://${REGION}.digitaloceanspaces.com`;

export function isSpacesConfigured(): boolean {
  return Boolean(BUCKET && ACCESS_KEY && SECRET_KEY);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function makeKey(filename: string): string {
  const safe = sanitizeFilename(filename) || "dataset.jsonl";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `datasets/${stamp}-${rand}-${safe}`;
}

function publicUrlFor(key: string): string {
  return `https://${BUCKET}.${REGION}.digitaloceanspaces.com/${key}`;
}

let _client: S3Client | null = null;
function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
      },
      forcePathStyle: false,
    });
  }
  return _client;
}

export async function uploadDatasetToSpaces(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ publicUrl: string; key: string }> {
  if (!isSpacesConfigured()) {
    throw new Error(
      "DO Spaces is not configured. Set NEXT_PUBLIC_DO_SPACES_BUCKET / KEY / SECRET / REGION in .env.local.",
    );
  }

  const key = makeKey(file.name);
  const contentType = file.type || "application/x-ndjson";

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: "public-read",
  });

  const uploadUrl = await getSignedUrl(getClient(), command, {
    expiresIn: 60 * 15,
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-amz-acl", "public-read");
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else
        reject(
          new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`),
        );
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });

  return { publicUrl: publicUrlFor(key), key };
}
