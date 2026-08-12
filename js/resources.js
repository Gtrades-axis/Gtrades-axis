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
// CLOUDFLARE R2 WORKER
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

    // ========================================================
    // PREMIUM ACCESS
    // ========================================================

    hasPremiumAccess =
      userData.role === "admin" ||
      userData.membership === "premium";

    // ========================================================
    // ACCESS CHIP
    // ========================================================

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

    resources = [];

    snapshot.forEach((resourceDoc) => {

      resources.push({
        id: resourceDoc.id,
        ...resourceDoc.data()
      });

    });

    // ========================================================
    // SORT
    // ========================================================

    resources.sort((a, b) => {

      const aTime =
        a.createdAt?.seconds || 0;

      const bTime =
        b.createdAt?.seconds || 0;

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
// RENDER
// ============================================================

function renderResources() {

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  let filtered =
    [...resources];

  // ==========================================================
  // CATEGORY
  // ==========================================================

  if (activeCategory !== "All") {

    filtered =
      filtered.filter((resource) => {

        const category =
          String(
            resource.category || "General"
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
// CREATE CARD
// ============================================================

function createResourceCard(resource) {

  const card =
    document.createElement("div");

  // ==========================================================
  // PREMIUM
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
      canAccess ? "" : " locked"
    }`;

  // ==========================================================
  // DATA
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
          R2 Storage
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
  // DOWNLOAD
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
  // LOCKED
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

  if (
    type.includes("EXCEL") ||
    type.includes("XLS")
  ) {
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

  const possibleKeys = [

    resource.resourceKey,

    resource.fileKey,

    resource.r2Key,

    resource.storageKey,

    resource.key

  ];

  for (const value of possibleKeys) {

    if (
      typeof value === "string" &&
      value.trim()
    ) {

      return value
        .trim()
        .replace(/^\/+/, "");

    }

  }

  return "";

}

// ============================================================
// BUILD R2 URL
// ============================================================

function buildR2FileURL(key) {

  const cleanKey =
    String(key)
      .trim()
      .replace(/^\/+/, "");

  if (!cleanKey) {

    throw new Error(
      "This resource has no R2 object key."
    );

  }

  return (
    `${R2_WORKER}/file?key=` +
    encodeURIComponent(cleanKey)
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

  console.log(
    "================================================"
  );

  console.log(
    "GTRADES-AXIS™ RESOURCE"
  );

  console.log(
    "Resource:",
    resource
  );

  console.log(
    "R2 KEY:",
    key
  );

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

  const originalText =
    button?.innerHTML ||
    `<i class="fa-solid fa-download"></i> Download`;

  try {

    if (button) {

      button.disabled = true;

      button.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i> Opening...`;

    }

    // ========================================================
    // R2 URL
    // ========================================================

    const url =
      buildR2FileURL(key);

    console.log(
      "R2 URL:",
      url
    );

    // ========================================================
    // IMPORTANT
    //
    // We do NOT download the file into a Blob.
    //
    // We let the Cloudflare Worker serve the actual R2
    // object directly, exactly like the videos.
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
      "R2 STATUS:",
      response.status
    );

    console.log(
      "R2 CONTENT TYPE:",
      response.headers.get(
        "content-type"
      )
    );

    if (!response.ok) {

      let serverMessage = "";

      try {

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          contentType.includes(
            "application/json"
          )
        ) {

          const data =
            await response.json();

          serverMessage =
            data.error || "";

        }

      } catch (_) {}

      throw new Error(
        serverMessage ||
        `Cloudflare Worker returned HTTP ${response.status}.`
      );

    }

    // ========================================================
    // VERIFY RESPONSE
    // ========================================================

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {

      const data =
        await response.text();

      console.error(
        "Unexpected Worker response:",
        data
      );

      throw new Error(
        "Cloudflare Worker returned an invalid response."
      );

    }

    // ========================================================
    // OPEN DIRECT R2 WORKER URL
    // ========================================================

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );

  } catch (error) {

    console.error(
      "RESOURCE OPEN ERROR:",
      error
    );

    alert(
      error?.message ||
      "Unable to open this resource."
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
// FILTERS
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

    <div class="error-state">

      <i class="fa-solid fa-circle-exclamation"></i>

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