// ============================================================
// GTRADES-AXIS™
// CLOUDFLARE R2 UPLOAD / DOWNLOAD HELPER
// js/upload.js
// ============================================================

const WORKER_URL =
  "https://r2-uploader.davidthuku574.workers.dev";


// ============================================================
// CLEAN R2 KEY
// ============================================================

function cleanKey(key) {
  if (typeof key !== "string") throw new Error("Invalid R2 file key.");
  let cleaned = key.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  cleaned = cleaned.replace(/\/{2,}/g, "/").replace(/^\.\//, "");
  if (!cleaned || cleaned.includes("..")) throw new Error("Invalid R2 file key.");
  cleaned = cleaned.split("/").map((part, i) => {
    if (i === 0) return part.replace(/[^a-zA-Z0-9_-]/g, "_");
    return part.replace(/[^a-zA-Z0-9._-]/g, "_");
  }).filter(Boolean).join("/");
  if (!cleaned) throw new Error("Invalid R2 file key.");
  return cleaned;
}

// ============================================================
// UPLOAD TO CLOUDFLARE R2
//
// IMPORTANT:
// This uses the SAME Worker used by the video system.
//
// POST:
// /upload
//
// FormData:
// file
// key
// type
// contentType
// ============================================================

export async function uploadToR2(
  file,
  key,
  onProgress
) {

  if (
    !(file instanceof File) &&
    !(file instanceof Blob)
  ) {
    throw new Error("Invalid file provided.");
  }

  const safeKey =
    cleanKey(key);

  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  formData.append(
    "key",
    safeKey
  );

  formData.append(
    "type",
    "resource"
  );

  formData.append(
    "contentType",
    file.type ||
    "application/octet-stream"
  );


  return new Promise(
    (resolve, reject) => {

      const xhr =
        new XMLHttpRequest();


      // --------------------------------------------------------
      // DIRECT POST TO WORKER
      // --------------------------------------------------------

      xhr.open(
        "POST",
        `${WORKER_URL}/upload`,
        true
      );

      // Do not timeout large video uploads.
      xhr.timeout = 0;


      // --------------------------------------------------------
      // UPLOAD PROGRESS
      // --------------------------------------------------------

      xhr.upload.addEventListener(
        "progress",
        (event) => {

          if (
            event.lengthComputable &&
            typeof onProgress === "function"
          ) {

            const percent =
              Math.round(
                (
                  event.loaded /
                  event.total
                ) * 100
              );

            onProgress(percent);
          }

        }
      );


      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      xhr.onload = () => {

        const responseText =
          xhr.responseText || "";


        // ------------------------------------------------------
        // HTTP ERROR
        // ------------------------------------------------------

        if (
          xhr.status < 200 ||
          xhr.status >= 300
        ) {

          let message =
            responseText;

          try {

            const data =
              JSON.parse(
                responseText
              );

            message =
              data.error ||
              data.message ||
              `HTTP ${xhr.status}`;

          } catch (_) {
            // Keep raw response.
          }


          reject(
            new Error(
              `Cloudflare R2 upload failed (${xhr.status}): ${message}`
            )
          );

          return;
        }


        // ------------------------------------------------------
        // PARSE WORKER RESPONSE
        // ------------------------------------------------------

        let data;

        try {

          data =
            JSON.parse(
              responseText
            );

        } catch (_) {

          reject(
            new Error(
              "Cloudflare Worker returned invalid JSON."
            )
          );

          return;
        }


        // ------------------------------------------------------
        // WORKER REPORTED FAILURE
        // ------------------------------------------------------

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


        // ------------------------------------------------------
        // RETURN R2 KEY
        // ------------------------------------------------------

        const returnedKey =
          data.key ||
          data.fileKey ||
          safeKey;


        resolve(
          returnedKey
        );

      };


      // --------------------------------------------------------
      // NETWORK ERROR
      // --------------------------------------------------------

      xhr.onerror = () => {

        reject(
          new Error(
            "Network/CORS error while uploading to Cloudflare R2."
          )
        );

      };


      // --------------------------------------------------------
      // ABORT
      // --------------------------------------------------------

      xhr.onabort = () => {

        reject(
          new Error(
            "Upload was cancelled."
          )
        );

      };


      // --------------------------------------------------------
      // TIMEOUT
      // --------------------------------------------------------

      xhr.ontimeout = () => {

        reject(
          new Error(
            "Upload timed out."
          )
        );

      };


      // --------------------------------------------------------
      // SEND
      // --------------------------------------------------------

      xhr.send(
        formData
      );

    }
  );
}


// ============================================================
// GET R2 FILE URL
//
// Worker endpoint:
//
// /file?key=...
// ============================================================

export async function getDownloadUrl(
  key
) {

  const safeKey =
    cleanKey(key);

  return (
    `${WORKER_URL}/?key=` +
    encodeURIComponent(
      safeKey
    )
  );
}


// ============================================================
// OPEN R2 FILE
// ============================================================

export async function openR2File(
  key,
  target = "_blank"
) {

  const url =
    await getDownloadUrl(
      key
    );

  window.open(
    url,
    target,
    "noopener,noreferrer"
  );

  return url;
}


// ============================================================
// COMPATIBILITY HELPER
// ============================================================

export async function getWorkerFileUrl(
  key
) {

  return await getDownloadUrl(
    key
  );

}