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

alert(

"Edit Trade Module Coming Next"

);

};

});

}


// =======================================
// INITIALIZE HISTORY
// =======================================

renderHistory();
// ======================================================
// EDIT TRADE MODULE
// PART 4
// ======================================================


// =======================================
// EDIT VARIABLES
// =======================================

let editingTradeId = null;


// =======================================
// FORM ELEMENTS
// =======================================

const tradeForm = document.getElementById("tradeForm");


// =======================================
// START EDIT
// =======================================

function editTrade(id){

const trade = trades.find(t => t.id === id);


if(!trade){

alert("Trade not found");

return;

}


editingTradeId = id;


// Fill form fields

document.getElementById("pair").value = trade.pair;

document.getElementById("direction").value = trade.direction;

document.getElementById("tradeDate").value = trade.tradeDate;

document.getElementById("session").value = trade.session;

document.getElementById("result").value = trade.result;

document.getElementById("rr").value = trade.rr;

document.getElementById("profit").value = trade.profit;


// Change button text

const submitBtn = document.querySelector(
"#tradeForm button[type='submit']"
);


if(submitBtn){

submitBtn.innerText="Update Trade";

}


// Scroll to form

tradeForm.scrollIntoView({

behavior:"smooth"

});


}


// =======================================
// UPDATE FIRESTORE
// =======================================


async function updateTrade(id, updatedData){

try{


await updateDoc(

doc(

db,

"users",

currentUser.uid,

"trades",

id

),

updatedData

);


alert("Trade updated successfully");


editingTradeId=null;


const submitBtn=document.querySelector(

"#tradeForm button[type='submit']"

);


if(submitBtn){

submitBtn.innerText="Save Trade";

}


tradeForm.reset();


await initializeJournal();


}


catch(error){

console.error(error);

alert(error.message);

}


}



// =======================================
// CONNECT EDIT BUTTON
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


}



// =======================================
// FORM SUBMIT CHECK
// =======================================

if(tradeForm){


tradeForm.addEventListener(

"submit",

async(e)=>{


e.preventDefault();



const updatedTrade={


pair:
document.getElementById("pair").value,


direction:
document.getElementById("direction").value,


tradeDate:
document.getElementById("tradeDate").value,


session:
document.getElementById("session").value,


result:
document.getElementById("result").value,


rr:
document.getElementById("rr").value,


profit:
Number(
document.getElementById("profit").value
)


};



if(editingTradeId){


await updateTrade(

editingTradeId,

updatedTrade

);


}


});


}
// ======================================================
// PERFORMANCE DASHBOARD
// PART 5
// ======================================================


// =======================================
// DASHBOARD ELEMENTS
// =======================================


const totalTradesEl =
document.getElementById("totalTrades");


const winTradesEl =
document.getElementById("winTrades");


const lossTradesEl =
document.getElementById("lossTrades");


const breakEvenEl =
document.getElementById("breakEven");


const winRateEl =
document.getElementById("winRate");


const totalProfitEl =
document.getElementById("totalProfit");


const averageRREl =
document.getElementById("averageRR");


const bestPairEl =
document.getElementById("bestPair");


const bestSessionEl =
document.getElementById("bestSession");



// =======================================
// UPDATE DASHBOARD
// =======================================


function updateDashboard(){


if(!trades) return;



const total = trades.length;



const wins = trades.filter(t =>

t.result === "Win"

).length;



const losses = trades.filter(t =>

t.result === "Loss"

).length;



const breakeven = trades.filter(t =>

t.result === "BE" ||

t.result === "Break Even"

).length;



const profit = trades.reduce(

(sum,t)=>sum + Number(t.profit || 0),

0

);



const rrTotal = trades.reduce(

(sum,t)=>sum + Number(t.rr || 0),

0

);



const averageRR = total > 0

?

(rrTotal / total).toFixed(2)

:

0;



const winRate = total > 0

?

((wins / total) * 100).toFixed(1)

:

0;



if(totalTradesEl)

totalTradesEl.innerText = total;



if(winTradesEl)

winTradesEl.innerText = wins;



if(lossTradesEl)

lossTradesEl.innerText = losses;



if(breakEvenEl)

breakEvenEl.innerText = breakeven;



if(winRateEl)

winRateEl.innerText = winRate + "%";



if(totalProfitEl)

totalProfitEl.innerText =

"$" + profit.toFixed(2);



if(averageRREl)

averageRREl.innerText =

averageRR;



bestPairElUpdate();


bestSessionUpdate();


}



// =======================================
// BEST PAIR
// =======================================


function bestPairElUpdate(){


if(!bestPairEl)return;


let pairs={};



trades.forEach(t=>{


if(!pairs[t.pair])

pairs[t.pair]=0;


pairs[t.pair]+=Number(t.profit || 0);


});



let best="None";

let highest=-Infinity;



for(let pair in pairs){


if(pairs[pair]>highest){


highest=pairs[pair];

best=pair;


}

}



bestPairEl.innerText=best;


}



// =======================================
// BEST SESSION
// =======================================


function bestSessionUpdate(){


if(!bestSessionEl)return;


let sessions={};



trades.forEach(t=>{


if(!sessions[t.session])

sessions[t.session]=0;


sessions[t.session]+=Number(t.profit || 0);


});



let best="None";

let highest=-Infinity;



for(let session in sessions){


if(sessions[session]>highest){


highest=sessions[session];

best=session;


}

}



bestSessionEl.innerText=best;


}



// =======================================
// RUN DASHBOARD
// =======================================


updateDashboard();
// ======================================================
// RISK ANALYTICS + EQUITY CURVE
// PART 6
// ======================================================



// =======================================
// DASHBOARD ELEMENTS
// =======================================


const maxDrawdownEl =
document.getElementById("maxDrawdown");


const bestDayEl =
document.getElementById("bestDay");


const worstDayEl =
document.getElementById("worstDay");


const monthlyProfitEl =
document.getElementById("monthlyProfit");



const equityCanvas =
document.getElementById("equityChart");



// =======================================
// DAILY PERFORMANCE
// =======================================


function calculateDailyPerformance(){


let days = {};



trades.forEach(trade=>{


let date = trade.tradeDate;


if(!date) return;



if(!days[date]){

days[date]=0;

}



days[date] += Number(trade.profit || 0);



});



let bestDay="None";

let worstDay="None";


let highest=-Infinity;

let lowest=Infinity;



for(let day in days){


if(days[day] > highest){

highest = days[day];

bestDay = day;

}



if(days[day] < lowest){

lowest = days[day];

worstDay = day;

}


}



if(bestDayEl){

bestDayEl.innerText =

bestDay + " ($" + highest.toFixed(2) + ")";

}



if(worstDayEl){

worstDayEl.innerText =

worstDay + " ($" + lowest.toFixed(2) + ")";

}


return days;


}




// =======================================
// MONTHLY PERFORMANCE
// =======================================


function calculateMonthlyPerformance(){


let months={};



trades.forEach(trade=>{


if(!trade.tradeDate)return;



let month =

trade.tradeDate.substring(0,7);



if(!months[month]){

months[month]=0;

}



months[month] += Number(trade.profit || 0);



});



let currentMonth =

new Date()

.toISOString()

.substring(0,7);



let profit =

months[currentMonth] || 0;



if(monthlyProfitEl){

monthlyProfitEl.innerText =

"$" + profit.toFixed(2);

}


}




// =======================================
// MAX DRAWDOWN
// =======================================


function calculateDrawdown(){


let balance = 0;

let peak = 0;

let maxDD = 0;



let sortedTrades =

[...trades]

.sort(

(a,b)=>

new Date(a.tradeDate)

-

new Date(b.tradeDate)

);



sortedTrades.forEach(trade=>{


balance += Number(trade.profit || 0);



if(balance > peak){

peak = balance;

}



let drawdown = peak - balance;



if(drawdown > maxDD){

maxDD = drawdown;

}



});



if(maxDrawdownEl){

maxDrawdownEl.innerText =

"$" + maxDD.toFixed(2);

}



return maxDD;


}





// =======================================
// EQUITY CURVE
// =======================================


function createEquityCurve(){


if(!equityCanvas)return;



let balance = 0;


let labels=[];

let values=[];



let sortedTrades =

[...trades]

.sort(

(a,b)=>

new Date(a.tradeDate)

-

new Date(b.tradeDate)

);



sortedTrades.forEach(trade=>{


balance += Number(trade.profit || 0);



labels.push(trade.tradeDate);


values.push(balance);



});




new Chart(

equityCanvas,

{


type:"line",


data:{


labels:labels,


datasets:[{

label:"Account Growth",


data:values,


tension:0.3

}]


},



options:{


responsive:true,


plugins:{


legend:{


display:true


}


}



}


}

);


}




// =======================================
// RUN ANALYTICS
// =======================================


function updateRiskAnalytics(){


if(!trades || trades.length===0)

return;



calculateDailyPerformance();


calculateMonthlyPerformance();


calculateDrawdown();


createEquityCurve();


}



updateRiskAnalytics();
// ======================================================
// PROFESSIONAL TRADER DASHBOARD
// PART 7
// ======================================================



// =======================================
// DASHBOARD ELEMENTS
// =======================================


const startingBalanceEl =
document.getElementById("startingBalance");


const currentBalanceEl =
document.getElementById("currentBalance");


const netProfitEl =
document.getElementById("netProfit");


const profitPercentEl =
document.getElementById("profitPercent");


const winLossRatioEl =
document.getElementById("winLossRatio");


const riskScoreEl =
document.getElementById("riskScore");


const consistencyScoreEl =
document.getElementById("consistencyScore");


const targetProgressEl =
document.getElementById("targetProgress");


const warningBox =
document.getElementById("riskWarning");




// =======================================
// ACCOUNT SETTINGS
// =======================================


let accountSettings = {


startingBalance:10000,

profitTarget:10,

maxDrawdown:10


};




// =======================================
// LOAD ACCOUNT SETTINGS
// =======================================


function loadAccountSettings(){


const saved =

localStorage.getItem(

"accountSettings"

);



if(saved){


accountSettings =

JSON.parse(saved);


}


}




// =======================================
// SAVE SETTINGS
// =======================================


function saveAccountSettings(){


localStorage.setItem(

"accountSettings",

JSON.stringify(accountSettings)

);


}




// =======================================
// CALCULATE DASHBOARD
// =======================================


function updateTraderDashboard(){



if(!trades)return;



let totalProfit = 0;


let wins = 0;


let losses = 0;



trades.forEach(trade=>{


let profit =

Number(trade.profit || 0);



totalProfit += profit;



if(trade.result==="Win"){

wins++;

}



if(trade.result==="Loss"){

losses++;

}


});





let currentBalance =

accountSettings.startingBalance

+

totalProfit;




let profitPercent =

(

totalProfit /

accountSettings.startingBalance

)

*

100;




let ratio =

losses > 0

?

(wins / losses).toFixed(2)

:

wins;




if(startingBalanceEl)

startingBalanceEl.innerText =

"$" +

accountSettings.startingBalance;



if(currentBalanceEl)

currentBalanceEl.innerText =

"$" +

currentBalance.toFixed(2);



if(netProfitEl)

netProfitEl.innerText =

"$" +

totalProfit.toFixed(2);



if(profitPercentEl)

profitPercentEl.innerText =

profitPercent.toFixed(2)

+

"%";



if(winLossRatioEl)

winLossRatioEl.innerText =

ratio;




calculateRiskScore();



calculateConsistency();



updateTargetProgress(

profitPercent

);



}




// =======================================
// RISK SCORE
// =======================================


function calculateRiskScore(){


let score = 100;



let losses = trades.filter(

t=>t.result==="Loss"

);



if(losses.length >= 5){

score -=20;

}



if(losses.length >=10){

score -=30;

}



if(score <0)

score=0;



if(riskScoreEl)

riskScoreEl.innerText =

score + "/100";


}




// =======================================
// CONSISTENCY SCORE
// =======================================


function calculateConsistency(){


if(trades.length===0)return;



let profits =

trades.map(

t=>Number(t.profit||0)

);



let positiveDays =

profits.filter(

p=>p>0

).length;



let score =

(

positiveDays /

trades.length

)

*100;



if(consistencyScoreEl)

consistencyScoreEl.innerText =

score.toFixed(1)

+

"%";



}




// =======================================
// PROFIT TARGET
// =======================================


function updateTargetProgress(percent){


let target =

accountSettings.profitTarget;



let progress =

(

percent /

target

)

*100;



if(progress>100)

progress=100;



if(targetProgressEl)

targetProgressEl.innerText =

progress.toFixed(1)

+

"%";



}





// =======================================
// RISK WARNING
// =======================================


function checkRiskWarning(){


if(!warningBox)return;



let dd = calculateDrawdown();



let limit =

(

accountSettings.startingBalance *

accountSettings.maxDrawdown

)

/

100;




if(dd >= limit){


warningBox.innerText =

"⚠ Maximum drawdown limit reached";



}



else{


warningBox.innerText =

"Account Risk Normal";


}



}




// =======================================
// START DASHBOARD
// =======================================


loadAccountSettings();


updateTraderDashboard();


checkRiskWarning();