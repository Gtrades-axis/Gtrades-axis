import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.js";

/**
 * Uploads a file to Cloudflare R2 using a temporary pre-signed URL.
 * @param {File} file - The file to upload.
 * @param {string} key - The path in R2 (e.g., "resources/PDF/myfile.pdf").
 * @returns {Promise<string>} - The file key (path) that was uploaded.
 */
export async function uploadToR2(file, key) {
  if (!file) throw new Error("No file provided.");

  // 1. Get a temporary upload URL from the backend
  const getUploadUrl = httpsCallable(functions, 'getR2UploadUrl');
  const result = await getUploadUrl({ key, contentType: file.type });
  const uploadUrl = result.data.url;

  // 2. Upload the file directly to R2
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}): ${response.statusText}`);
  }

  // 3. Return only the key (path) – we never store public URLs
  return key;
}
