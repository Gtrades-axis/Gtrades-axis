/* ==========================================================
GTRADES AXIS™
TRADE HISTORY
PART 1
========================================================== */

const STORAGE_KEY = "gtradesJournal";

let trades = [];

let filteredTrades = [];

let selectedTrade = null;

loadTrades();

document.addEventListener("DOMContentLoaded", () => {

    initializeHistory();

    loadStatistics();

    populatePairFilter();

    renderTrades();

});

/* ==========================================================
INITIALIZE
========================================================== */

function initializeHistory(){

    const search=document.getElementById("searchTrade");

    const status=document.getElementById("statusFilter");

    const result=document.getElementById("resultFilter");

    const pair=document.getElementById("pairFilter");

    const date=document.getElementById("dateFilter");

    const clear=document.getElementById("clearFilters");

    if(search)
        search.addEventListener("keyup",renderTrades);

    if(status)
        status.addEventListener("change",renderTrades);

    if(result)
        result.addEventListener("change",renderTrades);

    if(pair)
        pair.addEventListener("change",renderTrades);

    if(date)
        date.addEventListener("change",renderTrades);

    if(clear){

        clear.addEventListener("click",()=>{

            search.value="";

            status.value="All";

            result.value="All";

            pair.selectedIndex=0;

            date.value="";

            renderTrades();

        });

    }

    document.querySelectorAll(".tab").forEach(tab=>{

        tab.addEventListener("click",()=>{

            document.querySelectorAll(".tab")

            .forEach(t=>t.classList.remove("active"));

            tab.classList.add("active");

            renderTrades();

        });

    });

}

/* ==========================================================
LOCAL STORAGE
========================================================== */

function loadTrades(){

    const saved=localStorage.getItem(STORAGE_KEY);

    trades=saved ? JSON.parse(saved) : [];

}

function saveTrades(){

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(trades)

    );

}

/* ==========================================================
STATISTICS
========================================================== */

function loadStatistics(){

    const closed=trades.filter(

        t=>t.status==="Closed"

    );

    const pending=trades.filter(

        t=>t.status==="Pending"

    );

    const wins=closed.filter(

        t=>t.result.outcome==="Win"

    );

    const losses=closed.filter(

        t=>t.result.outcome==="Loss"

    );

    const profit=closed.reduce(

        (sum,t)=>{

            return sum+

            Number(t.result.profit||0)-

            Number(t.result.commission||0);

        },0

    );

    setText(

        "historyTotalTrades",

        trades.length

    );

    setText(

        "historyPending",

        pending.length

    );

    setText(

        "historyClosed",

        closed.length

    );

    setText(

        "historyWins",

        wins.length

    );

    setText(

        "historyLosses",

        losses.length

    );

    setText(

        "historyProfit",

        "$"+profit.toFixed(2)

    );

}

/* ==========================================================
PAIR FILTER
========================================================== */

function populatePairFilter(){

    const pair=document.getElementById(

        "pairFilter"

    );

    if(!pair) return;

    const pairs=[

        ...new Set(

            trades.map(

                t=>t.info.pair

            )

        )

    ];

    pairs.forEach(p=>{

        const option=

        document.createElement("option");

        option.value=p;

        option.textContent=p;

        pair.appendChild(option);

    });

}

function setText(id,value){

    const el=document.getElementById(id);

    if(el)

        el.textContent=value;

}
/* ==========================================================
RENDER TRADES
========================================================== */

function renderTrades(){

    const tbody = document.getElementById("tradeTableBody");

    if(!tbody) return;

    let data = [...trades];

    /* -------------------------
       SEARCH
    ------------------------- */

    const search = document.getElementById("searchTrade").value.toLowerCase();

    if(search){

        data = data.filter(trade =>

            trade.info.pair.toLowerCase().includes(search)

        );

    }

    /* -------------------------
       STATUS FILTER
    ------------------------- */

    const status = document.getElementById("statusFilter").value;

    if(status !== "All"){

        data = data.filter(

            trade => trade.status === status

        );

    }

    /* -------------------------
       RESULT FILTER
    ------------------------- */

    const result = document.getElementById("resultFilter").value;

    if(result !== "All"){

        data = data.filter(trade =>

            trade.result?.outcome === result

        );

    }

    /* -------------------------
       PAIR FILTER
    ------------------------- */

    const pair = document.getElementById("pairFilter").value;

    if(pair !== "All Pairs"){

        data = data.filter(

            trade => trade.info.pair === pair

        );

    }

    /* -------------------------
       DATE FILTER
    ------------------------- */

    const date = document.getElementById("dateFilter").value;

    if(date){

        data = data.filter(

            trade => trade.info.date === date

        );

    }

    /* -------------------------
       TAB FILTER
    ------------------------- */

    const activeTab = document.querySelector(".tab.active");

    if(activeTab){

        const filter = activeTab.dataset.status;

        switch(filter){

            case "Pending":

                data = data.filter(t=>t.status==="Pending");

                break;

            case "Closed":

                data = data.filter(t=>t.status==="Closed");

                break;

            case "Win":

                data = data.filter(t=>t.result?.outcome==="Win");

                break;

            case "Loss":

                data = data.filter(t=>t.result?.outcome==="Loss");

                break;

            case "Break Even":

                data = data.filter(t=>t.result?.outcome==="Break Even");

                break;

        }

    }

    filteredTrades = data;

    /* -------------------------
       EMPTY
    ------------------------- */

    if(data.length===0){

        tbody.innerHTML=`

        <tr>

            <td colspan="10">

                <div class="loading-card">

                    No trades found.

                </div>

            </td>

        </tr>

        `;

        return;

    }

    /* -------------------------
       TABLE
    ------------------------- */

    tbody.innerHTML="";

    data.forEach(trade=>{

        tbody.innerHTML += `

        <tr>

            <td>${trade.info.date}</td>

            <td>${trade.info.pair}</td>

            <td>${trade.info.direction}</td>

            <td>${trade.ltf.model}</td>

            <td>${trade.info.session}</td>

            <td>

                <span class="status ${trade.status.toLowerCase()}">

                    ${trade.status}

                </span>

            </td>

            <td>

                ${trade.result?.outcome || "-"}

            </td>

            <td>

                $${Number(trade.result?.profit||0).toFixed(2)}

            </td>

            <td>

                ${Number(trade.result?.actualRR||0).toFixed(2)}

            </td>

            <td>

                <button

                class="btn"

                onclick="openTrade(${trade.id})">

                View

                </button>

            </td>

        </tr>

        `;

    });

}

/* ==========================================================
OPEN TRADE
========================================================== */

function openTrade(id){

    selectedTrade = trades.find(

        trade => trade.id === id

    );

    if(!selectedTrade) return;

    if(selectedTrade.status==="Pending"){

        openPendingTrade(selectedTrade);

    }else{

        openClosedTrade(selectedTrade);

    }

}
/* ==========================================================
OPEN CLOSED TRADE
========================================================== */

function openClosedTrade(trade){

    const modal=document.getElementById("tradeModal");

    const body=document.getElementById("modalBody");

    if(!modal||!body) return;

    body.innerHTML=`

    <div class="trade-details">

        <div class="detail-row">

            <strong>Pair</strong>

            <span>${trade.info.pair}</span>

        </div>

        <div class="detail-row">

            <strong>Direction</strong>

            <span>${trade.info.direction}</span>

        </div>

        <div class="detail-row">

            <strong>Status</strong>

            <span>${trade.status}</span>

        </div>

        <div class="detail-row">

            <strong>Result</strong>

            <span>${trade.result.outcome}</span>

        </div>

        <div class="detail-row">

            <strong>Profit</strong>

            <span>$${Number(trade.result.profit).toFixed(2)}</span>

        </div>

        <div class="detail-row">

            <strong>Commission</strong>

            <span>$${Number(trade.result.commission).toFixed(2)}</span>

        </div>

        <div class="detail-row">

            <strong>Actual RR</strong>

            <span>${trade.result.actualRR}</span>

        </div>

        <div class="detail-row">

            <strong>Management</strong>

            <span>${trade.management||"-"}</span>

        </div>

        <div class="detail-row">

            <strong>Psychology</strong>

            <span>${trade.psychology||"-"}</span>

        </div>

        <div class="detail-row">

            <strong>Lesson</strong>

            <span>${trade.review?.lesson||"-"}</span>

        </div>

        <div class="detail-row">

            <strong>Improvement</strong>

            <span>${trade.review?.improvement||"-"}</span>

        </div>

    </div>

    `;

    document.getElementById("editTradeBtn").style.display="none";

    document.getElementById("deleteTradeBtn").onclick=()=>{

        deleteTrade(trade.id);

    };

    modal.style.display="flex";

}

/* ==========================================================
OPEN PENDING TRADE
========================================================== */

function openPendingTrade(trade){

    const modal=document.getElementById("pendingModal");

    if(!modal) return;

    modal.style.display="flex";

    document.getElementById("pendingForm").onsubmit=function(e){

        e.preventDefault();

        trade.status="Closed";

        trade.closed=new Date().toISOString();

        trade.result={

            outcome:document.getElementById("pendingResult").value,

            profit:Number(document.getElementById("pendingProfit").value)||0,

            commission:Number(document.getElementById("pendingCommission").value)||0,

            actualRR:Number(document.getElementById("pendingRR").value)||0

        };

        trade.management=

        document.getElementById("pendingManagement").value;

        trade.psychology=

        document.getElementById("pendingPsychology").value;

        trade.review={

            lesson:

            document.getElementById("pendingLesson").value,

            improvement:

            document.getElementById("pendingImprovement").value

        };

        saveTrades();

        loadStatistics();

        renderTrades();

        modal.style.display="none";

        alert("Trade Closed Successfully.");

    };

}

/* ==========================================================
DELETE TRADE
========================================================== */

function deleteTrade(id){

    if(!confirm("Delete this trade?")) return;

    trades=trades.filter(

        trade=>trade.id!==id

    );

    saveTrades();

    loadStatistics();

    renderTrades();

    document.getElementById("tradeModal").style.display="none";

}

/* ==========================================================
MODAL CLOSE
========================================================== */

document.getElementById("closeModal")?.addEventListener(

"click",

()=>{

document.getElementById("tradeModal").style.display="none";

}

);

document.getElementById("closePending")?.addEventListener(

"click",

()=>{

document.getElementById("pendingModal").style.display="none";

}

);

/* ==========================================================
EXPORT PLACEHOLDERS
========================================================== */

document.getElementById("exportCSV")?.addEventListener(

"click",

()=>{

alert("CSV Export Coming Next.");

}

);

document.getElementById("exportPDF")?.addEventListener(

"click",

()=>{

alert("PDF Export Coming Next.");

}

);

/* ==========================================================
END HISTORY.JS
========================================================== */