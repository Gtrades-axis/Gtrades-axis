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

import {
  getDownloadUrl
} from "./upload.js";

// ============================================================
// ELEMENTS
// ============================================================

const app = document.getElementById("app");
const container = document.getElementById("videosContainer");
const searchInput = document.getElementById("searchInput");
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

onAuthStateChanged(auth, async (user) => {

  console.log(
    "GTRADES-AXIS: Auth state:",
    user ? user.uid : "NOT LOGGED IN"
  );

  if (!user) {

    window.location.href = "login.html";

    return;
  }

  try {

    // --------------------------------------------------------
    // GET USER DOCUMENT
    // --------------------------------------------------------

    const userRef =
      doc(db, "users", user.uid);

    const userSnap =
      await getDoc(userRef);

    if (!userSnap.exists()) {

      console.error(
        "User document does not exist."
      );

      hideLoading();

      showError(
        "Your account information could not be found."
      );

      return;
    }

    const userData =
      userSnap.data();

    console.log(
      "GTRADES-AXIS USER:",
      userData
    );

    // --------------------------------------------------------
    // ADMIN = PREMIUM ACCESS
    // --------------------------------------------------------

    const isAdmin =
      userData.role === "admin";

    const isPremium =
      userData.membership === "premium";

    hasPremiumAccess =
      isAdmin || isPremium;

    console.log(
      "ADMIN:",
      isAdmin
    );

    console.log(
      "PREMIUM:",
      isPremium
    );

    console.log(
      "VIDEO ACCESS:",
      hasPremiumAccess
    );

    // --------------------------------------------------------
    // IMPORTANT
    // NEVER LOCK THE WHOLE PAGE HERE
    // --------------------------------------------------------

    hideLoading();

    app?.classList.remove("loading");
    app?.classList.remove("locked");

    // --------------------------------------------------------
    // LOAD VIDEOS
    // --------------------------------------------------------

    await loadVideos();

  } catch (error) {

    console.error(
      "VIDEO AUTH ERROR:",
      error
    );

    hideLoading();

    showError(
      "Unable to verify your account. Please refresh the page."
    );
  }

});

// ============================================================
// REMOVE LOADING SCREEN
// ============================================================

function hideLoading() {

  if (app) {

    app.classList.remove(
      "loading"
    );

    app.classList.remove(
      "locked"
    );
  }

  // Remove any visible membership overlay
  const loadingElements =
    document.querySelectorAll(
      ".loading-screen, .membership-loading, .auth-loading"
    );

  loadingElements.forEach(
    element => {
      element.style.display = "none";
    }
  );

}

// ============================================================
// LOGOUT
// ============================================================

logoutBtn?.addEventListener(
  "click",
  async () => {

    if (!confirm("Logout?")) {
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

    console.error(
      "videosContainer was not found."
    );

    return;
  }

  container.innerHTML = `
    <div
      style="
        grid-column:1/-1;
        text-align:center;
        padding:50px 20px;
        color:#94a3b8;
      "
    >
      Loading videos...
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
      videoDoc => {

        videos.push({
          id: videoDoc.id,
          ...videoDoc.data()
        });

      }
    );

    console.log(
      "GTRADES-AXIS videos loaded:",
      videos.length
    );

    console.log(
      "VIDEO DATA:",
      videos
    );

    renderVideos();

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
    activeCategory !== "All"
  ) {

    filtered =
      filtered.filter(
        video => {

          return String(
            video.category || ""
          ).toLowerCase() ===
          String(
            activeCategory
          ).toLowerCase();

        }
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
        video => {

          const title =
            String(
              video.title || ""
            ).toLowerCase();

          const description =
            String(
              video.description || ""
            ).toLowerCase();

          return (
            title.includes(keyword) ||
            description.includes(keyword)
          );

        }
      );
  }

  // ----------------------------------------------------------
  // NO RESULTS
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
  // CREATE CARDS
  // ----------------------------------------------------------

  for (
    const video of filtered
  ) {

    try {

      const card =
        await createVideoCard(
          video
        );

      container.appendChild(
        card
      );

    } catch (error) {

      console.error(
        "VIDEO CARD ERROR:",
        error,
        video
      );

    }

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

  // ----------------------------------------------------------
  // ACCESS
  // ----------------------------------------------------------

  const premiumOnly =
    video.premiumOnly === true;

  const canAccess =
    !premiumOnly ||
    hasPremiumAccess;

  // ----------------------------------------------------------
  // CARD CLASS
  // ----------------------------------------------------------

  card.className =
    `video-card${
      canAccess
        ? ""
        : " locked"
    }`;

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  const title =
    video.title ||
    "Untitled Video";

  const category =
    video.category ||
    "General";

  const duration =
    video.duration ||
    "—";

  // ----------------------------------------------------------
  // R2 VIDEO KEY
  // ----------------------------------------------------------

  const videoKey =
    video.videoKey ||
    video.fileKey ||
    "";

  console.log(
    "VIDEO CARD:",
    title,
    "KEY:",
    videoKey,
    "ACCESS:",
    canAccess
  );

  // ----------------------------------------------------------
  // THUMBNAIL
  // ----------------------------------------------------------

  let thumbnailHTML =
    `
      <div
        style="
          width:100%;
          height:100%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:45px;
        "
      >
        ▶
      </div>
    `;

  const thumbnailKey =
    video.thumbnailKey ||
    "";

  if (thumbnailKey) {

    try {

      const thumbnailURL =
        await getDownloadUrl(
          thumbnailKey
        );

      thumbnailHTML =
        `
          <img
            src="${thumbnailURL}"
            alt="${escapeHTML(title)}"
          />
        `;

    } catch (error) {

      console.warn(
        "Thumbnail unavailable:",
        error
      );

    }
  }

  // ----------------------------------------------------------
  // CARD HTML
  // ----------------------------------------------------------

  card.innerHTML = `

    <div class="video-thumb">

      ${thumbnailHTML}

      <span class="video-duration">
        ${escapeHTML(duration)}
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

  // ----------------------------------------------------------
  // CLICK
  // ----------------------------------------------------------

  if (canAccess) {

    card.addEventListener(
      "click",
      async () => {

        console.log(
          "Opening video:",
          videoKey
        );

        await openVideo(
          video,
          videoKey
        );

      }
    );

  } else {

    card.addEventListener(
      "click",
      () => {

        alert(
          "This video is available to Premium members only."
        );

      }
    );

  }

  return card;
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

    console.log(
      "Requesting R2 signed URL:",
      videoKey
    );

    const signedURL =
      await getDownloadUrl(
        videoKey
      );

    console.log(
      "R2 signed URL received."
    );

    openVideoModal(
      signedURL,
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

    console.error(
      "videoModal was not found."
    );

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

  // ----------------------------------------------------------
  // GET VIDEO PLAYER
  // ----------------------------------------------------------

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

    videoPlayer.style.height =
      "100%";

    videoPlayer.style.objectFit =
      "contain";

    const modalContent =
      modal.querySelector(
        ".modal-content"
      );

    if (!modalContent) {

      console.error(
        "modal-content not found."
      );

      return;
    }

    modalContent.appendChild(
      videoPlayer
    );
  }

  // ----------------------------------------------------------
  // SET VIDEO
  // ----------------------------------------------------------

  videoPlayer.pause();

  videoPlayer.src = "";

  videoPlayer.load();

  videoPlayer.src = url;

  videoPlayer.setAttribute(
    "aria-label",
    title
  );

  videoPlayer.load();

  // ----------------------------------------------------------
  // PLAY
  // ----------------------------------------------------------

  videoPlayer.play()
    .catch(
      error => {

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
    );

  if (videoPlayer) {

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

// ============================================================
// CLOSE BUTTON
// ============================================================

closeModal?.addEventListener(
  "click",
  closeVideo
);

// ============================================================
// CLICK OUTSIDE MODAL
// ============================================================

modal?.addEventListener(
  "click",
  event => {

    if (
      event.target === modal
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
  event => {

    if (
      event.key === "Escape"
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
  button => {

    button.addEventListener(
      "click",
      () => {

        filterButtons.forEach(
          btn => {

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
        ${escapeHTML(message)}
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