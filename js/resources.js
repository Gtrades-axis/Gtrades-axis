// ============================================================
// GTRADES-AXIS™
// PREMIUM RESOURCES
// js/resources.js
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

const resourceGrid =
  document.getElementById("resourceGrid");

const searchInput =
  document.getElementById("searchInput");

const refreshBtn =
  document.getElementById("refreshBtn");

const resourceCount =
  document.getElementById("resourceCount");

const accessChip =
  document.getElementById("accessChip");

const logoutBtn =
  document.getElementById("logoutBtn");

const filters =
  document.querySelectorAll(
    "#filters .filter"
  );

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
// GET R2 FILE URL
// IMPORTANT:
// USE THE SAME WORKING ACTION AS VIDEO PORTAL
// ============================================================

async function getR2FileURL(key) {

  if (!key) {
    throw new Error(
      "No R2 file key was found."
    );
  }

  const url =
    new URL(R2_WORKER);

  url.searchParams.set(
    "key",
    key
  );

  // SAME ACTION USED BY WORKING VIDEO PORTAL
  url.searchParams.set(
    "action",
    "file"
  );

  console.log(
    "Requesting R2 resource:",
    key
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          Accept:
            "application/json"
        },
        cache: "no-store"
      }
    );

  const text =
    await response.text();

  let data;

  try {

    data =
      JSON.parse(text);

  } catch {

    console.error(
      "R2 Worker raw response:",
      text
    );

    throw new Error(
      "Cloudflare Worker returned an invalid response."
    );

  }

  if (
    !response.ok ||
    !data.url
  ) {

    throw new Error(
      data.error ||
      data.message ||
      `R2 Worker error (${response.status})`
    );

  }

  console.log(
    "R2 resource URL received."
  );

  return data.url;

}

// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;

    }

    try {

      // ======================================================
      // GET USER
      // ======================================================

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

      console.log(
        "User role:",
        userData.role
      );

      console.log(
        "Membership:",
        userData.membership
      );

      console.log(
        "Premium access:",
        hasPremiumAccess
      );

      // ======================================================
      // ACCESS CHIP
      // ======================================================

      if (accessChip) {

        if (hasPremiumAccess) {

          accessChip.innerHTML = `
            <i class="fa-solid fa-shield-check"></i>
            Premium Access
          `;

        } else {

          accessChip.innerHTML = `
            <i class="fa-solid fa-user"></i>
            Member Access
          `;

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
        "Unable to load your resources."
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
// LOAD RESOURCES
// ============================================================

async function loadResources() {

  if (!resourceGrid) {
    return;
  }

  resourceGrid.innerHTML = `
    <div class="loading">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      Loading your resources...
    </div>
  `;

  if (resourceCount) {

    resourceCount.textContent =
      "Loading...";

  }

  try {

    let snapshot;

    // ======================================================
    // ORDERED QUERY
    // ======================================================

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
      "Unable to load resources. Please refresh the page."
    );

  }

}

// ============================================================
// RENDER RESOURCES
// ============================================================

function renderResources() {

  if (!resourceGrid) {
    return;
  }

  resourceGrid.innerHTML = "";

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

          return String(
            resource.category ||
            "General"
          )
            .toLowerCase()
            .trim() ===
          String(
            activeCategory
          )
            .toLowerCase()
            .trim();

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

  if (resourceCount) {

    resourceCount.textContent =
      `${filtered.length} ${
        filtered.length === 1
          ? "resource"
          : "resources"
      }`;

  }

  // ==========================================================
  // EMPTY
  // ==========================================================

  if (
    filtered.length === 0
  ) {

    resourceGrid.innerHTML = `
      <div class="loading">
        <i class="fa-solid fa-folder-open"></i>
        <p>No resources found.</p>
      </div>
    `;

    return;

  }

  // ==========================================================
  // CARDS
  // ==========================================================

  filtered.forEach(
    (resource) => {

      const card =
        createResourceCard(
          resource
        );

      resourceGrid.appendChild(
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

  // ==========================================================
  // FIND R2 KEY
  // ==========================================================

  const fileKey =
    resource.fileKey ||
    resource.resourceKey ||
    resource.r2Key ||
    resource.storageKey ||
    resource.resourcePath ||
    resource.key ||
    "";

  // ==========================================================
  // FILE TYPE
  // ==========================================================

  const fileType =
    String(
      resource.fileType ||
      resource.type ||
      category
    )
      .toUpperCase();

  card.className =
    `resource-card ${
      canAccess
        ? ""
        : "locked"
    }`;

  // ==========================================================
  // CARD
  // ==========================================================

  card.innerHTML = `

    <div class="resource-icon">

      <i class="
        ${
          fileType.includes("PDF")
            ? "fa-solid fa-file-pdf"
            : fileType.includes("VIDEO")
              ? "fa-solid fa-circle-play"
              : "fa-solid fa-file"
        }
      "></i>

    </div>

    <div class="resource-content">

      <div class="resource-top">

        <span class="resource-category">
          ${escapeHTML(category)}
        </span>

        <span class="
          resource-badge
          ${
            premiumOnly
              ? "premium"
              : "free"
          }
        ">
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

      <div class="resource-footer">

        <span>
          <i class="fa-solid fa-cloud"></i>
          R2 Storage
        </span>

        <button
          class="resource-action"
          type="button"
          ${
            canAccess
              ? ""
              : "disabled"
          }
        >

          <i class="
            ${
              canAccess
                ? "fa-solid fa-download"
                : "fa-solid fa-lock"
            }
          "></i>

          ${
            canAccess
              ? "Download"
              : "Premium Only"
          }

        </button>

      </div>

    </div>
  `;

  // ==========================================================
  // DOWNLOAD
  // ==========================================================

  const button =
    card.querySelector(
      ".resource-action"
    );

  if (
    button &&
    canAccess
  ) {

    button.addEventListener(
      "click",
      async (event) => {

        event.preventDefault();

        event.stopPropagation();

        await downloadResource(
          resource
        );

      }
    );

  }

  return card;

}

// ============================================================
// DOWNLOAD RESOURCE
// ============================================================

async function downloadResource(
  resource
) {

  // ==========================================================
  // PREMIUM CHECK
  // ==========================================================

  if (
    resource.premiumOnly === true &&
    !hasPremiumAccess
  ) {

    alert(
      "Premium membership is required to access this resource."
    );

    return;

  }

  // ==========================================================
  // FIND R2 KEY
  // ==========================================================

  const fileKey =
    resource.fileKey ||
    resource.resourceKey ||
    resource.r2Key ||
    resource.storageKey ||
    resource.resourcePath ||
    resource.key ||
    "";

  // ==========================================================
  // CHECK KEY
  // ==========================================================

  if (!fileKey) {

    console.error(
      "RESOURCE HAS NO R2 KEY:",
      resource
    );

    alert(
      "This resource does not have an R2 file attached."
    );

    return;

  }

  console.log(
    "Downloading resource:",
    fileKey
  );

  // ==========================================================
  // BUTTON LOADING
  // ==========================================================

  const buttons =
    document.querySelectorAll(
      ".resource-action"
    );

  // ==========================================================
  // GET WORKING R2 URL
  // ==========================================================

  try {

    const fileURL =
      await getR2FileURL(
        fileKey
      );

    console.log(
      "R2 download URL:",
      fileURL
    );

    // ========================================================
    // DOWNLOAD
    // ========================================================

    const link =
      document.createElement(
        "a"
      );

    link.href =
      fileURL;

    link.target =
      "_blank";

    link.rel =
      "noopener noreferrer";

    link.download =
      resource.fileName ||
      resource.title ||
      "GTRADES-AXIS-Resource";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

  } catch (error) {

    console.error(
      "RESOURCE DOWNLOAD ERROR:",
      error
    );

    alert(
      "Unable to open this resource.\n\n" +
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

    renderResources();

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

    refreshBtn.innerHTML = `
      <i class="fa-solid fa-circle-notch fa-spin"></i>
    `;

    try {

      await loadResources();

    } finally {

      refreshBtn.disabled =
        false;

      refreshBtn.innerHTML = `
        <i class="fa-solid fa-rotate-right"></i>
      `;

    }

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
// ERROR
// ============================================================

function showError(
  message
) {

  if (!resourceGrid) {
    return;
  }

  resourceGrid.innerHTML = `

    <div class="loading">

      <i
        class="fa-solid fa-circle-exclamation"
      ></i>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>

  `;

  if (resourceCount) {

    resourceCount.textContent =
      "Error";

  }

}
