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
  updateDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let currentUser = null;
let trades = [];
let editingId = null;

// ─── DOM ELEMENTS ──────────────────────────────────────────────
const form = document.getElementById("tradeForm");
const saveBtn = document.getElementById("saveTrade");
const totalTrades = document.getElementById("totalTrades");
const winRate = document.getElementById("winRate");
const avgRR = document.getElementById("averageRR");
const netProfit = document.getElementById("netProfit");
const wins = document.getElementById("wins");
const losses = document.getElementById("losses");
const consistency = document.getElementById("consistency");
const streak = document.getElementById("streak");
const equityChart = document.getElementById("equityChart");
const monthlyChart = document.getElementById("monthlyChart");

// ─── AUTH GUARD ─────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadTrades();
});

// ─── LOAD TRADES FROM FIRESTORE ───────────────────────────────
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
    console.error("Load trades error:", error);
  }
}

// ─── SAVE TRADE ──────────────────────────────────────────────────
async function saveTrade(data) {
  if (!currentUser) throw new Error("Not logged in");
  const payload = { ...data, userId: currentUser.uid };
  if (editingId) {
    await updateDoc(doc(db, "trades", editingId), data);
    const index = trades.findIndex((t) => t.id === editingId);
    if (index !== -1) trades[index] = { ...trades[index], ...data };
    editingId = null;
    saveBtn.textContent = "Save Trade";
  } else {
    const ref = await addDoc(collection(db, "trades"), payload);
    trades.unshift({ id: ref.id, ...payload });
  }
  updateStats();
  updateCharts();
  form.reset();
  document.getElementById("tradeDate").value = new Date().toISOString().split("T")[0];
}

// ─── DELETE TRADE ───────────────────────────────────────────────
async function deleteTrade(id) {
  if (!confirm("Delete this trade?")) return;
  await deleteDoc(doc(db, "trades", id));
  trades = trades.filter((t) => t.id !== id);
  updateStats();
  updateCharts();
}

// ─── EDIT TRADE (populate form) ────────────────────────────────
function editTrade(id) {
  const trade = trades.find((t) => t.id === id);
  if (!trade) return;
  editingId = id;
  Object.keys(trade).forEach((key) => {
    const el = document.getElementById(key);
    if (el) el.value = trade[key] ?? "";
  });
  document.getElementById("tradeDate").value = trade.tradeDate || "";
  saveBtn.textContent = "Update Trade";
  window.scrollTo(0, 0);
}

// ─── STATS ──────────────────────────────────────────────────────
function updateStats() {
  const total = trades.length;
  const winsCount = trades.filter((t) => t.result === "Win").length;
  const lossesCount = trades.filter((t) => t.result === "Loss").length;
  const beCount = trades.filter((t) => t.result === "Break Even").length;
  const totalRR = trades.reduce((sum, t) => sum + (parseFloat(t.actualRR) || 0), 0);
  const profit = trades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
  const winRateVal = total ? (winsCount / total) * 100 : 0;
  const avgRRVal = total ? totalRR / total : 0;
  const consistencyVal = total ? ((winsCount + beCount) / total) * 100 : 0;
  const streakVal = calculateStreak();

  totalTrades.textContent = total;
  winRate.textContent = winRateVal.toFixed(1) + "%";
  avgRR.textContent = avgRRVal.toFixed(2);
  netProfit.textContent = "$" + profit.toFixed(2);
  netProfit.className = profit >= 0 ? "value-positive" : "value-negative";
  wins.textContent = winsCount;
  losses.textContent = lossesCount;
  consistency.textContent = consistencyVal.toFixed(1) + "%";
  streak.textContent = streakVal;
}

function calculateStreak() {
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].result === "Win") streak++;
    else if (trades[i].result === "Loss") break;
    else continue;
  }
  return streak;
}

// ─── CHARTS ──────────────────────────────────────────────────────
function updateCharts() {
  // Simple chart logic – you can keep your existing chart.js code
  // I'll provide a minimal version; you can replace with your full chart logic
  if (typeof Chart !== "undefined") {
    // Destroy old charts if they exist
    if (window.equityChart) window.equityChart.destroy();
    if (window.monthlyChart) window.monthlyChart.destroy();

    // Equity curve
    let running = 0;
    const equityData = trades.map((t) => {
      running += parseFloat(t.profit) || 0;
      return running;
    });
    const labels = trades.map((_, i) => i + 1);

    if (equityData.length > 0) {
      window.equityChart = new Chart(equityChart, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "Equity Curve",
            data: equityData,
            borderColor: "#0f8cff",
            backgroundColor: "rgba(15,140,255,0.15)",
            fill: true,
            tension: 0.35,
            pointRadius: 3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: "#94a3b8" } } },
          scales: {
            x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } },
            y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } },
          },
        },
      });
    }

    // Monthly
    const monthly = {};
    trades.forEach((t) => {
      if (!t.tradeDate) return;
      const month = t.tradeDate.substring(0, 7);
      monthly[month] = (monthly[month] || 0) + (parseFloat(t.profit) || 0);
    });
    const monthLabels = Object.keys(monthly).sort();
    if (monthLabels.length > 0) {
      window.monthlyChart = new Chart(monthlyChart, {
        type: "bar",
        data: {
          labels: monthLabels,
          datasets: [{
            label: "Monthly Profit",
            data: monthLabels.map((m) => monthly[m]),
            backgroundColor: "#0f8cff",
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: "#94a3b8" } } },
          scales: {
            x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } },
            y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } },
          },
        },
      });
    }
  }
}

// ─── FORM SUBMIT ─────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    tradeDate: document.getElementById("tradeDate").value,
    tradeTime: document.getElementById("tradeTime").value,
    pair: document.getElementById("pair").value,
    direction: document.getElementById("direction").value,
    session: document.getElementById("session").value,
    broker: document.getElementById("broker").value,
    account: document.getElementById("account").value,
    lotSize: parseFloat(document.getElementById("lotSize").value) || 0,
    htfSwing: document.getElementById("htfSwing").value,
    htfInternal: document.getElementById("htfInternal").value,
    mtfSwing: document.getElementById("mtfSwing").value,
    mtfInternal: document.getElementById("mtfInternal").value,
    ltfStructure: document.getElementById("ltfStructure").value,
    liquidity: document.getElementById("liquidity").value,
    poi: document.getElementById("poi").value,
    entryModel: document.getElementById("entryModel").value,
    entryConfirmation: document.getElementById("entryConfirmation").value,
    tradeValid: document.getElementById("tradeValid").value,
    entryPrice: parseFloat(document.getElementById("entryPrice").value) || 0,
    stopLoss: parseFloat(document.getElementById("stopLoss").value) || 0,
    takeProfit: parseFloat(document.getElementById("takeProfit").value) || 0,
    risk: parseFloat(document.getElementById("risk").value) || 0,
    expectedRR: parseFloat(document.getElementById("expectedRR").value) || 0,
    actualRR: parseFloat(document.getElementById("actualRR").value) || 0,
    commission: parseFloat(document.getElementById("commission").value) || 0,
    profit: parseFloat(document.getElementById("profit").value) || 0,
    result: document.getElementById("result").value,
    breakEven: document.getElementById("breakEven").value,
    partials: document.getElementById("partials").value,
    trailing: document.getElementById("trailing").value,
    executionQuality: document.getElementById("executionQuality").value,
    followedPlan: document.getElementById("followedPlan").value,
    confidence: document.getElementById("confidence").value,
    emotion: document.getElementById("emotion").value,
    discipline: document.getElementById("discipline").value,
    patience: document.getElementById("patience").value,
    tradeSummary: document.getElementById("tradeSummary").value,
    strengths: document.getElementById("strengths").value,
    mistakes: document.getElementById("mistakes").value,
    lessonLearned: document.getElementById("lessonLearned").value,
    improvementPlan: document.getElementById("improvementPlan").value,
    beforeChart: document.getElementById("beforeChart").value,
    duringChart: document.getElementById("duringChart").value,
    afterChart: document.getElementById("afterChart").value,
    notes: document.getElementById("notes").value,
  };

  try {
    await saveTrade(data);
    alert(editingId ? "Trade updated!" : "Trade saved!");
  } catch (error) {
    alert("Error: " + error.message);
  }
});

// ─── CANCEL EDIT ─────────────────────────────────────────────────
document.getElementById("cancelEdit")?.addEventListener("click", () => {
  editingId = null;
  saveBtn.textContent = "Save Trade";
  form.reset();
  document.getElementById("tradeDate").value = new Date().toISOString().split("T")[0];
});