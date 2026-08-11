// ============================================================
// GTRADES-AXIS™
// ADMIN VIDEO UPLOADER
// Cloudflare R2 + Firebase Firestore
// ============================================================

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import { app } from "./firebase.js";

// ============================================================
// CONFIG
// ============================================================

const WORKER_URL =
  "https://r2-uploader.davidthuku574.workers.dev";

// ============================================================
// FIREBASE
// ============================================================

const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================
// ELEMENTS
// ============================================================

const form = document.getElementById("videoUploadForm");

const titleInput =
  document.getElementById("videoTitle");

const categoryInput =
  document.getElementById("videoCategory");

const durationInput =
  document.getElementById("videoDuration");

const videoInput =
  document.getElementById("videoFile");

const thumbnailInput =
  document.getElementById("videoThumbnail");

const premiumInput =
  document.getElementById("premiumOnly");

const uploadButton =
  document.getElementById("uploadVideoBtn");

const preview =
  document.getElementById("preview");

const progressBox =
  document.getElementById("progressBox");

const progressText =
  document.getElementById("progressText");

const bar =
  document.getElementById("bar");

const percent =
  document.getElementById("percent");

const status =
  document.getElementById("status");

// ============================================================
// STATE
// ============================================================

let uploadLocked = false;
let previewObjectURL = null;

// ============================================================
// BASIC ELEMENT CHECK
// ============================================================

if (!form) {
  console.error(
    "GTRADES-AXIS: videoUploadForm was not found."
  );
}

if (!videoInput) {
  console.error(
    "GTRADES-AXIS: videoFile input was not found."
  );
}

// ============================================================
// ADMIN AUTH
// ============================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  try {

    const userRef =
      doc(db, "users", user.uid);

    const userSnap =
      await getDoc(userRef);

    if (!userSnap.exists()) {

      console.error(
        "Admin user document does not exist."
      );

      window.location.href =
        "/login.html";

      return;
    }

    const data =
      userSnap.data();

    if (data.role !== "admin") {

      console.warn(
        "Unauthorized user attempted to access admin uploader."
      );

      window.location.href =
        "/dashboard.html";

      return;
    }

    console.log(
      "GTRADES-AXIS Admin authenticated:",
      user.email
    );

  } catch (error) {

    console.error(
      "Admin authentication error:",
      error
    );

    window.location.href =
      "/login.html";
  }

});

// ============================================================
// VIDEO PREVIEW
// ============================================================

if (videoInput && preview) {

  videoInput.addEventListener(
    "change",
    () => {

      clearStatus();

      const file =
        videoInput.files?.[0];

      if (!file) {

        removePreview();

        return;
      }

      if (!file.type.startsWith("video/")) {

        videoInput.value = "";

        removePreview();

        showError(
          "Please select a valid video file."
        );

        return;
      }

      if (previewObjectURL) {

        URL.revokeObjectURL(
          previewObjectURL
        );
      }

      previewObjectURL =
        URL.createObjectURL(file);

      preview.src =
        previewObjectURL;

      preview.dataset.objectUrl =
        previewObjectURL;

      preview.style.display =
        "block";

      preview.load();

    }
  );
}

// ============================================================
// FORM SUBMIT
// ============================================================

if (form) {

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();
      event.stopPropagation();

      if (uploadLocked) {
        return;
      }

      clearStatus();

      // ------------------------------------------------------
      // GET FILE
      // ------------------------------------------------------

      const video =
        videoInput?.files?.[0];

      if (!video) {

        showError(
          "Please select a video first."
        );

        return;
      }

      // ------------------------------------------------------
      // VALIDATE VIDEO
      // ------------------------------------------------------

      if (!video.type.startsWith("video/")) {

        showError(
          "The selected file is not a valid video."
        );

        return;
      }

      // ------------------------------------------------------
      // TITLE
      // ------------------------------------------------------

      const title =
        titleInput?.value.trim();

      if (!title) {

        showError(
          "Please enter a video title."
        );

        titleInput?.focus();

        return;
      }

      // ------------------------------------------------------
      // CATEGORY
      // ------------------------------------------------------

      const category =
        categoryInput?.value || "";

      // ------------------------------------------------------
      // DURATION
      // ------------------------------------------------------

      const duration =
        durationInput?.value.trim() || "";

      // ------------------------------------------------------
      // PREMIUM
      // ------------------------------------------------------

      const premiumOnly =
        premiumInput?.checked === true;

      // ======================================================
      // HARD LOCK
      // ======================================================

      uploadLocked = true;

      if (uploadButton) {

        uploadButton.disabled =
          true;

        uploadButton.textContent =
          "Uploading...";
      }

      if (progressBox) {

        progressBox.style.display =
          "block";
      }

      updateProgress(
        0,
        "Preparing upload..."
      );

      try {

        // ====================================================
        // SAFE FILE NAME
        // ====================================================

        const safeTitle =
          makeSafeFileName(title);

        const timestamp =
          Date.now();

        // ====================================================
        // VIDEO KEY
        // ====================================================

        const extension =
          getExtension(video.name);

        const videoKey =
          `videos/${timestamp}-${safeTitle}${extension}`;

        console.log(
          "Uploading video:",
          videoKey
        );

        // ====================================================
        // UPLOAD VIDEO
        // ====================================================

        updateProgress(
          1,
          "Connecting to Cloudflare..."
        );

        const videoResult =
          await uploadFile(
            video,
            videoKey,
            "video"
          );

        console.log(
          "Video upload response:",
          videoResult
        );

        if (
          !videoResult ||
          videoResult.success !== true
        ) {

          throw new Error(
            videoResult?.error ||
            "Cloudflare did not confirm the video upload."
          );
        }

        // ====================================================
        // VIDEO URL
        // ====================================================

        const videoURL =
          extractURL(
            videoResult,
            videoKey
          );

        if (!videoURL) {

          throw new Error(
            "Video uploaded to R2, but no video URL was returned."
          );
        }

        // ====================================================
        // THUMBNAIL
        // ====================================================

        let thumbnailKey = "";
        let thumbnailURL = "";

        const thumbnail =
          thumbnailInput?.files?.[0];

        if (thumbnail) {

          if (
            !thumbnail.type.startsWith("image/")
          ) {

            throw new Error(
              "The thumbnail must be an image."
            );
          }

          const thumbExtension =
            getExtension(
              thumbnail.name
            );

          thumbnailKey =
            `thumbnails/${timestamp}-${safeTitle}${thumbExtension}`;

          updateProgress(
            91,
            "Uploading thumbnail..."
          );

          const thumbnailResult =
            await uploadFile(
              thumbnail,
              thumbnailKey,
              "thumbnail"
            );

          console.log(
            "Thumbnail upload response:",
            thumbnailResult
          );

          if (
            !thumbnailResult ||
            thumbnailResult.success !== true
          ) {

            throw new Error(
              thumbnailResult?.error ||
              "Thumbnail upload failed."
            );
          }

          thumbnailURL =
            extractURL(
              thumbnailResult,
              thumbnailKey
            );
        }

        // ====================================================
        // FIRESTORE
        // ====================================================

        updateProgress(
          97,
          "Saving video information..."
        );

        const videoDocument = {

          // -----------------------------------------------
          // BASIC INFORMATION
          // -----------------------------------------------

          title: title,

          category: category,

          duration: duration,

          premiumOnly: premiumOnly,

          // -----------------------------------------------
          // VIDEO
          // -----------------------------------------------

          videoUrl: videoURL,

          videoKey: videoKey,

          // -----------------------------------------------
          // THUMBNAIL
          // -----------------------------------------------

          thumbnail: thumbnailURL,

          thumbnailKey: thumbnailKey,

          // -----------------------------------------------
          // ORIGINAL FILE
          // -----------------------------------------------

          fileName: video.name,

          fileSize: video.size,

          contentType: video.type,

          // -----------------------------------------------
          // STATUS
          // -----------------------------------------------

          active: true,

          published: true,

          // -----------------------------------------------
          // TIMESTAMP
          // -----------------------------------------------

          createdAt:
            serverTimestamp()

        };

        const videoDocRef =
          await addDoc(
            collection(db, "videos"),
            videoDocument
          );

        console.log(
          "Firestore video created:",
          videoDocRef.id
        );

        // ====================================================
        // COMPLETE
        // ====================================================

        updateProgress(
          100,
          "Upload complete!"
        );

        showSuccess(
          "Video uploaded successfully."
        );

        if (uploadButton) {

          uploadButton.textContent =
            "✓ Uploaded";
        }

        // ====================================================
        // RESET
        // ====================================================

        setTimeout(
          () => {

            form.reset();

            removePreview();

            if (progressBox) {

              progressBox.style.display =
                "none";
            }

            if (uploadButton) {

              uploadButton.disabled =
                false;

              uploadButton.textContent =
                "☁ Upload Video";
            }

            uploadLocked =
              false;

          },
          1800
        );

      } catch (error) {

        console.error(
          "GTRADES-AXIS VIDEO UPLOAD ERROR:",
          error
        );

        showError(
          getReadableError(error)
        );

        if (uploadButton) {

          uploadButton.disabled =
            false;

          uploadButton.textContent =
            "☁ Upload Video";
        }

        uploadLocked =
          false;
      }

    }
  );
}

// ============================================================
// CLOUDflare R2 UPLOAD
// ============================================================

function uploadFile(
  file,
  key,
  type
) {

  return new Promise(
    (resolve, reject) => {

      try {

        const formData =
          new FormData();

        formData.append(
          "file",
          file,
          file.name
        );

        formData.append(
          "key",
          key
        );

        formData.append(
          "type",
          type
        );

        formData.append(
          "contentType",
          file.type ||
          "application/octet-stream"
        );

        const xhr =
          new XMLHttpRequest();

        const uploadURL =
          `${WORKER_URL}/upload`;

        console.log(
          "POST:",
          uploadURL
        );

        xhr.open(
          "POST",
          uploadURL,
          true
        );

        // ----------------------------------------------------
        // PROGRESS
        // ----------------------------------------------------

        xhr.upload.onprogress =
          (event) => {

            if (
              !event.lengthComputable
            ) {
              return;
            }

            const ratio =
              event.loaded /
              event.total;

            let start;
            let end;

            if (type === "video") {

              start = 2;
              end = 90;

            } else {

              start = 91;
              end = 96;
            }

            const progress =
              Math.round(
                start +
                ratio *
                (end - start)
              );

            const loadedMB =
              (
                event.loaded /
                1024 /
                1024
              ).toFixed(1);

            const totalMB =
              (
                event.total /
                1024 /
                1024
              ).toFixed(1);

            updateProgress(
              progress,
              `Uploading ${loadedMB} MB / ${totalMB} MB`
            );

          };

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        xhr.onload =
          () => {

            console.log(
              "Cloudflare status:",
              xhr.status
            );

            console.log(
              "Cloudflare response:",
              xhr.responseText
            );

            if (
              xhr.status < 200 ||
              xhr.status >= 300
            ) {

              reject(
                new Error(
                  `Cloudflare upload failed (${xhr.status}). ${cleanResponse(xhr.responseText)}`
                )
              );

              return;
            }

            let response;

            try {

              response =
                JSON.parse(
                  xhr.responseText
                );

            } catch (error) {

              reject(
                new Error(
                  "Cloudflare returned an invalid JSON response."
                )
              );

              return;
            }

            if (
              response.success !== true
            ) {

              reject(
                new Error(
                  response.error ||
                  response.message ||
                  "Cloudflare rejected the upload."
                )
              );

              return;
            }

            resolve(response);

          };

        // ----------------------------------------------------
        // NETWORK ERROR
        // ----------------------------------------------------

        xhr.onerror =
          () => {

            reject(
              new Error(
                "Network error. The browser could not connect to the Cloudflare Worker."
              )
            );

          };

        // ----------------------------------------------------
        // TIMEOUT
        // ----------------------------------------------------

        xhr.timeout =
          30 * 60 * 1000;

        xhr.ontimeout =
          () => {

            reject(
              new Error(
                "The upload timed out."
              )
            );

          };

        // ----------------------------------------------------
        // ABORT
        // ----------------------------------------------------

        xhr.onabort =
          () => {

            reject(
              new Error(
                "The upload was cancelled."
              )
            );

          };

        // ----------------------------------------------------
        // SEND
        // ----------------------------------------------------

        xhr.send(
          formData
        );

      } catch (error) {

        reject(error);

      }

    }
  );
}

// ============================================================
// EXTRACT URL
// ============================================================

function extractURL(
  response,
  key
) {

  const possibleURLs = [

    response.url,

    response.publicUrl,

    response.publicURL,

    response.videoUrl,

    response.videoURL,

    response.thumbnailUrl,

    response.thumbnailURL,

    response.fileUrl,

    response.fileURL,

    response.result?.url,

    response.result?.publicUrl,

    response.data?.url

  ];

  for (
    const value of possibleURLs
  ) {

    if (
      typeof value === "string" &&
      value.trim()
    ) {

      return value.trim();

    }

  }

  // ----------------------------------------------------------
  // FALLBACK
  // ----------------------------------------------------------

  return `${WORKER_URL}/file?key=${encodeURIComponent(key)}`;
}

// ============================================================
// SAFE FILE NAME
// ============================================================

function makeSafeFileName(
  title
) {

  return title

    .normalize("NFKD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .replace(
      /[^a-zA-Z0-9-_ ]/g,
      ""
    )

    .trim()

    .replace(
      /\s+/g,
      "-"
    )

    .replace(
      /-+/g,
      "-"
    )

    .toLowerCase()

    .substring(
      0,
      100
    ) || "video";
}

// ============================================================
// EXTENSION
// ============================================================

function getExtension(
  filename
) {

  if (
    !filename ||
    !filename.includes(".")
  ) {

    return ".mp4";
  }

  return filename
    .substring(
      filename.lastIndexOf(".")
    )
    .toLowerCase();
}

// ============================================================
// PREVIEW
// ============================================================

function removePreview() {

  if (previewObjectURL) {

    URL.revokeObjectURL(
      previewObjectURL
    );

    previewObjectURL =
      null;
  }

  if (!preview) {
    return;
  }

  preview.pause();

  preview.removeAttribute(
    "src"
  );

  preview.removeAttribute(
    "data-object-url"
  );

  preview.load();

  preview.style.display =
    "none";
}

// ============================================================
// PROGRESS
// ============================================================

function updateProgress(
  value,
  message
) {

  const safeValue =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(value)
      )
    );

  if (bar) {

    bar.style.width =
      `${safeValue}%`;
  }

  if (percent) {

    percent.textContent =
      `${safeValue}%`;
  }

  if (progressText) {

    progressText.textContent =
      message;
  }
}

// ============================================================
// SUCCESS
// ============================================================

function showSuccess(
  message
) {

  if (!status) {
    return;
  }

  status.className =
    "success";

  status.textContent =
    `✓ ${message}`;

  status.style.display =
    "block";
}

// ============================================================
// ERROR
// ============================================================

function showError(
  message
) {

  if (!status) {

    alert(message);

    return;
  }

  status.className =
    "error";

  status.textContent =
    `❌ ${message}`;

  status.style.display =
    "block";
}

// ============================================================
// CLEAR STATUS
// ============================================================

function clearStatus() {

  if (!status) {
    return;
  }

  status.className = "";

  status.textContent = "";

  status.style.display =
    "none";
}

// ============================================================
// RESPONSE CLEANUP
// ============================================================

function cleanResponse(
  text
) {

  if (!text) {
    return "";
  }

  try {

    const json =
      JSON.parse(text);

    return (
      json.error ||
      json.message ||
      JSON.stringify(json)
    );

  } catch {

    return text
      .substring(0, 300);
  }
}

// ============================================================
// READABLE ERROR
// ============================================================

function getReadableError(
  error
) {

  if (!error) {

    return "Video upload failed.";
  }

  const message =
    error.message ||
    String(error);

  if (
    message.includes("Failed to fetch")
  ) {

    return (
      "Could not connect to Cloudflare. " +
      "Check the Worker and CORS configuration."
    );
  }

  if (
    message.includes("403")
  ) {

    return (
      "Cloudflare rejected the upload (403). " +
      "Check the Worker permissions."
    );
  }

  if (
    message.includes("404")
  ) {

    return (
      "Cloudflare upload endpoint was not found (404). " +
      "The Worker /upload route may be incorrect."
    );
  }

  if (
    message.includes("413")
  ) {

    return (
      "The video is too large for the current upload configuration."
    );
  }

  return message;
}