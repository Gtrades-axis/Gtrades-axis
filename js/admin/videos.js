// ============================================================
// GTRADES-AXIS™
// ADMIN VIDEO MANAGER
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


// ============================================================
// STATE
// ============================================================

let videos = [];
let editingId = null;
let currentUser = null;


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, user => {
  currentUser = user;
});


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// UPLOAD TO R2
// ============================================================

async function uploadToR2(file, folder) {

  if (!file) {
    throw new Error("No file selected.");
  }

  if (!currentUser) {
    throw new Error(
      "Admin session is not ready. Please wait and try again."
    );
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

  console.log("Uploading to R2:");
  console.log("Key:", key);

  const response =
    await fetch(uploadURL, {
      method: "PUT",

      headers: {
        "Content-Type":
          file.type ||
          "application/octet-stream",

        "Authorization":
          `Bearer ${token}`
      },

      body: file
    });

  const text =
    await response.text();

  let result = {};

  try {
    result =
      JSON.parse(text);
  } catch {
    throw new Error(
      "Invalid response from R2 Worker:\n" +
      text
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error ||
      "R2 upload failed."
    );
  }

  console.log(
    "R2 upload successful:",
    result
  );

  return {
    key: result.key,
    url:
      `${R2_WORKER_URL}/?key=` +
      encodeURIComponent(result.key) +
      "&action=file"
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
      thumbnailPreview.style.display =
        "none";
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

    reader.onload =
      event => {

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

    const allowed =
      [
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-matroska"
      ];

    if (
      !allowed.includes(file.type) &&
      !file.name.toLowerCase().endsWith(".mkv")
    ) {

      alert(
        "Please select MP4, WEBM, MOV or MKV."
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

    const videoKey =
      video.videoKey ||
      video.fileKey ||
      video.r2Key ||
      video.storageKey ||
      "";

    const hasVideo =
      Boolean(videoKey);

    const thumbnail =
      video.thumbnailKey
        ? `${R2_WORKER_URL}/?key=${encodeURIComponent(
            video.thumbnailKey
          )}&action=file`
        : video.thumbnail || "";

    tr.innerHTML = `

      <td>
        ${
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
            : "📹"
        }
      </td>

      <td>

        <strong>
          ${escapeHTML(
            video.title || "Untitled"
          )}
        </strong>

        <small
          style="
            display:block;
            color:${hasVideo ? "#00c897" : "#ff4766"};
            margin-top:4px;
          "
        >
          ${
            hasVideo
              ? "✓ Video attached"
              : "⚠ No video file"
          }
        </small>

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

        ${
          hasVideo
            ? `
              <button
                class="manage-btn preview-video"
                data-id="${video.id}"
              >
                ▶ Preview
              </button>
            `
            : ""
        }

        <button
          class="manage-btn edit-video"
          data-id="${video.id}"
        >
          ✎ Edit
        </button>

        <button
          class="manage-btn toggle-video-premium"
          data-id="${video.id}"
        >
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
          🗑 Delete
        </button>

      </td>
    `;

    videoListBody.appendChild(tr);
  });


  // Preview

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


  // Edit

  document
    .querySelectorAll(".edit-video")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          editVideo(
            button.dataset.id
          );
        }
      );

    });


  // Premium

  document
    .querySelectorAll(
      ".toggle-video-premium"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          toggleVideoPremium(
            button.dataset.id
          );
        }
      );

    });


  // Delete

  document
    .querySelectorAll(".delete-video")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          deleteVideo(
            button.dataset.id
          );
        }
      );

    });
}


// ============================================================
// PREVIEW
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

  const user =
    auth.currentUser;

  if (!user) {
    alert(
      "Admin session expired."
    );
    return;
  }

  try {

    const token =
      await user.getIdToken(true);

    const response =
      await fetch(
        `${R2_WORKER_URL}/?key=` +
        `${encodeURIComponent(videoKey)}` +
        `&action=file`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    if (!response.ok) {

      const data =
        await response
          .json()
          .catch(() => ({}));

      throw new Error(
        data.error ||
        `Video failed (${response.status})`
      );
    }

    const blob =
      await response.blob();

    const blobURL =
      URL.createObjectURL(blob);

    const player =
      document.createElement("video");

    player.controls = true;
    player.autoplay = true;
    player.playsInline = true;

    player.style.cssText =
      `
        position:fixed;
        inset:5%;
        width:90%;
        height:90%;
        object-fit:contain;
        background:#000;
        z-index:999999;
      `;

    player.src =
      blobURL;

    document.body.appendChild(
      player
    );

    player.addEventListener(
      "ended",
      () => {
        URL.revokeObjectURL(
          blobURL
        );
        player.remove();
      }
    );

  } catch (error) {

    console.error(
      "VIDEO PREVIEW ERROR:",
      error
    );

    alert(
      error.message
    );
  }
}


// ============================================================
// EDIT
// ============================================================

function editVideo(id) {

  const video =
    videos.find(
      v => v.id === id
    );

  if (!video) return;

  editingId =
    id;

  if (editingIdInput) {
    editingIdInput.value =
      id;
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

  const description =
    document.getElementById(
      "videoDescription"
    );

  if (description) {
    description.value =
      video.description || "";
  }

  const premium =
    document.getElementById(
      "videoPremiumOnly"
    );

  if (premium) {
    premium.checked =
      video.premiumOnly === true;
  }

  if (formTitle) {
    formTitle.textContent =
      "Edit Video";
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

  await updateDoc(
    doc(
      db,
      "videos",
      id
    ),
    {
      premiumOnly:
        newStatus,

      updatedAt:
        serverTimestamp()
    }
  );

  await loadVideos();
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

  await deleteDoc(
    doc(
      db,
      "videos",
      id
    )
  );

  await loadVideos();
}


// ============================================================
// RESET
// ============================================================

function resetForm() {

  videoForm?.reset();

  editingId =
    null;

  if (editingIdInput) {
    editingIdInput.value =
      "";
  }

  if (thumbnailPreview) {
    thumbnailPreview.style.display =
      "none";
  }
}


// ============================================================
// TOGGLE FORM
// ============================================================

toggleFormBtn?.addEventListener(
  "click",
  () => {

    const visible =
      formContainer.style.display !==
      "none";

    if (visible) {

      formContainer.style.display =
        "none";

      toggleFormBtn.innerHTML =
        "＋ Add Video";

    } else {

      resetForm();

      formContainer.style.display =
        "block";

      if (formTitle) {
        formTitle.textContent =
          "Add New Video";
      }

      toggleFormBtn.innerHTML =
        "✕ Cancel";
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
      "＋ Add Video";
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

    const videoFile =
      videoFileInput
        ?.files?.[0] ||
      null;

    const thumbnailFile =
      thumbnailFileInput
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
      !videoFile
    ) {

      alert(
        "Please select a video file."
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

    try {

      if (saveButton) {
        saveButton.disabled =
          true;

        saveButton.textContent =
          "Uploading...";
      }

      // ------------------------------------------------------
      // VIDEO
      // ------------------------------------------------------

      if (videoFile) {

        const uploaded =
          await uploadToR2(
            videoFile,
            "videos"
          );

        videoKey =
          uploaded.key;

        console.log(
          "VIDEO KEY SAVED:",
          videoKey
        );
      }

      // ------------------------------------------------------
      // THUMBNAIL
      // ------------------------------------------------------

      if (thumbnailFile) {

        const uploaded =
          await uploadToR2(
            thumbnailFile,
            "thumbnails"
          );

        thumbnailKey =
          uploaded.key;

        thumbnail =
          uploaded.url;
      }

      // ------------------------------------------------------
      // FIRESTORE
      // ------------------------------------------------------

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
          collection(
            db,
            "videos"
          ),
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
        "＋ Add Video";

    } catch (error) {

      console.error(
        "SAVE VIDEO ERROR:",
        error
      );

      alert(
        "Video upload failed:\n\n" +
        error.message
      );

    } finally {

      if (saveButton) {

        saveButton.disabled =
          false;

        saveButton.textContent =
          "Upload Video";
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