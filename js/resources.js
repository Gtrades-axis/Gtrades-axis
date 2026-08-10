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

    window.location.href = "login.html";

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

    hasPremiumAccess =
      userData.role === "admin" ||
      userData.membership === "premium";

    if (accessChip) {

      accessChip.innerHTML =
        hasPremiumAccess
          ? `<i class="fa-solid fa-shield-check"></i> Premium Access`
          : `<i class="fa-solid fa-user"></i> Member Access`;
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

  if (!grid) return;

  grid.innerHTML = `
    <div class="loading">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      Loading your resources...
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

    } catch {

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

  if (!grid) return;

  grid.innerHTML = "";

  let filtered =
    [...resources];

  // CATEGORY
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

  // SEARCH
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

  if (resourceCount) {

    resourceCount.textContent =
      `${filtered.length} resource${
        filtered.length === 1
          ? ""
          : "s"
      }`;
  }

  if (filtered.length === 0) {

    grid.innerHTML = `
      <div class="loading">
        <i class="fa-solid fa-folder-open"></i>
        No resources found.
      </div>
    `;

    return;
  }

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

  const title =
    resource.title ||
    "Untitled Resource";

  const category =
    resource.category ||
    "General";

  const description =
    resource.description ||
    "Premium trading resource.";

  const type =
    String(
      resource.type ||
      category ||
      "PDF"
    ).toUpperCase();

  card.innerHTML = `

    <div class="resource-icon">

      <i class="fa-solid ${
        getIcon(type)
      }"></i>

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

        <span class="resource-status ${
          premiumOnly
            ? "premium"
            : "free"
        }">
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

  const button =
    card.querySelector(
      ".download-resource"
    );

  if (button) {

    button.addEventListener(
      "click",
      () => downloadResource(resource, button)
    );

  }

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

  return "fa-file";
}

// ============================================================
// GET RESOURCE KEY
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
      "login.html";

    return;
  }

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
    '<i class="fa-solid fa-download"></i> Download';

  try {

    if (button) {

      button.disabled = true;

      button.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Preparing...';
    }

    // ========================================================
    // FRESH FIREBASE TOKEN
    // ========================================================

    const token =
      await user.getIdToken(true);

    // ========================================================
    // R2 REQUEST
    // ========================================================

    const url =
      `${R2_WORKER}/?key=${encodeURIComponent(
        key
      )}&action=file`;

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`
          },

          cache:
            "no-store"
        }
      );

    if (!response.ok) {

      let message =
        `Resource access failed (${response.status})`;

      try {

        const data =
          await response.json();

        if (data.error) {
          message =
            data.error;
        }

      } catch {}

      throw new Error(message);
    }

    // ========================================================
    // DOWNLOAD BLOB
    // ========================================================

    const blob =
      await response.blob();

    if (!blob.size) {

      throw new Error(
        "The resource file is empty."
      );
    }

    const blobURL =
      URL.createObjectURL(blob);

    // ========================================================
    // FILE NAME
    // ========================================================

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

    // ========================================================
    // DOWNLOAD
    // ========================================================

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

      button.disabled =
        false;

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

    refreshBtn.disabled =
      true;

    await loadResources();

    refreshBtn.disabled =
      false;

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
// ERROR
// ============================================================

function showError(message) {

  if (!grid) return;

  grid.innerHTML = `

    <div
      class="loading"
      style="color:#ff647c;"
    >

      <i class="fa-solid fa-circle-exclamation"></i>

      <div style="margin-top:10px;">
        ${escapeHTML(message)}
      </div>

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
  "☁️ R2 Worker:",
  R2_WORKER
);