// ======================================================
// GTRADES-AXIS™
// ANALYTICS ENGINE V4
// PART 1
// ======================================================

"use strict";

// ======================================================
// STORAGE
// ======================================================

const STORAGE_KEY = "gtradesJournal";

let trades = [];

// ======================================================
// CHART REFERENCES
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

// ======================================================
// INITIALIZE
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    loadTrades();

    updateOverview();

    updatePerformanceCards();

    buildCharts();

    buildInsights();

});

// ======================================================
// LOAD TRADES
// ======================================================

function loadTrades() {

    try {

        const stored = localStorage.getItem(STORAGE_KEY);

        trades = stored ? JSON.parse(stored) : [];

        if (!Array.isArray(trades)) {

            trades = [];

        }

    } catch (err) {

        console.error("Analytics Load Error:", err);

        trades = [];

    }

}

// ======================================================
// HELPERS
// ======================================================

function num(value) {

    const n = Number(value);

    return isNaN(n) ? 0 : n;

}

function setText(id, value) {

    const el = document.getElementById(id);

    if (el) el.textContent = value;

}

function destroyChart(chart) {

    if (chart) chart.destroy();

}

// ======================================================
// OVERVIEW
// ======================================================

function updateOverview() {

    const totalTrades = trades.length;

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

}
// ======================================================
// PERFORMANCE ANALYSIS
// PART 2
// ======================================================

function updatePerformanceCards() {

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

    });

    setText("bestPair", bestPair);
    setText("bestPairProfit", "$" + bestPairProfit.toFixed(2));

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

}
// ======================================================
// BUILD CHARTS
// PART 3
// ======================================================

function buildCharts() {

    const data = window.analyticsData;

    if (!data) return;

    // ======================================================
    // EQUITY CURVE
    // ======================================================

    destroyChart(charts.equity);

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

                }]

            },

            options: defaultOptions()

        }

    );

    // ======================================================
    // MONTHLY PROFIT
    // ======================================================

    destroyChart(charts.monthly);

    const monthly = {};

    trades.forEach(trade => {

        if (!trade.tradeDate) return;

        const month = trade.tradeDate.substring(0, 7);

        monthly[month] =
            (monthly[month] || 0) +
            num(trade.profit);

    });

    charts.monthly = new Chart(

        document.getElementById("monthlyChart"),

        {

            type: "bar",

            data: {

                labels: Object.keys(monthly),

                datasets: [{

                    label: "Monthly Profit",

                    data: Object.values(monthly),

                    backgroundColor: "#0f8cff",

                    borderRadius: 10

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

            type: "bar",

            data: {

                labels: Object.keys(data.pairStats),

                datasets: [{

                    label: "Profit",

                    data: Object.values(data.pairStats)
                        .map(x => x.profit),

                    backgroundColor: "#00c853",

                    borderRadius: 10

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

            type: "doughnut",

            data: {

                labels: Object.keys(data.sessionStats),

                datasets: [{

                    data: Object.values(data.sessionStats)
                        .map(x => x.trades),

                    backgroundColor: [

                        "#0f8cff",

                        "#00c853",

                        "#ffb300",

                        "#ff4d4f"

                    ]

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

            type: "bar",

            data: {

                labels: Object.keys(data.modelStats),

                datasets: [{

                    label: "Trades",

                    data: Object.values(data.modelStats)
                        .map(x => x.trades),

                    backgroundColor: "#0f8cff",

                    borderRadius: 10

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

            type: "pie",

            data: {

                labels: [

                    "Win",

                    "Loss",

                    "Break Even"

                ],

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

}

);

// ======================================================
// MONTHLY WIN RATE
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

}

);

// ======================================================
// INSIGHTS
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

}

}

}

};

}