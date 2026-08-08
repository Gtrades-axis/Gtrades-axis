// ============================================================
// GTRADES-AXIS™ — RESOURCES
// js/resources.js
// ============================================================

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc
} from "firebase/firestore";

import {
  getDownloadUrl
} from "./upload.js";


// ============================================================
// ELEMENTS
// ============================================================

const container = document.getElementById("resourcesContainer");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const noResults = document.getElementById("noResultsMessage");
const filterButtons = document.querySelectorAll(".filter-btn");
const logoutBtn = document.getElementById("logoutBtn");


// ============================================================
// STATE
// ============================================================

let resources = [];
let activeCategory = "All";
let hasPremiumAccess = false;


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      showError("Your account information could not be found.");
      return;
    }

    const userData = userSnap.data();

    hasPremiumAccess =
      userData.role === "admin" ||
      userData.membership === "premium";

    if (!hasPremiumAccess) {
      showLocked();
      return;
    }

    await loadResources();

  } catch (error) {

    console.error("AUTH ERROR:", error);

    showError(
      "Unable to verify your account. Please refresh the page."
    );
  }

});


// ============================================================
// LOGOUT
// ============================================================

if (logoutBtn) {

  logoutBtn.addEventListener("click", async () => {

    const confirmed = confirm("Logout?");

    if (!confirmed) return;

    try {

      await signOut(auth);

      window.location.href = "login.html";

    } catch (error) {

      console.error("LOGOUT ERROR:", error);

      alert("Logout failed. Please try again.");
    }

  });

}


// ============================================================
// LOAD RESOURCES
// ============================================================

async function loadResources() {

  if (!container) {
    console.error(
      "resourcesContainer was not found in resources.html"
    );
    return;
  }

  container.innerHTML = `
    <div class="status-message visible">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Loading resources...</p>
    </div>
  `;

  try {

    const resourcesQuery = query(
      collection(db, "resources"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(resourcesQuery);

    resources = [];

    snapshot.forEach((resourceDoc) => {

      resources.push({
        id: resourceDoc.id,
        ...resourceDoc.data()
      });

    });

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
      "Unable to load resources. Check your Firestore permissions and indexes."
    );
  }

}


// ============================================================
// RENDER RESOURCES
// ============================================================

function renderResources() {

  if (!container) return;

  let filteredResources = [...resources];


  // CATEGORY FILTER
  if (activeCategory !== "All") {

    filteredResources =
      filteredResources.filter((resource) => {

        return String(
          resource.category || ""
        ).toLowerCase() ===
        String(
          activeCategory
        ).toLowerCase();

      });

  }


  // SEARCH
  const searchTerm =
    searchInput?.value
      ?.toLowerCase()
      .trim() || "";


  if (searchTerm) {

    filteredResources =
      filteredResources.filter((resource) => {

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
          title.includes(searchTerm) ||
          description.includes(searchTerm) ||
          category.includes(searchTerm)
        );

      });

  }


  // NO RESULTS
  if (filteredResources.length === 0) {

    container.innerHTML = "";

    if (noResults) {
      noResults.classList.add("visible");
    }

    return;
  }


  if (noResults) {
    noResults.classList.remove("visible");
  }


  container.innerHTML = "";


  filteredResources.forEach((resource) => {

    const card =
      createResourceCard(resource);

    container.appendChild(card);

  });

}


// ============================================================
// CREATE RESOURCE CARD
// ============================================================

function createResourceCard(resource) {

  const card =
    document.createElement("div");

  card.className = "resource-card";


  const title =
    resource.title ||
    "Untitled Resource";

  const description =
    resource.description ||
    "Premium trading resource.";

  const category =
    resource.category ||
    "General";

  const fileKey =
    resource.fileKey ||
    resource.resourceKey ||
    resource.key ||
    "";


  const premium =
    resource.premiumOnly === true;


  const icon =
    getIcon(category, fileKey);


  const isVideo =
    /\.(mp4|mov|webm|m4v|avi)$/i
      .test(fileKey);


  card.innerHTML = `

    <div class="resource-icon">
      <i class="${icon}"></i>
    </div>

    <div class="resource-content">

      <div class="resource-top">

        <span class="resource-category">
          ${escapeHTML(category)}
        </span>

        <span class="resource-badge ${
          premium ? "premium" : "free"
        }">

          ${
            premium
              ? "Premium"
              : "Free"
          }

        </span>

      </div>


      <h3 class="resource-title">
        ${escapeHTML(title)}
      </h3>


      <p class="resource-description">
        ${escapeHTML(description)}
      </p>


      <button
        class="resource-download-btn"
        type="button"
        ${fileKey ? "" : "disabled"}
      >

        <i class="fa-solid ${
          isVideo
            ? "fa-play"
            : "fa-download"
        }"></i>

        ${
          isVideo
            ? "Open Video"
            : "Download"
        }

      </button>

    </div>

  `;


  const button =
    card.querySelector(
      ".resource-download-btn"
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


  return card;
}


// ============================================================
// DOWNLOAD RESOURCE FROM R2
// ============================================================

async function downloadResource(
  resource,
  button
) {

  const fileKey =
    resource.fileKey ||
    resource.resourceKey ||
    resource.key ||
    "";


  if (!fileKey) {

    alert(
      "This resource does not have an R2 file attached."
    );

    console.error(
      "Missing fileKey:",
      resource
    );

    return;
  }


  const originalHTML =
    button.innerHTML;


  button.disabled = true;

  button.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    Preparing...
  `;


  try {

    console.log(
      "Getting R2 download URL for:",
      fileKey
    );


    const signedURL =
      await getDownloadUrl(fileKey);


    console.log(
      "R2 signed URL received."
    );


    /*
      Open the Cloudflare R2 signed URL.
      Browser will decide whether to display
      or download the file based on its MIME type.
    */

    const newWindow =
      window.open(
        signedURL,
        "_blank"
      );


    // Popup blocker fallback
    if (!newWindow) {

      window.location.href =
        signedURL;

    }

  } catch (error) {

    console.error(
      "R2 DOWNLOAD ERROR:",
      error
    );

    alert(
      "Unable to download this resource.\n\n" +
      error.message
    );

  } finally {

    button.disabled = false;

    button.innerHTML =
      originalHTML;

  }

}


// ============================================================
// SEARCH
// ============================================================

if (searchInput) {

  searchInput.addEventListener(
    "input",
    () => {
      renderResources();
    }
  );

}


// ============================================================
// CLEAR SEARCH
// ============================================================

if (clearSearch) {

  clearSearch.addEventListener(
    "click",
    () => {

      if (searchInput) {

        searchInput.value = "";

        searchInput.focus();

      }

      renderResources();

    }
  );

}


// ============================================================
// CATEGORY FILTERS
// ============================================================

filterButtons.forEach((button) => {

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

});


// ============================================================
// ICONS
// ============================================================

function getIcon(
  category,
  fileKey
) {

  const value =
    (
      String(category) +
      " " +
      String(fileKey)
    ).toLowerCase();


  if (
    value.includes("pdf")
  ) {
    return "fa-solid fa-file-pdf";
  }


  if (
    value.includes("journal") ||
    value.includes("excel") ||
    value.includes("xlsx") ||
    value.includes("xls") ||
    value.includes("csv")
  ) {
    return "fa-solid fa-book";
  }


  if (
    value.includes("indicator") ||
    value.endsWith(".ex4") ||
    value.endsWith(".ex5")
  ) {
    return "fa-solid fa-chart-column";
  }


  if (
    value.includes("strategy")
  ) {
    return "fa-solid fa-chess";
  }


  if (
    /\.(mp4|mov|webm|m4v|avi)$/i
      .test(value)
  ) {
    return "fa-solid fa-circle-play";
  }


  if (
    /\.(zip|rar|7z)$/i
      .test(value)
  ) {
    return "fa-solid fa-file-zipper";
  }


  return "fa-solid fa-file";
}


// ============================================================
// PREMIUM LOCK
// ============================================================

function showLocked() {

  if (!container) return;


  container.innerHTML = `

    <div
      style="
        grid-column:1/-1;
        text-align:center;
        padding:60px 20px;
        background:#131724;
        border:1px solid #2a3450;
        border-radius:14px;
      "
    >

      <div
        style="
          width:90px;
          height:90px;
          margin:0 auto 20px;
          border-radius:50%;
          background:rgba(245,166,35,.12);
          display:flex;
          align-items:center;
          justify-content:center;
          color:#f5a623;
          font-size:2.5rem;
        "
      >

        <i class="fa-solid fa-lock"></i>

      </div>


      <h2>
        Premium Members Only
      </h2>


      <p
        style="
          color:#94a3b8;
          margin:12px 0 25px;
        "
      >

        Upgrade your membership
        to access premium resources.

      </p>


      <a
        href="upgrade.html"
        style="
          display:inline-block;
          padding:12px 30px;
          border-radius:8px;
          background:linear-gradient(
            135deg,
            #f5a623,
            #f7c948
          );
          color:#0b0d15;
          font-weight:700;
          text-decoration:none;
        "
      >

        Upgrade Membership

      </a>

    </div>

  `;

}


// ============================================================
// ERROR
// ============================================================

function showError(message) {

  if (!container) return;


  container.innerHTML = `

    <div
      style="
        grid-column:1/-1;
        text-align:center;
        padding:50px 20px;
        color:#ff8799;
      "
    >

      <i
        class="fa-solid fa-circle-exclamation"
        style="
          font-size:2.5rem;
          margin-bottom:15px;
        "
      ></i>


      <p>
        ${escapeHTML(message)}
      </p>

    </div>

  `;

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}