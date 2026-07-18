// ======================================================
// GTRADES-AXIS™
// ANALYTICS SYSTEM V2
// PART 1
// ======================================================

let trades = JSON.parse(localStorage.getItem("gtradesJournal")) || [];

// ======================================================
// CHART REFERENCES
// ======================================================

let equityChart = null;
let monthlyChart = null;
let pairChart = null;
let sessionChart = null;
let modelChart = null;
let resultChart = null;
let psychologyChart = null;
let htfChart = null;
let mtfChart = null;
let monthlyWinChart = null;

// ======================================================
// INITIALIZE
// ======================================================

window.addEventListener("DOMContentLoaded", () => {

    loadAnalytics();

});

// ======================================================
// LOAD ANALYTICS
// ======================================================

function loadAnalytics(){

    trades = JSON.parse(localStorage.getItem("gtradesJournal")) || [];

    calculateStatistics();

}

// ======================================================
// CALCULATE STATISTICS
// ======================================================

function calculateStatistics(){

    const totalTrades = trades.length;

    let wins = 0;

    let losses = 0;

    let grossProfit = 0;

    let grossLoss = 0;

    let totalRR = 0;

    trades.forEach(trade=>{

        const profit = Number(trade.profit || 0);

        const rr = Number(trade.actualRR || 0);

        totalRR += rr;

        if(trade.result==="Win"){

            wins++;

            grossProfit += profit;

        }

        if(trade.result==="Loss"){

            losses++;

            grossLoss += Math.abs(profit);

        }

    });

    const netProfit = grossProfit - grossLoss;

    const winRate = totalTrades
        ? ((wins/totalTrades)*100).toFixed(1)
        : 0;

    const averageRR = totalTrades
        ? (totalRR/totalTrades).toFixed(2)
        : 0;

    const profitFactor = grossLoss
        ? (grossProfit/grossLoss).toFixed(2)
        : grossProfit.toFixed(2);

    const expectancy = totalTrades
        ? (netProfit/totalTrades).toFixed(2)
        : 0;

    const averageWin = wins
        ? (grossProfit/wins).toFixed(2)
        : 0;

    const averageLoss = losses
        ? (grossLoss/losses).toFixed(2)
        : 0;

    // ==========================
    // UPDATE DASHBOARD
    // ==========================

    document.getElementById("totalTrades").textContent = totalTrades;

    document.getElementById("winRate").textContent = winRate + "%";

    document.getElementById("averageRR").textContent = averageRR;

    document.getElementById("netProfit").textContent = "$" + netProfit.toFixed(2);

    document.getElementById("profitFactor").textContent = profitFactor;

    document.getElementById("expectancy").textContent = "$" + expectancy;

    document.getElementById("averageWin").textContent = "$" + averageWin;

    document.getElementById("averageLoss").textContent = "$" + averageLoss;

    calculatePerformance();

}
// ======================================================
// PART 2
// PERFORMANCE ANALYSIS
// ======================================================

function calculatePerformance(){

    const pairStats = {};

    const sessionStats = {};

    const modelStats = {};

    const htfStats = {};

    const mtfStats = {};

    const psychologyStats = {};

    trades.forEach(trade=>{

        // =====================================
        // PAIR
        // =====================================

        if(!pairStats[trade.pair]){

            pairStats[trade.pair]={

                profit:0,

                wins:0,

                trades:0

            };

        }

        pairStats[trade.pair].profit+=Number(trade.profit||0);

        pairStats[trade.pair].trades++;

        if(trade.result==="Win"){

            pairStats[trade.pair].wins++;

        }

        // =====================================
        // SESSION
        // =====================================

        if(!sessionStats[trade.session]){

            sessionStats[trade.session]={

                profit:0,

                wins:0,

                trades:0

            };

        }

        sessionStats[trade.session].profit+=Number(trade.profit||0);

        sessionStats[trade.session].trades++;

        if(trade.result==="Win"){

            sessionStats[trade.session].wins++;

        }

        // =====================================
        // ENTRY MODEL
        // =====================================

        if(!modelStats[trade.entryModel]){

            modelStats[trade.entryModel]={

                profit:0,

                wins:0,

                trades:0

            };

        }

        modelStats[trade.entryModel].profit+=Number(trade.profit||0);

        modelStats[trade.entryModel].trades++;

        if(trade.result==="Win"){

            modelStats[trade.entryModel].wins++;

        }

        // =====================================
        // HTF BIAS
        // =====================================

        const htfBias=trade.htfSwing||"Unknown";

        htfStats[htfBias]=(htfStats[htfBias]||0)+1;

        // =====================================
        // MTF BIAS
        // =====================================

        const mtfBias=trade.mtfSwing||"Unknown";

        mtfStats[mtfBias]=(mtfStats[mtfBias]||0)+1;

        // =====================================
        // PSYCHOLOGY
        // =====================================

        const emotion=trade.emotion||"Unknown";

        psychologyStats[emotion]=(psychologyStats[emotion]||0)+1;

    });

    // =====================================
    // BEST / WORST PAIR
    // =====================================

    const pairArray=Object.entries(pairStats);

    pairArray.sort((a,b)=>b[1].profit-a[1].profit);

    if(pairArray.length){

        document.getElementById("bestPair").textContent=
        pairArray[0][0];

        document.getElementById("bestPairProfit").textContent=
        "$"+pairArray[0][1].profit.toFixed(2);

        const last=pairArray[pairArray.length-1];

        document.getElementById("worstPair").textContent=
        last[0];

        document.getElementById("worstPairProfit").textContent=
        "$"+last[1].profit.toFixed(2);

    }

    // =====================================
    // BEST SESSION
    // =====================================

    let bestSession="-";

    let bestSessionRate=0;

    Object.entries(sessionStats).forEach(([session,data])=>{

        const rate=(data.wins/data.trades)*100;

        if(rate>bestSessionRate){

            bestSession=session;

            bestSessionRate=rate;

        }

    });

    document.getElementById("bestSession").textContent=
    bestSession;

    document.getElementById("bestSessionWinrate").textContent=
    bestSessionRate.toFixed(1)+"%";

    // =====================================
    // BEST ENTRY MODEL
    // =====================================

    let bestModel="-";

    let bestModelRate=0;

    Object.entries(modelStats).forEach(([model,data])=>{

        const rate=(data.wins/data.trades)*100;

        if(rate>bestModelRate){

            bestModel=model;

            bestModelRate=rate;

        }

    });

    document.getElementById("bestModel").textContent=
    bestModel;

    document.getElementById("bestModelWinrate").textContent=
    bestModelRate.toFixed(1)+"%";

    // =====================================
    // BUILD CHARTS
    // =====================================

    buildCharts(

        pairStats,

        sessionStats,

        modelStats,

        htfStats,

        mtfStats,

        psychologyStats

    );

}
// ======================================================
// PART 3
// PROFESSIONAL CHARTS
// ======================================================

function destroyChart(chart){

    if(chart){

        chart.destroy();

    }

}

// ======================================================
// BUILD CHARTS
// ======================================================

function buildCharts(

    pairStats,
    sessionStats,
    modelStats,
    htfStats,
    mtfStats,
    psychologyStats

){

    // =====================================
    // EQUITY CURVE
    // =====================================

    destroyChart(equityChart);

    let running = 0;

    const equityData = [];

    const equityLabels = [];

    trades.forEach((trade,index)=>{

        running += Number(trade.profit || 0);

        equityData.push(running);

        equityLabels.push(index+1);

    });

    const equityCtx =
        document.getElementById("equityChart").getContext("2d");

    const equityGradient =
        equityCtx.createLinearGradient(0,0,0,350);

    equityGradient.addColorStop(0,"rgba(15,140,255,.45)");
    equityGradient.addColorStop(1,"rgba(15,140,255,0)");

    equityChart = new Chart(equityCtx,{

        type:"line",

        data:{

            labels:equityLabels,

            datasets:[{

                label:"Equity",

                data:equityData,

                borderColor:"#0f8cff",

                backgroundColor:equityGradient,

                fill:true,

                tension:.35,

                borderWidth:3,

                pointRadius:4,

                pointHoverRadius:6

            }]

        },

        options:defaultOptions("USD")

    });

    // =====================================
    // MONTHLY PERFORMANCE
    // =====================================

    destroyChart(monthlyChart);

    const monthly={};

    trades.forEach(trade=>{

        if(!trade.tradeDate) return;

        const month = trade.tradeDate.substring(0,7);

        monthly[month] =
            (monthly[month] || 0) +
            Number(trade.profit || 0);

    });

    monthlyChart = new Chart(

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

    // =====================================
    // PAIR PERFORMANCE
    // =====================================

    destroyChart(pairChart);

    pairChart = new Chart(

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

            options:defaultOptions("USD")

        }

    );

    // =====================================
    // SESSION PERFORMANCE
    // =====================================

    destroyChart(sessionChart);

    sessionChart = new Chart(

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

    // =====================================
    // ENTRY MODELS
    // =====================================

    destroyChart(modelChart);

    modelChart = new Chart(

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

}
// ======================================================
// PART 4
// REMAINING CHARTS + INSIGHTS
// ======================================================

// =====================================
// RESULT CHART
// =====================================

destroyChart(resultChart);

const winCount = trades.filter(t=>t.result==="Win").length;
const lossCount = trades.filter(t=>t.result==="Loss").length;
const beCount = trades.filter(t=>t.result==="Break Even").length;

resultChart = new Chart(

document.getElementById("resultChart"),

{

type:"doughnut",

data:{

labels:["Wins","Losses","Break Even"],

datasets:[{

data:[winCount,lossCount,beCount],

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

// =====================================
// PSYCHOLOGY
// =====================================

destroyChart(psychologyChart);

psychologyChart = new Chart(

document.getElementById("psychologyChart"),

{

type:"pie",

data:{

labels:Object.keys(psychologyStats),

datasets:[{

data:Object.values(psychologyStats),

backgroundColor:[

"#0f8cff",

"#00c853",

"#ffb300",

"#ff4d4f",

"#9c27b0"

]

}]

},

options:pieOptions()

}

);

// =====================================
// HTF
// =====================================

destroyChart(htfChart);

htfChart = new Chart(

document.getElementById("htfChart"),

{

type:"pie",

data:{

labels:Object.keys(htfStats),

datasets:[{

data:Object.values(htfStats),

backgroundColor:[

"#00c853",

"#ff4d4f"

]

}]

},

options:pieOptions()

}

);

// =====================================
// MTF
// =====================================

destroyChart(mtfChart);

mtfChart = new Chart(

document.getElementById("mtfChart"),

{

type:"pie",

data:{

labels:Object.keys(mtfStats),

datasets:[{

data:Object.values(mtfStats),

backgroundColor:[

"#00c853",

"#ff4d4f"

]

}]

},

options:pieOptions()

}

);

// =====================================
// MONTHLY WINRATE
// =====================================

destroyChart(monthlyWinChart);

const monthlyWin={};

trades.forEach(trade=>{

if(!trade.tradeDate)return;

const month=trade.tradeDate.substring(0,7);

if(!monthlyWin[month]){

monthlyWin[month]={

wins:0,

total:0

};

}

monthlyWin[month].total++;

if(trade.result==="Win"){

monthlyWin[month].wins++;

}

});

monthlyWinChart=new Chart(

document.getElementById("monthlyWinChart"),

{

type:"line",

data:{

labels:Object.keys(monthlyWin),

datasets:[{

label:"Win Rate",

data:Object.values(monthlyWin).map(x=>

((x.wins/x.total)*100).toFixed(1)

),

borderColor:"#0f8cff",

backgroundColor:"rgba(15,140,255,.15)",

fill:true,

tension:.35

}]

},

options:defaultOptions("%")

}

);

// =====================================
// INSIGHTS
// =====================================

const insights=document.getElementById("analyticsInsights");

if(insights){

let html="";

if(trades.length===0){

html=`

<div class="loading-card">

No trades available.

</div>

`;

}else{

html+=`

<div class="insight-item">

<h4>Total Trades</h4>

<p>${trades.length} trades analysed.</p>

</div>

`;

html+=`

<div class="insight-item">

<h4>Best Pair</h4>

<p>${document.getElementById("bestPair").textContent}</p>

</div>

`;

html+=`

<div class="insight-item">

<h4>Best Entry Model</h4>

<p>${document.getElementById("bestModel").textContent}</p>

</div>

`;

html+=`

<div class="insight-item">

<h4>Best Session</h4>

<p>${document.getElementById("bestSession").textContent}</p>

</div>

`;

}

insights.innerHTML=html;

}

}

// ======================================================
// DEFAULT OPTIONS
// ======================================================

function defaultOptions(label){

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

text:label,

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

padding:18

}

}

}

};

}