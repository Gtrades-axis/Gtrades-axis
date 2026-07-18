// ======================================================
// GTRADES-AXIS™
// ANALYTICS ENGINE V3
// PART 1
// ======================================================

"use strict";

// ======================================================
// STORAGE
// ======================================================

const STORAGE_KEY = "gtradesJournal";

let trades = [];

// ======================================================
// CHART OBJECTS
// ======================================================

let charts = {

    equity:null,

    monthly:null,

    pair:null,

    session:null,

    model:null,

    result:null,

    psychology:null,

    htf:null,

    mtf:null,

    monthlyWin:null

};

// ======================================================
// INITIALIZE
// ======================================================

document.addEventListener("DOMContentLoaded", initAnalytics);

function initAnalytics(){

    loadTrades();

    updateOverview();

    updatePerformanceCards();

    buildCharts();

    buildInsights();

}

// ======================================================
// LOAD TRADES
// ======================================================

function loadTrades(){

    const stored = localStorage.getItem(STORAGE_KEY);

    if(!stored){

        trades=[];

        return;

    }

    try{

        trades = JSON.parse(stored);

        if(!Array.isArray(trades)){

            trades=[];

        }

    }catch(error){

        console.error("Trade data corrupted.",error);

        trades=[];

    }

}

// ======================================================
// SAFE NUMBER
// ======================================================

function num(value){

    const n = Number(value);

    return isNaN(n) ? 0 : n;

}

// ======================================================
// OVERVIEW
// ======================================================

function updateOverview(){

    const totalTrades = trades.length;

    const wins = trades.filter(t=>t.result==="Win").length;

    const losses = trades.filter(t=>t.result==="Loss").length;

    const breakeven = trades.filter(t=>t.result==="Break Even").length;

    let grossProfit=0;

    let grossLoss=0;

    let totalRR=0;

    trades.forEach(trade=>{

        const profit = num(trade.profit);

        const rr = num(trade.actualRR);

        totalRR += rr;

        if(profit>=0){

            grossProfit += profit;

        }else{

            grossLoss += Math.abs(profit);

        }

    });

    const netProfit = grossProfit-grossLoss;

    const winRate = totalTrades
        ? ((wins/totalTrades)*100).toFixed(1)
        : "0";

    const avgRR = totalTrades
        ? (totalRR/totalTrades).toFixed(2)
        : "0";

    const profitFactor = grossLoss
        ? (grossProfit/grossLoss).toFixed(2)
        : grossProfit.toFixed(2);

    const expectancy = totalTrades
        ? (netProfit/totalTrades).toFixed(2)
        : "0";

    const avgWin = wins
        ? (grossProfit/wins).toFixed(2)
        : "0";

    const avgLoss = losses
        ? (grossLoss/losses).toFixed(2)
        : "0";

    setText("totalTrades",totalTrades);

    setText("winRate",winRate+"%");

    setText("averageRR",avgRR);

    setText("netProfit","$"+netProfit.toFixed(2));

    setText("profitFactor",profitFactor);

    setText("expectancy","$"+expectancy);

    setText("averageWin","$"+avgWin);

    setText("averageLoss","$"+avgLoss);

}

// ======================================================
// SAFE TEXT
// ======================================================

function setText(id,value){

    const el=document.getElementById(id);

    if(el){

        el.textContent=value;

    }

}
// ======================================================
// PART 2
// PERFORMANCE ANALYSIS
// ======================================================

function updatePerformanceCards(){

    const pairStats = {};
    const sessionStats = {};
    const modelStats = {};
    const htfStats = {};
    const mtfStats = {};
    const psychologyStats = {};

    trades.forEach(trade=>{

        const pair = trade.pair || "Unknown";
        const session = trade.session || "Unknown";
        const model = trade.entryModel || "Unknown";

        const htf = trade.htfSwing || "Unknown";
        const mtf = trade.mtfSwing || "Unknown";

        const emotion = trade.emotion || "Unknown";

        const profit = num(trade.profit);

        // ===============================
        // PAIR
        // ===============================

        if(!pairStats[pair]){

            pairStats[pair]={

                trades:0,

                wins:0,

                profit:0

            };

        }

        pairStats[pair].trades++;

        pairStats[pair].profit+=profit;

        if(trade.result==="Win"){

            pairStats[pair].wins++;

        }

        // ===============================
        // SESSION
        // ===============================

        if(!sessionStats[session]){

            sessionStats[session]={

                trades:0,

                wins:0,

                profit:0

            };

        }

        sessionStats[session].trades++;

        sessionStats[session].profit+=profit;

        if(trade.result==="Win"){

            sessionStats[session].wins++;

        }

        // ===============================
        // ENTRY MODEL
        // ===============================

        if(!modelStats[model]){

            modelStats[model]={

                trades:0,

                wins:0,

                profit:0

            };

        }

        modelStats[model].trades++;

        modelStats[model].profit+=profit;

        if(trade.result==="Win"){

            modelStats[model].wins++;

        }

        // ===============================
        // HTF
        // ===============================

        htfStats[htf]=(htfStats[htf]||0)+1;

        // ===============================
        // MTF
        // ===============================

        mtfStats[mtf]=(mtfStats[mtf]||0)+1;

        // ===============================
        // PSYCHOLOGY
        // ===============================

        psychologyStats[emotion]=(psychologyStats[emotion]||0)+1;

    });

    // =====================================================
    // BEST / WORST PAIR
    // =====================================================

    const pairs = Object.entries(pairStats);

    pairs.sort((a,b)=>b[1].profit-a[1].profit);

    if(pairs.length){

        setText("bestPair",pairs[0][0]);

        setText("bestPairProfit",
            "$"+pairs[0][1].profit.toFixed(2));

        const last=pairs[pairs.length-1];

        setText("worstPair",last[0]);

        setText("worstPairProfit",
            "$"+last[1].profit.toFixed(2));

    }

    // =====================================================
    // BEST SESSION
    // =====================================================

    let bestSession="-";
    let bestSessionRate=0;

    Object.entries(sessionStats).forEach(([name,data])=>{

        const rate=(data.wins/data.trades)*100;

        if(rate>bestSessionRate){

            bestSession=name;

            bestSessionRate=rate;

        }

    });

    setText("bestSession",bestSession);

    setText("bestSessionWinrate",
        bestSessionRate.toFixed(1)+"%");

    // =====================================================
    // BEST ENTRY MODEL
    // =====================================================

    let bestModel="-";
    let bestModelRate=0;

    Object.entries(modelStats).forEach(([name,data])=>{

        const rate=(data.wins/data.trades)*100;

        if(rate>bestModelRate){

            bestModel=name;

            bestModelRate=rate;

        }

    });

    setText("bestModel",bestModel);

    setText("bestModelWinrate",
        bestModelRate.toFixed(1)+"%");

    // =====================================================
    // SAVE FOR CHARTS
    // =====================================================

    window.analyticsData={

        pairStats,

        sessionStats,

        modelStats,

        htfStats,

        mtfStats,

        psychologyStats

    };

}
// ======================================================
// PART 3
// BUILD CHARTS
// ======================================================

function destroyChart(chart){

    if(chart){

        chart.destroy();

    }

}

// ======================================================

function buildCharts(){

    const {

        pairStats,

        sessionStats,

        modelStats,

        htfStats,

        mtfStats,

        psychologyStats

    } = window.analyticsData;

    // ==================================================
    // EQUITY CURVE
    // ==================================================

    destroyChart(charts.equity);

    let running = 0;

    const equity = [];

    const labels = [];

    trades.forEach((trade,index)=>{

        running += num(trade.profit);

        equity.push(running);

        labels.push(index+1);

    });

    const ctx1 = document.getElementById("equityChart").getContext("2d");

    const gradient = ctx1.createLinearGradient(0,0,0,350);

    gradient.addColorStop(0,"rgba(15,140,255,.45)");
    gradient.addColorStop(1,"rgba(15,140,255,0)");

    charts.equity = new Chart(ctx1,{

        type:"line",

        data:{

            labels,

            datasets:[{

                label:"Equity",

                data:equity,

                borderColor:"#0f8cff",

                backgroundColor:gradient,

                fill:true,

                tension:.35,

                borderWidth:3,

                pointRadius:4

            }]

        },

        options:defaultOptions("Profit")

    });

    // ==================================================
    // MONTHLY PROFIT
    // ==================================================

    destroyChart(charts.monthly);

    const monthly={};

    trades.forEach(trade=>{

        if(!trade.tradeDate)return;

        const month=trade.tradeDate.substring(0,7);

        monthly[month]=(monthly[month]||0)+num(trade.profit);

    });

    charts.monthly=new Chart(

        document.getElementById("monthlyChart"),

        {

            type:"bar",

            data:{

                labels:Object.keys(monthly),

                datasets:[{

                    label:"Monthly Profit",

                    data:Object.values(monthly),

                    backgroundColor:"#0f8cff",

                    borderRadius:8

                }]

            },

            options:defaultOptions("USD")

        }

    );

    // ==================================================
    // PAIR PERFORMANCE
    // ==================================================

    destroyChart(charts.pair);

    charts.pair=new Chart(

        document.getElementById("pairChart"),

        {

            type:"bar",

            data:{

                labels:Object.keys(pairStats),

                datasets:[{

                    label:"Profit",

                    data:Object.values(pairStats).map(x=>x.profit),

                    backgroundColor:"#00c853",

                    borderRadius:8

                }]

            },

            options:defaultOptions("Profit")

        }

    );

    // ==================================================
    // SESSION PERFORMANCE
    // ==================================================

    destroyChart(charts.session);

    charts.session=new Chart(

        document.getElementById("sessionChart"),

        {

            type:"doughnut",

            data:{

                labels:Object.keys(sessionStats),

                datasets:[{

                    data:Object.values(sessionStats).map(x=>x.trades),

                    backgroundColor:[

                        "#0f8cff",

                        "#00c853",

                        "#ffb300",

                        "#ff4d4f"

                    ]

                }]

            },

            options:pieOptions()

        }

    );

    // ==================================================
    // ENTRY MODEL
    // ==================================================

    destroyChart(charts.model);

    charts.model=new Chart(

        document.getElementById("modelChart"),

        {

            type:"bar",

            data:{

                labels:Object.keys(modelStats),

                datasets:[{

                    label:"Trades",

                    data:Object.values(modelStats).map(x=>x.trades),

                    backgroundColor:"#0f8cff",

                    borderRadius:8

                }]

            },

            options:defaultOptions("Trades")

        }

    );

    // ==================================================
    // RESULT DISTRIBUTION
    // ==================================================

    destroyChart(charts.result);

    charts.result=new Chart(

        document.getElementById("resultChart"),

        {

            type:"pie",

            data:{

                labels:["Win","Loss","Break Even"],

                datasets:[{

                    data:[

                        trades.filter(t=>t.result==="Win").length,

                        trades.filter(t=>t.result==="Loss").length,

                        trades.filter(t=>t.result==="Break Even").length

                    ],

                    backgroundColor:[

                        "#00c853",

                        "#ff4d4f",

                        "#ffb300"

                    ]

                }]

            },

            options:pieOptions()

        }

    );

}
// ======================================================
// PART 4
// REMAINING CHARTS + INSIGHTS
// ======================================================

const d = window.analyticsData;

// ======================================================
// PSYCHOLOGY
// ======================================================

destroyChart(charts.psychology);

charts.psychology = new Chart(

document.getElementById("psychologyChart"),

{

type:"doughnut",

data:{

labels:Object.keys(d.psychologyStats),

datasets:[{

data:Object.values(d.psychologyStats),

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
// HTF BIAS
// ======================================================

destroyChart(charts.htf);

charts.htf = new Chart(

document.getElementById("htfChart"),

{

type:"pie",

data:{

labels:Object.keys(d.htfStats),

datasets:[{

data:Object.values(d.htfStats),

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
// MTF BIAS
// ======================================================

destroyChart(charts.mtf);

charts.mtf = new Chart(

document.getElementById("mtfChart"),

{

type:"pie",

data:{

labels:Object.keys(d.mtfStats),

datasets:[{

data:Object.values(d.mtfStats),

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

const monthStats = {};

trades.forEach(trade=>{

if(!trade.tradeDate) return;

const month = trade.tradeDate.substring(0,7);

if(!monthStats[month]){

monthStats[month]={

wins:0,

total:0

};

}

monthStats[month].total++;

if(trade.result==="Win"){

monthStats[month].wins++;

}

});

charts.monthlyWin = new Chart(

document.getElementById("monthlyWinChart"),

{

type:"line",

data:{

labels:Object.keys(monthStats),

datasets:[{

label:"Win Rate",

data:Object.values(monthStats).map(m=>

((m.wins/m.total)*100).toFixed(1)

),

borderColor:"#0f8cff",

backgroundColor:"rgba(15,140,255,.18)",

fill:true,

tension:.35,

borderWidth:3

}]

},

options:defaultOptions("%")

}

);

// ======================================================
// INSIGHTS
// ======================================================

buildInsights();

}

function buildInsights(){

const container=document.getElementById("analyticsInsights");

if(!container) return;

if(trades.length===0){

container.innerHTML=`

<div class="loading-card">

No trading data available.

</div>

`;

return;

}

const total = trades.length;

const wins = trades.filter(t=>t.result==="Win").length;

const losses = trades.filter(t=>t.result==="Loss").length;

container.innerHTML=`

<div class="insight-item">

<h4>Total Trades</h4>

<p>${total}</p>

</div>

<div class="insight-item">

<h4>Wins</h4>

<p>${wins}</p>

</div>

<div class="insight-item">

<h4>Losses</h4>

<p>${losses}</p>

</div>

<div class="insight-item">

<h4>Best Pair</h4>

<p>${document.getElementById("bestPair").textContent}</p>

</div>

<div class="insight-item">

<h4>Best Entry Model</h4>

<p>${document.getElementById("bestModel").textContent}</p>

</div>

<div class="insight-item">

<h4>Best Session</h4>

<p>${document.getElementById("bestSession").textContent}</p>

</div>

`;

}

// ======================================================
// DEFAULT OPTIONS
// ======================================================

function defaultOptions(title){

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

grid:{color:"rgba(255,255,255,.05)"},

title:{

display:true,

text:title,

color:"#94a3b8"

}

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

padding:16

}

}

}

};

}