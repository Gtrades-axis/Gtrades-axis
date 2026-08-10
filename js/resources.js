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

const resourceCount =
  document.getElementById("resourceCount");

const searchInput =
  document.getElementById("searchInput");

const refreshBtn =
  document.getElementById("refreshBtn");

const accessChip =
  document.getElementById("accessChip");

const logoutBtn =
  document.getElementById("logoutBtn");

const filterButtons =
  document.querySelectorAll(".filter");


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
// R2 URL
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

  url.searchParams.set(
    "action",
    "file"
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

    throw new Error(
      `R2 Worker returned ${response.status}`
    );

  }

  const data =
    await response.json();

  if (!data.url) {

    throw new Error(
      data.error ||
      "R2 file URL was not returned."
    );

  }

  return data.url;

}


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "/login";

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

      updateAccessChip();

      await loadResources();

    }

    catch (error) {

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
// ACCESS CHIP
// ============================================================

function updateAccessChip() {

  if (!accessChip) {
    return;
  }

  if (hasPremiumAccess) {

    accessChip.innerHTML = `
      <i class="fa-solid fa-shield-check"></i>
      Premium Access
    `;

  }

  else {

    accessChip.innerHTML = `
      <i class="fa-solid fa-lock"></i>
      Member Access
    `;

  }

}


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

    // --------------------------------------------------------
    // ORDERED QUERY
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

    catch (error) {

      console.warn(
        "Ordered resources query failed.",
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

        const data =
          resourceDoc.data();

        resources.push({

          id:
            resourceDoc.id,

          title:
            data.title ||
            data.name ||
            "Untitled Resource",

          description:
            data.description ||
            data.desc ||
            "Premium trading resource.",

          category:
            data.category ||
            "PDFs",

          premiumOnly:
            data.premiumOnly === true,

          fileKey:
            data.fileKey ||
            data.resourceKey ||
            data.r2Key ||
            data.storageKey ||
            data.filePath ||
            data.key ||
            "",

          fileName:
            data.fileName ||
            data.name ||
            "",

          fileType:
            data.fileType ||
            data.type ||
            "PDF",

          size:
            data.size ||
            "",

          createdAt:
            data.createdAt ||
            null

        });

      }
    );


    console.log(
      "Resources loaded:",
      resources
    );


    renderResources();

  }

  catch (error) {

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
// RENDER
// ============================================================

function renderResources() {

  if (!resourceGrid) {
    return;
  }

  resourceGrid.innerHTML = "";

  let filtered =
    [...resources];


  // ==========================================================
  // CATEGORY
  // ==========================================================

  if (
    activeCategory !== "All"
  ) {

    filtered =
      filtered.filter(
        (resource) =>
          String(
            resource.category
          )
            .toLowerCase()
            .trim() ===
          String(
            activeCategory
          )
            .toLowerCase()
            .trim()
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
              resource.title
            )
              .toLowerCase();

          const description =
            String(
              resource.description
            )
              .toLowerCase();

          const category =
            String(
              resource.category
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
      <div
        class="loading"
        style="grid-column:1/-1;"
      >

        <i
          class="fa-solid fa-folder-open"
          style="font-size:2rem;"
        ></i>

        <p>
          No resources found.
        </p>

      </div>
    `;

    return;

  }


  // ==========================================================
  // CARDS
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
// CREATE CARD
// ============================================================

function createResourceCard(
  resource
) {

  const card =
    document.createElement(
      "article"
    );

  const premiumOnly =
    resource.premiumOnly === true;

  const canDownload =
    !premiumOnly ||
    hasPremiumAccess;

  const category =
    resource.category ||
    "PDFs";

  const title =
    resource.title ||
    "Untitled Resource";

  const description =
    resource.description ||
    "Premium trading resource.";


  card.className =
    "resource-card";


  if (!canDownload) {

    card.classList.add(
      "locked"
    );

  }


  card.innerHTML = `

    <div class="resource-icon">

      <i class="fa-solid ${
        getIcon(category)
      }"></i>

    </div>


    <div class="resource-body">

      <div class="resource-top">

        <span class="resource-category">

          ${escapeHTML(
            category
          )}

        </span>


        <span class="resource-badge ${
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


      <h3 class="resource-title">

        ${escapeHTML(
          title
        )}

      </h3>


      <p class="resource-description">

        ${escapeHTML(
          description
        )}

      </p>


      <div class="resource-footer">

        <span class="resource-storage">

          <i class="fa-solid fa-cloud"></i>

          R2 Storage

        </span>


        ${
          canDownload

            ? `

              <button
                class="download-resource"
                type="button"
              >

                <i class="fa-solid fa-download"></i>

                Download

              </button>

            `

            : `

              <span class="resource-locked">

                <i class="fa-solid fa-lock"></i>

                Premium Only

              </span>

            `
        }

      </div>

    </div>

  `;


  // ==========================================================
  // DOWNLOAD
  // ==========================================================

  if (canDownload) {

    const downloadButton =
      card.querySelector(
        ".download-resource"
      );

    downloadButton?.addEventListener(
      "click",
      async (event) => {

        event.preventDefault();

        event.stopPropagation();

        await downloadResource(
          resource,
          downloadButton
        );

      }
    );

  }


  return card;

}


// ============================================================
// ICON
// ============================================================

function getIcon(
  category
) {

  const value =
    String(
      category || ""
    )
      .toLowerCase();


  if (
    value.includes("pdf")
  ) {

    return "fa-file-pdf";

  }


  if (
    value.includes("indicator")
  ) {

    return "fa-chart-line";

  }


  if (
    value.includes("journal")
  ) {

    return "fa-book";

  }


  if (
    value.includes("strategy")
  ) {

    return "fa-chess";

  }


  if (
    value.includes("video")
  ) {

    return "fa-circle-play";

  }


  return "fa-file-lines";

}


// ============================================================
// DOWNLOAD RESOURCE
// ============================================================

async function downloadResource(
  resource,
  button
) {

  const key =
    resource.fileKey;


  if (!key) {

    alert(
      "This resource does not have an R2 file attached."
    );

    console.error(
      "Missing R2 file key:",
      resource
    );

    return;

  }


  if (
    resource.premiumOnly === true &&
    !hasPremiumAccess
  ) {

    alert(
      "Premium membership is required."
    );

    return;

  }


  const originalHTML =
    button.innerHTML;


  button.disabled =
    true;

  button.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    Preparing...
  `;


  try {

    console.log(
      "Downloading R2 resource:",
      key
    );


    const fileURL =
      await getR2FileURL(
        key
      );


    // --------------------------------------------------------
    // OPEN FILE
    // --------------------------------------------------------

    window.open(
      fileURL,
      "_blank",
      "noopener,noreferrer"
    );


  }

  catch (error) {

    console.error(
      "RESOURCE DOWNLOAD ERROR:",
      error
    );

    alert(
      "Unable to open this resource.\n\n" +
      error.message
    );

  }

  finally {

    button.disabled =
      false;

    button.innerHTML =
      originalHTML;

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

    try {

      await loadResources();

    }

    finally {

      refreshBtn.disabled =
        false;

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
        "/login";

    }

    catch (error) {

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
      "
    >

      <i
        class="fa-solid fa-circle-exclamation"
        style="
          font-size:2.5rem;
          color:#ff6b81;
          margin-bottom:20px;
        "
      ></i>


      <h3>
        Unable to load resources
      </h3>


      <p
        style="
          color:#94a3b8;
          margin-top:10px;
        "
      >

        ${escapeHTML(
          message
        )}

      </p>

    </div>

  `;


  if (resourceCount) {

    resourceCount.textContent =
      "0 resources";

  }

}


// ============================================================
// INITIAL UI
// ============================================================

if (resourceCount) {

  resourceCount.textContent =
    "Loading...";

}