import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import { app } from "./firebase.js";

// ============================================================
// GTRADES-AXIS™
// STUDENT VIDEO SYSTEM
// R2 PLAYBACK VERSION
// ============================================================

const R2_WORKER =
  "https://r2-uploader.davidthuku574.workers.dev";

// ============================================================
// FIREBASE
// ============================================================

const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================
// ELEMENTS
// ============================================================

const container =
  document.getElementById("videosContainer");

const noResults =
  document.getElementById("noResultsMessage");

const player =
  document.getElementById("r2VideoPlayer");

const playerMessage =
  document.getElementById("playerMessage");

const nowPlayingTitle =
  document.getElementById("nowPlayingTitle");

const searchInput =
  document.getElementById("videoSearch");

const filterButtons =
  document.querySelectorAll(".filter-btn");

// ============================================================
// STATE
// ============================================================

let videos = [];

let activeCategory = "All";

let hasPremiumAccess = false;

let currentVideoKey = "";

let currentObjectURL = null;

// ============================================================
// BUILD R2 URL
// ============================================================

function buildR2URL(key) {

  if (!key) {
    throw new Error(
      "This video has no R2 object key."
    );
  }

  return (
    `${R2_WORKER}/?key=` +
    encodeURIComponent(key)
  );
}

// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {
      window.location.href = "/login.html";
      return;
    }

    try {

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnap =
        await getDoc(userRef);

      if (userSnap.exists()) {

        const data =
          userSnap.data();

        hasPremiumAccess =
          data.membership === "premium" ||
          data.membership === "admin" ||
          data.role === "admin";
      }

    } catch (error) {

      console.error(
        "MEMBERSHIP ERROR:",
        error
      );

      hasPremiumAccess = false;
    }

    await loadVideos();
  }
);

// ============================================================
// LOAD VIDEOS
// ============================================================

async function loadVideos() {

  if (!container) {
    console.error(
      "videosContainer not found."
    );
    return;
  }

  container.innerHTML = `
    <div class="status">
      Loading videos...
    </div>
  `;

  try {

    let snapshot;

    // --------------------------------------------------------
    // TRY CREATED DATE FIRST
    // --------------------------------------------------------

    try {

      const q = query(
        collection(db, "videos"),
        orderBy("createdAt", "desc")
      );

      snapshot = await getDocs(q);

    } catch (orderError) {

      console.warn(
        "createdAt ordering failed. Loading normally.",
        orderError
      );

      snapshot = await getDocs(
        collection(db, "videos")
      );
    }

    videos = [];

    snapshot.forEach(
      (videoDoc) => {

        const data =
          videoDoc.data();

        videos.push({
          id: videoDoc.id,
          ...data
        });

      }
    );

    // --------------------------------------------------------
    // SORT LOCALLY IF CREATEDAT EXISTS
    // --------------------------------------------------------

    videos.sort(
      (a, b) => {

        const aTime =
          a.createdAt?.seconds ||
          0;

        const bTime =
          b.createdAt?.seconds ||
          0;

        return bTime - aTime;
      }
    );

    renderVideos();

    // --------------------------------------------------------
    // AUTO SELECT FIRST VIDEO
    // --------------------------------------------------------

    if (videos.length) {

      const firstAccessible =
        videos.find(
          (video) =>
            !video.premiumOnly ||
            hasPremiumAccess
        );

      if (firstAccessible) {

        openVideo(
          firstAccessible,
          false
        );
      }
    }

  } catch (error) {

    console.error(
      "VIDEO LOAD ERROR:",
      error
    );

    container.innerHTML = `
      <div class="status">
        Unable to load videos.
      </div>
    `;
  }
}

// ============================================================
// RENDER VIDEOS
// ============================================================

function renderVideos() {

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (noResults) {
    noResults.style.display = "none";
  }

  let filtered = [...videos];

  // ----------------------------------------------------------
  // CATEGORY
  // ----------------------------------------------------------

  if (activeCategory !== "All") {

    filtered =
      filtered.filter(
        (video) => {

          const category =
            String(
              video.category ||
              "General"
            )
              .toLowerCase()
              .trim();

          return (
            category ===
            activeCategory
              .toLowerCase()
              .trim()
          );
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
        (video) => {

          const title =
            String(
              video.title || ""
            )
              .toLowerCase();

          const category =
            String(
              video.category || ""
            )
              .toLowerCase();

          return (
            title.includes(keyword) ||
            category.includes(keyword)
          );
        }
      );
  }

  // ----------------------------------------------------------
  // EMPTY
  // ----------------------------------------------------------

  if (!filtered.length) {

    if (noResults) {
      noResults.style.display = "block";
    }

    return;
  }

  // ----------------------------------------------------------
  // CARDS
  // ----------------------------------------------------------

  filtered.forEach(
    (video) => {

      container.appendChild(
        createVideoCard(video)
      );

    }
  );
}

// ============================================================
// CREATE CARD
// ============================================================

function createVideoCard(video) {

  const card =
    document.createElement("div");

  const premium =
    video.premiumOnly === true;

  const canAccess =
    !premium ||
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

  // ----------------------------------------------------------
  // THUMBNAIL
  // ----------------------------------------------------------

  let thumbnail = "";

  if (video.thumbnailKey) {

    thumbnail =
      buildR2URL(
        video.thumbnailKey
      );

  } else if (video.thumbnailUrl) {

    thumbnail =
      video.thumbnailUrl;

  } else if (video.thumbnail) {

    thumbnail =
      video.thumbnail;
  }

  // ----------------------------------------------------------
  // CARD HTML
  // ----------------------------------------------------------

  card.innerHTML = `

    <div class="video-thumb">

      ${
        thumbnail
          ? `
            <img
              src="${escapeHTML(thumbnail)}"
              alt="${escapeHTML(title)}"
              loading="lazy"
              style="
                width:100%;
                height:100%;
                object-fit:cover;
              "
              onerror="
                this.style.display='none';
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
                font-size:40px;
              "
            >
              ▶
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
              🔒 Premium Only
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
            premium
              ? "badge-premium"
              : "badge-free"
          }"
        >
          ${
            premium
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
      () => {

        openVideo(
          video,
          true
        );

      }
    );
  }

  return card;
}

// ============================================================
// OPEN VIDEO
// ============================================================

function openVideo(
  video,
  scrollToPlayer = true
) {

  try {

    // --------------------------------------------------------
    // GET R2 KEY
    // --------------------------------------------------------

    const videoKey =
      video.videoKey ||
      video.fileKey ||
      video.r2Key ||
      video.storageKey ||
      "";

    if (!videoKey) {

      console.error(
        "VIDEO HAS NO KEY:",
        video
      );

      showPlayerError(
        "This video has no R2 file attached."
      );

      return;
    }

    // --------------------------------------------------------
    // BUILD REAL WORKER URL
    // --------------------------------------------------------

    const videoURL =
      buildR2URL(videoKey);

    currentVideoKey =
      videoKey;

    console.log(
      "GTRADES-AXIS™ PLAYING:",
      videoURL
    );

    // --------------------------------------------------------
    // TITLE
    // --------------------------------------------------------

    if (nowPlayingTitle) {

      nowPlayingTitle.textContent =
        video.title ||
        "GTRADES-AXIS™ Video";
    }

    // --------------------------------------------------------
    // HIDE ERROR
    // --------------------------------------------------------

    playerMessage?.classList.remove(
      "show"
    );

    // --------------------------------------------------------
    // STOP OLD VIDEO
    // --------------------------------------------------------

    if (player) {

      player.pause();

      player.removeAttribute(
        "src"
      );

      player.load();

      // ------------------------------------------------------
      // SET NEW VIDEO
      // ------------------------------------------------------

      player.src =
        videoURL;

      player.controls = true;

      player.preload =
        "metadata";

      player.playsInline =
        true;

      // ------------------------------------------------------
      // LOAD
      // ------------------------------------------------------

      player.load();
    }

    // --------------------------------------------------------
    // SCROLL
    // --------------------------------------------------------

    if (scrollToPlayer) {

      document
        .querySelector(".player-panel")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }

    // --------------------------------------------------------
    // DO NOT FORCE AUTOPLAY
    // --------------------------------------------------------

  } catch (error) {

    console.error(
      "OPEN VIDEO ERROR:",
      error
    );

    showPlayerError(
      error.message ||
      "Unable to open video."
    );
  }
}

// ============================================================
// PLAYER ERROR
// ============================================================

player?.addEventListener(
  "error",
  () => {

    const mediaError =
      player.error;

    console.error(
      "HTML VIDEO ERROR:",
      mediaError
    );

    if (!mediaError) {
      return;
    }

    let message =
      "Error playing video.";

    switch (
      mediaError.code
    ) {

      case 1:
        message =
          "Video playback was aborted.";
        break;

      case 2:
        message =
          "Network error while loading video.";
        break;

      case 3:
        message =
          "Video data could not be decoded.";
        break;

      case 4:
        message =
          "Video format or source is not supported.";
        break;
    }

    showPlayerError(
      message
    );
  }
);

// ============================================================
// PLAYER LOADING EVENTS
// ============================================================

player?.addEventListener(
  "loadedmetadata",
  () => {

    console.log(
      "VIDEO METADATA LOADED:",
      currentVideoKey
    );

    playerMessage?.classList.remove(
      "show"
    );
  }
);

player?.addEventListener(
  "canplay",
  () => {

    console.log(
      "VIDEO READY:",
      currentVideoKey
    );

    playerMessage?.classList.remove(
      "show"
    );
  }
);

// ============================================================
// PLAYER WAITING
// ============================================================

player?.addEventListener(
  "waiting",
  () => {

    console.log(
      "VIDEO BUFFERING..."
    );
  }
);

// ============================================================
// PLAYER PLAYING
// ============================================================

player?.addEventListener(
  "playing",
  () => {

    console.log(
      "VIDEO PLAYING:",
      currentVideoKey
    );
  }
);

// ============================================================
// SHOW PLAYER ERROR
// ============================================================

function showPlayerError(
  message
) {

  if (player) {

    player.pause();

    player.removeAttribute(
      "src"
    );

    player.load();
  }

  if (playerMessage) {

    playerMessage.textContent =
      message;

    playerMessage.classList.add(
      "show"
    );
  }
}

// ============================================================
// SEARCH
// ============================================================

searchInput?.addEventListener(
  "input",
  renderVideos
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
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

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
// OPTIONAL LOGOUT
// ============================================================

window.gtradesLogout =
  async function () {

    try {

      await signOut(auth);

      window.location.href =
        "/login.html";

    } catch (error) {

      console.error(
        "LOGOUT ERROR:",
        error
      );
    }
  };