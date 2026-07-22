// ==========================================================
// GTRADES-AXIS™ ANALYTICS V3 - FIRESTORE (TOP-LEVEL)
// ==========================================================

import { db, auth } from "../firebase.js";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let trades = [];
let charts = {};
let currentUser = null;
let analyticsLoaded = false;

// DOM Elements (existing IDs – keep your HTML)
const totalTradesCard = document.getElementById("totalTrades");
const totalProfitCard = document.getElementById("totalProfit");
const totalLossCard = document.getElementById("totalLoss");
const netProfitCard = document.getElementById("netProfit");
const winRateCard = document.getElementById("winRate");
const profitFactorCard = document.getElementById("profitFactor");
const expectancyCard = document.getElementById("expectancy");
const avgWinCard = document.getElementById("averageWin");
const avgLossCard = document.getElementById("averageLoss");
const bestPairCard = document.getElementById("bestPair");
const bestSessionCard = document.getElementById("bestSession");
const drawdownCard = document.getElementById("maxDrawdown");
const streakCard = document.getElementById("currentStreak");
const consistencyCard = document.getElementById("consistencyScore");
const riskCard = document.getElementById("riskScore");

const equityCanvas = document.getElementById("equityChart");
const pairCanvas = document.getElementById("pairChart");
const sessionCanvas = document.getElementById("sessionChart");
const monthlyCanvas = document.getElementById("monthlyChart");
const weekdayCanvas = document.getElementById("weekdayChart");
const hourCanvas = document.getElementById("hourChart");
const rrCanvas = document.getElementById("rrChart");

// ─── AUTH ──────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "login.html"; return; }
    currentUser = user;
    loadTradesRealtime();
});

// ─── REAL-TIME FIRESTORE (top‑level trades) ──────────────────
function loadTradesRealtime() {
    const tradesRef = collection(db, "trades");
    const q = query(
        tradesRef,
        where("userId", "==", currentUser.uid),
        orderBy("tradeDate", "asc")
    );

    onSnapshot(q, (snapshot) => {
        trades = [];
        snapshot.forEach((doc) => {
            trades.push({ id: doc.id, ...doc.data() });
        });
        console.log(`📊 Analytics: ${trades.length} trades loaded`);
        refreshAnalytics();
    });
}

// ─── MASTER REFRESH ────────────────────────────────────────────
function refreshAnalytics() {
    if (!analyticsLoaded) {
        initializeCharts();
        analyticsLoaded = true;
    }
    calculateOverview();
    calculatePerformance();
    calculateSessions();
    calculatePairs();
    calculateMonthly();
    calculateWeekdays();
    calculateHours();
    calculateRisk();
    calculateExpectancy();
    calculateConsistency();
    calculateDrawdown();
    calculateStreak();
    updateCharts();
    buildAIInsights();
    generateTradingGrade();
    updateTradingReport();
    updateDashboardCards();
    finalizeAnalytics();
}

// ─── STATS ENGINE ──────────────────────────────────────────────
let stats = {};

function calculateOverview() {
    stats = {
        totalTrades: trades.length,
        wins: 0,
        losses: 0,
        breakeven: 0,
        grossProfit: 0,
        grossLoss: 0,
        netProfit: 0,
        winRate: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        expectancy: 0,
        largestWin: 0,
        largestLoss: 0,
        equity: [],
        runningBalance: 0
    };

    trades.forEach(trade => {
        const pnl = Number(trade.profit ?? trade.pnl ?? trade.net ?? 0);
        stats.runningBalance += pnl;
        stats.equity.push(stats.runningBalance);
        if (pnl > 0) {
            stats.wins++;
            stats.grossProfit += pnl;
            if (pnl > stats.largestWin) stats.largestWin = pnl;
        } else if (pnl < 0) {
            stats.losses++;
            stats.grossLoss += Math.abs(pnl);
            if (Math.abs(pnl) > Math.abs(stats.largestLoss)) stats.largestLoss = pnl;
        } else {
            stats.breakeven++;
        }
    });

    stats.netProfit = stats.grossProfit - stats.grossLoss;
    if (stats.totalTrades > 0) stats.winRate = (stats.wins / stats.totalTrades) * 100;
    stats.profitFactor = stats.grossLoss > 0 ? stats.grossProfit / stats.grossLoss : stats.grossProfit;
    stats.averageWin = stats.wins > 0 ? stats.grossProfit / stats.wins : 0;
    stats.averageLoss = stats.losses > 0 ? stats.grossLoss / stats.losses : 0;
    stats.expectancy = ((stats.winRate / 100) * stats.averageWin) - (((100 - stats.winRate) / 100) * stats.averageLoss);
}

function calculateDrawdown() {
    let peak = 0, drawdown = 0, maxDrawdown = 0;
    stats.equity.forEach(balance => {
        if (balance > peak) peak = balance;
        drawdown = peak - balance;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    stats.maxDrawdown = maxDrawdown;
    if (drawdownCard) drawdownCard.textContent = "$" + maxDrawdown.toFixed(2);
}

function calculateStreak() {
    let current = 0, longestWin = 0, longestLoss = 0, currentType = "";
    trades.forEach(trade => {
        const pnl = Number(trade.profit ?? 0);
        if (pnl > 0) {
            if (currentType === "win") current++; else { current = 1; currentType = "win"; }
            if (current > longestWin) longestWin = current;
        } else if (pnl < 0) {
            if (currentType === "loss") current++; else { current = 1; currentType = "loss"; }
            if (current > longestLoss) longestLoss = current;
        }
    });
    stats.longestWinStreak = longestWin;
    stats.longestLossStreak = longestLoss;
    if (streakCard) streakCard.innerHTML = longestWin + "W / " + longestLoss + "L";
}

function calculateConsistency() {
    if (trades.length === 0) { stats.consistency = 0; if (consistencyCard) consistencyCard.textContent = "0%"; return; }
    let score = 100;
    if (stats.winRate < 60) score -= 20;
    if (stats.maxDrawdown > stats.grossProfit * 0.50) score -= 20;
    if (stats.longestLossStreak >= 4) score -= 20;
    if (stats.profitFactor < 1.5) score -= 20;
    if (stats.expectancy < 0) score -= 20;
    score = Math.max(0, score);
    stats.consistency = score;
    if (consistencyCard) consistencyCard.textContent = score + "%";
}

function calculateRisk() {
    if (trades.length === 0) { stats.risk = 0; if (riskCard) riskCard.textContent = "--"; return; }
    let risky = 0;
    trades.forEach(trade => {
        const pnl = Number(trade.profit ?? 0);
        const rr = Number(trade.actualRR ?? trade.rr ?? 0);
        if (pnl < 0) risky++;
        if (rr < 1) risky++;
        if (Math.abs(pnl) > stats.averageLoss * 2) risky++;
    });
    let score = 100 - ((risky / (trades.length * 3)) * 100);
    score = Math.max(0, Math.min(100, score));
    stats.risk = score;
    if (riskCard) riskCard.textContent = score.toFixed(0) + "%";
}

function calculateMonthly() {
    stats.monthly = {};
    trades.forEach(trade => {
        if (!trade.tradeDate) return;
        const month = new Date(trade.tradeDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
        stats.monthly[month] = (stats.monthly[month] || 0) + Number(trade.profit ?? 0);
    });
}

function calculatePairs() {
    stats.pairs = {};
    trades.forEach(trade => {
        const pair = trade.pair || "Unknown";
        if (!stats.pairs[pair]) stats.pairs[pair] = { profit: 0, trades: 0 };
        stats.pairs[pair].profit += Number(trade.profit ?? 0);
        stats.pairs[pair].trades++;
    });
    let best = "", highest = -999999;
    Object.keys(stats.pairs).forEach(pair => {
        if (stats.pairs[pair].profit > highest) { highest = stats.pairs[pair].profit; best = pair; }
    });
    if (bestPairCard) bestPairCard.textContent = best;
}

function calculateSessions() {
    stats.sessions = {};
    trades.forEach(trade => {
        const session = trade.session || "Unknown";
        stats.sessions[session] = (stats.sessions[session] || 0) + Number(trade.profit ?? 0);
    });
    let best = "", highest = -999999;
    Object.keys(stats.sessions).forEach(session => {
        if (stats.sessions[session] > highest) { highest = stats.sessions[session]; best = session; }
    });
    if (bestSessionCard) bestSessionCard.textContent = best;
}

function calculateWeekdays() {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const totals = new Array(7).fill(0);
    trades.forEach(trade => {
        if (!trade.tradeDate) return;
        const day = new Date(trade.tradeDate).getDay();
        totals[day] += Number(trade.profit ?? 0);
    });
    stats.weekdays = totals;
}

function calculateHours() {
    const totals = {};
    for (let i = 0; i < 24; i++) totals[i] = 0;
    trades.forEach(trade => {
        if (!trade.tradeDate) return;
        const hour = new Date(trade.tradeDate).getHours();
        totals[hour] += Number(trade.profit ?? 0);
    });
    stats.hours = totals;
}

// ─── UPDATE DASHBOARD CARDS ────────────────────────────────────
function updateDashboardCards() {
    if (totalTradesCard) totalTradesCard.textContent = stats.totalTrades;
    if (totalProfitCard) totalProfitCard.textContent = "$" + stats.grossProfit.toFixed(2);
    if (totalLossCard) totalLossCard.textContent = "$" + stats.grossLoss.toFixed(2);
    if (netProfitCard) {
        netProfitCard.textContent = "$" + stats.netProfit.toFixed(2);
        netProfitCard.classList.remove("positive", "negative");
        netProfitCard.classList.add(stats.netProfit >= 0 ? "positive" : "negative");
    }
    if (winRateCard) winRateCard.textContent = stats.winRate.toFixed(1) + "%";
    if (profitFactorCard) profitFactorCard.textContent = stats.profitFactor.toFixed(2);
    if (expectancyCard) expectancyCard.textContent = "$" + stats.expectancy.toFixed(2);
    if (avgWinCard) avgWinCard.textContent = "$" + stats.averageWin.toFixed(2);
    if (avgLossCard) avgLossCard.textContent = "$" + stats.averageLoss.toFixed(2);
    if (drawdownCard) drawdownCard.textContent = "$" + stats.maxDrawdown.toFixed(2);
    if (streakCard) streakCard.textContent = stats.longestWinStreak + "W / " + stats.longestLossStreak + "L";
    if (consistencyCard) consistencyCard.textContent = stats.consistency.toFixed(0) + "%";
    if (riskCard) riskCard.textContent = stats.risk.toFixed(0) + "%";
}

// ─── CHART INITIALIZATION ──────────────────────────────────────
function initializeCharts() {
    if (!equityCanvas || !pairCanvas || !sessionCanvas || !monthlyCanvas || !weekdayCanvas || !hourCanvas || !rrCanvas) {
        console.warn("Some chart canvases missing – check HTML");
        return;
    }
    charts.equity = new Chart(equityCanvas, { type: "line", data: { labels: [], datasets: [{ label: "Equity", data: [], borderColor: "#0f8cff", backgroundColor: "rgba(15,140,255,0.15)", fill: true, tension: 0.35 }] }, options: chartOptions() });
    charts.pairs = new Chart(pairCanvas, { type: "bar", data: { labels: [], datasets: [{ label: "Profit", data: [], backgroundColor: "#0f8cff", borderRadius: 6 }] }, options: chartOptions() });
    charts.sessions = new Chart(sessionCanvas, { type: "doughnut", data: { labels: [], datasets: [{ data: [], backgroundColor: ["#0f8cff", "#00c853", "#ffb300", "#ff4d4f", "#9c27b0"] }] }, options: pieOptions() });
    charts.monthly = new Chart(monthlyCanvas, { type: "bar", data: { labels: [], datasets: [{ label: "Monthly Profit", data: [], backgroundColor: "#0f8cff", borderRadius: 6 }] }, options: chartOptions() });
    charts.weekdays = new Chart(weekdayCanvas, { type: "bar", data: { labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], datasets: [{ label: "Profit by Day", data: [], backgroundColor: "#0f8cff", borderRadius: 6 }] }, options: chartOptions() });
    charts.hours = new Chart(hourCanvas, { type: "line", data: { labels: Array.from({ length: 24 }, (_, i) => i + ":00"), datasets: [{ label: "Profit by Hour", data: [], borderColor: "#0f8cff", fill: true, tension: 0.35 }] }, options: chartOptions() });
    charts.rr = new Chart(rrCanvas, { type: "scatter", data: { datasets: [{ label: "RR Distribution", data: [], backgroundColor: "#0f8cff" }] }, options: chartOptions() });
}

function chartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#94a3b8", font: { size: 10 } } } },
        scales: { x: { ticks: { color: "#94a3b8", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.05)" } }, y: { ticks: { color: "#94a3b8", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.05)" } } } }
    };
}
function pieOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: "#94a3b8", padding: 10, font: { size: 10 } } } }
    };
}

// ─── UPDATE ALL CHARTS ──────────────────────────────────────────
function updateCharts() {
    if (!charts.equity) return;
    // equity
    charts.equity.data.labels = trades.map((_, i) => i + 1);
    charts.equity.data.datasets[0].data = stats.equity;
    charts.equity.update();

    // pairs
    const pairLabels = Object.keys(stats.pairs);
    const pairValues = pairLabels.map(p => stats.pairs[p].profit);
    charts.pairs.data.labels = pairLabels;
    charts.pairs.data.datasets[0].data = pairValues;
    charts.pairs.update();

    // sessions
    const sessionLabels = Object.keys(stats.sessions);
    const sessionValues = sessionLabels.map(s => stats.sessions[s]);
    charts.sessions.data.labels = sessionLabels;
    charts.sessions.data.datasets[0].data = sessionValues;
    charts.sessions.update();

    // monthly
    const monthLabels = Object.keys(stats.monthly);
    const monthValues = monthLabels.map(m => stats.monthly[m]);
    charts.monthly.data.labels = monthLabels;
    charts.monthly.data.datasets[0].data = monthValues;
    charts.monthly.update();

    // weekdays
    charts.weekdays.data.datasets[0].data = stats.weekdays || new Array(7).fill(0);
    charts.weekdays.update();

    // hours
    if (stats.hours) {
        charts.hours.data.datasets[0].data = Object.values(stats.hours);
        charts.hours.update();
    }

    // rr (scatter)
    const rrPoints = trades.map(t => ({ x: t.id || 0, y: Number(t.actualRR ?? t.rr ?? 0) }));
    charts.rr.data.datasets[0].data = rrPoints;
    charts.rr.update();
}

// ─── AI INSIGHTS ──────────────────────────────────────────────
function buildAIInsights() {
    const container = document.getElementById("aiInsights");
    if (!container) return;
    if (trades.length === 0) {
        container.innerHTML = `<div class="ai-card"><h3>🤖 AI Coach</h3><p>No trades available.</p><small>Start journaling to unlock insights.</small></div>`;
        return;
    }
    const insights = [];
    // win rate
    if (stats.winRate >= 70) insights.push({ type: "success", title: "Excellent Win Rate", message: "Your win rate is above 70%. Continue following your trading plan." });
    else if (stats.winRate >= 60) insights.push({ type: "good", title: "Healthy Win Rate", message: "Your trading performance is consistent. Focus on protecting profits." });
    else if (stats.winRate >= 50) insights.push({ type: "warning", title: "Average Win Rate", message: "Improve trade selection and avoid forcing setups." });
    else insights.push({ type: "danger", title: "Low Win Rate", message: "Reduce trading frequency and wait for higher probability setups." });
    // profit factor
    if (stats.profitFactor >= 2) insights.push({ type: "success", title: "Strong Profit Factor", message: "Your winners significantly outweigh your losers." });
    else if (stats.profitFactor >= 1.5) insights.push({ type: "good", title: "Good Profit Factor", message: "Maintain discipline and avoid unnecessary losses." });
    else if (stats.profitFactor >= 1) insights.push({ type: "warning", title: "Profit Factor Needs Improvement", message: "Small improvements in risk management could greatly improve profitability." });
    else insights.push({ type: "danger", title: "Negative Edge", message: "Your losses currently outweigh your gains." });
    // consistency
    if (stats.consistency >= 80) insights.push({ type: "success", title: "Professional Consistency", message: "Excellent trading discipline." });
    else if (stats.consistency >= 60) insights.push({ type: "good", title: "Consistent Trading", message: "Minor improvements could produce outstanding results." });
    else insights.push({ type: "warning", title: "Inconsistent Performance", message: "Focus on executing only your highest quality setups." });
    // drawdown
    if (stats.maxDrawdown > stats.grossProfit * 0.50) insights.push({ type: "danger", title: "High Drawdown", message: "Reduce risk per trade until consistency improves." });

    container.innerHTML = insights.map(item =>
        `<div class="ai-card ${item.type}"><h4>${item.title}</h4><p>${item.message}</p></div>`
    ).join("");
}

// ─── TRADING GRADE ─────────────────────────────────────────────
function generateTradingGrade() {
    let score = 0;
    if (stats.winRate >= 70) score += 25; else if (stats.winRate >= 60) score += 20; else if (stats.winRate >= 50) score += 15; else if (stats.winRate >= 40) score += 10;
    if (stats.profitFactor >= 2.5) score += 25; else if (stats.profitFactor >= 2) score += 22; else if (stats.profitFactor >= 1.5) score += 18; else if (stats.profitFactor >= 1) score += 10;
    if (stats.expectancy > 0) score += 15;
    score += Math.min(20, Math.round(stats.consistency / 5));
    if (stats.maxDrawdown <= 2) score += 15; else if (stats.maxDrawdown <= 5) score += 12; else if (stats.maxDrawdown <= 10) score += 8; else score += 3;
    stats.gradeScore = score;
    stats.grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F";
}

function updateTradingReport() {
    const grade = document.getElementById("tradingGrade");
    const score = document.getElementById("gradeScore");
    const summary = document.getElementById("tradeSummary");
    if (grade) grade.textContent = stats.grade;
    if (score) score.textContent = stats.gradeScore + "/100";
    if (summary) {
        const message = {
            "A+": "Outstanding performance. Excellent discipline and consistency.",
            "A": "Excellent trader. Small improvements can push you to professional level.",
            "B": "Very good. Focus on risk management and avoiding unnecessary trades.",
            "C": "Average. Your strategy has potential but execution needs work.",
            "D": "Below average. Review your journal and reduce trading frequency.",
            "F": "No measurable edge. Return to demo or reduce risk while refining your strategy."
        }[stats.grade] || "Review your trading plan.";
        summary.innerHTML = `<strong>Overall Assessment</strong><br><br>${message}<hr><strong>AI Recommendations</strong><ul><li>✔ Continue journaling every trade.</li><li>✔ Review screenshots before every session.</li><li>✔ Trade only your proven setups.</li><li>✔ Maintain consistent risk.</li><li>✔ Review your losing trades weekly.</li></ul>`;
    }
}

// ─── FINALIZE ──────────────────────────────────────────────────
function finalizeAnalytics() {
    if (trades.length === 0) {
        document.querySelectorAll(".stat-value").forEach(card => { if (card) card.textContent = "--"; });
        const ai = document.getElementById("aiInsights");
        if (ai) ai.innerHTML = `<div class="ai-card info"><h3>Welcome to GTRADES-AXIS™ Analytics</h3><p>Your analytics dashboard becomes fully active after you journal your first trade.</p></div>`;
    }
    const sync = document.getElementById("syncStatus");
    if (sync) sync.innerHTML = `<i class="fa-solid fa-circle-check"></i> Synced ${new Date().toLocaleTimeString()}`;
}

// ─── EXPORT FUNCTIONS ──────────────────────────────────────────
function exportCSV() {
    if (trades.length === 0) return alert("No trades to export.");
    const headers = ["Date", "Pair", "Direction", "Session", "Entry", "Stop Loss", "Take Profit", "RR", "Lot Size", "Profit", "Result", "Notes"];
    let csv = headers.join(",") + "\n";
    trades.forEach(t => {
        csv += [t.tradeDate || "", t.pair || "", t.direction || "", t.session || "", t.entryPrice || "", t.stopLoss || "", t.takeProfit || "", t.actualRR || 0, t.lotSize || 0, t.profit || 0, t.result || "", `"${t.notes || ""}"`].join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GTRADES_Trades.csv";
    a.click();
    URL.revokeObjectURL(url);
}
function exportJSON() {
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GTRADES_Trades.json";
    a.click();
    URL.revokeObjectURL(url);
}
function printAnalytics() { window.print(); }
function exportSummary() {
    const report = `
==============================
GTRADES-AXIS ANALYTICS REPORT
==============================
Total Trades   : ${stats.totalTrades}
Wins           : ${stats.wins}
Losses         : ${stats.losses}
Win Rate       : ${stats.winRate.toFixed(2)}%
Gross Profit   : $${stats.grossProfit.toFixed(2)}
Gross Loss     : $${stats.grossLoss.toFixed(2)}
Net Profit     : $${stats.netProfit.toFixed(2)}
Profit Factor  : ${stats.profitFactor.toFixed(2)}
Average Win    : $${stats.averageWin.toFixed(2)}
Average Loss   : $${stats.averageLoss.toFixed(2)}
Expectancy     : $${stats.expectancy.toFixed(2)}
Largest Win    : $${stats.largestWin.toFixed(2)}
Largest Loss   : $${stats.largestLoss.toFixed(2)}
Max Drawdown   : $${stats.maxDrawdown.toFixed(2)}
Consistency    : ${stats.consistency.toFixed(0)}%
Risk Score     : ${stats.risk.toFixed(0)}%
Grade          : ${stats.grade}
==============================
Generated by GTRADES-AXIS™
`;
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Trading_Report.txt";
    a.click();
    URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("exportCSV")?.addEventListener("click", exportCSV);
    document.getElementById("exportJSON")?.addEventListener("click", exportJSON);
    document.getElementById("printReport")?.addEventListener("click", printAnalytics);
    document.getElementById("exportSummary")?.addEventListener("click", exportSummary);
});

console.log("✅ GTRADES-AXIS Analytics Engine Ready");