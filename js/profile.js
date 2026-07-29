// ============================================================
// GTRADES-AXIS™ PROFILE V2
// ============================================================

import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ============================================================
// DOM ELEMENTS
// ============================================================

const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileBadge = document.getElementById("profileBadge");
const profileRole = document.getElementById("profileRole");
const profileMembership = document.getElementById("profileMembership");
const profilePayment = document.getElementById("profilePayment");
const profileJoined = document.getElementById("profileJoined");
const upgradeBtn = document.getElementById("upgradeBtn");

// ============================================================
// AUTH CHECK — LOAD PROFILE
// ============================================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Not logged in — redirect to login
        window.location.href = "login.html";
        return;
    }

    // Load profile data
    loadProfile(user.uid);

    // Listen for real-time updates
    listenForProfileUpdates(user.uid);
});

// ============================================================
// LOAD PROFILE DATA
// ============================================================

async function loadProfile(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.error("User document not found");
            return;
        }

        const data = userSnap.data();
        updateProfileUI(data);

    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

// ============================================================
// REAL-TIME PROFILE UPDATES
// ============================================================

function listenForProfileUpdates(uid) {
    const userRef = doc(db, "users", uid);

    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            updateProfileUI(data);
        }
    }, (error) => {
        console.error("Profile listener error:", error);
    });
}

// ============================================================
// UPDATE UI WITH PROFILE DATA
// ============================================================

function updateProfileUI(data) {
    // Name
    if (profileName) {
        profileName.textContent = data.name || "Trader";
    }

    // Email
    if (profileEmail) {
        profileEmail.textContent = data.email || "email@example.com";
    }

    // Role
    if (profileRole) {
        profileRole.textContent = data.role || "member";
    }

    // Membership
    if (profileMembership) {
        profileMembership.textContent = data.membership || "free";
    }

    // Payment Status
    if (profilePayment) {
        const isActive = data.active === true;
        profilePayment.textContent = isActive ? "✅ Active" : "⏳ Pending";
        profilePayment.className = isActive ? "paid" : "unpaid";
    }

    // Joined Date
    if (profileJoined) {
        profileJoined.textContent = formatDate(data.createdAt);
    }

    // Badge
    if (profileBadge) {
        const membership = data.membership || "free";
        const role = data.role || "member";

        // Remove old classes
        profileBadge.classList.remove("free", "premium", "admin");

        if (role === "admin") {
            profileBadge.classList.add("admin");
            profileBadge.textContent = "🛠️ Admin";
        } else if (membership === "premium") {
            profileBadge.classList.add("premium");
            profileBadge.textContent = "⭐ Premium Member";
        } else {
            profileBadge.classList.add("free");
            profileBadge.textContent = "🆓 Free Member";
        }
    }

    // Upgrade button — hide if already premium or admin
    if (upgradeBtn) {
        const membership = data.membership || "free";
        const role = data.role || "member";
        if (membership === "premium" || role === "admin") {
            upgradeBtn.style.display = "none";
        } else {
            upgradeBtn.style.display = "inline-block";
        }
    }
}

// ============================================================
// DATE FORMATTER
// ============================================================

function formatDate(timestamp) {
    if (!timestamp) return "N/A";

    try {
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });
        }
        return new Date(timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    } catch {
        return "N/A";
    }
}

// ============================================================
// UPGRADE MEMBERSHIP BUTTON
// ============================================================

if (upgradeBtn) {
    upgradeBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        // Confirm upgrade
        if (!confirm("Upgrade to Premium for $9.99/month?")) {
            return;
        }

        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                membership: "premium",
                active: true,
                upgradedAt: serverTimestamp()
            });

            // Show success
            alert("✅ You've been upgraded to Premium!");
            upgradeBtn.style.display = "none";

        } catch (error) {
            console.error("Upgrade error:", error);
            alert("❌ Upgrade failed. Please try again.");
        }
    });
}

// ============================================================
// LOGOUT
// ============================================================

window.logout = async function () {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout error:", error);
    }
};

console.log("✅ GTRADES-AXIS™ Profile V2 loaded");