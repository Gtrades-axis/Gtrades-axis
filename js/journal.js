/* ==========================================================
GTRADES AXIS™
PROFESSIONAL JOURNAL
PART 1
========================================================== */

const STORAGE_KEY = "gtradesJournal";

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
========================================================== */

function initializeForm(){

    const form = document.getElementById("tradeForm");

    if(!form) return;

    form.addEventListener("submit", saveTrade);

}

/* ==========================================================
LOCAL STORAGE
========================================================== */

function loadTrades(){

    const saved = localStorage.getItem(STORAGE_KEY);

    trades = saved ? JSON.parse(saved) : [];

}

function saveStorage(){

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(trades)

    );

}

/* ==========================================================
CREATE TRADE
========================================================== */

function saveTrade(e){

    e.preventDefault();

    const trade = {

        id: Date.now(),

        status: "Pending",

        created: new Date().toISOString(),

        closed: null,

        info:{

            date:value("tradeDate"),

            time:value("tradeTime"),

            pair:value("pair"),

            direction:value("direction"),

            session:value("session"),

            broker:value("broker"),

            account:value("account"),

            lotSize:Number(value("lotSize"))||0

        },

        htf:{

            swingBias:value("htfSwingBias"),

            swingStructure:value("htfSwingStructure"),

            swingBos:value("htfSwingBos"),

            swingPoi:value("htfSwingPoi"),

            internalBias:value("htfInternalBias"),

            internalStructure:value("htfInternalStructure"),

            internalPoi:value("htfInternalPoi")

        },

        mtf:{

            swingBias:value("mtfSwingBias"),

            swingStructure:value("mtfSwingStructure"),

            swingBos:value("mtfSwingBos"),

            swingPoi:value("mtfSwingPoi"),

            internalBias:value("mtfInternalBias"),

            internalStructure:value("mtfInternalStructure"),

            internalPoi:value("mtfInternalPoi")

        },

        ltf:{

            bias:value("ltfBias"),

            shift:value("ltfShift"),

            liquidity:value("ltfLiquidity"),

            poi:value("ltfPoi"),

            model:value("entryModel"),

            confirmation:value("entryConfirmation"),

            quality:value("executionQuality"),

            valid:value("tradeValid")

        },

        confluences:getConfluences(),

        risk:{

            entry:Number(value("entryPrice"))||0,

            sl:Number(value("stopLoss"))||0,

            tp:Number(value("takeProfit"))||0,

            risk:Number(value("riskPercent"))||0,

            expectedRR:Number(value("expectedRR"))||0

        },

        result:{

            outcome:null,

            profit:0,

            commission:0,

            actualRR:0

        },

        psychology:null,

        review:null

    };

    trades.unshift(trade);

    saveStorage();

    form.reset();

    loadDashboard();

    loadRecentTrades();

    alert("Trade saved as Pending.");

}

/* ==========================================================
HELPERS
========================================================== */

function value(id){

    const el=document.getElementById(id);

    return el ? el.value : "";

}

function getConfluences(){

    return{

        htfSwing:checked("confHTFSwing"),

        htfInternal:checked("confHTFInternal"),

        mtfSwing:checked("confMTFSwing"),

        mtfInternal:checked("confMTFInternal"),

        htfDemand:checked("confHTFDemand"),

        htfSupply:checked("confHTFSupply"),

        mtfDemand:checked("confMTFDemand"),

        mtfSupply:checked("confMTFSupply"),

        premium:checked("confPremium"),

        discount:checked("confDiscount"),

        sweep:checked("confSweep"),

        choch:checked("confChoch"),

        bos:checked("confBos"),

        mitigation:checked("confMitigation"),

        refined:checked("confRefined"),

        extreme:checked("confExtreme")

    };

}

function checked(id){

    const el=document.getElementById(id);

    return el ? el.checked : false;

}
/* ==========================================================
LOAD DASHBOARD
========================================================== */

function loadDashboard(){

    const closed = trades.filter(

        trade => trade.status === "Closed"

    );

    const wins = closed.filter(

        trade => trade.result.outcome === "Win"

    );

    const losses = closed.filter(

        trade => trade.result.outcome === "Loss"

    );

    const pending = trades.filter(

        trade => trade.status === "Pending"

    );

    const totalTrades = closed.length;

    const totalWins = wins.length;

    const totalLosses = losses.length;

    const winRate = totalTrades === 0

        ? 0

        : ((totalWins / totalTrades) * 100);

    const netProfit = closed.reduce(

        (sum, trade)=>{

            return sum +

            Number(trade.result.profit||0) -

            Number(trade.result.commission||0);

        },0

    );

    const averageRR = totalTrades===0

        ?0

        :closed.reduce(

            (sum,trade)=>{

                return sum +

                Number(trade.result.actualRR||0);

            },0

        )/totalTrades;

    setText("totalTrades",totalTrades);

    setText("wins",totalWins);

    setText("losses",totalLosses);

    setText("winRate",winRate.toFixed(1)+"%");

    setText("averageRR",averageRR.toFixed(2));

    setText("netProfit","$"+netProfit.toFixed(2));

    setText("pendingTrades",pending.length);

    calculatePerformance(closed);

}

/* ==========================================================
PERFORMANCE
========================================================== */

function calculatePerformance(closed){

    if(closed.length===0){

        setText("bestPair","-");

        setText("worstPair","-");

        setText("bestSession","-");

        setText("winStreak","0");

        return;

    }

    const pairStats={};

    const sessionStats={};

    let streak=0;

    let bestStreak=0;

    closed.forEach(trade=>{

        const pair=trade.info.pair;

        const session=trade.info.session;

        if(!pairStats[pair])

            pairStats[pair]=0;

        pairStats[pair]+=Number(trade.result.profit||0);

        if(!sessionStats[session])

            sessionStats[session]=0;

        sessionStats[session]+=Number(trade.result.profit||0);

        if(trade.result.outcome==="Win"){

            streak++;

            if(streak>bestStreak)

                bestStreak=streak;

        }else{

            streak=0;

        }

    });

    const bestPair=

        Object.keys(pairStats)

        .sort((a,b)=>pairStats[b]-pairStats[a])[0];

    const worstPair=

        Object.keys(pairStats)

        .sort((a,b)=>pairStats[a]-pairStats[b])[0];

    const bestSession=

        Object.keys(sessionStats)

        .sort((a,b)=>sessionStats[b]-sessionStats[a])[0];

    setText("bestPair",bestPair);

    setText("worstPair",worstPair);

    setText("bestSession",bestSession);

    setText("winStreak",bestStreak);

}

/* ==========================================================
RECENT TRADES
========================================================== */

function loadRecentTrades(){

    const container=

    document.getElementById(

        "recentTrades"

    );

    if(!container) return;

    if(trades.length===0){

        container.innerHTML=`

        <div class="loading-card">

        No trades yet.

        </div>

        `;

        return;

    }

    container.innerHTML="";

    trades.slice(0,8).forEach(trade=>{

        container.innerHTML+=`

        <div class="trade-row">

            <div>

                <strong>${trade.info.pair}</strong>

                <br>

                ${trade.info.direction}

            </div>

            <div>

                ${trade.ltf.model}

            </div>

            <div>

                <span class="status ${trade.status.toLowerCase()}">

                ${trade.status}

                </span>

            </div>

            <div>

                <button

                onclick="editTrade(${trade.id})"

                class="btn">

                Edit

                </button>

            </div>

        </div>

        `;

    });

}

function setText(id,text){

    const el=document.getElementById(id);

    if(el)

        el.textContent=text;

}
/* ==========================================================
EDIT TRADE
========================================================== */

function editTrade(id){

    const trade = trades.find(t => t.id === id);

    if(!trade) return;

    if(trade.status === "Closed"){

        viewTrade(trade);

        return;

    }

    const outcome = prompt(

        "Result?\n\nWin\nLoss\nBreak Even"

    );

    if(!outcome) return;

    const profit = Number(

        prompt("Profit/Loss ($)",0)

    ) || 0;

    const commission = Number(

        prompt("Commission ($)",0)

    ) || 0;

    const rr = Number(

        prompt("Actual RR",0)

    ) || 0;

    const management = prompt(

        "Management Quality\nExcellent\nGood\nAverage\nPoor"

    );

    const psychology = prompt(

        "Psychology Notes"

    );

    const lesson = prompt(

        "Lesson Learned"

    );

    const improvement = prompt(

        "Improvement"

    );

    trade.status = "Closed";

    trade.closed = new Date().toISOString();

    trade.result = {

        outcome,

        profit,

        commission,

        actualRR: rr

    };

    trade.management = management;

    trade.psychology = psychology;

    trade.review = {

        lesson,

        improvement

    };

    saveStorage();

    loadDashboard();

    loadRecentTrades();

    initializeCharts();

    alert("Trade Closed Successfully.");

}

/* ==========================================================
VIEW TRADE
========================================================== */

function viewTrade(trade){

    alert(

`PAIR : ${trade.info.pair}

STATUS : ${trade.status}

RESULT : ${trade.result.outcome}

PROFIT : $${trade.result.profit}

RR : ${trade.result.actualRR}

LESSON :

${trade.review?.lesson || "-"}

IMPROVEMENT :

${trade.review?.improvement || "-"}`

    );

}

/* ==========================================================
CHARTS
========================================================== */

function initializeCharts(){

    if(typeof Chart==="undefined") return;

    buildEquityChart();

    buildMonthlyChart();

}

function buildEquityChart(){

    const canvas=document.getElementById("equityChart");

    if(!canvas) return;

    const closed=trades.filter(

        t=>t.status==="Closed"

    );

    let balance=0;

    const data=[];

    closed.forEach(t=>{

        balance+=

        Number(t.result.profit||0)-

        Number(t.result.commission||0);

        data.push(balance);

    });

    new Chart(canvas,{

        type:"line",

        data:{

            labels:data.map((_,i)=>i+1),

            datasets:[{

                label:"Equity",

                data

            }]

        },

        options:{

            responsive:true,

            maintainAspectRatio:false

        }

    });

}

function buildMonthlyChart(){

    const canvas=document.getElementById("monthlyChart");

    if(!canvas) return;

    const monthly={};

    trades

    .filter(t=>t.status==="Closed")

    .forEach(t=>{

        const month=new Date(

            t.closed

        ).toLocaleString(

            "default",

            {month:"short"}

        );

        if(!monthly[month])

            monthly[month]=0;

        monthly[month]+=

        Number(t.result.profit||0)-

        Number(t.result.commission||0);

    });

    new Chart(canvas,{

        type:"bar",

        data:{

            labels:Object.keys(monthly),

            datasets:[{

                label:"Monthly",

                data:Object.values(monthly)

            }]

        },

        options:{

            responsive:true,

            maintainAspectRatio:false

        }

    });

}

/* ==========================================================
END
========================================================== */