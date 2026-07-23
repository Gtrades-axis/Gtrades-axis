import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let trades = [];
let currentUser = null;
let filteredTrades = [];

// ─── DOM REFS ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const body = $("historyBody");
const totalTrades = $("historyTotalTrades");
const winsEl = $("historyWins");
const lossesEl = $("historyLosses");
const winRateEl = $("historyWinRate");
const searchInput = $("tradeSearch");
const filterPair = $("filterPair");
const filterSession = $("filterSession");
const filterResult = $("filterResult");
const exportBtn = $("exportCSV");
const modal = $("tradeModal");
const detailsContainer = $("tradeDetails");

// ─── AUTH ──────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  loadTradesRealtime();
});

// ─── LOAD FROM FIRESTORE ──────────────────────────────────────
function loadTradesRealtime() {
  const tradesRef = collection(db, "users", currentUser.uid, "trades");
  const q = query(tradesRef, orderBy("tradeDate", "desc"));
  onSnapshot(q, (snapshot) => {
    trades = [];
    snapshot.forEach((doc) => trades.push({ id: doc.id, ...doc.data() }));
    console.log(`📊 History: ${trades.length} trades loaded`);
    populateFilters();
    applyFilters();
  }, (error) => {
    console.error("Firestore error:", error);
    alert("Error loading trades: " + error.message);
  });
}

// ─── POPULATE FILTER DROPDOWNS ──────────────────────────────
function populateFilters() {
  const pairs = [...new Set(trades.map(t => t.pair).filter(Boolean))];
  filterPair.innerHTML = `<option value="">All Pairs</option>` + pairs.map(p => `<option value="${p}">${p}</option>`).join("");
}

// ─── APPLY FILTERS ────────────────────────────────────────────
function applyFilters() {
  const search = searchInput.value.toLowerCase().trim();
  const pair = filterPair.value;
  const session = filterSession.value;
  const result = filterResult.value;

  filteredTrades = trades.filter(t => {
    const matchSearch = !search || (t.pair && t.pair.toLowerCase().includes(search));
    const matchPair = !pair || t.pair === pair;
    const matchSession = !session || t.session === session;
    const matchResult = !result || t.result === result;
    return matchSearch && matchPair && matchSession && matchResult;
  });

  renderTable();
  updateStats();
}

// ─── RENDER TABLE WITH CHART ICONS + EDIT BUTTON ────────────
function renderTable() {
  if (filteredTrades.length === 0) {
    body.innerHTML = `<tr><td colspan="10" class="empty"><i class="fa-regular fa-folder-open"></i> No trades match your filters.</td></tr>`;
    return;
  }

  body.innerHTML = filteredTrades.map((t) => {
    const resultClass = t.result === "Win" ? "result-win" : t.result === "Loss" ? "result-loss" : "result-break-even";
    const profit = parseFloat(t.profit) || 0;
    const profitClass = profit > 0 ? "positive" : profit < 0 ? "negative" : "";
    const rr = parseFloat(t.actualRR || t.rr || 0);
    const date = t.tradeDate ? new Date(t.tradeDate).toLocaleDateString() : "N/A";
    const direction = t.direction || "—";
    const session = t.session || "—";
    const model = t.entryModel || "—";

    // ── Chart icons ──
    const hasBefore = t.beforeChart && t.beforeChart.trim() !== "";
    const hasDuring = t.duringChart && t.duringChart.trim() !== "";
    const hasAfter = t.afterChart && t.afterChart.trim() !== "";
    const chartIcons = `
      <div class="chart-icons">
        <a href="${hasBefore ? t.beforeChart : '#'}" 
           target="${hasBefore ? '_blank' : ''}" 
           class="chart-icon-link ${!hasBefore ? 'missing' : ''}"
           title="${hasBefore ? 'Before Entry' : 'No chart saved'}"
           ${!hasBefore ? 'onclick="return false;"' : ''}>
          <i class="fa-regular fa-image"></i>
        </a>
        <a href="${hasDuring ? t.duringChart : '#'}" 
           target="${hasDuring ? '_blank' : ''}" 
           class="chart-icon-link ${!hasDuring ? 'missing' : ''}"
           title="${hasDuring ? 'During Trade' : 'No chart saved'}"
           ${!hasDuring ? 'onclick="return false;"' : ''}>
          <i class="fa-regular fa-clock"></i>
        </a>
        <a href="${hasAfter ? t.afterChart : '#'}" 
           target="${hasAfter ? '_blank' : ''}" 
           class="chart-icon-link ${!hasAfter ? 'missing' : ''}"
           title="${hasAfter ? 'After Trade' : 'No chart saved'}"
           ${!hasAfter ? 'onclick="return false;"' : ''}>
          <i class="fa-regular fa-check-circle"></i>
        </a>
      </div>
    `;

    // ── Action buttons: View, Edit, Delete ──
    const actions = `
      <div class="action-group">
        <button class="btn-small" onclick="viewTrade('${t.id}')" title="View Details">
          <i class="fa-solid fa-eye"></i>
        </button>
        <button class="btn-small edit" onclick="editTrade('${t.id}')" title="Edit Trade">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="btn-small danger" onclick="deleteTrade('${t.id}')" title="Delete Trade">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    return `
      <tr>
        <td>${date}</td>
        <td><strong>${t.pair || "—"}</strong></td>
        <td>${direction}</td>
        <td>${session}</td>
        <td>${model}</td>
        <td>${chartIcons}</td>
        <td class="${resultClass}">${t.result || "—"}</td>
        <td>${rr.toFixed(1)}</td>
        <td class="${profitClass}">${profit > 0 ? "+" : ""}$${profit.toFixed(2)}</td>
        <td>${actions}</td>
      </tr>
    `;
  }).join("");
}

// ─── UPDATE STATS ─────────────────────────────────────────────
function updateStats() {
  const total = filteredTrades.length;
  const wins = filteredTrades.filter(t => t.result === "Win").length;
  const losses = filteredTrades.filter(t => t.result === "Loss").length;
  const winRate = total > 0 ? (wins / total * 100) : 0;

  totalTrades.textContent = total;
  winsEl.textContent = wins;
  lossesEl.textContent = losses;
  winRateEl.textContent = winRate.toFixed(1) + "%";
}

// ─── VIEW TRADE (MODAL WITH CHART LINKS) ─────────────────────
window.viewTrade = function(id) {
  const trade = trades.find(t => t.id === id);
  if (!trade) return;

  const fields = [
    { label: "Date", value: trade.tradeDate ? new Date(trade.tradeDate).toLocaleDateString() : "N/A" },
    { label: "Time", value: trade.tradeTime || "N/A" },
    { label: "Pair", value: trade.pair || "—" },
    { label: "Direction", value: trade.direction || "—" },
    { label: "Session", value: trade.session || "—" },
    { label: "Broker", value: trade.broker || "—" },
    { label: "Account", value: trade.account || "—" },
    { label: "Lot Size", value: trade.lotSize || "—" },
    { label: "Entry Price", value: trade.entry || "—" },
    { label: "Stop Loss", value: trade.stopLoss || "—" },
    { label: "Take Profit", value: trade.takeProfit || "—" },
    { label: "Risk %", value: trade.risk ? trade.risk + "%" : "—" },
    { label: "Risk:Reward", value: trade.actualRR || trade.rr || "—" },
    { label: "Profit / Loss", value: trade.profit ? `$${parseFloat(trade.profit).toFixed(2)}` : "—" },
    { label: "Commission", value: trade.commission ? `$${parseFloat(trade.commission).toFixed(2)}` : "—" },
    { label: "Result", value: trade.result || "—" },
    { label: "HTF Swing Bias", value: trade.htfSwing || "—" },
    { label: "HTF Internal Bias", value: trade.htfInternal || "—" },
    { label: "MTF Swing Bias", value: trade.mtfSwing || "—" },
    { label: "MTF Internal Bias", value: trade.mtfInternal || "—" },
    { label: "LTF Structure", value: trade.ltfStructure || "—" },
    { label: "Liquidity Taken", value: trade.liquidity || "—" },
    { label: "Point of Interest", value: trade.poi || "—" },
    { label: "Entry Model", value: trade.entryModel || "—" },
    { label: "Entry Confirmation", value: trade.entryConfirmation || "—" },
    { label: "Trade Valid?", value: trade.tradeValid || "—" },
    { label: "Confidence", value: trade.confidence || "—" },
    { label: "Emotion", value: trade.emotion || "—" },
    { label: "Discipline", value: trade.discipline || "—" },
    { label: "Patience", value: trade.patience || "—" },
    { label: "Trade Summary", value: trade.tradeSummary || "—" },
    { label: "Strengths", value: trade.strengths || "—" },
    { label: "Mistakes", value: trade.mistakes || "—" },
    { label: "Lesson Learned", value: trade.lessonLearned || "—" },
    { label: "Improvement Plan", value: trade.improvementPlan || "—" },
    { label: "Notes", value: trade.notes || "—" },
  ];

  // ── Chart links (clickable in modal) ──
  const chartLinks = [];
  const chartFields = [
    { key: "beforeChart", label: "📷 Before Entry" },
    { key: "duringChart", label: "📷 During Trade" },
    { key: "afterChart", label: "📷 After Trade" }
  ];
  chartFields.forEach(({ key, label }) => {
    const url = trade[key];
    if (url && url.trim() !== "") {
      chartLinks.push(`<a href="${url}" target="_blank" class="chart-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${label}</a>`);
    } else {
      chartLinks.push(`<span class="no-chart">${label}: No chart saved</span>`);
    }
  });

  const chartHTML = `<div style="margin: 6px 0 2px 0; display: flex; flex-direction: column; gap: 4px;">${chartLinks.join("")}</div>`;

  let rows = fields.map(f => `
    <tr>
      <td>${f.label}</td>
      <td>${f.value}</td>
    </tr>
  `).join("");

  detailsContainer.innerHTML = `
    <table class="detail-table">
      <tbody>
        ${rows}
        <tr>
          <td>Chart References</td>
          <td>${chartHTML}</td>
        </tr>
      </tbody>
    </table>
  `;

  modal.style.display = "flex";
  modal.classList.add("active");
};

// ─── EDIT TRADE ──────────────────────────────────────────────
window.editTrade = function(id) {
  // Navigate to journal page with edit parameter
  window.location.href = `journal.html?edit=${id}`;
};

// ─── DELETE TRADE ─────────────────────────────────────────────
window.deleteTrade = async function(id) {
  if (!confirm("Are you sure you want to delete this trade?")) return;
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "trades", id));
    console.log(`🗑️ Trade ${id} deleted`);
  } catch (err) {
    console.error("Delete error:", err);
    alert("Failed to delete trade.");
  }
};

// ─── EXPORT CSV ──────────────────────────────────────────────
exportBtn.addEventListener("click", function() {
  if (filteredTrades.length === 0) {
    alert("No trades to export.");
    return;
  }
  const headers = ["Date", "Pair", "Direction", "Session", "Entry", "Stop Loss", "Take Profit", "RR", "Result", "Profit"];
  const rows = filteredTrades.map(t => [
    t.tradeDate || "",
    t.pair || "",
    t.direction || "",
    t.session || "",
    t.entry || "",
    t.stopLoss || "",
    t.takeProfit || "",
    t.actualRR || t.rr || "",
    t.result || "",
    t.profit || "",
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trades_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ─── EVENT LISTENERS ──────────────────────────────────────────
searchInput.addEventListener("input", applyFilters);
filterPair.addEventListener("change", applyFilters);
filterSession.addEventListener("change", applyFilters);
filterResult.addEventListener("change", applyFilters);

// ─── CLOSE MODAL ON ESC ──────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("active")) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
});