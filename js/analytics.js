import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let trades = [];
let charts = {};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  await loadTrades();
});

async function loadTrades() {
  try {
    const q = query(
      collection(db, "trades"),
      where("userId", "==", auth.currentUser.uid)
    );
    const snapshot = await getDocs(q);
    trades = [];
    snapshot.forEach((doc) => trades.push({ id: doc.id, ...doc.data() }));
    updateOverview();
    buildCharts();
    buildInsights();
  } catch (error) {
    console.error("Analytics load error:", error);
  }
}

function updateOverview() {
  const total = trades.length;
  const wins = trades.filter((t) => t.result === "Win").length;
  const losses = trades.filter((t) => t.result === "Loss").length;
  const be = trades.filter((t) => t.result === "Break Even").length;
  const totalRR = trades.reduce((s, t) => s + (parseFloat(t.actualRR) || 0), 0);
  const profit = trades.reduce((s, t) => s + (parseFloat(t.profit) || 0), 0);
  const grossProfit = trades.reduce((s, t) => (parseFloat(t.profit) > 0 ? s + parseFloat(t.profit) : s), 0);
  const grossLoss = trades.reduce((s, t) => (parseFloat(t.profit) < 0 ? s + Math.abs(parseFloat(t.profit)) : s), 0);
  const winRate = total ? ((wins / total) * 100) : 0;
  const avgRR = total ? totalRR / total : 0;
  const profitFactor = grossLoss ? grossProfit / grossLoss : (grossProfit > 0 ? grossProfit : 0);
  const expectancy = total ? profit / total : 0;
  const avgWin = wins ? grossProfit / wins : 0;
  const avgLoss = losses ? grossLoss / losses : 0;

  setText("totalTrades", total);
  setText("winRate", winRate.toFixed(1) + "%");
  setText("averageRR", avgRR.toFixed(2));
  setText("netProfit", "$" + profit.toFixed(2));
  setText("profitFactor", profitFactor.toFixed(2));
  setText("expectancy", "$" + expectancy.toFixed(2));
  setText("averageWin", "$" + avgWin.toFixed(2));
  setText("averageLoss", "$" + avgLoss.toFixed(2));

  const netEl = document.getElementById("netProfit");
  if (netEl) netEl.className = profit >= 0 ? "positive" : "negative";

  // Best/worst pair, session, model
  const pairStats = {};
  trades.forEach((t) => {
    const p = t.pair || "Unknown";
    pairStats[p] = (pairStats[p] || 0) + (parseFloat(t.profit) || 0);
  });
  let bestPair = "-",
    bestVal = -Infinity,
    worstPair = "-",
    worstVal = Infinity;
  Object.entries(pairStats).forEach(([k, v]) => {
    if (v > bestVal) { bestVal = v; bestPair = k; }
    if (v < worstVal) { worstVal = v; worstPair = k; }
  });
  setText("bestPair", bestPair);
  setText("bestPairProfit", "$" + (bestVal === -Infinity ? 0 : bestVal).toFixed(2));
  setText("worstPair", worstPair);
  setText("worstPairProfit", "$" + (worstVal === Infinity ? 0 : worstVal).toFixed(2));
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── CHARTS ──────────────────────────────────────────────────────
function buildCharts() {
  destroyCharts();
  // Equity
  let running = 0;
  const equity = trades.map((t) => { running += parseFloat(t.profit) || 0; return running; });
  const labels = trades.map((_, i) => i + 1);
  if (equity.length) {
    charts.equity = new Chart(document.getElementById("equityChart"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Equity Curve",
          data: equity,
          borderColor: "#0f8cff",
          backgroundColor: "rgba(15,140,255,0.15)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        }],
      },
      options: chartOptions(),
    });
  }

  // Monthly
  const monthly = {};
  trades.forEach((t) => {
    if (!t.tradeDate) return;
    const m = t.tradeDate.substring(0, 7);
    monthly[m] = (monthly[m] || 0) + (parseFloat(t.profit) || 0);
  });
  const mLabels = Object.keys(monthly).sort();
  if (mLabels.length) {
    charts.monthly = new Chart(document.getElementById("monthlyChart"), {
      type: "bar",
      data: {
        labels: mLabels,
        datasets: [{
          label: "Monthly Profit",
          data: mLabels.map((m) => monthly[m]),
          backgroundColor: "#0f8cff",
          borderRadius: 6,
        }],
      },
      options: chartOptions(),
    });
  }

  // Pair performance
  const pairStats = {};
  trades.forEach((t) => {
    const p = t.pair || "Unknown";
    pairStats[p] = (pairStats[p] || 0) + (parseFloat(t.profit) || 0);
  });
  const pLabels = Object.keys(pairStats);
  if (pLabels.length) {
    charts.pair = new Chart(document.getElementById("pairChart"), {
      type: "bar",
      data: {
        labels: pLabels,
        datasets: [{
          label: "Profit",
          data: pLabels.map((p) => pairStats[p]),
          backgroundColor: pLabels.map((p) => pairStats[p] >= 0 ? "#00c853" : "#ff4d4f"),
          borderRadius: 6,
        }],
      },
      options: chartOptions(),
    });
  }

  // Session distribution
  const sessionStats = {};
  trades.forEach((t) => {
    const s = t.session || "Unknown";
    sessionStats[s] = (sessionStats[s] || 0) + 1;
  });
  const sLabels = Object.keys(sessionStats);
  if (sLabels.length) {
    charts.session = new Chart(document.getElementById("sessionChart"), {
      type: "doughnut",
      data: {
        labels: sLabels,
        datasets: [{
          data: sLabels.map((s) => sessionStats[s]),
          backgroundColor: ["#0f8cff", "#00c853", "#ffb300", "#ff4d4f", "#9c27b0", "#00bcd4"],
        }],
      },
      options: pieOptions(),
    });
  }

  // Model
  const modelStats = {};
  trades.forEach((t) => {
    const m = t.entryModel || "Unknown";
    modelStats[m] = (modelStats[m] || 0) + 1;
  });
  const mLabels2 = Object.keys(modelStats);
  if (mLabels2.length) {
    charts.model = new Chart(document.getElementById("modelChart"), {
      type: "bar",
      data: {
        labels: mLabels2,
        datasets: [{
          label: "Trades",
          data: mLabels2.map((m) => modelStats[m]),
          backgroundColor: "#0f8cff",
          borderRadius: 6,
        }],
      },
      options: chartOptions(),
    });
  }

  // Result pie
  const wins = trades.filter((t) => t.result === "Win").length;
  const losses = trades.filter((t) => t.result === "Loss").length;
  const be = trades.filter((t) => t.result === "Break Even").length;
  if (trades.length) {
    charts.result = new Chart(document.getElementById("resultChart"), {
      type: "pie",
      data: {
        labels: ["Win", "Loss", "Break Even"],
        datasets: [{
          data: [wins, losses, be],
          backgroundColor: ["#00c853", "#ff4d4f", "#ffb300"],
        }],
      },
      options: pieOptions(),
    });
  }

  // Psychology
  const psychStats = {};
  trades.forEach((t) => {
    const e = t.emotion || "Unknown";
    psychStats[e] = (psychStats[e] || 0) + 1;
  });
  const psLabels = Object.keys(psychStats);
  if (psLabels.length) {
    charts.psychology = new Chart(document.getElementById("psychologyChart"), {
      type: "doughnut",
      data: {
        labels: psLabels,
        datasets: [{
          data: psLabels.map((p) => psychStats[p]),
          backgroundColor: ["#0f8cff", "#00c853", "#ffb300", "#ff4d4f", "#9c27b0", "#00bcd4"],
        }],
      },
      options: pieOptions(),
    });
  }

  // HTF Bias
  const htf = {};
  trades.forEach((t) => {
    const h = t.htfSwing || "Unknown";
    htf[h] = (htf[h] || 0) + 1;
  });
  const hLabels = Object.keys(htf);
  if (hLabels.length) {
    charts.htf = new Chart(document.getElementById("htfChart"), {
      type: "pie",
      data: {
        labels: hLabels,
        datasets: [{
          data: hLabels.map((h) => htf[h]),
          backgroundColor: ["#00c853", "#ff4d4f", "#0f8cff"],
        }],
      },
      options: pieOptions(),
    });
  }

  // MTF
  const mtf = {};
  trades.forEach((t) => {
    const m = t.mtfSwing || "Unknown";
    mtf[m] = (mtf[m] || 0) + 1;
  });
  const mtLabels = Object.keys(mtf);
  if (mtLabels.length) {
    charts.mtf = new Chart(document.getElementById("mtfChart"), {
      type: "pie",
      data: {
        labels: mtLabels,
        datasets: [{
          data: mtLabels.map((m) => mtf[m]),
          backgroundColor: ["#00c853", "#ff4d4f", "#0f8cff"],
        }],
      },
      options: pieOptions(),
    });
  }

  // Monthly Win Rate
  const mw = {};
  trades.forEach((t) => {
    if (!t.tradeDate) return;
    const m = t.tradeDate.substring(0, 7);
    if (!mw[m]) mw[m] = { wins: 0, total: 0 };
    mw[m].total++;
    if (t.result === "Win") mw[m].wins++;
  });
  const mwLabels = Object.keys(mw).sort();
  if (mwLabels.length) {
    charts.monthlyWin = new Chart(document.getElementById("monthlyWinChart"), {
      type: "line",
      data: {
        labels: mwLabels,
        datasets: [{
          label: "Win Rate %",
          data: mwLabels.map((m) => {
            const d = mw[m];
            return d.total ? ((d.wins / d.total) * 100).toFixed(1) : 0;
          }),
          borderColor: "#0f8cff",
          backgroundColor: "rgba(15,140,255,0.18)",
          fill: true,
          tension: 0.35,
        }],
      },
      options: chartOptions(),
    });
  }
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#94a3b8", font: { size: 10 } },
      },
    },
    scales: {
      x: { ticks: { color: "#94a3b8", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.05)" } },
      y: { ticks: { color: "#94a3b8", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.05)" } },
    },
  };
}

function pieOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#94a3b8", padding: 10, font: { size: 10 } },
      },
    },
  };
}

function destroyCharts() {
  Object.keys(charts).forEach((key) => {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  });
}

function buildInsights() {
  const panel = document.getElementById("analyticsInsights");
  if (!panel) return;
  if (!trades.length) {
    panel.innerHTML = `<div class="loading-card">No trading history found.</div>`;
    return;
  }
  const total = trades.length;
  const wins = trades.filter((t) => t.result === "Win").length;
  const losses = trades.filter((t) => t.result === "Loss").length;
  const be = trades.filter((t) => t.result === "Break Even").length;
  const winRate = total ? ((wins / total) * 100).toFixed(1) : 0;
  panel.innerHTML = `
    <div class="insight-item"><h4>📊 Total</h4><p>${total}</p></div>
    <div class="insight-item"><h4>✅ Win Rate</h4><p style="color:#00c853;">${winRate}%</p></div>
    <div class="insight-item"><h4>🏆 Wins</h4><p style="color:#00c853;">${wins}</p></div>
    <div class="insight-item"><h4>❌ Losses</h4><p style="color:#ff4d4f;">${losses}</p></div>
    <div class="insight-item"><h4>⚖️ BE</h4><p style="color:#ffb300;">${be}</p></div>
    <div class="insight-item"><h4>🏅 Best Pair</h4><p>${document.getElementById("bestPair").textContent}</p></div>
  `;
}