// ============================================================
// GTRADES-AXIS™
// STUDENT VIDEO ACADEMY
// js/videos.js
// ============================================================

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ============================================================
// CONFIG
// ============================================================

const R2_WORKER =
  "https://r2-uploader.davidthuku574.workers.dev";

// ============================================================
// ELEMENTS
// ============================================================

const app =
  document.getElementById("app");

const container =
  document.getElementById(
    "videosContainer"
  );

const searchInput =
  document.getElementById(
    "searchInput"
  );

const filterButtons =
  document.querySelectorAll(
    ".filter-btn"
  );

const noResults =
  document.getElementById(
    "noResultsMessage"
  );

const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );

const modal =
  document.getElementById(
    "videoModal"
  );

const closeModalButton =
  document.getElementById(
    "closeModal"
  );

// ============================================================
// STATE
// ============================================================

let videos = [];

let activeCategory =
  "All";

let hasPremiumAccess =
  false;

let currentVideoURL =
  null;

// ============================================================
// ESCAPE
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
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }

    try {

      app?.classList.remove(
        "loading"
      );

      const userRef =
        doc(
          db,
          "users",
          user.uid
        );

      const userSnap =
        await getDoc(userRef);

      if (!userSnap.exists()) {

        showError(
          "Your account information could not be found."
        );

        return;
      }

      const userData =
        userSnap.data();

      hasPremiumAccess =
        userData.role === "admin" ||
        userData.membership === "premium";

      await loadVideos();

    } catch (error) {

      console.error(
        "VIDEO PORTAL ERROR:",
        error
      );

      showError(
        "Unable to load the video academy."
      );
    }
  }
);

// ============================================================
// LOAD
// ============================================================

async function loadVideos() {

  if (!container) return;

  container.innerHTML = `
    <div
      style="
        grid-column:1/-1;
        text-align:center;
        padding:40px;
        color:#94a3b8;
      "
    >
      Loading videos...
    </div>
  `;

  try {

    let snapshot;

    try {

      const videosQuery =
        query(
          collection(
            db,
            "videos"
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        );

      snapshot =
        await getDocs(
          videosQuery
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

    videos = [];

    snapshot.forEach(
      videoDoc => {

        videos.push({
          id: videoDoc.id,
          ...videoDoc.data()
        });

      }
    );

    renderVideos();

  } catch (error) {

    console.error(
      "FIRESTORE VIDEO ERROR:",
      error
    );

    showError(
      "Unable to load videos."
    );
  }
}

// ============================================================
// RENDER
// ============================================================

function renderVideos() {

  if (!container) return;

  container.innerHTML = "";

  noResults?.classList.remove(
    "visible"
  );

  let filtered =
    [...videos];

  if (
    activeCategory !==
    "All"
  ) {

    filtered =
      filtered.filter(
        video =>
          String(
            video.category ||
            "General"
          )
            .toLowerCase()
            .trim() ===
          activeCategory
            .toLowerCase()
            .trim()
      );
  }

  const keyword =
    searchInput?.value
      ?.toLowerCase()
      .trim() || "";

  if (keyword) {

    filtered =
      filtered.filter(
        video => {

          const title =
            String(
              video.title || ""
            ).toLowerCase();

          const description =
            String(
              video.description || ""
            ).toLowerCase();

          const category =
            String(
              video.category || ""
            ).toLowerCase();

          return (
            title.includes(keyword) ||
            description.includes(keyword) ||
            category.includes(keyword)
          );
        }
      );
  }

  if (!filtered.length) {

    if (noResults) {
      noResults.style.display =
        "block";

      noResults.classList.add(
        "visible"
      );
    }

    return;
  }

  if (noResults) {
    noResults.style.display =
      "none";

    noResults.classList.remove(
      "visible"
    );
  }

  filtered.forEach(video => {

    container.appendChild(
      createVideoCard(video)
    );

  });
}

// ============================================================
// CARD
// ============================================================

function createVideoCard(video) {

  const card =
    document.createElement(
      "div"
    );

  const premiumOnly =
    video.premiumOnly === true;

  const canAccess =
    !premiumOnly ||
    hasPremiumAccess;

  card.className =
    `video-card${
      canAccess
        ? ""
        : " locked"
    }`;

  const title =
    video.title ||
    "Untitled Video";

  const category =
    video.category ||
    "General";

  const duration =
    video.duration ||
    "—";

  const thumbnail =
    video.thumbnailKey
      ? `${R2_WORKER}/?key=${encodeURIComponent(
          video.thumbnailKey
        )}&action=file`
      : video.thumbnail ||
        "";

  card.innerHTML = `

    <div class="video-thumb">

      ${
        thumbnail
          ? `
            <img
              src="${escapeHTML(thumbnail)}"
              style="
                width:100%;
                height:100%;
                object-fit:cover;
              "
            >
          `
          : `
            <div
              style="
                width:100%;
                height:100%;
                display:flex;
                align-items:center;
                justify-content:center;
                background:#080d16;
              "
            >
              <i
                class="fa-solid fa-circle-play"
                style="
                  font-size:3rem;
                  color:#1d9bf0;
                "
              ></i>
            </div>
          `
      }

      <span class="video-duration">
        ${escapeHTML(duration)}
      </span>

      ${
        !canAccess
          ? `
            <div class="lock-overlay">

              <i class="fa-solid fa-lock"></i>

              <span>
                Premium Only
              </span>

            </div>
          `
          : ""
      }

    </div>

    <div class="video-info">

      <div class="video-title">
        ${escapeHTML(title)}
      </div>

      <div class="video-meta">

        <span>
          ${escapeHTML(category)}
        </span>

        <span
          class="badge ${
            premiumOnly
              ? "badge-premium"
              : "badge-free"
          }"
        >
          ${
            premiumOnly
              ? "Premium"
              : "Free"
          }
        </span>

      </div>

    </div>
  `;

  if (canAccess) {

    card.addEventListener(
      "click",
      () => openVideo(video)
    );
  }

  return card;
}

// ============================================================
// OPEN VIDEO
// ============================================================

async function openVideo(video) {

  if (
    video.premiumOnly === true &&
    !hasPremiumAccess
  ) {

    alert(
      "Premium membership is required."
    );

    return;
  }

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

    window.location.href =
      "login.html";

    return;
  }

  try {

    const token =
      await user.getIdToken(true);

    await playAuthenticatedVideo(
      videoKey,
      token,
      video.title ||
        "GTRADES-AXIS Video"
    );

  } catch (error) {

    console.error(
      "VIDEO PLAY ERROR:",
      error
    );

    alert(
      error.message ||
      "Unable to play this video."
    );
  }
}

// ============================================================
// PLAYER
// ============================================================

async function playAuthenticatedVideo(
  videoKey,
  token,
  title
) {

  if (!modal) {

    alert(
      "Video player modal not found."
    );

    return;
  }

  modal.classList.add(
    "active"
  );

  document.body.style.overflow =
    "hidden";

  let videoPlayer =
    document.getElementById(
      "r2VideoPlayer"
    );

  if (!videoPlayer) {

    videoPlayer =
      document.createElement(
        "video"
      );

    videoPlayer.id =
      "r2VideoPlayer";

    videoPlayer.controls =
      true;

    videoPlayer.playsInline =
      true;

    videoPlayer.preload =
      "metadata";

    videoPlayer.style.width =
      "100%";

    videoPlayer.style.maxHeight =
      "80vh";

    videoPlayer.style.background =
      "#000";

    const modalContent =
      modal.querySelector(
        ".modal-content"
      );

    if (!modalContent) {

      throw new Error(
        "Video modal content not found."
      );
    }

    modalContent.appendChild(
      videoPlayer
    );
  }

  videoPlayer.style.display =
    "block";

  videoPlayer.setAttribute(
    "aria-label",
    title
  );

  videoPlayer.pause();

  videoPlayer.removeAttribute(
    "src"
  );

  videoPlayer.load();

  if (currentVideoURL) {

    URL.revokeObjectURL(
      currentVideoURL
    );

    currentVideoURL =
      null;
  }

  const response =
    await fetch(
      `${R2_WORKER}/?key=${encodeURIComponent(
        videoKey
      )}&action=file`,
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

  if (!response.ok) {

    const errorData =
      await response
        .json()
        .catch(
          () => ({})
        );

    throw new Error(
      errorData.error ||
      `Video authorization failed (${response.status})`
    );
  }

  const blob =
    await response.blob();

  const blobURL =
    URL.createObjectURL(
      blob
    );

  currentVideoURL =
    blobURL;

  videoPlayer.src =
    blobURL;

  videoPlayer.load();

  await videoPlayer
    .play()
    .catch(() => {});
}

// ============================================================
// CLOSE
// ============================================================

function closeVideo() {

  const videoPlayer =
    document.getElementById(
      "r2VideoPlayer"
    );

  if (videoPlayer) {

    videoPlayer.pause();

    videoPlayer.removeAttribute(
      "src"
    );

    videoPlayer.load();
  }

  if (currentVideoURL) {

    URL.revokeObjectURL(
      currentVideoURL
    );

    currentVideoURL =
      null;
  }

  modal?.classList.remove(
    "active"
  );

  document.body.style.overflow =
    "";
}

// ============================================================
// LOGOUT
// ============================================================

logoutBtn?.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

      window.location.href =
        "login.html";

    } catch (error) {

      console.error(
        "LOGOUT ERROR:",
        error
      );

      alert(
        "Unable to logout."
      );
    }
  }
);

// ============================================================
// CLOSE BUTTON
// ============================================================

closeModalButton?.addEventListener(
  "click",
  closeVideo
);

// ============================================================
// OUTSIDE MODAL
// ============================================================

modal?.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      modal
    ) {

      closeVideo();
    }
  }
);

// ============================================================
// ESC
// ============================================================

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      closeVideo();
    }
  }
);

// ============================================================
// SEARCH
// ============================================================

searchInput?.addEventListener(
  "input",
  renderVideos
);

// ============================================================
// FILTER
// ============================================================

filterButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        filterButtons.forEach(
          btn =>
            btn.classList.remove(
              "active"
            )
        );

        button.classList.add(
          "active"
        );

        activeCategory =
          button.dataset.category ||
          "All";

        renderVideos();
      }
    );
  }
);

// ============================================================
// ERROR
// ============================================================

function showError(message) {

  if (!container) return;

  container.innerHTML = `

    <div
      style="
        grid-column:1/-1;
        text-align:center;
        padding:60px 20px;
        color:#ff8799;
      "
    >

      <i
        class="fa-solid fa-circle-exclamation"
        style="
          font-size:2.5rem;
          margin-bottom:15px;
        "
      ></i>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>
  `;
}

console.log(
  "GTRADES-AXIS™ Student Video Academy loaded."
);

console.log(
  "R2 Worker:",
  R2_WORKER
);