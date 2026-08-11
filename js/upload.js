// ============================================================
// GTRADES-AXIS™
// CLOUDFLARE R2 UPLOAD / DOWNLOAD HELPER
// js/upload.js
// ============================================================

const WORKER_URL = "https://r2-uploader.davidthuku574.workers.dev";

function cleanKey(key) {
  if (typeof key !== "string") {
    throw new Error("Invalid R2 file key.");
  }

  const cleaned = key.trim().replace(/^\/+/, "");

  if (!cleaned) {
    throw new Error("Invalid R2 file key.");
  }

  return cleaned;
}

// ------------------------------------------------------------
// UPLOAD
// ------------------------------------------------------------
// Uses the SAME Worker already used by the admin video uploader.
// No Firebase Storage is used here.
// ------------------------------------------------------------
export async function uploadToR2(file, key, onProgress) {
  if (!(file instanceof File) && !(file instanceof Blob)) {
    throw new Error("Invalid file provided.");
  }

  const safeKey = cleanKey(key);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("key", safeKey);
  formData.append("type", "resource");
  formData.append(
    "contentType",
    file.type || "application/octet-stream"
  );

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${WORKER_URL}/upload`, true);
    xhr.timeout = 0;

    xhr.upload.addEventListener("progress", (event) => {
      if (
        event.lengthComputable &&
        typeof onProgress === "function"
      ) {
        const percent = Math.round(
          (event.loaded / event.total) * 100
        );
        onProgress(percent);
      }
    });

    xhr.onload = () => {
      const responseText = xhr.responseText || "";

      if (xhr.status < 200 || xhr.status >= 300) {
        let message = responseText;

        try {
          const data = JSON.parse(responseText);
          message =
            data.error ||
            data.message ||
            `HTTP ${xhr.status}`;
        } catch (_) {}

        reject(
          new Error(
            `Cloudflare R2 upload failed (${xhr.status}): ${message}`
          )
        );
        return;
      }

      let data;

      try {
        data = JSON.parse(responseText);
      } catch (_) {
        reject(
          new Error(
            "Cloudflare Worker returned invalid JSON."
          )
        );
        return;
      }

      if (!data.success) {
        reject(
          new Error(
            data.error ||
            data.message ||
            "Cloudflare R2 upload failed."
          )
        );
        return;
      }

      const returnedKey =
        data.key ||
        data.fileKey ||
        safeKey;

      resolve(returnedKey);
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Network/CORS error while uploading to Cloudflare R2."
        )
      );
    };

    xhr.onabort = () => {
      reject(new Error("Upload was cancelled."));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timed out."));
    };

    xhr.send(formData);
  });
}

// ------------------------------------------------------------
// DOWNLOAD / PREVIEW URL
// ------------------------------------------------------------
// The Worker serves the actual R2 object from /file?key=...
// ------------------------------------------------------------
export async function getDownloadUrl(key) {
  const safeKey = cleanKey(key);

  return (
    `${WORKER_URL}/file?key=` +
    encodeURIComponent(safeKey)
  );
}

// ------------------------------------------------------------
// OPEN R2 FILE
// ------------------------------------------------------------
export async function openR2File(
  key,
  target = "_blank"
) {
  const url = await getDownloadUrl(key);

  window.open(
    url,
    target,
    "noopener,noreferrer"
  );

  return url;
}

// Optional compatibility helper for older code.
export async function getWorkerFileUrl(key) {
  return await getDownloadUrl(key);
}
