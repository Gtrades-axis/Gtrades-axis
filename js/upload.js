// ============================================================
// GTRADES-AXIS™ — CLOUDFLARE R2 STORAGE
// File: js/upload.js
// ============================================================

const WORKER_URL = "https://r2-uploader.davidthuku574.workers.dev";

// ------------------------------------------------------------
// Get a signed URL from the Cloudflare Worker
// ------------------------------------------------------------
async function getSignedUrl(key, action) {
  if (!key) {
    throw new Error("No file key provided.");
  }

  const url = new URL(WORKER_URL);

  url.searchParams.set("key", key);
  url.searchParams.set("action", action);

  console.log(`R2 ${action} request:`, url.toString());

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json"
    },
    cache: "no-store"
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Cloudflare Worker returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok || !data.url) {
    throw new Error(
      `Failed to get ${action} URL: ${
        data.error || `HTTP ${response.status}`
      }`
    );
  }

  return data.url;
}


// ------------------------------------------------------------
// UPLOAD FILE TO CLOUDFLARE R2
// ------------------------------------------------------------
export async function uploadToR2(file, key) {

  if (!file) {
    throw new Error("No file provided.");
  }

  if (!key) {
    throw new Error("No file key provided.");
  }

  console.log("Preparing R2 upload...");
  console.log("File:", file.name || "Unnamed file");
  console.log("Key:", key);

  // Get signed PUT URL
  const uploadUrl = await getSignedUrl(key, "upload");

  console.log("Signed upload URL received.");

  // Upload directly to R2
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream"
    }
  });

  if (!uploadResponse.ok) {

    let errorText = "";

    try {
      errorText = await uploadResponse.text();
    } catch {
      // Ignore response parsing errors
    }

    throw new Error(
      `R2 upload failed (${uploadResponse.status})${
        errorText ? ": " + errorText : ""
      }`
    );
  }

  console.log("✅ File uploaded successfully to R2:", key);

  return key;
}


// ------------------------------------------------------------
// GET SIGNED DOWNLOAD URL
// ------------------------------------------------------------
export async function getDownloadUrl(key) {

  if (!key) {
    throw new Error("No file key provided.");
  }

  const downloadUrl = await getSignedUrl(key, "download");

  console.log("✅ Signed R2 download URL received.");

  return downloadUrl;
}


// ------------------------------------------------------------
// OPEN R2 FILE IN NEW TAB
// ------------------------------------------------------------
export async function openR2File(key) {

  if (!key) {
    throw new Error("No file key provided.");
  }

  const url = await getDownloadUrl(key);

  window.open(url, "_blank", "noopener,noreferrer");

  return url;
}