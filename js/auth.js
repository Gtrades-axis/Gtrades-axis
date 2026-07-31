// ============================================================
// GTRADES-AXIS™
// AUTH SYSTEM
// PART 1 OF 4
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
// GLOBAL USER
// ============================================================

window.currentUser = null;

// ============================================================
// PAGE LISTS
// ============================================================

const PUBLIC_PAGES = [

    "index.html",
    "login.html",
    "register.html",
    "pending.html",
    "premium.html",
    "access-denied.html"

];

const PREMIUM_PAGES = [

    "premium-academy.html",
    "resources.html",
    "journal.html",
    "videos.html",
    "analytics.html",
    "history.html",
    "ai-review.html"

];

const ADMIN_PAGES = [

    "admin.html",
    "members.html",
    "admin-payments.html",
    "academy-admin.html",
    "resources-admin.html",
    "videos-admin.html",
    "settings.html"

];

// ============================================================
// CURRENT PAGE
// ============================================================

function currentPage() {

    return window.location.pathname
        .split("/")
        .pop() || "index.html";

}

// ============================================================
// REDIRECT
// ============================================================

function redirect(page) {

    if (currentPage() !== page) {

        window.location.href = page;

    }

}

// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(auth, async (user) => {

    const page = currentPage();

    //----------------------------------------------------------
    // NOT LOGGED IN
    //----------------------------------------------------------

    if (!user) {

        if (!PUBLIC_PAGES.includes(page)) {

            redirect("login.html");

        }

        return;

    }

    //----------------------------------------------------------
    // LOAD USER DOCUMENT
    //----------------------------------------------------------

    let userData = null;

    try {

        const snap = await getDoc(
            doc(db, "users", user.uid)
        );

        if (!snap.exists()) {

            redirect("pending.html");
            return;

        }

        userData = snap.data();

        userData.uid = user.uid;

        window.currentUser = userData;

    }

    catch (error) {

        console.error(error);

        redirect("login.html");

        return;

    };

    //----------------------------------------------------------
    // USER MUST BE APPROVED
    //----------------------------------------------------------

    if (userData.active !== true) {

        if (page !== "pending.html") {

            redirect("pending.html");

        }

        return;

    }
        //----------------------------------------------------------
    // LOGIN / REGISTER PAGES
    //----------------------------------------------------------

    if (

        PUBLIC_PAGES.includes(page)

        &&

        page !== "pending.html"

        &&

        page !== "premium.html"

        &&

        page !== "access-denied.html"

    ) {

        if (userData.role === "admin") {

            redirect("admin.html");

        }

        else {

            redirect("dashboard.html");

        }

        return;

    }

    //----------------------------------------------------------
    // ADMIN PAGES
    //----------------------------------------------------------

    if (

        ADMIN_PAGES.includes(page)

        &&

        userData.role !== "admin"

    ) {

        redirect("access-denied.html");

        return;

    }

    //----------------------------------------------------------
    // PREMIUM PROTECTION
    //----------------------------------------------------------

    const isPremium =

        userData.membership === "premium";

    const isAdmin =

        userData.role === "admin";

    if (

        PREMIUM_PAGES.includes(page)

        &&

        !isPremium

        &&

        !isAdmin

    ) {

        sessionStorage.setItem(

            "premiumFeature",

            page

        );

        redirect("premium.html");

        return;

    }

    //----------------------------------------------------------
    // PAGE LOADED SUCCESSFULLY
    //----------------------------------------------------------

    console.log("✅ Auth Guard Passed");

    console.log("User:", userData.name);

    console.log("Role:", userData.role);

    console.log("Membership:", userData.membership);

    console.log("Current Page:", page);

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

    }

    catch (error) {

        console.error(error);

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

    }

    catch (error) {

        console.error(error);

    }

    sessionStorage.removeItem(

        "gtrades_user_logged_in"

    );

    window.currentUser = null;

    window.location.href = "login.html";

}

// ============================================================
// CURRENT USER
// ============================================================

export function getCurrentUser() {

    return window.currentUser;

}

// ============================================================
// CHECK ADMIN
// ============================================================

export function isAdmin() {

    return (

        window.currentUser &&

        window.currentUser.role === "admin"

    );

}

// ============================================================
// CHECK PREMIUM
// ============================================================

export function isPremium() {

    return (

        window.currentUser &&

        (

            window.currentUser.role === "admin"

            ||

            window.currentUser.membership === "premium"

        )

    );

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

            const btn = loginForm.querySelector(
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

            const result = await loginUser(

                email,

                password

            );

            if (!result.success) {

                let msg = "Login failed.";

                switch (result.code) {

                    case "auth/user-not-found":
                        msg = "No account found.";
                        break;

                    case "auth/wrong-password":
                        msg = "Incorrect password.";
                        break;

                    case "auth/invalid-credential":
                        msg = "Invalid email or password.";
                        break;

                    case "auth/invalid-email":
                        msg = "Invalid email address.";
                        break;

                    case "auth/too-many-requests":
                        msg = "Too many attempts. Try again later.";
                        break;

                    case "auth/network-request-failed":
                        msg = "Check your internet connection.";
                        break;

                }

                if (errorEl) {

                    errorEl.textContent = msg;

                }

                btn.disabled = false;

                btn.innerHTML =
                    '<i class="fa-solid fa-arrow-right-to-bracket"></i> Log In';

            }

        });

    }

    // ========================================================
    // LOGOUT BUTTON
    // ========================================================

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener(

            "click",

            logoutUser

        );

    }

});

// ============================================================
// READY
// ============================================================

console.log("=======================================");
console.log(" GTRADES-AXIS AUTH SYSTEM LOADED");
console.log(" Premium Protection Enabled");
console.log(" Admin Protection Enabled");
console.log("=======================================");