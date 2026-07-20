// ============================================================
// GTRADES-AXIS™ – AUTH GUARD (SINGLE SOURCE OF TRUTH)
// ============================================================

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ────────────────────────────────────────────────────────────────
// 1. PAGE GUARD – runs on EVERY page
// ────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const publicPages = ["index.html", "login.html", "register.html", "pending.html", "access-denied.html"];

  // 🚫 NOT LOGGED IN – redirect to login (except public pages)
  if (!user && !publicPages.includes(currentPage)) {
    window.location.href = "login.html";
    return;
  }

  // ✅ LOGGED IN
  if (user) {
    // Set session flag for navbar (optional)
    sessionStorage.setItem('gtrades_user_logged_in', 'true');

    // Fetch user data from Firestore
    let userData = null;
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) userData = docSnap.data();
    } catch (e) {
      console.error("Fetch user data error:", e);
    }

    // ── Public pages (except pending/access-denied) ──
    if (publicPages.includes(currentPage) && currentPage !== "pending.html" && currentPage !== "access-denied.html") {
      if (!userData || userData.active !== true) {
        window.location.href = "pending.html";
        return;
      } else {
        window.location.href = "dashboard.html";
        return;
      }
    }

    // ── Protected pages ──
    if (!publicPages.includes(currentPage)) {
      // 1. Check approval (active)
      if (!userData || userData.active !== true) {
        window.location.href = "pending.html";
        return;
      }

      // 2. Premium‑only pages
      const premiumPages = [
        "academy.html", "premium-academy.html", "resources.html",
        "videos.html", "journal.html", "analytics.html", "history.html"
      ];
      if (premiumPages.includes(currentPage)) {
        const role = userData.role || "member";
        if (role !== "premium" && role !== "admin") {
          window.location.href = "access-denied.html";
          return;
        }
      }

      // 3. Admin‑only page
      if (currentPage === "admin.html" && userData.role !== "admin") {
        window.location.href = "access-denied.html";
        return;
      }

      // All checks passed – stay on page
    }
  }
});

// ────────────────────────────────────────────────────────────────
// 2. LOGIN
// ────────────────────────────────────────────────────────────────
export async function loginUser(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    sessionStorage.setItem('gtrades_user_logged_in', 'true');
    return { success: true };
  } catch (error) {
    return { success: false, code: error.code };
  }
}

// ────────────────────────────────────────────────────────────────
// 3. REGISTER (creates Firestore document)
// ────────────────────────────────────────────────────────────────
export async function registerUser(name, email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", uid), {
      name,
      email,
      role: "pending",
      active: false,
      status: "pending",
      payment: "unpaid",
      createdAt: new Date().toISOString(),
      uid,
    });
    sessionStorage.setItem('gtrades_user_logged_in', 'true');
    return { success: true, uid };
  } catch (error) {
    return { success: false, code: error.code, message: error.message };
  }
}

// ────────────────────────────────────────────────────────────────
// 4. LOGOUT
// ────────────────────────────────────────────────────────────────
export async function logoutUser() {
  await signOut(auth);
  sessionStorage.removeItem('gtrades_user_logged_in');
  window.location.href = "login.html";
}

// ────────────────────────────────────────────────────────────────
// 5. ADMIN APPROVE
// ────────────────────────────────────────────────────────────────
export async function approveUser(uid) {
  try {
    await updateDoc(doc(db, "users", uid), { active: true, status: "active" });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// ────────────────────────────────────────────────────────────────
// 6. FORM HANDLERS (only attach if forms exist)
// ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Login form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email")?.value.trim();
      const password = document.getElementById("password")?.value;
      const errorEl = document.getElementById("errorMsg");
      const btn = loginForm.querySelector('button[type="submit"]');
      if (!email || !password) { if (errorEl) errorEl.textContent = "Please fill in all fields."; return; }
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
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

  // Register form
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name")?.value.trim();
      const email = document.getElementById("email")?.value.trim();
      const password = document.getElementById("password")?.value;
      const confirm = document.getElementById("confirmPassword")?.value;
      const errorEl = document.getElementById("errorMsg");
      const successEl = document.getElementById("successMsg");
      const btn = registerForm.querySelector('button[type="submit"]');

      if (errorEl) errorEl.textContent = "";
      if (successEl) successEl.textContent = "";

      if (!name || !email || !password || !confirm) {
        if (errorEl) errorEl.textContent = "Please fill in all fields.";
        return;
      }
      if (password.length < 6) {
        if (errorEl) errorEl.textContent = "Password must be at least 6 characters.";
        return;
      }
      if (password !== confirm) {
        if (errorEl) errorEl.textContent = "Passwords do not match.";
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

      const result = await registerUser(name, email, password);
      if (result.success) {
        if (successEl) {
          successEl.textContent = "✅ Account created! Awaiting admin approval...";
          successEl.style.display = "block";
        }
        setTimeout(() => window.location.href = "pending.html", 2000);
      } else {
        let msg = "Registration failed. Please try again.";
        if (result.code === "auth/email-already-in-use") msg = "Email already registered. Please log in.";
        else if (result.code === "auth/invalid-email") msg = "Invalid email address.";
        else if (result.code === "auth/network-request-failed") msg = "Network error – check your connection.";
        else if (result.message) msg = result.message;
        if (errorEl) errorEl.textContent = msg;
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }
});