// ─── YOUR CLOUDFLARE WORKER URL ──────────────────────────────
const WORKER_URL = "https://throbbing-frost-a2r2-presigned9.davidthuku574.workers.dev";

/**
 * Upload a file to Cloudflare R2 using a pre‑signed URL
 */
export async function uploadToR2(file, key) {
  if (!file) throw new Error("No file provided.");

  // 1. Get pre‑signed upload URL from Worker
  const response = await fetch(`${WORKER_URL}?key=${encodeURIComponent(key)}&action=upload`);
  const data = await response.json();
  const uploadUrl = data.url;

  if (!uploadUrl) {
    throw new Error("Failed to get upload URL from Worker");
  }

  // 2. Upload file directly to R2
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed (${uploadResponse.status})`);
  }

  return key;
}

/**
 * Download a file from Cloudflare R2 using a pre‑signed URL
 */
export async function getDownloadUrl(key) {
  if (!key) throw new Error("No file key provided.");

  const response = await fetch(`${WORKER_URL}?key=${encodeURIComponent(key)}&action=download`);
  const data = await response.json();
  
  if (!data.url) {
    throw new Error("Failed to get download URL from Worker");
  }

  return data.url;
}