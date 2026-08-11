javascript
// ============================================================
// GTRADES-AXIS™
// PREMIUM RESOURCES
// js/resources.js
// CLOUDFLARE R2 VERSION
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
    // PREMIUM / ADMIN ACCESS
    // --------------------------------------------------------

    hasPremiumAccess =
      userData.role === "admin" ||
      userData.membership === "premium";

    // --------------------------------------------------------
    // ACCESS CHIP
    // --------------------------------------------------------

    if (accessChip) {

      accessChip.innerHTML =
        hasPremiumAccess
          ? `<i class="fa-solid fa-shield-check"></i> Premium Access`
          : `<i class="fa-solid fa-user"></i> Member Access`;

      if (hasPremiumAccess) {
        accessChip.classList.add("premium");
      }
    }

    await loadResources();

  } catch (error) {

    console.error(
      "RESOURCE AUTH ERROR:",
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
    // TRY CREATED DATE
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
    // BUILD ARRAY
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
        a.createdAt?.seconds || 0;

      const bTime =
        b.createdAt?.seconds || 0;

      return bTime - aTime;

    });

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

        return (
          category ===
          activeCategory
            .toLowerCase()
            .trim()
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
          ).toLowerCase();

        const description =
          String(
            resource.description || ""
          ).toLowerCase();

        const category =
          String(
            resource.category || ""
          ).toLowerCase();

        return (
          title.includes(keyword) ||
          description.includes(keyword) ||
          category.includes(keyword)
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
  // CARDS
  // ==========================================================

  filtered.forEach((resource) => {

    grid.appendChild(
      createResourceCard(resource)
    );

  });

}

// ============================================================
// CREATE RESOURCE CARD
// ============================================================

function createResourceCard(resource) {

  const card =
    document.createElement("div");

  // ----------------------------------------------------------
  // ACCESS
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // CARD
  // ----------------------------------------------------------

  card.innerHTML = `

    <div class="resource-icon">

      <i class="fa-solid ${getIcon(type)}"></i>

    </div>

    <div class="resource-content">

      <div class="resource-category">
        ${escapeHTML(category)}
      </div>

      <h3>
        ${escapeHTML(title)}
      </h3>

      <p>
        ${escapeHTML(description)}
      </p>

      <div class="resource-meta">

        <span>
          <i class="fa-solid fa-cloud"></i>
          Cloudflare R2
        </span>

        <span
          class="resource-status ${
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
        </span>

      </div>

      ${
        premiumOnly && !hasPremiumAccess

          ? `

            <button
              class="resource-btn locked-btn"
              type="button"
            >

              <i class="fa-solid fa-lock"></i>

              Premium Required

            </button>

          `

          : `

            <button
              class="resource-btn download-resource"
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

  if (type.includes("PDF")) {
    return "fa-file-pdf";
  }

  if (type.includes("INDICATOR")) {
    return "fa-chart-line";
  }

  if (type.includes("JOURNAL")) {
    return "fa-book";
  }

  if (type.includes("STRATEG")) {
    return "fa-bullseye";
  }

  if (type.includes("VIDEO")) {
    return "fa-circle-play";
  }

  if (type.includes("EXCEL") || type.includes("XLS")) {
    return "fa-file-excel";
  }

  if (type.includes("ZIP")) {
    return "fa-file-zipper";
  }

  return "fa-file";
}

// ============================================================
// GET R2 KEY
// ============================================================

function getResourceKey(resource) {

  return (

    resource.resourceKey ||

    resource.fileKey ||

    resource.r2Key ||

    resource.storageKey ||

    resource.key ||

    ""
  );

}

// ============================================================
// BUILD R2 FILE URL
// ============================================================

function buildR2FileURL(key) {

  if (!key) {
    throw new Error(
      "This resource has no R2 file key."
    );
  }

  return (
    `${R2_WORKER}/file?key=` +
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

  const key =
    getResourceKey(resource);

  if (!key) {

    alert(
      "This resource has no R2 file attached."
    );

    return;
  }

  const user =
    auth.currentUser;

  if (!user) {

    window.location.href =
      "/login.html";

    return;
  }

  // ----------------------------------------------------------
  // PREMIUM CHECK
  // ----------------------------------------------------------

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

  const originalText =
    button?.innerHTML ||
    `<i class="fa-solid fa-download"></i> Download`;

  try {

    // --------------------------------------------------------
    // BUTTON
    // --------------------------------------------------------

    if (button) {

      button.disabled = true;

      button.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i> Preparing...`;

    }

    console.log(
      "GTRADES-AXIS™ RESOURCE KEY:",
      key
    );

    // --------------------------------------------------------
    // DIRECT R2 WORKER FILE ENDPOINT
    // --------------------------------------------------------

    const url =
      buildR2FileURL(key);

    console.log(
      "GTRADES-AXIS™ RESOURCE URL:",
      url
    );

    // --------------------------------------------------------
    // FETCH FILE
    // --------------------------------------------------------

    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    console.log(
      "R2 RESOURCE RESPONSE:",
      response.status,
      response.headers.get("content-type")
    );

    if (!response.ok) {

      throw new Error(
        `Resource access failed (${response.status}).`
      );

    }

    // --------------------------------------------------------
    // BLOB
    // --------------------------------------------------------

    const blob =
      await response.blob();

    if (!blob.size) {

      throw new Error(
        "The resource file is empty."
      );

    }

    // --------------------------------------------------------
    // FILE NAME
    // --------------------------------------------------------

    let filename =
      resource.fileName ||
      resource.filename ||
      key.split("/").pop() ||
      "GTRADES-AXIS-Resource";

    filename =
      filename.replace(
        /[<>:"/\\|?*]/g,
        "_"
      );

    // --------------------------------------------------------
    // CREATE DOWNLOAD
    // --------------------------------------------------------

    const blobURL =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href =
      blobURL;

    link.download =
      filename;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    setTimeout(() => {

      URL.revokeObjectURL(
        blobURL
      );

    }, 5000);

  } catch (error) {

    console.error(
      "RESOURCE DOWNLOAD ERROR:",
      error
    );

    alert(
      error.message ||
      "Unable to download this resource."
    );

  } finally {

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
  renderResources
);

// ============================================================
// REFRESH
// ============================================================

refreshBtn?.addEventListener(
  "click",
  async () => {

    if (refreshBtn.disabled) {
      return;
    }

    refreshBtn.disabled = true;

    const original =
      refreshBtn.innerHTML;

    refreshBtn.innerHTML =
      `<i class="fa-solid fa-spinner fa-spin"></i>`;

    try {

      await loadResources();

    } finally {

      refreshBtn.disabled = false;

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
// ERROR
// ============================================================

function showError(message) {

  if (!grid) {
    return;
  }

  grid.innerHTML = `

    <div
      class="error-state"
    >

      <i
        class="fa-solid fa-circle-exclamation"
      ></i>

      <h3>
        Unable to load resources
      </h3>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>

  `;

}

// ============================================================
// INIT
// ============================================================

console.log(
  "✅ GTRADES-AXIS™ Resources loaded"
);

console.log(
  "☁️ Cloudflare R2 Worker:",
  R2_WORKER
);
