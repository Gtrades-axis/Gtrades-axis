import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let currentUser = null;
let trades = [];
let editingId = null;

// ─── SAFE DOM REFERENCES ──────────────────────────────────────
function getEl(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`⚠️ Element #${id} not found`);
  return el;
}

const form = getEl("tradeForm");
const saveBtn = getEl("saveTrade");
const totalTrades = getEl("totalTrades");
const winRate = getEl("winRate");
const avgRR = getEl("averageRR");
const netProfit = getEl("netProfit");
const wins = getEl("wins");
const losses = getEl("losses");
const consistency = getEl("consistency");
const streak = getEl("streak");
const equityCanvas = getEl("equityChart");
const monthlyCanvas = getEl("monthlyChart");

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
    const tradesRef = collection(db, "users", currentUser.uid, "trades");
    const q = query(tradesRef, orderBy("tradeDate", "desc"));
    const snapshot = await getDocs(q);
    trades = [];
    snapshot.forEach((doc) => {
      trades.push({ id: doc.id, ...doc.data() });
    });
    updateStats();
    updateCharts();
  } catch (error) {
    console.error("Load trades error:", error);
    alert("Error loading trades: " + error.message);
  }
}

// ─── SAVE TRADE ───────────────────────────────────────────────
async function saveTrade(data) {
  if (!currentUser) throw new Error("Not logged in");
  const tradesRef = collection(db, "users", currentUser.uid, "trades");

  try {
    if (editingId) {
      const docRef = doc(db, "users", currentUser.uid, "trades", editingId);
      await updateDoc(docRef, data);
      const index = trades.findIndex((t) => t.id === editingId);
      if (index !== -1) trades[index] = { ...trades[index], ...data };
      editingId = null;
      if (saveBtn) saveBtn.textContent = "Save Trade";
      alert("✅ Trade updated!");
    } else {
      const ref = await addDoc(tradesRef, data);
      trades.unshift({ id: ref.id, ...data });
      alert("✅ Trade saved!");
    }
    updateStats();
    updateCharts();
    if (form) form.reset();
    const dateInput = getEl("tradeDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
  } catch (error) {
    console.error("Save error:", error);
    alert("❌ Error saving trade: " + error.message);
  }
}

// ─── DELETE ────────────────────────────────────────────────────
async function deleteTrade(id) {
  if (!confirm("Delete this trade?")) return;
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "trades", id));
    trades = trades.filter((t) => t.id !== id);
    updateStats();
    updateCharts();
    alert("✅ Trade deleted!");
  } catch (error) {
    alert("❌ Error deleting trade: " + error.message);
  }
}

// ─── EDIT ──────────────────────────────────────────────────────
function editTrade(id) {
  const trade = trades.find((t) => t.id === id);
  if (!trade) return;
  editingId = id;
  Object.keys(trade).forEach((key) => {
    const el = getEl(key);
    if (el) el.value = trade[key] ?? "";
  });
  const dateEl = getEl("tradeDate");
  if (dateEl) dateEl.value = trade.tradeDate || "";
  if (saveBtn) saveBtn.textContent = "Update Trade";
  window.scrollTo(0, 0);
}

// ─── STATS ─────────────────────────────────────────────────────
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

  if (totalTrades) totalTrades.textContent = total;
  if (winRate) winRate.textContent = winRateVal.toFixed(1) + "%";
  if (avgRR) avgRR.textContent = avgRRVal.toFixed(2);
  if (netProfit) {
    netProfit.textContent = "$" + profit.toFixed(2);
    netProfit.className = profit >= 0 ? "value-positive" : "value-negative";
  }
  if (wins) wins.textContent = winsCount;
  if (losses) losses.textContent = lossesCount;
  if (consistency) consistency.textContent = consistencyVal.toFixed(1) + "%";
  if (streak) streak.textContent = streakVal;
}

function calculateStreak() {
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].result === "Win") streak++;
    else if (trades[i].result === "Loss") break;
  }
  return streak;
}

// ─── CHARTS ────────────────────────────────────────────────────
function updateCharts() {
  if (typeof Chart === "undefined") return;
  if (!equityCanvas || !monthlyCanvas) return;

  if (window.equityChart && typeof window.equityChart.destroy === "function") {
    window.equityChart.destroy();
    window.equityChart = null;
  }
  if (window.monthlyChart && typeof window.monthlyChart.destroy === "function") {
    window.monthlyChart.destroy();
    window.monthlyChart = null;
  }

  let running = 0;
  const equityData = trades.map((t) => {
    running += parseFloat(t.profit) || 0;
    return running;
  });
  const labels = trades.map((_, i) => i + 1);
  if (equityData.length) {
    window.equityChart = new Chart(equityCanvas, {
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

  const monthly = {};
  trades.forEach((t) => {
    if (!t.tradeDate) return;
    const month = t.tradeDate.substring(0, 7);
    monthly[month] = (monthly[month] || 0) + (parseFloat(t.profit) || 0);
  });
  const monthLabels = Object.keys(monthly).sort();
  if (monthLabels.length) {
    window.monthlyChart = new Chart(monthlyCanvas, {
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

// ─── FORM SUBMIT ──────────────────────────────────────────────
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      tradeDate: getEl("tradeDate")?.value || "",
      tradeTime: getEl("tradeTime")?.value || "",
      pair: getEl("pair")?.value || "",
      direction: getEl("direction")?.value || "",
      session: getEl("session")?.value || "",
      broker: getEl("broker")?.value || "",
      account: getEl("account")?.value || "",
      lotSize: parseFloat(getEl("lotSize")?.value) || 0,
      htfSwing: getEl("htfSwing")?.value || "",
      htfInternal: getEl("htfInternal")?.value || "",
      mtfSwing: getEl("mtfSwing")?.value || "",
      mtfInternal: getEl("mtfInternal")?.value || "",
      ltfStructure: getEl("ltfStructure")?.value || "",
      liquidity: getEl("liquidity")?.value || "",
      poi: getEl("poi")?.value || "",
      entryModel: getEl("entryModel")?.value || "",
      entryConfirmation: getEl("entryConfirmation")?.value || "",
      tradeValid: getEl("tradeValid")?.value || "",
      entryPrice: parseFloat(getEl("entryPrice")?.value) || 0,
      stopLoss: parseFloat(getEl("stopLoss")?.value) || 0,
      takeProfit: parseFloat(getEl("takeProfit")?.value) || 0,
      risk: parseFloat(getEl("risk")?.value) || 0,
      expectedRR: parseFloat(getEl("expectedRR")?.value) || 0,
      actualRR: parseFloat(getEl("actualRR")?.value) || 0,
      commission: parseFloat(getEl("commission")?.value) || 0,
      profit: parseFloat(getEl("profit")?.value) || 0,
      result: getEl("result")?.value || "",
      breakEven: getEl("breakEven")?.value || "",
      partials: getEl("partials")?.value || "",
      trailing: getEl("trailing")?.value || "",
      executionQuality: getEl("executionQuality")?.value || "",
      followedPlan: getEl("followedPlan")?.value || "",
      confidence: getEl("confidence")?.value || "",
      emotion: getEl("emotion")?.value || "",
      discipline: getEl("discipline")?.value || "",
      patience: getEl("patience")?.value || "",
      tradeSummary: getEl("tradeSummary")?.value || "",
      strengths: getEl("strengths")?.value || "",
      mistakes: getEl("mistakes")?.value || "",
      lessonLearned: getEl("lessonLearned")?.value || "",
      improvementPlan: getEl("improvementPlan")?.value || "",
      beforeChart: getEl("beforeChart")?.value || "",
      duringChart: getEl("duringChart")?.value || "",
      afterChart: getEl("afterChart")?.value || "",
      notes: getEl("notes")?.value || "",
    };
    await saveTrade(data);
  });
}

// ─── CANCEL EDIT ──────────────────────────────────────────────
const cancelBtn = getEl("cancelEdit");
if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    editingId = null;
    if (saveBtn) saveBtn.textContent = "Save Trade";
    if (form) form.reset();
    const dateInput = getEl("tradeDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
  });
}