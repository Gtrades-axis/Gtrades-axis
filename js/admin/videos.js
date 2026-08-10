// ============================================================
// GTRADES-AXIS™ — ADMIN VIDEO MANAGER
// js/admin-videos.js
// ============================================================

import { db, auth } from "../firebase.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ============================================================
// CONFIG
// ============================================================

const R2_WORKER_URL =
  "https://r2-uploader.davidthuku574.workers.dev";

// ============================================================
// DOM
// ============================================================

const videoForm =
  document.getElementById("videoForm");

const videoListBody =
  document.getElementById("videoTableBody");

const toggleFormBtn =
  document.getElementById("toggleVideoFormBtn");

const formContainer =
  document.getElementById("videoFormContainer");

const cancelBtn =
  document.getElementById("cancelVideoBtn");

const formTitle =
  document.getElementById("videoFormTitle");

const editingIdInput =
  document.getElementById("editingVideoId");

const thumbnailFileInput =
  document.getElementById("videoThumbnailFile");

const videoFileInput =
  document.getElementById("videoFile");

const thumbnailPreview =
  document.getElementById("thumbnailPreview");

const thumbnailPreviewImg =
  document.getElementById("thumbnailPreviewImg");

const existingThumbnailUrl =
  document.getElementById("existingThumbnailUrl");

const existingVideoKey =
  document.getElementById("existingVideoKey");

// ============================================================
// STATE
// ============================================================

let videos = [];
let editingId = null;
let currentUser = null;
let previewBlobUrl = null;

// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, user => {
  currentUser = user;
});

// ============================================================
// HELPERS
// ============================================================

function encodeKey(key) {
  return String(key)
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ============================================================
// R2 UPLOAD
// ============================================================

async function uploadToR2(file, folder) {

  if (!file) {
    throw new Error("No file selected.");
  }

  if (!currentUser) {
    throw new Error("Admin session not ready.");
  }

  const safeName =
    file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

  const key =
    `${folder}/${currentUser.uid}/${Date.now()}_${safeName}`;

  const uploadURL =
    `${R2_WORKER_URL}/upload` +
    `?key=${encodeURIComponent(key)}` +
    `&contentType=${encodeURIComponent(
      file.type || "application/octet-stream"
    )}`;

  const token =
    await currentUser.getIdToken(true);

  const response =
    await fetch(uploadURL, {
      method: "PUT",

      headers: {
        "Content-Type":
          file.type ||
          "application/octet-stream",

        Authorization:
          `Bearer ${token}`
      },

      body: file
    });

  const text =
    await response.text();

  let result = {};

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      "Invalid response from R2 Worker: " +
      text
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error ||
      "R2 upload failed."
    );
  }

  return {
    key:
      result.key || key,

    url:
      result.url ||
      `${R2_WORKER_URL}/?key=${encodeURIComponent(key)}&action=file`
  };
}

// ============================================================
// THUMBNAIL PREVIEW
// ============================================================

thumbnailFileInput?.addEventListener(
  "change",
  () => {

    const file =
      thumbnailFileInput.files?.[0];

    if (!file) {
      thumbnailPreview.style.display = "none";
      return;
    }

    if (!file.type.startsWith("image/")) {

      alert(
        "Please select a valid image."
      );

      thumbnailFileInput.value = "";
      return;
    }

    const reader =
      new FileReader();

    reader.onload = event => {

      thumbnailPreviewImg.src =
        event.target.result;

      thumbnailPreview.style.display =
        "block";
    };

    reader.readAsDataURL(file);
  }
);

// ============================================================
// VIDEO VALIDATION
// ============================================================

videoFileInput?.addEventListener(
  "change",
  () => {

    const file =
      videoFileInput.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {

      alert(
        "Please select a valid video file."
      );

      videoFileInput.value = "";
      return;
    }

    const maxSize =
      500 * 1024 * 1024;

    if (file.size > maxSize) {

      alert(
        "Video is too large. Maximum allowed size is 500 MB."
      );

      videoFileInput.value = "";
    }
  }
);

// ============================================================
// LOAD VIDEOS
// ============================================================

async function loadVideos() {

  if (!videoListBody) return;

  videoListBody.innerHTML = `
    <tr>
      <td colspan="6">
        Loading videos...
      </td>
    </tr>
  `;

  try {

    const snapshot =
      await getDocs(
        collection(db, "videos")
      );

    videos = [];

    snapshot.forEach(videoDoc => {

      videos.push({
        id: videoDoc.id,
        ...videoDoc.data()
      });

    });

    videos.sort((a, b) => {

      const aTime =
        a.createdAt?.seconds || 0;

      const bTime =
        b.createdAt?.seconds || 0;

      return bTime - aTime;
    });

    renderVideos();

  } catch (error) {

    console.error(
      "LOAD VIDEOS ERROR:",
      error
    );

    videoListBody.innerHTML = `
      <tr>
        <td colspan="6">
          Unable to load videos.
        </td>
      </tr>
    `;
  }
}

// ============================================================
// RENDER
// ============================================================

function renderVideos() {

  if (!videoListBody) return;

  videoListBody.innerHTML = "";

  if (!videos.length) {

    videoListBody.innerHTML = `
      <tr>
        <td colspan="6">
          No videos uploaded.
        </td>
      </tr>
    `;

    return;
  }

  videos.forEach(video => {

    const tr =
      document.createElement("tr");

    const hasVideo =
      Boolean(
        video.videoKey ||
        video.fileKey ||
        video.r2Key ||
        video.storageKey ||
        video.youtubeId
      );

    const thumbnail =
      video.thumbnailKey
        ? `${R2_WORKER_URL}/?key=${encodeURIComponent(
            video.thumbnailKey
          )}&action=file`
        : video.thumbnail || "";

    const thumbHTML =
      thumbnail
        ? `
          <img
            src="${escapeHTML(thumbnail)}"
            style="
              width:70px;
              height:40px;
              object-fit:cover;
              border-radius:6px;
            "
          >
        `
        : `
          <span style="font-size:1.5rem">
            📹
          </span>
        `;

    tr.innerHTML = `

      <td>
        ${thumbHTML}
      </td>

      <td>

        <strong>
          ${escapeHTML(
            video.title || "Untitled"
          )}
        </strong>

        ${
          hasVideo
            ? `
              <small
                style="
                  display:block;
                  color:#00c897;
                  margin-top:4px;
                "
              >
                ✓ Video attached
              </small>
            `
            : `
              <small
                style="
                  display:block;
                  color:#ff4766;
                  margin-top:4px;
                "
              >
                ⚠ No video file
              </small>
            `
        }

      </td>

      <td>
        ${escapeHTML(
          video.category || "General"
        )}
      </td>

      <td>
        ${escapeHTML(
          video.duration || "—"
        )}
      </td>

      <td>

        <span
          class="badge ${
            video.premiumOnly
              ? "premium"
              : "free"
          }"
        >
          ${
            video.premiumOnly
              ? "Premium"
              : "Free"
          }
        </span>

      </td>

      <td>

        <div
          style="
            display:flex;
            gap:6px;
            flex-wrap:wrap;
          "
        >

          ${
            hasVideo
              ? `
                <button
                  class="manage-btn preview-video"
                  data-id="${video.id}"
                  style="
                    color:#00c897;
                    border-color:#00c897;
                  "
                >
                  <i class="fa-solid fa-play"></i>
                  Preview
                </button>
              `
              : ""
          }

          <button
            class="manage-btn edit-video"
            data-id="${video.id}"
          >
            <i class="fa-solid fa-pen"></i>
            Edit
          </button>

          <button
            class="manage-btn toggle-video-premium"
            data-id="${video.id}"
          >
            <i class="fa-solid fa-lock"></i>
            ${
              video.premiumOnly
                ? "Make Free"
                : "Make Premium"
            }
          </button>

          <button
            class="manage-btn delete-video"
            data-id="${video.id}"
          >
            <i class="fa-solid fa-trash"></i>
            Delete
          </button>

        </div>

      </td>
    `;

    videoListBody.appendChild(tr);
  });

  document
    .querySelectorAll(".preview-video")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const video =
            videos.find(
              v =>
                v.id ===
                button.dataset.id
            );

          if (video) {
            previewVideo(video);
          }

        }
      );
    });

  document
    .querySelectorAll(".edit-video")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          editVideo(
            button.dataset.id
          )
      );

    });

  document
    .querySelectorAll(".toggle-video-premium")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          toggleVideoPremium(
            button.dataset.id
          )
      );

    });

  document
    .querySelectorAll(".delete-video")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          deleteVideo(
            button.dataset.id
          )
      );

    });
}

// ============================================================
// CREATE PREVIEW MODAL
// ============================================================

function createPreviewModal() {

  let modal =
    document.getElementById(
      "gtradesAdminVideoPreview"
    );

  if (modal) {
    return modal;
  }

  modal =
    document.createElement("div");

  modal.id =
    "gtradesAdminVideoPreview";

  modal.style.cssText = `
    position:fixed;
    inset:0;
    z-index:999999;
    background:rgba(0,0,0,.88);
    display:none;
    align-items:center;
    justify-content:center;
    padding:20px;
  `;

  modal.innerHTML = `

    <div
      style="
        width:min(1000px,95vw);
        background:#080d16;
        border:1px solid #1d9bf0;
        border-radius:14px;
        padding:18px;
        position:relative;
      "
    >

      <button
        id="closeGtradesAdminPreview"
        style="
          position:absolute;
          top:10px;
          right:10px;
          z-index:5;
          width:38px;
          height:38px;
          border:0;
          border-radius:50%;
          background:#ff4766;
          color:white;
          cursor:pointer;
          font-size:18px;
        "
      >
        ×
      </button>

      <video
        id="gtradesAdminPreviewPlayer"
        controls
        playsinline
        preload="metadata"
        style="
          width:100%;
          max-height:80vh;
          background:#000;
          border-radius:8px;
        "
      ></video>

    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById(
      "closeGtradesAdminPreview"
    )
    .addEventListener(
      "click",
      closePreview
    );

  modal.addEventListener(
    "click",
    event => {

      if (event.target === modal) {
        closePreview();
      }

    }
  );

  return modal;
}

// ============================================================
// ADMIN VIDEO PREVIEW
// ============================================================

async function previewVideo(video) {

  const videoKey =
    video.videoKey ||
    video.fileKey ||
    video.r2Key ||
    video.storageKey ||
    "";

  if (!videoKey) {

    alert(
      "This video has no R2 file attached."
    );

    return;
  }

  if (!auth.currentUser) {

    alert(
      "Admin session expired. Login again."
    );

    return;
  }

  try {

    const token =
      await auth.currentUser.getIdToken(true);

    const modal =
      createPreviewModal();

    const player =
      document.getElementById(
        "gtradesAdminPreviewPlayer"
      );

    modal.style.display =
      "flex";

    player.pause();

    player.removeAttribute("src");

    player.load();

    if (previewBlobUrl) {

      URL.revokeObjectURL(
        previewBlobUrl
      );

      previewBlobUrl = null;
    }

    player.poster =
      video.thumbnail || "";

    const response =
      await fetch(
        `${R2_WORKER_URL}/?key=${encodeURIComponent(
          videoKey
        )}&action=file`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`
          },

          cache: "no-store"
        }
      );

    if (!response.ok) {

      const error =
        await response
          .json()
          .catch(() => ({}));

      throw new Error(
        error.error ||
        `Video request failed (${response.status})`
      );
    }

    const blob =
      await response.blob();

    previewBlobUrl =
      URL.createObjectURL(blob);

    player.src =
      previewBlobUrl;

    player.load();

    await player.play().catch(() => {});

  } catch (error) {

    console.error(
      "ADMIN VIDEO PREVIEW ERROR:",
      error
    );

    closePreview();

    alert(
      "Error playing video: " +
      error.message
    );
  }
}

// ============================================================
// CLOSE PREVIEW
// ============================================================

function closePreview() {

  const modal =
    document.getElementById(
      "gtradesAdminVideoPreview"
    );

  const player =
    document.getElementById(
      "gtradesAdminPreviewPlayer"
    );

  if (player) {

    player.pause();

    player.removeAttribute("src");

    player.load();
  }

  if (previewBlobUrl) {

    URL.revokeObjectURL(
      previewBlobUrl
    );

    previewBlobUrl = null;
  }

  if (modal) {
    modal.style.display = "none";
  }
}

document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {
      closePreview();
    }

  }
);

// ============================================================
// EDIT
// ============================================================

function editVideo(id) {

  const video =
    videos.find(
      v => v.id === id
    );

  if (!video) return;

  editingId = id;

  if (editingIdInput) {
    editingIdInput.value = id;
  }

  document.getElementById(
    "videoTitle"
  ).value =
    video.title || "";

  document.getElementById(
    "videoCategory"
  ).value =
    video.category ||
    "Market Structure";

  document.getElementById(
    "videoDuration"
  ).value =
    video.duration || "";

  const youtubeInput =
    document.getElementById(
      "videoYoutubeId"
    );

  if (youtubeInput) {
    youtubeInput.value =
      video.youtubeId || "";
  }

  const premiumInput =
    document.getElementById(
      "videoPremiumOnly"
    );

  if (premiumInput) {
    premiumInput.checked =
      video.premiumOnly === true;
  }

  const descriptionInput =
    document.getElementById(
      "videoDescription"
    );

  if (descriptionInput) {
    descriptionInput.value =
      video.description || "";
  }

  if (existingThumbnailUrl) {
    existingThumbnailUrl.value =
      video.thumbnail || "";
  }

  if (existingVideoKey) {
    existingVideoKey.value =
      video.videoKey ||
      video.fileKey ||
      "";
  }

  const thumbnailURL =
    video.thumbnailKey
      ? `${R2_WORKER_URL}/?key=${encodeURIComponent(
          video.thumbnailKey
        )}&action=file`
      : video.thumbnail || "";

  if (
    thumbnailURL &&
    thumbnailPreview &&
    thumbnailPreviewImg
  ) {

    thumbnailPreviewImg.src =
      thumbnailURL;

    thumbnailPreview.style.display =
      "block";

  } else if (thumbnailPreview) {

    thumbnailPreview.style.display =
      "none";
  }

  if (formTitle) {
    formTitle.textContent =
      "Edit Video";
  }

  const saveButton =
    document.getElementById(
      "saveVideoBtn"
    );

  if (saveButton) {
    saveButton.textContent =
      "Update Video";
  }

  if (formContainer) {
    formContainer.style.display =
      "block";
  }

  window.scrollTo({
    top:
      formContainer?.offsetTop || 0,
    behavior: "smooth"
  });
}

// ============================================================
// PREMIUM
// ============================================================

async function toggleVideoPremium(id) {

  const video =
    videos.find(
      v => v.id === id
    );

  if (!video) return;

  const newStatus =
    !video.premiumOnly;

  if (
    !confirm(
      `Mark "${video.title}" as ${
        newStatus
          ? "Premium"
          : "Free"
      }?`
    )
  ) {
    return;
  }

  try {

    await updateDoc(
      doc(db, "videos", id),
      {
        premiumOnly:
          newStatus,

        updatedAt:
          serverTimestamp()
      }
    );

    await loadVideos();

  } catch (error) {

    console.error(
      error
    );

    alert(
      error.message
    );
  }
}

// ============================================================
// DELETE
// ============================================================

async function deleteVideo(id) {

  const video =
    videos.find(
      v => v.id === id
    );

  if (!video) return;

  if (
    !confirm(
      `Delete "${video.title}" permanently?`
    )
  ) {
    return;
  }

  try {

    await deleteDoc(
      doc(
        db,
        "videos",
        id
      )
    );

    await loadVideos();

  } catch (error) {

    console.error(
      error
    );

    alert(
      error.message
    );
  }
}

// ============================================================
// RESET
// ============================================================

function resetForm() {

  videoForm?.reset();

  editingId =
    null;

  if (editingIdInput) {
    editingIdInput.value = "";
  }

  if (existingThumbnailUrl) {
    existingThumbnailUrl.value = "";
  }

  if (existingVideoKey) {
    existingVideoKey.value = "";
  }

  if (thumbnailPreview) {
    thumbnailPreview.style.display =
      "none";
  }
}

// ============================================================
// TOGGLE
// ============================================================

toggleFormBtn?.addEventListener(
  "click",
  () => {

    const hidden =
      formContainer.style.display ===
      "none";

    if (hidden) {

      resetForm();

      formContainer.style.display =
        "block";

      if (formTitle) {
        formTitle.textContent =
          "Add New Video";
      }

      toggleFormBtn.innerHTML =
        '<i class="fa-solid fa-xmark"></i> Cancel';

    } else {

      formContainer.style.display =
        "none";

      toggleFormBtn.innerHTML =
        '<i class="fa-solid fa-plus"></i> Add Video';
    }

  }
);

// ============================================================
// CANCEL
// ============================================================

cancelBtn?.addEventListener(
  "click",
  () => {

    resetForm();

    formContainer.style.display =
      "none";

    toggleFormBtn.innerHTML =
      '<i class="fa-solid fa-plus"></i> Add Video';
  }
);

// ============================================================
// SAVE VIDEO
// ============================================================

videoForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const title =
      document
        .getElementById("videoTitle")
        .value
        .trim();

    const category =
      document
        .getElementById("videoCategory")
        .value;

    const duration =
      document
        .getElementById("videoDuration")
        .value
        .trim();

    const youtubeId =
      document
        .getElementById(
          "videoYoutubeId"
        )
        ?.value
        .trim() || "";

    const premiumOnly =
      document
        .getElementById(
          "videoPremiumOnly"
        )
        ?.checked || false;

    const description =
      document
        .getElementById(
          "videoDescription"
        )
        ?.value
        .trim() || "";

    const editing =
      editingIdInput?.value ||
      "";

    const thumbnailFile =
      thumbnailFileInput
        ?.files?.[0] ||
      null;

    const videoFile =
      videoFileInput
        ?.files?.[0] ||
      null;

    if (
      !title ||
      !category ||
      !duration
    ) {

      alert(
        "Please fill in title, category and duration."
      );

      return;
    }

    if (
      !editing &&
      !videoFile &&
      !youtubeId
    ) {

      alert(
        "Please select a video file or enter a YouTube ID."
      );

      return;
    }

    const existing =
      editing
        ? videos.find(
            v => v.id === editing
          )
        : null;

    let videoKey =
      existing?.videoKey ||
      existing?.fileKey ||
      existing?.r2Key ||
      existing?.storageKey ||
      "";

    let thumbnailKey =
      existing?.thumbnailKey ||
      "";

    let thumbnail =
      existing?.thumbnail ||
      "";

    const saveButton =
      document.getElementById(
        "saveVideoBtn"
      );

    const originalText =
      saveButton?.textContent ||
      "Save Video";

    try {

      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent =
          "Uploading...";
      }

      if (videoFile) {

        const uploadedVideo =
          await uploadToR2(
            videoFile,
            "videos"
          );

        videoKey =
          uploadedVideo.key;
      }

      if (thumbnailFile) {

        const uploadedThumbnail =
          await uploadToR2(
            thumbnailFile,
            "thumbnails"
          );

        thumbnailKey =
          uploadedThumbnail.key;

        thumbnail =
          `${R2_WORKER_URL}/?key=${encodeURIComponent(
            thumbnailKey
          )}&action=file`;
      }

      const data = {

        title,

        category,

        duration,

        description,

        premiumOnly,

        videoKey,

        thumbnailKey,

        thumbnail,

        updatedAt:
          serverTimestamp()
      };

      if (youtubeId) {
        data.youtubeId =
          youtubeId;
      }

      if (editing) {

        await updateDoc(
          doc(
            db,
            "videos",
            editing
          ),
          data
        );

        alert(
          "Video updated successfully."
        );

      } else {

        data.createdAt =
          serverTimestamp();

        await addDoc(
          collection(db, "videos"),
          data
        );

        alert(
          "Video uploaded successfully."
        );
      }

      await loadVideos();

      resetForm();

      formContainer.style.display =
        "none";

      toggleFormBtn.innerHTML =
        '<i class="fa-solid fa-plus"></i> Add Video';

    } catch (error) {

      console.error(
        "SAVE VIDEO ERROR:",
        error
      );

      alert(
        "Error saving video:\n\n" +
        error.message
      );

    } finally {

      if (saveButton) {

        saveButton.disabled =
          false;

        saveButton.textContent =
          originalText;
      }
    }
  }
);

// ============================================================
// INIT
// ============================================================

loadVideos();

console.log(
  "GTRADES-AXIS Admin Video Manager loaded."
);

console.log(
  "R2 Worker:",
  R2_WORKER_URL
);