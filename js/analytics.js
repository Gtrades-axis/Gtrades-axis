// ======================================================
// GTRADES-AXIS™
// ANALYTICS ENGINE V4
// PART 1
// ANALYTICS ENGINE V5
// Fully modular with Firebase support
// ======================================================

"use strict";

// ======================================================
// STORAGE
// CONFIGURATION
// ======================================================

const STORAGE_KEY = "gtradesJournal";

let trades = [];
const CONFIG = {
    STORAGE_KEY: "gtradesJournal",
    USE_FIREBASE: false, // Set to true when Firebase is ready
};

// ======================================================
// CHART REFERENCES
// STATE
// ======================================================

let charts = {
    equity: null,
    monthly: null,
    pair: null,
    session: null,
    model: null,
    result: null,
    psychology: null,
    htf: null,
    mtf: null,
    monthlyWin: null
};
let trades = [];
let charts = {};

// ======================================================
// INITIALIZE
// DOM READY
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    loadTrades();

    updateOverview();

    updatePerformanceCards();

    buildCharts();

    buildInsights();

document.addEventListener("DOMContentLoaded", async () => {
    await loadTrades();
    renderAll();
});

// ======================================================
// LOAD TRADES
// ======================================================

function loadTrades() {

async function loadTrades() {
try {

        const stored = localStorage.getItem(STORAGE_KEY);

        trades = stored ? JSON.parse(stored) : [];

        if (!Array.isArray(trades)) {

            trades = [];

        if (CONFIG.USE_FIREBASE) {
            // Firebase version - uncomment when ready
            // trades = await fetchTradesFromFirebase();
        } else {
            // LocalStorage version
            const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
            trades = stored ? JSON.parse(stored) : [];
            
            // If empty, load sample data
            if (!trades || trades.length === 0) {
                trades = getSampleData();
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(trades));
            }
}

        
        if (!Array.isArray(trades)) trades = [];
        
} catch (err) {

console.error("Analytics Load Error:", err);

        trades = [];

        trades = getSampleData();
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(trades));
}

}

// ======================================================
// HELPERS
// SAMPLE DATA
// ======================================================

function num(value) {

    const n = Number(value);
function getSampleData() {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    
    return [
        { id: '1', tradeDate: `${y}-${m}-01`, pair: 'EURUSD', direction: 'BUY', session: 'London', result: 'Win', profit: 120.50, actualRR: 2.3, entryModel: 'LC-2A', emotion: 'Calm', htfSwing: 'Bullish', mtfSwing: 'Bullish' },
        { id: '2', tradeDate: `${y}-${m}-03`, pair: 'GBPUSD', direction: 'SELL', session: 'New York', result: 'Loss', profit: -85.20, actualRR: -1.2, entryModel: 'LC-1', emotion: 'Fear', htfSwing: 'Bearish', mtfSwing: 'Bearish' },
        { id: '3', tradeDate: `${y}-${m}-05`, pair: 'XAUUSD', direction: 'BUY', session: 'Asian', result: 'Win', profit: 210.00, actualRR: 3.1, entryModel: 'LTF RE', emotion: 'Confident', htfSwing: 'Bullish', mtfSwing: 'Bullish' },
        { id: '4', tradeDate: `${y}-${m}-08`, pair: 'EURUSD', direction: 'SELL', session: 'London', result: 'Break Even', profit: 0.00, actualRR: 0.0, entryModel: 'LC-2A', emotion: 'Calm', htfSwing: 'Bearish', mtfSwing: 'Bearish' },
        { id: '5', tradeDate: `${y}-${m}-10`, pair: 'GBPJPY', direction: 'BUY', session: 'London + NY', result: 'Win', profit: 185.75, actualRR: 2.8, entryModel: 'MTF RE', emotion: 'Calm', htfSwing: 'Bullish', mtfSwing: 'Bullish' },
        { id: '6', tradeDate: `${y}-${m}-12`, pair: 'XAUUSD', direction: 'SELL', session: 'New York', result: 'Loss', profit: -60.30, actualRR: -0.8, entryModel: 'LC-1', emotion: 'FOMO', htfSwing: 'Bearish', mtfSwing: 'Bearish' },
    ];
}

    return isNaN(n) ? 0 : n;
// ======================================================
// RENDER ALL
// ======================================================

function renderAll() {
    updateStats();
    updatePerformance();
    buildCharts();
    buildInsights();
}

function setText(id, value) {
// ======================================================
// HELPERS
// ======================================================

    const el = document.getElementById(id);
function num(v) { return isNaN(Number(v)) ? 0 : Number(v); }

function setText(id, value) {
    const el = document.getElementById(id);
if (el) el.textContent = value;

}

function destroyChart(chart) {

    if (chart) chart.destroy();

function destroyChart(key) {
    if (charts[key]) {
        try { charts[key].destroy(); } catch(e) {}
        charts[key] = null;
    }
}

// ======================================================
// OVERVIEW
// UPDATE STATS
// ======================================================

function updateOverview() {

    const totalTrades = trades.length;

function updateStats() {
    const total = trades.length;
const wins = trades.filter(t => t.result === "Win").length;

const losses = trades.filter(t => t.result === "Loss").length;

    let grossProfit = 0;

    let grossLoss = 0;

    let totalRR = 0;

    trades.forEach(trade => {

        const profit = num(trade.profit);

        totalRR += num(trade.actualRR);

        if (profit >= 0) {

            grossProfit += profit;

        } else {

            grossLoss += Math.abs(profit);

        }

    const be = trades.filter(t => t.result === "Break Even").length;
    
    let grossProfit = 0, grossLoss = 0, totalRR = 0;
    trades.forEach(t => {
        const p = num(t.profit);
        totalRR += num(t.actualRR);
        p >= 0 ? grossProfit += p : grossLoss += Math.abs(p);
});

    const netProfit = grossProfit - grossLoss;

    const winRate = totalTrades
        ? ((wins / totalTrades) * 100).toFixed(1)
        : "0";

    const averageRR = totalTrades
        ? (totalRR / totalTrades).toFixed(2)
        : "0";

    const profitFactor = grossLoss
        ? (grossProfit / grossLoss).toFixed(2)
        : grossProfit.toFixed(2);

    const expectancy = totalTrades
        ? (netProfit / totalTrades).toFixed(2)
        : "0";

    const averageWin = wins
        ? (grossProfit / wins).toFixed(2)
        : "0";

    const averageLoss = losses
        ? (grossLoss / losses).toFixed(2)
        : "0";

    setText("totalTrades", totalTrades);

    setText("winRate", winRate + "%");

    setText("averageRR", averageRR);

    setText("netProfit", "$" + netProfit.toFixed(2));

    setText("profitFactor", profitFactor);

    setText("expectancy", "$" + expectancy);

    setText("averageWin", "$" + averageWin);

    setText("averageLoss", "$" + averageLoss);

    
    const net = grossProfit - grossLoss;
    const winRate = total ? (wins / total) * 100 : 0;
    const avgRR = total ? totalRR / total : 0;
    const pf = grossLoss ? grossProfit / grossLoss : (grossProfit > 0 ? grossProfit : 0);
    const expectancy = total ? net / total : 0;
    const avgWin = wins ? grossProfit / wins : 0;
    const avgLoss = losses ? grossLoss / losses : 0;
    
    // Overview stats
    setText("totalTrades", total);
    setText("winRate", winRate.toFixed(1) + "%");
    setText("averageRR", avgRR.toFixed(2));
    setText("netProfit", "$" + net.toFixed(2));
    setText("profitFactor", pf.toFixed(2));
    setText("expectancy", "$" + expectancy.toFixed(2));
    setText("averageWin", "$" + avgWin.toFixed(2));
    setText("averageLoss", "$" + avgLoss.toFixed(2));
    
    // Color net profit
    const netEl = document.getElementById("netProfit");
    if (netEl) {
        netEl.className = "stat-value " + (net >= 0 ? "positive" : "negative");
    }
}

// ======================================================
// PERFORMANCE ANALYSIS
// PART 2
// UPDATE PERFORMANCE
// ======================================================

function updatePerformanceCards() {

function updatePerformance() {
const pairStats = {};
const sessionStats = {};
const modelStats = {};
const htfStats = {};
const mtfStats = {};
    const psychologyStats = {};

    trades.forEach(trade => {

        // ==========================
        // PAIRS
        // ==========================

        if (!pairStats[trade.pair]) {

            pairStats[trade.pair] = {
                trades: 0,
                profit: 0,
                wins: 0
            };

        }

        pairStats[trade.pair].trades++;
        pairStats[trade.pair].profit += num(trade.profit);

        if (trade.result === "Win") {

            pairStats[trade.pair].wins++;

        }

        // ==========================
        // SESSION
        // ==========================

        if (!sessionStats[trade.session]) {

            sessionStats[trade.session] = {
                trades: 0,
                profit: 0,
                wins: 0
            };

        }

        sessionStats[trade.session].trades++;
        sessionStats[trade.session].profit += num(trade.profit);

        if (trade.result === "Win") {

            sessionStats[trade.session].wins++;

        }

        // ==========================
        // ENTRY MODEL
        // ==========================

        if (!modelStats[trade.entryModel]) {

            modelStats[trade.entryModel] = {
                trades: 0,
                wins: 0
            };

        }

        modelStats[trade.entryModel].trades++;

        if (trade.result === "Win") {

            modelStats[trade.entryModel].wins++;

        }

        // ==========================
        // HTF
        // ==========================

        if (!htfStats[trade.htfSwing]) {

            htfStats[trade.htfSwing] = 0;

        }

        htfStats[trade.htfSwing]++;

        // ==========================
        // MTF
        // ==========================

        if (!mtfStats[trade.mtfSwing]) {

            mtfStats[trade.mtfSwing] = 0;

        }

        mtfStats[trade.mtfSwing]++;

        // ==========================
        // PSYCHOLOGY
        // ==========================

        if (!psychologyStats[trade.emotion]) {

            psychologyStats[trade.emotion] = 0;

        }

        psychologyStats[trade.emotion]++;

    const psychStats = {};
    
    trades.forEach(t => {
        const pair = t.pair || "Unknown";
        if (!pairStats[pair]) pairStats[pair] = { trades: 0, profit: 0, wins: 0 };
        pairStats[pair].trades++;
        pairStats[pair].profit += num(t.profit);
        if (t.result === "Win") pairStats[pair].wins++;
        
        const session = t.session || "Unknown";
        if (!sessionStats[session]) sessionStats[session] = { trades: 0, profit: 0, wins: 0 };
        sessionStats[session].trades++;
        sessionStats[session].profit += num(t.profit);
        if (t.result === "Win") sessionStats[session].wins++;
        
        const model = t.entryModel || "Unknown";
        if (!modelStats[model]) modelStats[model] = { trades: 0, wins: 0 };
        modelStats[model].trades++;
        if (t.result === "Win") modelStats[model].wins++;
        
        const htf = t.htfSwing || "Unknown";
        htfStats[htf] = (htfStats[htf] || 0) + 1;
        
        const mtf = t.mtfSwing || "Unknown";
        mtfStats[mtf] = (mtfStats[mtf] || 0) + 1;
        
        const emotion = t.emotion || "Unknown";
        psychStats[emotion] = (psychStats[emotion] || 0) + 1;
});

    // ======================================================
    // BEST PAIR
    // ======================================================

    let bestPair = "-";
    let bestPairProfit = -999999;

    let worstPair = "-";
    let worstPairProfit = 999999;

    Object.entries(pairStats).forEach(([pair, data]) => {

        if (data.profit > bestPairProfit) {

            bestPair = pair;
            bestPairProfit = data.profit;

        }

        if (data.profit < worstPairProfit) {

            worstPair = pair;
            worstPairProfit = data.profit;

        }

    
    // Best / Worst Pair
    let bestPair = "-", bestProfit = -Infinity;
    let worstPair = "-", worstProfit = Infinity;
    Object.entries(pairStats).forEach(([p, d]) => {
        if (d.profit > bestProfit) { bestProfit = d.profit; bestPair = p; }
        if (d.profit < worstProfit) { worstProfit = d.profit; worstPair = p; }
});

setText("bestPair", bestPair);
    setText("bestPairProfit", "$" + bestPairProfit.toFixed(2));

    setText("bestPairProfit", "$" + (bestProfit === -Infinity ? 0 : bestProfit).toFixed(2));
setText("worstPair", worstPair);
    setText("worstPairProfit", "$" + worstPairProfit.toFixed(2));

    // ======================================================
    // BEST SESSION
    // ======================================================

    let bestSession = "-";
    let bestSessionRate = 0;

    Object.entries(sessionStats).forEach(([session, data]) => {

        const rate = (data.wins / data.trades) * 100;

        if (rate > bestSessionRate) {

            bestSessionRate = rate;
            bestSession = session;

        }

    setText("worstPairProfit", "$" + (worstProfit === Infinity ? 0 : worstProfit).toFixed(2));
    
    // Best Session
    let bestSession = "-", bestSessionRate = 0;
    Object.entries(sessionStats).forEach(([s, d]) => {
        const rate = d.trades ? (d.wins / d.trades) * 100 : 0;
        if (rate > bestSessionRate) { bestSessionRate = rate; bestSession = s; }
});

setText("bestSession", bestSession);
setText("bestSessionWinrate", bestSessionRate.toFixed(1) + "%");

    // ======================================================
    // BEST MODEL
    // ======================================================

    let bestModel = "-";
    let bestModelRate = 0;

    Object.entries(modelStats).forEach(([model, data]) => {

        const rate = (data.wins / data.trades) * 100;

        if (rate > bestModelRate) {

            bestModelRate = rate;
            bestModel = model;

        }

    
    // Best Model
    let bestModel = "-", bestModelRate = 0;
    Object.entries(modelStats).forEach(([m, d]) => {
        const rate = d.trades ? (d.wins / d.trades) * 100 : 0;
        if (rate > bestModelRate) { bestModelRate = rate; bestModel = m; }
});

setText("bestModel", bestModel);
setText("bestModelWinrate", bestModelRate.toFixed(1) + "%");

    // ======================================================
    // STORE FOR CHARTS
    // ======================================================

    window.analyticsData = {

        pairStats,
        sessionStats,
        modelStats,
        htfStats,
        mtfStats,
        psychologyStats

    };

    
    // Store for charts
    window._analyticsData = { pairStats, sessionStats, modelStats, htfStats, mtfStats, psychStats };
}

// ======================================================
// BUILD CHARTS
// PART 3
// ======================================================

function buildCharts() {

    const data = window.analyticsData;

    const data = window._analyticsData;
if (!data) return;

    // ======================================================
    // EQUITY CURVE
    // ======================================================

    destroyChart(charts.equity);

    
    // ----- Equity Curve -----
    destroyChart('equity');
let running = 0;

    const equity = [];

    const labels = [];

    trades.forEach((trade, index) => {

        running += num(trade.profit);

        equity.push(running);

        labels.push(index + 1);

    });

    charts.equity = new Chart(

        document.getElementById("equityChart"),

        {

    const equity = trades.map((t, i) => { running += num(t.profit); return running; });
    const labels = trades.map((_, i) => i + 1);
    
    if (equity.length > 0) {
        charts.equity = new Chart(document.getElementById("equityChart"), {
type: "line",

data: {

labels,

datasets: [{

label: "Equity Curve",

data: equity,

borderColor: "#0f8cff",

backgroundColor: "rgba(15,140,255,.15)",

fill: true,

borderWidth: 3,

tension: .35,

                    pointRadius: 4

                    pointRadius: 4,
                    pointBackgroundColor: "#0f8cff"
}]

},

            options: defaultOptions()

        }

    );

    // ======================================================
    // MONTHLY PROFIT
    // ======================================================

    destroyChart(charts.monthly);

            options: chartOptions()
        });
    }
    
    // ----- Monthly Profit -----
    destroyChart('monthly');
const monthly = {};

    trades.forEach(trade => {

        if (!trade.tradeDate) return;

        const month = trade.tradeDate.substring(0, 7);

        monthly[month] =
            (monthly[month] || 0) +
            num(trade.profit);

    trades.forEach(t => {
        if (!t.tradeDate) return;
        const month = t.tradeDate.substring(0, 7);
        monthly[month] = (monthly[month] || 0) + num(t.profit);
});

    charts.monthly = new Chart(

        document.getElementById("monthlyChart"),

        {

    const monthLabels = Object.keys(monthly).sort();
    if (monthLabels.length > 0) {
        charts.monthly = new Chart(document.getElementById("monthlyChart"), {
type: "bar",

data: {

                labels: Object.keys(monthly),

                labels: monthLabels,
datasets: [{

label: "Monthly Profit",

                    data: Object.values(monthly),

                    backgroundColor: "#0f8cff",

                    borderRadius: 10

                    data: monthLabels.map(m => monthly[m]),
                    backgroundColor: monthLabels.map(m => monthly[m] >= 0 ? "#00c853" : "#ff4d4f"),
                    borderRadius: 8
}]

},

            options: defaultOptions()

        }

    );

    // ======================================================
    // PAIR PERFORMANCE
    // ======================================================

    destroyChart(charts.pair);

    charts.pair = new Chart(

        document.getElementById("pairChart"),

        {

            options: chartOptions()
        });
    }
    
    // ----- Pair Performance -----
    destroyChart('pair');
    const pairData = data.pairStats || {};
    const pairLabels = Object.keys(pairData);
    if (pairLabels.length > 0) {
        charts.pair = new Chart(document.getElementById("pairChart"), {
type: "bar",

data: {

                labels: Object.keys(data.pairStats),

                labels: pairLabels,
datasets: [{

label: "Profit",

                    data: Object.values(data.pairStats)
                        .map(x => x.profit),

                    backgroundColor: "#00c853",

                    borderRadius: 10

                    data: pairLabels.map(p => pairData[p].profit),
                    backgroundColor: pairLabels.map(p => pairData[p].profit >= 0 ? "#00c853" : "#ff4d4f"),
                    borderRadius: 8
}]

},

            options: defaultOptions()

        }

    );

    // ======================================================
    // SESSION PERFORMANCE
    // ======================================================

    destroyChart(charts.session);

    charts.session = new Chart(

        document.getElementById("sessionChart"),

        {

            options: chartOptions()
        });
    }
    
    // ----- Session Distribution -----
    destroyChart('session');
    const sessionData = data.sessionStats || {};
    const sessionLabels = Object.keys(sessionData);
    if (sessionLabels.length > 0) {
        charts.session = new Chart(document.getElementById("sessionChart"), {
type: "doughnut",

data: {

                labels: Object.keys(data.sessionStats),

                labels: sessionLabels,
datasets: [{

                    data: Object.values(data.sessionStats)
                        .map(x => x.trades),

                    backgroundColor: [

                        "#0f8cff",

                        "#00c853",

                        "#ffb300",

                        "#ff4d4f"

                    ]

                    data: sessionLabels.map(s => sessionData[s].trades),
                    backgroundColor: ["#0f8cff", "#00c853", "#ffb300", "#ff4d4f", "#9c27b0", "#00bcd4"]
}]

},

options: pieOptions()

        }

    );

    // ======================================================
    // ENTRY MODEL
    // ======================================================

    destroyChart(charts.model);

    charts.model = new Chart(

        document.getElementById("modelChart"),

        {

        });
    }
    
    // ----- Entry Model -----
    destroyChart('model');
    const modelData = data.modelStats || {};
    const modelLabels = Object.keys(modelData);
    if (modelLabels.length > 0) {
        charts.model = new Chart(document.getElementById("modelChart"), {
type: "bar",

data: {

                labels: Object.keys(data.modelStats),

                labels: modelLabels,
datasets: [{

label: "Trades",

                    data: Object.values(data.modelStats)
                        .map(x => x.trades),

                    data: modelLabels.map(m => modelData[m].trades),
backgroundColor: "#0f8cff",

                    borderRadius: 10

                    borderRadius: 8
}]

},

            options: defaultOptions()

        }

    );

    // ======================================================
    // RESULT PIE
    // ======================================================

    destroyChart(charts.result);

    charts.result = new Chart(

        document.getElementById("resultChart"),

        {

            options: chartOptions()
        });
    }
    
    // ----- Win/Loss Pie -----
    destroyChart('result');
    const wins = trades.filter(t => t.result === "Win").length;
    const losses = trades.filter(t => t.result === "Loss").length;
    const be = trades.filter(t => t.result === "Break Even").length;
    if (trades.length > 0) {
        charts.result = new Chart(document.getElementById("resultChart"), {
type: "pie",

data: {

                labels: [

                    "Win",

                    "Loss",

                    "Break Even"

                ],

                labels: ["Win", "Loss", "Break Even"],
datasets: [{

                    data: [

                        trades.filter(t => t.result === "Win").length,

                        trades.filter(t => t.result === "Loss").length,

                        trades.filter(t => t.result === "Break Even").length

                    ],

                    backgroundColor: [

                        "#00c853",

                        "#ff4d4f",

                        "#ffb300"

                    ]

                    data: [wins, losses, be],
                    backgroundColor: ["#00c853", "#ff4d4f", "#ffb300"]
}]

},

options: pieOptions()

        }

    );

}
// ======================================================
// PART 4
// FINAL
// ======================================================

// ======================================================
// PSYCHOLOGY
// ======================================================

destroyChart(charts.psychology);

charts.psychology = new Chart(

document.getElementById("psychologyChart"),

{

type:"doughnut",

data:{

labels:Object.keys(window.analyticsData.psychologyStats),

datasets:[{

data:Object.values(window.analyticsData.psychologyStats),

backgroundColor:[

"#0f8cff",

"#00c853",

"#ffb300",

"#ff4d4f",

"#9c27b0",

"#00bcd4"

]

}]

},

options:pieOptions()

}

);

// ======================================================
// HTF
// ======================================================

destroyChart(charts.htf);

charts.htf=new Chart(

document.getElementById("htfChart"),

{

type:"pie",

data:{

labels:Object.keys(window.analyticsData.htfStats),

datasets:[{

data:Object.values(window.analyticsData.htfStats),

backgroundColor:[

"#00c853",

"#ff4d4f"

]

}]

},

options:pieOptions()

}

);

// ======================================================
// MTF
// ======================================================

destroyChart(charts.mtf);

charts.mtf=new Chart(

document.getElementById("mtfChart"),

{

type:"pie",

data:{

labels:Object.keys(window.analyticsData.mtfStats),

datasets:[{

data:Object.values(window.analyticsData.mtfStats),

backgroundColor:[

"#00c853",

"#ff4d4f"

]

}]

},

options:pieOptions()

        });
    }
    
    // ----- Psychology -----
    destroyChart('psychology');
    const psychData = data.psychStats || {};
    const psychLabels = Object.keys(psychData);
    if (psychLabels.length > 0) {
        charts.psychology = new Chart(document.getElementById("psychologyChart"), {
            type: "doughnut",
            data: {
                labels: psychLabels,
                datasets: [{
                    data: psychLabels.map(p => psychData[p]),
                    backgroundColor: ["#0f8cff", "#00c853", "#ffb300", "#ff4d4f", "#9c27b0", "#00bcd4"]
                }]
            },
            options: pieOptions()
        });
    }
    
    // ----- HTF Bias -----
    destroyChart('htf');
    const htfData = data.htfStats || {};
    const htfLabels = Object.keys(htfData);
    if (htfLabels.length > 0) {
        charts.htf = new Chart(document.getElementById("htfChart"), {
            type: "pie",
            data: {
                labels: htfLabels,
                datasets: [{
                    data: htfLabels.map(h => htfData[h]),
                    backgroundColor: ["#00c853", "#ff4d4f", "#0f8cff"]
                }]
            },
            options: pieOptions()
        });
    }
    
    // ----- MTF Bias -----
    destroyChart('mtf');
    const mtfData = data.mtfStats || {};
    const mtfLabels = Object.keys(mtfData);
    if (mtfLabels.length > 0) {
        charts.mtf = new Chart(document.getElementById("mtfChart"), {
            type: "pie",
            data: {
                labels: mtfLabels,
                datasets: [{
                    data: mtfLabels.map(m => mtfData[m]),
                    backgroundColor: ["#00c853", "#ff4d4f", "#0f8cff"]
                }]
            },
            options: pieOptions()
        });
    }
    
    // ----- Monthly Win Rate -----
    destroyChart('monthlyWin');
    const monthWin = {};
    trades.forEach(t => {
        if (!t.tradeDate) return;
        const month = t.tradeDate.substring(0, 7);
        if (!monthWin[month]) monthWin[month] = { wins: 0, total: 0 };
        monthWin[month].total++;
        if (t.result === "Win") monthWin[month].wins++;
    });
    const mwLabels = Object.keys(monthWin).sort();
    if (mwLabels.length > 0) {
        charts.monthlyWin = new Chart(document.getElementById("monthlyWinChart"), {
            type: "line",
            data: {
                labels: mwLabels,
                datasets: [{
                    label: "Win Rate %",
                    data: mwLabels.map(m => {
                        const d = monthWin[m];
                        return d.total ? ((d.wins / d.total) * 100).toFixed(1) : 0;
                    }),
                    borderColor: "#0f8cff",
                    backgroundColor: "rgba(15,140,255,.18)",
                    fill: true,
                    borderWidth: 3,
                    tension: .35,
                    pointRadius: 5,
                    pointBackgroundColor: "#0f8cff"
                }]
            },
            options: chartOptions()
        });
    }
}

);

// ======================================================
// MONTHLY WIN RATE
// BUILD INSIGHTS
// ======================================================

destroyChart(charts.monthlyWin);

const monthWin={};

trades.forEach(trade=>{

if(!trade.tradeDate)return;

const month=trade.tradeDate.substring(0,7);

if(!monthWin[month]){

monthWin[month]={

wins:0,

total:0

};

}

monthWin[month].total++;

if(trade.result==="Win"){

monthWin[month].wins++;

}

});

charts.monthlyWin=new Chart(

document.getElementById("monthlyWinChart"),

{

type:"line",

data:{

labels:Object.keys(monthWin),

datasets:[{

label:"Win Rate",

data:Object.values(monthWin).map(x=>

((x.wins/x.total)*100).toFixed(1)

),

borderColor:"#0f8cff",

backgroundColor:"rgba(15,140,255,.18)",

fill:true,

borderWidth:3,

tension:.35

}]

},

options:defaultOptions()

function buildInsights() {
    const panel = document.getElementById("analyticsInsights");
    if (!panel) return;
    
    if (trades.length === 0) {
        panel.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-inbox"></i>
                <h3>No Trading Data</h3>
                <p>Start by adding your first trade in the Journal.</p>
            </div>
        `;
        return;
    }
    
    const total = trades.length;
    const wins = trades.filter(t => t.result === "Win").length;
    const losses = trades.filter(t => t.result === "Loss").length;
    const be = trades.filter(t => t.result === "Break Even").length;
    const winRate = total ? ((wins / total) * 100).toFixed(1) : 0;
    
    const bestPair = document.getElementById("bestPair").textContent;
    const bestSession = document.getElementById("bestSession").textContent;
    const bestModel = document.getElementById("bestModel").textContent;
    
    panel.innerHTML = `
        <div class="insight-item">
            <div class="insight-label">📊 Total Trades</div>
            <div class="insight-value">${total}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">✅ Win Rate</div>
            <div class="insight-value green">${winRate}%</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">🏆 Wins</div>
            <div class="insight-value green">${wins}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">❌ Losses</div>
            <div class="insight-value red">${losses}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">⚖️ Break Even</div>
            <div class="insight-value gold">${be}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">🏅 Best Pair</div>
            <div class="insight-value blue">${bestPair}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">⏰ Best Session</div>
            <div class="insight-value blue">${bestSession}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">🎯 Best Model</div>
            <div class="insight-value blue">${bestModel}</div>
        </div>
    `;
}

);

// ======================================================
// INSIGHTS
// CHART OPTIONS
// ======================================================

buildInsights();

}

// ======================================================

function buildInsights(){

const panel=document.getElementById("analyticsInsights");

if(!panel)return;

if(trades.length===0){

panel.innerHTML=`

<div class="loading-card">

No trading history found.

</div>

`;

return;

function chartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: "#94a3b8", font: { size: 11 } }
            }
        },
        scales: {
            x: {
                ticks: { color: "#64748b", font: { size: 10 } },
                grid: { color: "rgba(255,255,255,.04)" }
            },
            y: {
                ticks: { color: "#64748b", font: { size: 10 } },
                grid: { color: "rgba(255,255,255,.04)" }
            }
        }
    };
}

const wins=trades.filter(t=>t.result==="Win").length;

const losses=trades.filter(t=>t.result==="Loss").length;

const be=trades.filter(t=>t.result==="Break Even").length;

panel.innerHTML=`

<div class="insight-item">

<h4>Total Trades</h4>

<p>${trades.length}</p>

</div>

<div class="insight-item">

<h4>Winning Trades</h4>

<p>${wins}</p>

</div>

<div class="insight-item">

<h4>Losing Trades</h4>

<p>${losses}</p>

</div>

<div class="insight-item">

<h4>Break Even</h4>

<p>${be}</p>

</div>

<div class="insight-item">

<h4>Best Pair</h4>

<p>${document.getElementById("bestPair").textContent}</p>

</div>

<div class="insight-item">

<h4>Best Session</h4>

<p>${document.getElementById("bestSession").textContent}</p>

</div>

<div class="insight-item">

<h4>Best Entry Model</h4>

<p>${document.getElementById("bestModel").textContent}</p>

</div>

`;

function pieOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    color: "#94a3b8",
                    padding: 12,
                    font: { size: 11 }
                }
            }
        }
    };
}

// ======================================================

function defaultOptions(){

return{

responsive:true,

maintainAspectRatio:false,

plugins:{

legend:{

labels:{

color:"#ffffff"

}

}

},

scales:{

x:{

ticks:{color:"#94a3b8"},

grid:{color:"rgba(255,255,255,.05)"}

},

y:{

ticks:{color:"#94a3b8"},

grid:{color:"rgba(255,255,255,.05)"}

}

}

};

}

// FIREBASE INTEGRATION (Optional)
// ======================================================

function pieOptions(){

return{

responsive:true,

maintainAspectRatio:false,

plugins:{

legend:{

position:"bottom",

labels:{

color:"#ffffff",

padding:15
// Uncomment and configure when Firebase is ready
/*
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";

async function fetchTradesFromFirebase() {
    const db = getFirestore();
    const q = query(collection(db, "trades"), orderBy("tradeDate", "desc"));
    const snapshot = await getDocs(q);
    const results = [];
    snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
    return results;
}

}

}

};

}
*/