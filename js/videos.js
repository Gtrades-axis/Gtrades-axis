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
// CONFIG
// ============================================================

const R2_WORKER =
  "https://r2-uploader.davidthuku574.workers.dev";


// ============================================================
// FIREBASE
// ============================================================

const auth =
  getAuth(app);

const db =
  getFirestore(app);


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

let activeCategory =
  "All";

let hasPremiumAccess =
  false;


// ============================================================
// BUILD R2 URL
// ============================================================

function buildR2URL(key) {

  if (!key) {
    throw new Error(
      "This video has no R2 key."
    );
  }

  return (
    `${R2_WORKER}/file?key=` +
    encodeURIComponent(key)
  );
}


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {
      window.location.href =
        "/login.html";
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
        await getDoc(
          userRef
        );

      if (userSnap.exists()) {

        const data =
          userSnap.data();

        hasPremiumAccess =
          data.membership === "premium" ||
          data.role === "admin" ||
          data.membership === "admin";
      }

    } catch (error) {

      console.error(
        "MEMBERSHIP ERROR:",
        error
      );
    }

    loadVideos();
  }
);


// ============================================================
// LOAD VIDEOS
// ============================================================

async function loadVideos() {

  if (!container)
    return;

  container.innerHTML = `
    <div class="status">
      Loading videos...
    </div>
  `;


  try {

    let snapshot;


    try {

      const q =
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
        await getDocs(q);

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

        const data =
          videoDoc.data();

        videos.push({
          id:
            videoDoc.id,
          ...data
        });

      }
    );


    renderVideos();


    // Automatically select first
    // video but don't force autoplay.
    if (videos.length) {
      openVideo(
        videos[0]
      );
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
// RENDER
// ============================================================

function renderVideos() {

  container.innerHTML = "";

  if (noResults) {
    noResults.style.display =
      "none";
  }


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
              video.title ||
              ""
            ).toLowerCase();

          const category =
            String(
              video.category ||
              ""
            ).toLowerCase();

          return (
            title.includes(keyword) ||
            category.includes(keyword)
          );
        }
      );
  }


  if (!filtered.length) {

    if (noResults) {
      noResults.style.display =
        "block";
    }

    return;
  }


  filtered.forEach(
    video => {

      container.appendChild(
        createVideoCard(
          video
        )
      );

    }
  );
}


// ============================================================
// CARD
// ============================================================

function createVideoCard(video) {

  const card =
    document.createElement(
      "div"
    );

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


  let thumbnail = "";


  if (video.thumbnailKey) {

    thumbnail =
      buildR2URL(
        video.thumbnailKey
      );

  } else if (
    video.thumbnailUrl
  ) {

    thumbnail =
      video.thumbnailUrl;

  } else if (
    video.thumbnail
  ) {

    thumbnail =
      video.thumbnail;
  }


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

function openVideo(video) {

  const videoKey =
    video.videoKey ||
    video.fileKey ||
    video.r2Key ||
    video.storageKey ||
    "";


  if (!videoKey) {

    showPlayerError(
      "This video has no R2 file attached."
    );

    return;
  }


  const videoURL =
    buildR2URL(
      videoKey
    );


  console.log(
    "PLAYING:",
    videoURL
  );


  if (nowPlayingTitle) {

    nowPlayingTitle.textContent =
      video.title ||
      "GTRADES-AXIS™ Video";
  }


  playerMessage?.classList.remove(
    "show"
  );


  player.pause();


  player.removeAttribute(
    "src"
  );


  player.load();


  player.src =
    videoURL;


  player.load();


  document
    .querySelector(
      ".player-panel"
    )
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });


  player.play()
    .catch(
      () => {
        // Browser autoplay may be blocked.
        // User can press play.
      }
    );
}


// ============================================================
// PLAYER ERROR
// ============================================================

player?.addEventListener(
  "error",
  () => {

    console.error(
      "HTML VIDEO ERROR:",
      player.error
    );

    showPlayerError(
      "Error playing video. Please try again."
    );
  }
);


// ============================================================
// SHOW ERROR
// ============================================================

function showPlayerError(message) {

  player.pause();

  player.removeAttribute(
    "src"
  );

  player.load();


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