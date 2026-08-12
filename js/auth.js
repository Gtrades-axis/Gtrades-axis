// ============================================================
// GTRADES-AXIS™
// AUTH GUARD (v2)
// Premium Preview System & Admin Protection
// ============================================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ============================================================
// ROUTE PATHS (Clean URL structure)
// ============================================================

const PUBLIC_PAGES = ['/', '/login', '/register', '/pending', '/access-denied', '/premium'];

// 🛡️ SECURE LIST: Covering all variations so members can't slip through
const ADMIN_PAGES = [
    '/admin', '/admin/', '/admin.html',
    '/members', '/members/', '/members.html',
    '/admin-payments', '/admin-payments/', '/admin-payments.html',
    '/academy-admin', '/academy-admin/', '/academy-admin.html',
    '/resources-admin', '/resources-admin/', '/resources-admin.html',
    '/videos-admin', '/videos-admin/', '/videos-admin.html'
];

const PREMIUM_PAGES = ['/premium-academy', '/journal', '/resources', '/videos', '/analytics', '/history', '/ai-review'];

// ============================================================
// PAGE GUARD
// ============================================================

onAuthStateChanged(auth, async (user) => {

    // Get the actual route path
    let currentPath = window.location.pathname;

    // 🛡️ Remove trailing slash for perfect matching (Covers /admin/ and /admin)
    if (currentPath.length > 1 && currentPath.endsWith('/')) {
        currentPath = currentPath.slice(0, -1);
    }

    // ========================================================
    // USER NOT LOGGED IN
    // ========================================================
    if (!user) {
        if (!PUBLIC_PAGES.includes(currentPath) && !ADMIN_PAGES.includes(currentPath)) {
            window.location.href = '/login';
        }
        return;
    }

    // ========================================================
    // LOAD USER DOCUMENT
    // ========================================================
    let userData;
    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
            window.location.href = '/pending';
            return;
        }
        userData = snap.data();
        window.currentUser = { uid: user.uid, ...userData };
    } catch (err) {
        console.error(err);
        window.location.href = '/login';
        return;
    }
    
    // ========================================================
    // ACCOUNT NOT ACTIVE
    // ========================================================
    if (userData.status !== 'active') {
        if (currentPath !== '/pending') {
            window.location.href = '/pending';
        }
        return;
    }

    // ========================================================
    // 🚨 ADMIN PAGE PROTECTION (THE EXCLUSIVE LOCK)
    // ========================================================
    if (ADMIN_PAGES.includes(currentPath)) {
        // If the user is NOT an admin, instantly boot them back to the dashboard
        if (userData.role !== "admin") {
            window.location.href = '/dashboard';
            return; 
        }
    }

    // ========================================================
    // LOGIN / REGISTER REDIRECT
    // ========================================================
    if (currentPath === '/login' || currentPath === '/register') {
        console.log("✅ User Role found in Firestore:", userData.role);
        if (userData.role === "admin") {
            window.location.href = '/admin'; // Admin automatically goes here
        } else {
            window.location.href = '/dashboard'; // Members automatically go here
        }
        return;
    }

    // ========================================================
    // PREMIUM PAGE
    // ========================================================

    window.isAdmin = userData.role === "admin";
    window.isPremium = userData.membership === "premium";
    window.hasPremiumAccess = window.isAdmin || window.isPremium;
    window.isPremiumPage = PREMIUM_PAGES.includes(currentPath);

    console.log("Current User", window.currentUser);
    console.log("Premium Access:", window.hasPremiumAccess);
});

// ============================================================
// LOGIN
// ============================================================

export async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        sessionStorage.setItem("gtrades_user_logged_in", "true");
        return { success: true };
    } catch (error) {
        return { success: false, code: error.code };
    }
}

// ============================================================
// LOGOUT
// ============================================================

export async function logoutUser() {
    try {
        await signOut(auth);
        sessionStorage.removeItem("gtrades_user_logged_in");
        window.location.href = "/login";
    } catch (error) {
        console.error(error);
    }
}

// ============================================================
// LOGIN FORM
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
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
                    "auth/invalid-credential": "Incorrect email or password.",
                    "auth/too-many-requests": "Too many login attempts. Try again later.",
                    "auth/network-request-failed": "Network error. Check your internet connection."
                };
                if (map[result.code]) msg = map[result.code];
                if (errorEl) errorEl.textContent = msg;
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Log In';
            }
        });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
});

// ============================================================
// GLOBAL HELPERS
// ============================================================

window.isLoggedIn = () => !!auth.currentUser;
window.getCurrentUser = () => window.currentUser || null;
window.userHasPremium = () => window.hasPremiumAccess === true;
window.userIsAdmin = () => window.isAdmin === true;

console.log("✅ GTRADES-AXIS AUTH GUARD v2 LOADED");