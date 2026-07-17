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
