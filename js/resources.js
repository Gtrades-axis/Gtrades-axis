// ============================================================
// GTRADES-AXIS™ – RESOURCES PAGE (CLOUDFLARE R2 INTEGRATED)
// ============================================================

import { auth, db, functions } from "./firebase.js";
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
import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-functions.js";

/* ==========================================
   ELEMENTS
========================================== */
const logoutBtn = document.getElementById("logoutBtn");
const searchInput = document.getElementById("searchInput");
const container = document.getElementById("resourcesContainer");
const filterButtons = document.querySelectorAll(".filter-btn");

let resources = [];
let currentCategory = "All";
let currentUser = null;
let userRole = "member";
let userMembership = "free";
let hasPremiumAccess = false;

/* ==========================================
   DOWNLOAD HELPER (R2)
========================================== */
async function downloadR2File(key) {
  if (!key) {
    alert("No file key found for this resource.");
    return;
  }
  try {
    const getDownloadUrl = httpsCallable(functions, "getR2DownloadUrl");
    const result = await getDownloadUrl({ key });
    window.open(result.data.url, "_blank");
  } catch (error) {
    console.error("R2 download error:", error);
    alert("Failed to get download link: " + error.message);
  }
}

/* ==========================================
   AUTH
========================================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      userRole = data.role || "member";
      userMembership = data.membership || "free";
      hasPremiumAccess = (userRole === "admin" || userMembership === "premium");
    }
  } catch (e) {
    console.error("Error fetching user data:", e);
  }

  await loadResources();
});

/* ==========================================
   LOGOUT
========================================== */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    if (!confirm("Logout?")) return;
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (e) {
      console.error(e);
    }
  });
}

/* ==========================================
   LOAD RESOURCES
========================================== */
async function loadResources() {
  resources = [];
  const q = query(
    collection(db, "resources"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    resources.push({
      id: doc.id,
      ...doc.data()
    });
  });
  renderResources();
}

/* ==========================================
   RENDER RESOURCES (R2 + Legacy fallback)
========================================== */
function renderResources() {
  if (!container) return;
  container.innerHTML = "";

  let filtered = resources;
  if (currentCategory !== "All") {
    filtered = filtered.filter(resource => resource.category === currentCategory);
  }
  const keyword = searchInput.value.toLowerCase().trim();
  if (keyword !== "") {
    filtered = filtered.filter(resource =>
      resource.title.toLowerCase().includes(keyword) ||
      (resource.description || "").toLowerCase().includes(keyword)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="loading-card"><h3>No resources found.</h3></div>`;
    return;
  }

  filtered.forEach(resource => {
    const isPremiumOnly = resource.premiumOnly === true;
    const canAccess = !isPremiumOnly || hasPremiumAccess;

    let downloadHtml = "";
    const fileKey = resource.fileKey;      // R2 key (new)
    const legacyLink = resource.link;      // old Firebase Storage URL

    if (canAccess) {
      if (fileKey) {
        downloadHtml = `
          <button class="resource-download r2-download-btn" data-key="${fileKey}" style="background:#4f7cff;border:none;padding:10px 20px;border-radius:8px;color:#fff;font-weight:600;cursor:pointer;margin-top:10px;width:100%;">
            <i class="fa-solid fa-download"></i> Download
          </button>
        `;
      } else if (legacyLink) {
        downloadHtml = `
          <a href="${legacyLink}" target="_blank" class="resource-download" style="display:inline-block;margin-top:10px;background:#4f7cff;padding:10px 20px;border-radius:8px;color:#fff;font-weight:600;text-decoration:none;width:100%;text-align:center;">
            <i class="fa-solid fa-download"></i> Download
          </a>
        `;
      } else {
        downloadHtml = `<div style="color:#94a3b8;margin-top:10px;">No file attached</div>`;
      }
    } else {
      downloadHtml = `
        <div style="color:#94a3b8;font-size:0.9rem;margin-top:10px;">
          <i class="fa-solid fa-crown"></i> Upgrade to access
        </div>
      `;
    }

    const card = document.createElement("div");
    card.className = "quick-card" + (canAccess ? "" : " locked");
    if (!canAccess) {
      card.style.position = "relative";
      card.style.overflow = "hidden";
    }

    card.innerHTML = `
      <div class="quick-icon"><i class="fa-solid fa-folder-open"></i></div>
      <h3>${resource.title}</h3>
      <p>${resource.description || "Premium Trading Resource"}</p>
      <div style="margin:15px 0;">
        <span class="member-badge">${resource.category}</span>
        ${isPremiumOnly ? `<span class="member-badge" style="background:#e74c3c;margin-left:8px;">Premium</span>` : `<span class="member-badge" style="background:#18b663;margin-left:8px;">Free</span>`}
      </div>
      ${downloadHtml}
      ${!canAccess ? `
        <div class="lock-overlay" style="position:absolute;inset:0;background:rgba(11,13,21,0.7);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;backdrop-filter:blur(2px);z-index:5;">
          <i class="fa-solid fa-lock" style="font-size:2rem;color:#f5a623;"></i>
          <span style="color:#e8edf5;font-weight:500;">Premium Only</span>
        </div>
      ` : ''}
    `;

    container.appendChild(card);
  });

  container.querySelectorAll(".r2-download-btn").forEach(btn => {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      downloadR2File(this.dataset.key);
    });
  });
}

/* ==========================================
   SEARCH & FILTERS
========================================== */
if (searchInput) {
  searchInput.addEventListener("input", renderResources);
}
filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    document.querySelector(".filter-btn.active")?.classList.remove("active");
    button.classList.add("active");
    currentCategory = button.dataset.category;
    renderResources();
  });
});

setInterval(async () => { try { await loadResources(); } catch (e) {} }, 60000);
document.addEventListener("visibilitychange", async () => {
  if (!document.hidden) { try { await loadResources(); } catch (e) {} }
});

console.log("✅ GTRADES-AXIS™ Resources (R2) Loaded");