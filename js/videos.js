// ============================================================
// GTRADES-AXIS™ — VIDEOS
// js/videos.js
// R2 VIDEO SYSTEM
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
// R2 WORKER
// ============================================================

const R2_WORKER_URL =
  "https://gtrades-video-api.davidthuku574.workers.dev";

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

const closeModal =
  document.getElementById("closeModal");

// ============================================================
// STATE
// ============================================================

let videos = [];

let activeCategory = "All";

let hasPremiumAccess = false;

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

      const userSnap =
        await getDoc(
          doc(
            db,
            "users",
            user.uid
          )
        );

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

      app?.classList.remove(
        "loading"
      );

      // ------------------------------------------------------
      // FREE USER
      // ------------------------------------------------------

      if (!hasPremiumAccess) {

        app?.classList.add(
          "locked"
        );

        return;
      }

      // ------------------------------------------------------
      // PREMIUM / ADMIN
      // ------------------------------------------------------

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

    if (
      !confirm(
        "Logout?"
      )
    ) {
      return;
    }

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
// LOAD VIDEOS FROM FIRESTORE
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
      "
    >

      <i
        class="fa-solid fa-spinner fa-spin"
        style="
          font-size:2rem;
        "
      ></i>

      <p
        style="
          color:#94a3b8;
          margin-top:12px;
        "
      >
        Loading videos...
      </p>

    </div>

  `;

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

    const snapshot =
      await getDocs(
        videosQuery
      );

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
      "R2 videos loaded:",
      videos.length
    );

    await renderVideos();

  } catch (error) {

    console.error(
      "VIDEO FIRESTORE ERROR:",
      error
    );

    showError(
      "Unable to load videos. Check Firestore permissions."
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

  let filtered =
    [...videos];

  // ----------------------------------------------------------
  // CATEGORY
  // ----------------------------------------------------------

  if (
    activeCategory !==
    "All"
  ) {

    filtered =
      filtered.filter(
        (video) =>

          String(
            video.category ||
            ""
          ).toLowerCase() ===

          String(
            activeCategory
          ).toLowerCase()
      );

  }

  // ----------------------------------------------------------
  // SEARCH
  // ----------------------------------------------------------

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
            ).toLowerCase();

          const description =
            String(
              video.description ||
              ""
            ).toLowerCase();

          return (
            title.includes(
              keyword
            ) ||
            description.includes(
              keyword
            )
          );

        }
      );

  }

  // ----------------------------------------------------------
  // EMPTY
  // ----------------------------------------------------------

  if (
    filtered.length === 0
  ) {

    noResults?.classList.add(
      "visible"
    );

    return;
  }

  noResults?.classList.remove(
    "visible"
  );

  // ----------------------------------------------------------
  // CARDS
  // ----------------------------------------------------------

  for (
    const video
    of filtered
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
  // R2 KEYS
  // ==========================================================

  const videoKey =
    video.videoKey ||
    video.fileKey ||
    "";

  const thumbnailKey =
    video.thumbnailKey ||
    "";

  // ==========================================================
  // THUMBNAIL
  // ==========================================================

  let thumbnailHTML =
    `<span>📹</span>`;

  if (
    thumbnailKey
  ) {

    const thumbnailURL =
      getR2Url(
        thumbnailKey
      );

    thumbnailHTML = `

      <img
        src="${thumbnailURL}"
        alt="${escapeHTML(title)}"
        loading="lazy"
      />

    `;

  }

  // ==========================================================
  // CARD
  // ==========================================================

  card.innerHTML = `

    <div class="video-thumb">

      ${thumbnailHTML}

      <span class="video-duration">
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
          class="
            badge
            ${
              premiumOnly
                ? "badge-premium"
                : "badge-free"
            }
          "
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

  if (
    canAccess &&
    videoKey
  ) {

    card.addEventListener(
      "click",
      async () => {

        await openVideo(
          video,
          videoKey
        );

      }
    );

  }

  return card;

}

// ============================================================
// R2 PUBLIC URL
// ============================================================

function getR2Url(
  key
) {

  return (
    `${R2_WORKER_URL}/` +
    key
  );

}

// ============================================================
// OPEN R2 VIDEO
// ============================================================

async function openVideo(
  video,
  videoKey
) {

  if (!videoKey) {

    console.error(
      "Missing videoKey:",
      video
    );

    alert(
      "This video does not have an R2 file attached yet."
    );

    return;
  }

  try {

    const videoURL =
      getR2Url(
        videoKey
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
// VIDEO MODAL
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

  const oldIframe =
    document.getElementById(
      "videoFrame"
    );

  if (
    oldIframe
  ) {

    oldIframe.style.display =
      "none";

  }

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

    videoPlayer.autoplay =
      true;

    videoPlayer.playsInline =
      true;

    videoPlayer.style.width =
      "100%";

    videoPlayer.style.height =
      "100%";

    videoPlayer.style.objectFit =
      "contain";

    const modalContent =
      modal.querySelector(
        ".modal-content"
      );

    if (
      modalContent
    ) {

      modalContent.appendChild(
        videoPlayer
      );

    }

  }

  videoPlayer.src =
    url;

  videoPlayer.setAttribute(
    "aria-label",
    title
  );

  videoPlayer.load();

  videoPlayer.play()
    .catch(
      (error) => {

        console.warn(
          "Autoplay blocked:",
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
    );

  if (
    videoPlayer
  ) {

    videoPlayer.pause();

    videoPlayer.removeAttribute(
      "src"
    );

    videoPlayer.load();

  }

  modal?.classList.remove(
    "active"
  );

  document.body.style.overflow =
    "";

}

closeModal?.addEventListener(
  "click",
  closeVideo
);

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
// ESC
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
// FILTERS
// ============================================================

filterButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        filterButtons.forEach(
          (btn) =>

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

// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(
  value
) {

  return String(value)

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