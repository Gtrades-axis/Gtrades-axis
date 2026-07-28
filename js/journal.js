/* ==========================================================
   GTRADES AXIS™ – PROFESSIONAL JOURNAL (FLAT STORAGE)
   ========================================================= */

const STORAGE_KEY = "trades";   // <- same key as History page

let trades = [];

loadTrades();

document.addEventListener("DOMContentLoaded", () => {
    initializeForm();
    loadDashboard();
    loadRecentTrades();
    initializeCharts();
});

/* ==========================================================
   INITIALIZE
   ========================================================= */
function initializeForm() {
    const form = document.getElementById("tradeForm");
    if (!form) return;
    form.addEventListener("submit", saveTrade);
}

/* ==========================================================
   LOCAL STORAGE
   ========================================================= */
function loadTrades() {
    const saved = localStorage.getItem(STORAGE_KEY);
    trades = saved ? JSON.parse(saved) : [];
}

function saveStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

/* ==========================================================
   CREATE TRADE (FLAT + NESTED extras)
   ========================================================= */
function saveTrade(e) {
    e.preventDefault();

    // ---- 1. Flatten all form fields into a single object ----
    const trade = {
        // Core fields (used by History page)
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        date: value("tradeDate"),
        time: value("tradeTime"),
        pair: value("pair"),
        direction: value("direction"),
        session: value("session"),
        broker: value("broker"),
        account: value("account"),
        lotSize: parseFloat(value("lotSize")) || 0,

        // Execution & risk
        entry: parseFloat(value("entryPrice")) || 0,
        stopLoss: parseFloat(value("stopLoss")) || 0,
        takeProfit: parseFloat(value("takeProfit")) || 0,
        risk: parseFloat(value("riskPercent")) || 0,
        rr: parseFloat(value("expectedRR")) || 0,
        profit: parseFloat(value("profit")) || 0,
        commission: parseFloat(value("commission")) || 0,
        result: value("result") || "Pending",   // Win / Loss / Breakeven / Pending

        // Psychology
        confidence: value("confidence"),
        emotion: value("emotion"),
        discipline: value("discipline"),
        patience: value("patience"),

        // Review
        tradeSummary: value("tradeSummary"),
        strengths: value("strengths"),
        mistakes: value("mistakes"),
        lessonLearned: value("lessonLearned"),
        improvementPlan: value("improvementPlan"),

        // Chart links
        beforeChart: value("beforeChart"),
        duringChart: value("duringChart"),
        afterChart: value("afterChart"),

        // Additional notes
        notes: value("notes"),

        // ---- 2. Keep all your detailed analysis as nested objects (for journal use) ----
        htf: {
            swingBias: value("htfSwingBias"),
            swingStructure: value("htfSwingStructure"),
            swingBos: value("htfSwingBos"),
            swingPoi: value("htfSwingPoi"),
            internalBias: value("htfInternalBias"),
            internalStructure: value("htfInternalStructure"),
            internalPoi: value("htfInternalPoi")
        },
        mtf: {
            swingBias: value("mtfSwingBias"),
            swingStructure: value("mtfSwingStructure"),
            swingBos: value("mtfSwingBos"),
            swingPoi: value("mtfSwingPoi"),
            internalBias: value("mtfInternalBias"),
            internalStructure: value("mtfInternalStructure"),
            internalPoi: value("mtfInternalPoi")
        },
        ltf: {
            bias: value("ltfBias"),
            shift: value("ltfShift"),
            liquidity: value("ltfLiquidity"),
            poi: value("ltfPoi"),
            model: value("entryModel"),
            confirmation: value("entryConfirmation"),
            quality: value("executionQuality"),
            valid: value("tradeValid")
        },
        confluences: getConfluences(),

        // Status and timestamps
        status: "Pending",
        created: new Date().toISOString(),
        closed: null,

        // Will be filled on closing
        resultDetails: null,   // { outcome, profit, commission, actualRR }
        management: null,
        psychologyNote: null,
        reviewNote: null
    };

    trades.unshift(trade);
    saveStorage();
    document.getElementById("tradeForm").reset();
    loadDashboard();
    loadRecentTrades();
    initializeCharts();
    alert("✅ Trade saved as Pending.");
}

/* ==========================================================
   HELPERS
   ========================================================= */
function value(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
}

function getConfluences() {
    return {
        htfSwing: checked("confHTFSwing"),
        htfInternal: checked("confHTFInternal"),
        mtfSwing: checked("confMTFSwing"),
        mtfInternal: checked("confMTFInternal"),
        htfDemand: checked("confHTFDemand"),
        htfSupply: checked("confHTFSupply"),
        mtfDemand: checked("confMTFDemand"),
        mtfSupply: checked("confMTFSupply"),
        premium: checked("confPremium"),
        discount: checked("confDiscount"),
        sweep: checked("confSweep"),
        choch: checked("confChoch"),
        bos: checked("confBos"),
        mitigation: checked("confMitigation"),
        refined: checked("confRefined"),
        extreme: checked("confExtreme")
    };
}

function checked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}

/* ==========================================================
   LOAD DASHBOARD (reads flat fields)
   ========================================================= */
function loadDashboard() {
    const closed = trades.filter(t => t.status === "Closed");
    const wins = closed.filter(t => t.result === "Win");
    const losses = closed.filter(t => t.result === "Loss");
    const pending = trades.filter(t => t.status === "Pending");

    const totalTrades = closed.length;
    const totalWins = wins.length;
    const totalLosses = losses.length;
    const winRate = totalTrades === 0 ? 0 : (totalWins / totalTrades) * 100;

    const netProfit = closed.reduce((sum, t) => {
        return sum + (parseFloat(t.profit) || 0) - (parseFloat(t.commission) || 0);
    }, 0);

    const avgRR = totalTrades === 0 ? 0 :
        closed.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / totalTrades;

    setText("totalTrades", totalTrades);
    setText("wins", totalWins);
    setText("losses", totalLosses);
    setText("winRate", winRate.toFixed(1) + "%");
    setText("averageRR", avgRR.toFixed(2));
    setText("netProfit", "$" + netProfit.toFixed(2));
    setText("pendingTrades", pending.length);

    calculatePerformance(closed);
}

/* ==========================================================
   PERFORMANCE (flat fields)
   ========================================================= */
function calculatePerformance(closed) {
    if (closed.length === 0) {
        setText("bestPair", "-");
        setText("worstPair", "-");
        setText("bestSession", "-");
        setText("winStreak", "0");
        return;
    }

    const pairStats = {};
    const sessionStats = {};
    let streak = 0, bestStreak = 0;

    closed.forEach(t => {
        const pair = t.pair || "?";
        const session = t.session || "?";
        const profit = parseFloat(t.profit) || 0;

        pairStats[pair] = (pairStats[pair] || 0) + profit;
        sessionStats[session] = (sessionStats[session] || 0) + profit;

        if (t.result === "Win") {
            streak++;
            if (streak > bestStreak) bestStreak = streak;
        } else {
            streak = 0;
        }
    });

    const bestPair = Object.keys(pairStats).sort((a, b) => pairStats[b] - pairStats[a])[0];
    const worstPair = Object.keys(pairStats).sort((a, b) => pairStats[a] - pairStats[b])[0];
    const bestSession = Object.keys(sessionStats).sort((a, b) => sessionStats[b] - sessionStats[a])[0];

    setText("bestPair", bestPair || "-");
    setText("worstPair", worstPair || "-");
    setText("bestSession", bestSession || "-");
    setText("winStreak", bestStreak);
}

/* ==========================================================
   RECENT TRADES (flat)
   ========================================================= */
function loadRecentTrades() {
    const container = document.getElementById("recentTrades");
    if (!container) return;

    if (trades.length === 0) {
        container.innerHTML = `<div class="loading-card">No trades yet.</div>`;
        return;
    }

    container.innerHTML = "";
    trades.slice(0, 8).forEach(t => {
        container.innerHTML += `
            <div class="trade-row">
                <div><strong>${t.pair || "?"}</strong><br>${t.direction || ""}</div>
                <div>${t.ltf?.model || "-"}</div>
                <div><span class="status ${t.status.toLowerCase()}">${t.status}</span></div>
                <div><button onclick="editTrade('${t.id}')" class="btn">Edit</button></div>
            </div>
        `;
    });
}

/* ==========================================================
   EDIT / CLOSE TRADE (flat fields)
   ========================================================= */
function editTrade(id) {
    const trade = trades.find(t => t.id === id);
    if (!trade) return;

    if (trade.status === "Closed") {
        viewTrade(trade);
        return;
    }

    const outcome = prompt("Result?\n\nWin\nLoss\nBreakeven");
    if (!outcome) return;

    const profit = parseFloat(prompt("Profit/Loss ($)", 0)) || 0;
    const commission = parseFloat(prompt("Commission ($)", 0)) || 0;
    const rr = parseFloat(prompt("Actual RR", 0)) || 0;
    const management = prompt("Management Quality\nExcellent\nGood\nAverage\nPoor");
    const psych = prompt("Psychology Notes");
    const lesson = prompt("Lesson Learned");
    const improvement = prompt("Improvement");

    // Update flat fields
    trade.status = "Closed";
    trade.closed = new Date().toISOString();
    trade.result = outcome;
    trade.profit = profit;
    trade.commission = commission;
    trade.rr = rr;
    trade.management = management;
    trade.psychologyNote = psych;
    trade.reviewNote = { lesson, improvement };

    // Also keep a resultDetails object for backward compatibility
    trade.resultDetails = { outcome, profit, commission, actualRR: rr };

    saveStorage();
    loadDashboard();
    loadRecentTrades();
    initializeCharts();
    alert("✅ Trade closed successfully.");
}

/* ==========================================================
   VIEW TRADE
   ========================================================= */
function viewTrade(trade) {
    alert(`
PAIR        : ${trade.pair}
STATUS      : ${trade.status}
RESULT      : ${trade.result}
PROFIT      : $${trade.profit}
RR          : ${trade.rr}
LESSON      : ${trade.reviewNote?.lesson || "-"}
IMPROVEMENT : ${trade.reviewNote?.improvement || "-"}
    `);
}

/* ==========================================================
   CHARTS (uses flat fields)
   ========================================================= */
function initializeCharts() {
    if (typeof Chart === "undefined") return;
    buildEquityChart();
    buildMonthlyChart();
}

function buildEquityChart() {
    const canvas = document.getElementById("equityChart");
    if (!canvas) return;

    const closed = trades.filter(t => t.status === "Closed");
    let balance = 0;
    const data = [];
    closed.forEach(t => {
        balance += (parseFloat(t.profit) || 0) - (parseFloat(t.commission) || 0);
        data.push(balance);
    });

    new Chart(canvas, {
        type: "line",
        data: {
            labels: data.map((_, i) => i + 1),
            datasets: [{ label: "Equity", data }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildMonthlyChart() {
    const canvas = document.getElementById("monthlyChart");
    if (!canvas) return;

    const monthly = {};
    trades.filter(t => t.status === "Closed").forEach(t => {
        const month = new Date(t.closed).toLocaleString("default", { month: "short" });
        monthly[month] = (monthly[month] || 0) + (parseFloat(t.profit) || 0) - (parseFloat(t.commission) || 0);
    });

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: Object.keys(monthly),
            datasets: [{ label: "Monthly P&L", data: Object.values(monthly) }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

/* ==========================================================
   UTILITY
   ========================================================= */
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

/* ==========================================================
   END
   ========================================================= */