<!-- =============================
SAVE BUTTONS
============================= -->

<section class="latest-card">

<h2>

Complete Trade

</h2>

<div class="save-section">

<button
type="submit"
class="btn btn-primary"
id="saveTrade">

<i class="fa-solid fa-floppy-disk"></i>

Save Trade

</button>

<button
type="reset"
class="btn btn-secondary">

<i class="fa-solid fa-rotate-left"></i>

Reset Form

</button>

<a
href="../journal.html"
class="btn btn-secondary">

<i class="fa-solid fa-arrow-left"></i>

Cancel

</a>

</div>

</section>

</form>

</main>

</div>

<!-- =============================
SCRIPTS
============================= -->

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<script type="module">

import { auth } from "../js/firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

onAuthStateChanged(auth, (user)=>{

if(!user){

window.location.href="../login.html";

}

});

</script>

<script type="module" src="../js/journal.js"></script>

</body>

</html>
// ======================================================
// SAVE TRADE
// PART 2
// ======================================================

if (tradeForm) {

    tradeForm.addEventListener("submit", saveTrade);

}

async function saveTrade(e) {

    e.preventDefault();

    try {

        // ==========================
        // BASIC INFORMATION
        // ==========================

        const trade = {

            tradeDate: value("tradeDate"),
            tradeTime: value("tradeTime"),

            pair: upper(value("pair")),

            direction: value("direction"),

            setup: value("setup"),

            broker: value("broker"),

            account: value("account"),

            challenge: value("challenge"),

            session: value("session"),

            day: value("day"),

            news: value("news"),

            // ==========================
            // HTF
            // ==========================

            htfTrend: value("htfTrend"),
            htfSwing: value("htfSwing"),
            htfInternal: value("htfInternal"),
            htfPOI: value("htfPOI"),

            // ==========================
            // MTF
            // ==========================

            mtfTrend: value("mtfTrend"),
            mtfSwing: value("mtfSwing"),
            mtfInternal: value("mtfInternal"),
            mtfPOI: value("mtfPOI"),

            // ==========================
            // LTF
            // ==========================

            ltfTrend: value("ltfTrend"),
            ltfSwing: value("ltfSwing"),
            ltfInternal: value("ltfInternal"),

            entryTrigger: value("entryTrigger"),

            entryConfirmation: value("entryConfirmation"),

            marketCondition: value("marketCondition"),

            // ==========================
            // PRICES
            // ==========================

            entry: number("entry"),

            sl: number("sl"),

            tp: number("tp"),

            risk: number("risk"),

            lotSize: number("lotSize"),

            rr: number("rr"),

            expectedProfit: number("expectedProfit"),

            profit: number("profit"),

            profitPercent: number("profitPercent"),

            // ==========================
            // MANAGEMENT
            // ==========================

            partialTaken: value("partialTaken"),

            moveBE: value("moveBE"),

            trailingStop: value("trailingStop"),

            exitReason: value("exitReason"),

            result: value("result"),

            holdingTime: number("holdingTime"),

            // ==========================
            // PSYCHOLOGY
            // ==========================

            emotionBefore: value("emotionBefore"),

            emotionAfter: value("emotionAfter"),

            discipline: value("discipline"),

            followedPlan: value("followedPlan"),

            mistake: value("mistake"),

            execution: value("execution"),

            // ==========================
            // NOTES
            // ==========================

            tradeReason: value("tradeReason"),

            executionNotes: value("executionNotes"),

            lesson: value("lesson"),

            improvement: value("improvement"),

            // ==========================
            // META
            // ==========================

            createdAt: Timestamp.now(),

            user: currentUser.uid

        };

        // ==========================
        // VALIDATION
        // ==========================

        if (!trade.tradeDate) {

            alert("Select Trade Date");

            return;

        }

        if (!trade.pair) {

            alert("Enter Pair");

            return;

        }

        if (!trade.direction) {

            alert("Select Direction");

            return;

        }

        if (trade.entry === 0) {

            alert("Entry Price Missing");

            return;

        }

        if (trade.sl === 0) {

            alert("Stop Loss Missing");

            return;

        }

        if (trade.tp === 0) {

            alert("Take Profit Missing");

            return;

        }

        // ==========================
        // SAVE
        // ==========================

        await addDoc(tradeCollection, trade);

        alert("Trade Saved Successfully!");

        tradeForm.reset();

        await initializeJournal();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}

// ======================================================
// HELPERS
// ======================================================

function value(id) {

    const el = document.getElementById(id);

    if (!el) return "";

    return el.value.trim();

}

function number(id) {

    const el = document.getElementById(id);

    if (!el) return 0;

    return Number(el.value) || 0;

}

function upper(text) {

    return text.toUpperCase();

}
// ======================================================
// HISTORY
// PART 3
// ======================================================

const historyContainer = document.getElementById("tradeHistory");

const searchInput = document.getElementById("tradeSearch");

const filterPair = document.getElementById("filterPair");

const filterSession = document.getElementById("filterSession");

const filterResult = document.getElementById("filterResult");


// =======================================
// LOAD HISTORY
// =======================================

function renderHistory(data = trades) {

    if (!historyContainer) return;

    historyContainer.innerHTML = "";

    if (data.length === 0) {

        historyContainer.innerHTML =

        "<p>No trades found.</p>";

        return;

    }

    data.forEach(trade => {

        const card = document.createElement("div");

        card.className = "history-card";

        card.innerHTML = `

        <div class="history-header">

            <h3>${trade.pair}</h3>

            <span>${trade.direction}</span>

        </div>

        <div class="history-body">

            <p><strong>Date:</strong> ${trade.tradeDate}</p>

            <p><strong>Session:</strong> ${trade.session}</p>

            <p><strong>Result:</strong> ${trade.result}</p>

            <p><strong>RR:</strong> ${trade.rr}</p>

            <p><strong>Profit:</strong> ${trade.profit}</p>

        </div>

        <div class="history-actions">

            <button class="editTrade"

                data-id="${trade.id}">

                Edit

            </button>

            <button class="deleteTrade"

                data-id="${trade.id}">

                Delete

            </button>

        </div>

        `;

        historyContainer.appendChild(card);

    });

    attachButtons();

}


// =======================================
// SEARCH
// =======================================

if (searchInput) {

searchInput.addEventListener("input", () => {

const text = searchInput.value.toLowerCase();

const filtered = trades.filter(t =>

t.pair.toLowerCase().includes(text) ||

t.session.toLowerCase().includes(text) ||

t.setup.toLowerCase().includes(text)

);

renderHistory(filtered);

});

}


// =======================================
// FILTERS
// =======================================

function applyFilters() {

let filtered = [...trades];

if (filterPair && filterPair.value !== "") {

filtered = filtered.filter(

t => t.pair === filterPair.value

);

}

if (filterSession && filterSession.value !== "") {

filtered = filtered.filter(

t => t.session === filterSession.value

);

}

if (filterResult && filterResult.value !== "") {

filtered = filtered.filter(

t => t.result === filterResult.value

);

}

renderHistory(filtered);

}

if (filterPair)

filterPair.addEventListener("change", applyFilters);

if (filterSession)

filterSession.addEventListener("change", applyFilters);

if (filterResult)

filterResult.addEventListener("change", applyFilters);


// =======================================
// DELETE TRADE
// =======================================

async function removeTrade(id){

const confirmDelete=

confirm("Delete this trade?");

if(!confirmDelete)return;

try{

await deleteDoc(

doc(db,

"users",

currentUser.uid,

"trades",

id)

);

await initializeJournal();

}

catch(error){

console.error(error);

alert(error.message);

}

}


// =======================================
// EDIT BUTTON
// =======================================

function attachButtons(){

document.querySelectorAll(".deleteTrade")

.forEach(btn=>{

btn.onclick=()=>{

removeTrade(btn.dataset.id);

};

});

document.querySelectorAll(".editTrade")

.forEach(btn=>{

btn.onclick=()=>{

editTrade(btn.dataset.id);

};

});


// =======================================
// INITIALIZE HISTORY
// =======================================

renderHistory();
// ======================================================
// DASHBOARD
// PART 4
// ======================================================

// ======================================
// UPDATE DASHBOARD
// ======================================

function updateDashboard() {

    if (trades.length === 0) return;

    let total = trades.length;

    let winCount = 0;

    let lossCount = 0;

    let totalProfit = 0;

    let totalRR = 0;

    let pairStats = {};

    let sessionStats = {};

    let streak = 0;

    let currentStreak = 0;

    trades.forEach(trade => {

        // Wins / Losses

        if (trade.result === "Win") {

            winCount++;

            currentStreak++;

        } else if (trade.result === "Loss") {

            lossCount++;

            currentStreak = 0;

        }

        streak = Math.max(streak, currentStreak);

        // Profit

        totalProfit += Number(trade.profit || 0);

        // RR

        totalRR += Number(trade.rr || 0);

        // Pair

        if (!pairStats[trade.pair]) {

            pairStats[trade.pair] = 0;

        }

        pairStats[trade.pair] += Number(trade.profit || 0);

        // Session

        if (!sessionStats[trade.session]) {

            sessionStats[trade.session] = 0;

        }

        sessionStats[trade.session] += Number(trade.profit || 0);

    });

    // Cards

    if (totalTrades) totalTrades.textContent = total;

    if (wins) wins.textContent = winCount;

    if (losses) losses.textContent = lossCount;

    if (winRate)

        winRate.textContent =

        ((winCount / total) * 100).toFixed(1) + "%";

    if (averageRR)

        averageRR.textContent =

        (totalRR / total).toFixed(2);

    if (netProfit)

        netProfit.textContent =

        "$" + totalProfit.toFixed(2);

    if (winStreak)

        winStreak.textContent = streak;

    // Best Pair

    if (bestPair) {

        let best = "-";

        let highest = -999999;

        Object.entries(pairStats).forEach(([pair, value]) => {

            if (value > highest) {

                highest = value;

                best = pair;

            }

        });

        bestPair.textContent = best;

    }

    // Worst Pair

    if (worstPair) {

        let worst = "-";

        let lowest = 999999;

        Object.entries(pairStats).forEach(([pair, value]) => {

            if (value < lowest) {

                lowest = value;

                worst = pair;

            }

        });

        worstPair.textContent = worst;

    }

    // Best Session

    if (bestSession) {

        let best = "-";

        let highest = -999999;

        Object.entries(sessionStats).forEach(([session, value]) => {

            if (value > highest) {

                highest = value;

                best = session;

            }

        });

        bestSession.textContent = best;

    }

    drawCharts();

}

// ======================================
// CHARTS
// ======================================

function drawCharts() {

    if (!document.getElementById("equityChart")) return;

    const labels = [];

    const equity = [];

    let running = 0;

    trades
        .slice()
        .reverse()
        .forEach(trade => {

            labels.push(trade.tradeDate);

            running += Number(trade.profit || 0);

            equity.push(running);

        });

    new Chart(

        document.getElementById("equityChart"),

        {

            type: "line",

            data: {

                labels,

                datasets: [{

                    label: "Equity",

                    data: equity,

                    tension: .3

                }]

            }

        }

    );

}

// ======================================
// AI REVIEW
// ======================================

function buildAIReview() {

    const review = document.getElementById("journalInsights");

    if (!review) return;

    review.innerHTML = "";

    review.innerHTML += `<li>Total Trades: ${trades.length}</li>`;

    review.innerHTML += `<li>Keep following HTF bias.</li>`;

    review.innerHTML += `<li>Focus on your best trading session.</li>`;

    review.innerHTML += `<li>Review all losing trades weekly.</li>`;

}

// ======================================
// REFRESH
// ======================================

async function refreshJournal(){

    await loadTrades();

    renderHistory();

    loadRecentTrades();

    updateDashboard();

    buildAIReview();

}

// ======================================
// START
// ======================================

refreshJournal();

console.log("GTRADES-AXIS Journal Loaded Successfully.");
// ======================================================
// PART 5
// EDIT TRADE
// ======================================================

let editingTradeId = null;


// ======================================
// OPEN EDIT MODAL
// ======================================

async function editTrade(id){

    editingTradeId = id;

    const trade = trades.find(t => t.id === id);

    if(!trade) return;

    const modal = document.getElementById("editModal");

    if(modal){

        modal.style.display = "flex";

    }

    setEditValue("editPair", trade.pair);

    setEditValue("editDirection", trade.direction);

    setEditValue("editEntry", trade.entry);

    setEditValue("editSL", trade.sl);

    setEditValue("editTP", trade.tp);

    setEditValue("editRR", trade.rr);

    setEditValue("editProfit", trade.profit);

    setEditValue("editResult", trade.result);

}


// ======================================
// HELPER
// ======================================

function setEditValue(id,value){

    const el=document.getElementById(id);

    if(el){

        el.value=value;

    }

}


// ======================================
// CLOSE MODAL
// ======================================

const closeModal=document.getElementById("closeModal");

const cancelEdit=document.getElementById("cancelEdit");

if(closeModal){

closeModal.onclick=()=>{

document.getElementById("editModal").style.display="none";

};

}

if(cancelEdit){

cancelEdit.onclick=()=>{

document.getElementById("editModal").style.display="none";

};

}


// ======================================
// SAVE EDIT
// ======================================

const editTradeForm=document.getElementById("editTradeForm");

if(editTradeForm){

editTradeForm.addEventListener("submit",saveEdit);

}

async function saveEdit(e){

e.preventDefault();

try{

await updateDoc(

doc(

db,

"users",

currentUser.uid,

"trades",

editingTradeId

),

{

pair:value("editPair"),

direction:value("editDirection"),

entry:number("editEntry"),

sl:number("editSL"),

tp:number("editTP"),

rr:number("editRR"),

profit:number("editProfit"),

result:value("editResult")
beforeEntry: value("beforeEntry"),
duringTrade: value("duringTrade"),
afterExit: value("afterExit"),
}

);

document.getElementById("editModal").style.display="none";

await refreshJournal();

alert("Trade Updated Successfully.");

}

catch(error){

console.error(error);

alert(error.message);

}

}
// ======================================================
// PART 6
// PDF + EXCEL EXPORT
// ======================================================

// ======================================
// PDF EXPORT
// ======================================

const exportPDF = document.getElementById("exportPDF");

if (exportPDF) {

    exportPDF.addEventListener("click", generatePDF);

}

async function generatePDF() {

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF();

    pdf.setFont("helvetica");

    pdf.setFontSize(18);

    pdf.text("GTRADES-AXIS™", 15, 20);

    pdf.setFontSize(12);

    pdf.text("Professional Trading Journal Report", 15, 30);

    pdf.line(15, 34, 195, 34);

    pdf.text("Total Trades : " + trades.length, 15, 45);

    let winsCount = trades.filter(t => t.result === "Win").length;

    let lossesCount = trades.filter(t => t.result === "Loss").length;

    let beCount = trades.filter(t => t.result === "Break Even").length;

    pdf.text("Wins : " + winsCount, 15, 55);

    pdf.text("Losses : " + lossesCount, 15, 63);

    pdf.text("Break Even : " + beCount, 15, 71);

    let profit = 0;

    trades.forEach(t => {

        profit += Number(t.profit || 0);

    });

    pdf.text("Net Profit : $" + profit.toFixed(2), 15, 82);

    let y = 100;

    pdf.setFontSize(10);

    pdf.text("DATE", 10, y);

    pdf.text("PAIR", 40, y);

    pdf.text("DIR", 70, y);

    pdf.text("RR", 90, y);

    pdf.text("RESULT", 110, y);

    pdf.text("PROFIT", 150, y);

    y += 8;

    trades.forEach(trade => {

        if (y > 280) {

            pdf.addPage();

            y = 20;

        }

        pdf.text(String(trade.tradeDate), 10, y);

        pdf.text(String(trade.pair), 40, y);

        pdf.text(String(trade.direction), 70, y);

        pdf.text(String(trade.rr), 90, y);

        pdf.text(String(trade.result), 110, y);

        pdf.text("$" + Number(trade.profit || 0).toFixed(2), 150, y);

        y += 7;

    });

    pdf.save("GTRADES-AXIS-Journal.pdf");

}


// ======================================
// EXCEL EXPORT
// ======================================

const exportExcel = document.getElementById("exportExcel");

if (exportExcel) {

    exportExcel.addEventListener("click", generateExcel);

}

function generateExcel() {

    let rows = [];

    trades.forEach(trade => {

        rows.push({

            Date: trade.tradeDate,

            Time: trade.tradeTime,

            Pair: trade.pair,

            Direction: trade.direction,

            Setup: trade.setup,

            Session: trade.session,

            Entry: trade.entry,

            SL: trade.sl,

            TP: trade.tp,

            RR: trade.rr,

            Result: trade.result,

            Profit: trade.profit,

            Psychology: trade.emotionBefore,

            Discipline: trade.discipline,

            Lesson: trade.lesson

        });

    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(

        workbook,

        worksheet,

        "Trading Journal"

    );

    XLSX.writeFile(

        workbook,

        "GTRADES-AXIS-Journal.xlsx"

    );

}


// ======================================
// REFRESH HISTORY
// ======================================

const refreshHistory = document.getElementById("refreshHistory");

if (refreshHistory) {

    refreshHistory.addEventListener("click", async () => {

        await refreshJournal();

        alert("History Updated.");

    });

}
// ======================================================
// PART 8
// ADVANCED ANALYTICS
// ======================================================

calculateAnalytics();

calculateAdvancedMetrics();

buildTradingCoach();

calculateProfessionalMetrics();

    if(!trades.length) return;

    const analytics={

        total:trades.length,

        wins:0,

        losses:0,

        breakEven:0,

        profit:0,

        rr:0,

        pairs:{},

        sessions:{},

        weekdays:{},

        setups:{}

    };

    trades.forEach(trade=>{

        const result=(trade.result||"").toLowerCase();

        if(result==="win") analytics.wins++;

        else if(result==="loss") analytics.losses++;

        else analytics.breakEven++;

        analytics.profit+=Number(trade.profit||0);

        analytics.rr+=Number(trade.rr||0);

        // Pair Stats
        if(!analytics.pairs[trade.pair]){

            analytics.pairs[trade.pair]={

                trades:0,

                wins:0,

                profit:0

            };

        }

        analytics.pairs[trade.pair].trades++;

        analytics.pairs[trade.pair].profit+=Number(trade.profit||0);

        if(result==="win"){

            analytics.pairs[trade.pair].wins++;

        }

        // Session Stats

        if(!analytics.sessions[trade.session]){

            analytics.sessions[trade.session]={

                trades:0,

                wins:0,

                profit:0

            };

        }

        analytics.sessions[trade.session].trades++;

        analytics.sessions[trade.session].profit+=Number(trade.profit||0);

        if(result==="win"){

            analytics.sessions[trade.session].wins++;

        }

        // Weekday

        if(trade.tradeDate){

            const d=new Date(trade.tradeDate);

            const day=d.toLocaleDateString(

                "en-US",

                {

                    weekday:"long"

                }

            );

            if(!analytics.weekdays[day]){

                analytics.weekdays[day]={

                    trades:0,

                    profit:0

                };

            }

            analytics.weekdays[day].trades++;

            analytics.weekdays[day].profit+=Number(trade.profit||0);

        }

        // Setup

        if(!analytics.setups[trade.setup]){

            analytics.setups[trade.setup]={

                trades:0,

                wins:0

            };

        }

        analytics.setups[trade.setup].trades++;

        if(result==="win"){

            analytics.setups[trade.setup].wins++;

        }

    });

    analytics.winRate=

    ((analytics.wins/analytics.total)*100).toFixed(1);

    analytics.avgRR=

    (analytics.rr/analytics.total).toFixed(2);

    displayAnalytics(analytics);
    // ======================================================
// PART 8.2
// DISPLAY ANALYTICS
// ======================================================

function displayAnalytics(analytics){

    setText("totalTrades", analytics.total);

    setText("wins", analytics.wins);

    setText("losses", analytics.losses);

    setText("winRate", analytics.winRate + "%");

    setText("averageRR", analytics.avgRR);

    setText("netProfit", "$" + analytics.profit.toFixed(2));

    // ==========================
    // BEST PAIR
    // ==========================

    let bestPair="-";

    let bestPairProfit=-999999;

    Object.keys(analytics.pairs).forEach(pair=>{

        if(analytics.pairs[pair].profit>bestPairProfit){

            bestPairProfit=analytics.pairs[pair].profit;

            bestPair=pair;

        }

    });

    setText("bestPair",bestPair);

    // ==========================
    // WORST PAIR
    // ==========================

    let worstPair="-";

    let worstPairProfit=999999;

    Object.keys(analytics.pairs).forEach(pair=>{

        if(analytics.pairs[pair].profit<worstPairProfit){

            worstPairProfit=analytics.pairs[pair].profit;

            worstPair=pair;

        }

    });

    setText("worstPair",worstPair);

    // ==========================
    // BEST SESSION
    // ==========================

    let bestSession="-";

    let bestSessionProfit=-999999;

    Object.keys(analytics.sessions).forEach(session=>{

        if(analytics.sessions[session].profit>bestSessionProfit){

            bestSessionProfit=analytics.sessions[session].profit;

            bestSession=session;

        }

    });

    setText("bestSession",bestSession);

    // ==========================
    // WORST SESSION
    // ==========================

    let worstSession="-";

    let worstSessionProfit=999999;

    Object.keys(analytics.sessions).forEach(session=>{

        if(analytics.sessions[session].profit<worstSessionProfit){

            worstSessionProfit=analytics.sessions[session].profit;

            worstSession=session;

        }

    });

    setText("worstSession",worstSession);

    // ==========================
    // BEST WEEKDAY
    // ==========================

    let bestDay="-";

    let bestDayProfit=-999999;

    Object.keys(analytics.weekdays).forEach(day=>{

        if(analytics.weekdays[day].profit>bestDayProfit){

            bestDayProfit=analytics.weekdays[day].profit;

            bestDay=day;

        }

    });

    setText("bestDay",bestDay);

    // ==========================
    // BEST SETUP
    // ==========================

    let bestSetup="-";

    let bestRate=0;

    Object.keys(analytics.setups).forEach(setup=>{

        const s=analytics.setups[setup];

        const rate=(s.wins/s.trades)*100;

        if(rate>bestRate){

            bestRate=rate;

            bestSetup=setup;

        }

    });

    setText("bestSetup",bestSetup);

}


// =====================================
// SMALL HELPER
// =====================================

function setText(id,value){

    const el=document.getElementById(id);

    if(el){

        el.textContent=value;

    }

}

}
// ======================================================
// PART 8.3
// ADVANCED PERFORMANCE METRICS
// ======================================================

function calculateAdvancedMetrics(){

    if(!trades.length) return;

    let grossProfit = 0;
    let grossLoss = 0;

    let largestWin = -Infinity;
    let largestLoss = Infinity;

    let totalWin = 0;
    let totalLoss = 0;

    let winTrades = 0;
    let lossTrades = 0;

    let followedPlan = 0;
    let psychologyScore = 0;
    let executionScore = 0;

    trades.forEach(trade=>{

        const profit = Number(trade.profit || 0);

        if(profit > 0){

            grossProfit += profit;

            totalWin += profit;

            winTrades++;

            if(profit > largestWin)
                largestWin = profit;

        }

        if(profit < 0){

            grossLoss += Math.abs(profit);

            totalLoss += Math.abs(profit);

            lossTrades++;

            if(profit < largestLoss)
                largestLoss = profit;

        }

        if((trade.followedPlan || "").toLowerCase() === "yes")
            followedPlan++;

        if((trade.discipline || "").toLowerCase() === "excellent")
            psychologyScore++;

        if((trade.execution || "").toLowerCase() === "excellent")
            executionScore++;

    });

    // =========================================
    // PROFIT FACTOR
    // =========================================

    const profitFactor = grossLoss === 0
        ? grossProfit
        : grossProfit / grossLoss;

    setText("profitFactor", profitFactor.toFixed(2));

    // =========================================
    // EXPECTANCY
    // =========================================

    const avgWin = winTrades
        ? totalWin / winTrades
        : 0;

    const avgLoss = lossTrades
        ? totalLoss / lossTrades
        : 0;

    const winRate = winTrades / trades.length;

    const lossRate = lossTrades / trades.length;

    const expectancy =
        (winRate * avgWin) -
        (lossRate * avgLoss);

    setText("expectancy",
        "$" + expectancy.toFixed(2));

    // =========================================
    // AVERAGE WIN / LOSS
    // =========================================

    setText(
        "averageWin",
        "$" + avgWin.toFixed(2)
    );

    setText(
        "averageLoss",
        "$" + avgLoss.toFixed(2)
    );

    // =========================================
    // LARGEST WIN / LOSS
    // =========================================

    setText(
        "largestWin",
        largestWin === -Infinity
            ? "$0"
            : "$" + largestWin.toFixed(2)
    );

    setText(
        "largestLoss",
        largestLoss === Infinity
            ? "$0"
            : "$" + largestLoss.toFixed(2)
    );

    // =========================================
    // CONSISTENCY SCORE
    // =========================================

    const consistency = (
        (followedPlan / trades.length) * 100
    );

    setText(
        "consistencyScore",
        consistency.toFixed(0) + "%"
    );

    // =========================================
    // PSYCHOLOGY SCORE
    // =========================================

    const psych = (
        psychologyScore / trades.length
    ) * 100;

    setText(
        "psychologyScore",
        psych.toFixed(0) + "%"
    );

    // =========================================
    // EXECUTION SCORE
    // =========================================

    const execution = (
        executionScore / trades.length
    ) * 100;

    setText(
        "executionScore",
        execution.toFixed(0) + "%"
    );

    // =========================================
    // OVERALL SCORE
    // =========================================

    const overall =
        (
            consistency +
            psych +
            execution
        ) / 3;

    setText(
        "overallScore",
        overall.toFixed(0) + "%"
    );

    buildAIInsights({
        expectancy,
        profitFactor,
        consistency,
        psych,
        execution,
        avgWin,
        avgLoss
    });

}


// ======================================================
// AI INSIGHTS
// ======================================================

function buildAIInsights(stats){

    const list =
        document.getElementById("analyticsInsights") ||
        document.getElementById("coachList") ||
        document.getElementById("finalReview");

    if(!list) return;

    list.innerHTML = "";

    const insights = [];

    if(stats.profitFactor > 1.5)
        insights.push("✅ Excellent profit factor. Your winners are outweighing your losers.");

    if(stats.profitFactor < 1)
        insights.push("⚠ Profit factor is below 1. Reduce unnecessary losses.");

    if(stats.expectancy > 0)
        insights.push("📈 Positive expectancy. Your strategy has a statistical edge.");

    if(stats.expectancy <= 0)
        insights.push("📉 Negative expectancy. Review your entries and risk management.");

    if(stats.consistency < 70)
        insights.push("🎯 Focus on following your trading plan more consistently.");

    if(stats.psych < 70)
        insights.push("🧠 Work on emotional control during live trading.");

    if(stats.execution < 70)
        insights.push("⚡ Improve execution timing and wait for confirmation.");

    if(stats.avgWin > stats.avgLoss)
        insights.push("💰 Your average winner is larger than your average loser. Keep protecting this edge.");

    if(insights.length === 0)
        insights.push("Great work! Keep collecting more trading data for deeper analysis.");

    insights.forEach(item=>{

        const li=document.createElement("li");

        li.textContent=item;

        list.appendChild(li);

    });

}
// ======================================================
// PART 9
// AI TRADING COACH
// ======================================================

function buildTradingCoach(){

    if(!trades.length) return;

    const coach =
        document.getElementById("coachList") ||
        document.getElementById("finalReview") ||
        document.getElementById("analyticsInsights");

    if(!coach) return;

    coach.innerHTML="";

    // ==========================
    // Pair Analysis
    // ==========================

    const pairStats={};

    trades.forEach(t=>{

        if(!pairStats[t.pair]){

            pairStats[t.pair]={

                wins:0,

                losses:0,

                profit:0

            };

        }

        if((t.result||"").toLowerCase()=="win")
            pairStats[t.pair].wins++;

        if((t.result||"").toLowerCase()=="loss")
            pairStats[t.pair].losses++;

        pairStats[t.pair].profit+=Number(t.profit||0);

    });

    let best="-";

    let bestProfit=-99999;

    let worst="-";

    let worstProfit=99999;

    Object.keys(pairStats).forEach(pair=>{

        if(pairStats[pair].profit>bestProfit){

            bestProfit=pairStats[pair].profit;

            best=pair;

        }

        if(pairStats[pair].profit<worstProfit){

            worstProfit=pairStats[pair].profit;

            worst=pair;

        }

    });

    addInsight("🏆 Best Pair: "+best);

    addInsight("⚠ Weakest Pair: "+worst);

    // ==========================
    // Session Analysis
    // ==========================

    const sessions={};

    trades.forEach(t=>{

        if(!sessions[t.session]){

            sessions[t.session]=0;

        }

        sessions[t.session]+=Number(t.profit||0);

    });

    let bestSession="-";

    let bestSessionProfit=-99999;

    Object.keys(sessions).forEach(s=>{

        if(sessions[s]>bestSessionProfit){

            bestSessionProfit=sessions[s];

            bestSession=s;

        }

    });

    addInsight("🌍 Best Session: "+bestSession);

    // ==========================
    // Psychology
    // ==========================

    const mistakes={};

    trades.forEach(t=>{

        if(!t.mistake) return;

        if(!mistakes[t.mistake]){

            mistakes[t.mistake]=0;

        }

        mistakes[t.mistake]++;

    });

    let common="None";

    let highest=0;

    Object.keys(mistakes).forEach(m=>{

        if(mistakes[m]>highest){

            highest=mistakes[m];

            common=m;

        }

    });

    addInsight("🧠 Biggest Mistake: "+common);

    // ==========================
    // Recommendation
    // ==========================

    if(bestProfit>0){

        addInsight(

        "✅ Increase focus on "+best+

        ". It currently produces your highest returns."

        );

    }

    if(worstProfit<0){

        addInsight(

        "❌ Review your "+worst+

        " trades before taking more positions."

        );

    }

    addInsight(

    "📚 Review every losing trade every weekend."

    );

    addInsight(

    "🎯 Continue waiting for HTF + MTF + LTF alignment."

    );

}


// ======================================
// SMALL HELPER
// ======================================

function addInsight(text){

    const list=

    document.getElementById("coachList") ||

    document.getElementById("analyticsInsights") ||

    document.getElementById("finalReview");

    if(!list) return;

    const li=document.createElement("li");

    li.textContent=text;

    list.appendChild(li);

}
// ======================================================
// PART 10
// PROFESSIONAL REPORTS & PROP FIRM ANALYTICS
// ======================================================

function calculateProfessionalMetrics() {

    if (!trades.length) return;

    let consecutiveWins = 0;
    let consecutiveLosses = 0;

    let currentWins = 0;
    let currentLosses = 0;

    let equity = 0;
    let highestEquity = 0;
    let maxDrawdown = 0;

    let monthly = {};

    trades
        .slice()
        .sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate))
        .forEach(trade => {

            const profit = Number(trade.profit || 0);

            // ==========================
            // WIN / LOSS STREAKS
            // ==========================

            if ((trade.result || "").toLowerCase() === "win") {

                currentWins++;
                currentLosses = 0;

            } else if ((trade.result || "").toLowerCase() === "loss") {

                currentLosses++;
                currentWins = 0;

            }

            consecutiveWins = Math.max(consecutiveWins, currentWins);
            consecutiveLosses = Math.max(consecutiveLosses, currentLosses);

            // ==========================
            // EQUITY
            // ==========================

            equity += profit;

            if (equity > highestEquity)
                highestEquity = equity;

            const dd = highestEquity - equity;

            if (dd > maxDrawdown)
                maxDrawdown = dd;

            // ==========================
            // MONTHLY
            // ==========================

            if (trade.tradeDate) {

                const month =
                    new Date(trade.tradeDate)
                    .toLocaleString("en-US", {
                        month: "long",
                        year: "numeric"
                    });

                if (!monthly[month]) {

                    monthly[month] = {

                        profit: 0,
                        trades: 0

                    };

                }

                monthly[month].profit += profit;
                monthly[month].trades++;

            }

        });

    setText("longestWinStreak", consecutiveWins);

    setText("longestLossStreak", consecutiveLosses);

    setText(
        "maxDrawdown",
        "$" + maxDrawdown.toFixed(2)
    );

    setText(
        "equityGrowth",
        "$" + equity.toFixed(2)
    );

    // ======================================
    // BEST MONTH
    // ======================================

    let bestMonth = "-";
    let bestProfit = -999999;

    let worstMonth = "-";
    let worstProfit = 999999;

    Object.keys(monthly).forEach(month => {

        if (monthly[month].profit > bestProfit) {

            bestProfit = monthly[month].profit;
            bestMonth = month;

        }

        if (monthly[month].profit < worstProfit) {

            worstProfit = monthly[month].profit;
            worstMonth = month;

        }

    });

    setText("bestMonth", bestMonth);

    setText("worstMonth", worstMonth);

    setText(
        "monthlyProfit",
        "$" + bestProfit.toFixed(2)
    );

    // ======================================
    // TRADER GRADE
    // ======================================

    let grade = "D";

    const winRate =
        Number(
            document
            .getElementById("winRate")
            ?.textContent
            ?.replace("%", "")
        ) || 0;

    if (winRate >= 80)
        grade = "A+";

    else if (winRate >= 70)
        grade = "A";

    else if (winRate >= 60)
        grade = "B";

    else if (winRate >= 50)
        grade = "C";

    setText("traderGrade", grade);

    // ======================================
    // PROP FIRM MONITOR
    // ======================================

    buildPropFirmReview();

}

// ======================================================
// PROP FIRM REVIEW
// ======================================================

function buildPropFirmReview() {

    const box =
        document.getElementById("propReview");

    if (!box) return;

    box.innerHTML = "";

    const rules = [];

    rules.push("✔ Never risk more than planned.");

    rules.push("✔ Protect daily drawdown.");

    rules.push("✔ Respect maximum drawdown.");

    rules.push("✔ Maintain consistency.");

    rules.push("✔ Avoid revenge trading.");

    rules.push("✔ Wait for HTF → MTF → LTF alignment.");

    rules.push("✔ Follow your Photon framework.");

    rules.forEach(rule => {

        const li = document.createElement("li");

        li.textContent = rule;

        box.appendChild(li);

    });

}