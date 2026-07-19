// ============================================================
// GTRADES AXIS™ – ADMIN DASHBOARD (IMPROVED)
// ============================================================

import { db, auth } from "./firebase.js";
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    where
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ============================================================
// 1. DOM ELEMENTS (safe getters)
// ============================================================
const getEl = (id) => document.getElementById(id);

const totalMembers = getEl("totalMembers");
const premiumMembers = getEl("premiumMembers");
const adminMembers = getEl("adminMembers");
const pendingMembers = getEl("pendingMembers");
const todayCount = getEl("todayCount");

const resourceCount = getEl("resourceCount");
const lessonCount = getEl("lessonCount");
const paymentCount = getEl("paymentCount");

const premiumOverview = getEl("premiumOverview");
const pendingOverview = getEl("pendingOverview");
const resourceOverview = getEl("resourceOverview");
const lessonOverview = getEl("lessonOverview");

const recentMembers = getEl("recentMembers");
const liveDate = getEl("liveDate");
const logoutBtn = getEl("logoutBtn");
const feed = document.querySelector(".activity-feed");

// ============================================================
// 2. UTILITY FUNCTIONS
// ============================================================

// Format date safely
function formatDate(date) {
    if (!date) return "--";
    try {
        if (date.toDate) return date.toDate().toLocaleDateString();
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
        return new Date(date).toLocaleDateString();
    } catch {
        return "--";
    }
}

// Animated counter
function animateCounter(element, target) {
    if (!element) return;
    const duration = 800;
    const start = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    let current = 0;
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = current;
        }
    }, duration / 40);
}

// Notification system
function showNotification(message, color = "#22C55E") {
    let notify = document.getElementById("dashboardNotification");
    if (!notify) {
        notify = document.createElement("div");
        notify.id = "dashboardNotification";
        notify.style.position = "fixed";
        notify.style.top = "25px";
        notify.style.right = "25px";
        notify.style.padding = "16px 22px";
        notify.style.color = "#fff";
        notify.style.borderRadius = "12px";
        notify.style.fontWeight = "600";
        notify.style.zIndex = "999999";
        notify.style.boxShadow = "0 15px 30px rgba(0,0,0,.25)";
        notify.style.transition = "0.35s";
        notify.style.opacity = "0";
        document.body.appendChild(notify);
    }
    notify.innerHTML = message;
    notify.style.background = color;
    notify.style.opacity = "1";
    clearTimeout(notify._timeout);
    notify._timeout = setTimeout(() => {
        notify.style.opacity = "0";
    }, 3000);
}

// Add activity feed item
function addActivity(icon, title, text) {
    if (!feed) return;
    const item = document.createElement("div");
    item.className = "activity-item";
    item.innerHTML = `
        <div class="activity-icon blue">
            <i class="${icon}"></i>
        </div>
        <div>
            <h4>${title}</h4>
            <p>${text}</p>
        </div>
    `;
    feed.prepend(item);
    // Keep only last 6 items
    while (feed.children.length > 6) {
        feed.removeChild(feed.lastElementChild);
    }
}

// ============================================================
// 3. DATA LOADERS
// ============================================================

// ---------- MEMBER STATISTICS ----------
async function loadMemberStats() {
    try {
        const snapshot = await getDocs(collection(db, "users"));
        let total = 0,
            premium = 0,
            admins = 0,
            pending = 0,
            joinedToday = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        snapshot.forEach(doc => {
            const data = doc.data();
            total++;
            if (data.role === "premium") premium++;
            if (data.role === "admin") admins++;
            // Pending: active === false OR status === "pending" OR role === "pending"
            if (data.active === false || data.status === "pending" || data.role === "pending") {
                pending++;
            }
            // Joined today
            if (data.createdAt) {
                let created;
                if (data.createdAt.toDate) created = data.createdAt.toDate();
                else if (data.createdAt.seconds) created = new Date(data.createdAt.seconds * 1000);
                else created = new Date(data.createdAt);
                if (created >= today) joinedToday++;
            }
        });

        animateCounter(totalMembers, total);
        animateCounter(premiumMembers, premium);
        if (adminMembers) animateCounter(adminMembers, admins);
        animateCounter(pendingMembers, pending);
        animateCounter(todayCount, joinedToday);
        animateCounter(premiumOverview, premium);
        animateCounter(pendingOverview, pending);
    } catch (error) {
        console.error("loadMemberStats error:", error);
        showNotification("Failed to load member statistics.", "#EF4444");
    }
}

// ---------- RESOURCES ----------
async function loadResources() {
    try {
        const snapshot = await getDocs(collection(db, "resources"));
        const count = snapshot.size;
        if (resourceCount) animateCounter(resourceCount, count);
        if (resourceOverview) animateCounter(resourceOverview, count);
    } catch (error) {
        console.error("loadResources error:", error);
        if (resourceCount) resourceCount.textContent = "0";
        if (resourceOverview) resourceOverview.textContent = "0";
    }
}

// ---------- ACADEMY ----------
async function loadAcademy() {
    try {
        const snapshot = await getDocs(collection(db, "academy"));
        const count = snapshot.size;
        if (lessonCount) animateCounter(lessonCount, count);
        if (lessonOverview) animateCounter(lessonOverview, count);
    } catch (error) {
        console.error("loadAcademy error:", error);
        if (lessonCount) lessonCount.textContent = "0";
        if (lessonOverview) lessonOverview.textContent = "0";
    }
}

// ---------- PAYMENTS ----------
async function loadPayments() {
    try {
        const snapshot = await getDocs(collection(db, "payments"));
        const count = snapshot.size;
        if (paymentCount) animateCounter(paymentCount, count);
    } catch (error) {
        console.error("loadPayments error:", error);
        if (paymentCount) paymentCount.textContent = "0";
    }
}

// ---------- RECENT MEMBERS ----------
async function loadRecentMembers() {
    if (!recentMembers) return;
    try {
        const q = query(
            collection(db, "users"),
            orderBy("createdAt", "desc"),
            limit(5)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            recentMembers.innerHTML = `<div class="empty-card">No members yet.</div>`;
            return;
        }
        let html = "";
        snapshot.forEach(doc => {
            const user = doc.data();
            const initials = user.name ? user.name.charAt(0).toUpperCase() : "U";
            html += `
                <div class="recent-member">
                    <div class="recent-avatar">${initials}</div>
                    <div class="recent-info">
                        <h4>${user.name || "Unknown User"}</h4>
                        <p>${user.email || ""}</p>
                    </div>
                </div>
            `;
        });
        recentMembers.innerHTML = html;
    } catch (error) {
        console.error("loadRecentMembers error:", error);
        recentMembers.innerHTML = `<div class="empty-card">Error loading members.</div>`;
    }
}

// ============================================================
// 4. REFRESH DASHBOARD
// ============================================================
async function refreshDashboard() {
    await Promise.all([
        loadMemberStats(),
        loadResources(),
        loadAcademy(),
        loadPayments(),
        loadRecentMembers()
    ]);
}

// ============================================================
// 5. LIVE CLOCK
// ============================================================
function updateClock() {
    if (!liveDate) return;
    const now = new Date();
    liveDate.innerHTML = now.toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}
updateClock();
setInterval(updateClock, 1000);

// ============================================================
// 6. LOGOUT
// ============================================================
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to logout?")) {
            try {
                await signOut(auth);
                window.location.href = "login.html";
            } catch (error) {
                console.error("Logout error:", error);
                alert(error.message);
            }
        }
    });
}

// ============================================================
// 7. CUSTOM EVENT LISTENERS
// ============================================================
window.addEventListener("resourceUploaded", () => {
    refreshDashboard();
    addActivity(
        "fa-solid fa-folder-plus",
        "Resource Uploaded",
        "A new premium resource was added."
    );
    showNotification("Resource uploaded successfully.");
});

window.addEventListener("memberRegistered", () => {
    refreshDashboard();
    addActivity(
        "fa-solid fa-user-plus",
        "New Member",
        "A new member joined GTRADES AXIS."
    );
});

// ============================================================
// 8. INIT & AUTO‑REFRESH
// ============================================================
refreshDashboard();
setInterval(refreshDashboard, 30000);

// ============================================================
// 9. WELCOME NOTIFICATION
// ============================================================
setTimeout(() => {
    showNotification("Welcome back Administrator 👋", "#0A84FF");
}, 800);

console.log("✅ GTRADES AXIS ADMIN V3 LOADED");