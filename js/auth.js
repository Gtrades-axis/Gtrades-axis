// ============================================================
// GTRADES-AXIS™ – COMPLETE AUTH GUARD + ROLE CHECKS
// ============================================================

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ------------------------------------------------------------------
// 1. PAGE GUARD – runs on every page
// ------------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const publicPages = ["index.html", "login.html", "register.html", "pending.html", "access-denied.html"];

  // ---- NOT LOGGED IN ----
  if (!user && !publicPages.includes(currentPage)) {
    window.location.href = "login.html";
    return;
  }

  // ---- LOGGED IN ----
  if (user) {
    // Fetch user data
    let userData = null;
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) userData = docSnap.data();
    } catch (e) {
      console.error("Failed to fetch user data:", e);
    }

    // If on public page (except pending/access-denied), redirect based on status
    if (publicPages.includes(currentPage) && currentPage !== "pending.html" && currentPage !== "access-denied.html") {
      if (!userData || userData.active !== true) {
        window.location.href = "pending.html";
        return;
      } else {
        window.location.href = "dashboard.html";
        return;
      }
    }

    // ---- PROTECTED PAGES ----
    if (!publicPages.includes(currentPage)) {
      // 1. Check approval (active)
      if (!userData || userData.active !== true) {
        window.location.href = "pending.html";
        return;
      }

      // 2. Define premium-only pages (require role: premium or admin)
      const premiumPages = [
        "academy.html",
        "premium-academy.html",
        "resources.html",
        "videos.html",
        "journal.html",
        "analytics.html",
        "history.html"
      ];

      if (premiumPages.includes(currentPage)) {
        const role = userData.role || "member";
        if (role !== "premium" && role !== "admin") {
          window.location.href = "access-denied.html";
          return;
        }
      }

      // 3. Admin-only pages
      if (currentPage === "admin.html") {
        if (userData.role !== "admin") {
          window.location.href = "access-denied.html";
          return;
        }
      }

      // All checks passed – user can stay on page
    }
  }
});

// ------------------------------------------------------------------
// 2. LOGIN FUNCTION
// ------------------------------------------------------------------
export async function loginUser(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Set session flag for meta-refresh guard
    sessionStorage.setItem('gtrades_user_logged_in', 'true');
    return { success: true };
  } catch (error) {
    return { success: false, code: error.code };
  }
}

// ------------------------------------------------------------------
// 3. REGISTER FUNCTION (creates user with active: false)
// ------------------------------------------------------------------
export async function registerUser(name, email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      role: "pending",
      active: false,
      status: "pending",
      payment: "unpaid",
      createdAt: serverTimestamp(),  // ✅ better than string
      uid: cred.user.uid,
    });
    return { success: true };
  } catch (error) {
    return { success: false, code: error.code };
  }
}

// ------------------------------------------------------------------
// 4. LOGOUT
// ------------------------------------------------------------------
export async function logoutUser() {
  await signOut(auth);
  sessionStorage.removeItem('gtrades_user_logged_in');
  window.location.href = "login.html";
}

// ------------------------------------------------------------------
// 5. ADMIN – approve a user (set active: true)
// ------------------------------------------------------------------
export async function approveUser(uid) {
  try {
    await updateDoc(doc(db, "users", uid), { active: true, status: "active" });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// ------------------------------------------------------------------
// 6. AUTO-BIND FORM HANDLERS (login + register)
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
          "auth/user-not-found": "No account found.",
          "auth/wrong-password": "Incorrect password.",
          "auth/too-many-requests": "Too many attempts. Please wait.",
          "auth/network-request-failed": "Network error – check your connection.",
        };
        if (map[result.code]) msg = map[result.code];
        if (errorEl) errorEl.textContent = msg;
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Log In';
      }
      // On success, the guard will redirect
    });
  }

  // --- REGISTER ---
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
      if (errorEl) errorEl.textContent = "";
      if (successEl) successEl.textContent = "";

      const result = await registerUser(name, email, password);
      if (result.success) {
        if (successEl) successEl.textContent = "Account created! Awaiting admin approval...";
        setTimeout(() => window.location.href = "pending.html", 2000);
      } else {
        let msg = "Registration failed.";
        const map = {
          "auth/email-already-in-use": "Email already registered.",
          "auth/invalid-email": "Invalid email address.",
          "auth/network-request-failed": "Network error – check your connection.",
        };
        if (map[result.code]) msg = map[result.code];
        if (errorEl) errorEl.textContent = msg;
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
      }
    });
  }

  // --- LOGOUT BUTTON ---
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }
});