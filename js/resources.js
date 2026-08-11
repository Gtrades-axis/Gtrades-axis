// ============================================================
// GTRADES-AXIS™
// PREMIUM RESOURCES PORTAL
// js/resources.js
//
// Works with:
//   Firestore collection: resources
//   Cloudflare R2 Worker
//
// Supports resource fields:
//   title
//   category
//   description
//   link
//   url
//   fileUrl
//   downloadUrl
//   fileKey
//   resourceKey
//   storageKey
//   r2Key
//   premiumOnly
//   premium
//   membership
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";

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
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {

  apiKey:
    "AIzaSyBZmsLm64PyEL9jifi32bpgvWfhluIWCZM",

  authDomain:
    "gtrades-axis.firebaseapp.com",

  projectId:
    "gtrades-axis",

  storageBucket:
    "gtrades-axis.firebasestorage.app",

  messagingSenderId:
    "111456545888",

  appId:
    "1:111456545888:web:f0526c142d7ea5e22fe705"

};


// ============================================================
// INITIALIZE
// ============================================================

const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);


// ============================================================
// CLOUDFLARE R2 WORKER
// ============================================================

const WORKER_URL =
  "https://r2-uploader.davidthuku574.workers.dev";


// ============================================================
// ELEMENTS
// ============================================================

const resourceGrid =
  document.getElementById("resourceGrid");

const searchInput =
  document.getElementById("searchInput");

const refreshBtn =
  document.getElementById("refreshBtn");

const filters =
  document.querySelectorAll(".filter");

const logoutBtn =
  document.getElementById("logoutBtn");

const accessChip =
  document.getElementById("accessChip");

const logoutBtn =
  document.getElementById("logoutBtn");

const filters =
  document.querySelectorAll(
    "#filters .filter"
  );

// ============================================================
// HELPERS
// ============================================================

let allResources = [];

let currentUser = null;

let currentMembership = "";

let currentCategory = "All";


// ============================================================
// HELPERS
// ============================================================

function safeString(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();

}


function escapeHTML(value) {

  return safeString(value)

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}

// ============================================================
// NORMALISE RESOURCE
//
// This is intentionally flexible so existing admin records
// don't need to be recreated.
// ============================================================

function normaliseResource(
  id,
  data
) {

  const resource = {

    id,

    ...data

  };


  const title =
    data.title ||
    data.name ||
    data.resourceTitle ||
    "Untitled Resource";


  const category =
    data.category ||
    data.type ||
    data.resourceType ||
    "General";


  const description =
    data.description ||
    data.details ||
    data.summary ||
    "GTRADES-AXIS™ trading resource.";


  const link =
    data.link ||
    data.url ||
    data.fileUrl ||
    data.downloadUrl ||
    data.externalUrl ||
    "";


  const fileKey =
    data.fileKey ||
    data.resourceKey ||
    data.storageKey ||
    data.r2Key ||
    data.objectKey ||
    data.key ||
    "";


  const premiumOnly =
    data.premiumOnly === true ||
    data.premium === true ||
    data.membership === "premium" ||
    data.access === "premium";


  return {

    ...resource,

    title,

    category,

    description,

    link,

    fileKey,

    premiumOnly

  };

}


// ============================================================
// R2 URL
// ============================================================

function buildR2URL(
  key
) {

  if (!key) {
    return "";
  }


  const url =
    new URL(R2_WORKER);


  url.searchParams.set(
    "key",
    key
  );


  url.searchParams.set(
    "action",
    "file"
  );


  return url.toString();

}


// ============================================================
// GET RESOURCE URL
// ============================================================

function getResourceURL(
  resource
) {

  // ----------------------------------------------------------
  // Existing direct URL
  // ----------------------------------------------------------

  if (resource.link) {

    return resource.link;

  }


  // ----------------------------------------------------------
  // Cloudflare R2
  // ----------------------------------------------------------

  if (resource.fileKey) {

    return buildR2URL(
      resource.fileKey
    );

  }


  return "";

}

// ============================================================
// MEMBERSHIP
// ============================================================

async function loadMembership(
  user
) {

  if (!user) {
    return "member";
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


    if (
      userSnap.exists()
    ) {

      const data =
        userSnap.data();


      console.log(
        "USER PROFILE:",
        data
      );


      // Your existing system uses membership.
      if (
        String(
          data.membership || ""
        )
          .toLowerCase()
          .trim() === "premium"
      ) {

        return "premium";

      }


      // Also support role/access systems.
      if (
        String(
          data.access || ""
        )
          .toLowerCase()
          .trim() === "premium"
      ) {

        return "premium";

      }


      if (
        String(
          data.plan || ""
        )
          .toLowerCase()
          .trim() === "premium"
      ) {

        return "premium";

      }


      if (
        data.premium === true ||
        data.isPremium === true
      ) {

        return "premium";

      }

    }


  }

  catch (error) {

    console.error(
      "MEMBERSHIP LOAD ERROR:",
      error
    );

  }


  return "member";

}


// ============================================================
// ACCESS CHIP
// ============================================================

function updateAccessChip() {

  if (!accessChip) {
    return;
  }


  if (
    currentMembership === "premium"
  ) {

    accessChip.classList.add(
      "premium"
    );


    accessChip.innerHTML = `
      <i class="fa-solid fa-crown"></i>
      Premium Access
    `;

  }

  else {

    accessChip.classList.remove(
      "premium"
    );


    accessChip.innerHTML = `
      <i class="fa-solid fa-shield-check"></i>
      Member Access
    `;

  }

}


// ============================================================
// LOAD RESOURCES
// ============================================================

async function loadResources() {

  showLoading();


  try {

    console.log(
      "GTRADES-AXIS: Loading resources..."
    );


    // --------------------------------------------------------
    // Try ordered query first.
    // --------------------------------------------------------

    try {

      const resourcesQuery =
        query(
          collection(
            db,
            "resources"
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        );


      snapshot =
        await getDocs(
          resourcesQuery
        );

    }

    catch (orderedError) {

      console.warn(
        "Ordered resources query failed. Loading normally.",
        orderedError
      );


      snapshot =
        await getDocs(
          collection(
            db,
            "resources"
          )
        );

    });


    // --------------------------------------------------------
    // Convert documents.
    // --------------------------------------------------------

    allResources = [];


    snapshot.forEach(
      resourceDoc => {

        const data =
          resourceDoc.data();


        console.log(
          "RESOURCE:",
          resourceDoc.id,
          data
        );


        allResources.push(
          normaliseResource(
            resourceDoc.id,
            data
          )
        );

      }
    );

    console.log(
      "TOTAL RESOURCES:",
      allResources.length
    );


    renderResources();


  }

  catch (error) {

    console.error(
      "FIRESTORE RESOURCE ERROR:",
      error
    );

    showError(
      error
    );
  }
}

// ============================================================
// RENDER
// ============================================================

function getFilteredResources() {

  const searchTerm =
    safeString(
      searchInput?.value
    )
      .toLowerCase();


  let filtered =
    [...allResources];


  // ----------------------------------------------------------
  // CATEGORY
  // ----------------------------------------------------------

  if (
    currentCategory !== "All"
  ) {

    filtered =
      filtered.filter(
        resource => {

          const category =
            safeString(
              resource.category
            )
              .toLowerCase();


          return (
            category ===
            currentCategory
              .toLowerCase()
          );

        }
      );

  }


  // ----------------------------------------------------------
  // SEARCH
  // ----------------------------------------------------------

  if (searchTerm) {

    filtered =
      filtered.filter(
        resource => {

          const searchable = [

            resource.title,

            resource.category,

            resource.description

          ]
            .map(
              value =>
                safeString(value)
                  .toLowerCase()
            )
            .join(" ");


          return searchable.includes(
            searchTerm
          );

        }
      );

  }


  // ----------------------------------------------------------
  // COUNT
  // ----------------------------------------------------------

  if (resourceCount) {

    resourceCount.textContent =
      `${filtered.length} resource${filtered.length === 1 ? "" : "s"}`;

  }


  // ----------------------------------------------------------
  // EMPTY
  // ----------------------------------------------------------

  if (
    filtered.length === 0
  ) {

    resourceGrid.innerHTML = `

      <div class="empty-state">

        <i class="fa-solid fa-folder-open"></i>

        <h3>
          No resources found
        </h3>

        <p>
          Try another search or category.
        </p>

      </div>
    `;

    return;
  }


  // ----------------------------------------------------------
  // CARDS
  // ----------------------------------------------------------

  resourceGrid.innerHTML =
    filtered
      .map(
        resource =>
          createResourceCard(
            resource
          )
      )
      .join("");


  // ----------------------------------------------------------
  // ACTION BUTTONS
  // ----------------------------------------------------------

  document
    .querySelectorAll(
      ".resource-action-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.id;


            const resource =
              allResources.find(
                item =>
                  item.id === id
              );


            if (resource) {

              openResource(
                resource
              );

            }

          }
        );

      }
    );

}


// ============================================================
// CREATE RESOURCE CARD
// ============================================================

function createResourceCard(resource) {

  const premium =
    resource.premiumOnly === true;


  const isPremiumUser =
    currentMembership === "premium";


  const locked =
    premium &&
    !isPremiumUser;


  const url =
    getResourceURL(
      resource
    );


  // ----------------------------------------------------------
  // ICON
  // ----------------------------------------------------------

  const icon =
    getResourceIcon(
      resource
    );


  // ----------------------------------------------------------
  // STORAGE STATUS
  // ----------------------------------------------------------

  let storageHTML = "";


  if (url) {

    storageHTML = `

      <div class="resource-storage">

        <i class="fa-solid fa-cloud-check"></i>

        Available

      </div>

    `;

  }

  else {

    storageHTML = `

      <div class="resource-storage unavailable">

        <i class="fa-solid fa-triangle-exclamation"></i>

        File unavailable

      </div>

    `;

  }


  // ----------------------------------------------------------
  // BUTTON
  // ----------------------------------------------------------

  let buttonHTML;


  if (locked) {

    buttonHTML = `

      <button
        class="download-btn locked-btn"
        disabled
      >

        <i class="fa-solid fa-lock"></i>

        Premium Resource

      </button>

    `;

  }

  else if (!url) {

    buttonHTML = `

      <button
        class="download-btn locked-btn"
        disabled
      >

        <i class="fa-solid fa-file-circle-xmark"></i>

        File Unavailable

      </button>

    `;

  }

  else {

    buttonHTML = `

      <button
        class="download-btn resource-action-btn"
        data-id="${escapeHTML(resource.id)}"
      >

        <i class="fa-solid fa-download"></i>

        Open Resource

      </button>

    `;

  }


  return `

    <article class="resource-card">

      <div class="resource-icon">

        <i class="${icon}"></i>

      </div>


      <div class="resource-top">

        <div class="resource-category">

          ${escapeHTML(
            resource.category
          )}

        </div>


        <div
          class="resource-badge ${
            premium
              ? "premium"
              : "free"
          }"
        >

          ${
            premium
              ? "PREMIUM"
              : "FREE"
          }

        </div>

      </div>


      <div class="resource-body">

        <h3>

          ${escapeHTML(
            resource.title
          )}

        </h3>


        <p>

          ${escapeHTML(
            resource.description
          )}

        </p>


        ${storageHTML}

      </div>


      <div class="resource-action">

        ${buttonHTML}

      </div>

    </article>

  `;

}


// ============================================================
// RESOURCE ICON
// ============================================================

function getResourceIcon(
  resource
) {

  const category =
    safeString(
      resource.category
    )
      .toLowerCase();


  const title =
    safeString(
      resource.title
    )
      .toLowerCase();


  if (
    category.includes("pdf") ||
    title.includes("pdf")
  ) {

    return "fa-solid fa-file-pdf";

  }


  if (
    category.includes("indicator")
  ) {

    return "fa-solid fa-chart-column";

  }


  if (
    category.includes("journal")
  ) {

    return "fa-solid fa-book";

  }


  if (
    category.includes("strategy")
  ) {

    return "fa-solid fa-chess-knight";

  }


  if (
    category.includes("video")
  ) {

    return "fa-solid fa-circle-play";

  }


  if (
    title.includes("risk")
  ) {

    return "fa-solid fa-shield-halved";

  }


  if (
    title.includes("trading plan")
  ) {

    return "fa-solid fa-clipboard-check";

  }


  return "fa-solid fa-file-lines";

}


// ============================================================
// OPEN RESOURCE
// ============================================================

function openResource(
  resource
) {

  // ----------------------------------------------------------
  // Premium protection
  // ----------------------------------------------------------

  if (
    resource.premiumOnly === true &&
    currentMembership !== "premium"
  ) {

    alert(
      "This is a Premium resource. Upgrade your membership to access it."
    );

    return;

  }


  const url =
    getResourceURL(
      resource
    );


  if (!url) {

    alert(
      "This resource does not have a valid file or link."
    );


    return;

  }


  console.log(
    "OPEN RESOURCE:",
    resource.title,
    url
  );


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}


// ============================================================
// LOADING
// ============================================================

function showLoading() {

  if (resourceCount) {

    resourceCount.textContent =
      "Loading...";

  }


  resourceGrid.innerHTML = `

    <div class="loading">

      <i class="fa-solid fa-circle-notch fa-spin"></i>

      <div>
        Loading your resources...
      </div>

    </div>

  `;

}


// ============================================================
// ERROR
// ============================================================

function showError(
  error
) {

  if (resourceCount) {

    resourceCount.textContent =
      "Error";

  }


  resourceGrid.innerHTML = `

    <div class="error-state">

      <i class="fa-solid fa-triangle-exclamation"></i>

      <h3>
        Unable to load resources
      </h3>

      <p>
        ${escapeHTML(
          error?.message ||
          "Please try again."
        )}
      </p>

      <button
        id="retryResourcesBtn"
      >
        <i class="fa-solid fa-rotate-right"></i>
        Try Again
      </button>

    </div>

  `;


  document
    .getElementById(
      "retryResourcesBtn"
    )
    ?.addEventListener(
      "click",
      loadResources
    );

}


// ============================================================
// CATEGORY FILTER
// ============================================================

searchInput?.addEventListener(
  "input",
  renderResources
);


// ============================================================
// FILTERS
// ============================================================

filters.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        filters.forEach(
          item =>
            item.classList.remove(
              "active"
            )
        );


        button.classList.add(
          "active"
        );


        currentCategory =
          button.dataset.category ||
          "All";


        renderResources();

      }
    );

  }
);


// ============================================================
// REFRESH
// ============================================================

refreshBtn?.addEventListener(
  "click",
  async () => {

    refreshBtn.disabled =
      true;


    const icon =
      refreshBtn.querySelector(
        "i"
      );


    icon?.classList.add(
      "fa-spin"
    );


      await loadResources();


    icon?.classList.remove(
      "fa-spin"
    );


    refreshBtn.disabled =
      false;

  }
);

// ============================================================
// FILTERS
// ============================================================

logoutBtn?.addEventListener(
  "click",
  async () => {

    try {

      await signOut(
        auth
      );


      window.location.href =
        "/login";

    }

    catch (error) {

      console.error(
        "LOGOUT ERROR:",
        error
      );


      alert(
        "Unable to logout. Please try again."
      );

    }

  }
);

// ============================================================
// ERROR
// ============================================================

onAuthStateChanged(
  auth,
  async user => {

    console.log(
      "RESOURCE AUTH:",
      user
    );


    // --------------------------------------------------------
    // Not logged in
    // --------------------------------------------------------

    if (!user) {

      window.location.href =
        "/login";


      return;

    }


    // --------------------------------------------------------
    // Save user
    // --------------------------------------------------------

    currentUser =
      user;


    // --------------------------------------------------------
    // Get membership
    // --------------------------------------------------------

    currentMembership =
      await loadMembership(
        user
      );


    console.log(
      "CURRENT MEMBERSHIP:",
      currentMembership
    );


    updateAccessChip();


    // --------------------------------------------------------
    // Load resources
    // --------------------------------------------------------

    await loadResources();

    } catch (error) {

      console.error(
        "AUTH INITIALIZATION ERROR:",
        error
      );

      showError(
        error?.message ||
        "Unable to initialize your account."
      );
    }
  }
);