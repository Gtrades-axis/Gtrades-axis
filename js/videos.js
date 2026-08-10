// ============================================================
// GTRADES-AXIS™ — PREMIUM VIDEOS
// js/videos.js
//
// FLOW:
// ADMIN → uploads video to Cloudflare R2
// FIRESTORE → stores video metadata + videoKey
// MEMBER → authenticated + premium/admin
// MEMBER → requests temporary R2 download URL
// VIDEO → plays through HTML5 video player
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

import {
  getDownloadUrl
} from "./upload.js";


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

    // --------------------------------------------------------
    // NOT LOGGED IN
    // --------------------------------------------------------

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }


    // --------------------------------------------------------
    // CHECK USER
    // --------------------------------------------------------

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


      // ------------------------------------------------------
      // PREMIUM ACCESS
      // ------------------------------------------------------

      hasPremiumAccess =
        userData.role === "admin" ||
        userData.membership === "premium";


      app?.classList.remove(
        "loading"
      );


      // ------------------------------------------------------
      // NON-PREMIUM
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
// LOAD VIDEOS
// ============================================================

async function loadVideos() {

  if (!container) {

    return;
  }


  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------

  container.innerHTML = `

    <div
      class="status-message"
      style="
        grid-column:1/-1;
        text-align:center;
      "
    >

      <i
        class="fa-solid fa-spinner fa-spin"
        style="
          font-size:2rem;
          margin-bottom:12px;
        "
      ></i>

      <p>
        Loading videos...
      </p>

    </div>

  `;


  try {

    let snapshot;


    // --------------------------------------------------------
    // TRY SORTED QUERY
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

    } catch (queryError) {

      console.warn(
        "Ordered video query failed. Loading normally.",
        queryError
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
      "GTRADES-AXIS videos loaded:",
      videos.length
    );


    await renderVideos();

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


  if (noResults) {

    noResults.style.display =
      "none";

  }


  // ----------------------------------------------------------
  // SEARCH KEYWORD
  // ----------------------------------------------------------

  const keyword =
    searchInput?.value
      ?.toLowerCase()
      .trim() || "";


  // ----------------------------------------------------------
  // FILTER
  // ----------------------------------------------------------

  let filtered =
    videos.filter(
      (video) => {

        const videoCategory =
          String(
            video.category ||
            "General"
          );


        const categoryMatches =
          activeCategory === "All" ||
          videoCategory.toLowerCase() ===
            activeCategory.toLowerCase();


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


        const searchMatches =
          !keyword ||
          title.includes(keyword) ||
          description.includes(keyword);


        return (
          categoryMatches &&
          searchMatches
        );

      }
    );


  // ----------------------------------------------------------
  // NO RESULTS
  // ----------------------------------------------------------

  if (
    filtered.length === 0
  ) {

    if (noResults) {

      noResults.style.display =
        "block";

      noResults.classList.add(
        "visible"
      );

    }

    return;
  }


  // ----------------------------------------------------------
  // CREATE CARDS
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // ACCESS
  // ----------------------------------------------------------

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
  // IMPORTANT:
  // FIRESTORE STORES THE R2 KEY
  //
  // Example:
  // videos/1786376346686_Market_straucture.mp4
  // ----------------------------------------------------------

  const videoKey =
    video.videoKey ||
    video.fileKey ||
    video.r2Key ||
    video.storageKey ||
    "";


  // ----------------------------------------------------------
  // THUMBNAIL
  // ----------------------------------------------------------

  let thumbnailHTML = `

    <i
      class="fa-solid fa-circle-play"
      style="
        font-size:2.5rem;
      "
    ></i>

  `;


  const thumbnailKey =
    video.thumbnailKey ||
    "";


  if (
    thumbnailKey
  ) {

    try {

      let thumbnailURL;


      // Already a complete URL
      if (
        /^https?:\/\//i.test(
          thumbnailKey
        )
      ) {

        thumbnailURL =
          thumbnailKey;

      } else {

        thumbnailURL =
          await getDownloadUrl(
            thumbnailKey
          );

      }


      if (
        thumbnailURL
      ) {

        thumbnailHTML = `

          <img
            src="${escapeHTML(
              thumbnailURL
            )}"
            alt="${escapeHTML(
              title
            )}"
            loading="lazy"
          />

        `;

      }

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


  // ----------------------------------------------------------
  // CLICK ONLY IF ACCESSIBLE
  // ----------------------------------------------------------

  if (
    canAccess
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
// OPEN VIDEO
// ============================================================

async function openVideo(
  video,
  videoKey
) {

  // ----------------------------------------------------------
  // CHECK KEY
  // ----------------------------------------------------------

  if (
    !videoKey
  ) {

    console.error(
      "Missing videoKey:",
      video
    );


    alert(
      "This video does not have an R2 file attached yet."
    );


    return;
  }


  // ----------------------------------------------------------
  // CHECK PREMIUM AGAIN
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


  try {

    console.log(
      "Requesting R2 URL for:",
      videoKey
    );


    // --------------------------------------------------------
    // GET TEMPORARY R2 URL
    // --------------------------------------------------------

    const signedURL =
      await getDownloadUrl(
        videoKey
      );


    if (
      !signedURL
    ) {

      throw new Error(
        "No download URL was returned."
      );

    }


    console.log(
      "R2 signed URL received."
    );


    // --------------------------------------------------------
    // OPEN PLAYER
    // --------------------------------------------------------

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

    window.open(
      url,
      "_blank"
    );

    return;
  }


  // ----------------------------------------------------------
  // FIND PLAYER
  // ----------------------------------------------------------

  let videoPlayer =
    document.getElementById(
      "r2VideoPlayer"
    );


  // ----------------------------------------------------------
  // CREATE PLAYER IF MISSING
  // ----------------------------------------------------------

  if (
    !videoPlayer
  ) {

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


  // ----------------------------------------------------------
  // HIDE OTHER PLAYERS
  // ----------------------------------------------------------

  const iframe =
    document.getElementById(
      "videoFrame"
    );


  if (
    iframe
  ) {

    iframe.style.display =
      "none";

  }


  const youtubeFrame =
    document.getElementById(
      "youtubeFrame"
    );


  if (
    youtubeFrame
  ) {

    youtubeFrame.style.display =
      "none";

    youtubeFrame.src =
      "";

  }


  // ----------------------------------------------------------
  // STYLE PLAYER
  // ----------------------------------------------------------

  videoPlayer.style.display =
    "block";


  videoPlayer.style.width =
    "100%";


  videoPlayer.style.height =
    "100%";


  videoPlayer.style.objectFit =
    "contain";


  // ----------------------------------------------------------
  // ACCESSIBILITY
  // ----------------------------------------------------------

  videoPlayer.setAttribute(
    "aria-label",
    title
  );


  // ----------------------------------------------------------
  // LOAD VIDEO
  // ----------------------------------------------------------

  videoPlayer.pause();


  videoPlayer.removeAttribute(
    "src"
  );


  videoPlayer.load();


  videoPlayer.src =
    url;


  // ----------------------------------------------------------
  // SHOW MODAL
  // ----------------------------------------------------------

  modal.classList.add(
    "active"
  );


  document.body.style.overflow =
    "hidden";


  videoPlayer.load();


  // ----------------------------------------------------------
  // PLAY
  // ----------------------------------------------------------

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


  const youtubeFrame =
    document.getElementById(
      "youtubeFrame"
    );


  if (
    youtubeFrame
  ) {

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

closeModal?.addEventListener(
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
// READY
// ============================================================

console.log(
  "✅ GTRADES-AXIS™ Premium Videos loaded."
);