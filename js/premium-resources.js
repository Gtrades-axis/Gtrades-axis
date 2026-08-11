```javascript
// ============================================================
// GTRADES-AXIS™
// STUDENT RESOURCES LOADER
// js/resources.js
//
// Firestore:
//   collection: resources
//
// Cloudflare R2:
//   Worker: r2-uploader.davidthuku574.workers.dev
//
// Supports resource fields:
//   title
//   description
//   category
//   premiumOnly
//   resourceKey
//   fileKey
//   r2Key
//   storageKey
//   thumbnailKey
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";

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


// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBZmsLm64PyEL9jifi32bpgvWfhluIWCZM",
  authDomain: "gtrades-axis.firebaseapp.com",
  projectId: "gtrades-axis",
  storageBucket: "gtrades-axis.firebasestorage.app",
  messagingSenderId: "111456545888",
  appId: "1:111456545888:web:f0526c142d7ea5e22fe705"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// CLOUDFLARE R2
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


// ============================================================
// STATE
// ============================================================

let allResources = [];
let activeCategory = "All";
let currentUser = null;
let isPremium = false;


// ============================================================
// R2 URL
// ============================================================

function buildR2Url(key) {

  if (!key) {
    throw new Error("Missing R2 file key.");
  }

  const cleanKey =
    String(key)
      .trim()
      .replace(/^\/+/, "");

  if (!cleanKey) {
    throw new Error("Invalid R2 file key.");
  }

  const url = new URL(R2_WORKER);

  url.searchParams.set("key", cleanKey);
  url.searchParams.set("action", "file");

  return url.toString();
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
    resource.filePath ||
    resource.downloadKey ||
    ""
  );
}


// ============================================================
// GET THUMBNAIL KEY
// ============================================================

function getThumbnailKey(resource) {

  return (
    resource.thumbnailKey ||
    resource.thumbnailFileKey ||
    resource.thumbnailR2Key ||
    ""
  );
}


// ============================================================
// HTML ESCAPE
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
// ICON
// ============================================================

function getResourceIcon(resource) {

  const key =
    getResourceKey(resource).toLowerCase();

  const title =
    String(resource.title || "").toLowerCase();

  const category =
    String(resource.category || "").toLowerCase();

  if (
    key.endsWith(".pdf") ||
    title.includes("pdf") ||
    category.includes("pdf")
  ) {
    return "fa-file-pdf";
  }

  if (
    key.endsWith(".xlsx") ||
    key.endsWith(".xls") ||
    title.includes("excel") ||
    category.includes("journal")
  ) {
    return "fa-file-excel";
  }

  if (
    key.endsWith(".zip") ||
    key.endsWith(".rar")
  ) {
    return "fa-file-zipper";
  }

  if (
    key.endsWith(".png") ||
    key.endsWith(".jpg") ||
    key.endsWith(".jpeg") ||
    key.endsWith(".webp")
  ) {
    return "fa-file-image";
  }

  if (
    category.includes("indicator") ||
    title.includes("indicator")
  ) {
    return "fa-chart-line";
  }

  if (
    category.includes("strategy") ||
    title.includes("strategy")
  ) {
    return "fa-chess";
  }

  return "fa-file-lines";
}


// ============================================================
// MEMBERSHIP
// ============================================================

async function loadMembership(user) {

  isPremium = false;

  if (!user) {
    return;
  }

  try {

    const userRef =
      doc(db, "users", user.uid);

    const userSnap =
      await getDoc(userRef);

    if (userSnap.exists()) {

      const data =
        userSnap.data();

      const membership =
        String(
          data.membership ||
          data.plan ||
          data.subscription ||
          ""
        ).toLowerCase();

      const role =
        String(
          data.role || ""
        ).toLowerCase();

      isPremium =
        membership === "premium" ||
        membership === "premium_member" ||
        membership === "paid" ||
        role === "premium" ||
        role === "admin" ||
        role === "superadmin";

    }

  } catch (error) {

    console.warn(
      "Membership check failed:",
      error
    );

  }

  updateAccessChip();
}


// ============================================================
// ACCESS CHIP
// ============================================================

function updateAccessChip() {

  if (!accessChip) return;

  if (isPremium) {

    accessChip.classList.add("premium");

    accessChip.innerHTML =
      `<i class="fa-solid fa-crown"></i>
       Premium Access`;

  } else {

    accessChip.classList.remove("premium");

    accessChip.innerHTML =
      `<i class="fa-solid fa-shield-check"></i>
       Member Access`;

  }
}


// ============================================================
// LOAD RESOURCES
// ============================================================

async function loadResources() {

  if (!resourceGrid) {
    console.error(
      "resourceGrid element not found."
    );
    return;
  }

  resourceGrid.innerHTML = `
    <div class="loading">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <div>Loading your resources...</div>
    </div>
  `;

  if (resourceCount) {
    resourceCount.textContent =
      "Loading...";
  }

  try {

    let snapshot;

    // --------------------------------------------------------
    // First try newest first
    // --------------------------------------------------------

    try {

      const q =
        query(
          collection(db, "resources"),
          orderBy("createdAt", "desc")
        );

      snapshot =
        await getDocs(q);

    } catch (orderedError) {

      console.warn(
        "Ordered resources query failed. Loading normally.",
        orderedError
      );

      snapshot =
        await getDocs(
          collection(db, "resources")
        );

    }


    // --------------------------------------------------------
    // Convert documents
    // --------------------------------------------------------

    allResources = [];

    snapshot.forEach(resourceDoc => {

      const data =
        resourceDoc.data();

      allResources.push({
        id: resourceDoc.id,
        ...data
      });

    });


    // --------------------------------------------------------
    // Sort locally as backup
    // --------------------------------------------------------

    allResources.sort(
      (a, b) => {

        const aTime =
          a.createdAt?.seconds ||
          a.createdAt?.toMillis?.() ||
          0;

        const bTime =
          b.createdAt?.seconds ||
          b.createdAt?.toMillis?.() ||
          0;

        return bTime - aTime;

      }
    );


    console.log(
      "GTRADES-AXIS RESOURCES:",
      allResources
    );


    renderResources();

  } catch (error) {

    console.error(
      "RESOURCE LOAD ERROR:",
      error
    );

    resourceGrid.innerHTML = `
      <div class="error-state">
        <i class="fa-solid fa-circle-exclamation"></i>

        <h3>
          Unable to load resources
        </h3>

        <div>
          ${escapeHTML(
            error?.message ||
            "Please try again."
          )}
        </div>

        <button id="retryResourcesBtn">
          Try Again
        </button>
      </div>
    `;

    if (resourceCount) {
      resourceCount.textContent =
        "Error";
    }

    document
      .getElementById("retryResourcesBtn")
      ?.addEventListener(
        "click",
        loadResources
      );

  }

}


// ============================================================
// FILTER RESOURCES
// ============================================================

function getFilteredResources() {

  const search =
    String(
      searchInput?.value || ""
    )
      .trim()
      .toLowerCase();


  return allResources.filter(
    resource => {

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

      const matchesSearch =
        !search ||
        title.includes(search) ||
        description.includes(search) ||
        category.includes(search);


      const resourceCategory =
        String(
          resource.category ||
          "General"
        )
          .trim()
          .toLowerCase();


      const matchesCategory =
        activeCategory === "All" ||
        resourceCategory ===
          activeCategory
            .trim()
            .toLowerCase();


      return (
        matchesSearch &&
        matchesCategory
      );

    }
  );

}


// ============================================================
// RENDER
// ============================================================

function renderResources() {

  if (!resourceGrid) return;

  const resources =
    getFilteredResources();


  if (resourceCount) {

    resourceCount.textContent =
      `${resources.length} resource${
        resources.length === 1
          ? ""
          : "s"
      }`;

  }


  if (resources.length === 0) {

    resourceGrid.innerHTML = `
      <div class="empty-state">

        <i class="fa-solid fa-folder-open"></i>

        <h3>
          No resources found
        </h3>

        <div>
          ${
            allResources.length === 0
              ? "No resources have been uploaded yet."
              : "Try another search or category."
          }
        </div>

      </div>
    `;

    return;

  }


  resourceGrid.innerHTML =
    resources
      .map(createResourceCard)
      .join("");


  document
    .querySelectorAll(".resource-download")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset.id;

          const resource =
            allResources.find(
              item => item.id === id
            );

          if (resource) {
            downloadResource(resource);
          }

        }
      );

    });

}


// ============================================================
// RESOURCE CARD
// ============================================================

function createResourceCard(resource) {

  const title =
    resource.title ||
    "Untitled Resource";

  const description =
    resource.description ||
    "GTRADES-AXIS™ trading resource.";

  const category =
    resource.category ||
    "General";

  const premium =
    resource.premiumOnly === true ||
    resource.premium === true;

  const key =
    getResourceKey(resource);

  const available =
    Boolean(key);

  const locked =
    premium && !isPremium;

  const icon =
    getResourceIcon(resource);


  let buttonHTML;


  if (!available) {

    buttonHTML = `
      <button
        class="download-btn locked-btn"
        disabled
      >
        <i class="fa-solid fa-ban"></i>
        File unavailable
      </button>
    `;

  } else if (locked) {

    buttonHTML = `
      <button
        class="download-btn locked-btn"
        disabled
      >
        <i class="fa-solid fa-lock"></i>
        Premium Resource
      </button>
    `;

  } else {

    buttonHTML = `
      <button
        class="download-btn resource-download"
        data-id="${escapeHTML(resource.id)}"
      >
        <i class="fa-solid fa-download"></i>
        Download Resource
      </button>
    `;

  }


  return `
    <article class="resource-card">

      <div class="resource-icon">
        <i class="fa-solid ${icon}"></i>
      </div>

      <div class="resource-top">

        <div class="resource-category">
          ${escapeHTML(category)}
        </div>

        <span
          class="resource-badge ${
            premium
              ? "premium"
              : "free"
          }"
        >
          ${
            premium
              ? "PREMIUM"
              : "FREE"
          }
        </span>

      </div>

      <div class="resource-body">

        <h3>
          ${escapeHTML(title)}
        </h3>

        <p>
          ${escapeHTML(description)}
        </p>

        <div
          class="resource-storage ${
            available
              ? ""
              : "unavailable"
          }"
        >

          <i class="fa-solid ${
            available
              ? "fa-cloud"
              : "fa-triangle-exclamation"
          }"></i>

          ${
            available
              ? "Cloudflare R2"
              : "No file attached"
          }

        </div>

      </div>

      <div class="resource-action">
        ${buttonHTML}
      </div>

    </article>
  `;

}


// ============================================================
// DOWNLOAD RESOURCE
// ============================================================

async function downloadResource(resource) {

  const premium =
    resource.premiumOnly === true ||
    resource.premium === true;


  if (premium && !isPremium) {

    alert(
      "This resource is available to Premium members only."
    );

    return;

  }


  const key =
    getResourceKey(resource);


  if (!key) {

    alert(
      "This resource does not have an R2 file attached."
    );

    return;

  }


  try {

    const button =
      document.querySelector(
        `.resource-download[data-id="${CSS.escape(resource.id)}"]`
      );

    if (button) {

      button.disabled = true;

      button.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i>
         Opening...`;

    }


    const url =
      buildR2Url(key);


    console.log(
      "RESOURCE R2 URL:",
      url
    );


    // Open directly.
    // The Worker handles the file.
    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );


  } catch (error) {

    console.error(
      "RESOURCE DOWNLOAD ERROR:",
      error
    );

    alert(
      "Unable to open resource: " +
      (error?.message || "Unknown error")
    );

  } finally {

    setTimeout(
      renderResources,
      500
    );

  }

}


// ============================================================
// CATEGORY FILTERS
// ============================================================

document
  .querySelectorAll(".filter")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".filter")
          .forEach(btn =>
            btn.classList.remove("active")
          );

        button.classList.add("active");

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

    refreshBtn.disabled = true;

    try {

      await loadResources();

    } finally {

      refreshBtn.disabled = false;

    }

  }
);


// ============================================================
// LOGOUT
// ============================================================

document
  .getElementById("logoutBtn")
  ?.addEventListener(
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

      }

    }
  );


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async user => {

    console.log(
      "RESOURCE AUTH:",
      user
    );


    if (!user) {

      window.location.href =
        "login.html";

      return;

    }


    currentUser = user;


    await loadMembership(
      user
    );


    await loadResources();

  }
);
```
