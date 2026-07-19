// ============================================================
// GTRADES-AXIS™ – ANALYTICS (FIREBASE)
// ============================================================

import { auth, db } from "./firebase.js";
import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let currentUser = null;
let trades = [];
let charts = {};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadTrades();
    } else {
        window.location.href = 'login.html';
    }
});

async function loadTrades() {
    if (!currentUser) return;

    try {
        const q = query(
            collection(db, "trades"),
            where("userId", "==", currentUser.uid)
        );
        const snapshot = await getDocs(q);
        trades = [];
        snapshot.forEach((doc) => {
            trades.push({ id: doc.id, ...doc.data() });
        });

        // 🔥 Your existing analytics logic (updateOverview, buildCharts, etc.)
        // but using this `trades` array from Firestore instead of localStorage.
        updateOverview();
        buildCharts();
        buildInsights();
    } catch (error) {
        console.error("Failed to load trades:", error);
    }
}

// ============================================================
// YOUR EXISTING ANALYTICS FUNCTIONS GO HERE
// (updateOverview, buildCharts, buildInsights, etc.)
// ============================================================

function updateOverview() {
    // Same as before, but using `trades` array
    const total = trades.length;
    // ... rest of your stats
}

function buildCharts() {
    // Same as before, but using `trades` array
    // ... charts
}

function buildInsights() {
    // Same as before, but using `trades` array
    // ... insights
}