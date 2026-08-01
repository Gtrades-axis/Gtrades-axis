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
   AUTH
========================================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  // Fetch user data to check membership/role
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

  // Load resources after user data is ready
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
   RENDER RESOURCES
========================================== */
function renderResources() {
  if (!container) return;
  container.innerHTML = "";

  let filtered = resources;

  // Category filter
  if (currentCategory !== "All") {
    filtered = filtered.filter(resource => resource.category === currentCategory);
  }

  // Search filter
  const keyword = searchInput.value.toLowerCase().trim();
  if (keyword !== "") {
    filtered = filtered.filter(resource =>
      resource.title.toLowerCase().includes(keyword) ||
      (resource.description || "").toLowerCase().includes(keyword)
    );
  }

  // No results
  if (filtered.length === 0) {
    container.innerHTML = `<div class="loading-card"><h3>No resources found.</h3></div>`;
    return;
  }

  // Render each card
  filtered.forEach(resource => {
    const isPremiumOnly = resource.premiumOnly === true;
    const canAccess = !isPremiumOnly || hasPremiumAccess;

    let cardHtml = "";

    if (canAccess) {
      // Full card with download button
      cardHtml = `
        <div class="quick-card">
          <div class="quick-icon"><i class="fa-solid fa-folder-open"></i></div>
          <h3>${resource.title}</h3>
          <p>${resource.description || "Premium Trading Resource"}</p>
          <div style="margin:15px 0;">
            <span class="member-badge">${resource.category}</span>
            ${isPremiumOnly ? `<span class="member-badge" style="background:#e74c3c;margin-left:8px;">Premium</span>` : `<span class="member-badge" style="background:#18b663;margin-left:8px;">Free</span>`}
          </div>
          <a href="${resource.link}" target="_blank" class="resource-download">
            <i class="fa-solid fa-download"></i> Download
          </a>
        </div>
      `;
    } else {
      // Locked card – no download button
      cardHtml = `
        <div class="quick-card locked">
          <div class="quick-icon"><i class="fa-solid fa-lock"></i></div>
          <h3>${resource.title}</h3>
          <p>${resource.description || "Premium Resource"}</p>
          <div style="margin:15px 0;">
            <span class="member-badge">${resource.category}</span>
            <span class="member-badge" style="background:#e74c3c;margin-left:8px;">Premium</span>
          </div>
          <div style="color:#94a3b8; font-size:0.9rem; margin-top:8px;">
            <i class="fa-solid fa-crown"></i> Upgrade to access
          </div>
          <div class="lock-overlay">
            <i class="fa-solid fa-lock"></i>
            <span>Premium Only</span>
          </div>
        </div>
      `;
    }

    container.innerHTML += cardHtml;
  });
}

/* ==========================================
   SEARCH
========================================== */
if (searchInput) {
  searchInput.addEventListener("input", () => {
    renderResources();
  });
}

/* ==========================================
   CATEGORY FILTERS
========================================== */
filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    document.querySelector(".filter-btn.active")?.classList.remove("active");
    button.classList.add("active");
    currentCategory = button.dataset.category;
    renderResources();
  });
});

/* ==========================================
   AUTO REFRESH
========================================== */
setInterval(async () => {
  try {
    await loadResources();
  } catch (e) {
    console.error("Auto Refresh Failed:", e);
  }
}, 60000);

/* ==========================================
   LOADING STATE
========================================== */
function showLoading() {
  if (!container) return;
  container.innerHTML = `
    <div class="loading-card">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <h3>Loading Premium Resources...</h3>
    </div>
  `;
}

function showError(message = "Failed to load resources.") {
  if (!container) return;
  container.innerHTML = `
    <div class="loading-card">
      <i class="fa-solid fa-triangle-exclamation" style="font-size:40px;color:#e74c3c;"></i>
      <h3>${message}</h3>
    </div>
  `;
}

/* ==========================================
   INITIAL LOAD
========================================== */
// loadResources is called inside onAuthStateChanged after user data is fetched.

/* ==========================================
   PAGE VISIBILITY REFRESH
========================================== */
document.addEventListener("visibilitychange", async () => {
  if (!document.hidden) {
    try {
      await loadResources();
    } catch (e) {
      console.error(e);
    }
  }
});

console.log("======================================");
console.log("GTRADES-AXIS™ Premium Resources Loaded");
console.log("======================================");