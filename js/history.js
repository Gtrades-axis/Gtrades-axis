import {
    getAuth,
    onAuthStateChanged
} from "firebase/auth";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc
} from "firebase/firestore";

import { auth, db } from "./firebase.js";

// ─── STATE ──────────────────────────────────────────────────────
let currentUser = null;
let trades = [];

// ─── DOM REFS ──────────────────────────────────────────────────
const tableBody = document.getElementById("historyTable");
const noTradesMsg = document.getElementById("noTradesMsg");
const loadingEl = document.getElementById("loadingIndicator");
const tableWrap = document.getElementById("historyTableWrap");

// ─── AUTH ──────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    currentUser = user;
    await loadTrades();
});

// ─── LOAD TRADES ──────────────────────────────────────────────
async function loadTrades() {
    if (!currentUser) return;
    try {
        if (loadingEl) loadingEl.style.display = "block";
        if (tableWrap) tableWrap.style.display = "none";
        if (noTradesMsg) noTradesMsg.style.display = "none";

        const tradesRef = collection(db, "users", currentUser.uid, "trades");
        const q = query(tradesRef, orderBy("tradeDate", "desc"));
        const snapshot = await getDocs(q);
        trades = [];
        snapshot.forEach((doc) => {
            trades.push({ id: doc.id, ...doc.data() });
        });
        renderTable();
    } catch (error) {
        console.error("Load trades error:", error);
        alert("Error loading trades: " + error.message);
    } finally {
        if (loadingEl) loadingEl.style.display = "none";
    }
}

// ─── RENDER TABLE ─────────────────────────────────────────────
function renderTable() {
    if (!tableBody) return;

    if (trades.length === 0) {
        tableBody.innerHTML = "";
        if (tableWrap) tableWrap.style.display = "none";
        if (noTradesMsg) noTradesMsg.style.display = "block";
        return;
    }
    if (tableWrap) tableWrap.style.display = "table";
    if (noTradesMsg) noTradesMsg.style.display = "none";

    let html = "";
    trades.forEach((trade) => {
        const status = trade.status || "Pending";
        const statusClass = status.toLowerCase().replace(" ", "-");
        const date = trade.tradeDate || trade.date || "";
        const pair = trade.pair || "-";
        const direction = trade.direction || "-";
        const result = trade.result || "-";

        html += `
            <tr>
                <td>${date}</td>
                <td>${pair}</td>
                <td>${direction}</td>
                <td><span class="status ${statusClass}">${status}</span></td>
                <td>${result}</td>
                <td>
                    <button class="btn-edit" onclick="window.editTrade('${trade.id}')">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="window.deleteTrade('${trade.id}')">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML = html;
}

// ─── EXPOSE EDIT & DELETE ─────────────────────────────────────
window.editTrade = function(id) {
    sessionStorage.setItem("editTradeId", id);
    window.location.href = "journal.html";
};

window.deleteTrade = async function(id) {
    if (!currentUser) return;
    if (!confirm("Delete this trade permanently?")) return;
    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "trades", id));
        trades = trades.filter((t) => t.id !== id);
        renderTable();
        alert("✅ Trade deleted!");
    } catch (error) {
        alert("❌ Error deleting trade: " + error.message);
    }
};

// ─── LOGOUT ────────────────────────────────────────────────────
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        import("firebase/auth").then(({ signOut }) => {
            signOut(auth).then(() => {
                window.location.href = "login.html";
            });
        });
    });
}

console.log("📜 History page loaded.");