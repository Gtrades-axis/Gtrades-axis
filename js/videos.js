// ============================================================
// GTRADES-AXIS™
// STUDENT / PREMIUM VIDEO PORTAL
// js/videos.js
// ============================================================

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc
} from "firebase/firestore";

// ============================================================
// CLOUDFLARE R2 WORKER
// ============================================================

const R2_WORKER =
  "https://r2-uploader.davidthuku574.workers.dev";

// ============================================================
// ELEMENTS
// ============================================================

const app =
  document.getElementById("app");

const container =
  document.getElementById("videosContainer");

const searchInput =
  document.getElementById("searchInput");

const filterButtons =
  document.querySelectorAll(".filter-btn");

const noResults =
  document.getElementById("noResultsMessage");

const logoutBtn =
  document.getElementById("logoutBtn");

const modal =
  document.getElementById("videoModal");

const closeModalButton =
  document.getElementById("closeModal");

// ============================================================
// STATE
// ============================================================

let videos = [];

let activeCategory = "All";

let hasPremiumAccess = false;

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
// GET R2 FILE URL
// ============================================================

async function getR2FileURL(key) {

  if (!key) {
    throw new Error(
      "No R2 video key was found."
    );
  }

  const url =
    new URL(R2_WORKER);

  url.searchParams.set(
    "key",
    key
  );

  // IMPORTANT:
  // The working Admin preview uses action=file
  url.searchParams.set(
    "action",
    "file"
  );

  console.log(
    "Requesting R2 video:",
    key
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          Accept:
            "application/json"
        },
        cache: "no-store"
      }
    );

  let data;

  try {

    data =
      await response.json();

  } catch {

    throw new Error(
      "Cloudflare Worker returned an invalid response."
    );

  }

  if (
    !response.ok ||
    !data.url
  ) {

    throw new Error(
      data.error ||
      `R2 Worker error (${response.status})`
    );

  }

  console.log(
    "R2 video URL received."
  );

  return data.url;
}

// ============================================================
// GET THUMBNAIL URL
// ============================================================

async function getThumbnailURL(key) {

  if (!key) {
    return null;
  }

  try {

    return await getR2FileURL(
      key
    );

  } catch (error) {

    console.warn(
      "Thumbnail unavailable:",
      error
    );

    return null;
  }
}

// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }

    try {

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

      // ======================================================
      // PREMIUM ACCESS
      // ======================================================

      hasPremiumAccess =
        userData.role === "admin" ||
        userData.membership === "premium";

      console.log(
        "User:",
        user.uid
      );

      console.log(
        "Role:",
        userData.role
      );

      console.log(
        "Membership:",
        userData.membership
      );

      console.log(
        "Premium access:",
        hasPremiumAccess
      );

      app?.classList.remove(
        "loading"
      );

      // ------------------------------------------------------
      // NON PREMIUM USER
      // ------------------------------------------------------

      if (!hasPremiumAccess) {

        app?.classList.add(
          "locked"
        );

        if (container) {

          container.innerHTML = `
            <div
              style="
                grid-column:1/-1;
                text-align:center;
                padding:60px 20px;
              "
            >

              <i
                class="fa-solid fa-lock"
                style="
                  font-size:3rem;
                  color:#f5a623;
                  margin-bottom:20px;
                "
              ></i>

              <h2>
                Premium Members Only
              </h2>

              <p
                style="
                  color:#94a3b8;
                  margin-top:10px;
                "
              >
                Upgrade your membership
                to access premium videos.
              </p>

            </div>
          `;

        }

        return;
      }

      // ======================================================
      // PREMIUM / ADMIN
      // ======================================================

      app?.classList.remove(
        "locked"
      );

      await loadVideos();

    } catch (error) {

      console.error(
        "VIDEO AUTH ERROR:",
        error
      );

      app?.classList.remove(
        "loading"
      );

      showError(
        "Unable to verify your account. Please refresh."
      );

    }

  }
);

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
// LOAD VIDEOS
// ============================================================

async function loadVideos() {

  if (!container) {
    return;
  }

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

    // --------------------------------------------------------
    // Try ordered query first
    // --------------------------------------------------------

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

    } catch (orderError) {

      console.warn(
        "Ordered video query failed. Loading normally.",
        orderError
      );

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
      (videoDoc) => {

        videos.push({
          id:
            videoDoc.id,

          ...videoDoc.data()

        });

      }
    );

    console.log(
      "Videos loaded:",
      videos.length
    );

    renderVideos();

  } catch (error) {

    console.error(
      "VIDEO FIRESTORE ERROR:",
      error
    );

    showError(
      "Unable to load videos. Please refresh the page."
    );

  }

}

// ============================================================
// RENDER VIDEOS
// ============================================================

async function renderVideos() {

  if (!container) {
    return;
  }

  container.innerHTML = "";

  noResults?.classList.remove(
    "visible"
  );

  let filtered =
    [...videos];

  // ==========================================================
  // CATEGORY
  // ==========================================================

  if (
    activeCategory !==
    "All"
  ) {

    filtered =
      filtered.filter(
        (video) => {

          return String(
            video.category ||
            "General"
          )
            .toLowerCase()
            .trim() ===
          String(
            activeCategory
          )
            .toLowerCase()
            .trim();

        }
      );

  }

  // ==========================================================
  // SEARCH
  // ==========================================================

  const keyword =
    searchInput?.value
      ?.toLowerCase()
      .trim() || "";

  if (keyword) {

    filtered =
      filtered.filter(
        (video) => {

          const title =
            String(
              video.title ||
              ""
            )
              .toLowerCase();

          const description =
            String(
              video.description ||
              ""
            )
              .toLowerCase();

          const category =
            String(
              video.category ||
              ""
            )
              .toLowerCase();

          return (
            title.includes(
              keyword
            ) ||
            description.includes(
              keyword
            ) ||
            category.includes(
              keyword
            )
          );

        }
      );

  }

  // ==========================================================
  // NO RESULTS
  // ==========================================================

  if (
    filtered.length ===
    0
  ) {

    noResults?.classList.add(
      "visible"
    );

    if (noResults) {
      noResults.style.display =
        "block";
    }

    return;

  }

  if (noResults) {
    noResults.style.display =
      "none";
  }

  // ==========================================================
  // CREATE CARDS
  // ==========================================================

  for (
    const video of filtered
  ) {

    const card =
      await createVideoCard(
        video
      );

    container.appendChild(
      card
    );

  }

}

// ============================================================
// CREATE VIDEO CARD
// ============================================================

async function createVideoCard(
  video
) {

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

  // ==========================================================
  // VIDEO KEY
  // ==========================================================

  const videoKey =
    video.videoKey ||
    video.fileKey ||
    video.r2Key ||
    video.storageKey ||
    "";

  // ==========================================================
  // THUMBNAIL
  // ==========================================================

  let thumbnailHTML = `
    <div
      style="
        font-size:2.5rem;
        color:#64748b;
      "
    >
      <i
        class="fa-solid fa-circle-play"
      ></i>
    </div>
  `;

  const thumbnailKey =
    video.thumbnailKey ||
    "";

  if (thumbnailKey) {

    const thumbnailURL =
      await getThumbnailURL(
        thumbnailKey
      );

    if (thumbnailURL) {

      thumbnailHTML = `
        <img
          src="${escapeHTML(
            thumbnailURL
          )}"
          alt="${escapeHTML(
            title
          )}"
          loading="lazy"
        >
      `;

    }

  }

  // ==========================================================
  // CARD HTML
  // ==========================================================

  card.innerHTML = `

    <div class="video-thumb">

      ${thumbnailHTML}

      <span
        class="video-duration"
      >
        ${escapeHTML(
          duration
        )}
      </span>

      ${
        !canAccess
          ? `
            <div class="lock-overlay">

              <i
                class="fa-solid fa-lock"
              ></i>

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
        ${escapeHTML(
          title
        )}
      </div>

      <div class="video-meta">

        <span>
          ${escapeHTML(
            category
          )}
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

  // ==========================================================
  // CLICK
  // ==========================================================

  if (canAccess) {

    card.addEventListener(
      "click",
      async () => {

        await openVideo(
          video
        );

      }
    );

  }

  return card;
}

// ============================================================
// OPEN VIDEO
// ============================================================

async function openVideo(
  video
) {

  // ----------------------------------------------------------
  // SECURITY CHECK
  // ----------------------------------------------------------

  if (
    video.premiumOnly === true &&
    !hasPremiumAccess
  ) {

    alert(
      "Premium membership is required to watch this video."
    );

    return;
  }

  // ----------------------------------------------------------
  // GET KEY
  // ----------------------------------------------------------

  const videoKey =
    video.videoKey ||
    video.fileKey ||
    video.r2Key ||
    video.storageKey ||
    "";

  if (!videoKey) {

    console.error(
      "Missing videoKey:",
      video
    );

    alert(
      "This video does not have an R2 file attached."
    );

    return;
  }

  console.log(
    "Opening video:",
    videoKey
  );

  try {

    // --------------------------------------------------------
    // GET R2 WORKER FILE URL
    // --------------------------------------------------------

    const videoURL =
      await getR2FileURL(
        videoKey
      );

    console.log(
      "Video URL received."
    );

    openVideoModal(
      videoURL,
      video.title ||
        "GTRADES-AXIS Video"
    );

  } catch (error) {

    console.error(
      "R2 VIDEO ERROR:",
      error
    );

    alert(
      "Unable to play this video.\n\n" +
      error.message
    );

  }

}

// ============================================================
// OPEN VIDEO MODAL
// ============================================================

function openVideoModal(
  url,
  title
) {

  if (!modal) {

    window.open(
      url,
      "_blank"
    );

    return;
  }

  modal.classList.add(
    "active"
  );

  document.body.style.overflow =
    "hidden";

  // ==========================================================
  // FIND EXISTING PLAYER
  // ==========================================================

  let videoPlayer =
    document.getElementById(
      "r2VideoPlayer"
    );

  // Support old ID if present
  if (!videoPlayer) {

    videoPlayer =
      document.getElementById(
        "r2Video"
      );

  }

  // ==========================================================
  // CREATE PLAYER IF NEEDED
  // ==========================================================

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

    const modalContent =
      modal.querySelector(
        ".modal-content"
      );

    if (!modalContent) {

      throw new Error(
        "Video modal content was not found."
      );

    }

    modalContent.appendChild(
      videoPlayer
    );

  }

  // ==========================================================
  // HIDE YOUTUBE IF PRESENT
  // ==========================================================

  const youtubeFrame =
    document.getElementById(
      "youtubeFrame"
    );

  if (youtubeFrame) {

    youtubeFrame.style.display =
      "none";

    youtubeFrame.src =
      "";

  }

  // ==========================================================
  // CONFIGURE PLAYER
  // ==========================================================

  videoPlayer.style.display =
    "block";

  videoPlayer.style.width =
    "100%";

  videoPlayer.style.height =
    "auto";

  videoPlayer.style.maxHeight =
    "80vh";

  videoPlayer.style.background =
    "#000";

  videoPlayer.setAttribute(
    "aria-label",
    title
  );

  // Remove old source
  videoPlayer.pause();

  videoPlayer.removeAttribute(
    "src"
  );

  videoPlayer.load();

  // Set new R2 source
  videoPlayer.src =
    url;

  videoPlayer.load();

  // ==========================================================
  // PLAY
  // ==========================================================

  videoPlayer.play()
    .catch(
      (error) => {

        console.warn(
          "Autoplay blocked. User can press play.",
          error
        );

      }
    );

}

// ============================================================
// CLOSE VIDEO
// ============================================================

function closeVideo() {

  const videoPlayer =
    document.getElementById(
      "r2VideoPlayer"
    ) ||
    document.getElementById(
      "r2Video"
    );

  if (videoPlayer) {

    videoPlayer.pause();

    videoPlayer.removeAttribute(
      "src"
    );

    videoPlayer.load();

  }

  const youtubeFrame =
    document.getElementById(
      "youtubeFrame"
    );

  if (youtubeFrame) {

    youtubeFrame.src =
      "";

    youtubeFrame.style.display =
      "none";

  }

  modal?.classList.remove(
    "active"
  );

  document.body.style.overflow =
    "";

}

// ============================================================
// CLOSE BUTTON
// ============================================================

closeModalButton?.addEventListener(
  "click",
  closeVideo
);

// ============================================================
// CLICK OUTSIDE MODAL
// ============================================================

modal?.addEventListener(
  "click",
  (event) => {

    if (
      event.target ===
      modal
    ) {

      closeVideo();

    }

  }
);

// ============================================================
// ESC KEY
// ============================================================

document.addEventListener(
  "keydown",
  (event) => {

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
  () => {

    renderVideos();

  }
);

// ============================================================
// CATEGORY FILTERS
// ============================================================

filterButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        filterButtons.forEach(
          (btn) => {

            btn.classList.remove(
              "active"
            );

          }
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

function showError(
  message
) {

  if (!container) {
    return;
  }

  container.innerHTML = `

    <div
      style="
        grid-column:1/-1;
        text-align:center;
        padding:50px 20px;
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
        ${escapeHTML(
          message
        )}
      </p>

    </div>

  `;

}