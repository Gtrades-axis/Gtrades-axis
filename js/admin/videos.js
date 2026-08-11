// ============================================================
// GTRADES-AXIS™
// ADMIN VIDEO MANAGER
// js/admin-videos.js
//
// FIXED:
// 1. R2 upload
// 2. R2 upload verification
// 3. Firestore key consistency
// 4. Admin video preview
// 5. Native video streaming / Range requests
// 6. Thumbnail upload
// 7. Edit
// 8. Delete
// 9. Premium / Free
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

// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, user => {
  currentUser = user;

  console.log(
    "GTRADES ADMIN AUTH:",
    user
      ? user.email
      : "No authenticated user"
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

// ============================================================
// R2 URL
// ============================================================

function getR2FileURL(key) {

  if (!key) {
    return "";
  }

  return (
    `${R2_WORKER_URL}/?key=` +
    `${encodeURIComponent(key)}` +
    `&action=file`
  );
}

// ============================================================
// R2 INFO URL
// ============================================================

function getR2InfoURL(key) {

  if (!key) {
    return "";
  }

  return (
    `${R2_WORKER_URL}/?key=` +
    `${encodeURIComponent(key)}` +
    `&action=info`
  );
}

// ============================================================
// SAFE FILE NAME
// ============================================================

function makeSafeFileName(fileName) {

  const original =
    String(fileName || "file");

  const extensionMatch =
    original.match(/\.[^/.]+$/);

  const extension =
    extensionMatch
      ? extensionMatch[0].toLowerCase()
      : "";

  const nameWithoutExtension =
    original.replace(/\.[^/.]+$/, "");

  const safeName =
    nameWithoutExtension
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 100);

  return (
    (safeName || "file") +
    extension
  );
}

// ============================================================
// GET CURRENT ADMIN TOKEN
// ============================================================

async function getAdminToken() {

  const user =
    auth.currentUser ||
    currentUser;

  if (!user) {
    throw new Error(
      "Admin session not ready. Please log in again."
    );
  }

  return await user.getIdToken(true);
}

// ============================================================
// UPLOAD TO R2
// ============================================================

async function uploadToR2(
  file,
  folder
) {

  if (!file) {
    throw new Error(
      "No file selected."
    );
  }

  const user =
    auth.currentUser ||
    currentUser;

  if (!user) {
    throw new Error(
      "Admin session not ready."
    );
  }

  const safeName =
    makeSafeFileName(file.name);

  const timestamp =
    Date.now();

  const key =
    `${folder}/${user.uid}/${timestamp}_${safeName}`;

  console.log(
    "R2 UPLOAD KEY:",
    key
  );

  const uploadURL =
    `${R2_WORKER_URL}/` +
    `?key=${encodeURIComponent(key)}` +
    `&action=upload`;

  const token =
    await getAdminToken();

  const contentType =
    file.type ||
    (
      folder === "videos"
        ? "video/mp4"
        : "application/octet-stream"
    );

  const response =
    await fetch(
      uploadURL,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            contentType,

          "Authorization":
            `Bearer ${token}`
        },

        body: file
      }
    );

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
      JSON.parse(
        responseText
      );

  } catch {

    throw new Error(
      "R2 Worker returned an invalid response:\n\n" +
      responseText
    );

  }

  if (!response.ok) {

    throw new Error(
      result.error ||
      `R2 upload failed (${response.status}).`
    );

  }

  if (
    result.success !== true
  ) {

    throw new Error(
      result.error ||
      "R2 Worker reported that the upload failed."
    );

  }

  /*
   * IMPORTANT:
   *
   * Always use the key returned by the Worker.
   * If Worker does not return one, use our
   * generated key.
   */

  const returnedKey =
    result.key || key;

  console.log(
    "R2 RETURNED KEY:",
    returnedKey
  );

  // ========================================================
  // VERIFY OBJECT
  // ========================================================

  const verified =
    await verifyR2Object(
      returnedKey
    );

  if (!verified) {

    throw new Error(
      "Upload completed but the file could not be verified in R2.\n\n" +
      `Key:\n${returnedKey}`
    );

  }

  console.log(
    "R2 VERIFIED:",
    returnedKey
  );

  return {
    key:
      returnedKey,

    contentType:
      result.contentType ||
      contentType,

    url:
      getR2FileURL(
        returnedKey
      )
  };
}

// ============================================================
// VERIFY R2 OBJECT
// ============================================================

async function verifyR2Object(key) {

  if (!key) {
    return false;
  }

  console.log(
    "VERIFYING R2 OBJECT:",
    key
  );

  try {

    const response =
      await fetch(
        getR2InfoURL(key),
        {
          method: "GET",
          cache: "no-store"
        }
      );

    const text =
      await response.text();

    console.log(
      "R2 VERIFY RESPONSE:",
      response.status,
      text
    );

    if (!response.ok) {
      return false;
    }

    let data = {};

    try {

      data =
        JSON.parse(text);

    } catch {

      return false;

    }

    return (
      data.success === true ||
      Boolean(
        data.key &&
        data.size != null
      )
    );

  } catch (error) {

    console.error(
      "R2 VERIFY ERROR:",
      error
    );

    return false;
  }
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
      !file.type.startsWith(
        "image/"
      )
    ) {

      alert(
        "Please select a valid image file."
      );

      thumbnailFileInput.value =
        "";

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

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "video/"
      )
    ) {

      alert(
        "Please select a valid video file."
      );

      videoFileInput.value =
        "";

      return;
    }

    /*
     * 500 MB maximum.
     */

    const maxSize =
      500 * 1024 * 1024;

    if (
      file.size >
      maxSize
    ) {

      alert(
        "Video is too large.\n\n" +
        "Maximum allowed size is 500 MB."
      );

      videoFileInput.value =
        "";

      return;
    }

    console.log(
      "VIDEO SELECTED:",
      file.name,
      file.size,
      file.type
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
          id:
            videoDoc.id,

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
          bTime -
          aTime
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
          <br>
          <small>
            ${escapeHTML(
              error.message
            )}
          </small>
        </td>
      </tr>
    `;
  }
}

// ============================================================
// GET VIDEO KEY
// ============================================================

function getVideoKey(video) {

  return (
    video?.videoKey ||
    video?.fileKey ||
    video?.r2Key ||
    video?.storageKey ||
    ""
  );
}

// ============================================================
// RENDER
// ============================================================

function renderVideos() {

  if (!videoListBody) {
    return;
  }

  videoListBody.innerHTML =
    "";

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
        getVideoKey(
          video
        );

      const hasVideo =
        Boolean(
          videoKey ||
          video.youtubeId
        );

      const thumbnail =
        video.thumbnailKey
          ? getR2FileURL(
              video.thumbnailKey
            )
          : (
              video.thumbnail ||
              ""
            );

      const thumbHTML =
        thumbnail
          ? `
            <img
              src="${escapeHTML(
                thumbnail
              )}"
              style="
                width:70px;
                height:40px;
                object-fit:cover;
                border-radius:6px;
              "
              onerror="
                this.style.display='none';
              "
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
            videoKey
              ? `
                <small
                  style="
                    display:block;
                    color:#00c897;
                    margin-top:4px;
                  "
                >
                  ✓ R2 file attached
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
                    type="button"
                    class="manage-btn preview-video"
                    data-id="${escapeHTML(
                      video.id
                    )}"
                    style="
                      color:#00c897;
                      border-color:#00c897;
                    "
                  >
                    <i
                      class="fa-solid fa-play"
                    ></i>
                    Preview
                  </button>
                `
                : ""
            }

            <button
              type="button"
              class="manage-btn edit-video"
              data-id="${escapeHTML(
                video.id
              )}"
            >
              <i
                class="fa-solid fa-pen"
              ></i>
              Edit
            </button>

            <button
              type="button"
              class="manage-btn toggle-video-premium"
              data-id="${escapeHTML(
                video.id
              )}"
            >
              <i
                class="fa-solid fa-lock"
              ></i>

              ${
                video.premiumOnly
                  ? "Make Free"
                  : "Make Premium"
              }

            </button>

            <button
              type="button"
              class="manage-btn delete-video"
              data-id="${escapeHTML(
                video.id
              )}"
            >
              <i
                class="fa-solid fa-trash"
              ></i>
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
                v =>
                  v.id ===
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
  // EDIT BUTTONS
  // ========================================================

  document
    .querySelectorAll(
      ".edit-video"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            editVideo(
              button.dataset.id
            )
        );

      }
    );

  // ========================================================
  // PREMIUM BUTTONS
  // ========================================================

  document
    .querySelectorAll(
      ".toggle-video-premium"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            toggleVideoPremium(
              button.dataset.id
            )
        );

      }
    );

  // ========================================================
  // DELETE BUTTONS
  // ========================================================

  document
    .querySelectorAll(
      ".delete-video"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            deleteVideo(
              button.dataset.id
            )
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
    background:rgba(0,0,0,.90);
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
        box-shadow:0 20px 80px rgba(0,0,0,.6);
      "
    >

      <button
        type="button"
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
          font-size:22px;
        "
      >
        ×
      </button>

      <div
        id="gtradesAdminPreviewTitle"
        style="
          color:white;
          font-size:18px;
          font-weight:700;
          margin-bottom:12px;
          padding-right:50px;
        "
      >
        Video Preview
      </div>

      <video
        id="gtradesAdminPreviewPlayer"
        controls
        playsinline
        preload="metadata"
        crossorigin="anonymous"
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
// ADMIN VIDEO PREVIEW
// ============================================================

async function previewVideo(
  video
) {

  const videoKey =
    getVideoKey(
      video
    );

  if (!videoKey) {

    alert(
      "This video has no R2 file attached."
    );

    return;
  }

  console.log(
    "ADMIN PREVIEW KEY:",
    videoKey
  );

  try {

    /*
     * Verify first.
     *
     * This gives a clean error if the
     * Firestore key doesn't exist.
     */

    const exists =
      await verifyR2Object(
        videoKey
      );

    if (!exists) {

      throw new Error(
        "File not found in R2.\n\n" +
        `Key:\n${videoKey}`
      );

    }

    const modal =
      createPreviewModal();

    const player =
      document.getElementById(
        "gtradesAdminPreviewPlayer"
      );

    const title =
      document.getElementById(
        "gtradesAdminPreviewTitle"
      );

    if (!player) {

      throw new Error(
        "Admin video player was not found."
      );

    }

    modal.style.display =
      "flex";

    document.body.style.overflow =
      "hidden";

    if (title) {

      title.textContent =
        video.title ||
        "GTRADES-AXIS Video";

    }

    // ======================================================
    // STOP PREVIOUS VIDEO
    // ======================================================

    player.pause();

    player.removeAttribute(
      "src"
    );

    player.load();

    // ======================================================
    // DIRECT R2 WORKER URL
    //
    // IMPORTANT:
    // We no longer download the entire video
    // into a Blob.
    //
    // The browser can now use Range requests.
    // ======================================================

    const videoURL =
      getR2FileURL(
        videoKey
      );

    console.log(
      "ADMIN VIDEO URL:",
      videoURL
    );

    player.src =
      videoURL;

    player.load();

    player.onerror =
      () => {

        console.error(
          "HTML VIDEO ERROR:",
          player.error
        );

      };

    try {

      await player.play();

    } catch {

      console.log(
        "Autoplay blocked. Press Play."
      );

    }

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
// EDIT VIDEO
// ============================================================

function editVideo(id) {

  const video =
    videos.find(
      v =>
        v.id === id
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

  if (titleInput) {

    titleInput.value =
      video.title || "";

  }

  const categoryInput =
    document.getElementById(
      "videoCategory"
    );

  if (categoryInput) {

    categoryInput.value =
      video.category ||
      "Market Structure";

  }

  const durationInput =
    document.getElementById(
      "videoDuration"
    );

  if (durationInput) {

    durationInput.value =
      video.duration || "";

  }

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
      video.premiumOnly ===
      true;

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
      getVideoKey(
        video
      );

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
// PREMIUM TOGGLE
// ============================================================

async function toggleVideoPremium(
  id
) {

  const video =
    videos.find(
      v =>
        v.id === id
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
      "PREMIUM UPDATE ERROR:",
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

async function deleteVideo(
  id
) {

  const video =
    videos.find(
      v =>
        v.id === id
    );

  if (!video) {
    return;
  }

  if (
    !confirm(
      `Delete "${video.title}" permanently?\n\n` +
      "This removes the Firestore video record."
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

    thumbnailPreviewImg.src =
      "";

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

    const hidden =
      formContainer?.style.display ===
      "none";

    if (hidden) {

      resetForm();

      if (formContainer) {

        formContainer.style.display =
          "block";

      }

      if (toggleFormBtn) {

        toggleFormBtn.innerHTML =
          '<i class="fa-solid fa-xmark"></i> Cancel';

      }

    } else {

      if (formContainer) {

        formContainer.style.display =
          "none";

      }

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

    const title =
      titleInput?.value
        ?.trim() || "";

    const category =
      categoryInput?.value ||
      "General";

    const duration =
      durationInput?.value
        ?.trim() || "";

    const youtubeId =
      youtubeInput?.value
        ?.trim() || "";

    const premiumOnly =
      premiumInput?.checked ||
      false;

    const description =
      descriptionInput?.value
        ?.trim() || "";

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

    // ======================================================
    // VALIDATION
    // ======================================================

    if (!title) {

      alert(
        "Please enter a video title."
      );

      return;
    }

    if (!category) {

      alert(
        "Please select a category."
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

    // ======================================================
    // EXISTING RECORD
    // ======================================================

    const existing =
      editing
        ? videos.find(
            v =>
              v.id ===
              editing
          )
        : null;

    let videoKey =
      getVideoKey(
        existing
      );

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
      (
        editing
          ? "Update Video"
          : "Upload Video"
      );

    try {

      if (saveButton) {

        saveButton.disabled =
          true;

        saveButton.textContent =
          "Uploading...";
      }

      // ====================================================
      // VIDEO UPLOAD
      // ====================================================

      if (videoFile) {

        console.log(
          "STARTING VIDEO UPLOAD:",
          videoFile.name
        );

        const uploadedVideo =
          await uploadToR2(
            videoFile,
            "videos"
          );

        videoKey =
          uploadedVideo.key;

        console.log(
          "VIDEO UPLOAD VERIFIED:",
          videoKey
        );
      }

      // ====================================================
      // THUMBNAIL UPLOAD
      // ====================================================

      if (thumbnailFile) {

        console.log(
          "STARTING THUMBNAIL UPLOAD:",
          thumbnailFile.name
        );

        const uploadedThumbnail =
          await uploadToR2(
            thumbnailFile,
            "thumbnails"
          );

        thumbnailKey =
          uploadedThumbnail.key;

        thumbnail =
          getR2FileURL(
            thumbnailKey
          );

        console.log(
          "THUMBNAIL VERIFIED:",
          thumbnailKey
        );
      }

      // ====================================================
      // FIRESTORE DATA
      // ====================================================

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

      // ====================================================
      // YOUTUBE
      // ====================================================

      if (youtubeId) {

        data.youtubeId =
          youtubeId;

      }

      // ====================================================
      // UPDATE
      // ====================================================

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

      }

      // ====================================================
      // CREATE
      // ====================================================

      else {

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

      // ====================================================
      // REFRESH
      // ====================================================

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
// INITIAL LOAD
// ============================================================

loadVideos();

console.log(
  "GTRADES-AXIS™ Admin Video Manager loaded."
);

console.log(
  "R2 Worker:",
  R2_WORKER_URL
);