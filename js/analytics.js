import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

console.log("🔍 analytics.js loaded");

let trades = [];
let charts = {};
let currentUser = null;
let analyticsLoaded = false;

// ─── DOM ELEMENTS ──────────────────────────────────────────────
const totalTradesEl = document.getElementById("totalTrades");
const winRateEl = document.getElementById("winRate");
const avgRREl = document.getElementById("averageRR");
const netProfitEl = document.getElementById("netProfit");
const profitFactorEl = document.getElementById("profitFactor");
const expectancyEl = document.getElementById("expectancy");
const avgWinEl = document.getElementById("averageWin");
const avgLossEl = document.getElementById("averageLoss");
const bestPairEl = document.getElementById("bestPair");
const bestSessionEl = document.getElementById("bestSession");
const bestModelEl = document.getElementById("bestModel");
const equityCanvas = document.getElementById("equityChart");
const monthlyCanvas = document.getElementById("monthlyChart");
const pairCanvas = document.getElementById("pairChart");
const sessionCanvas = document.getElementById("sessionChart");
const insightsPanel = document.getElementById("analyticsInsights");

// ─── AUTH ──────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  console.log("🔥 Auth state changed. User:", user?.uid);
  if (!user) {
    console.warn("⛔ Not logged in – redirecting to login");
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  loadTradesRealtime();
});

// ─── REAL-TIME FIRESTORE ──────────────────────────────────────
function loadTradesRealtime() {
  console.log("📡 Connecting to Firestore for trades...");
  const q = query(
    collection(db, "trades"),
    where("userId", "==", currentUser.uid),
    orderBy("tradeDate", "desc")
  );
  onSnapshot(q, (snapshot) => {
    console.log(`📦 Received ${snapshot.size} trades from Firestore.`);
    trades = [];
    snapshot.forEach((doc) => {
      trades.push({ id: doc.id, ...doc.data() });
      console.log("  - Trade:", doc.data());
    });
    refreshAnalytics();
  }, (error) => {
    console.error("❌ Firestore snapshot error:", error);
    alert("Firestore error: " + error.message);
  });
}

// ─── MASTER REFRESH ────────────────────────────────────────────
function refreshAnalytics() {
  console.log("🔄 Refreshing analytics with", trades.length, "trades");
  if (!analyticsLoaded) {
    initializeCharts();
    analyticsLoaded = true;
  }
  updateOverview();
  buildCharts();
  buildInsights();
}

// ─── UPDATE OVERVIEW STATS ────────────────────────────────────
function updateOverview() {
  console.log("📊 Updating overview stats");
  const total = trades.length;
  const wins = trades.filter(t => t.result === "Win");
  const losses = trades.filter(t => t.result === "Loss");
  const be = trades.filter(t => t.result === "Break Even");

  const grossProfit = wins.reduce((sum, t) => sum + Number(t.profit || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + Number(t.profit || 0), 0));
  const netProfit = trades.reduce((sum, t) => sum + Number(t.profit || 0), 0);
  const totalRR = trades.reduce((sum, t) => sum + Number(t.actualRR || 0), 0);
  const winRate = total ? (wins.length / total) * 100 : 0;
  const avgRR = total ? totalRR / total : 0;
  const profitFactor = grossLoss ? grossProfit / grossLoss : (grossProfit > 0 ? grossProfit : 0);
  const expectancy = total ? netProfit / total : 0;
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;

  setText("totalTrades", total);
  setText("winRate", winRate.toFixed(1) + "%");
  setText("averageRR", avgRR.toFixed(2));
  setText("netProfit", "$" + netProfit.toFixed(2));
  setText("profitFactor", profitFactor.toFixed(2));
  setText("expectancy", "$" + expectancy.toFixed(2));
  setText("averageWin", "$" + avgWin.toFixed(2));
  setText("averageLoss", "$" + avgLoss.toFixed(2));

  // Best pair
  const pairStats = {};
  trades.forEach(t => {
    const p = t.pair || "Unknown";
    pairStats[p] = (pairStats[p] || 0) + Number(t.profit || 0);
  });
  let bestPair = "-", bestVal = -Infinity;
  Object.entries(pairStats).forEach(([k, v]) => {
    if (v > bestVal) { bestVal = v; bestPair = k; }
  });
  setText("bestPair", bestPair);

  // Best session
  const sessionStats = {};
  trades.forEach(t => {
    const s = t.session || "Unknown";
    sessionStats[s] = (sessionStats[s] || 0) + Number(t.profit || 0);
  });
  let bestSession = "-", bestSessionVal = -Infinity;
  Object.entries(sessionStats).forEach(([k, v]) => {
    if (v > bestSessionVal) { bestSessionVal = v; bestSession = k; }
  });
  setText("bestSession", bestSession);

  // Best model
  const modelStats = {};
  trades.forEach(t => {
    const m = t.entryModel || "Unknown";
    modelStats[m] = (modelStats[m] || 0) + 1;
  });
  let bestModel = "-", bestModelCount = 0;
  Object.entries(modelStats).forEach(([k, v]) => {
    if (v > bestModelCount) { bestModelCount = v; bestModel = k; }
  });
  setText("bestModel", bestModel);

  console.log("✅ Overview updated.");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
  else console.warn("⚠️ Element not found:", id);
}

// ─── CHART INITIALISATION ─────────────────────────────────────
function initializeCharts() {
  console.log("📈 Initialising charts...");
  if (!equityCanvas || !monthlyCanvas || !pairCanvas || !sessionCanvas) {
    console.warn("⚠️ Some chart canvases missing");
    return;
  }

  charts.equity = new Chart(equityCanvas, {
    type: "line",
    data: { labels: [], datasets: [{ label: "Equity", data: [], borderColor: "#0f8cff", backgroundColor: "rgba(15,140,255,0.15)", fill: true, tension: 0.35 }] },
    options: chartOptions()
  });
  charts.monthly = new Chart(monthlyCanvas, {
    type: "bar",
    data: { labels: [], datasets: [{ label: "Monthly Profit", data: [], backgroundColor: "#0f8cff", borderRadius: 6 }] },
    options: chartOptions()
  });
  charts.pair = new Chart(pairCanvas, {
    type: "bar",
    data: { labels: [], datasets: [{ label: "Profit", data: [], backgroundColor: "#0f8cff", borderRadius: 6 }] },
    options: chartOptions()
  });
  charts.session = new Chart(sessionCanvas, {
    type: "doughnut",
    data: { labels: [], datasets: [{ data: [], backgroundColor: ["#0f8cff", "#00c853", "#ffb300", "#ff4d4f", "#9c27b0"] }] },
    options: pieOptions()
  });
  console.log("✅ Charts initialised.");
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#94a3b8", font: { size: 10 } } } },
    scales: {
      x: { ticks: { color: "#94a3b8", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.05)" } },
      y: { ticks: { color: "#94a3b8", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.05)" } }
    }
  };
}

function pieOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom", labels: { color: "#94a3b8", padding: 10, font: { size: 10 } } } }
  };
}

// ─── BUILD ALL CHARTS ─────────────────────────────────────────
function buildCharts() {
  console.log("📊 Building charts...");
  if (!charts.equity) return;

  // Equity curve
  let running = 0;
  const eq = trades.map((t) => { running += Number(t.profit || 0); return running; });
  charts.equity.data.labels = trades.map((_, i) => i + 1);
  charts.equity.data.datasets[0].data = eq;
  charts.equity.update();

  // Monthly
  const monthly = {};
  trades.forEach(t => {
    if (!t.tradeDate) return;
    const m = t.tradeDate.substring(0, 7);
    monthly[m] = (monthly[m] || 0) + Number(t.profit || 0);
  });
  const mLabels = Object.keys(monthly).sort();
  charts.monthly.data.labels = mLabels;
  charts.monthly.data.datasets[0].data = mLabels.map(m => monthly[m]);
  charts.monthly.update();

  // Pair
  const pairStats = {};
  trades.forEach(t => {
    const p = t.pair || "Unknown";
    pairStats[p] = (pairStats[p] || 0) + Number(t.profit || 0);
  });
  const pLabels = Object.keys(pairStats);
  charts.pair.data.labels = pLabels;
  charts.pair.data.datasets[0].data = pLabels.map(p => pairStats[p]);
  charts.pair.update();

  // Session
  const sessionCount = {};
  trades.forEach(t => {
    const s = t.session || "Unknown";
    sessionCount[s] = (sessionCount[s] || 0) + 1;
  });
  const sLabels = Object.keys(sessionCount);
  charts.session.data.labels = sLabels;
  charts.session.data.datasets[0].data = sLabels.map(s => sessionCount[s]);
  charts.session.update();

  console.log("✅ Charts updated.");
}

// ─── INSIGHTS ──────────────────────────────────────────────────
function buildInsights() {
  console.log("💡 Building insights...");
  if (!insightsPanel) return;
  if (trades.length === 0) {
    insightsPanel.innerHTML = `<div class="loading-card">No trading history found.</div>`;
    return;
  }
  const total = trades.length;
  const wins = trades.filter(t => t.result === "Win").length;
  const losses = trades.filter(t => t.result === "Loss").length;
  const be = trades.filter(t => t.result === "Break Even").length;
  const winRate = total ? ((wins / total) * 100).toFixed(1) : 0;
  const bestPair = document.getElementById("bestPair")?.textContent || "-";
  insightsPanel.innerHTML = `
    <div class="insight-item"><h4>📊 Total</h4><p>${total}</p></div>
    <div class="insight-item"><h4>✅ Win Rate</h4><p style="color:#00c853;">${winRate}%</p></div>
    <div class="insight-item"><h4>🏆 Wins</h4><p style="color:#00c853;">${wins}</p></div>
    <div class="insight-item"><h4>❌ Losses</h4><p style="color:#ff4d4f;">${losses}</p></div>
    <div class="insight-item"><h4>⚖️ BE</h4><p style="color:#ffb300;">${be}</p></div>
    <div class="insight-item"><h4>🏅 Best Pair</h4><p>${bestPair}</p></div>
  `;
  console.log("✅ Insights built.");
}