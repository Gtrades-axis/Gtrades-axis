// ============================================================
// GTRADES-AXIS™
// js/videos.js
//
// MEMBER VIDEO LIBRARY
//
// FIRESTORE:
// stores video metadata + R2 keys
//
// R2:
// stores actual video files
//
// SECURITY:
// video URL is generated server-side only after
// Firebase Auth + membership verification.
// ============================================================

import { auth, db, functions } from "./firebase.js";

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
  httpsCallable
} from "firebase/functions";


// ============================================================
// DOM
// ============================================================

const loadingView =
  document.getElementById("loadingView");

const accessView =
  document.getElementById("accessView");

const contentView =
  document.getElementById("contentView");

const container =
  document.getElementById("videosContainer");

const searchInput =
  document.getElementById("searchInput");

const filterButtons =
  document.querySelectorAll(".filter-btn");

const logoutBtn =
  document.getElementById("logoutBtn");

const modal =
  document.getElementById("videoModal");

const closeModalBtn =
  document.getElementById("closeModal");

const videoPlayer =
  document.getElementById("r2VideoPlayer");


// ============================================================
// STATE
// ============================================================

let videos = [];

let activeCategory = "All";

let hasPremiumAccess = false;


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
// AUTH
// ============================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.href = "/login";

    return;
  }


  try {

    const userRef =
      doc(db, "users", user.uid);

    const userSnap =
      await getDoc(userRef);


    if (!userSnap.exists()) {

      showAccess();

      return;
    }


    const userData =
      userSnap.data();


    hasPremiumAccess =
      userData.role === "admin" ||
      userData.membership === "premium";


    if (!hasPremiumAccess) {

      showAccess();

      return;
    }


    loadingView.style.display =
      "none";

    accessView.classList.remove(
      "show"
    );

    contentView.style.display =
      "block";


    await loadVideos();

  } catch (error) {

    console.error(
      "VIDEO AUTH ERROR:",
      error
    );


    loadingView.style.display =
      "none";


    showError(
      "Unable to verify your membership."
    );

  }

});


// ============================================================
// ACCESS DENIED
// ============================================================

function showAccess() {

  loadingView.style.display =
    "none";

  contentView.style.display =
    "none";

  accessView.classList.add(
    "show"
  );

}


// ============================================================
// LOAD VIDEOS
// ============================================================

async function loadVideos() {

  container.innerHTML = `
    <div class="status-message">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Loading video library...</p>
    </div>
  `;


  try {

    let snapshot;


    try {

      const videosQuery =
        query(
          collection(db, "videos"),
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
      (videoDoc) => {

        videos.push({

          id: videoDoc.id,

          ...videoDoc.data()

        });

      }
    );


    renderVideos();

  } catch (error) {

    console.error(
      "VIDEO LOAD ERROR:",
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

  container.innerHTML = "";


  const keyword =
    searchInput?.value
      ?.toLowerCase()
      .trim() || "";


  let filtered =
    [...videos];


  // CATEGORY

  if (
    activeCategory !== "All"
  ) {

    filtered =
      filtered.filter(
        (video) =>
          String(
            video.category || ""
          ).toLowerCase() ===
          activeCategory.toLowerCase()
      );

  }


  // SEARCH

  if (keyword) {

    filtered =
      filtered.filter(
        (video) => {

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


  if (!filtered.length) {

    container.innerHTML = `
      <div class="status-message">
        No videos match your search.
      </div>
    `;

    return;
  }


  filtered.forEach(
    (video) => {

      const card =
        createVideoCard(video);

      container.appendChild(
        card
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


  const premiumOnly =
    video.premiumOnly === true;


  const canAccess =
    !premiumOnly ||
    hasPremiumAccess;


  card.className =
    "video-card" +
    (
      canAccess
        ? ""
        : " locked"
    );


  const title =
    video.title ||
    "Untitled Video";


  const category =
    video.category ||
    "General";


  const duration =
    video.duration ||
    "—";


  let thumbnail =
    `<i class="fa-solid fa-circle-play"></i>`;


  const thumbnailUrl =
    video.thumbnailUrl ||
    video.thumbnail ||
    "";


  if (
    thumbnailUrl &&
    /^https?:\/\//i.test(
      thumbnailUrl
    )
  ) {

    thumbnail =
      `
      <img
        src="${escapeHTML(thumbnailUrl)}"
        alt="${escapeHTML(title)}"
        loading="lazy"
      >
      `;

  }


  card.innerHTML = `

    <div class="video-thumb">

      ${thumbnail}

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
      () => {

        openVideo(
          video
        );

      }
    );

  }


  return card;

}


// ============================================================
// SECURE VIDEO ACCESS
//
// IMPORTANT:
//
// We do NOT expose the R2 object directly.
//
// The Firebase Callable Function:
//
// 1. verifies Firebase authentication
// 2. loads users/{uid}
// 3. checks membership
// 4. checks video permission
// 5. creates temporary signed R2 URL
//
// ============================================================

async function openVideo(video) {

  if (!video?.id) {

    alert(
      "Invalid video."
    );

    return;
  }


  try {

    showPlayerLoading();


    const getVideoUrl =
      httpsCallable(
        functions,
        "getVideoDownloadUrl"
      );


    const result =
      await getVideoUrl({

        videoId:
          video.id

      });


    const url =
      result?.data?.url;


    if (!url) {

      throw new Error(
        "No secure video URL was returned."
      );

    }


    videoPlayer.src =
      url;


    modal.classList.add(
      "active"
    );


    document.body.style.overflow =
      "hidden";


    videoPlayer.load();


    try {

      await videoPlayer.play();

    } catch (error) {

      console.warn(
        "Autoplay blocked:",
        error
      );

    }

  } catch (error) {

    console.error(
      "SECURE VIDEO ERROR:",
      error
    );


    closeVideo();


    alert(
      error?.message ||
      "You are not authorized to access this video."
    );

  }

}


// ============================================================
// PLAYER LOADING
// ============================================================

function showPlayerLoading() {

  modal.classList.add(
    "active"
  );

  document.body.style.overflow =
    "hidden";

}


// ============================================================
// CLOSE
// ============================================================

function closeVideo() {

  videoPlayer.pause();

  videoPlayer.removeAttribute(
    "src"
  );

  videoPlayer.load();


  modal.classList.remove(
    "active"
  );


  document.body.style.overflow =
    "";

}


closeModalBtn?.addEventListener(
  "click",
  closeVideo
);


modal?.addEventListener(
  "click",
  (event) => {

    if (
      event.target === modal
    ) {

      closeVideo();

    }

  }
);


document.addEventListener(
  "keydown",
  (event) => {

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
// LOGOUT
// ============================================================

logoutBtn?.addEventListener(
  "click",
  async () => {

    if (
      !confirm(
        "Logout of GTRADES-AXIS™?"
      )
    ) {

      return;
    }


    try {

      await signOut(auth);

      window.location.href =
        "/login";

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
// ERROR
// ============================================================

function showError(message) {

  container.innerHTML = `

    <div class="status-message">

      <i
        class="fa-solid fa-circle-exclamation"
        style="font-size:2rem;color:#ff4766;"
      ></i>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>

  `;

}