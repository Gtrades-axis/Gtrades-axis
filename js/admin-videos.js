// ============================================================
// GTRADES-AXIS™
// js/admin-videos.js
//
// ADMIN VIDEO MANAGER
//
// The browser NEVER writes the R2 object directly.
//
// Flow:
//
// Admin
// ↓
// Firebase Auth
// ↓
// Firebase Callable Function
// ↓
// Admin permission checked
// ↓
// Upload authorization created
// ↓
// Cloudflare Worker
// ↓
// R2
// ↓
// Firestore metadata
// ============================================================

import {
  auth,
  db,
  functions
} from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
  query
} from "firebase/firestore";

import {
  httpsCallable
} from "firebase/functions";


// ============================================================
// CONFIG
// ============================================================

const R2_WORKER_URL =
  "https://gtrades-video-api.davidthuku574.workers.dev";


// ============================================================
// DOM
// ============================================================

const form =
  document.getElementById("videoForm");

const videoFile =
  document.getElementById("videoFile");

const thumbnailFile =
  document.getElementById("thumbnailFile");

const titleInput =
  document.getElementById("videoTitle");

const categoryInput =
  document.getElementById("videoCategory");

const durationInput =
  document.getElementById("videoDuration");

const descriptionInput =
  document.getElementById("videoDescription");

const premiumInput =
  document.getElementById("videoPremiumOnly");

const tableBody =
  document.getElementById("videoTableBody");

const saveBtn =
  document.getElementById("saveBtn");

const progress =
  document.getElementById("progress");

const progressFill =
  document.getElementById("progressFill");

const progressText =
  document.getElementById("progressText");

const cancelBtn =
  document.getElementById("cancelBtn");

const logoutBtn =
  document.getElementById("logoutBtn");


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let editingId = null;


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      location.href =
        "/login";

      return;
    }


    currentUser =
      user;


    try {

      const verifyAdmin =
        httpsCallable(
          functions,
          "verifyAdminAccess"
        );


      const result =
        await verifyAdmin();


      if (
        result?.data?.admin !== true
      ) {

        alert(
          "Administrator access required."
        );

        location.href =
          "/dashboard";

        return;
      }


      await loadVideos();

    } catch (error) {

      console.error(
        "ADMIN AUTH ERROR:",
        error
      );


      alert(
        "You do not have administrator access."
      );


      location.href =
        "/dashboard";

    }

  }
);


// ============================================================
// LOAD
// ============================================================

async function loadVideos() {

  tableBody.innerHTML = `
    <tr>
      <td colspan="5">
        Loading...
      </td>
    </tr>
  `;


  try {

    let snapshot;


    try {

      snapshot =
        await getDocs(
          query(
            collection(
              db,
              "videos"
            ),
            orderBy(
              "createdAt",
              "desc"
            )
          )
        );

    } catch {

      snapshot =
        await getDocs(
          collection(
            db,
            "videos"
          )
        );

    }


    tableBody.innerHTML = "";


    if (snapshot.empty) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="5">
            No videos uploaded yet.
          </td>
        </tr>
      `;

      return;
    }


    snapshot.forEach(
      (videoDoc) => {

        renderRow(
          videoDoc.id,
          videoDoc.data()
        );

      }
    );

  } catch (error) {

    console.error(
      "LOAD VIDEOS ERROR:",
      error
    );


    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Unable to load videos.
        </td>
      </tr>
    `;

  }

}


// ============================================================
// ROW
// ============================================================

function renderRow(id, video) {

  const row =
    document.createElement("tr");


  const thumbnail =
    video.thumbnailUrl ||
    "";


  row.innerHTML = `

    <td>

      ${
        thumbnail

          ? `
            <img
              class="thumb"
              src="${escapeHTML(thumbnail)}"
              alt=""
            >
          `

          : "📹"
      }

    </td>


    <td>

      <strong>
        ${escapeHTML(
          video.title ||
          "Untitled"
        )}
      </strong>

    </td>


    <td>

      ${escapeHTML(
        video.category ||
        "General"
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

      <div class="actions">

        <button
          class="secondary edit-btn"
        >
          Edit
        </button>


        <button
          class="secondary toggle-btn"
        >
          ${
            video.premiumOnly
              ? "Make Free"
              : "Make Premium"
          }
        </button>


        <button
          class="danger delete-btn"
        >
          Delete
        </button>

      </div>

    </td>

  `;


  row
    .querySelector(".edit-btn")
    .onclick = () =>
      editVideo(
        id,
        video
      );


  row
    .querySelector(".toggle-btn")
    .onclick = () =>
      togglePremium(
        id,
        video
      );


  row
    .querySelector(".delete-btn")
    .onclick = () =>
      deleteVideo(
        id,
        video
      );


  tableBody.appendChild(
    row
  );

}


// ============================================================
// GET SECURE UPLOAD TOKEN
// ============================================================

async function getUploadAuthorization(
  key,
  contentType
) {

  const fn =
    httpsCallable(
      functions,
      "createVideoUploadAuthorization"
    );


  const result =
    await fn({

      key,

      contentType

    });


  return result.data;

}


// ============================================================
// UPLOAD TO R2
// ============================================================

async function uploadToR2(
  file,
  key,
  uploadToken
) {

  const response =
    await fetch(
      `${R2_WORKER_URL}/upload`,
      {
        method:"PUT",

        headers:{
          "Content-Type":
            file.type,

          "X-Upload-Token":
            uploadToken
        },

        body:file
      }
    );


  const result =
    await response.json()
      .catch(
        () => ({})
      );


  if (
    !response.ok ||
    !result.success
  ) {

    throw new Error(
      result.error ||
      "R2 upload failed."
    );

  }


  return result;

}


// ============================================================
// FORM
// ============================================================

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const title =
      titleInput.value.trim();


    const duration =
      durationInput.value.trim();


    const file =
      videoFile.files[0];


    const thumbnail =
      thumbnailFile.files[0];


    if (!title) {

      alert(
        "Enter a video title."
      );

      return;
    }


    if (
      !editingId &&
      !file
    ) {

      alert(
        "Select a video file."
      );

      return;
    }


    try {

      saveBtn.disabled =
        true;


      progress.style.display =
        "block";


      progressFill.style.width =
        "10%";


      progressText.textContent =
        "Preparing secure upload...";


      let videoKey =
        null;


      let thumbnailKey =
        null;


      // ======================================================
      // VIDEO UPLOAD
      // ======================================================

      if (file) {

        const safeName =
          cleanFilename(
            file.name
          );


        videoKey =
          `videos/${currentUser.uid}/${Date.now()}_${safeName}`;


        progressText.textContent =
          "Authorizing video upload...";


        const authorization =
          await getUploadAuthorization(
            videoKey,
            file.type
          );


        progressFill.style.width =
          "30%";


        progressText.textContent =
          "Uploading video to Cloudflare R2...";


        await uploadToR2(
          file,
          videoKey,
          authorization.token
        );


        progressFill.style.width =
          "70%";

      }


      // ======================================================
      // THUMBNAIL
      // ======================================================

      if (thumbnail) {

        const safeName =
          cleanFilename(
            thumbnail.name
          );


        thumbnailKey =
          `thumbnails/${currentUser.uid}/${Date.now()}_${safeName}`;


        progressText.textContent =
          "Authorizing thumbnail upload...";


        const authorization =
          await getUploadAuthorization(
            thumbnailKey,
            thumbnail.type
          );


        progressText.textContent =
          "Uploading thumbnail...";


        await uploadToR2(
          thumbnail,
          thumbnailKey,
          authorization.token
        );

      }


      progressFill.style.width =
        "90%";


      progressText.textContent =
        "Saving video metadata...";


      // ======================================================
      // FIRESTORE UPDATE
      // ======================================================

      const saveVideo =
        httpsCallable(
          functions,
          "saveVideoMetadata"
        );


      await saveVideo({

        videoId:
          editingId || null,

        title,

        category:
          categoryInput.value,

        duration,

        description:
          descriptionInput.value.trim(),

        premiumOnly:
          premiumInput.checked,

        videoKey,

        thumbnailKey

      });


      progressFill.style.width =
        "100%";


      progressText.textContent =
        "Complete.";


      alert(
        editingId
          ? "✅ Video updated successfully."
          : "✅ Video uploaded successfully."
      );


      resetForm();

      await loadVideos();

    } catch (error) {

      console.error(
        "VIDEO SAVE ERROR:",
        error
      );


      alert(
        error?.message ||
        "Unable to save video."
      );

    } finally {

      saveBtn.disabled =
        false;

      setTimeout(
        () => {

          progress.style.display =
            "none";

          progressFill.style.width =
            "0%";

        },
        1000
      );

    }

  }
);


// ============================================================
// EDIT
// ============================================================

function editVideo(
  id,
  video
) {

  editingId =
    id;


  titleInput.value =
    video.title || "";


  categoryInput.value =
    video.category ||
    "Market Structure";


  durationInput.value =
    video.duration || "";


  descriptionInput.value =
    video.description || "";


  premiumInput.checked =
    video.premiumOnly === true;


  videoFile.value =
    "";


  thumbnailFile.value =
    "";


  saveBtn.textContent =
    "Update Video";


  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

}


// ============================================================
// TOGGLE PREMIUM
// ============================================================

async function togglePremium(
  id,
  video
) {

  const newValue =
    !video.premiumOnly;


  if (
    !confirm(
      `Make this video ${
        newValue
          ? "Premium"
          : "Free"
      }?`
    )
  ) {

    return;
  }


  try {

    const fn =
      httpsCallable(
        functions,
        "setVideoPremiumStatus"
      );


    await fn({

      videoId:id,

      premiumOnly:
        newValue

    });


    await loadVideos();

  } catch (error) {

    console.error(error);

    alert(
      error?.message ||
      "Unable to update video."
    );

  }

}


// ============================================================
// DELETE
// ============================================================

async function deleteVideo(
  id,
  video
) {

  if (
    !confirm(
      `Delete "${video.title}" permanently?`
    )
  ) {

    return;
  }


  try {

    const fn =
      httpsCallable(
        functions,
        "deleteVideo"
      );


    await fn({

      videoId:id

    });


    await loadVideos();


    alert(
      "✅ Video deleted."
    );

  } catch (error) {

    console.error(error);

    alert(
      error?.message ||
      "Unable to delete video."
    );

  }

}


// ============================================================
// RESET
// ============================================================

function resetForm() {

  form.reset();

  editingId =
    null;

  saveBtn.textContent =
    "Upload Video";

}


// ============================================================
// CANCEL
// ============================================================

cancelBtn.onclick =
  resetForm;


// ============================================================
// LOGOUT
// ============================================================

logoutBtn.onclick =
  async () => {

    await signOut(auth);

    location.href =
      "/login";

  };


// ============================================================
// HELPERS
// ============================================================

function cleanFilename(
  filename
) {

  return filename
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

}


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