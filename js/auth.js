// js/auth.js
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============================================================
// 1. PAGE GUARD – runs once when the page loads
// ============================================================
onAuthStateChanged(auth, async (user) => {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const publicPages = ["index.html", "login.html", "register.html"];

  // If NOT logged in and trying to access a protected page → go to login
  if (!user && !publicPages.includes(currentPage)) {
    window.location.href = "login.html";
    return;
  }

  // If logged in and on a public page → go to dashboard
  if (user && publicPages.includes(currentPage)) {
    window.location.href = "dashboard.html";
    return;
  }

  // (Optional) Academy role check
  if (user && currentPage === "academy.html") {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const role = userDoc.exists() ? userDoc.data().role : "member";
      if (role !== "premium" && role !== "admin") {
        alert("Academy access requires a Premium subscription.");
        window.location.href = "dashboard.html";
      }
    } catch (e) {
      console.error("Role check failed", e);
      window.location.href = "dashboard.html";
    }
  }
});

// ============================================================
// 2. LOGIN FUNCTION
// ============================================================
export async function loginUser(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (error) {
    return { success: false, code: error.code };
  }
}

// ============================================================
// 3. REGISTER FUNCTION
// ============================================================
export async function registerUser(name, email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      role: "member",
      createdAt: new Date().toISOString(),
      uid: cred.user.uid,
    });
    return { success: true };
  } catch (error) {
    return { success: false, code: error.code };
  }
}

// ============================================================
// 4. LOGOUT
// ============================================================
export async function logoutUser() {
  await signOut(auth);
  // The guard will automatically redirect to login
}

// ============================================================
// 5. AUTO‑BIND FORM HANDLERS (only if forms exist)
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // --- Login form ---
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
      // On success, the guard will redirect.
    });
  }

  // --- Register form ---
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
        if (successEl) successEl.textContent = "Account created! Redirecting...";
        // Redirect handled by guard
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

  // --- Logout button ---
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }
});