// ============================================================
// GTRADES-AXIS™ — ADMIN VIDEO MANAGER
// js/admin-videos.js
// ============================================================

import {
  db,
  auth
} from "../firebase.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

import {
  onAuthStateChanged
} from "firebase/auth";

// ============================================================
// CONFIG
// ============================================================

const R2_WORKER_URL =
  "https://gtrades-video-api.davidthuku574.workers.dev";

// ============================================================
// SAMPLE VIDEOS
// ============================================================

const SAMPLE_VIDEOS = [

  {
    title:
      "Market Structure Basics (BOS & CHoCH)",
    category:
      "Market Structure",
    duration:
      "12:45",
    premiumOnly:
      false
  },

  {
    title:
      "Supply & Demand Zone Refinement",
    category:
      "Supply & Demand",
    duration:
      "15:10",
    premiumOnly:
      false
  },

  {
    title:
      "Liquidity Grabs Explained",
    category:
      "Liquidity",
    duration:
      "08:22",
    premiumOnly:
      false
  },

  {
    title:
      "Perfect Entry Checklist",
    category:
      "Entries",
    duration:
      "10:05",
    premiumOnly:
      false
  },

  {
    title:
      "Mastering Trading Psychology",
    category:
      "Psychology",
    duration:
      "18:30",
    premiumOnly:
      false
  },

  {
    title:
      "Break of Structure (BOS) in Trend",
    category:
      "Market Structure",
    duration:
      "09:15",
    premiumOnly:
      false
  },

  {
    title:
      "Change of Character (CHoCH) Deep Dive",
    category:
      "Market Structure",
    duration:
      "14:50",
    premiumOnly:
      false
  },

  {
    title:
      "Liquidity Sweep Before Entry",
    category:
      "Liquidity",
    duration:
      "07:40",
    premiumOnly:
      false
  },

  {
    title:
      "How to Draw Supply & Demand Zones",
    category:
      "Supply & Demand",
    duration:
      "20:15",
    premiumOnly:
      false
  },

  {
    title:
      "Risk Management for Prop Firms",
    category:
      "Entries",
    duration:
      "11:25",
    premiumOnly:
      false
  },

  {
    title:
      "Overcoming Fear & Greed",
    category:
      "Psychology",
    duration:
      "16:00",
    premiumOnly:
      false
  },

  {
    title:
      "Session Timing: London vs NY",
    category:
      "Entries",
    duration:
      "13:55",
    premiumOnly:
      false
  }

];

// ============================================================
// DOM
// ============================================================

const videoForm =
  document.getElementById(
    "videoForm"
  );

const videoListBody =
  document.getElementById(
    "videoTableBody"
  );

const toggleFormBtn =
  document.getElementById(
    "toggleVideoFormBtn"
  );

const formContainer =
  document.getElementById(
    "videoFormContainer"
  );

const cancelBtn =
  document.getElementById(
    "cancelVideoBtn"
  );

const formTitle =
  document.getElementById(
    "videoFormTitle"
  );

const editingIdInput =
  document.getElementById(
    "editingVideoId"
  );

const thumbnailFileInput =
  document.getElementById(
    "videoThumbnailFile"
  );

const videoFileInput =
  document.getElementById(
    "videoFile"
  );

const thumbnailPreview =
  document.getElementById(
    "thumbnailPreview"
  );

const thumbnailPreviewImg =
  document.getElementById(
    "thumbnailPreviewImg"
  );

const existingThumbnailUrl =
  document.getElementById(
    "existingThumbnailUrl"
  );

const existingVideoKey =
  document.getElementById(
    "existingVideoKey"
  );

// ============================================================
// STATE
// ============================================================

let videos = [];

let editingId = null;

// ============================================================
// CURRENT USER
// ============================================================

let currentUser = null;

onAuthStateChanged(
  auth,
  user => {

    currentUser =
      user;

  }
);

// ============================================================
// R2 UPLOAD
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

  const safeName =
    file.name
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

  const key =
    `${folder}/${currentUser?.uid || "admin"}/${Date.now()}_${safeName}`;

  const uploadURL =
    `${R2_WORKER_URL}/upload` +
    `?key=${encodeURIComponent(
      key
    )}` +
    `&contentType=${encodeURIComponent(
      file.type ||
      "application/octet-stream"
    )}`;

  const response =
    await fetch(
      uploadURL,
      {
        method:
          "PUT",

        headers: {
          "Content-Type":
            file.type ||
            "application/octet-stream"
        },

        body:
          file
      }
    );

  let result;

  try {

    result =
      await response.json();

  } catch {

    throw new Error(
      "Invalid response from R2 upload server."
    );

  }

  if (
    !response.ok ||
    !result.success
  ) {

    throw new Error(
      result.error ||
      "R2 upload failed."
    );

  }

  return {
    key:
      result.key ||
      key,

    url:
      result.url ||
      `${R2_WORKER_URL}/videos/${key}`
  };

}

// ============================================================
// THUMBNAIL PREVIEW
// ============================================================

thumbnailFileInput?.addEventListener(
  "change",
  () => {

    const file =
      thumbnailFileInput.files[0];

    if (!file) {

      thumbnailPreview.style.display =
        "none";

      return;

    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      alert(
        "Please select an image file."
      );

      thumbnailFileInput.value =
        "";

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

    reader.readAsDataURL(
      file
    );

  }
);

// ============================================================
// VIDEO FILE VALIDATION
// ============================================================

videoFileInput?.addEventListener(
  "change",
  () => {

    const file =
      videoFileInput.files[0];

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

    const maxSize =
      500 * 1024 * 1024;

    if (
      file.size >
      maxSize
    ) {

      alert(
        "Video is too large. Maximum allowed size is 500 MB."
      );

      videoFileInput.value =
        "";

      return;

    }

  }
);

// ============================================================
// ADD SAMPLE VIDEOS
// ============================================================

async function addSampleVideos() {

  if (
    !confirm(
      "This will add 12 sample videos to Firestore. Continue?"
    )
  ) {

    return;

  }

  try {

    const existing =
      await getDocs(
        collection(
          db,
          "videos"
        )
      );

    if (
      !existing.empty
    ) {

      if (
        !confirm(
          "You already have videos. Adding samples will create duplicates. Continue?"
        )
      ) {

        return;

      }

    }

    let count =
      0;

    for (
      const video of SAMPLE_VIDEOS
    ) {

      await addDoc(
        collection(
          db,
          "videos"
        ),
        {
          ...video,

          videoKey:
            "",

          thumbnailKey:
            "",

          description:
            "",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );

      count++;

    }

    alert(
      `✅ ${count} sample videos added successfully!`
    );

    await loadVideos();

  } catch (error) {

    console.error(
      "SAMPLE VIDEO ERROR:",
      error
    );

    alert(
      "Error adding sample videos:\n" +
      error.message
    );

  }

}

document
  .getElementById(
    "addSampleVideosBtn"
  )
  ?.addEventListener(
    "click",
    addSampleVideos
  );

// ============================================================
// TOGGLE FORM
// ============================================================

toggleFormBtn?.addEventListener(
  "click",
  () => {

    const isHidden =
      formContainer.style.display ===
      "none";

    formContainer.style.display =
      isHidden
        ? "block"
        : "none";

    if (isHidden) {

      resetForm();

      formTitle.textContent =
        "Add New Video";

      document.getElementById(
        "saveVideoBtn"
      ).textContent =
        "Save Video";

      toggleFormBtn.innerHTML =
        '<i class="fa-solid fa-xmark"></i> Cancel';

    } else {

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
// RESET FORM
// ============================================================

function resetForm() {

  videoForm?.reset();

  editingId =
    null;

  if (
    editingIdInput
  ) {

    editingIdInput.value =
      "";

  }

  if (
    existingThumbnailUrl
  ) {

    existingThumbnailUrl.value =
      "";

  }

  if (
    existingVideoKey
  ) {

    existingVideoKey.value =
      "";

  }

  if (
    thumbnailPreview
  ) {

    thumbnailPreview.style.display =
      "none";

  }

}

// ============================================================
// LOAD VIDEOS
// ============================================================

async function loadVideos() {

  videos =
    [];

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "videos"
        )
      );

    snapshot.forEach(
      docSnap => {

        videos.push({
          id:
            docSnap.id,

          ...docSnap.data()

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

    if (
      videoListBody
    ) {

      videoListBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-card">
              Unable to load videos.
            </div>
          </td>
        </tr>
      `;

    }

  }

}

// ============================================================
// RENDER TABLE
// ============================================================

function renderVideos() {

  if (
    !videoListBody
  ) {

    return;

  }

  videoListBody.innerHTML =
    "";

  if (
    videos.length ===
    0
  ) {

    videoListBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-card">
            No videos uploaded.
          </div>
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

      const thumbnail =
        video.thumbnailKey
          ? `${R2_WORKER_URL}/videos/${encodeKey(
              video.thumbnailKey
            )}`
          : video.thumbnail ||
            "";

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
              onerror="this.style.display='none'"
            />
          `
          : `
            <span
              style="
                color:var(--text-secondary);
                font-size:1.5rem;
              "
            >
              📹
            </span>
          `;

      const hasVideo =
        Boolean(
          video.videoKey ||
          video.fileKey ||
          video.youtubeId
        );

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
                    margin-top:3px;
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
                    margin-top:3px;
                  "
                >
                  ⚠ No video file
                </small>
              `
          }

        </td>

        <td>
          <span class="badge">
            ${escapeHTML(
              video.category ||
              "General"
            )}
          </span>
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

            <button
              class="manage-btn edit-video"
              data-id="${video.id}"
              style="
                color:var(--accent-blue);
                border-color:var(--accent-blue);
              "
            >
              <i class="fa-solid fa-pen"></i>
              Edit
            </button>

            <button
              class="manage-btn toggle-video-premium"
              data-id="${video.id}"
              style="
                color:var(--gold);
                border-color:var(--gold);
              "
            >

              <i
                class="fa-solid fa-${
                  video.premiumOnly
                    ? "lock"
                    : "unlock"
                }"
              ></i>

              ${
                video.premiumOnly
                  ? "Make Free"
                  : "Make Premium"
              }

            </button>

            <button
              class="manage-btn delete-video"
              data-id="${video.id}"
              style="
                color:var(--red);
                border-color:var(--red);
              "
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

  // ==========================================================
  // EVENTS
  // ==========================================================

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
// EDIT VIDEO
// ============================================================

function editVideo(
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

  editingId =
    id;

  editingIdInput.value =
    id;

  document.getElementById(
    "videoTitle"
  ).value =
    video.title ||
    "";

  document.getElementById(
    "videoCategory"
  ).value =
    video.category ||
    "Market Structure";

  document.getElementById(
    "videoDuration"
  ).value =
    video.duration ||
    "";

  const youtubeInput =
    document.getElementById(
      "videoYoutubeId"
    );

  if (youtubeInput) {

    youtubeInput.value =
      video.youtubeId ||
      "";

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

  if (
    existingThumbnailUrl
  ) {

    existingThumbnailUrl.value =
      video.thumbnail ||
      "";

  }

  if (
    existingVideoKey
  ) {

    existingVideoKey.value =
      video.videoKey ||
      video.fileKey ||
      "";

  }

  // ==========================================================
  // THUMBNAIL PREVIEW
  // ==========================================================

  const thumbnailURL =
    video.thumbnailKey
      ? `${R2_WORKER_URL}/videos/${encodeKey(
          video.thumbnailKey
        )}`
      : video.thumbnail ||
        "";

  if (
    thumbnailURL &&
    thumbnailPreviewImg &&
    thumbnailPreview
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

  formTitle.textContent =
    "Edit Video";

  document.getElementById(
    "saveVideoBtn"
  ).textContent =
    "Update Video";

  formContainer.style.display =
    "block";

  toggleFormBtn.innerHTML =
    '<i class="fa-solid fa-xmark"></i> Cancel';

  window.scrollTo({
    top:
      formContainer.offsetTop -
      30,

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

    alert(
      "✅ Video status updated."
    );

  } catch (error) {

    console.error(
      "PREMIUM UPDATE ERROR:",
      error
    );

    alert(
      "Error updating video status:\n" +
      error.message
    );

  }

}

// ============================================================
// DELETE VIDEO
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
      `Delete "${video.title}" permanently?\n\nThe Firestore record will be deleted.`
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

    alert(
      "✅ Video deleted."
    );

  } catch (error) {

    console.error(
      "DELETE VIDEO ERROR:",
      error
    );

    alert(
      "Error deleting video:\n" +
      error.message
    );

  }

}

// ============================================================
// SAVE VIDEO
// ============================================================

videoForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    // ========================================================
    // FORM DATA
    // ========================================================

    const title =
      document
        .getElementById(
          "videoTitle"
        )
        .value
        .trim();

    const category =
      document
        .getElementById(
          "videoCategory"
        )
        .value;

    const duration =
      document
        .getElementById(
          "videoDuration"
        )
        .value
        .trim();

    const youtubeInput =
      document.getElementById(
        "videoYoutubeId"
      );

    const youtubeId =
      youtubeInput
        ? youtubeInput.value.trim()
        : "";

    const premiumOnly =
      document.getElementById(
        "videoPremiumOnly"
      )?.checked ||
      false;

    const descriptionInput =
      document.getElementById(
        "videoDescription"
      );

    const description =
      descriptionInput
        ? descriptionInput.value.trim()
        : "";

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

    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !title ||
      !category ||
      !duration
    ) {

      alert(
        "Please fill in the title, category and duration."
      );

      return;

    }

    if (
      !editing &&
      !videoFile &&
      !youtubeId
    ) {

      alert(
        "Please select a video file or provide a YouTube ID."
      );

      return;

    }

    // ========================================================
    // CURRENT RECORD
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
      existing?.videoKey ||
      existing?.fileKey ||
      "";

    let thumbnailKey =
      existing?.thumbnailKey ||
      "";

    let thumbnail =
      existing?.thumbnail ||
      "";

    // ========================================================
    // DISABLE BUTTON
    // ========================================================

    const saveButton =
      document.getElementById(
        "saveVideoBtn"
      );

    const originalText =
      saveButton?.textContent ||
      "Save Video";

    if (saveButton) {

      saveButton.disabled =
        true;

      saveButton.textContent =
        "Uploading...";

    }

    try {

      // ======================================================
      // UPLOAD VIDEO TO R2
      // ======================================================

      if (videoFile) {

        if (
          !videoFile.type.startsWith(
            "video/"
          )
        ) {

          throw new Error(
            "Selected file is not a valid video."
          );

        }

        if (
          videoFile.size >
          500 *
          1024 *
          1024
        ) {

          throw new Error(
            "Video exceeds the 500 MB limit."
          );

        }

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

      }

      // ======================================================
      // UPLOAD THUMBNAIL TO R2
      // ======================================================

      if (thumbnailFile) {

        if (
          !thumbnailFile.type.startsWith(
            "image/"
          )
        ) {

          throw new Error(
            "Thumbnail must be an image."
          );

        }

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

      /*
       * Keep YouTube compatibility.
       * New R2 videos do not need youtubeId.
       */

      if (youtubeId) {

        data.youtubeId =
          youtubeId;

      } else if (
        existing?.youtubeId
      ) {

        data.youtubeId =
          existing.youtubeId;

      }

      // ======================================================
      // SAVE / UPDATE
      // ======================================================

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
          "✅ Video updated successfully."
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
          "✅ Video uploaded successfully to Cloudflare R2."
        );

      }

      // ======================================================
      // REFRESH
      // ======================================================

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
        "❌ Error saving video:\n\n" +
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
// R2 KEY ENCODER
// ============================================================

function encodeKey(
  key
) {

  return key
    .split("/")
    .map(
      part =>
        encodeURIComponent(
          part
        )
    )
    .join("/");

}

// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}

// ============================================================
// INIT
// ============================================================

loadVideos();

console.log(
  "✅ GTRADES-AXIS™ Admin Video Manager ready."
);

console.log(
  "☁️ Cloudflare R2:",
  R2_WORKER_URL
);