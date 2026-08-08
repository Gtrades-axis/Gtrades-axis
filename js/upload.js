// ─── USE YOUR ACTUAL WORKER URL ──────────────────────────
const WORKER_URL = "https://r2-uploader.davidthuku574.workers.dev"; // Replace with your actual URL

export async function uploadToR2(file, key) {
  if (!file) throw new Error("No file provided.");
  if (!key) throw new Error("No file key provided.");

  const workerUrl = `${WORKER_URL}?key=${encodeURIComponent(key)}&action=upload`;
  console.log("Calling Worker:", workerUrl);

  const response = await fetch(workerUrl);
  const data = await response.json();

  if (!data.url) {
    throw new Error("Failed to get upload URL: " + (data.error || "unknown error"));
  }

  const uploadResponse = await fetch(data.url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed (${uploadResponse.status})`);
  }

  return key;
}

export async function getDownloadUrl(key) {
  if (!key) throw new Error("No file key provided.");

  const workerUrl = `${WORKER_URL}?key=${encodeURIComponent(key)}&action=download`;
  const response = await fetch(workerUrl);
  const data = await response.json();

  if (!data.url) {
    throw new Error("Failed to get download URL: " + (data.error || "unknown error"));
  }
  return data.url;
}