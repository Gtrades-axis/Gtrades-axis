import { auth, db } from "./firebase.js";
import {
  collection, getDocs, query, where, orderBy, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let currentUser = null, trades = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  await loadHistory();
});

async function loadHistory() {
  try {
    const q = query(collection(db, "trades"), where("userId", "==", currentUser.uid), orderBy("tradeDate", "desc"));
    const snapshot = await getDocs(q);
    trades = [];
    snapshot.forEach(doc => trades.push({ id: doc.id, ...doc.data() }));
    renderTable();
    updateStats();
  } catch (error) { console.error("History load error:", error); }
}

function updateStats() {
  const total = trades.length;
  const wins = trades.filter(t => t.result === "Win").length;
  const losses = trades.filter(t => t.result === "Loss").length;
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
  trades.forEach(t => {
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

window.viewTrade = function (id) {
  const trade = trades.find(t => t.id === id);
  if (!trade) return;
  const details = Object.entries(trade)
    .filter(([key]) => key !== "id" && key !== "userId")
    .map(([key, val]) => `<tr><td><strong>${key}</strong></td><td>${val || "-"}</td></tr>`)
    .join("");
  document.getElementById("tradeDetails").innerHTML = `<table class="detail-table"><tbody>${details}</tbody></table>`;
  document.getElementById("tradeModal").style.display = "flex";
};

window.editTrade = function (id) {
  localStorage.setItem("editTradeId", id);
  window.location.href = "journal.html";
};

window.deleteTrade = async function (id) {
  if (!confirm("Delete this trade?")) return;
  await deleteDoc(doc(db, "trades", id));
  trades = trades.filter(t => t.id !== id);
  renderTable();
  updateStats();
};

document.querySelector(".closeModal")?.addEventListener("click", () => {
  document.getElementById("tradeModal").style.display = "none";
});
window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("tradeModal")) {
    document.getElementById("tradeModal").style.display = "none";
  }
});

// --- Search & filter (unchanged) ---
document.getElementById("tradeSearch")?.addEventListener("input", filter);
document.getElementById("filterPair")?.addEventListener("change", filter);
document.getElementById("filterSession")?.addEventListener("change", filter);
document.getElementById("filterResult")?.addEventListener("change", filter);

function filter() {
  const search = document.getElementById("tradeSearch").value.toLowerCase();
  const pair = document.getElementById("filterPair").value;
  const session = document.getElementById("filterSession").value;
  const result = document.getElementById("filterResult").value;
  const filtered = trades.filter(t => {
    const matchSearch = t.pair?.toLowerCase().includes(search) || false;
    const matchPair = pair ? t.pair === pair : true;
    const matchSession = session ? t.session === session : true;
    const matchResult = result ? t.result === result : true;
    return matchSearch && matchPair && matchSession && matchResult;
  });
  const tbody = document.getElementById("historyBody");
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">No matching trades.</td></tr>`;
    return;
  }
  let html = "";
  filtered.forEach(t => {
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

document.getElementById("exportCSV")?.addEventListener("click", () => {
  if (!trades.length) return alert("No trades to export.");
  const headers = ["Date", "Pair", "Direction", "Session", "Model", "Result", "RR", "P/L"];
  const rows = trades.map(t => [
    t.tradeDate || "", t.pair || "", t.direction || "", t.session || "",
    t.entryModel || "", t.result || "", parseFloat(t.actualRR || 0).toFixed(2),
    parseFloat(t.profit || 0).toFixed(2)
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "trades.csv";
  a.click();
  URL.revokeObjectURL(url);
});