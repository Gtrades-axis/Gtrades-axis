/* ============================================================
   GTRADES-AXIS™ TRADE HISTORY
   Firestore source of truth: users/{uid}/trades
   ============================================================ */

import { auth, db } from "./firebase.js";
import { calculateRealizedRR, calculateProjectedRR, averageRealizedRR } from "./trade-metrics.js?v=20261024-4rr";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

let currentUser = null;
let trades = [];
let filteredTrades = [];
let sortKey = "date";
let sortAscending = false;

const getElement = (id) => document.getElementById(id);

function money(value) {
  const amount = Number(value) || 0;
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function signedMoney(value) {
  const amount = Number(value) || 0;
  const sign = amount >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

function normalizeResult(value) {
  const result = String(value ?? "").trim().toLowerCase();

  if (result === "win") return "Win";
  if (result === "loss") return "Loss";
  if (["breakeven", "break even", "break-even"].includes(result)) {
    return "Breakeven";
  }
  if (result === "partial") return "Partial";
  return "Pending";
}

function normalizeTrade(raw) {
  if (!raw || typeof raw !== "object") return null;

  const result = normalizeResult(raw.result);
  const exitExecutions = Array.isArray(raw.exitExecutions) ? raw.exitExecutions : [];
  const totalExitPercent = Number(raw.totalExitPercent ?? raw.partialPercent ?? (exitExecutions.length ? exitExecutions.reduce((sum, row) => sum + (Number(row.percent) || 0), 0) : (raw.exitPrice ? 100 : 0))) || 0;
  const status = raw.status === "Closed" || totalExitPercent >= 99.999
    ? "Closed"
    : totalExitPercent > 0
      ? "Partial"
      : "Pending";

  return {
    ...raw,
    id: raw.id,
    date: raw.date || "",
    time: raw.time || "",
    pair: raw.pair || "",
    direction: raw.direction || "",
    session: raw.session || "",
    broker: raw.broker || "",
    account: raw.account || "",
    entryModel: raw.entryModel || "",
    entry: raw.entry ?? 0,
    stopLoss: raw.stopLoss ?? 0,
    takeProfit: raw.takeProfit ?? 0,
    exitPrice: raw.exitPrice ?? 0,
    initialEntry: Number(raw.initialEntry ?? raw.entry) || 0,
    initialStopLoss: Number(raw.initialStopLoss ?? raw.stopLoss) || 0,
    initialTakeProfit: Number(raw.initialTakeProfit ?? raw.takeProfit) || 0,
    initialRR: Number(raw.initialRR ?? raw.plannedRR) || calculateProjectedRR({ entry: raw.initialEntry ?? raw.entry, stopLoss: raw.initialStopLoss ?? raw.stopLoss, takeProfit: raw.initialTakeProfit ?? raw.takeProfit, direction: raw.direction }),
    plannedRR: Number(raw.plannedRR ?? raw.initialRR) || calculateProjectedRR({ entry: raw.initialEntry ?? raw.entry, stopLoss: raw.initialStopLoss ?? raw.stopLoss, takeProfit: raw.initialTakeProfit ?? raw.takeProfit, direction: raw.direction }),
    rr: calculateRealizedRR(raw),
    actualRR: calculateRealizedRR(raw),
    realizedRR: calculateRealizedRR(raw),
    profit: raw.profit ?? 0,
    commission: raw.commission ?? 0,
    grossProfit: raw.grossProfit ?? raw.profit ?? 0,
    netProfit: raw.netProfit ?? ((Number(raw.profit) || 0) - (Number(raw.commission) || 0)),
    exitExecutions,
    totalExitPercent,
    remainingPercent: Number(raw.remainingPercent ?? Math.max(0, 100 - totalExitPercent)),
    weightedExitPrice: raw.weightedExitPrice ?? raw.exitPrice ?? 0,
    result,
    status
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tradeDateTime(trade) {
  const value = `${trade.date || ""}T${trade.time || "00:00"}`;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

async function loadTrades() {
  if (!currentUser) return;

  try {
    const tradesRef = collection(db, "users", currentUser.uid, "trades");
    const snapshot = await getDocs(tradesRef);

    trades = snapshot.docs
      .map((item) => normalizeTrade({ id: item.id, ...item.data() }))
      .filter(Boolean);

    filteredTrades = [...trades];
    applyFiltersAndRender();
  } catch (error) {
    console.error("History Firestore load failed:", error);

    const body = getElement("tradeTableBody");
    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="12">
            <div class="empty-state">
              <h3>Unable to load trades</h3>
              <p>${escapeHtml(error.message)}</p>
            </div>
          </td>
        </tr>
      `;
    }
  }
}

function sortTrades(data) {
  return [...data].sort((first, second) => {
    let a = first[sortKey] ?? "";
    let b = second[sortKey] ?? "";

    if (["profit", "rr", "entry", "stopLoss", "takeProfit", "commission"].includes(sortKey)) {
      a = Number(a) || 0;
      b = Number(b) || 0;
    } else if (sortKey === "date") {
      a = tradeDateTime(first);
      b = tradeDateTime(second);
    } else {
      a = String(a).toLowerCase();
      b = String(b).toLowerCase();
    }

    if (a < b) return sortAscending ? -1 : 1;
    if (a > b) return sortAscending ? 1 : -1;
    return 0;
  });
}

function renderTable() {
  const body = getElement("tradeTableBody");
  if (!body) return;

  const data = sortTrades(filteredTrades);

  if (!data.length) {
    body.innerHTML = `
      <tr>
        <td colspan="12">
          <div class="empty-state">
            <i class="fa-solid fa-inbox"></i>
            <h3>No trades found</h3>
            <p>Start journaling your trades in the <a href="/journal" style="color:var(--accent-blue);text-decoration:none;">Trading Journal</a>.</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    body.innerHTML = data.map((trade) => {
      const profit = Number(trade.profit) || 0;
      const commission = Number(trade.commission) || 0;
      const result = normalizeResult(trade.result);
      const resultClass = result.toLowerCase() === "win"
        ? "win"
        : result.toLowerCase() === "loss"
          ? "loss"
          : "breakeven";
      const directionClass = String(trade.direction || "").toLowerCase() === "buy"
        ? "buy"
        : "sell";

      const chartLinks = [
        ["Before", trade.beforeChart],
        ["During", trade.duringChart],
        ["After", trade.afterChart]
      ].filter((item) => item[1]);

      const chartHtml = chartLinks.length
        ? chartLinks.map(([label, url]) => `
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener">
              <i class="fa-solid fa-image"></i>${escapeHtml(label)}
            </a>
          `).join(" ")
        : '<span class="no-link">—</span>';

      return `
        <tr>
          <td>${formatDate(trade.date)}<br><small>${escapeHtml(trade.time || "")}</small></td>
          <td><strong>${escapeHtml(trade.pair || "—")}</strong></td>
          <td><span class="badge-direction ${directionClass}">${escapeHtml(trade.direction || "—")}</span></td>
          <td>${escapeHtml(trade.entry ?? "—")}</td>
          <td>${escapeHtml(trade.stopLoss ?? "—")}</td>
          <td>${escapeHtml(trade.takeProfit ?? "—")}</td>
          <td>${Number.isFinite(Number(trade.rr)) ? Number(trade.rr).toFixed(2) : "—"}</td>
          <td class="trade-profit ${profit > 0 ? "positive" : profit < 0 ? "negative" : "zero"}">${signedMoney(profit)}</td>
          <td>${commission ? money(commission) : "—"}</td>
          <td><span class="badge-result ${resultClass}">${result}</span></td>
          <td><div class="chart-links">${chartHtml}</div></td>
          <td>
            <div class="action-buttons">
              <button class="view-btn" data-id="${escapeHtml(trade.id)}" title="View"><i class="fa-regular fa-eye"></i></button>
              <button class="edit-btn" data-id="${escapeHtml(trade.id)}" title="Edit"><i class="fa-regular fa-pen-to-square"></i></button>
              <button class="delete-btn" data-id="${escapeHtml(trade.id)}" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  const showing = getElement("showingCount");
  const total = getElement("totalCount");
  if (showing) showing.textContent = String(data.length);
  if (total) total.textContent = String(trades.length);

  document.querySelectorAll(".view-btn").forEach((button) => {
    button.onclick = () => {
      const trade = trades.find((item) => String(item.id) === String(button.dataset.id));
      if (trade) openViewModal(trade);
    };
  });

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.onclick = () => {
      window.location.href = `/journal?edit=${encodeURIComponent(button.dataset.id)}`;
    };
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.onclick = async () => {
      if (confirm("Delete this trade permanently?")) {
        await deleteTrade(button.dataset.id);
      }
    };
  });

  updateStats();
}

function updateStats() {
  const data = filteredTrades;
  const closed = data.filter((trade) => trade.status === "Closed");
  const wins = closed.filter((trade) => normalizeResult(trade.result) === "Win");
  const losses = closed.filter((trade) => normalizeResult(trade.result) === "Loss");
  const net = closed.reduce(
    (sum, trade) => sum + (Number(trade.profit) || 0) - (Number(trade.commission) || 0),
    0
  );
  const averageRr = averageRealizedRR(closed);

  let bestStreak = 0;
  let currentStreak = 0;
  let streakType = "";

  [...closed]
    .sort((a, b) => tradeDateTime(a) - tradeDateTime(b))
    .forEach((trade) => {
      const result = normalizeResult(trade.result);
      if (result === "Win" || result === "Loss") {
        if (result === streakType) {
          currentStreak += 1;
        } else {
          streakType = result;
          currentStreak = 1;
        }
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        streakType = "";
        currentStreak = 0;
      }
    });

  const now = new Date();
  const monthCount = data.filter((trade) => {
    if (!trade.date) return false;
    const date = new Date(trade.date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

  const values = {
    statTotal: data.length,
    statWinRate: `${winRate.toFixed(1)}%`,
    statAvgRR: averageRr.toFixed(2),
    statNetProfit: signedMoney(net),
    statWins: wins.length,
    statLosses: losses.length,
    statStreak: bestStreak,
    statMonth: monthCount
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = getElement(id);
    if (element) element.textContent = String(value);
  });
}

function applyFiltersAndRender() {
  const pair = (getElement("filterPair")?.value || "").trim().toLowerCase();
  const direction = getElement("filterDirection")?.value || "";
  const result = getElement("filterResult")?.value || "";
  const from = getElement("filterDateFrom")?.value || "";
  const to = getElement("filterDateTo")?.value || "";

  filteredTrades = trades.filter((trade) => {
    if (pair && !String(trade.pair || "").toLowerCase().includes(pair)) return false;
    if (direction && String(trade.direction || "").toUpperCase() !== direction) return false;
    if (result && normalizeResult(trade.result) !== result) return false;
    if (from && trade.date < from) return false;
    if (to && trade.date > to) return false;
    return true;
  });

  renderTable();
}

function getConfluenceLabels(confluences) {
  if (!confluences) return "";

  const labels = {
    htfSwing: "HTF Swing",
    htfInternal: "HTF Internal",
    mtfSwing: "MTF Swing",
    mtfInternal: "MTF Internal",
    htfDemand: "HTF Demand",
    htfSupply: "HTF Supply",
    mtfDemand: "MTF Demand",
    mtfSupply: "MTF Supply",
    premium: "Premium",
    discount: "Discount",
    sweep: "Liquidity Sweep",
    choch: "CHOCH",
    bos: "BOS",
    mitigation: "POI Mitigation",
    refined: "Refined POI",
    extreme: "Extreme POI"
  };

  return Object.keys(confluences)
    .filter((key) => confluences[key])
    .map((key) => labels[key] || key)
    .join(", ");
}

function getExitExecutionHtml(trade) {
  const exits = Array.isArray(trade.exitExecutions) ? trade.exitExecutions : [];
  if (!exits.length) return `<div class="detail-row"><div class="label">Actual Exits</div><div class="value">No exit executions recorded.</div></div>`;
  const rows = exits.map((exit, index) => `
    <div class="detail-row">
      <div class="label">Exit ${index + 1}</div>
      <div class="value">Price: ${escapeHtml(exit.price)} • Closed: ${escapeHtml(exit.percent)}% • P/L: ${escapeHtml(signedMoney(exit.pnl))} • R: ${escapeHtml(Number(exit.rr || 0).toFixed(2))}R</div>
    </div>`).join("");
  return `
    <div class="detail-row"><div class="label">Exit Summary</div><div class="value">Closed ${escapeHtml(trade.totalExitPercent)}% • Remaining ${escapeHtml(trade.remainingPercent)}% • Weighted Exit ${escapeHtml(trade.weightedExitPrice || "—")}</div></div>
    ${rows}`;
}

function openViewModal(trade) {
  const modal = getElement("viewModal");
  const body = getElement("modalBody");
  if (!modal || !body) return;

  const rows = [
    ["Date", trade.date], ["Time", trade.time], ["Pair", trade.pair],
    ["Direction", trade.direction], ["Session", trade.session], ["Broker", trade.broker],
    ["Account", trade.account], ["Status", trade.status], ["Result", normalizeResult(trade.result)],
    ["Lot Size", trade.lotSize], ["Entry", trade.entry], ["Stop Loss", trade.stopLoss],
    ["Take Profit", trade.takeProfit], ["Exit Price", trade.exitPrice], ["Risk %", trade.risk],
    ["Risk Amount", trade.riskAmount], ["RR", trade.rr], ["Profit", trade.profit],
    ["Commission", trade.commission], ["HTF Swing", trade.htfSwing], ["HTF Internal", trade.htfInternal],
    ["MTF Swing", trade.mtfSwing], ["MTF Internal", trade.mtfInternal], ["LTF Structure", trade.ltfStructure],
    ["Liquidity", trade.liquidity], ["POI", trade.poi], ["Entry Model", trade.entryModel],
    ["Confirmation", trade.entryConfirmation], ["Trade Valid", trade.tradeValid],
    ["Confidence", trade.confidence], ["Emotion", trade.emotion], ["Discipline", trade.discipline],
    ["Patience", trade.patience], ["Summary", trade.tradeSummary], ["Strengths", trade.strengths],
    ["Mistakes", trade.mistakes], ["Lesson", trade.lessonLearned], ["Improvement", trade.improvementPlan],
    ["Before Chart", trade.beforeChart], ["During Chart", trade.duringChart], ["After Chart", trade.afterChart],
    ["Notes", trade.notes], ["Confluences", getConfluenceLabels(trade.confluences)]
  ];

  body.innerHTML = rows
    .map(([label, value]) => `
      <div class="detail-row">
        <div class="label">${escapeHtml(label)}</div>
        <div class="value">${escapeHtml(value || "-")}</div>
      </div>
    `)
    .join("") + getExitExecutionHtml(trade);

  modal.classList.add("active");
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}

function exportJSON() {
  if (!filteredTrades.length) {
    alert("No trades to export.");
    return;
  }

  downloadFile(
    JSON.stringify(filteredTrades, null, 2),
    "trades_export.json",
    "application/json"
  );
}

function exportCSV() {
  if (!filteredTrades.length) {
    alert("No trades to export.");
    return;
  }

  const headers = [
    "Date", "Time", "Pair", "Direction", "Session", "Account",
    "Entry", "Stop Loss", "Take Profit", "Exit Price", "Risk %",
    "Risk Amount", "RR", "Gross Profit", "Commission", "Net Profit", "Closed %", "Remaining %", "Exit Count", "Result", "Status", "Notes"
  ];

  const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = filteredTrades.map((trade) => [
    trade.date, trade.time, trade.pair, trade.direction, trade.session,
    trade.account, trade.entry, trade.stopLoss, trade.takeProfit, trade.exitPrice,
    trade.risk, trade.riskAmount, trade.rr, trade.grossProfit, trade.commission, trade.netProfit,
    trade.totalExitPercent, trade.remainingPercent, Array.isArray(trade.exitExecutions) ? trade.exitExecutions.length : 0,
    trade.result, trade.status, trade.notes
  ]);

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(","))
  ].join("\n");

  downloadFile(csv, "trades_export.csv", "text/csv");
}

async function recalculateAccountBalance(accountId) {
  if (!accountId || !currentUser) return;

  try {
    const accountsRef = collection(db, "users", currentUser.uid, "accounts");
    const snapshot = await getDocs(accountsRef);
    const accountDoc = snapshot.docs.find((item) => item.id === accountId);
    if (!accountDoc) return;

    const account = accountDoc.data();
    const pnl = trades
      .filter((trade) => trade.accountId === accountId && trade.status === "Closed")
      .reduce(
        (sum, trade) => sum + (Number(trade.profit) || 0) - (Number(trade.commission) || 0),
        0
      );

    await updateDoc(
      doc(db, "users", currentUser.uid, "accounts", accountId),
      {
        currentBalance: (Number(account.startingBalance) || 0) + pnl,
        updated: new Date().toISOString()
      }
    );
  } catch (error) {
    console.warn("Account balance recalculation skipped:", error);
  }
}

async function deleteTrade(id) {
  const trade = trades.find((item) => String(item.id) === String(id));
  if (!trade) return;

  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "trades", id));
    trades = trades.filter((item) => String(item.id) !== String(id));

    if (trade.accountId) {
      await recalculateAccountBalance(trade.accountId);
    }

    applyFiltersAndRender();
  } catch (error) {
    console.error(error);
    alert(`Trade could not be deleted: ${error.message}`);
  }
}

async function clearAll() {
  if (!trades.length) {
    alert("No trades to clear.");
    return;
  }

  if (!confirm("Delete ALL your journal trades permanently?")) return;

  try {
    for (const trade of trades) {
      await deleteDoc(doc(db, "users", currentUser.uid, "trades", trade.id));
    }

    const affectedAccounts = [...new Set(
      trades.map((trade) => trade.accountId).filter(Boolean)
    )];

    trades = [];
    filteredTrades = [];

    for (const accountId of affectedAccounts) {
      await recalculateAccountBalance(accountId);
    }

    applyFiltersAndRender();
  } catch (error) {
    console.error(error);
    alert(`Could not clear all trades: ${error.message}`);
  }
}

function setupSorting() {
  document.querySelectorAll("thead th[data-sort]").forEach((header) => {
    header.addEventListener("click", () => {
      const key = header.dataset.sort;

      if (sortKey === key) {
        sortAscending = !sortAscending;
      } else {
        sortKey = key;
        sortAscending = false;
      }

      renderTable();
    });
  });
}

function initHistory() {
  getElement("applyFilters")?.addEventListener("click", applyFiltersAndRender);

  getElement("resetFilters")?.addEventListener("click", () => {
    ["filterPair", "filterDirection", "filterResult", "filterDateFrom", "filterDateTo"]
      .forEach((id) => {
        const element = getElement(id);
        if (element) element.value = "";
      });

    applyFiltersAndRender();
  });

  getElement("exportCSV")?.addEventListener("click", exportCSV);
  getElement("exportJSON")?.addEventListener("click", exportJSON);
  getElement("clearAll")?.addEventListener("click", clearAll);
  getElement("closeModal")?.addEventListener("click", () => {
    getElement("viewModal")?.classList.remove("active");
  });

  getElement("viewModal")?.addEventListener("click", (event) => {
    if (event.target === getElement("viewModal")) {
      getElement("viewModal").classList.remove("active");
    }
  });

  setupSorting();

  getElement("scrollTopBtn")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", () => {
    getElement("scrollTopBtn")?.classList.toggle("visible", window.scrollY > 300);
  });

  getElement("logoutBtn")?.addEventListener("click", async () => {
    if (!confirm("Logout?")) return;
    await signOut(auth);
    window.location.reload();
  });
}

initHistory();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login";
    return;
  }

  currentUser = user;
  await loadTrades();
});

console.log("GTRADES-AXIS trade history loaded.");
