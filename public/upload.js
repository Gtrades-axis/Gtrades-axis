import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-functions.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";

// ─── YOUR FIREBASE CONFIG (Copy from Firebase Console -> Project Settings) ───
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyReplaceMe",    // <-- REPLACE THIS
  authDomain: "your-project.firebaseapp.com", // <-- REPLACE THIS
  projectId: "your-project-id",          // <-- REPLACE THIS
  appId: "1:123456:web:abcdef"           // <-- REPLACE THIS
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

/**
 * Uploads a file to Cloudflare R2.
 * @param {File} file - The file to upload.
 * @param {string} key - The path in R2 (e.g., "resources/PDF/MyFile.pdf").
 * @returns {Promise<string>} - The public URL of the uploaded file.
 */
export async function uploadToR2(file, key) {
  if (!file) throw new Error("No file provided.");

  const getUploadUrl = httpsCallable('getR2UploadUrl');
  const result = await getUploadUrl({ key, contentType: file.type });
  const uploadUrl = result.data.url;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}): ${response.statusText}`);
  }

  // ─── IMPORTANT: Your Public Bucket URL ───
  // Go to Cloudflare Dashboard -> R2 -> "gtrades-assets" -> Settings -> Public Access
  // Copy the "Bucket URL" (looks like https://pub-123abc.r2.dev)
  const PUBLIC_BUCKET_URL = "https://pub-abc123.r2.dev"; // <-- REPLACE THIS
  
  return `${PUBLIC_BUCKET_URL}/${key}`;
}
