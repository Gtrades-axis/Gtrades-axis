// ============================================================
// GTRADES-AXIS™ – AUTH WITH VERBOSE LOGGING
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

// ------------------------------------------------------------------
// 1. PAGE GUARD (unchanged)
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

    if (publicPages.includes(currentPage) && currentPage !== "pending.html" && currentPage !== "access-denied.html") {
      if (!userData || userData.active !== true) {
        window.location.href = "pending.html";
        return;
      } else {
        window.location.href = "dashboard.html";
        return;
      }
    }

    if (!publicPages.includes(currentPage)) {
      if (!userData || userData.active !== true) {
        window.location.href = "pending.html";
        return;
      }

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
      if (currentPage === "admin.html" && userData.role !== "admin") {
        window.location.href = "access-denied.html";
        return;
      }
    }
  }
});

// ------------------------------------------------------------------
// 2. LOGIN FUNCTION
// ------------------------------------------------------------------
export async function loginUser(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    sessionStorage.setItem('gtrades_user_logged_in', 'true');
    console.log("✅ Login successful");
    return { success: true };
  } catch (error) {
    console.error("❌ Login error:", error.code);
    return { success: false, code: error.code };
  }
}

// ------------------------------------------------------------------
// 3. REGISTER FUNCTION – with detailed logging
// ------------------------------------------------------------------
export async function registerUser(name, email, password) {
  console.log("🔐 registerUser called with:", { name, email });

  try {
    // Step 1: Create user in Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    console.log("✅ Auth user created:", cred.user.uid);

    // Step 2: Update display name
    await updateProfile(cred.user, { displayName: name });
    console.log("✅ Profile updated");

    // Step 3: Write user document to Firestore (using plain date string)
    const userData = {
      name,
      email,
      role: "pending",
      active: false,
      status: "pending",
      payment: "unpaid",
      createdAt: new Date().toISOString(),  // ✅ safe, no import needed
      uid: cred.user.uid,
    };
    console.log("📝 Preparing to write:", userData);

    await setDoc(doc(db, "users", cred.user.uid), userData);
    console.log("✅ Firestore document created successfully for:", cred.user.uid);

    return { success: true };
  } catch (error) {
    console.error("❌ Registration error:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error message:", error.message);
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
// 5. ADMIN APPROVE
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
// 6. AUTO-BIND FORM HANDLERS (with console logs)
// ------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 DOM loaded – attaching form handlers");

  // --- LOGIN FORM ---
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    console.log("✅ Login form found");
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
    });
  } else {
    console.warn("⚠️ Login form not found on this page");
  }

  // --- REGISTER FORM ---
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    console.log("✅ Register form found");
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("📝 Register form submitted");

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
      console.log("🔁 Registration result:", result);

      if (result.success) {
        if (successEl) successEl.textContent = "Account created! Awaiting admin approval...";
        setTimeout(() => window.location.href = "pending.html", 2000);
      } else {
        let msg = "Registration failed.";
        const map = {
          "auth/email-already-in-use": "Email already registered.",
          "auth/invalid-email": "Invalid email address.",
          "auth/network-request-failed": "Network error – check your connection.",
          "auth/too-many-requests": "Too many attempts. Please wait.",
        };
        if (map[result.code]) msg = map[result.code];
        if (errorEl) errorEl.textContent = msg;
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
      }
    });
  } else {
    console.warn("⚠️ Register form not found on this page");
  }

  // --- LOGOUT BUTTON ---
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
    console.log("✅ Logout button found");
  }
});