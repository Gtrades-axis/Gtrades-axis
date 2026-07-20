// ======================================================
// GTRADES-AXIS™
// HISTORY PAGE
// PART 1
// ======================================================

let trades = JSON.parse(localStorage.getItem("gtradesJournal")) || [];

// ======================================================
// ELEMENTS
// ======================================================

const historyBody = document.getElementById("historyBody");

const searchInput = document.getElementById("tradeSearch");

const filterPair = document.getElementById("filterPair");

const filterSession = document.getElementById("filterSession");

const filterResult = document.getElementById("filterResult");

// ======================================================
// LOAD PAGE
// ======================================================

loadHistory();

populatePairFilter();

updateSummary();

// ======================================================
// EVENTS
// ======================================================

searchInput.addEventListener("input", loadHistory);

filterPair.addEventListener("change", loadHistory);

filterSession.addEventListener("change", loadHistory);

filterResult.addEventListener("change", loadHistory);

// ======================================================
// LOAD HISTORY
// ======================================================

function loadHistory(){

    historyBody.innerHTML = "";

    let filtered = trades.filter(trade=>{

        const search = searchInput.value.toLowerCase();

        const matchSearch =
            trade.pair.toLowerCase().includes(search);

        const matchPair =
            filterPair.value==="" ||
            trade.pair===filterPair.value;

        const matchSession =
            filterSession.value==="" ||
            trade.session===filterSession.value;

        const matchResult =
            filterResult.value==="" ||
            trade.result===filterResult.value;

        return matchSearch &&
               matchPair &&
               matchSession &&
               matchResult;

    });

    if(filtered.length===0){

        historyBody.innerHTML=`

        <tr>

        <td colspan="9" class="empty">

        No trades found.

        </td>

        </tr>

        `;

        return;

    }

    filtered.forEach((trade,index)=>{

        historyBody.innerHTML += `

<tr>

<td>${trade.tradeDate}</td>

<td>${trade.pair}</td>

<td>${trade.direction}</td>

<td>${trade.session}</td>

<td>${trade.entryModel}</td>

<td>${trade.result}</td>

<td>${trade.actualRR}</td>

<td>$${Number(trade.profit).toFixed(2)}</td>

<td>

<div class="action-buttons">

<button

class="action-btn view-btn"

onclick="viewTrade(${trade.id})">

<i class="fa-solid fa-eye"></i>

</button>

<button

class="action-btn delete-btn"

onclick="deleteTrade(${trade.id})">

<i class="fa-solid fa-trash"></i>

</button>

</div>

</td>

</tr>

`;

    });

}
// ======================================================
// PAIR FILTER
// ======================================================

function populatePairFilter(){

    const pairs = [...new Set(trades.map(t => t.pair))];

    pairs.sort();

    pairs.forEach(pair=>{

        const option = document.createElement("option");

        option.value = pair;

        option.textContent = pair;

        filterPair.appendChild(option);

    });

}

// ======================================================
// SUMMARY
// ======================================================

function updateSummary(){

    const total = trades.length;

    const wins = trades.filter(t=>t.result==="Win").length;

    const losses = trades.filter(t=>t.result==="Loss").length;

    const winRate =
        total===0
        ?0
        :((wins/total)*100).toFixed(1);

    document.getElementById("historyTotalTrades").textContent = total;

    document.getElementById("historyWins").textContent = wins;

    document.getElementById("historyLosses").textContent = losses;

    document.getElementById("historyWinRate").textContent = winRate + "%";

}

// ======================================================
// DELETE TRADE
// ======================================================

window.deleteTrade = function(id){

    if(!confirm("Delete this trade?")) return;

    trades = trades.filter(t => t.id !== id);

    localStorage.setItem(
        "gtradesJournal",
        JSON.stringify(trades)
    );

    filterPair.innerHTML = `<option value="">All Pairs</option>`;

    populatePairFilter();

    updateSummary();

    loadHistory();

};

// ======================================================
// VIEW TRADE
// ======================================================

window.viewTrade = function(id){

    const trade = trades.find(t=>t.id===id);

    if(!trade) return;

    const modal = document.getElementById("tradeModal");

    const details = document.getElementById("tradeDetails");

    details.innerHTML = `

<h2>${trade.pair} (${trade.direction})</h2>

<hr>

<h3>Trade Information</h3>

<p><strong>Date:</strong> ${trade.tradeDate}</p>

<p><strong>Time:</strong> ${trade.tradeTime}</p>

<p><strong>Session:</strong> ${trade.session}</p>

<p><strong>Broker:</strong> ${trade.broker}</p>

<p><strong>Lot Size:</strong> ${trade.lotSize}</p>

<hr>

<h3>Higher Timeframe</h3>

<p><strong>Swing:</strong> ${trade.htfSwing}</p>

<p><strong>Internal:</strong> ${trade.htfInternal}</p>

<hr>

<h3>Medium Timeframe</h3>

<p><strong>Swing:</strong> ${trade.mtfSwing}</p>

<p><strong>Internal:</strong> ${trade.mtfInternal}</p>

<hr>

<h3>Execution</h3>

<p><strong>Structure:</strong> ${trade.ltfStructure}</p>

<p><strong>Liquidity:</strong> ${trade.liquidity}</p>

<p><strong>POI:</strong> ${trade.poi}</p>

<p><strong>Entry Model:</strong> ${trade.entryModel}</p>

<p><strong>Confirmation:</strong> ${trade.entryConfirmation}</p>

<hr>

<h3>Risk</h3>

<p><strong>Entry:</strong> ${trade.entryPrice}</p>

<p><strong>SL:</strong> ${trade.stopLoss}</p>

<p><strong>TP:</strong> ${trade.takeProfit}</p>

<p><strong>Expected RR:</strong> ${trade.expectedRR}</p>

<p><strong>Actual RR:</strong> ${trade.actualRR}</p>

<p><strong>Commission:</strong> $${trade.commission}</p>

<p><strong>Profit:</strong> $${trade.profit}</p>

<hr>

<h3>Psychology</h3>

<p><strong>Confidence:</strong> ${trade.confidence}</p>

<p><strong>Emotion:</strong> ${trade.emotion}</p>

<p><strong>Discipline:</strong> ${trade.discipline}</p>

<p><strong>Patience:</strong> ${trade.patience}</p>

<hr>

<h3>Review</h3>

<p><strong>Summary:</strong><br>${trade.tradeSummary}</p>

<p><strong>Strengths:</strong><br>${trade.strengths}</p>

<p><strong>Mistakes:</strong><br>${trade.mistakes}</p>

<p><strong>Lesson:</strong><br>${trade.lessonLearned}</p>

<p><strong>Improvement:</strong><br>${trade.improvementPlan}</p>

<hr>

<h3>Chart URLs</h3>

<p><a href="${trade.beforeChart}" target="_blank">Before Entry</a></p>

<p><a href="${trade.duringChart}" target="_blank">During Trade</a></p>

<p><a href="${trade.afterChart}" target="_blank">After Trade</a></p>

<hr>

<p><strong>Notes:</strong><br>${trade.notes}</p>

`;

    modal.style.display = "flex";

};

// ======================================================
// MODAL
// ======================================================

document.querySelector(".closeModal").onclick = () => {

    document.getElementById("tradeModal").style.display = "none";

};

window.onclick = function(e){

    const modal = document.getElementById("tradeModal");

    if(e.target===modal){

        modal.style.display="none";

    }

};