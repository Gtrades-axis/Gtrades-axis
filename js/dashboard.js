// ============================================================
// GTRADES-AXIS™
// USER DASHBOARD – FIXED VERSION
// ============================================================

import { auth, db } from "../firebase.js";

import {
    doc,
    getDoc,
    onSnapshot,
    collection,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ============================================================
// DOM REFERENCES (only elements that exist in the HTML)
// ============================================================

const userNameEl = document.getElementById("userName");
const memberBadgeEl = document.getElementById("membershipBadge");
const resourceCountEl = document.getElementById("resourceCount");
const lessonCountEl = document.getElementById("lessonCount");
const videoCountEl = document.getElementById("videoCount");
const latestResourcesEl = document.getElementById("latestResources");

// ============================================================
// AUTH STATE
// ============================================================

let currentUser = null;
let userData = {};

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            await signOut(auth);
            window.location.href = "login.html";
            return;
        }

        currentUser = user;
        userData = { id: user.uid, ...snap.data() };

        initializeDashboard();
    } catch (error) {
        console.error("Auth error:", error);
    }
});

// ============================================================
// DASHBOARD INIT
// ============================================================

function initializeDashboard() {
    displayUserInfo();
    listenStats();
    listenLatestResources();
}

// ============================================================
// DISPLAY USER INFO
// ============================================================

function displayUserInfo() {
    if (userNameEl) {
        userNameEl.textContent = userData.name || "Trader";
    }

    if (memberBadgeEl) {
        const membership = userData.membership || "member";
        const label = membership === "premium" ? "⭐ Premium Member" : "Member";
        memberBadgeEl.textContent = label;
        memberBadgeEl.style.background = membership === "premium" ? "#fbbf24" : "#6b7280";
        memberBadgeEl.style.color = "#1f2937";
    }
}

// ============================================================
// REAL‑TIME STATS (Resources, Lessons, Videos)
// ============================================================

function listenStats() {
    const resourcesQuery = collection(db, "resources");
    onSnapshot(resourcesQuery, (snapshot) => {
        if (resourceCountEl) resourceCountEl.textContent = snapshot.size;
    }, (err) => console.error("Resources count error:", err));

    const lessonsQuery = collection(db, "lessons");
    onSnapshot(lessonsQuery, (snapshot) => {
        if (lessonCountEl) lessonCountEl.textContent = snapshot.size;
    }, (err) => console.error("Lessons count error:", err));

    const videosQuery = collection(db, "videos");
    onSnapshot(videosQuery, (snapshot) => {
        if (videoCountEl) videoCountEl.textContent = snapshot.size;
    }, (err) => console.error("Videos count error:", err));
}

// ============================================================
// LATEST RESOURCES (latest 3)
// ============================================================

function listenLatestResources() {
    if (!latestResourcesEl) return;

    const q = query(
        collection(db, "resources"),
        orderBy("createdAt", "desc"),
        limit(3)
    );

    onSnapshot(q, (snapshot) => {
        latestResourcesEl.innerHTML = "";

        if (snapshot.empty) {
            latestResourcesEl.innerHTML = `<div class="empty-state">No resources available</div>`;
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const item = document.createElement("div");
            item.className = "resource-item";
            item.innerHTML = `
                <h4>${data.title || "Untitled"}</h4>
                <p>${data.description || ""}</p>
                <a href="${data.fileUrl || "#"}" target="_blank">View →</a>
            `;
            latestResourcesEl.appendChild(item);
        });
    }, (error) => {
        console.error("Latest resources error:", error);
        latestResourcesEl.innerHTML = `<div class="error-state">Failed to load resources</div>`;
    });
}

// ============================================================
// LOGOUT – SINGLE, RELIABLE HANDLER (using event delegation)
// ============================================================

document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#logoutBtn");
    if (!btn) return;

    e.preventDefault();
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout failed:", error);
        showToast("❌ Logout failed. Please try again.");
    }
});

// ============================================================
// TOAST MESSAGE (optional)
// ============================================================

function showToast(msg) {
    const existing = document.getElementById("gtToast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "gtToast";
    toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: #1f2937; color: #fff; padding: 12px 24px;
        border-radius: 8px; font-weight: 500; z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: opacity 0.3s;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// GLOBAL HELPERS
// ============================================================

window.refreshDashboard = function () {
    displayUserInfo();
    listenStats();
    listenLatestResources();
};

console.log("✅ GTRADES-AXIS Dashboard ready");