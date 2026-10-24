import { auth, db } from "/js/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const WORKER = "https://r2-uploader.davidthuku574.workers.dev";
const $ = id => document.getElementById(id);

function setStatus(message, error=false) {
  const el = $("status");
  if (!el) return;
  el.textContent = message;
  el.style.color = error ? "#ef4444" : "";
}

function cleanName(name) {
  return String(name || "video.mp4").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined).filter(v => v !== undefined);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k,v] of Object.entries(value)) if (v !== undefined) out[k] = stripUndefined(v);
    return out;
  }
  return value;
}

const MULTIPART_CHUNK_SIZE = 50 * 1024 * 1024;
const MAX_RETRIES = 3;

async function parseJsonResponse(response) {
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {
    throw new Error(`The upload service returned invalid data (${response.status}).`);
  }
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Upload request failed (${response.status}).`);
  }
  return data;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadPartWithRetry(key, uploadId, partNumber, chunk, onProgress) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "PUT",
          `${WORKER}/multipart/part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`,
          true
        );
        xhr.timeout = 0;
        xhr.setRequestHeader("Content-Type", "application/octet-stream");

        xhr.upload.onprogress = e => {
          if (e.lengthComputable) onProgress(e.loaded);
        };

        xhr.onerror = () => reject(new Error(`Network/CORS error on chunk ${partNumber}.`));
        xhr.onabort = () => reject(new Error(`Upload cancelled on chunk ${partNumber}.`));
        xhr.onload = async () => {
          try {
            const data = await parseJsonResponse(xhr);
            if (!data.etag) throw new Error(`The upload service did not confirm chunk for chunk ${partNumber}.`);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };

        xhr.send(chunk);
      });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) await sleep(1000 * attempt);
    }
  }

  throw lastError || new Error(`Chunk ${partNumber} failed.`);
}

async function uploadLargeVideo(file, key, progress) {
  const createResponse = await fetch(`${WORKER}/multipart/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key,
      contentType: file.type || "video/mp4"
    })
  });

  const created = await parseJsonResponse(createResponse);
  const { uploadId } = created;
  const chunkSize = Math.max(MULTIPART_CHUNK_SIZE, Number(created.chunkSize) || MULTIPART_CHUNK_SIZE);
  const totalParts = Math.ceil(file.size / chunkSize);
  const completedParts = [];
  const partProgress = new Map();

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      partProgress.set(partNumber, 0);

      const result = await uploadPartWithRetry(
        key,
        uploadId,
        partNumber,
        chunk,
        loaded => {
          partProgress.set(partNumber, loaded);
          let uploaded = 0;
          for (const value of partProgress.values()) uploaded += value;
          progress(Math.min(99, Math.round(uploaded / file.size * 100)), partNumber, totalParts);
        }
      );

      partProgress.set(partNumber, chunk.size);
      completedParts.push({
        partNumber,
        etag: result.etag
      });
    }

    const completeResponse = await fetch(`${WORKER}/multipart/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        uploadId,
        parts: completedParts
      })
    });

    const completed = await parseJsonResponse(completeResponse);
    progress(100, totalParts, totalParts);
    return {
      key: completed.key || key,
      url: completed.url || `${WORKER}/?key=${encodeURIComponent(completed.key || key)}`
    };
  } catch (error) {
    // The R2 multipart upload is intentionally not auto-aborted here.
    // This avoids deleting a valid upload because of a transient browser error.
    // Stale multipart uploads can be cleaned up from R2 lifecycle settings.
    throw error;
  }
}

// Keep the existing small-file uploader for thumbnails and other small assets.
function upload(file, key, progress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${WORKER}/upload`, true);
    xhr.timeout = 0;
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) progress(Math.round(e.loaded / e.total * 100));
    };
    xhr.onerror = () => reject(new Error("The upload could not be completed. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.onload = () => {
      let data = {};
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) : {}; } catch { reject(new Error("The upload service returned an invalid response.")); return; }
      if (xhr.status < 200 || xhr.status >= 300 || data.success === false) {
        reject(new Error(data.error || data.message || `Upload failed (${xhr.status}).`));
        return;
      }
      const returnedKey = data.key || data.fileKey || key;
      resolve({ key: returnedKey, url: data.url || `${WORKER}/?key=${encodeURIComponent(returnedKey)}` });
    };
    const fd = new FormData();
    fd.append("file", file);
    fd.append("key", key);
    fd.append("type", "video");
    fd.append("contentType", file.type || "video/mp4");
    xhr.send(fd);
  });
}


onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "/login"; return; }
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists() || snap.data().role !== "admin") { location.href = "/access-denied"; return; }
    $("videoUploadForm")?.addEventListener("submit", handleSubmit);
  } catch (e) {
    console.error(e);
    setStatus("Admin authorization failed.", true);
  }
});

async function handleSubmit(event) {
  event.preventDefault();
  const button = $("uploadVideoBtn");
  const file = $("videoFile")?.files?.[0];
  if (!file) return setStatus("Select a video first.", true);
  if (!/^video\//i.test(file.type) && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) return setStatus("Please select an MP4, WebM, MOV or M4V video.", true);
  if (file.size > 2 * 1024 * 1024 * 1024) return setStatus("Video is larger than the 2 GB limit.", true);

  button.disabled = true;
  $("progressBox").style.display = "block";
  $("bar").style.width = "0%";
  $("percent").textContent = "0%";
  setStatus("Uploading video…");

  try {
    const key = `videos/${Date.now()}-${crypto.randomUUID().slice(0,8)}-${cleanName(file.name)}`;
    const result = await uploadLargeVideo(file, key, (pct, partNumber, totalParts) => {
      $("bar").style.width = `${pct}%`;
      $("percent").textContent = `${pct}%`;
      $("progressText").textContent = pct < 100
        ? `Uploading video… part ${partNumber} of ${totalParts}`
        : "Saving video record…";
    });

    const publicUrl = result.url || `${WORKER}/?key=${encodeURIComponent(result.key)}`;
    const title = $("videoTitle")?.value?.trim() || file.name.replace(/\.[^.]+$/, "");
    const category = $("videoCategory")?.value || "General";
    const duration = $("videoDuration")?.value?.trim() || "";
    const premium = !!$("premiumOnly")?.checked;
    const thumb = $("videoThumbnail")?.files?.[0];

    let thumbnailUrl = "";
    let thumbnailKey = "";
    if (thumb) {
      setStatus("Uploading thumbnail…");
      thumbnailKey = `video-thumbnails/${Date.now()}-${crypto.randomUUID().slice(0,8)}-${cleanName(thumb.name)}`;
      const thumbResult = await upload(thumb, thumbnailKey, () => {});
      thumbnailKey = thumbResult.key;
      thumbnailUrl = thumbResult.url;
    }

    const record = stripUndefined({
      title, name: title, fileName: file.name, originalFileName: file.name,
      video: true, videoKey: result.key, videoUrl: publicUrl, videoURL: publicUrl, url: publicUrl,
      category, premium, premiumOnly: premium, duration,
      thumbnail: thumbnailUrl || "", thumbnailUrl: thumbnailUrl || "", thumbnailKey: thumbnailKey || "",
      status: "published", published: true, mimeType: file.type || "video/mp4", fileType: file.type || "video/mp4",
      size: file.size, sizeBytes: file.size, storageKey: result.key, r2Key: result.key,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), uploadedAt: serverTimestamp(),
      uploadedBy: auth.currentUser?.uid || "", uploadedByEmail: auth.currentUser?.email || ""
    });

    // Explicitly guarantee no legacy resource keys enter video records.
    delete record.fileKey;
    delete record.resourceKey;

    await addDoc(collection(db, "videos"), record);
    $("bar").style.width = "100%";
    $("percent").textContent = "100%";
    $("progressText").textContent = "Video saved successfully.";
    setStatus(`Saved “${title}” to /videos.`);
    event.target.reset();
  } catch (error) {
    console.error("VIDEO_UPLOAD_FAILED", error);
    setStatus(error?.message || "Video upload failed.", true);
  } finally {
    button.disabled = false;
  }
}
