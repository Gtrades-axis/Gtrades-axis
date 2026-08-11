// ============================================================
// GTRADES-AXIS™
// STUDENT PREMIUM RESOURCES
// js/resources.js
//
// Firestore collection:
//   resources
//
// Supported R2 key fields:
//   fileKey
//   resourceKey
//   r2Key
//   key
//   storageKey
//
// Cloudflare R2 Worker:
//   https://r2-uploader.davidthuku574.workers.dev
// ============================================================

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};


// ============================================================
// IMPORTANT
// If your project already has firebase.js, use that instead.
//
// Example:
//
// import { auth, db } from "./firebase.js";
//
// The configuration below must match your existing Firebase
// project.
// ============================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// CLOUDFLARE R2 WORKER
// ============================================================

const WORKER_URL =
  "https://r2-uploader.davidthuku574.workers.dev";


// ============================================================
// GLOBAL STATE
// ============================================================

let allResources = [];
let currentCategory = "All";
let currentSearch = "";


// ============================================================
// DOM
// ============================================================

const resourceGrid =
  document.getElementById("resourceGrid");

const resourceCount =
  document.getElementById("resourceCount");

const searchInput =
  document.getElementById("searchInput");

const refreshBtn =
  document.getElementById("refreshBtn");

const filters =
  document.getElementById("filters");

const logoutBtn =
  document.getElementById("logoutBtn");

const accessChip =
  document.getElementById("accessChip");


// ============================================================
// HELPERS
// ============================================================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ============================================================
// GET R2 KEY
//
// Supports different versions of the admin resource system.
// ============================================================

function getResourceKey(resource) {

  return (
    resource.fileKey ||
    resource.resourceKey ||
    resource.r2Key ||
    resource.storageKey ||
    resource.key ||
    resource.file ||
    ""
  );
}


// ============================================================
// GET RESOURCE URL
// ============================================================

function getDownloadUrl(key) {

  if (!key) {
    throw new Error("This resource has no R2 file key.");
  }

  return (
    WORKER_URL +
    "/file?key=" +
    encodeURIComponent(key)
  );
}


// ============================================================
// GET ICON
// ============================================================

function getResourceIcon(resource) {

  const category =
    String(resource.category || "").toLowerCase();

  const title =
    String(resource.title || "").toLowerCase();

  const key =
    getResourceKey(resource).toLowerCase();

  if (
    category.includes("video") ||
    key.endsWith(".mp4") ||
    key.endsWith(".webm") ||
    key.endsWith(".mov")
  ) {
    return "fa-circle-play";
  }

  if (
    category.includes("journal") ||
    title.includes("journal")
  ) {
    return "fa-chart-line";
  }

  if (
    category.includes("indicator") ||
    title.includes("indicator")
  ) {
    return "fa-chart-column";
  }

  if (
    category.includes("strategy") ||
    title.includes("strategy")
  ) {
    return "fa-crosshairs";
  }

  if (
    key.endsWith(".pdf") ||
    category.includes("pdf")
  ) {
    return "fa-file-pdf";
  }

  if (
    key.endsWith(".xlsx") ||
    key.endsWith(".xls") ||
    key.endsWith(".csv")
  ) {
    return "fa-file-excel";
  }

  if (
    key.endsWith(".doc") ||
    key.endsWith(".docx")
  ) {
    return "fa-file-word";
  }

  return "fa-folder-open";
}


// ============================================================
// PREMIUM CHECK
//
// Supports:
// premiumOnly
// premium
// isPremium
// access
// membership
// ============================================================

function isPremiumResource(resource) {

  if (resource.premiumOnly === true) {
    return true;
  }

  if (resource.premium === true) {
    return true;
  }

  if (resource.isPremium === true) {
    return true;
  }

  const access =
    String(resource.access || "").toLowerCase();

  if (access === "premium") {
    return true;
  }

  const membership =
    String(resource.membership || "").toLowerCase();

  if (membership === "premium") {
    return true;
  }

  return false;
}


// ============================================================
// NORMALIZE CATEGORY
// ============================================================

function normalizeCategory(category) {

  const value =
    String(category || "")
      .trim()
      .toLowerCase();

  if (!value) {
    return "Other";
  }

  if (
    value.includes("pdf") ||
    value.includes("document")
  ) {
    return "PDFs";
  }

  if (value.includes("indicator")) {
    return "Indicators";
  }

  if (value.includes("journal")) {
    return "Journals";
  }

  if (value.includes("strateg")) {
    return "Strategies";
  }

  if (value.includes("video")) {
    return "Videos";
  }

  return category;
}


// ============================================================
// SET LOADING
// ============================================================

function showLoading() {

  resourceGrid.innerHTML = `
    <div class="loading">

      <i class="fa-solid fa-circle-notch fa-spin"></i>

      <div>
        Loading your resources...
      </div>

    </div>
  `;

  resourceCount.textContent =
    "Loading...";
}


// ============================================================
// SHOW ERROR
// ============================================================

function showError(message) {

  console.error(
    "GTRADES-AXIS RESOURCES:",
    message
  );

  resourceGrid.innerHTML = `
    <div class="error-state">

      <i class="fa-solid fa-triangle-exclamation"></i>

      <h3>
        Unable to load resources
      </h3>

      <p>
        ${escapeHTML(message)}
      </p>

      <button id="retryResourcesBtn">
        <i class="fa-solid fa-rotate-right"></i>
        Try Again
      </button>

    </div>
  `;

  resourceCount.textContent =
    "Unable to load";

  document
    .getElementById("retryResourcesBtn")
    ?.addEventListener(
      "click",
      loadResources
    );
}


// ============================================================
// GET CURRENT USER PROFILE
// ============================================================

async function getUserProfile(user) {

  if (!user) {
    return null;
  }

  try {

    const userRef =
      doc(db, "users", user.uid);

    const snap =
      await getDoc(userRef);

    if (snap.exists()) {

      return {
        uid: user.uid,
        ...snap.data()
      };
    }

  } catch (error) {

    console.warn(
      "Could not load user profile:",
      error
    );
  }

  return {
    uid: user.uid
  };
}


// ============================================================
// CHECK STUDENT ACCESS
// ============================================================

function userHasPremiumAccess(profile) {

  if (!profile) {
    return false;
  }

  const role =
    String(profile.role || "")
      .toLowerCase();

  const membership =
    String(profile.membership || "")
      .toLowerCase();

  const plan =
    String(profile.plan || "")
      .toLowerCase();

  const status =
    String(profile.status || "")
      .toLowerCase();


  // Admin access

  if (
    role === "admin" ||
    role === "administrator"
  ) {
    return true;
  }


  // Premium membership

  if (
    membership === "premium" ||
    membership === "active" ||
    membership === "pro"
  ) {
    return true;
  }


  // Plan

  if (
    plan === "premium" ||
    plan === "pro"
  ) {
    return true;
  }


  // Some existing systems use premiumOnly/status

  if (
    profile.premium === true ||
    profile.isPremium === true
  ) {
    return true;
  }


  // Active premium member

  if (
    status === "premium"
  ) {
    return true;
  }

  return false;
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
    // Get resources
    //
    // We intentionally do NOT require orderBy(createdAt)
    // because older resources may not have createdAt.
    // --------------------------------------------------------

    const snapshot =
      await getDocs(
        collection(db, "resources")
      );


    allResources = [];


    snapshot.forEach(resourceDoc => {

      allResources.push({
        id: resourceDoc.id,
        ...resourceDoc.data()
      });

    });


    // --------------------------------------------------------
    // Sort safely in JavaScript
    // --------------------------------------------------------

    allResources.sort(
      (a, b) => {

        const aTime =
          a.createdAt?.seconds ||
          a.updatedAt?.seconds ||
          0;

        const bTime =
          b.createdAt?.seconds ||
          b.updatedAt?.seconds ||
          0;

        return bTime - aTime;
      }
    );


    console.log(
      "GTRADES-AXIS: Resources loaded:",
      allResources
    );


    // --------------------------------------------------------
    // Render
    // --------------------------------------------------------

    renderResources();


  } catch (error) {

    console.error(
      "RESOURCE LOAD ERROR:",
      error
    );

    showError(
      error?.message ||
      "Firestore could not load the resources."
    );
  }
}


// ============================================================
// FILTER RESOURCES
// ============================================================

function getFilteredResources() {

  return allResources.filter(
    resource => {

      const title =
        String(resource.title || "")
          .toLowerCase();

      const description =
        String(
          resource.description ||
          resource.desc ||
          ""
        )
          .toLowerCase();

      const category =
        normalizeCategory(
          resource.category
        );

      const searchMatch =
        !currentSearch ||
        title.includes(currentSearch) ||
        description.includes(currentSearch) ||
        String(category)
          .toLowerCase()
          .includes(currentSearch);

      const categoryMatch =
        currentCategory === "All" ||
        category === currentCategory;

      return (
        searchMatch &&
        categoryMatch
      );
    }
  );
}


// ============================================================
// RENDER RESOURCES
// ============================================================

function renderResources() {

  const resources =
    getFilteredResources();


  resourceCount.textContent =
    `${resources.length} ${
      resources.length === 1
        ? "resource"
        : "resources"
    }`;


  if (resources.length === 0) {

    resourceGrid.innerHTML = `
      <div class="empty-state">

        <i class="fa-solid fa-folder-open"></i>

        <h3>
          No resources found
        </h3>

        <p>
          ${
            allResources.length
              ? "Try another search or category."
              : "No resources have been published yet."
          }
        </p>

      </div>
    `;

    return;
  }


  resourceGrid.innerHTML =
    resources
      .map(resource => {

        return createResourceCard(
          resource
        );

      })
      .join("");


  // Attach buttons

  document
    .querySelectorAll(
      ".resource-open-btn"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        handleResourceOpen
      );

    });
}


// ============================================================
// CREATE RESOURCE CARD
// ============================================================

function createResourceCard(resource) {

  const title =
    resource.title ||
    "Untitled Resource";


  const description =
    resource.description ||
    resource.desc ||
    "GTRADES-AXIS™ trading resource.";


  const category =
    normalizeCategory(
      resource.category
    );


  const premium =
    isPremiumResource(
      resource
    );


  const key =
    getResourceKey(
      resource
    );


  const icon =
    getResourceIcon(
      resource
    );


  const hasFile =
    Boolean(key);


  return `

    <article
      class="resource-card"
      data-id="${escapeHTML(resource.id)}"
    >

      <div class="resource-icon">

        <i
          class="fa-solid ${icon}"
        ></i>

      </div>


      <div class="resource-top">

        <div class="resource-category">
          ${escapeHTML(category)}
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


      <div
        class="resource-storage ${
          hasFile
            ? ""
            : "unavailable"
        }"
      >

        <i
          class="fa-solid ${
            hasFile
              ? "fa-cloud"
              : "fa-triangle-exclamation"
          }"
        ></i>

        ${
          hasFile
            ? "Available from Cloudflare R2"
            : "File unavailable"
        }

      </div>


      <div class="resource-action">

        <button
          class="download-btn resource-open-btn ${
            premium
              ? "premium-resource"
              : ""
          }"
          data-id="${escapeHTML(resource.id)}"
          ${!hasFile ? "disabled" : ""}
        >

          <i
            class="fa-solid ${
              premium
                ? "fa-lock-open"
                : "fa-download"
            }"
          ></i>

          ${
            premium
              ? "Open Premium Resource"
              : "Open Resource"
          }

        </button>

      </div>

    </article>

  `;
}


// ============================================================
// OPEN RESOURCE
// ============================================================

async function handleResourceOpen(event) {

  const button =
    event.currentTarget;

  const id =
    button.dataset.id;


  const resource =
    allResources.find(
      item =>
        item.id === id
    );


  if (!resource) {

    alert(
      "Resource could not be found."
    );

    return;
  }


  const premium =
    isPremiumResource(
      resource
    );


  // ----------------------------------------------------------
  // Premium access
  //
  // The server/R2 endpoint itself should also be protected
  // if you require strict file-level security.
  // ----------------------------------------------------------

  if (premium) {

    const user =
      auth.currentUser;

    if (!user) {

      alert(
        "Please log in to access this premium resource."
      );

      window.location.href =
        "/login";

      return;
    }


    const profile =
      await getUserProfile(
        user
      );


    if (
      !userHasPremiumAccess(
        profile
      )
    ) {

      alert(
        "This resource is available to Premium members only."
      );

      return;
    }
  }


  const key =
    getResourceKey(
      resource
    );


  if (!key) {

    alert(
      "This resource has not been connected to a file yet."
    );

    return;
  }


  try {

    button.disabled = true;

    button.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Opening...
    `;


    const url =
      getDownloadUrl(key);


    // --------------------------------------------------------
    // Open R2 file
    // --------------------------------------------------------

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
      "Unable to open resource."
    );

  } finally {

    button.disabled = false;

    button.innerHTML = `
      <i class="fa-solid ${
        premium
          ? "fa-lock-open"
          : "fa-download"
      }"></i>

      ${
        premium
          ? "Open Premium Resource"
          : "Open Resource"
      }
    `;
  }
}


// ============================================================
// SEARCH
// ============================================================

searchInput?.addEventListener(
  "input",
  function () {

    currentSearch =
      this.value
        .trim()
        .toLowerCase();

    renderResources();
  }
);


// ============================================================
// CATEGORY FILTER
// ============================================================

filters?.addEventListener(
  "click",
  function (event) {

    const button =
      event.target.closest(
        ".filter"
      );

    if (!button) {
      return;
    }


    document
      .querySelectorAll(
        ".filter"
      )
      .forEach(
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


// ============================================================
// REFRESH
// ============================================================

refreshBtn?.addEventListener(
  "click",
  async function () {

    this.disabled = true;

    this.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      await loadResources();

    } finally {

      this.disabled = false;

      this.innerHTML = `
        <i class="fa-solid fa-rotate-right"></i>
      `;
    }
  }
);


// ============================================================
// LOGOUT
// ============================================================

logoutBtn?.addEventListener(
  "click",
  async function () {

    try {

      await signOut(auth);

      window.location.href =
        "/login";

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
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async function (user) {

    if (!user) {

      window.location.href =
        "/login";

      return;
    }


    console.log(
      "GTRADES-AXIS logged in:",
      user.email
    );


    try {

      const profile =
        await getUserProfile(
          user
        );


      const premium =
        userHasPremiumAccess(
          profile
        );


      if (accessChip) {

        accessChip.className =
          "member-chip" +
          (
            premium
              ? " premium"
              : ""
          );


        accessChip.innerHTML =
          premium

            ? `
              <i class="fa-solid fa-crown"></i>
              Premium Access
            `

            : `
              <i class="fa-solid fa-shield-check"></i>
              Member Access
            `;
      }


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
