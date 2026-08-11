// ============================================================
// GTRADES-AXIS™
// ADMIN VIDEO UPLOAD
// js/admin-video.js
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
const titleInput = document.getElementById("videoTitle");
const categoryInput = document.getElementById("videoCategory");
const durationInput = document.getElementById("videoDuration");
const videoInput = document.getElementById("videoFile");
const thumbnailInput = document.getElementById("videoThumbnail");
const premiumInput = document.getElementById("premiumOnly");

const uploadButton = document.getElementById("uploadVideoBtn");

const preview = document.getElementById("preview");

const progressBox = document.getElementById("progressBox");
const progressText = document.getElementById("progressText");
const bar = document.getElementById("bar");
const percent = document.getElementById("percent");

const status = document.getElementById("status");

// ============================================================
// STATE
// ============================================================

let uploadLocked = false;

// ============================================================
// CHECK ELEMENTS
// ============================================================

if (!form) {
  console.error("videoUploadForm not found.");
}

if (!videoInput) {
  console.error("videoFile not found.");
}

// ============================================================
// ADMIN AUTHENTICATION
// ============================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  try {

    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    const userData = userSnap.data();

    if (userData.role !== "admin") {

      alert("Admin access required.");

      window.location.href = "/dashboard.html";

      return;
    }

    console.log("GTRADES-AXIS admin verified.");

  } catch (error) {

    console.error(
      "Admin verification failed:",
      error
    );

    window.location.href = "/login.html";
  }

});

// ============================================================
// VIDEO PREVIEW
// ============================================================

if (videoInput) {

  videoInput.addEventListener("change", () => {

    const file = videoInput.files[0];

    if (!file) {
      preview.style.display = "none";
      preview.removeAttribute("src");
      return;
    }

    if (!file.type.startsWith("video/")) {

      videoInput.value = "";

      showError(
        "Please select a valid video file."
      );

      return;
    }

    if (preview.dataset.objectUrl) {

      URL.revokeObjectURL(
        preview.dataset.objectUrl
      );
    }

    const objectURL =
      URL.createObjectURL(file);

    preview.dataset.objectUrl =
      objectURL;

    preview.src =
      objectURL;

    preview.style.display =
      "block";

  });

}

// ============================================================
// FORM SUBMISSION
// ============================================================

if (form) {

  form.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (uploadLocked) {
      return;
    }

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    const video =
      videoInput.files[0];

    if (!video) {

      showError(
        "Please select a video."
      );

      return;
    }

    if (!video.type.startsWith("video/")) {

      showError(
        "Invalid video file."
      );

      return;
    }

    const title =
      titleInput.value.trim();

    if (!title) {

      showError(
        "Please enter a video title."
      );

      return;
    }

    // --------------------------------------------------------
    // LOCK
    // --------------------------------------------------------

    uploadLocked = true;

    uploadButton.disabled = true;

    uploadButton.textContent =
      "Uploading...";

    status.style.display =
      "none";

    progressBox.style.display =
      "block";

    updateProgress(
      0,
      "Preparing upload..."
    );

    try {

      // ======================================================
      // SAFE NAME
      // ======================================================

      const safeTitle =
        title
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .replace(/\s+/g, "-")
          .toLowerCase()
          .substring(0, 80);

      const timestamp =
        Date.now();

      const videoExtension =
        getExtension(video.name);

      const videoKey =
        `videos/${timestamp}-${safeTitle || "video"}${videoExtension}`;

      // ======================================================
      // VIDEO UPLOAD
      // ======================================================

      updateProgress(
        1,
        "Uploading video..."
      );

      const videoResult =
        await uploadToWorker(
          video,
          videoKey,
          "video"
        );

      console.log(
        "VIDEO RESULT:",
        videoResult
      );

      // ======================================================
      // THUMBNAIL
      // ======================================================

      let thumbnailKey = "";
      let thumbnailURL = "";

      if (
        thumbnailInput &&
        thumbnailInput.files &&
        thumbnailInput.files.length > 0
      ) {

        const thumbnail =
          thumbnailInput.files[0];

        if (!thumbnail.type.startsWith("image/")) {

          throw new Error(
            "Thumbnail must be an image."
          );
        }

        const thumbnailExtension =
          getExtension(
            thumbnail.name
          );

        thumbnailKey =
          `thumbnails/${timestamp}-${safeTitle || "thumbnail"}${thumbnailExtension}`;

        updateProgress(
          92,
          "Uploading thumbnail..."
        );

        const thumbnailResult =
          await uploadToWorker(
            thumbnail,
            thumbnailKey,
            "thumbnail"
          );

        console.log(
          "THUMBNAIL RESULT:",
          thumbnailResult
        );

        thumbnailURL =
          thumbnailResult.url ||
          `${WORKER_URL}/file?key=${encodeURIComponent(thumbnailKey)}`;
      }

      // ======================================================
      // VIDEO URL
      // ======================================================

      const videoURL =
        videoResult.url ||
        `${WORKER_URL}/file?key=${encodeURIComponent(videoKey)}`;

      // ======================================================
      // SAVE FIRESTORE
      // ======================================================

      updateProgress(
        97,
        "Saving video information..."
      );

      await addDoc(
        collection(db, "videos"),
        {

          title: title,

          category:
            categoryInput.value || "General",

          duration:
            durationInput.value.trim() || "",

          premiumOnly:
            premiumInput.checked,

          videoUrl:
            videoURL,

          videoURL:
            videoURL,

          url:
            videoURL,

          videoKey:
            videoKey,

          thumbnail:
            thumbnailURL,

          thumbnailUrl:
            thumbnailURL,

          thumbnailKey:
            thumbnailKey,

          fileName:
            video.name,

          fileSize:
            video.size,

          contentType:
            video.type,

          active:
            true,

          published:
            true,

          createdAt:
            serverTimestamp()
        }
      );

      // ======================================================
      // SUCCESS
      // ======================================================

      updateProgress(
        100,
        "Upload complete!"
      );

      showSuccess(
        "Video uploaded successfully."
      );

      uploadButton.textContent =
        "✓ Video Uploaded";

      // ======================================================
      // RESET
      // ======================================================

      setTimeout(() => {

        form.reset();

        if (preview.dataset.objectUrl) {

          URL.revokeObjectURL(
            preview.dataset.objectUrl
          );

          delete preview.dataset.objectUrl;
        }

        preview.removeAttribute("src");

        preview.style.display =
          "none";

        progressBox.style.display =
          "none";

        uploadButton.disabled =
          false;

        uploadButton.textContent =
          "☁ Upload Video";

        uploadLocked =
          false;

      }, 1800);

    } catch (error) {

      console.error(
        "GTRADES-AXIS VIDEO UPLOAD ERROR:",
        error
      );

      showError(
        error.message ||
        "Video upload failed."
      );

      uploadButton.disabled =
        false;

      uploadButton.textContent =
        "☁ Upload Video";

      uploadLocked =
        false;
    }

  });

}

// ============================================================
// UPLOAD TO CLOUDFLARE WORKER
// ============================================================

function uploadToWorker(
  file,
  key,
  type
) {

  return new Promise((resolve, reject) => {

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
      file.type
    );

    const xhr =
      new XMLHttpRequest();

    xhr.open(
      "POST",
      `${WORKER_URL}/upload`,
      true
    );

    // ========================================================
    // PROGRESS
    // ========================================================

    xhr.upload.onprogress =
      (event) => {

        if (!event.lengthComputable) {
          return;
        }

        const ratio =
          event.loaded / event.total;

        let start;
        let end;

        if (type === "video") {

          start = 2;
          end = 90;

        } else {

          start = 92;
          end = 96;
        }

        const progress =
          Math.round(
            start +
            ratio * (end - start)
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

    // ========================================================
    // RESPONSE
    // ========================================================

    xhr.onload = () => {

      console.log(
        "WORKER STATUS:",
        xhr.status
      );

      console.log(
        "WORKER RESPONSE:",
        xhr.responseText
      );

      if (
        xhr.status < 200 ||
        xhr.status >= 300
      ) {

        reject(
          new Error(
            `Cloudflare Worker error (${xhr.status})`
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
            "Cloudflare returned an invalid response."
          )
        );

        return;
      }

      if (!response.success) {

        reject(
          new Error(
            response.error ||
            "Cloudflare R2 upload failed."
          )
        );

        return;
      }

      resolve(response);
    };

    // ========================================================
    // NETWORK ERROR
    // ========================================================

    xhr.onerror = () => {

      reject(
        new Error(
          "Could not connect to Cloudflare Worker."
        )
      );

    };

    xhr.onabort = () => {

      reject(
        new Error(
          "Upload was cancelled."
        )
      );

    };

    // ========================================================
    // SEND
    // ========================================================

    xhr.send(formData);

  });

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
        value
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

  status.className =
    "error";

  status.textContent =
    `❌ ${message}`;

  status.style.display =
    "block";
}

// ============================================================
// FILE EXTENSION
// ============================================================

function getExtension(
  filename
) {

  const index =
    filename.lastIndexOf(".");

  if (index === -1) {
    return "";
  }

  return filename
    .substring(index)
    .toLowerCase();
}