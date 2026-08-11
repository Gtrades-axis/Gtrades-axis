// ============================================================
// GTRADES-AXIS™
// js/admin-videos.js
// FINAL ADMIN VIDEO UPLOAD + PREVIEW
// ============================================================

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import { app } from "./firebase.js";

// ============================================================
// CONFIG
// ============================================================

const WORKER =
  "https://gtrades-video-api.davidthuku574.workers.dev";

const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================
// STATE
// ============================================================

let uploading = false;
let currentXHR = null;

// ============================================================
// ELEMENTS
// ============================================================

const form =
  document.querySelector("#videoUploadForm") ||
  document.querySelector("form");

const fileInput =
  document.querySelector("#videoFile") ||
  document.querySelector('input[type="file"][accept*="video"]');

const titleInput =
  document.querySelector("#videoTitle") ||
  document.querySelector('input[name="title"]');

const categoryInput =
  document.querySelector("#videoCategory") ||
  document.querySelector('select[name="category"]');

const durationInput =
  document.querySelector("#videoDuration") ||
  document.querySelector('input[name="duration"]');

const premiumInput =
  document.querySelector("#premiumOnly") ||
  document.querySelector('input[name="premiumOnly"]');

const uploadButton =
  document.querySelector("#uploadVideoBtn") ||
  document.querySelector('button[type="submit"]');

// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  try {

    const snap = await getDoc(
      doc(db, "users", user.uid)
    );

    if (!snap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    if (snap.data().role !== "admin") {
      window.location.href = "/dashboard.html";
      return;
    }

    console.log("GTRADES ADMIN VIDEO SYSTEM READY");

  } catch (error) {
    console.error("Admin verification error:", error);
  }
});

// ============================================================
// LOCAL VIDEO PREVIEW
// ============================================================

if (fileInput) {

  fileInput.addEventListener("change", () => {

    const file = fileInput.files?.[0];

    if (!file) return;

    showLocalPreview(file);

  });

}

// ============================================================
// SHOW LOCAL PREVIEW
// ============================================================

function showLocalPreview(file) {

  let preview =
    document.querySelector("#adminLocalVideoPreview");

  if (!preview) {

    preview = document.createElement("video");

    preview.id =
      "adminLocalVideoPreview";

    preview.controls = true;
    preview.playsInline = true;
    preview.preload = "metadata";

    fileInput.parentNode.appendChild(preview);
  }

  if (preview.dataset.url) {
    URL.revokeObjectURL(
      preview.dataset.url
    );
  }

  const url =
    URL.createObjectURL(file);

  preview.dataset.url = url;
  preview.src = url;

  preview.style.display = "block";
  preview.style.width = "256px";
  preview.style.maxWidth = "100%";
  preview.style.marginTop = "12px";
  preview.style.borderRadius = "10px";
  preview.style.background = "#000";
}

// ============================================================
// UPLOAD
// ============================================================

if (form) {

  form.addEventListener("submit", async (event) => {

    event.preventDefault();
    event.stopPropagation();

    // HARD LOCK AGAINST DOUBLE CLICK
    if (uploading) return;

    const file =
      fileInput?.files?.[0];

    if (!file) {
      showStatus(
        "error",
        "Please select a video file."
      );
      return;
    }

    if (!file.type.startsWith("video/")) {
      showStatus(
        "error",
        "Please select a valid video file."
      );
      return;
    }

    uploading = true;

    setUploadButton(true);

    showProgress(0, "Preparing upload...");

    try {

      // ------------------------------------------------------
      // 1. GET PRESIGNED R2 UPLOAD URL
      // ------------------------------------------------------

      const title =
        titleInput?.value?.trim() ||
        file.name.replace(/\.[^/.]+$/, "");

      const extension =
        file.name.includes(".")
          ? file.name.substring(
              file.name.lastIndexOf(".")
            )
          : ".mp4";

      const safeTitle =
        title
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .toLowerCase();

      const key =
        `videos/${Date.now()}-${safeTitle || "video"}${extension}`;

      showProgress(
        3,
        "Preparing secure Cloudflare R2 upload..."
      );

      const urlResponse =
        await fetch(
          `${WORKER}/upload-url`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              key,
              contentType:
                file.type || "video/mp4"
            })
          }
        );

      if (!urlResponse.ok) {

        const text =
          await urlResponse.text();

        throw new Error(
          `Upload URL failed (${urlResponse.status}): ${text}`
        );
      }

      const uploadData =
        await urlResponse.json();

      if (
        !uploadData.success ||
        !uploadData.uploadUrl
      ) {
        throw new Error(
          "Cloudflare did not return an upload URL."
        );
      }

      // ------------------------------------------------------
      // 2. UPLOAD DIRECTLY TO R2
      //    XMLHttpRequest gives REAL progress
      // ------------------------------------------------------

      showProgress(
        5,
        "Uploading video to Cloudflare R2..."
      );

      await uploadWithProgress(
        uploadData.uploadUrl,
        file
      );

      // ------------------------------------------------------
      // 3. VERIFY
      // ------------------------------------------------------

      showProgress(
        97,
        "Verifying uploaded video..."
      );

      const videoURL =
        `${WORKER}/?key=${encodeURIComponent(
          uploadData.key || key
        )}`;

      const verify =
        await fetch(
          videoURL,
          {
            method: "HEAD"
          }
        );

      if (!verify.ok) {

        console.warn(
          "HEAD verification returned:",
          verify.status
        );

      }

      // ------------------------------------------------------
      // 4. SUCCESS
      // ------------------------------------------------------

      showProgress(
        100,
        "Upload complete!"
      );

      showStatus(
        "success",
        "Video uploaded successfully."
      );

      // Keep preview visible
      // Reset only after success
      setTimeout(() => {

        if (form) {
          form.reset();
        }

        uploading = false;
        setUploadButton(false);

      }, 1000);

    } catch (error) {

      console.error(
        "VIDEO UPLOAD ERROR:",
        error
      );

      showStatus(
        "error",
        error.message ||
        "Video upload failed."
      );

      showProgress(
        0,
        "Upload failed."
      );

      uploading = false;

      setUploadButton(false);
    }

  });

}

// ============================================================
// XHR UPLOAD WITH REAL PROGRESS
// ============================================================

function uploadWithProgress(
  uploadURL,
  file
) {

  return new Promise(
    (resolve, reject) => {

      const xhr =
        new XMLHttpRequest();

      currentXHR = xhr;

      xhr.open(
        "PUT",
        uploadURL,
        true
      );

      xhr.setRequestHeader(
        "Content-Type",
        file.type || "video/mp4"
      );

      xhr.upload.addEventListener(
        "progress",
        (event) => {

          if (!event.lengthComputable)
            return;

          const percent =
            Math.round(
              (event.loaded /
                event.total) *
              90
            ) + 5;

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

          showProgress(
            percent,
            `Uploading ${loadedMB} MB / ${totalMB} MB`
          );

        }
      );

      xhr.addEventListener(
        "load",
        () => {

          currentXHR = null;

          if (
            xhr.status >= 200 &&
            xhr.status < 300
          ) {
            resolve();
          } else {
            reject(
              new Error(
                `R2 upload failed (${xhr.status}).`
              )
            );
          }

        }
      );

      xhr.addEventListener(
        "error",
        () => {

          currentXHR = null;

          reject(
            new Error(
              "Network error while uploading to R2."
            )
          );

        }
      );

      xhr.addEventListener(
        "abort",
        () => {

          currentXHR = null;

          reject(
            new Error(
              "Upload cancelled."
            )
          );

        }
      );

      xhr.send(file);
    }
  );
}

// ============================================================
// UPLOAD BUTTON LOCK
// ============================================================

function setUploadButton(state) {

  if (!uploadButton) return;

  uploadButton.disabled = state;

  uploadButton.style.pointerEvents =
    state ? "none" : "";

  uploadButton.style.opacity =
    state ? "0.65" : "";

  uploadButton.innerHTML =
    state
      ? "⏳ Uploading..."
      : "☁ Upload Video";
}

// ============================================================
// PROGRESS UI
// ============================================================

function showProgress(
  percent,
  message
) {

  let box =
    document.querySelector(
      "#adminUploadProgress"
    );

  if (!box) {

    box =
      document.createElement("div");

    box.id =
      "adminUploadProgress";

    box.innerHTML = `
      <div class="gta-progress-message">
        Preparing...
      </div>

      <div class="gta-progress-track">
        <div class="gta-progress-bar"></div>
      </div>

      <div class="gta-progress-percent">
        0%
      </div>
    `;

    form.appendChild(box);
  }

  box.style.display = "block";

  const bar =
    box.querySelector(
      ".gta-progress-bar"
    );

  const messageElement =
    box.querySelector(
      ".gta-progress-message"
    );

  const percentElement =
    box.querySelector(
      ".gta-progress-percent"
    );

  bar.style.width =
    `${percent}%`;

  messageElement.textContent =
    message;

  percentElement.textContent =
    `${percent}%`;
}

// ============================================================
// STATUS
// ============================================================

function showStatus(
  type,
  message
) {

  let status =
    document.querySelector(
      "#adminVideoUploadStatus"
    );

  if (!status) {

    status =
      document.createElement("div");

    status.id =
      "adminVideoUploadStatus";

    form.appendChild(status);
  }

  status.className =
    `gta-upload-status ${type}`;

  status.innerHTML =
    type === "success"
      ? `✓ ${escapeHTML(message)}`
      : `✕ ${escapeHTML(message)}`;

  status.style.display =
    "block";
}

// ============================================================
// CSS
// ============================================================

const style =
  document.createElement("style");

style.textContent = `

  #adminLocalVideoPreview {
    display: block;
  }

  #adminUploadProgress {
    margin-top: 18px;
    padding: 15px;
    border-radius: 10px;
    background: rgba(0,0,0,.25);
    border: 1px solid rgba(80,130,255,.25);
  }

  .gta-progress-message {
    color: #dce7ff;
    font-size: 13px;
    margin-bottom: 9px;
  }

  .gta-progress-track {
    width: 100%;
    height: 10px;
    overflow: hidden;
    border-radius: 20px;
    background: #090d16;
  }

  .gta-progress-bar {
    width: 0%;
    height: 100%;
    border-radius: 20px;
    background: linear-gradient(
      90deg,
      #3268ff,
      #00b7ff
    );
    transition: width .15s ease;
  }

  .gta-progress-percent {
    text-align: right;
    color: #fff;
    font-size: 12px;
    margin-top: 6px;
  }

  .gta-upload-status {
    margin-top: 14px;
    padding: 13px;
    border-radius: 8px;
    font-size: 14px;
  }

  .gta-upload-status.success {
    color: #b9ffd0;
    background: rgba(0,180,80,.12);
    border: 1px solid rgba(0,220,100,.35);
  }

  .gta-upload-status.error {
    color: #ffd0d0;
    background: rgba(220,40,70,.12);
    border: 1px solid rgba(220,60,80,.4);
  }

`;

document.head.appendChild(style);

// ============================================================
// ESCAPE
// ============================================================

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}