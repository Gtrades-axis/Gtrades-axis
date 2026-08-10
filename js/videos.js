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
const filterButtons = document.querySelectorAll(".filter-btn");
const noResults = document.getElementById("noResultsMessage");
const logoutBtn = document.getElementById("logoutBtn");

const modal = document.getElementById("videoModal");
const closeModalButton = document.getElementById("closeModal");


// ============================================================
// STATE
// ============================================================

let videos = [];
let activeCategory = "All";

let currentUser = null;
let hasPremiumAccess = false;
let isAdmin = false;


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(auth, async (user) => {

  console.log("GTRADES-AXIS VIDEO AUTH:", user?.uid || "No user");

  if (!user) {

    window.location.href = "login.html";

    return;
  }

  currentUser = user;

  try {

    // --------------------------------------------------------
    // GET USER PROFILE
    // --------------------------------------------------------

    const userRef = doc(
      db,
      "users",
      user.uid
    );

    const userSnap = await getDoc(userRef);


    if (!userSnap.exists()) {

      console.error(
        "USER DOCUMENT NOT FOUND:",
        user.uid
      );

      showError(
        "Your account information could not be found."
      );

      return;
    }


    const userData = userSnap.data();


    console.log(
      "GTRADES-AXIS USER DATA:",
      userData
    );


    // --------------------------------------------------------
    // ACCESS LEVEL
    // --------------------------------------------------------

    isAdmin =
      userData.role === "admin";


    const isPremium =
      userData.membership === "premium";


    // ADMIN HAS SAME ACCESS AS PREMIUM
    hasPremiumAccess =
      isAdmin ||
      isPremium;


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
    // REMOVE LOADING
    // --------------------------------------------------------

    app?.classList.remove(
      "loading"
    );


    // --------------------------------------------------------
    // IMPORTANT
    // --------------------------------------------------------
    // DO NOT BLOCK ADMIN.
    //
    // Admin gets the same content access as premium members.
    // --------------------------------------------------------

    app?.classList.remove(
      "locked"
    );


    // --------------------------------------------------------
    // LOAD VIDEOS
    // --------------------------------------------------------

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
      "Unable to verify your account. Please refresh the page."
    );

  }

});


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

    console.error(
      "videosContainer not found."
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

      <i
        class="fa-solid fa-spinner fa-spin"
        style="
          font-size:2rem;
          margin-bottom:15px;
        "
      ></i>

      <p>
        Loading videos...
      </p>

    </div>

  `;


  try {

    // --------------------------------------------------------
    // FIRESTORE QUERY
    // --------------------------------------------------------

    const videosQuery = query(
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
      "GTRADES-AXIS videos loaded:",
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


  let filtered =
    [...videos];


  // ==========================================================
  // CATEGORY FILTER
  // ==========================================================

  if (
    activeCategory !== "All"
  ) {

    filtered =
      filtered.filter(
        (video) => {

          return (
            String(
              video.category || ""
            )
              .toLowerCase()
              ===
            String(
              activeCategory
            )
              .toLowerCase()
          );

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
              video.title || ""
            )
              .toLowerCase();


          const description =
            String(
              video.description || ""
            )
              .toLowerCase();


          return (
            title.includes(
              keyword
            )
            ||
            description.includes(
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


  // ----------------------------------------------------------
  // VIDEO ACCESS
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // BASIC DATA
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


  // ----------------------------------------------------------
  // R2 THUMBNAIL
  // ----------------------------------------------------------

  let thumbnailHTML =
    `<span>📹</span>`;


  const thumbnailKey =
    video.thumbnailKey ||
    "";


  if (thumbnailKey) {

    try {

      const thumbnailURL =
        await getDownloadUrl(
          thumbnailKey
        );


      thumbnailHTML = `

        <img
          src="${escapeHTML(
            thumbnailURL
          )}"
          alt="${escapeHTML(
            title
          )}"
        />

      `;


    } catch (error) {

      console.warn(
        "Thumbnail unavailable:",
        error
      );

    }

  }


  // ==========================================================
  // CARD HTML
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
          video,
          videoKey
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
      "Requesting R2 video:",
      videoKey
    );


    // --------------------------------------------------------
    // GET SIGNED R2 URL
    // --------------------------------------------------------

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
      (
        error?.message ||
        "Unknown error"
      )
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


  // ----------------------------------------------------------
  // HIDE OLD IFRAME
  // ----------------------------------------------------------

  const oldIframe =
    document.getElementById(
      "videoFrame"
    );


  if (oldIframe) {

    oldIframe.style.display =
      "none";

  }


  // ----------------------------------------------------------
  // FIND VIDEO PLAYER
  // ----------------------------------------------------------

  let videoPlayer =
    document.getElementById(
      "r2VideoPlayer"
    );


  // ----------------------------------------------------------
  // CREATE IF MISSING
  // ----------------------------------------------------------

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
        "Modal content not found."
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

  videoPlayer.src =
    url;


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

closeModalButton?.addEventListener(
  "click",
  closeVideo
);


// ============================================================
// CLOSE BY CLICKING OUTSIDE
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