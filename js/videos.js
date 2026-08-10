// ============================================================
// GTRADES-AXIS™
// STUDENT VIDEO LIBRARY
// js/videos.js
// ============================================================

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


// ============================================================
// CLOUDFLARE R2
// ============================================================

const R2_WORKER =
  "https://r2-uploader.davidthuku574.workers.dev";


// ============================================================
// ELEMENTS
// ============================================================

const container =
  document.getElementById("videosContainer");

const searchInput =
  document.getElementById("searchInput");

const noResults =
  document.getElementById("noResultsMessage");

const player =
  document.getElementById("r2VideoPlayer");

const playerPlaceholder =
  document.getElementById("playerPlaceholder");

const currentVideoTitle =
  document.getElementById("currentVideoTitle");

const currentVideoDescription =
  document.getElementById("currentVideoDescription");

const videoCount =
  document.getElementById("videoCount");


// ============================================================
// STATE
// ============================================================

let videos = [];


// ============================================================
// START
// ============================================================

console.log(
  "========================================"
);

console.log(
  "GTRADES-AXIS STUDENT VIDEO SYSTEM"
);

console.log(
  "Starting..."
);

console.log(
  "Firebase DB:",
  db
);

console.log(
  "========================================"
);


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    console.log(
      "AUTH STATE:",
      user
    );

    if (!user) {

      console.log(
        "NO USER LOGGED IN"
      );

      if (container) {

        container.innerHTML = `
          <div class="loading-box">
            <i class="fa-solid fa-lock"></i>

            <div>
              <strong>
                Login required
              </strong>

              <span>
                Please log in to access the video library.
              </span>
            </div>
          </div>
        `;

      }

      return;
    }


    console.log(
      "LOGGED-IN USER:",
      user.uid
    );

    console.log(
      "EMAIL:",
      user.email
    );


    // ========================================================
    // LOAD VIDEOS DIRECTLY
    // ========================================================

    await loadVideos();

  }
);


// ============================================================
// LOAD VIDEOS
// ============================================================

async function loadVideos() {

  console.log(
    "========================================"
  );

  console.log(
    "READING FIRESTORE COLLECTION: videos"
  );

  console.log(
    "========================================"
  );


  try {

    if (container) {

      container.innerHTML = `
        <div class="loading-box">

          <i
            class="fa-solid fa-spinner fa-spin"
          ></i>

          <div>

            <strong>
              Loading videos...
            </strong>

            <span>
              Reading your GTRADES-AXIS™ video library.
            </span>

          </div>

        </div>
      `;

    }


    // ========================================================
    // THIS IS THE IMPORTANT PART
    // ========================================================

    const videosCollection =
      collection(
        db,
        "videos"
      );


    console.log(
      "COLLECTION REFERENCE:",
      videosCollection
    );


    const snapshot =
      await getDocs(
        videosCollection
      );


    console.log(
      "FIRESTORE SNAPSHOT:",
      snapshot
    );


    console.log(
      "DOCUMENT COUNT:",
      snapshot.size
    );


    videos = [];


    // ========================================================
    // READ EVERY DOCUMENT
    // ========================================================

    snapshot.forEach(
      (videoDoc) => {

        console.log(
          "VIDEO DOCUMENT:",
          videoDoc.id
        );

        console.log(
          "VIDEO DATA:",
          videoDoc.data()
        );


        videos.push({

          id:
            videoDoc.id,

          ...videoDoc.data()

        });

      }
    );


    console.log(
      "FINAL VIDEOS ARRAY:",
      videos
    );


    // ========================================================
    // COUNT
    // ========================================================

    if (videoCount) {

      videoCount.textContent =
        `${videos.length} ${
          videos.length === 1
            ? "video"
            : "videos"
        }`;

    }


    // ========================================================
    // RENDER
    // ========================================================

    renderVideos();


  } catch (error) {

    console.error(
      "========================================"
    );

    console.error(
      "FIRESTORE VIDEO ERROR"
    );

    console.error(
      error
    );

    console.error(
      "========================================"
    );


    if (container) {

      container.innerHTML = `

        <div class="loading-box">

          <i
            class="fa-solid fa-circle-exclamation"
            style="color:#ef4444"
          ></i>

          <div>

            <strong>
              Unable to load videos
            </strong>

            <span>
              ${escapeHTML(
                error.message
              )}
            </span>

          </div>

        </div>

      `;

    }

  }

}


// ============================================================
// RENDER
// ============================================================

function renderVideos() {

  console.log(
    "RENDERING:",
    videos.length,
    "VIDEOS"
  );


  if (!container) {

    console.error(
      "videosContainer DOES NOT EXIST"
    );

    return;

  }


  container.innerHTML = "";


  if (
    videos.length === 0
  ) {

    console.warn(
      "FIRESTORE RETURNED ZERO VIDEOS"
    );


    if (noResults) {

      noResults.style.display =
        "block";

    }


    container.innerHTML = `

      <div class="loading-box">

        <i
          class="fa-solid fa-video-slash"
        ></i>

        <div>

          <strong>
            No videos available
          </strong>

          <span>
            Firestore returned 0 documents from the "videos" collection.
          </span>

        </div>

      </div>

    `;

    return;

  }


  if (noResults) {

    noResults.style.display =
      "none";

  }


  // ==========================================================
  // SEARCH
  // ==========================================================

  const keyword =
    searchInput?.value
      ?.toLowerCase()
      .trim() || "";


  let filtered =
    [...videos];


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


          const category =
            String(
              video.category || ""
            ).toLowerCase();


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


  if (
    filtered.length === 0
  ) {

    if (noResults) {

      noResults.style.display =
        "block";

    }

    return;

  }


  // ==========================================================
  // CARDS
  // ==========================================================

  filtered.forEach(
    (video) => {

      const card =
        createVideoCard(
          video
        );

      container.appendChild(
        card
      );

    }
  );

}


// ============================================================
// CREATE CARD
// ============================================================

function createVideoCard(
  video
) {

  const card =
    document.createElement(
      "div"
    );


  card.className =
    "video-card";


  const title =
    video.title ||
    "Untitled Video";


  const category =
    video.category ||
    "General";


  const duration =
    video.duration ||
    "Video";


  const premium =
    video.premiumOnly === true;


  card.innerHTML = `

    <div class="video-thumb">

      <div
        class="thumb-icon"
      >

        <i
          class="fa-solid fa-circle-play"
        ></i>

      </div>

      <span
        class="video-duration"
      >
        ${escapeHTML(duration)}
      </span>

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


  // ==========================================================
  // CLICK
  // ==========================================================

  card.addEventListener(
    "click",
    () => {

      playVideo(
        video
      );

    }
  );


  return card;

}


// ============================================================
// PLAY R2 VIDEO
// ============================================================

async function playVideo(
  video
) {

  console.log(
    "========================================"
  );

  console.log(
    "SELECTED VIDEO:"
  );

  console.log(
    video
  );

  console.log(
    "========================================"
  );


  const key =
    video.videoKey ||
    video.fileKey ||
    video.r2Key ||
    video.storageKey ||
    "";


  console.log(
    "R2 KEY:",
    key
  );


  if (!key) {

    alert(
      "This video has no videoKey."
    );

    return;

  }


  try {

    const workerURL =
      new URL(
        R2_WORKER
      );


    workerURL.searchParams.set(
      "key",
      key
    );


    workerURL.searchParams.set(
      "action",
      "file"
    );


    console.log(
      "WORKER REQUEST:",
      workerURL.toString()
    );


    const response =
      await fetch(
        workerURL.toString(),
        {
          method:
            "GET",

          cache:
            "no-store"
        }
      );


    console.log(
      "WORKER STATUS:",
      response.status
    );


    const data =
      await response.json();


    console.log(
      "WORKER RESPONSE:",
      data
    );


    if (
      !response.ok ||
      !data.url
    ) {

      throw new Error(
        data.error ||
        "Worker did not return a video URL."
      );

    }


    // ========================================================
    // PLAYER
    // ========================================================

    if (!player) {

      alert(
        "r2VideoPlayer was not found in the HTML."
      );

      return;

    }


    player.pause();

    player.removeAttribute(
      "src"
    );

    player.load();


    player.src =
      data.url;


    player.style.display =
      "block";


    if (playerPlaceholder) {

      playerPlaceholder.style.display =
        "none";

    }


    if (currentVideoTitle) {

      currentVideoTitle.textContent =
        video.title ||
        "GTRADES-AXIS™ Video";

    }


    if (currentVideoDescription) {

      currentVideoDescription.textContent =
        video.description ||
        "GTRADES-AXIS™ trading lesson.";

    }


    player.load();


    try {

      await player.play();

    } catch (
      autoplayError
    ) {

      console.log(
        "Autoplay blocked. Press play."
      );

    }


    document
      .querySelector(
        ".player-section"
      )
      ?.scrollIntoView({
        behavior:
          "smooth"
      });


  } catch (error) {

    console.error(
      "R2 PLAY ERROR:",
      error
    );


    alert(
      "Unable to play video:\n\n" +
      error.message
    );

  }

}


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
// ESCAPE
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