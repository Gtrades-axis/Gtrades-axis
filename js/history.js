// ============================================================
// GTRADES-AXIS™ – TRADE HISTORY (FIREBASE)
// ============================================================

import { auth, db } from "./firebase.js";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let currentUser = null;
let trades = [];

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadHistory();
    } else {
        window.location.href = 'login.html';
    }
});

async function loadHistory() {
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

        renderTable();
        updateStats();
    } catch (error) {
        console.error("Failed to load history:", error);
    }
}

function renderTable() {
    const tbody = document.getElementById('historyBody');
    if (!tbody) return;

    if (trades.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty">No trades recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = trades.map(trade => `
        <tr>
            <td>${trade.tradeDate || '-'}</td>
            <td>${trade.pair || '-'}</td>
            <td>${trade.direction || '-'}</td>
            <td>${trade.session || '-'}</td>
            <td>${trade.entryModel || '-'}</td>
            <td class="result-${(trade.result || '').toLowerCase().replace(' ', '-')}">${trade.result || '-'}</td>
            <td>${trade.actualRR || 0}</td>
            <td class="pl-${(trade.profit || 0) >= 0 ? 'positive' : 'negative'}">$${Number(trade.profit || 0).toFixed(2)}</td>
            <td><button onclick="viewTrade('${trade.id}')" class="btn-small"><i class="fa-solid fa-eye"></i></button></td>
        </tr>
    `).join('');
}

function updateStats() {
    const total = trades.length;
    const wins = trades.filter(t => t.result === 'Win').length;
    const losses = trades.filter(t => t.result === 'Loss').length;
    const winRate = total ? ((wins / total) * 100).toFixed(1) : 0;

    document.getElementById('historyTotalTrades').textContent = total;
    document.getElementById('historyWins').textContent = wins;
    document.getElementById('historyLosses').textContent = losses;
    document.getElementById('historyWinRate').textContent = winRate + '%';
}

// Expose for modal view
window.viewTrade = (id) => {
    const trade = trades.find(t => t.id === id);
    if (!trade) return;
    // Populate modal...
    console.log('Viewing trade:', trade);
};

// Search & filter logic (using trades array)
document.getElementById('tradeSearch')?.addEventListener('input', filterTrades);
document.getElementById('filterPair')?.addEventListener('change', filterTrades);
document.getElementById('filterSession')?.addEventListener('change', filterTrades);
document.getElementById('filterResult')?.addEventListener('change', filterTrades);

function filterTrades() {
    // Implement search/filter on the trades array
}