// ============================================================
// GTRADES-AXIS™
// PREMIUM RESOURCES PORTAL
// js/resources.js
// FIREBASE + CLOUDFLARE R2
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
// ELEMENTS
// ============================================================

const grid =
  document.getElementById("resourceGrid");

const count =
  document.getElementById("resourceCount");

const searchInput =
  document.getElementById("searchInput");

const refreshBtn =
  document.getElementById("refreshBtn");

const filters =
  document.querySelectorAll(".filter");

const accessChip =
  document.getElementById("accessChip");

const logoutBtn =
  document.getElementById("logoutBtn");

// ============================================================
// STATE
// ============================================================

let resources = [];
let activeCategory = "All";
let currentUser = null;
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
// R2 FILE URL
// ============================================================

async function getR2FileURL(key) {

  if (!key) {
    throw new Error("No R2 file key found.");
  }

  const url = new URL(R2_WORKER);

  url.searchParams.set("key", key);
  url.searchParams.set("action", "file");

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    let message = `R2 error (${response.status})`;

    try {
      const data = await response.json();

      if (data?.error) {
        message = data.error;
      }
    } catch (_) {}

    throw new Error(message);
  }

  const contentType =
    response.headers.get("content-type") || "";

  // Worker returns JSON containing the signed/file URL
  if (contentType.includes("application/json")) {

    const data = await response.json();

    if (!data.url) {
      throw new Error("R2 Worker did not return a file URL.");
    }

    return data.url;
  }

  // If Worker directly returns the file,
  // create a temporary browser URL.
  const blob = await response.blob();

  return URL.createObjectURL(blob);
}

// ============================================================
// DOWNLOAD FILE
// ============================================================

async function downloadResource(resource) {

  const key =
    resource.fileKey ||
    resource.resourceKey ||
    resource.r2Key ||
    resource.storageKey ||
    resource.videoKey ||
    "";

  if (!key) {
    alert("This resource does not have an R2 file attached.");
    return;
  }

  try {

    const button =
      document.querySelector(
        `[data-download-id="${resource.id}"]`
      );

    if (button) {
      button.disabled = true;
      button.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i> Preparing...`;
    }

    const fileURL =
      await getR2FileURL(key);

    const link =
      document.createElement("a");

    link.href = fileURL;

    link.target = "_blank";
    link.rel = "noopener";

    link.download =
      resource.fileName ||
      resource.title ||
      "GTRADES-AXIS-resource";

    document.body.appendChild(link);

    link.click();

    link.remove();

    // Only revoke generated blob URLs
    if (fileURL.startsWith("blob:")) {
      setTimeout(() => {
        URL.revokeObjectURL(fileURL);
      }, 10000);
    }

  } catch (error) {

    console.error(
      "RESOURCE DOWNLOAD ERROR:",
      error
    );

    alert(
      "Unable to open this resource.\n\n" +
      error.message
    );

  } finally {

    const button =
      document.querySelector(
        `[data-download-id="${resource.id}"]`
      );

    if (button) {

      button.disabled = false;

      button.innerHTML =
        `<i class="fa-solid fa-download"></i> Download`;
    }
  }
}

// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "/login.html";

      return;
    }

    currentUser = user;

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

      // ======================================================
      // PREMIUM ACCESS
      // ======================================================

      hasPremiumAccess =
        userData.role === "admin" ||
        userData.membership === "premium";

      if (accessChip) {

        if (hasPremiumAccess) {

          accessChip.innerHTML =
            `<i class="fa-solid fa-shield-check"></i>
             Premium Access`;

          accessChip.classList.add(
            "premium"
          );

        } else {

          accessChip.innerHTML =
            `<i class="fa-solid fa-lock"></i>
             Member Access`;

        }
      }

      // ======================================================
      // LOAD RESOURCES
      // ======================================================

      await loadResources();

    } catch (error) {

      console.error(
        "RESOURCE AUTH ERROR:",
        error
      );

      showError(
        "Unable to verify your account."
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
// LOAD RESOURCES
// ============================================================

async function loadResources() {

  if (!grid) {
    return;
  }

  grid.innerHTML = `
    <div class="loading">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      Loading your resources...
    </div>
  `;

  try {

    let snapshot;

    // ========================================================
    // ORDERED QUERY
    // ========================================================

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

    } catch (error) {

      console.warn(
        "Ordered resource query failed. Loading normally.",
        error
      );

      snapshot =
        await getDocs(
          collection(
            db,
            "resources"
          )
        );
    }

    resources = [];

    snapshot.forEach(
      (resourceDoc) => {

        resources.push({

          id:
            resourceDoc.id,

          ...resourceDoc.data()

        });
      }
    );

    console.log(
      "Resources loaded:",
      resources.length
    );

    renderResources();

  } catch (error) {

    console.error(
      "FIRESTORE RESOURCE ERROR:",
      error
    );

    showError(
      "Unable to load resources. Please refresh."
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

  let filtered =
    [...resources];

  // ==========================================================
  // CATEGORY FILTER
  // ==========================================================

  if (
    activeCategory !== "All"
  ) {

    filtered =
      filtered.filter(
        (resource) => {

          const category =
            String(
              resource.category ||
              "General"
            )
              .trim()
              .toLowerCase();

          return (
            category ===
            activeCategory
              .trim()
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
      ?.trim()
      .toLowerCase() ||
    "";

  if (keyword) {

    filtered =
      filtered.filter(
        (resource) => {

          const title =
            String(
              resource.title ||
              ""
            )
              .toLowerCase();

          const description =
            String(
              resource.description ||
              ""
            )
              .toLowerCase();

          const category =
            String(
              resource.category ||
              ""
            )
              .toLowerCase();

          return (
            title.includes(keyword) ||
            description.includes(keyword) ||
            category.includes(keyword)
          );
        }
      );
  }

  // ==========================================================
  // COUNT
  // ==========================================================

  if (count) {

    count.textContent =
      `${filtered.length} ${
        filtered.length === 1
          ? "resource"
          : "resources"
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

  grid.innerHTML = "";

  filtered.forEach(
    (resource) => {

      const card =
        createResourceCard(
          resource
        );

      grid.appendChild(
        card
      );
    }
  );
}

// ============================================================
// CREATE RESOURCE CARD
// ============================================================

function createResourceCard(
  resource
) {

  const card =
    document.createElement(
      "article"
    );

  const title =
    resource.title ||
    "Untitled Resource";

  const category =
    resource.category ||
    "General";

  const description =
    resource.description ||
    "Premium trading resource.";

  const premiumOnly =
    resource.premiumOnly === true;

  const canAccess =
    !premiumOnly ||
    hasPremiumAccess;

  const key =
    resource.fileKey ||
    resource.resourceKey ||
    resource.r2Key ||
    resource.storageKey ||
    resource.videoKey ||
    "";

  // ==========================================================
  // ICON
  // ==========================================================

  let icon =
    "fa-file";

  const categoryLower =
    category.toLowerCase();

  if (
    categoryLower.includes("pdf")
  ) {
    icon =
      "fa-file-pdf";
  }

  else if (
    categoryLower.includes("indicator")
  ) {
    icon =
      "fa-chart-line";
  }

  else if (
    categoryLower.includes("journal")
  ) {
    icon =
      "fa-book";
  }

  else if (
    categoryLower.includes("strategy")
  ) {
    icon =
      "fa-chess";
  }

  else if (
    categoryLower.includes("video")
  ) {
    icon =
      "fa-circle-play";
  }

  // ==========================================================
  // CARD
  // ==========================================================

  card.className =
    `resource-card ${
      canAccess
        ? ""
        : "locked"
    }`;

  card.innerHTML = `

    <div class="resource-icon">

      <i
        class="fa-solid ${icon}"
      ></i>

    </div>

    <div class="resource-body">

      <div class="resource-top">

        <span class="resource-category">
          ${escapeHTML(category)}
        </span>

        <span
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
        </span>

      </div>

      <h3>
        ${escapeHTML(title)}
      </h3>

      <p>
        ${escapeHTML(description)}
      </p>

      ${
        key
          ? `
            <div class="resource-storage">

              <i class="fa-solid fa-cloud"></i>

              R2 Storage

            </div>
          `
          : `
            <div class="resource-storage unavailable">

              <i class="fa-solid fa-triangle-exclamation"></i>

              File unavailable

            </div>
          `
      }

    </div>

    <div class="resource-action">

      ${
        !canAccess
          ? `
            <button
              class="download-btn locked-btn"
              type="button"
            >
              <i class="fa-solid fa-lock"></i>
              Premium
            </button>
          `
          : key
            ? `
              <button
                class="download-btn"
                type="button"
                data-download-id="${escapeHTML(
                  resource.id
                )}"
              >
                <i class="fa-solid fa-download"></i>
                Download
              </button>
            `
            : `
              <button
                class="download-btn"
                type="button"
                disabled
              >
                <i class="fa-solid fa-ban"></i>
                Unavailable
              </button>
            `
      }

    </div>
  `;

  // ==========================================================
  // DOWNLOAD EVENT
  // ==========================================================

  const downloadButton =
    card.querySelector(
      "[data-download-id]"
    );

  if (downloadButton) {

    downloadButton.addEventListener(
      "click",
      (event) => {

        event.preventDefault();
        event.stopPropagation();

        downloadResource(
          resource
        );
      }
    );
  }

  return card;
}

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
// FILTERS
// ============================================================

filters.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        filters.forEach(
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

    refreshBtn.innerHTML =
      `<i class="fa-solid fa-spinner fa-spin"></i>`;

    try {

      await loadResources();

    } finally {

      refreshBtn.disabled =
        false;

      refreshBtn.innerHTML =
        `<i class="fa-solid fa-rotate-right"></i>`;
    }
  }
);

// ============================================================
// ERROR
// ============================================================

function showError(
  message
) {

  if (!grid) {
    return;
  }

  grid.innerHTML = `

    <div class="error-state">

      <i class="fa-solid fa-circle-exclamation"></i>

      <h3>
        Something went wrong
      </h3>

      <p>
        ${escapeHTML(message)}
      </p>

      <button
        type="button"
        id="retryResources"
      >
        <i class="fa-solid fa-rotate-right"></i>
        Try Again
      </button>

    </div>

  `;

  document
    .getElementById(
      "retryResources"
    )
    ?.addEventListener(
      "click",
      loadResources
    );
}