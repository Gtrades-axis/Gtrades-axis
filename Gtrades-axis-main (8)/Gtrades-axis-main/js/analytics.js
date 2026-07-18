// ======================================================
// GTRADES-AXIS™
// ANALYTICS
// PART 1
// ======================================================

const trades = JSON.parse(localStorage.getItem("gtradesJournal")) || [];

// ======================================================
// INITIALIZE
// ======================================================

window.addEventListener("DOMContentLoaded", () => {

    calculateStatistics();

});

// ======================================================
// CALCULATE STATISTICS
// ======================================================

function calculateStatistics() {

    const totalTrades = trades.length;

    let wins = 0;

    let losses = 0;

    let grossProfit = 0;

    let grossLoss = 0;

    let totalRR = 0;

    trades.forEach(trade => {

        const profit = Number(trade.profit || 0);

        const rr = Number(trade.actualRR || 0);

        totalRR += rr;

        if (trade.result === "Win") {

            wins++;

            grossProfit += profit;

        }

        if (trade.result === "Loss") {

            losses++;

            grossLoss += Math.abs(profit);

        }

    });

    const winRate =
        totalTrades === 0
            ? 0
            : ((wins / totalTrades) * 100).toFixed(1);

    const averageRR =
        totalTrades === 0
            ? 0
            : (totalRR / totalTrades).toFixed(2);

    const netProfit =
        grossProfit - grossLoss;

    const profitFactor =
        grossLoss === 0
            ? grossProfit
            : (grossProfit / grossLoss).toFixed(2);

    const expectancy =
        totalTrades === 0
            ? 0
            : (netProfit / totalTrades).toFixed(2);

    const averageWin =
        wins === 0
            ? 0
            : (grossProfit / wins).toFixed(2);

    const averageLoss =
        losses === 0
            ? 0
            : (grossLoss / losses).toFixed(2);

    // ======================================================
    // UPDATE HTML
    // ======================================================

    document.getElementById("totalTrades").textContent =
        totalTrades;

    document.getElementById("winRate").textContent =
        winRate + "%";

    document.getElementById("averageRR").textContent =
        averageRR;

    document.getElementById("netProfit").textContent =
        "$" + netProfit.toFixed(2);

    document.getElementById("profitFactor").textContent =
        profitFactor;

    document.getElementById("expectancy").textContent =
        "$" + expectancy;

    document.getElementById("averageWin").textContent =
        "$" + averageWin;

    document.getElementById("averageLoss").textContent =
        "$" + averageLoss;

    // Continue

    calculatePerformance();

}
// ======================================================
// PERFORMANCE ANALYSIS
// ======================================================

function calculatePerformance(){

    const pairStats = {};

    const sessionStats = {};

    const modelStats = {};

    trades.forEach(trade=>{

        // ==========================
        // PAIRS
        // ==========================

        if(!pairStats[trade.pair]){

            pairStats[trade.pair]={

                profit:0,

                wins:0,

                trades:0

            };

        }

        pairStats[trade.pair].profit += Number(trade.profit||0);

        pairStats[trade.pair].trades++;

        if(trade.result==="Win"){

            pairStats[trade.pair].wins++;

        }

        // ==========================
        // SESSION
        // ==========================

        if(!sessionStats[trade.session]){

            sessionStats[trade.session]={

                profit:0,

                wins:0,

                trades:0

            };

        }

        sessionStats[trade.session].profit += Number(trade.profit||0);

        sessionStats[trade.session].trades++;

        if(trade.result==="Win"){

            sessionStats[trade.session].wins++;

        }

        // ==========================
        // ENTRY MODEL
        // ==========================

        if(!modelStats[trade.entryModel]){

            modelStats[trade.entryModel]={

                profit:0,

                wins:0,

                trades:0

            };

        }

        modelStats[trade.entryModel].profit += Number(trade.profit||0);

        modelStats[trade.entryModel].trades++;

        if(trade.result==="Win"){

            modelStats[trade.entryModel].wins++;

        }

    });

    // ======================================================
    // BEST / WORST PAIR
    // ======================================================

    const pairArray = Object.entries(pairStats);

    pairArray.sort((a,b)=>b[1].profit-a[1].profit);

    if(pairArray.length){

        document.getElementById("bestPair").textContent = pairArray[0][0];

        document.getElementById("bestPairProfit").textContent =
        "$"+pairArray[0][1].profit.toFixed(2);

        const last = pairArray[pairArray.length-1];

        document.getElementById("worstPair").textContent = last[0];

        document.getElementById("worstPairProfit").textContent =
        "$"+last[1].profit.toFixed(2);

    }

    // ======================================================
    // BEST SESSION
    // ======================================================

    let bestSession="";

    let bestSessionRate=0;

    Object.entries(sessionStats).forEach(([session,data])=>{

        const rate=(data.wins/data.trades)*100;

        if(rate>bestSessionRate){

            bestSessionRate=rate;

            bestSession=session;

        }

    });

    document.getElementById("bestSession").textContent = bestSession || "-";

    document.getElementById("bestSessionWinrate").textContent =
    bestSessionRate.toFixed(1)+"%";

    // ======================================================
    // BEST ENTRY MODEL
    // ======================================================

    let bestModel="";

    let bestModelRate=0;

    Object.entries(modelStats).forEach(([model,data])=>{

        const rate=(data.wins/data.trades)*100;

        if(rate>bestModelRate){

            bestModelRate=rate;

            bestModel=model;

        }

    });

    document.getElementById("bestModel").textContent =
    bestModel || "-";

    document.getElementById("bestModelWinrate").textContent =
    bestModelRate.toFixed(1)+"%";

    // ======================================================
    // CONTINUE
    // ======================================================

    buildCharts(pairStats,sessionStats,modelStats);

}
// ======================================================
// PERFORMANCE ANALYSIS
// ======================================================

function calculatePerformance(){

    const pairStats = {};

    const sessionStats = {};

    const modelStats = {};

    trades.forEach(trade=>{

        // ==========================
        // PAIRS
        // ==========================

        if(!pairStats[trade.pair]){

            pairStats[trade.pair]={

                profit:0,

                wins:0,

                trades:0

            };

        }

        pairStats[trade.pair].profit += Number(trade.profit||0);

        pairStats[trade.pair].trades++;

        if(trade.result==="Win"){

            pairStats[trade.pair].wins++;

        }

        // ==========================
        // SESSION
        // ==========================

        if(!sessionStats[trade.session]){

            sessionStats[trade.session]={

                profit:0,

                wins:0,

                trades:0

            };

        }

        sessionStats[trade.session].profit += Number(trade.profit||0);

        sessionStats[trade.session].trades++;

        if(trade.result==="Win"){

            sessionStats[trade.session].wins++;

        }

        // ==========================
        // ENTRY MODEL
        // ==========================

        if(!modelStats[trade.entryModel]){

            modelStats[trade.entryModel]={

                profit:0,

                wins:0,

                trades:0

            };

        }

        modelStats[trade.entryModel].profit += Number(trade.profit||0);

        modelStats[trade.entryModel].trades++;

        if(trade.result==="Win"){

            modelStats[trade.entryModel].wins++;

        }

    });

    // ======================================================
    // BEST / WORST PAIR
    // ======================================================

    const pairArray = Object.entries(pairStats);

    pairArray.sort((a,b)=>b[1].profit-a[1].profit);

    if(pairArray.length){

        document.getElementById("bestPair").textContent = pairArray[0][0];

        document.getElementById("bestPairProfit").textContent =
        "$"+pairArray[0][1].profit.toFixed(2);

        const last = pairArray[pairArray.length-1];

        document.getElementById("worstPair").textContent = last[0];

        document.getElementById("worstPairProfit").textContent =
        "$"+last[1].profit.toFixed(2);

    }

    // ======================================================
    // BEST SESSION
    // ======================================================

    let bestSession="";

    let bestSessionRate=0;

    Object.entries(sessionStats).forEach(([session,data])=>{

        const rate=(data.wins/data.trades)*100;

        if(rate>bestSessionRate){

            bestSessionRate=rate;

            bestSession=session;

        }

    });

    document.getElementById("bestSession").textContent = bestSession || "-";

    document.getElementById("bestSessionWinrate").textContent =
    bestSessionRate.toFixed(1)+"%";

    // ======================================================
    // BEST ENTRY MODEL
    // ======================================================

    let bestModel="";

    let bestModelRate=0;

    Object.entries(modelStats).forEach(([model,data])=>{

        const rate=(data.wins/data.trades)*100;

        if(rate>bestModelRate){

            bestModelRate=rate;

            bestModel=model;

        }

    });

    document.getElementById("bestModel").textContent =
    bestModel || "-";

    document.getElementById("bestModelWinrate").textContent =
    bestModelRate.toFixed(1)+"%";

    // ======================================================
    // CONTINUE
    // ======================================================

    buildCharts(pairStats,sessionStats,modelStats);

}// ======================================================
// BUILD CHARTS
// ======================================================

function buildCharts(pairStats, sessionStats, modelStats){

// ===============================
// EQUITY CURVE
// ===============================

const equityLabels=[];

const equityData=[];

let running=0;

trades.forEach((trade,index)=>{

    equityLabels.push(index+1);

    running+=Number(trade.profit||0);

    equityData.push(running);

});

if(document.getElementById("equityChart")){

new Chart(document.getElementById("equityChart"),{

type:"line",

data:{

labels:equityLabels,

datasets:[{

label:"Equity",

data:equityData,

borderWidth:3,

tension:.3

}]

}

});

}

// ===============================
// MONTHLY PERFORMANCE
// ===============================

const monthly={};

trades.forEach(trade=>{

if(!trade.tradeDate) return;

const month=trade.tradeDate.substring(0,7);

monthly[month]=(monthly[month]||0)+Number(trade.profit||0);

});

if(document.getElementById("monthlyChart")){

new Chart(document.getElementById("monthlyChart"),{

type:"bar",

data:{

labels:Object.keys(monthly),

datasets:[{

label:"Profit",

data:Object.values(monthly)

}]

}

});

}

// ===============================
// PAIR PERFORMANCE
// ===============================

if(document.getElementById("pairChart")){

new Chart(document.getElementById("pairChart"),{

type:"bar",

data:{

labels:Object.keys(pairStats),

datasets:[{

label:"Profit",

data:Object.values(pairStats).map(x=>x.profit)

}]

}

});

}

// ===============================
// SESSION PERFORMANCE
// ===============================

if(document.getElementById("sessionChart")){

new Chart(document.getElementById("sessionChart"),{

type:"bar",

data:{

labels:Object.keys(sessionStats),

datasets:[{

label:"Profit",

data:Object.values(sessionStats).map(x=>x.profit)

}]

}

});

}

// ===============================
// ENTRY MODELS
// ===============================

if(document.getElementById("modelChart")){

new Chart(document.getElementById("modelChart"),{

type:"bar",

data:{

labels:Object.keys(modelStats),

datasets:[{

label:"Profit",

data:Object.values(modelStats).map(x=>x.profit)

}]

}

});

}

// ===============================
// WIN / LOSS
// ===============================

const wins=trades.filter(t=>t.result==="Win").length;

const losses=trades.filter(t=>t.result==="Loss").length;

const be=trades.filter(t=>t.result==="Break Even").length;

if(document.getElementById("resultChart")){

new Chart(document.getElementById("resultChart"),{

type:"pie",

data:{

labels:["Wins","Losses","Break Even"],

datasets:[{

data:[wins,losses,be]

}]

}

});

}

// Continue

buildPsychologyCharts();

}