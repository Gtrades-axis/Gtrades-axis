// ============================================================
// GTRADES-AXIS™
// PREMIUM RESOURCES PORTAL
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

const resourceCount =
  document.getElementById("resourceCount");

const refreshBtn =
  document.getElementById("refreshBtn");

const accessChip =
  document.getElementById("accessChip");

const logoutBtn =
  document.getElementById("logoutBtn");

const filterButtons =
  document.querySelectorAll(
    ".filter"
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
// GET R2 KEY
// ============================================================

function getResourceKey(resource) {

  return (
    resource.fileKey ||
    resource.resourceKey ||
    resource.r2Key ||
    resource.storageKey ||
    resource.downloadKey ||
    resource.key ||
    ""
  );
}

// ============================================================
// GET R2 FILE
// ============================================================

async function getR2File(resourceKey) {

  if (!resourceKey) {

    throw new Error(
      "No R2 file key is attached to this resource."
    );

  }

  const url =
    new URL(R2_WORKER);

  url.searchParams.set(
    "key",
    resourceKey
  );

  url.searchParams.set(
    "action",
    "file"
  );

  console.log(
    "Requesting R2 resource:",
    resourceKey
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        cache: "no-store"
      }
    );

  if (!response.ok) {

    let message =
      `R2 Worker returned ${response.status}`;

    try {

      const text =
        await response.text();

      try {

        const json =
          JSON.parse(text);

        message =
          json.error ||
          message;

      } catch {

        if (text) {
          message = text;
        }

      }

    } catch {}

    throw new Error(
      message
    );

  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  // ========================================================
  // CASE 1:
  // WORKER RETURNS JSON WITH A SIGNED/DIRECT URL
  // ========================================================

  if (
    contentType
      .toLowerCase()
      .includes("application/json")
  ) {

    const data =
      await response.json();

    if (!data.url) {

      throw new Error(
        data.error ||
        "R2 Worker did not return a file URL."
      );

    }

    console.log(
      "Worker returned file URL."
    );

    const fileResponse =
      await fetch(
        data.url
      );

    if (!fileResponse.ok) {

      throw new Error(
        `Unable to download R2 file (${fileResponse.status}).`
      );

    }

    return fileResponse.blob();

  }

  // ========================================================
  // CASE 2:
  // WORKER RETURNS FILE DIRECTLY
  //
  // THIS IS YOUR CURRENT WORKING R2 SETUP.
  // PDF STARTS WITH %PDF-1.4
  // ========================================================

  console.log(
    "Worker returned resource directly:",
    contentType
  );

  return await response.blob();
}

// ============================================================
// DOWNLOAD RESOURCE
// ============================================================

async function downloadResource(resource) {

  const premiumOnly =
    resource.premiumOnly === true;

  // ----------------------------------------------------------
  // ACCESS CHECK
  // ----------------------------------------------------------

  if (
    premiumOnly &&
    !hasPremiumAccess
  ) {

    alert(
      "Premium membership is required to download this resource."
    );

    return;
  }

  const resourceKey =
    getResourceKey(
      resource
    );

  if (!resourceKey) {

    console.error(
      "Missing R2 key:",
      resource
    );

    alert(
      "This resource does not have an R2 file attached."
    );

    return;
  }

  try {

    showDownloading(
      resource.id
    );

    const blob =
      await getR2File(
        resourceKey
      );

    // ========================================================
    // DETERMINE FILE NAME
    // ========================================================

    let fileName =
      resource.fileName ||
      resource.filename ||
      resource.name ||
      resource.title ||
      "GTRADES-AXIS-Resource";

    // Remove illegal characters
    fileName =
      String(fileName)
        .replace(/[<>:"/\\|?*]/g, "_")
        .trim();

    // ========================================================
    // ADD EXTENSION IF MISSING
    // ========================================================

    const extension =
      getExtensionFromKey(
        resourceKey
      );

    if (
      extension &&
      !fileName
        .toLowerCase()
        .endsWith(
          extension
        )
    ) {

      fileName +=
        extension;

    }

    // ========================================================
    // CREATE DOWNLOAD URL
    // ========================================================

    const blobURL =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href =
      blobURL;

    link.download =
      fileName;

    link.style.display =
      "none";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    setTimeout(
      () => {
        URL.revokeObjectURL(
          blobURL
        );
      },
      5000
    );

    console.log(
      "Resource downloaded:",
      fileName
    );

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

    hideDownloading(
      resource.id
    );

  }

}

// ============================================================
// GET EXTENSION
// ============================================================

function getExtensionFromKey(key) {

  if (!key) {
    return "";
  }

  const cleanKey =
    String(key)
      .split("?")[0];

  const lastPart =
    cleanKey
      .split("/")
      .pop();

  if (!lastPart) {
    return "";
  }

  const dotIndex =
    lastPart.lastIndexOf(".");

  if (
    dotIndex === -1
  ) {
    return "";
  }

  return lastPart
    .substring(
      dotIndex
    )
    .toLowerCase();

}

// ============================================================
// LOADING BUTTON
// ============================================================

function showDownloading(id) {

  const button =
    document.querySelector(
      `[data-download-id="${CSS.escape(id)}"]`
    );

  if (!button) {
    return;
  }

  button.dataset.originalText =
    button.innerHTML;

  button.innerHTML =
    `<i class="fa-solid fa-spinner fa-spin"></i> Downloading...`;

  button.disabled =
    true;

}

// ============================================================
// RESTORE BUTTON
// ============================================================

function hideDownloading(id) {

  const button =
    document.querySelector(
      `[data-download-id="${CSS.escape(id)}"]`
    );

  if (!button) {
    return;
  }

  button.innerHTML =
    button.dataset.originalText ||
    `<i class="fa-solid fa-download"></i> Download`;

  button.disabled =
    false;

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

          accessChip.innerHTML =
            `<i class="fa-solid fa-shield-check"></i>
             Premium Access`;

        } else {

          accessChip.innerHTML =
            `<i class="fa-solid fa-user"></i>
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

      await signOut(
        auth
      );

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
      "RESOURCE FIRESTORE ERROR:",
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

          const category =
            String(
              resource.category ||
              "Other"
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
  // NO RESULTS
  // ==========================================================

  if (
    filtered.length === 0
  ) {

    resourceGrid.innerHTML = `
      <div
        style="
          grid-column:1/-1;
          text-align:center;
          padding:60px 20px;
          color:#94a3b8;
        "
      >

        <i
          class="fa-solid fa-folder-open"
          style="
            font-size:3rem;
            margin-bottom:20px;
          "
        ></i>

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

  filtered.forEach(
    (resource) => {

      resourceGrid.appendChild(
        createResourceCard(
          resource
        )
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
    "Other";

  const description =
    resource.description ||
    "Premium trading resource.";

  const premiumOnly =
    resource.premiumOnly === true;

  const canAccess =
    !premiumOnly ||
    hasPremiumAccess;

  const extension =
    getExtensionFromKey(
      getResourceKey(
        resource
      )
    );

  // ==========================================================
  // ICON
  // ==========================================================

  let icon =
    "fa-file";

  if (
    extension === ".pdf"
  ) {

    icon =
      "fa-file-pdf";

  } else if (
    extension === ".doc" ||
    extension === ".docx"
  ) {

    icon =
      "fa-file-word";

  } else if (
    extension === ".xls" ||
    extension === ".xlsx"
  ) {

    icon =
      "fa-file-excel";

  } else if (
    extension === ".zip" ||
    extension === ".rar"
  ) {

    icon =
      "fa-file-zipper";

  } else if (
    extension === ".mp4" ||
    extension === ".mov" ||
    extension === ".webm"
  ) {

    icon =
      "fa-file-video";

  }

  card.className =
    "resource-card";

  card.innerHTML = `

    <div class="resource-icon">

      <i
        class="fa-solid ${icon}"
      ></i>

    </div>

    <div class="resource-content">

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

      <div class="resource-footer">

        <span class="storage">

          <i
            class="fa-solid fa-cloud"
          ></i>

          R2 Storage

        </span>

        ${
          canAccess
            ? `
              <button
                class="download-btn"
                data-download-id="${escapeHTML(
                  resource.id
                )}"
              >

                <i
                  class="fa-solid fa-download"
                ></i>

                Download

              </button>
            `
            : `
              <button
                class="download-btn locked"
                disabled
              >

                <i
                  class="fa-solid fa-lock"
                ></i>

                Premium

              </button>
            `
        }

      </div>

    </div>
  `;

  // ==========================================================
  // DOWNLOAD EVENT
  // ==========================================================

  const downloadButton =
    card.querySelector(
      ".download-btn:not(.locked)"
    );

  downloadButton?.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      event.stopPropagation();

      downloadResource(
        resource
      );

    }
  );

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

    try {

      await loadResources();

    } finally {

      refreshBtn.disabled =
        false;

      icon?.classList.remove(
        "fa-spin"
      );

    }

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

    <div
      style="
        grid-column:1/-1;
        text-align:center;
        padding:60px 20px;
        color:#ff8799;
      "
    >

      <i
        class="fa-solid fa-circle-exclamation"
        style="
          font-size:2.5rem;
          margin-bottom:20px;
        "
      ></i>

      <h3>
        Unable to load resources
      </h3>

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