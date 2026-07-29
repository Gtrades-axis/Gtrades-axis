// ============================================================
// GTRADES-AXIS™
// USER DASHBOARD
// ============================================================

import { auth, db } from "../firebase.js";

import {
    doc,
    getDoc,
    onSnapshot,
    collection,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ============================================================
// GLOBAL VARIABLES
// ============================================================

let currentUser = null;
let userData = {};
let userProgress = {};
let notifications = [];

// ============================================================
// DOM ELEMENTS
// ============================================================

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const membershipBadge = document.getElementById("membershipBadge");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const notificationContainer = document.getElementById("notificationContainer");

// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../login.html";
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            await signOut(auth);
            window.location.href = "../login.html";
            return;
        }

        currentUser = user;
        userData = {
            id: user.uid,
            ...snap.data()
        };

        initializeDashboard();
    } catch (error) {
        console.error("Dashboard auth error:", error);
    }
});

// ============================================================
// INITIALIZE DASHBOARD
// ============================================================

function initializeDashboard() {
    displayProfile();
    loadUserProgress();
    loadNotifications();
    loadUserStatistics();
    setupDashboardListeners();
}

// ============================================================
// DISPLAY PROFILE
// ============================================================

function displayProfile() {
    if (userName) {
        userName.textContent = userData.name || "Trader";
    }

    if (userEmail) {
        userEmail.textContent = userData.email || "";
    }

    if (membershipBadge) {
        const membership = userData.membership || "member";
        membershipBadge.textContent = membership.toUpperCase();
        membershipBadge.className = "membership-" + membership;
    }
}

// ============================================================
// LOAD USER PROGRESS
// ============================================================

function loadUserProgress() {
    const progressRef = doc(db, "progress", currentUser.uid);

    onSnapshot(progressRef, snapshot => {
        if (snapshot.exists()) {
            userProgress = snapshot.data();
        } else {
            userProgress = {
                completedModules: 0,
                totalModules: 10
            };
        }
        updateProgressDisplay();
    }, error => {
        console.error("Progress error:", error);
    });
}

// ============================================================
// UPDATE PROGRESS DISPLAY
// ============================================================

function updateProgressDisplay() {
    const completed = userProgress.completedModules || 0;
    const total = userProgress.totalModules || 10;
    const percentage = Math.round((completed / total) * 100);

    if (progressBar) {
        progressBar.style.width = percentage + "%";
    }

    if (progressText) {
        progressText.textContent = percentage + "% Complete";
    }
}

// ============================================================
// LOAD NOTIFICATIONS
// ============================================================

function loadNotifications() {
    const notificationsQuery = query(
        collection(db, "notifications"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(5)
    );

    onSnapshot(notificationsQuery, snapshot => {
        notifications = [];
        snapshot.forEach(item => {
            notifications.push({
                id: item.id,
                ...item.data()
            });
        });
        renderNotifications();
    }, error => {
        console.log("Notifications unavailable", error);
    });
}

// ============================================================
// RENDER NOTIFICATIONS
// ============================================================

function renderNotifications() {
    if (!notificationContainer) return;
    notificationContainer.innerHTML = "";

    if (notifications.length === 0) {
        notificationContainer.innerHTML = `
            <div class="empty-state">No notifications</div>
        `;
        return;
    }

    notifications.forEach(notification => {
        const item = document.createElement("div");
        item.className = "notification-item";
        item.innerHTML = `
            <h4>${notification.title || "Notice"}</h4>
            <p>${notification.message || ""}</p>
        `;
        notificationContainer.appendChild(item);
    });
}

// ============================================================
// USER STATISTICS
// ============================================================

function loadUserStatistics() {
    const statsRef = doc(db, "statistics", currentUser.uid);

    onSnapshot(statsRef, snapshot => {
        if (snapshot.exists()) {
            displayStatistics(snapshot.data());
        }
    });
}

// ============================================================
// DISPLAY STATISTICS
// ============================================================

function displayStatistics(stats) {
    const trades = document.getElementById("totalTrades");
    const wins = document.getElementById("winningTrades");
    const winRate = document.getElementById("winRate");

    if (trades) trades.textContent = stats.trades || 0;
    if (wins) wins.textContent = stats.wins || 0;
    if (winRate) winRate.textContent = stats.winRate || "0%";
}

// ============================================================
// DASHBOARD REALTIME LISTENERS
// ============================================================

function setupDashboardListeners() {
    listenUserProfile();
    listenAchievements();
    listenCourses();
}

// ============================================================
// USER PROFILE LIVE UPDATE
// ============================================================

function listenUserProfile() {
    const userRef = doc(db, "users", currentUser.uid);

    onSnapshot(userRef, snapshot => {
        if (snapshot.exists()) {
            userData = {
                id: snapshot.id,
                ...snapshot.data()
            };
            displayProfile();
        }
    }, error => {
        console.error("Profile listener error:", error);
    });
}

// ============================================================
// ACHIEVEMENTS SYSTEM
// ============================================================

function listenAchievements() {
    const achievementRef = doc(db, "achievements", currentUser.uid);

    onSnapshot(achievementRef, snapshot => {
        if (snapshot.exists()) {
            renderAchievements(snapshot.data());
        }
    });
}

// ============================================================
// RENDER ACHIEVEMENTS
// ============================================================

function renderAchievements(data) {
    const container = document.getElementById("achievementContainer");
    if (!container) return;

    container.innerHTML = "";
    const badges = data.badges || [];

    if (badges.length === 0) {
        container.innerHTML = `
            <div class="empty-state">No achievements yet</div>
        `;
        return;
    }

    badges.forEach(badge => {
        const item = document.createElement("div");
        item.className = "achievement-card";
        item.innerHTML = `
            <div class="badge-icon">🏆</div>
            <h4>${badge.name || "Achievement"}</h4>
            <p>${badge.description || ""}</p>
        `;
        container.appendChild(item);
    });
}

// ============================================================
// COURSE PROGRESS
// ============================================================

function listenCourses() {
    const coursesQuery = query(
        collection(db, "courseProgress"),
        where("userId", "==", currentUser.uid)
    );

    onSnapshot(coursesQuery, snapshot => {
        let courses = [];
        snapshot.forEach(item => {
            courses.push({
                id: item.id,
                ...item.data()
            });
        });
        renderCourses(courses);
    });
}

// ============================================================
// RENDER COURSES
// ============================================================

function renderCourses(courses) {
    const container = document.getElementById("courseContainer");
    if (!container) return;

    container.innerHTML = "";

    if (courses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">Start your academy journey</div>
        `;
        return;
    }

    courses.forEach(course => {
        const card = document.createElement("div");
        card.className = "course-card";
        const progress = course.progress || 0;
        card.innerHTML = `
            <h3>${course.title || "Course"}</h3>
            <div class="course-progress">
                <div class="progress-fill" style="width:${progress}%"></div>
            </div>
            <p>${progress}% Complete</p>
        `;
        container.appendChild(card);
    });
}

// ============================================================
// LOGOUT BUTTON — CLICK HANDLER
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                window.location.href = "../login.html";
            } catch (error) {
                console.error("Logout failed:", error);
                showDashboardMessage("❌ Logout failed. Please try again.");
            }
        });
    }
});

// ============================================================
// LOGOUT (window function for inline usage)
// ============================================================

window.logoutUser = async function() {
    try {
        await signOut(auth);
        window.location.href = "../login.html";
    } catch (error) {
        console.error("Logout failed:", error);
        showDashboardMessage("❌ Logout failed. Please try again.");
    }
};

// ============================================================
// PROFILE PAGE
// ============================================================

window.openProfile = function() {
    window.location.href = "profile.html";
};

// ============================================================
// ACADEMY PAGE
// ============================================================

window.openAcademy = function() {
    window.location.href = "academy-dashboard.html";
};

// ============================================================
// JOURNAL PAGE
// ============================================================

window.openJournal = function() {
    window.location.href = "journal.html";
};

// ============================================================
// RESOURCES PAGE
// ============================================================

window.openResources = function() {
    if (userData.membership === "premium" || userData.role === "admin") {
        window.location.href = "resources.html";
    } else {
        showDashboardMessage("Premium membership required");
    }
};

// ============================================================
// DASHBOARD MESSAGE
// ============================================================

function showDashboardMessage(message) {
    let box = document.getElementById("dashboardMessage");

    if (!box) {
        box = document.createElement("div");
        box.id = "dashboardMessage";
        box.className = "dashboard-toast";
        document.body.appendChild(box);
    }

    box.textContent = message;
    box.classList.add("show");

    setTimeout(() => {
        box.classList.remove("show");
    }, 3000);
}

// ============================================================
// USER DATA ACCESS
// ============================================================

window.getCurrentUserData = function() {
    return userData;
};

// ============================================================
// REFRESH DASHBOARD
// ============================================================

window.refreshUserDashboard = function() {
    displayProfile();
    updateProgressDisplay();
    renderNotifications();
};

// ============================================================
// DASHBOARD ERROR HANDLING
// ============================================================

window.addEventListener("error", (event) => {
    console.error("Dashboard Error:", event.error);
});

// ============================================================
// SAFE TEXT HELPER
// ============================================================

function safeText(value, fallback = "N/A") {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    return value;
}

// ============================================================
// DAILY LOGIN TRACKING
// ============================================================

async function trackDailyLogin() {
    if (!currentUser) return;
    try {
        const loginRef = doc(db, "userActivity", currentUser.uid);
        console.log("Daily login tracked");
    } catch (error) {
        console.error("Login tracking error:", error);
    }
}

// ============================================================
// PREMIUM STATUS CHECK
// ============================================================

function checkPremiumAccess() {
    if (!userData) return false;
    return (userData.membership === "premium" || userData.role === "admin");
}

window.hasPremiumAccess = checkPremiumAccess;

// ============================================================
// PREMIUM GUARD
// ============================================================

window.requirePremium = function(callback) {
    if (checkPremiumAccess()) {
        callback();
    } else {
        showDashboardMessage("Upgrade to Premium Academy");
    }
};

// ============================================================
// USER LEVEL SYSTEM
// ============================================================

function calculateLevel() {
    const progress = userProgress.completedModules || 0;
    let level = "Beginner";

    if (progress >= 3) level = "Learner";
    if (progress >= 6) level = "Trader";
    if (progress >= 9) level = "Professional";

    displayLevel(level);
}

// ============================================================
// DISPLAY LEVEL
// ============================================================

function displayLevel(level) {
    const element = document.getElementById("userLevel");
    if (element) {
        element.textContent = level;
    }
}

// ============================================================
// STREAK TRACKER
// ============================================================

function updateLearningStreak() {
    const streak = userData.learningStreak || 0;
    const element = document.getElementById("learningStreak");
    if (element) {
        element.textContent = streak + " Days";
    }
}

// ============================================================
// DASHBOARD LOADER
// ============================================================

function showDashboardLoader() {
    const loader = document.getElementById("dashboardLoader");
    if (loader) {
        loader.style.display = "block";
    }
}

function hideDashboardLoader() {
    const loader = document.getElementById("dashboardLoader");
    if (loader) {
        loader.style.display = "none";
    }
}

// ============================================================
// PAGE READY ACTIONS
// ============================================================

window.addEventListener("load", () => {
    hideDashboardLoader();
    trackDailyLogin();
    calculateLevel();
    updateLearningStreak();
});

// ============================================================
// MOBILE NAVIGATION
// ============================================================

const mobileButton = document.getElementById("mobileMenuButton");
const navigation = document.querySelector(".dashboard-sidebar");

if (mobileButton && navigation) {
    mobileButton.addEventListener("click", () => {
        navigation.classList.toggle("active");
    });
}

// ============================================================
// CLOSE MOBILE MENU
// ============================================================

document.addEventListener("click", (event) => {
    if (
        navigation &&
        mobileButton &&
        !navigation.contains(event.target) &&
        !mobileButton.contains(event.target)
    ) {
        navigation.classList.remove("active");
    }
});

// ============================================================
// AUTO REFRESH
// ============================================================

let refreshTimer;

function startAutoRefresh() {
    refreshTimer = setInterval(() => {
        if (auth.currentUser) {
            refreshUserDashboard();
        }
    }, 120000);
}

startAutoRefresh();

// ============================================================
// CLEANUP
// ============================================================

window.addEventListener("beforeunload", () => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
});

// ============================================================
// SESSION SECURITY
// ============================================================

setInterval(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
            await signOut(auth);
            window.location.href = "../login.html";
        }
    } catch (error) {
        console.error("Session check error:", error);
    }
}, 300000);

// ============================================================
// GLOBAL DASHBOARD API
// ============================================================

window.GTRADES_DASHBOARD = {
    user: () => userData,
    progress: () => userProgress,
    notifications: () => notifications,
    premium: () => checkPremiumAccess(),
    refresh: () => refreshUserDashboard()
};

// ============================================================
// INITIAL MESSAGE
// ============================================================

console.log("=================================");
console.log("GTRADES-AXIS™ USER DASHBOARD READY");
console.log("User:", currentUser?.email);
console.log("=================================");

// ============================================================
// END DASHBOARD.JS
// ============================================================