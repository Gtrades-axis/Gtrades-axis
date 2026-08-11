// ============================================================
// GTRADES-AXIS™
// ADMIN VIDEO MANAGER
// js/admin-videos.js
//
// R2:
// https://r2-uploader.davidthuku574.workers.dev
//
// IMPORTANT:
// - Do NOT change videos.js
// - Do NOT change worker.js
// - R2 object keys are stored exactly as returned by the Worker
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

  console.log(
    "GTRADES Admin Auth:",
    user
      ? user.email
      : "NOT LOGGED IN"
  );
});

// ============================================================
// HELPERS
// ============================================================

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getR2FileURL(key) {
  if (!key) return "";

  return (
    `${R2_WORKER_URL}/?key=` +
    `${encodeURIComponent(key)}` +
    `&action=file`
  );
}

function getVideoKey(video) {
  return (
    video?.videoKey ||
    video?.fileKey ||
    video?.r2Key ||
    video?.storageKey ||
    ""
  );
}

function getThumbnailKey(video) {
  return video?.thumbnailKey || "";
}

// ============================================================
// R2 UPLOAD
// ============================================================

async function uploadToR2(file, folder) {

  if (!file) {
    throw new Error(
      "No file selected."
    );
  }

  if (!currentUser) {
    throw new Error(
      "Admin session is not ready. Please wait a moment and try again."
    );
  }

  // Clean filename
  const safeName =
    file.name
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

  // IMPORTANT:
  // The key stored in R2 and Firestore is ONLY:
  //
  // videos/UID/timestamp_filename.mp4
  //
  // NOT:
  // gtrades-assets/videos/...
  //
  const key =
    `${folder}/` +
    `${currentUser.uid}/` +
    `${Date.now()}_` +
    `${safeName}`;

  console.log(
    "R2 UPLOAD START:",
    {
      file: file.name,
      size: file.size,
      type: file.type,
      key
    }
  );

  const token =
    await currentUser.getIdToken(true);

  const uploadURL =
    `${R2_WORKER_URL}/upload` +
    `?key=${encodeURIComponent(key)}` +
    `&contentType=${encodeURIComponent(
      file.type ||
      "application/octet-stream"
    )}`;

  let response;

  try {

    response =
      await fetch(
        uploadURL,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              file.type ||
              "application/octet-stream",

            "Authorization":
              `Bearer ${token}`
          },

          body: file
        }
      );

  } catch (error) {

    throw new Error(
      "Could not connect to the R2 Worker: " +
      error.message
    );
  }

  const responseText =
    await response.text();

  console.log(
    "R2 UPLOAD RESPONSE:",
    response.status,
    responseText
  );

  let result = {};

  try {

    result =
      responseText
        ? JSON.parse(responseText)
        : {};

  } catch {

    throw new Error(
      "R2 Worker returned an invalid response:\n\n" +
      responseText
    );
  }

  if (
    !response.ok ||
    result.success !== true
  ) {

    throw new Error(
      result.error ||
      `R2 upload failed (${response.status}).`
    );
  }

  // The Worker returns the authoritative key.
  const uploadedKey =
    result.key || key;

  console.log(
    "R2 UPLOAD SUCCESS:",
    uploadedKey
  );

  // ========================================================
  // VERIFY FILE REALLY EXISTS
  // ========================================================

  const verifyURL =
    getR2FileURL(
      uploadedKey
    );

  let verifyResponse;

  try {

    verifyResponse =
      await fetch(
        verifyURL,
        {
          method: "HEAD",
          cache: "no-store"
        }
      );

  } catch (error) {

    throw new Error(
      "Upload completed, but the file could not be verified through the R2 Worker:\n\n" +
      error.message
    );
  }

  if (!verifyResponse.ok) {

    throw new Error(
      "R2 upload returned success, but verification failed.\n\n" +
      `HTTP ${verifyResponse.status}\n` +
      `Key: ${uploadedKey}`
    );
  }

  console.log(
    "R2 FILE VERIFIED:",
    uploadedKey
  );

  return {
    key: uploadedKey,

    contentType:
      result.contentType ||
      file.type ||
      "application/octet-stream",

    url:
      verifyURL
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

      if (thumbnailPreview) {
        thumbnailPreview.style.display =
          "none";
      }

      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {

      alert(
        "Please select a valid image file."
      );

      thumbnailFileInput.value = "";

      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      event => {

        if (thumbnailPreviewImg) {

          thumbnailPreviewImg.src =
            event.target.result;
        }

        if (thumbnailPreview) {

          thumbnailPreview.style.display =
            "block";
        }
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

    if (
      !file.type.startsWith("video/")
    ) {

      alert(
        "Please select a valid video file."
      );

      videoFileInput.value = "";

      return;
    }

    const maxSize =
      500 * 1024 * 1024;

    if (
      file.size > maxSize
    ) {

      alert(
        "Video is too large.\n\nMaximum allowed size is 500 MB."
      );

      videoFileInput.value = "";

      return;
    }

    console.log(
      "VIDEO SELECTED:",
      {
        name: file.name,
        size: file.size,
        type: file.type
      }
    );
  }
);

// ============================================================
// LOAD VIDEOS
// ============================================================

async function loadVideos() {

  if (!videoListBody) {
    return;
  }

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
        collection(
          db,
          "videos"
        )
      );

    videos = [];

    snapshot.forEach(
      videoDoc => {

        videos.push({
          id: videoDoc.id,
          ...videoDoc.data()
        });

      }
    );

    videos.sort(
      (a, b) => {

        const aTime =
          a.createdAt?.seconds ||
          0;

        const bTime =
          b.createdAt?.seconds ||
          0;

        return (
          bTime - aTime
        );
      }
    );

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

  if (!videoListBody) {
    return;
  }

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

  videos.forEach(
    video => {

      const tr =
        document.createElement(
          "tr"
        );

      const videoKey =
        getVideoKey(video);

      const hasVideo =
        Boolean(videoKey);

      const thumbnailKey =
        getThumbnailKey(video);

      const thumbnail =
        thumbnailKey
          ? getR2FileURL(
              thumbnailKey
            )
          : (
              video.thumbnail ||
              ""
            );

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
              alt="Thumbnail"
            >
          `
          : `
            <span
              style="
                font-size:1.5rem;
              "
            >
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
              video.title ||
              "Untitled"
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
            video.category ||
            "General"
          )}
        </td>

        <td>
          ${escapeHTML(
            video.duration ||
            "—"
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
                    data-id="${escapeHTML(video.id)}"
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
              data-id="${escapeHTML(video.id)}"
            >
              <i class="fa-solid fa-pen"></i>
              Edit
            </button>

            <button
              class="manage-btn toggle-video-premium"
              data-id="${escapeHTML(video.id)}"
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
              data-id="${escapeHTML(video.id)}"
            >
              <i class="fa-solid fa-trash"></i>
              Delete
            </button>

          </div>

        </td>
      `;

      videoListBody.appendChild(
        tr
      );
    }
  );

  // ========================================================
  // PREVIEW BUTTONS
  // ========================================================

  document
    .querySelectorAll(
      ".preview-video"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const video =
              videos.find(
                item =>
                  item.id ===
                  button.dataset.id
              );

            if (video) {
              previewVideo(
                video
              );
            }
          }
        );
      }
    );

  // ========================================================
  // EDIT
  // ========================================================

  document
    .querySelectorAll(
      ".edit-video"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            editVideo(
              button.dataset.id
            );
          }
        );
      }
    );

  // ========================================================
  // PREMIUM
  // ========================================================

  document
    .querySelectorAll(
      ".toggle-video-premium"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            toggleVideoPremium(
              button.dataset.id
            );
          }
        );
      }
    );

  // ========================================================
  // DELETE
  // ========================================================

  document
    .querySelectorAll(
      ".delete-video"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            deleteVideo(
              button.dataset.id
            );
          }
        );
      }
    );
}

// ============================================================
// PREVIEW MODAL
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
    document.createElement(
      "div"
    );

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
        type="button"
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

      <div
        id="gtradesAdminPreviewStatus"
        style="
          color:#94a3b8;
          margin-bottom:10px;
          padding-right:50px;
        "
      >
        Loading video...
      </div>

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
          display:block;
        "
      ></video>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  document
    .getElementById(
      "closeGtradesAdminPreview"
    )
    ?.addEventListener(
      "click",
      closePreview
    );

  modal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        modal
      ) {

        closePreview();
      }
    }
  );

  return modal;
}

// ============================================================
// ADMIN PREVIEW
// ============================================================

async function previewVideo(video) {

  const videoKey =
    getVideoKey(video);

  console.log(
    "ADMIN PREVIEW:",
    {
      title: video.title,
      key: videoKey
    }
  );

  if (!videoKey) {

    alert(
      "This video has no R2 file attached."
    );

    return;
  }

  if (!auth.currentUser) {

    alert(
      "Admin session expired. Please login again."
    );

    return;
  }

  const modal =
    createPreviewModal();

  const player =
    document.getElementById(
      "gtradesAdminPreviewPlayer"
    );

  const status =
    document.getElementById(
      "gtradesAdminPreviewStatus"
    );

  try {

    modal.style.display =
      "flex";

    if (status) {

      status.textContent =
        "Checking video...";
    }

    // ======================================================
    // CLEAR OLD PLAYER
    // ======================================================

    player.pause();

    player.removeAttribute(
      "src"
    );

    player.load();

    if (previewBlobUrl) {

      URL.revokeObjectURL(
        previewBlobUrl
      );

      previewBlobUrl =
        null;
    }

    // ======================================================
    // GET FRESH AUTH TOKEN
    // ======================================================

    const token =
      await auth.currentUser
        .getIdToken(true);

    // ======================================================
    // REQUEST VIDEO
    // ======================================================

    const fileURL =
      getR2FileURL(
        videoKey
      );

    console.log(
      "ADMIN VIDEO REQUEST:",
      fileURL
    );

    if (status) {

      status.textContent =
        "Loading video from Cloudflare R2...";
    }

    const response =
      await fetch(
        fileURL,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`
          },

          cache:
            "no-store"
        }
      );

    console.log(
      "ADMIN VIDEO RESPONSE:",
      response.status,
      response.headers.get(
        "content-type"
      )
    );

    if (!response.ok) {

      let errorData = {};

      try {

        errorData =
          await response.json();

      } catch {

        errorData = {};
      }

      throw new Error(
        errorData.error ||
        `Video request failed (${response.status}).`
      );
    }

    // ======================================================
    // CHECK CONTENT TYPE
    // ======================================================

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      !contentType.includes(
        "video/"
      )
    ) {

      console.warn(
        "Unexpected content type:",
        contentType
      );
    }

    // ======================================================
    // CONVERT TO BLOB
    // ======================================================

    const blob =
      await response.blob();

    if (!blob.size) {

      throw new Error(
        "Cloudflare returned an empty video file."
      );
    }

    console.log(
      "ADMIN VIDEO BLOB:",
      {
        size: blob.size,
        type: blob.type
      }
    );

    previewBlobUrl =
      URL.createObjectURL(
        blob
      );

    player.src =
      previewBlobUrl;

    player.load();

    if (status) {

      status.textContent =
        video.title ||
        "GTRADES-AXIS Video";
    }

    await player
      .play()
      .catch(
        () => {}
      );

  } catch (error) {

    console.error(
      "ADMIN VIDEO PREVIEW ERROR:",
      error
    );

    closePreview();

    alert(
      "Unable to preview video.\n\n" +
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

    player.removeAttribute(
      "src"
    );

    player.load();
  }

  if (previewBlobUrl) {

    URL.revokeObjectURL(
      previewBlobUrl
    );

    previewBlobUrl =
      null;
  }

  if (modal) {

    modal.style.display =
      "none";
  }

  document.body.style.overflow =
    "";
}

// ============================================================
// ESCAPE PREVIEW
// ============================================================

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

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
      item =>
        item.id === id
    );

  if (!video) {
    return;
  }

  editingId =
    id;

  if (editingIdInput) {

    editingIdInput.value =
      id;
  }

  const titleInput =
    document.getElementById(
      "videoTitle"
    );

  const categoryInput =
    document.getElementById(
      "videoCategory"
    );

  const durationInput =
    document.getElementById(
      "videoDuration"
    );

  const youtubeInput =
    document.getElementById(
      "videoYoutubeId"
    );

  const premiumInput =
    document.getElementById(
      "videoPremiumOnly"
    );

  const descriptionInput =
    document.getElementById(
      "videoDescription"
    );

  if (titleInput) {

    titleInput.value =
      video.title || "";
  }

  if (categoryInput) {

    categoryInput.value =
      video.category ||
      "Market Structure";
  }

  if (durationInput) {

    durationInput.value =
      video.duration || "";
  }

  if (youtubeInput) {

    youtubeInput.value =
      video.youtubeId || "";
  }

  if (premiumInput) {

    premiumInput.checked =
      video.premiumOnly === true;
  }

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
      getVideoKey(video);
  }

  const thumbnailURL =
    video.thumbnailKey
      ? getR2FileURL(
          video.thumbnailKey
        )
      : (
          video.thumbnail ||
          ""
        );

  if (
    thumbnailURL &&
    thumbnailPreview &&
    thumbnailPreviewImg
  ) {

    thumbnailPreviewImg.src =
      thumbnailURL;

    thumbnailPreview.style.display =
      "block";

  } else if (
    thumbnailPreview
  ) {

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
      formContainer?.offsetTop ||
      0,
    behavior:
      "smooth"
  });
}

// ============================================================
// PREMIUM
// ============================================================

async function toggleVideoPremium(id) {

  const video =
    videos.find(
      item =>
        item.id === id
    );

  if (!video) {
    return;
  }

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

  } catch (error) {

    console.error(
      "TOGGLE PREMIUM ERROR:",
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
      item =>
        item.id === id
    );

  if (!video) {
    return;
  }

  if (
    !confirm(
      `Delete "${video.title}" permanently?\n\nThis removes the Firestore video record.`
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
      "DELETE VIDEO ERROR:",
      error
    );

    alert(
      error.message
    );
  }
}

// ============================================================
// RESET FORM
// ============================================================

function resetForm() {

  videoForm?.reset();

  editingId =
    null;

  if (editingIdInput) {

    editingIdInput.value =
      "";
  }

  if (existingThumbnailUrl) {

    existingThumbnailUrl.value =
      "";
  }

  if (existingVideoKey) {

    existingVideoKey.value =
      "";
  }

  if (thumbnailPreview) {

    thumbnailPreview.style.display =
      "none";
  }

  if (thumbnailPreviewImg) {

    thumbnailPreviewImg.removeAttribute(
      "src"
    );
  }

  if (formTitle) {

    formTitle.textContent =
      "Add New Video";
  }

  const saveButton =
    document.getElementById(
      "saveVideoBtn"
    );

  if (saveButton) {

    saveButton.textContent =
      "Upload Video";
  }
}

// ============================================================
// TOGGLE FORM
// ============================================================

toggleFormBtn?.addEventListener(
  "click",
  () => {

    if (!formContainer) {
      return;
    }

    const hidden =
      formContainer.style.display ===
      "none";

    if (hidden) {

      resetForm();

      formContainer.style.display =
        "block";

      if (toggleFormBtn) {

        toggleFormBtn.innerHTML =
          '<i class="fa-solid fa-xmark"></i> Cancel';
      }

    } else {

      formContainer.style.display =
        "none";

      if (toggleFormBtn) {

        toggleFormBtn.innerHTML =
          '<i class="fa-solid fa-plus"></i> Add Video';
      }
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

    if (formContainer) {

      formContainer.style.display =
        "none";
    }

    if (toggleFormBtn) {

      toggleFormBtn.innerHTML =
        '<i class="fa-solid fa-plus"></i> Add Video';
    }
  }
);

// ============================================================
// SAVE VIDEO
// ============================================================

videoForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    // ========================================================
    // READ FORM
    // ========================================================

    const title =
      document
        .getElementById(
          "videoTitle"
        )
        ?.value
        .trim() || "";

    const category =
      document
        .getElementById(
          "videoCategory"
        )
        ?.value || "";

    const duration =
      document
        .getElementById(
          "videoDuration"
        )
        ?.value
        .trim() || "";

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
      editingId ||
      "";

    const thumbnailFile =
      thumbnailFileInput
        ?.files?.[0] ||
      null;

    const videoFile =
      videoFileInput
        ?.files?.[0] ||
      null;

    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !title ||
      !category
    ) {

      alert(
        "Please enter the video title and category."
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

    if (
      videoFile &&
      !videoFile.type.startsWith(
        "video/"
      )
    ) {

      alert(
        "The selected file is not a valid video."
      );

      return;
    }

    if (
      videoFile &&
      videoFile.size >
      500 * 1024 * 1024
    ) {

      alert(
        "Video is larger than 500 MB."
      );

      return;
    }

    // ========================================================
    // EXISTING RECORD
    // ========================================================

    const existing =
      editing
        ? videos.find(
            video =>
              video.id ===
              editing
          )
        : null;

    let videoKey =
      existing
        ? getVideoKey(
            existing
          )
        : "";

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
      "Upload Video";

    try {

      if (saveButton) {

        saveButton.disabled =
          true;

        saveButton.textContent =
          "Uploading...";
      }

      // ======================================================
      // VIDEO UPLOAD
      // ======================================================

      if (videoFile) {

        if (saveButton) {

          saveButton.textContent =
            "Uploading video...";
        }

        const uploadedVideo =
          await uploadToR2(
            videoFile,
            "videos"
          );

        videoKey =
          uploadedVideo.key;

        console.log(
          "VIDEO KEY TO SAVE:",
          videoKey
        );
      }

      // ======================================================
      // THUMBNAIL UPLOAD
      // ======================================================

      if (thumbnailFile) {

        if (saveButton) {

          saveButton.textContent =
            "Uploading thumbnail...";
        }

        const uploadedThumbnail =
          await uploadToR2(
            thumbnailFile,
            "thumbnails"
          );

        thumbnailKey =
          uploadedThumbnail.key;

        thumbnail =
          uploadedThumbnail.url;
      }

      // ======================================================
      // FINAL VALIDATION
      // ======================================================

      if (
        !videoKey &&
        !youtubeId
      ) {

        throw new Error(
          "No video file was attached."
        );
      }

      // ======================================================
      // FIRESTORE DATA
      // ======================================================

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

      } else if (editing) {

        // Remove old YouTube ID
        // if switching back to R2.
        data.youtubeId =
          "";
      }

      // ======================================================
      // UPDATE
      // ======================================================

      if (editing) {

        if (saveButton) {

          saveButton.textContent =
            "Saving...";
        }

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

      }

      // ======================================================
      // CREATE
      // ======================================================

      else {

        if (saveButton) {

          saveButton.textContent =
            "Saving...";
        }

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

      // ======================================================
      // REFRESH
      // ======================================================

      await loadVideos();

      resetForm();

      if (formContainer) {

        formContainer.style.display =
          "none";
      }

      if (toggleFormBtn) {

        toggleFormBtn.innerHTML =
          '<i class="fa-solid fa-plus"></i> Add Video';
      }

    } catch (error) {

      console.error(
        "SAVE VIDEO ERROR:",
        error
      );

      alert(
        "❌ Video upload failed.\n\n" +
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
  "================================================"
);

console.log(
  "GTRADES-AXIS™ ADMIN VIDEO MANAGER LOADED"
);

console.log(
  "R2 Worker:",
  R2_WORKER_URL
);

console.log(
  "================================================"
);