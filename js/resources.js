// ============================================================
// GTRADES-AXIS™
// PREMIUM RESOURCES
// js/resources.js
//
// FIREBASE:
//   - Authentication
//   - Firestore metadata
//
// STORAGE:
//   - Cloudflare R2
//   - Same Worker delivery route used by Videos
//
// IMPORTANT:
// Resource files are NOT stored in Firestore.
// Firestore stores the R2 object key.
// ============================================================

import { auth, db } from "./firebase.js";

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
// CONFIG
// ============================================================

const R2_WORKER =
  "https://r2-uploader.davidthuku574.workers.dev";

// ============================================================
// DOM
// ============================================================

const grid =
  document.getElementById("resourceGrid");

const searchInput =
  document.getElementById("searchInput");

const refreshBtn =
  document.getElementById("refreshBtn");

const resourceCount =
  document.getElementById("resourceCount");

const filters =
  document.querySelectorAll(".filter");

const logoutBtn =
  document.getElementById("logoutBtn");

const accessChip =
  document.getElementById("accessChip");

// ============================================================
// STATE
// ============================================================

let resources = [];

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
// AUTH
// ============================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.href = "/login.html";

    return;
  }

  try {

    // --------------------------------------------------------
    // GET USER PROFILE
    // --------------------------------------------------------

    const userRef =
      doc(db, "users", user.uid);

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

    // --------------------------------------------------------
    // PREMIUM ACCESS
    // --------------------------------------------------------

    hasPremiumAccess =
      userData.role === "admin" ||
      userData.membership === "premium";

    // --------------------------------------------------------
    // ACCESS CHIP
    // --------------------------------------------------------

    if (accessChip) {

      if (hasPremiumAccess) {

        accessChip.innerHTML = `
          <i class="fa-solid fa-shield-check"></i>
          Premium Access
        `;

        accessChip.classList.add("premium");

      } else {

        accessChip.innerHTML = `
          <i class="fa-solid fa-user"></i>
          Member Access
        `;

        accessChip.classList.remove("premium");
      }
    }

    // --------------------------------------------------------
    // LOAD RESOURCES
    // --------------------------------------------------------

    await loadResources();

  } catch (error) {

    console.error(
      "GTRADES-AXIS RESOURCE AUTH ERROR:",
      error
    );

    showError(
      "Unable to load your resources."
    );
  }

});

// ============================================================
// LOAD RESOURCES
// ============================================================

async function loadResources() {

  if (!grid) {

    console.error(
      "resourceGrid not found."
    );

    return;
  }

  grid.innerHTML = `
    <div class="loading">

      <i class="fa-solid fa-circle-notch fa-spin"></i>

      <div>
        Loading your resources...
      </div>

    </div>
  `;

  try {

    let snapshot;

    // --------------------------------------------------------
    // TRY CREATED DATE ORDER
    // --------------------------------------------------------

    try {

      const resourcesQuery =
        query(
          collection(db, "resources"),
          orderBy("createdAt", "desc")
        );

      snapshot =
        await getDocs(resourcesQuery);

    } catch (orderError) {

      console.warn(
        "createdAt ordering failed. Loading normally.",
        orderError
      );

      snapshot =
        await getDocs(
          collection(db, "resources")
        );
    }

    // --------------------------------------------------------
    // BUILD RESOURCE ARRAY
    // --------------------------------------------------------

    resources = [];

    snapshot.forEach((resourceDoc) => {

      resources.push({

        id: resourceDoc.id,

        ...resourceDoc.data()

      });

    });

    // --------------------------------------------------------
    // LOCAL SORT
    // --------------------------------------------------------

    resources.sort((a, b) => {

      const aTime =
        getTimestampValue(a.createdAt);

      const bTime =
        getTimestampValue(b.createdAt);

      return bTime - aTime;

    });

    console.log(
      "GTRADES-AXIS™ RESOURCES:",
      resources
    );

    renderResources();

  } catch (error) {

    console.error(
      "LOAD RESOURCES ERROR:",
      error
    );

    showError(
      "Unable to load resources."
    );
  }

}

// ============================================================
// FIRESTORE TIMESTAMP HELPER
// ============================================================

function getTimestampValue(timestamp) {

  if (!timestamp) {
    return 0;
  }

  // Firestore Timestamp
  if (
    typeof timestamp === "object" &&
    typeof timestamp.seconds === "number"
  ) {

    return timestamp.seconds * 1000;
  }

  // JavaScript Date
  if (timestamp instanceof Date) {

    return timestamp.getTime();
  }

  // Number
  if (typeof timestamp === "number") {

    return timestamp;
  }

  return 0;
}

// ============================================================
// RENDER RESOURCES
// ============================================================

function renderResources() {

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  let filtered =
    [...resources];

  // ==========================================================
  // CATEGORY FILTER
  // ==========================================================

  if (activeCategory !== "All") {

    filtered =
      filtered.filter((resource) => {

        const category =
          String(
            resource.category ||
            "General"
          )
            .toLowerCase()
            .trim();

        const selectedCategory =
          activeCategory
            .toLowerCase()
            .trim();

        // ----------------------------------------------------
        // PDF HANDLING
        // ----------------------------------------------------

        if (
          selectedCategory === "pdfs"
        ) {

          return (
            category === "pdf" ||
            category === "pdfs" ||
            String(
              resource.type || ""
            )
              .toLowerCase()
              .includes("pdf")
          );
        }

        // ----------------------------------------------------
        // NORMAL CATEGORY
        // ----------------------------------------------------

        return (
          category === selectedCategory
        );

      });

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
      filtered.filter((resource) => {

        const title =
          String(
            resource.title || ""
          )
            .toLowerCase();

        const description =
          String(
            resource.description || ""
          )
            .toLowerCase();

        const category =
          String(
            resource.category || ""
          )
            .toLowerCase();

        const type =
          String(
            resource.type || ""
          )
            .toLowerCase();

        return (
          title.includes(keyword) ||
          description.includes(keyword) ||
          category.includes(keyword) ||
          type.includes(keyword)
        );

      });

  }

  // ==========================================================
  // COUNT
  // ==========================================================

  if (resourceCount) {

    resourceCount.textContent =
      `${filtered.length} resource${
        filtered.length === 1
          ? ""
          : "s"
      }`;

  }

  // ==========================================================
  // EMPTY
  // ==========================================================

  if (!filtered.length) {

    grid.innerHTML = `

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

  // ==========================================================
  // CREATE CARDS
  // ==========================================================

  filtered.forEach((resource) => {

    const card =
      createResourceCard(resource);

    grid.appendChild(card);

  });

}

// ============================================================
// CREATE RESOURCE CARD
// ============================================================

function createResourceCard(resource) {

  const card =
    document.createElement("div");

  // ==========================================================
  // PREMIUM ACCESS
  // ==========================================================

  const premiumOnly =
    resource.premiumOnly === true ||
    resource.access === "premium" ||
    resource.status === "premium";

  const canAccess =
    !premiumOnly ||
    hasPremiumAccess;

  card.className =
    `resource-card${
      canAccess
        ? ""
        : " locked"
    }`;

  // ==========================================================
  // RESOURCE DATA
  // ==========================================================

  const title =
    resource.title ||
    "Untitled Resource";

  const category =
    resource.category ||
    "General";

  const description =
    resource.description ||
    "GTRADES-AXIS™ trading resource.";

  const type =
    String(
      resource.type ||
      category ||
      "PDF"
    ).toUpperCase();

  // ==========================================================
  // CARD HTML
  // ==========================================================

  card.innerHTML = `

    <div class="resource-icon">

      <i class="fa-solid ${getIcon(type)}"></i>

    </div>

    <div class="resource-top">

      <div class="resource-category">
        ${escapeHTML(category)}
      </div>

      <div
        class="resource-badge ${
          premiumOnly
            ? "premium"
            : "free"
        }"
      >
        ${
          premiumOnly
            ? "Premium"
            : "Free"
        }
      </div>

    </div>

    <div class="resource-body">

      <h3>
        ${escapeHTML(title)}
      </h3>

      <p>
        ${escapeHTML(description)}
      </p>

    </div>

    <div class="resource-storage">

      <i class="fa-solid fa-cloud"></i>

      Cloudflare R2

    </div>

    <div class="resource-action">

      ${
        premiumOnly && !hasPremiumAccess

          ? `

            <button
              class="download-btn locked-btn"
              type="button"
            >

              <i class="fa-solid fa-lock"></i>

              Premium Required

            </button>

          `

          : `

            <button
              class="download-btn download-resource"
              type="button"
            >

              <i class="fa-solid fa-download"></i>

              Download

            </button>

          `
      }

    </div>

  `;

  // ==========================================================
  // DOWNLOAD BUTTON
  // ==========================================================

  const button =
    card.querySelector(
      ".download-resource"
    );

  if (button) {

    button.addEventListener(
      "click",
      () => {

        downloadResource(
          resource,
          button
        );

      }
    );

  }

  // ==========================================================
  // LOCKED BUTTON
  // ==========================================================

  const lockedButton =
    card.querySelector(
      ".locked-btn"
    );

  if (lockedButton) {

    lockedButton.addEventListener(
      "click",
      () => {

        alert(
          "Premium membership is required to access this resource."
        );

      }
    );

  }

  return card;
}

// ============================================================
// ICON
// ============================================================

function getIcon(type) {

  if (
    type.includes("PDF")
  ) {

    return "fa-file-pdf";
  }

  if (
    type.includes("INDICATOR")
  ) {

    return "fa-chart-line";
  }

  if (
    type.includes("JOURNAL")
  ) {

    return "fa-book";
  }

  if (
    type.includes("STRATEG")
  ) {

    return "fa-bullseye";
  }

  if (
    type.includes("VIDEO")
  ) {

    return "fa-circle-play";
  }

  if (
    type.includes("EXCEL") ||
    type.includes("XLS")
  ) {

    return "fa-file-excel";
  }

  if (
    type.includes("WORD") ||
    type.includes("DOC")
  ) {

    return "fa-file-word";
  }

  if (
    type.includes("ZIP")
  ) {

    return "fa-file-zipper";
  }

  if (
    type.includes("IMAGE") ||
    type.includes("PNG") ||
    type.includes("JPG")
  ) {

    return "fa-file-image";
  }

  return "fa-file";
}

// ============================================================
// GET R2 KEY
// ============================================================
//
// Supports all existing Firestore field names.
//
// Recommended:
//   resourceKey: "resources/example.pdf"
//
// Also supports:
//   fileKey
//   r2Key
//   storageKey
//   key
// ============================================================

function getResourceKey(resource) {

  const key =

    resource.resourceKey ||

    resource.fileKey ||

    resource.r2Key ||

    resource.storageKey ||

    resource.key ||

    "";

  return String(key).trim();

}

// ============================================================
// BUILD R2 FILE URL
// ============================================================
//
// IMPORTANT:
//
// DO NOT USE:
//   /file?key=
//
// The video system is already working with:
//
//   /?key=
//
// Therefore resources use the SAME route.
//
// Example:
//
// https://r2-uploader.davidthuku574.workers.dev/
// ?key=resources/example.pdf
//
// ============================================================

function buildR2FileURL(key) {

  if (!key) {

    throw new Error(
      "This resource has no R2 file key."
    );

  }

  return (
    `${R2_WORKER}/?key=` +
    encodeURIComponent(key)
  );

}

// ============================================================
// DOWNLOAD RESOURCE
// ============================================================

async function downloadResource(
  resource,
  button
) {

  // ==========================================================
  // GET R2 KEY
  // ==========================================================

  const key =
    getResourceKey(resource);

  if (!key) {

    console.error(
      "RESOURCE HAS NO R2 KEY:",
      resource
    );

    alert(
      "This resource has no R2 file attached."
    );

    return;
  }

  // ==========================================================
  // AUTH
  // ==========================================================

  const user =
    auth.currentUser;

  if (!user) {

    window.location.href =
      "/login.html";

    return;
  }

  // ==========================================================
  // PREMIUM CHECK
  // ==========================================================

  const premiumOnly =
    resource.premiumOnly === true ||
    resource.access === "premium" ||
    resource.status === "premium";

  if (
    premiumOnly &&
    !hasPremiumAccess
  ) {

    alert(
      "Premium membership is required."
    );

    return;
  }

  // ==========================================================
  // ORIGINAL BUTTON
  // ==========================================================

  const originalText =
    button?.innerHTML ||
    `<i class="fa-solid fa-download"></i> Download`;

  try {

    // ========================================================
    // BUTTON LOADING
    // ========================================================

    if (button) {

      button.disabled = true;

      button.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i> Preparing...`;

    }

    // ========================================================
    // LOG RESOURCE KEY
    // ========================================================

    console.log(
      "================================================"
    );

    console.log(
      "GTRADES-AXIS™ RESOURCE DOWNLOAD"
    );

    console.log(
      "R2 KEY:",
      key
    );

    // ========================================================
    // BUILD WORKER URL
    // ========================================================

    const url =
      buildR2FileURL(key);

    console.log(
      "R2 WORKER URL:",
      url
    );

    // ========================================================
    // FETCH
    // ========================================================

    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    console.log(
      "R2 RESPONSE STATUS:",
      response.status
    );

    console.log(
      "R2 RESPONSE TYPE:",
      response.headers.get(
        "content-type"
      )
    );

    // ========================================================
    // CHECK RESPONSE
    // ========================================================

    if (!response.ok) {

      let errorMessage =
        `Resource access failed (${response.status}).`;

      try {

        const errorData =
          await response.json();

        if (errorData?.error) {

          errorMessage =
            errorData.error;
        }

      } catch {
        // Response was not JSON.
      }

      throw new Error(
        errorMessage
      );

    }

    // ========================================================
    // GET BLOB
    // ========================================================

    const blob =
      await response.blob();

    console.log(
      "RESOURCE BLOB SIZE:",
      blob.size
    );

    if (!blob.size) {

      throw new Error(
        "The resource file is empty."
      );

    }

    // ========================================================
    // FILE NAME
    // ========================================================

    let filename =

      resource.fileName ||

      resource.filename ||

      key
        .split("/")
        .pop() ||

      "GTRADES-AXIS-Resource";

    // Remove invalid Windows filename characters

    filename =
      filename.replace(
        /[<>:"/\\|?*]/g,
        "_"
      );

    // ========================================================
    // CREATE BLOB URL
    // ========================================================

    const blobURL =
      URL.createObjectURL(blob);

    // ========================================================
    // CREATE DOWNLOAD LINK
    // ========================================================

    const link =
      document.createElement("a");

    link.href =
      blobURL;

    link.download =
      filename;

    link.style.display =
      "none";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    // ========================================================
    // CLEANUP
    // ========================================================

    setTimeout(() => {

      URL.revokeObjectURL(
        blobURL
      );

    }, 5000);

    console.log(
      "RESOURCE DOWNLOAD STARTED:",
      filename
    );

  } catch (error) {

    console.error(
      "================================================"
    );

    console.error(
      "GTRADES-AXIS™ RESOURCE DOWNLOAD ERROR:",
      error
    );

    console.error(
      "RESOURCE:",
      resource
    );

    console.error(
      "R2 KEY:",
      key
    );

    alert(
      error?.message ||
      "Unable to download this resource."
    );

  } finally {

    // ========================================================
    // RESTORE BUTTON
    // ========================================================

    if (button) {

      button.disabled = false;

      button.innerHTML =
        originalText;

    }

  }

}

// ============================================================
// FILTER BUTTONS
// ============================================================

filters.forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      filters.forEach((btn) => {

        btn.classList.remove(
          "active"
        );

      });

      button.classList.add(
        "active"
      );

      activeCategory =
        button.dataset.category ||
        "All";

      renderResources();

    }
  );

});

// ============================================================
// SEARCH
// ============================================================

searchInput?.addEventListener(
  "input",
  () => {

    renderResources();

  }
);

// ============================================================
// REFRESH
// ============================================================

refreshBtn?.addEventListener(
  "click",
  async () => {

    if (
      refreshBtn.disabled
    ) {

      return;
    }

    refreshBtn.disabled =
      true;

    const original =
      refreshBtn.innerHTML;

    refreshBtn.innerHTML =
      `<i class="fa-solid fa-spinner fa-spin"></i>`;

    try {

      await loadResources();

    } catch (error) {

      console.error(
        "REFRESH ERROR:",
        error
      );

    } finally {

      refreshBtn.disabled =
        false;

      refreshBtn.innerHTML =
        original;

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
        "/login.html";

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
// ERROR STATE
// ============================================================

function showError(message) {

  if (!grid) {
    return;
  }

  grid.innerHTML = `

    <div class="error-state">

      <i
        class="fa-solid fa-circle-exclamation"
      ></i>

      <h3>
        Unable to load resources
      </h3>

      <p>
        ${escapeHTML(message)}
      </p>

      <button
        type="button"
        id="retryResourcesBtn"
      >
        <i class="fa-solid fa-rotate-right"></i>
        Try Again
      </button>

    </div>

  `;

  const retryButton =
    document.getElementById(
      "retryResourcesBtn"
    );

  retryButton?.addEventListener(
    "click",
    () => {

      loadResources();

    }
  );

}

// ============================================================
// INIT
// ============================================================

console.log(
  "================================================"
);

console.log(
  "✅ GTRADES-AXIS™ Premium Resources Loaded"
);

console.log(
  "☁️ Storage: Cloudflare R2"
);

console.log(
  "☁️ Worker:",
  R2_WORKER
);

console.log(
  "☁️ Resource delivery route: /?key="
);

console.log(
  "================================================"
);