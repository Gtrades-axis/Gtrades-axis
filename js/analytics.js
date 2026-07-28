import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let trades = [];
let charts = {};
let currentUser = null;
let analyticsLoaded = false;

// ─── SAFE DOM HELPERS ──────────────────────────────────────────
function getEl(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`⚠️ Element #${id} missing.`);
  return el;
}

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
    console.log(`📊 Analytics: ${trades.length} trades loaded`);
    refreshAnalytics();
  }, (error) => {
    console.error("Firestore error:", error);
    alert("Error loading trades: " + error.message);
  });
}

// ─── MASTER REFRESH ────────────────────────────────────────────
function refreshAnalytics() {
  if (!analyticsLoaded) {
    initializeCharts();
    analyticsLoaded = true;
  }
  updateOverview();
  buildCharts();
  buildInsights();        // quick insights panel
  buildAICoach();        // ← AI Coach using the same trades
}

// ─── UPDATE OVERVIEW STATS ──────────────────────────────────
function updateOverview() {
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
  setText("bestPairProfit", bestVal === -Infinity ? "$0" : "$" + bestVal.toFixed(2));

  let worstPair = "-", worstVal = Infinity;
  Object.entries(pairStats).forEach(([k, v]) => {
    if (v < worstVal) { worstVal = v; worstPair = k; }
  });
  setText("worstPair", worstPair);
  setText("worstPairProfit", worstVal === Infinity ? "$0" : "$" + worstVal.toFixed(2));

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
  setText("bestSessionWinrate", bestSessionVal === -Infinity ? "0%" : bestSessionVal.toFixed(0) + "%");

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
  setText("bestModelWinrate", bestModelCount === 0 ? "0%" : ((bestModelCount / total) * 100).toFixed(0) + "%");
}

function setText(id, value) {
  const el = getEl(id);
  if (el) el.textContent = value;
}

// ─── CHARTS ──────────────────────────────────────────────────
function initializeCharts() {
  const equityCanvas = getEl("equityChart");
  const monthlyCanvas = getEl("monthlyChart");
  const pairCanvas = getEl("pairChart");
  const sessionCanvas = getEl("sessionChart");
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
  console.log("✅ Charts initialised");
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

function buildCharts() {
  if (!charts.equity) return;
  let running = 0;
  const eq = trades.map((t) => { running += Number(t.profit || 0); return running; });
  charts.equity.data.labels = trades.map((_, i) => i + 1);
  charts.equity.data.datasets[0].data = eq;
  charts.equity.update();

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

  const pairStats = {};
  trades.forEach(t => {
    const p = t.pair || "Unknown";
    pairStats[p] = (pairStats[p] || 0) + Number(t.profit || 0);
  });
  const pLabels = Object.keys(pairStats);
  charts.pair.data.labels = pLabels;
  charts.pair.data.datasets[0].data = pLabels.map(p => pairStats[p]);
  charts.pair.update();

  const sessionCount = {};
  trades.forEach(t => {
    const s = t.session || "Unknown";
    sessionCount[s] = (sessionCount[s] || 0) + 1;
  });
  const sLabels = Object.keys(sessionCount);
  charts.session.data.labels = sLabels;
  charts.session.data.datasets[0].data = sLabels.map(s => sessionCount[s]);
  charts.session.update();
}

// ─── QUICK INSIGHTS PANEL ──────────────────────────────────
function buildInsights() {
  const grid = document.getElementById("analyticsInsightsGrid");
  if (!grid) return;
  if (trades.length === 0) {
    grid.innerHTML = `<div class="insight-item">No trading history</div>`;
    return;
  }
  const total = trades.length;
  const wins = trades.filter(t => t.result === "Win").length;
  const losses = trades.filter(t => t.result === "Loss").length;
  const be = trades.filter(t => t.result === "Break Even").length;
  const winRate = total ? ((wins / total) * 100).toFixed(1) : 0;
  const bestPair = getEl("bestPair")?.textContent || "-";
  grid.innerHTML = `
    <div class="insight-item"><h4>📊 Total</h4><p>${total}</p></div>
    <div class="insight-item"><h4>✅ Win Rate</h4><p style="color:#4ade80;">${winRate}%</p></div>
    <div class="insight-item"><h4>🏆 Wins</h4><p style="color:#4ade80;">${wins}</p></div>
    <div class="insight-item"><h4>❌ Losses</h4><p style="color:#f87171;">${losses}</p></div>
    <div class="insight-item"><h4>⚖️ BE</h4><p style="color:#facc15;">${be}</p></div>
    <div class="insight-item"><h4>🏅 Best Pair</h4><p>${bestPair}</p></div>
  `;
}

// ─── AI COACH ──────────────────────────────────────────────────
function buildAICoach() {
  const container = document.getElementById("aiCoachContent");
  if (!container) return;

  if (trades.length === 0) {
    container.innerHTML = `
      <div class="coach-loading" style="color: #facc15;">
        <i class="fa-regular fa-face-smile"></i> 
        No trades yet! Start journaling to get AI insights.
      </div>
    `;
    return;
  }

  // ── Calculate coach stats ──
  const total = trades.length;
  const wins = trades.filter(t => t.result === "Win").length;
  const losses = trades.filter(t => t.result === "Loss").length;
  const breakevens = trades.filter(t => t.result === "Break Even").length;
  const winRate = total > 0 ? (wins / total * 100) : 0;

  let netProfit = 0;
  trades.forEach(t => {
    const p = parseFloat(t.profit) || 0;
    netProfit += p;
  });

  let rrSum = 0, rrCount = 0;
  trades.forEach(t => {
    const rr = parseFloat(t.actualRR || t.rr);
    if (!isNaN(rr) && rr > 0) {
      rrSum += rr;
      rrCount++;
    }
  });
  const avgRR = rrCount > 0 ? rrSum / rrCount : 0;
  const consistency = winRate;

  let streak = 0;
  if (trades.length > 0) {
    const lastResult = trades[trades.length - 1].result?.toLowerCase();
    if (lastResult === "win") {
      for (let i = trades.length - 1; i >= 0; i--) {
        if (trades[i].result?.toLowerCase() === "win") streak++;
        else break;
      }
    } else if (lastResult === "loss") {
      for (let i = trades.length - 1; i >= 0; i--) {
        if (trades[i].result?.toLowerCase() === "loss") streak--;
        else break;
      }
    }
  }

  // Psychology scores from discipline/patience/confidence
  const psychFields = ["discipline", "patience", "confidence"];
  let psychScores = [];
  trades.forEach(t => {
    psychFields.forEach(f => {
      const val = t[f];
      if (val) {
        const map = {
          "excellent": 4, "good": 3, "average": 2, "poor": 1,
          "very high": 4, "high": 3, "medium": 2, "low": 1
        };
        const score = map[val.toLowerCase()] || 0;
        if (score > 0) psychScores.push(score);
      }
    });
  });
  const avgPsych = psychScores.length > 0 ? psychScores.reduce((a,b) => a+b, 0) / psychScores.length : 0;

  // ── Insights items ──
  const insightItems = [
    { label: "Total Trades", value: total, detail: `${wins}W / ${losses}L / ${breakevens}BE` },
    { label: "Win Rate", value: winRate.toFixed(1) + "%", detail: winRate >= 50 ? "📈 Above average" : "📉 Focus on setups" },
    { label: "Net Profit", value: `$${netProfit.toFixed(2)}`, detail: netProfit >= 0 ? "✅ Profitable" : "❌ Review risk" },
    { label: "Avg RR", value: avgRR.toFixed(1), detail: avgRR >= 2.0 ? "👍 Great" : "⚠️ Aim for 2:1+" },
    { label: "Consistency", value: consistency.toFixed(1) + "%", detail: consistency >= 50 ? "✅ Stable" : "⚠️ Needs work" },
    { label: "Streak", value: streak > 0 ? `🔥 +${streak}` : streak < 0 ? `❄️ ${streak}` : "➖ 0", detail: streak !== 0 ? "Keep going!" : "Stay focused" }
  ];
  if (psychScores.length > 0) {
    const psychLevel = avgPsych >= 3.5 ? "Excellent" : avgPsych >= 2.5 ? "Good" : "Needs work";
    insightItems.push({ label: "Psychology", value: psychLevel, detail: `Based on ${psychScores.length} ratings` });
  }

  // ── Recommendations ──
  const recs = [];
  if (winRate < 50) recs.push("Improve win rate by sticking to high‑probability setups.");
  if (avgRR < 2.0) recs.push("Aim for a minimum 2:1 risk‑reward ratio.");
  if (netProfit < 0) recs.push("Review losing trades for common mistakes.");
  if (trades.length > 10 && consistency < 50) recs.push("Your performance is inconsistent – journal emotions.");
  if (streak < -2) recs.push("You're on a losing streak – take a break.");
  if (avgPsych && avgPsych < 2.5) recs.push("Work on trading psychology – use a checklist.");
  if (recs.length === 0) recs.push("Keep doing what you’re doing! Your stats look solid.");

  // ── Render ──
  container.innerHTML = `
    <div class="coach-content">
      <div class="coach-insights">
        ${insightItems.map(item => `
          <div class="coach-insight-item">
            <div class="insight-label">${item.label}</div>
            <div class="insight-value">${item.value}</div>
            <div class="insight-detail">${item.detail}</div>
          </div>
        `).join("")}
      </div>
      <div class="coach-recommendations">
        <h4><i class="fa-regular fa-comment-dots"></i> Recommendations</h4>
        <ul>
          ${recs.map(r => `<li><i class="fa-solid fa-lightbulb"></i> ${r}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;
}