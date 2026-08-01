import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ─── DOM REFS ──────────────────────────────────────────────
const userName = document.getElementById("userName");
const membershipBadge = document.getElementById("membershipBadge");
const resourceCount = document.getElementById("resourceCount");
const lessonCount = document.getElementById("lessonCount");
const videoCount = document.getElementById("videoCount");
const latestResources = document.getElementById("latestResources");

// ─── LOGOUT ──────────────────────────────────────────────────
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  if (!confirm("Logout?")) return;
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (e) {
    console.error(e);
  }
});

// ─── AUTH & USER DATA ──────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    // Fetch user data
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      userName.textContent = data.name || "Trader";

      const role = data.role || "member";
      const membership = data.membership || "free";

      if (role === "admin") {
        membershipBadge.textContent = "⭐ Admin";
        membershipBadge.style.background = "#f5a623";
        membershipBadge.style.color = "#0b0d15";
      } else if (membership === "premium") {
        membershipBadge.textContent = "⭐ Premium Member";
        membershipBadge.style.background = "#f5a623";
        membershipBadge.style.color = "#0b0d15";
      } else {
        membershipBadge.textContent = "Free Member";
        membershipBadge.style.background = "#2a3450";
        membershipBadge.style.color = "#9aa4bf";
      }
    }

    // Load counts & latest resources
    await loadCounts();
    await loadLatestResources();
  } catch (e) {
    console.error("Dashboard error:", e);
  }
});

// ─── LOAD COUNTS ─────────────────────────────────────────────
async function loadCounts() {
  try {
    // Resources
    const resourcesSnap = await getDocs(collection(db, "resources"));
    resourceCount.textContent = resourcesSnap.size;

    // Academy lessons (count from academy_modules)
    const modulesSnap = await getDocs(collection(db, "academy_modules"));
    let lessonTotal = 0;
    modulesSnap.forEach((doc) => {
      const data = doc.data();
      lessonTotal += (data.lessons || []).length;
    });
    lessonCount.textContent = lessonTotal;

    // Videos (from videos collection or fallback)
    // You can either use a dedicated "videos" collection or count from resources with category "Video"
    // Here we count resources with category "Video"
    // ─── Instead of filtering resources ───
const videosSnap = await getDocs(collection(db, "videos"));
videoCount.textContent = videosSnap.size;
  }
}

// ─── LOAD LATEST RESOURCES ──────────────────────────────────
async function loadLatestResources() {
  try {
    const q = query(
      collection(db, "resources"),
      orderBy("createdAt", "desc"),
      limit(3)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      latestResources.innerHTML = `
        <div class="loading-card" style="padding:20px 0; color: var(--text-secondary);">
          <i class="fa-solid fa-folder-open"></i> No resources yet.
        </div>
      `;
      return;
    }

    let html = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isPremium = data.premiumOnly || false;
      html += `
        <div class="resource-item" style="display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid var(--border-color, #2a3450);">
          <i class="fa-solid fa-file-pdf" style="color:var(--accent-blue, #4f7cff);"></i>
          <div style="flex:1;">
            <strong style="font-size:14px;">${data.title}</strong>
            <div style="font-size:12px; color:var(--text-secondary, #9aa4bf);">
              ${data.category || "Resource"}
              ${isPremium ? ' <span style="color:var(--gold, #f5a623);">⭐ Premium</span>' : ''}
            </div>
          </div>
          <a href="${data.link || '#'}" target="_blank" style="color:var(--accent-blue, #4f7cff); font-size:12px; text-decoration:none; white-space:nowrap;">
            View <i class="fa-solid fa-arrow-right"></i>
          </a>
        </div>
      `;
    });
    latestResources.innerHTML = html;
  } catch (e) {
    console.error("Error loading latest resources:", e);
    latestResources.innerHTML = `
      <div class="loading-card" style="padding:20px 0; color: var(--text-secondary);">
        <i class="fa-solid fa-triangle-exclamation"></i> Could not load resources.
      </div>
    `;
  }
}