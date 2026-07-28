/* ==========================================================
GTRADES AXIS™
TRADE HISTORY
VERSION 2.0
PART 1
========================================================== */

const STORAGE_KEY = "gtradesAxisJournal";

let trades = [];

let filteredTrades = [];

let selectedTrade = null;

/* ==========================================================
START
========================================================== */

document.addEventListener("DOMContentLoaded",()=>{

    loadTrades();

    initializeHistory();

    loadStatistics();

    populatePairFilter();

    renderTrades();

});

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
INITIALIZE
========================================================== */

function initializeHistory(){

    document.getElementById("searchTrade")?.addEventListener(

        "keyup",

        renderTrades

    );

    document.getElementById("statusFilter")?.addEventListener(

        "change",

        renderTrades

    );

    document.getElementById("resultFilter")?.addEventListener(

        "change",

        renderTrades

    );

    document.getElementById("pairFilter")?.addEventListener(

        "change",

        renderTrades

    );

    document.getElementById("dateFilter")?.addEventListener(

        "change",

        renderTrades

    );

    document.getElementById("clearFilters")?.addEventListener(

        "click",

        ()=>{

            document.getElementById("searchTrade").value="";

            document.getElementById("statusFilter").value="All";

            document.getElementById("resultFilter").value="All";

            document.getElementById("pairFilter").selectedIndex=0;

            document.getElementById("dateFilter").value="";

            renderTrades();

        }

    );

    document.querySelectorAll(".tab").forEach(tab=>{

        tab.addEventListener("click",()=>{

            document.querySelectorAll(".tab").forEach(btn=>{

                btn.classList.remove("active");

            });

            tab.classList.add("active");

            renderTrades();

        });

    });

}

/* ==========================================================
STATISTICS
========================================================== */

function loadStatistics(){

    const closed=trades.filter(

        trade=>trade.status==="Closed"

    );

    const pending=trades.filter(

        trade=>trade.status==="Pending"

    );

    const wins=closed.filter(

        trade=>trade.result?.outcome==="Win"

    );

    const losses=closed.filter(

        trade=>trade.result?.outcome==="Loss"

    );

    let netProfit=0;

    closed.forEach(trade=>{

        netProfit+=

            Number(trade.result?.profit||0)

            -

            Number(trade.result?.commission||0);

    });

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

        "$"+netProfit.toFixed(2)

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

    pair.innerHTML="<option>All Pairs</option>";

    const pairs=[

        ...new Set(

            trades.map(

                trade=>trade.info.pair

            )

        )

    ];

    pairs.forEach(symbol=>{

        const option=document.createElement("option");

        option.value=symbol;

        option.textContent=symbol;

        pair.appendChild(option);

    });

}

/* ==========================================================
HELPER
========================================================== */

function setText(id,value){

    const element=document.getElementById(id);

    if(element){

        element.textContent=value;

    }

}
/* ==========================================================
RENDER TRADES
========================================================== */

function renderTrades(){

    const tbody=document.getElementById("tradeTableBody");

    if(!tbody) return;

    let data=[...trades];

    /* =====================================
    SEARCH
    ===================================== */

    const search=document.getElementById("searchTrade").value.toLowerCase();

    if(search){

        data=data.filter(trade=>

            trade.info.pair.toLowerCase().includes(search)

        );

    }

    /* =====================================
    STATUS
    ===================================== */

    const status=document.getElementById("statusFilter").value;

    if(status!=="All"){

        data=data.filter(

            trade=>trade.status===status

        );

    }

    /* =====================================
    RESULT
    ===================================== */

    const result=document.getElementById("resultFilter").value;

    if(result!=="All"){

        data=data.filter(

            trade=>trade.result?.outcome===result

        );

    }

    /* =====================================
    PAIR
    ===================================== */

    const pair=document.getElementById("pairFilter").value;

    if(pair!=="All Pairs"){

        data=data.filter(

            trade=>trade.info.pair===pair

        );

    }

    /* =====================================
    DATE
    ===================================== */

    const date=document.getElementById("dateFilter").value;

    if(date){

        data=data.filter(

            trade=>trade.info.date===date

        );

    }

    /* =====================================
    TAB FILTER
    ===================================== */

    const active=document.querySelector(".tab.active");

    if(active){

        switch(active.dataset.status){

            case "Pending":

                data=data.filter(

                    trade=>trade.status==="Pending"

                );

            break;

            case "Closed":

                data=data.filter(

                    trade=>trade.status==="Closed"

                );

            break;

            case "Win":

                data=data.filter(

                    trade=>trade.result?.outcome==="Win"

                );

            break;

            case "Loss":

                data=data.filter(

                    trade=>trade.result?.outcome==="Loss"

                );

            break;

            case "Break Even":

                data=data.filter(

                    trade=>trade.result?.outcome==="Break Even"

                );

            break;

        }

    }

    filteredTrades=data;

    /* =====================================
    EMPTY
    ===================================== */

    if(data.length===0){

        tbody.innerHTML=`

        <tr>

            <td colspan="11">

                <div class="loading-card">

                    No trades found.

                </div>

            </td>

        </tr>

        `;

        return;

    }

    tbody.innerHTML="";

    /* =====================================
    TABLE
    ===================================== */

    data.forEach(trade=>{

        tbody.innerHTML+=`

        <tr>

            <td>${trade.info.date}</td>

            <td>

                <strong>${trade.info.pair}</strong>

            </td>

            <td>

                <span class="${trade.info.direction.toLowerCase()}">

                    ${trade.info.direction}

                </span>

            </td>

            <td>${trade.ltf.model}</td>

            <td>${trade.info.session}</td>

            <td>

                <span class="status ${trade.status.toLowerCase()}">

                    ${trade.status}

                </span>

            </td>

            <td>${trade.result?.outcome||"-"}</td>

            <td>

                $${Number(trade.result?.profit||0).toFixed(2)}

            </td>

            <td>

                ${Number(trade.result?.actualRR||0).toFixed(2)}

            </td>

            <td>

                <div class="shot-links">

                    ${trade.screenshots?.before
                        ? `<a href="${trade.screenshots.before}" target="_blank" title="Before">B</a>`
                        : `<span>-</span>`}

                    ${trade.screenshots?.during
                        ? `<a href="${trade.screenshots.during}" target="_blank" title="During">D</a>`
                        : `<span>-</span>`}

                    ${trade.screenshots?.after
                        ? `<a href="${trade.screenshots.after}" target="_blank" title="After">A</a>`
                        : `<span>-</span>`}

                </div>

            </td>

            <td>

                <button

                    class="btn btn-small"

                    onclick="openTrade(${trade.id})">

                    <i class="fa-solid fa-eye"></i>

                </button>

                ${trade.status==="Pending"

                    ?

                    `

                    <button

                        class="btn btn-small btn-success"

                        onclick="openTrade(${trade.id})">

                        <i class="fa-solid fa-pen"></i>

                    </button>

                    `

                    :

                    ""

                }

                <button

                    class="btn btn-small btn-danger"

                    onclick="deleteTrade(${trade.id})">

                    <i class="fa-solid fa-trash"></i>

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

            <strong>Entry Model</strong>

            <span>${trade.ltf.model}</span>

        </div>

        <div class="detail-row">

            <strong>Session</strong>

            <span>${trade.info.session}</span>

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

            <span>$${Number(trade.result.profit||0).toFixed(2)}</span>

        </div>

        <div class="detail-row">

            <strong>Commission</strong>

            <span>$${Number(trade.result.commission||0).toFixed(2)}</span>

        </div>

        <div class="detail-row">

            <strong>Actual RR</strong>

            <span>${Number(trade.result.actualRR||0).toFixed(2)}</span>

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

            <strong>Lesson Learned</strong>

            <span>${trade.review?.lesson||"-"}</span>

        </div>

        <div class="detail-row">

            <strong>Improvement</strong>

            <span>${trade.review?.improvement||"-"}</span>

        </div>

        <hr>

        <h3>Trade Charts</h3>

        <div class="detail-row">

            <strong>Before Entry</strong>

            <span>

            ${trade.screenshots?.before

            ? `<a href="${trade.screenshots.before}" target="_blank" class="btn">View</a>`

            : "No Chart"}

            </span>

        </div>

        <div class="detail-row">

            <strong>During Trade</strong>

            <span>

            ${trade.screenshots?.during

            ? `<a href="${trade.screenshots.during}" target="_blank" class="btn">View</a>`

            : "No Chart"}

            </span>

        </div>

        <div class="detail-row">

            <strong>After Exit</strong>

            <span>

            ${trade.screenshots?.after

            ? `<a href="${trade.screenshots.after}" target="_blank" class="btn">View</a>`

            : "No Chart"}

            </span>

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

    document.getElementById("pendingResult").value=
        trade.result?.outcome || "Win";

    document.getElementById("pendingProfit").value=
        trade.result?.profit || 0;

    document.getElementById("pendingCommission").value=
        trade.result?.commission || 0;

    document.getElementById("pendingRR").value=
        trade.result?.actualRR || 0;

    document.getElementById("pendingManagement").value=
        trade.management || "Good";

    document.getElementById("pendingPsychology").value=
        trade.psychology || "";

    document.getElementById("pendingLesson").value=
        trade.review?.lesson || "";

    document.getElementById("pendingImprovement").value=
        trade.review?.improvement || "";

    document.getElementById("beforeLink").value=
        trade.screenshots?.before || "";

    document.getElementById("duringLink").value=
        trade.screenshots?.during || "";

    document.getElementById("afterLink").value=
        trade.screenshots?.after || "";

    document.getElementById("pendingForm").onsubmit=function(e){

        e.preventDefault();

        trade.status="Closed";

        trade.closed=new Date().toISOString();

        trade.result={

            outcome:
                document.getElementById("pendingResult").value,

            profit:
                Number(document.getElementById("pendingProfit").value)||0,

            commission:
                Number(document.getElementById("pendingCommission").value)||0,

            actualRR:
                Number(document.getElementById("pendingRR").value)||0

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

        trade.screenshots={

            before:
                document.getElementById("beforeLink").value,

            during:
                document.getElementById("duringLink").value,

            after:
                document.getElementById("afterLink").value

        };

        saveTrades();

        loadStatistics();

        renderTrades();

        modal.style.display="none";

        alert("Trade Updated Successfully.");

    };

}
/* ==========================================================
DELETE TRADE
========================================================== */

function deleteTrade(id){

    if(!confirm("Delete this trade permanently?")) return;

    trades=trades.filter(

        trade=>trade.id!==id

    );

    saveTrades();

    loadStatistics();

    populatePairFilter();

    renderTrades();

    document.getElementById("tradeModal").style.display="none";

}

/* ==========================================================
MODAL CONTROLS
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
CLICK OUTSIDE MODAL
========================================================== */

window.addEventListener("click",function(e){

    const tradeModal=document.getElementById("tradeModal");

    const pendingModal=document.getElementById("pendingModal");

    if(e.target===tradeModal){

        tradeModal.style.display="none";

    }

    if(e.target===pendingModal){

        pendingModal.style.display="none";

    }

});

/* ==========================================================
EXPORT CSV
========================================================== */

document.getElementById("exportCSV")?.addEventListener(

    "click",

    ()=>{

        if(trades.length===0){

            alert("No trades available.");

            return;

        }

        let csv="Date,Pair,Direction,Model,Session,Status,Result,Profit,Commission,RR\n";

        trades.forEach(trade=>{

            csv+=`${trade.info.date},${trade.info.pair},${trade.info.direction},${trade.ltf.model},${trade.info.session},${trade.status},${trade.result?.outcome||""},${trade.result?.profit||0},${trade.result?.commission||0},${trade.result?.actualRR||0}\n`;

        });

        const blob=new Blob(

            [csv],

            {

                type:"text/csv"

            }

        );

        const url=URL.createObjectURL(blob);

        const a=document.createElement("a");

        a.href=url;

        a.download="TradeHistory.csv";

        a.click();

        URL.revokeObjectURL(url);

    }

);

/* ==========================================================
EXPORT PDF
========================================================== */

document.getElementById("exportPDF")?.addEventListener(

    "click",

    ()=>{

        window.print();

    }

);

/* ==========================================================
REFRESH
========================================================== */

function refreshHistory(){

    loadTrades();

    loadStatistics();

    populatePairFilter();

    renderTrades();

}

/* ==========================================================
END
========================================================== */