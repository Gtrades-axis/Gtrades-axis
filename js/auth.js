// ============================================================
// GTRADES-AXIS™
// AUTH GUARD (v2)
// Premium Preview System
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
// PUBLIC PAGES
// ============================================================

const PUBLIC_PAGES = [
    "index.html",
    "login.html",
    "register.html",
    "pending.html",
    "access-denied.html",
    "premium.html"
];

// ============================================================
// ADMIN PAGES
// ============================================================

const ADMIN_PAGES = [
    "admin.html",
    "members.html",
    "admin-payments.html",
    "academy-admin.html",
    "resources-admin.html",
    "videos-admin.html"
];

// ============================================================
// PREMIUM PAGES
// (NO REDIRECTS ANYMORE)
// ============================================================

const PREMIUM_PAGES = [
    "premium-academy.html",
    "journal.html",
    "resources.html",
    "videos.html",
    "analytics.html",
    "history.html",
    "ai-review.html"
];

// ============================================================
// PAGE GUARD
// ============================================================

onAuthStateChanged(auth, async (user) => {

    const currentPage =
        window.location.pathname.split("/").pop() || "index.html";

    // ========================================================
    // USER NOT LOGGED IN
    // ========================================================

    if (!user) {

        if (!PUBLIC_PAGES.includes(currentPage)) {

            window.location.href = "login.html";

        }

        return;
    }

    // ========================================================
    // LOAD USER DOCUMENT
    // ========================================================

    let userData;

    try {

        const snap = await getDoc(
            doc(db, "users", user.uid)
        );

        if (!snap.exists()) {

            window.location.href = "pending.html";

            return;
        }

        userData = snap.data();

        // Make available everywhere
        window.currentUser = {
            uid: user.uid,
            ...userData
        };

    }

    catch (err) {

        console.error(err);

        window.location.href = "login.html";

        return;

    }
        // ========================================================
    // ACCOUNT NOT APPROVED
    // ========================================================

    if (userData.active !== true) {

        if (currentPage !== "pending.html") {

            window.location.href = "pending.html";

        }

        return;
    }

    // ========================================================
    // LOGIN / REGISTER REDIRECT
    // ========================================================

    if (
        currentPage === "login.html" ||
        currentPage === "register.html"
    ) {

        if (userData.role === "admin") {

            window.location.href = "admin.html";

        } else {

            window.location.href = "dashboard.html";

        }

        return;
    }

    // ========================================================
    // ADMIN PAGE PROTECTION
    // ========================================================

    if (
        ADMIN_PAGES.includes(currentPage) &&
        userData.role !== "admin"
    ) {

        window.location.href = "access-denied.html";

        return;
    }

    // ========================================================
    // PREMIUM PAGE
    // NO REDIRECTS
    // ========================================================

    window.isAdmin =
        userData.role === "admin";

    window.isPremium =
        userData.membership === "premium";

    window.hasPremiumAccess =
        window.isAdmin || window.isPremium;

    window.isPremiumPage =
        PREMIUM_PAGES.includes(currentPage);

    console.log("Current User", window.currentUser);
    console.log("Premium Access:", window.hasPremiumAccess);

});
// ============================================================
// LOGIN
// ============================================================

export async function loginUser(email, password) {

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        sessionStorage.setItem(
            "gtrades_user_logged_in",
            "true"
        );

        return {
            success: true
        };

    } catch (error) {

        return {
            success: false,
            code: error.code
        };

    }

}

// ============================================================
// LOGOUT
// ============================================================

export async function logoutUser() {

    try {

        await signOut(auth);

        sessionStorage.removeItem(
            "gtrades_user_logged_in"
        );

        window.location.href = "login.html";

    } catch (error) {

        console.error(error);

    }

}
// ============================================================
// LOGIN FORM
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // ========================================================
    // LOGIN FORM
    // ========================================================

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            const email =
                document.getElementById("email")?.value.trim();

            const password =
                document.getElementById("password")?.value;

            const errorEl =
                document.getElementById("errorMsg");

            const btn =
                loginForm.querySelector(
                    'button[type="submit"]'
                );

            if (!email || !password) {

                if (errorEl) {

                    errorEl.textContent =
                        "Please fill in all fields.";

                }

                return;

            }

            btn.disabled = true;

            btn.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';

            if (errorEl) {

                errorEl.textContent = "";

            }

            const result =
                await loginUser(
                    email,
                    password
                );

            if (!result.success) {

                let msg = "Login failed.";

                const map = {

                    "auth/user-not-found":
                        "No account found.",

                    "auth/wrong-password":
                        "Incorrect password.",

                    "auth/invalid-credential":
                        "Incorrect email or password.",

                    "auth/too-many-requests":
                        "Too many login attempts. Try again later.",

                    "auth/network-request-failed":
                        "Network error. Check your internet connection."

                };

                if (map[result.code]) {

                    msg = map[result.code];

                }

                if (errorEl) {

                    errorEl.textContent = msg;

                }

                btn.disabled = false;

                btn.innerHTML =
                    '<i class="fa-solid fa-arrow-right-to-bracket"></i> Log In';

            }

            // Success redirect is handled automatically
            // by onAuthStateChanged()

        });

    }

    // ========================================================
    // LOGOUT BUTTON
    // ========================================================

    const logoutBtn =
        document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logoutUser
        );

    }

});

// ============================================================
// GLOBAL HELPERS
// ============================================================

window.isLoggedIn = () => !!auth.currentUser;

window.getCurrentUser = () => window.currentUser || null;

window.userHasPremium = () => window.hasPremiumAccess === true;

window.userIsAdmin = () => window.isAdmin === true;

// ============================================================

console.log("✅ GTRADES-AXIS AUTH GUARD v2 LOADED");