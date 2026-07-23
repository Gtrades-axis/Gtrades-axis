import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let currentUser = null;
let trades = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadHistory();
});

async function loadHistory() {
  try {
    // ✅ CORRECT PATH: subcollection under user
    const tradesRef = collection(db, "users", currentUser.uid, "trades");
    const q = query(tradesRef, orderBy("tradeDate", "desc"));
    const snapshot = await getDocs(q);
    trades = [];
    snapshot.forEach((doc) => {
      trades.push({ id: doc.id, ...doc.data() });
    });
    renderTable();
    updateStats();
  } catch (error) {
    console.error("History load error:", error);
    alert("Error loading history: " + error.message);
  }
}

function updateStats() {
  const total = trades.length;
  const wins = trades.filter((t) => t.result === "Win").length;
  const losses = trades.filter((t) => t.result === "Loss").length;
  const winRate = total ? ((wins / total) * 100).toFixed(1) : 0;
  document.getElementById("historyTotalTrades").textContent = total;
  document.getElementById("historyWins").textContent = wins;
  document.getElementById("historyLosses").textContent = losses;
  document.getElementById("historyWinRate").textContent = winRate + "%";
}

function renderTable() {
  const tbody = document.getElementById("historyBody");
  if (!tbody) return;
  if (trades.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">No trades recorded yet.</td></tr>`;
    return;
  }
  let html = "";
  trades.forEach((t) => {
    const profitClass = parseFloat(t.profit) >= 0 ? "positive" : "negative";
    const resultClass = (t.result || "").toLowerCase().replace(" ", "-");
    html += `
      <tr>
        <td>${t.tradeDate || "-"}</td>
        <td>${t.pair || "-"}</td>
        <td>${t.direction || "-"}</td>
        <td>${t.session || "-"}</td>
        <td>${t.entryModel || "-"}</td>
        <td class="result-${resultClass}">${t.result || "-"}</td>
        <td>${parseFloat(t.actualRR || 0).toFixed(2)}</td>
        <td class="${profitClass}">$${parseFloat(t.profit || 0).toFixed(2)}</td>
        <td>
          <button onclick="viewTrade('${t.id}')" class="btn-small"><i class="fa-solid fa-eye"></i></button>
          <button onclick="editTrade('${t.id}')" class="btn-small"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deleteTrade('${t.id}')" class="btn-small danger"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// ... (viewTrade, editTrade, deleteTrade, filter, export – keep unchanged from before)