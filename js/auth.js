// ============================================================
// GTRADES-AXIS™ – AUTH GUARD
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
// PAGE GUARD
// ============================================================

onAuthStateChanged(auth, async (user) => {

    const currentPage =
        window.location.pathname.split("/").pop() || "index.html";

    const publicPages = [

        "index.html",

        "login.html",

        "register.html",

        "pending.html",

        "access-denied.html",

        "premium.html"

    ];

    const premiumPages = [

        "journal.html",

        "premium-academy.html",

        "resources.html",

        "videos.html",

        "ai-review.html",

        "analytics.html",

        "history.html"

    ];

    // ========================================================
    // NOT LOGGED IN
    // ========================================================

    if (!user && !publicPages.includes(currentPage)) {

        window.location.href = "login.html";

        return;

    }

    if (!user) return;

    // ========================================================
    // GET USER DATA
    // ========================================================

    let userData = null;

    try {

        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {

            window.location.href = "pending.html";

            return;

        }

        userData = snap.data();
        window.currentUser = userData;
window.currentUser.uid = user.uid;

    }

    catch (error) {

        console.error(error);

        window.location.href = "login.html";

        return;

    }

    // ========================================================
    // LOGIN / REGISTER PAGES
    // ========================================================

    if (

        publicPages.includes(currentPage)

        && currentPage !== "pending.html"

        && currentPage !== "premium.html"

        && currentPage !== "access-denied.html"

    ) {

        if (userData.active !== true) {

            window.location.href = "pending.html";

            return;

        }

        if (userData.role === "admin") {

            window.location.href = "admin.html";

        }

        else {

            window.location.href = "dashboard.html";

        }

        return;

    }

    // ========================================================
    // USER MUST BE APPROVED
    // ========================================================

    if (userData.active !== true) {

        window.location.href = "pending.html";

        return;

    }

    // ========================================================
    // ADMIN PAGES
    // ========================================================

    const adminPages = [

        "admin.html",

        "members.html",

        "admin-payments.html",

        "academy-admin.html",

        "resources-admin.html",

        "videos-admin.html"

    ];

    if (

        adminPages.includes(currentPage)

        &&

        userData.role !== "admin"

    ) {

        window.location.href = "access-denied.html";

        return;

    }

 
// ========================================================
// PREMIUM PAGES
// ========================================================

if (

    premiumPages.includes(currentPage)

    &&

    userData.role !== "admin"

    &&

    userData.membership !== "premium"

) {

    sessionStorage.setItem(

        "premiumFeature",

        currentPage

    );

    window.location.href = "premium.html";

    return;

}

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

    }

    catch (error) {

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

    await signOut(auth);

    sessionStorage.removeItem(

        "gtrades_user_logged_in"

    );

    window.location.href = "login.html";

}

// ============================================================
// LOGIN FORM
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    const loginForm =

        document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(

            "submit",

            async (e) => {

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

                    if (errorEl)

                        errorEl.textContent =

                            "Please fill in all fields.";

                    return;

                }

                btn.disabled = true;

                btn.innerHTML =

                    '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';

                if (errorEl)

                    errorEl.textContent = "";

                const result =

                    await loginUser(

                        email,

                        password

                    );

                if (!result.success) {

                    let msg =

                        "Login failed.";

                    const map = {

                        "auth/user-not-found":

                        "No account found.",

                        "auth/wrong-password":

                        "Incorrect password.",

                        "auth/too-many-requests":

                        "Too many attempts.",

                        "auth/network-request-failed":

                        "Check your internet connection."

                    };

                    if (map[result.code])

                        msg = map[result.code];

                    if (errorEl)

                        errorEl.textContent = msg;

                    btn.disabled = false;

                    btn.innerHTML =

                        '<i class="fa-solid fa-arrow-right-to-bracket"></i> Log In';

                }

            }

        );

    }

    const logoutBtn =

        document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener(

            "click",

            logoutUser

        );

    }

});

console.log("✅ AUTH GUARD LOADED");