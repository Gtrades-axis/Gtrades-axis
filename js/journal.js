// ============================================================
// GTRADES-AXIS™ – TRADING JOURNAL (FIREBASE)
// ============================================================

import { auth, db } from "./firebase.js";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    deleteDoc,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let currentUser = null;
let trades = [];

// ============================================================
// 1. WAIT FOR USER AND LOAD TRADES
// ============================================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadTrades();
    } else {
        window.location.href = 'login.html';
    }
});

// ============================================================
// 2. LOAD TRADES FROM FIRESTORE (only current user's)
// ============================================================

async function loadTrades() {
    if (!currentUser) return;

    try {
        const q = query(
            collection(db, "trades"),
            where("userId", "==", currentUser.uid),
            orderBy("tradeDate", "desc")
        );
        const snapshot = await getDocs(q);
        trades = [];
        snapshot.forEach((doc) => {
            trades.push({ id: doc.id, ...doc.data() });
        });

        updateStats();
        updateCharts();
    } catch (error) {
        console.error("Failed to load trades:", error);
    }
}

// ============================================================
// 3. SAVE NEW TRADE
// ============================================================

async function saveTrade(tradeData) {
    if (!currentUser) throw new Error("Not logged in");

    try {
        // 🔥 Add userId to the trade so we know who owns it
        const newTrade = {
            ...tradeData,
            userId: currentUser.uid,
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, "trades"), newTrade);
        const savedTrade = { id: docRef.id, ...newTrade };
        trades.unshift(savedTrade); // add to top of list

        updateStats();
        updateCharts();
        return savedTrade;
    } catch (error) {
        console.error("Failed to save trade:", error);
        throw error;
    }
}

// ============================================================
// 4. DELETE TRADE
// ============================================================

async function deleteTrade(tradeId) {
    if (!currentUser) return;
    try {
        await deleteDoc(doc(db, "trades", tradeId));
        trades = trades.filter(t => t.id !== tradeId);
        updateStats();
        updateCharts();
    } catch (error) {
        console.error("Failed to delete trade:", error);
    }
}

// ============================================================
// 5. UPDATE TRADE
// ============================================================

async function updateTrade(tradeId, updatedData) {
    if (!currentUser) return;
    try {
        const ref = doc(db, "trades", tradeId);
        await updateDoc(ref, updatedData);
        const index = trades.findIndex(t => t.id === tradeId);
        if (index !== -1) {
            trades[index] = { ...trades[index], ...updatedData };
            updateStats();
            updateCharts();
        }
    } catch (error) {
        console.error("Failed to update trade:", error);
    }
}

// ============================================================
// 6. STATS & CHARTS (same as before, but using Firestore data)
// ============================================================

function updateStats() {
    // Your existing stats logic here (using `trades` array)
    // ...
}

function updateCharts() {
    // Your existing chart logic here (using `trades` array)
    // ...
}

// ============================================================
// 7. EXPOSE FUNCTIONS FOR FORM HANDLER
// ============================================================

// In your HTML form submit handler:
document.getElementById('tradeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Gather form data...
    // const tradeData = { pair, direction, session, result, profit, ... };
    // await saveTrade(tradeData);
    // Reset form...
});

// Expose functions globally (or use module imports)
export { saveTrade, deleteTrade, updateTrade, loadTrades, trades };