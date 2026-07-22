// ============================================================
// GTRADES-AXIS™ – AUTH GUARD (SIMPLIFIED – NO PREMIUM CHECKS)
// ============================================================

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ------------------------------------------------------------------
// 1. PAGE GUARD
// ------------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const publicPages = ["index.html", "login.html", "register.html", "pending.html", "access-denied.html"];

  if (!user && !publicPages.includes(currentPage)) {
    window.location.href = "login.html";
    return;
  }

  if (user) {
    let userData = null;
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) userData = docSnap.data();
    } catch (e) {
      console.error("Failed to fetch user data:", e);
    }

    // ─── Public pages (except pending/access-denied) ──────────
    if (publicPages.includes(currentPage) && currentPage !== "pending.html" && currentPage !== "access-denied.html") {
      if (!userData || userData.active !== true) {
        window.location.href = "pending.html";
        return;
      } else {
        // Redirect based on role
        if (userData.role === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "dashboard.html";
        }
        return;
      }
    }

    // ─── Protected pages (require login + active) ─────────────
    if (!publicPages.includes(currentPage)) {
      // 1. Must be approved (active)
      if (!userData || userData.active !== true) {
        window.location.href = "pending.html";
        return;
      }

      // 2. Admin‑only page (only for admin role)
      if (currentPage === "admin.html" && userData.role !== "admin") {
        window.location.href = "access-denied.html";
        return;
      }

      // ✅ All other pages are now accessible to any active member
      // (academy, resources, videos, journal, analytics, history, dashboard, profile, support, etc.)
    }
  }
});

// ------------------------------------------------------------------
// 2. LOGIN
// ------------------------------------------------------------------
export async function loginUser(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    sessionStorage.setItem('gtrades_user_logged_in', 'true');
    return { success: true };
  } catch (error) {
    return { success: false, code: error.code };
  }
}

// ------------------------------------------------------------------
// 3. LOGOUT
// ------------------------------------------------------------------
export async function logoutUser() {
  await signOut(auth);
  sessionStorage.removeItem('gtrades_user_logged_in');
  window.location.href = "login.html";
}

// ------------------------------------------------------------------
// 4. AUTO-BIND LOGIN FORM
// ------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // --- LOGIN ---
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email")?.value.trim();
      const password = document.getElementById("password")?.value;
      const errorEl = document.getElementById("errorMsg");
      const btn = loginForm.querySelector('button[type="submit"]');

      if (!email || !password) {
        if (errorEl) errorEl.textContent = "Please fill in all fields.";
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
      if (errorEl) errorEl.textContent = "";

      const result = await loginUser(email, password);
      if (!result.success) {
        let msg = "Login failed.";
        const map = {
          "auth/user-not-found": "No account found. Please register first.",
          "auth/wrong-password": "Incorrect password.",
          "auth/too-many-requests": "Too many attempts. Please wait.",
          "auth/network-request-failed": "Network error – check your connection.",
        };
        if (map[result.code]) msg = map[result.code];
        if (errorEl) errorEl.textContent = msg;
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Log In';
      }
    });
  }

  // --- LOGOUT BUTTON ---
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }
});