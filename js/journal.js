/* ==========================================================
   GTRADES AXIS™
   PREMIUM TRADING JOURNAL
   JOURNAL.JS
   ========================================================== */

import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";


/* ==========================================================
   GLOBAL STATE
   ========================================================== */

const STORAGE_KEY = "trades";

let currentUser = null;
let trades = [];
let editingTrade = null;

let equityChartInstance = null;
let monthlyChartInstance = null;


/* ==========================================================
   BASIC HELPERS
   ========================================================== */

function $(id) {
    return document.getElementById(id);
}

function val(id) {
    const el = $(id);
    return el ? el.value : "";
}

function num(id) {
    const value = parseFloat(val(id));
    return Number.isFinite(value) ? value : 0;
}

function isChecked(id) {
    const el = $(id);
    return el ? el.checked : false;
}

function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
}


/* ==========================================================
   LOAD / SAVE TRADES
   ========================================================== */

function loadTrades() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            trades = [];
            return;
        }

        const parsed = JSON.parse(saved);

        trades = Array.isArray(parsed) ? parsed : [];

    } catch (error) {

        console.error("❌ Failed to load trades:", error);

        trades = [];
    }
}


function saveTrades() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(trades)
        );

    } catch (error) {

        console.error("❌ Failed to save trades:", error);

    }
}


/* ==========================================================
   PREMIUM JOURNAL ACCESS
   ========================================================== */

function checkJournalAccess() {

    return new Promise((resolve, reject) => {

        onAuthStateChanged(auth, async (user) => {

            if (!user) {

                window.location.href = "/login";

                reject(new Error("Not authenticated"));

                return;
            }

            currentUser = user;

            try {

                const userSnap = await getDoc(
                    doc(db, "users", user.uid)
                );

                if (!userSnap.exists()) {

                    alert("User account not found.");

                    window.location.href = "/dashboard";

                    reject(new Error("User account not found"));

                    return;
                }

                const data = userSnap.data();

                const role = data.role || "member";
                const membership = data.membership || "free";

                console.log("Journal Access Check:", {
                    role,
                    membership
                });

                const allowed =
                    role === "admin" ||
                    membership === "premium";

                if (!allowed) {

                    document.body.innerHTML = `

                        <div style="
                            display:flex;
                            justify-content:center;
                            align-items:center;
                            min-height:100vh;
                            background:#0b1120;
                            color:white;
                            font-family:Arial,sans-serif;
                            text-align:center;
                            padding:40px;
                        ">

                            <div>

                                <i class="fa-solid fa-lock"
                                   style="
                                       font-size:70px;
                                       color:#fbbf24;
                                       margin-bottom:20px;
                                       display:block;
                                   ">
                                </i>

                                <h1>Premium Membership Required</h1>

                                <p style="
                                    color:#94a3b8;
                                    margin:20px 0;
                                ">
                                    The Trading Journal is available only
                                    to Premium Members.
                                </p>

                                <a href="/dashboard"
                                   style="
                                       display:inline-block;
                                       padding:14px 28px;
                                       background:#1d9bf0;
                                       color:white;
                                       border-radius:8px;
                                       text-decoration:none;
                                   ">
                                    Return to Dashboard
                                </a>

                            </div>

                        </div>
                    `;

                    reject(new Error("Journal blocked"));

                    return;
                }

                resolve(true);

            } catch (error) {

                console.error(
                    "❌ Journal access error:",
                    error
                );

                reject(error);
            }

        });

    });
}


/* ==========================================================
   BUILD TRADE OBJECT
   ========================================================== */

function buildTradeFromForm(isUpdate = false) {

    return {

        id:
            isUpdate && editingTrade
                ? editingTrade.id
                : Date.now() + "_" +
                  Math.random()
                      .toString(36)
                      .slice(2, 8),

        date: val("tradeDate"),
        time: val("tradeTime"),

        pair: val("pair"),
        direction: val("direction"),
        session: val("session"),
        broker: val("broker"),
        account: val("account"),

        lotSize: num("lotSize"),

        /* =========================
           HTF
           ========================= */

        htfSwing: val("htfSwing"),
        htfInternal: val("htfInternal"),

        /* =========================
           MTF
           ========================= */

        mtfSwing: val("mtfSwing"),
        mtfInternal: val("mtfInternal"),

        /* =========================
           LTF
           ========================= */

        ltfStructure: val("ltfStructure"),
        liquidity: val("liquidity"),
        poi: val("poi"),
        entryModel: val("entryModel"),
        entryConfirmation: val("entryConfirmation"),
        tradeValid: val("tradeValid"),

        /* =========================
           CONFLUENCES
           ========================= */

        confluences: {

            htfSwing: isChecked("confHTFSwing"),
            htfInternal: isChecked("confHTFInternal"),

            mtfSwing: isChecked("confMTFSwing"),
            mtfInternal: isChecked("confMTFInternal"),

            htfDemand: isChecked("confHTFDemand"),
            htfSupply: isChecked("confHTFSupply"),

            mtfDemand: isChecked("confMTFDemand"),
            mtfSupply: isChecked("confMTFSupply"),

            premium: isChecked("confPremium"),
            discount: isChecked("confDiscount"),

            sweep: isChecked("confSweep"),

            choch: isChecked("confChoch"),
            bos: isChecked("confBos"),

            mitigation: isChecked("confMitigation"),
            refined: isChecked("confRefined"),
            extreme: isChecked("confExtreme")
        },

        /* =========================
           EXECUTION
           ========================= */

        entry: num("entry"),
        stopLoss: num("stopLoss"),
        takeProfit: num("takeProfit"),

        lotSize: num("lotSize"),

        risk: num("risk"),
        rr: num("rr"),

        profit: num("profit"),
        commission: num("commission"),

        result: val("result") || "Pending",

        /* =========================
           PSYCHOLOGY
           ========================= */

        confidence: val("confidence"),
        emotion: val("emotion"),
        discipline: val("discipline"),
        patience: val("patience"),

        /* =========================
           REVIEW
           ========================= */

        tradeSummary: val("tradeSummary"),
        strengths: val("strengths"),
        mistakes: val("mistakes"),
        lessonLearned: val("lessonLearned"),
        improvementPlan: val("improvementPlan"),

        /* =========================
           CHART REFERENCES
           ========================= */

        beforeChart: val("beforeChart"),
        duringChart: val("duringChart"),
        afterChart: val("afterChart"),

        notes: val("notes"),

        /* =========================
           STATUS
           ========================= */

        status:
            isUpdate && editingTrade
                ? editingTrade.status
                : "Pending",

        created:
            isUpdate && editingTrade
                ? editingTrade.created
                : new Date().toISOString(),

        closed:
            isUpdate && editingTrade
                ? editingTrade.closed
                : null
    };
}


/* ==========================================================
   SAVE / UPDATE TRADE
   ========================================================== */

function saveTrade(event) {

    event.preventDefault();

    const form = event.target;

    const updateMode = $("updateMode");

    const isUpdate =
        updateMode &&
        updateMode.value === "true";

    loadTrades();

    /* =========================
       UPDATE EXISTING TRADE
       ========================= */

    if (isUpdate && editingTrade) {

        const index = trades.findIndex(
            trade => trade.id === editingTrade.id
        );

        if (index === -1) {

            alert(
                "❌ The trade could not be found."
            );

            return;
        }

        const updatedTrade =
            buildTradeFromForm(true);

        trades[index] = updatedTrade;

        saveTrades();

        alert("✅ Trade updated successfully.");

        window.location.href = "/history";

        return;
    }


    /* =========================
       NEW TRADE
       ========================= */

    const newTrade =
        buildTradeFromForm(false);

    trades.unshift(newTrade);

    saveTrades();

    form.reset();

    refreshUI();

    alert("✅ Trade saved as Pending.");
}


/* ==========================================================
   EDIT MODE
   ========================================================== */

function getEditId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get("edit");
}


/* ==========================================================
   POPULATE FORM
   ========================================================== */

function populateForm(trade) {

    if (!trade) {

        console.warn(
            "⚠️ populateForm called without trade"
        );

        return;
    }

    console.log(
        "📝 Loading trade into form:",
        trade
    );


    /* ======================================================
       NORMAL FIELDS
       ====================================================== */

    const fields = [

        "tradeDate",
        "tradeTime",

        "pair",
        "direction",
        "session",
        "broker",
        "account",

        "lotSize",

        /* HTF */
        "htfSwing",
        "htfInternal",

        /* MTF */
        "mtfSwing",
        "mtfInternal",

        /* LTF */
        "ltfStructure",
        "liquidity",
        "poi",
        "entryModel",
        "entryConfirmation",
        "tradeValid",

        /* Execution */
        "entry",
        "stopLoss",
        "takeProfit",
        "risk",
        "rr",
        "profit",
        "commission",
        "result",

        /* Psychology */
        "confidence",
        "emotion",
        "discipline",
        "patience",

        /* Review */
        "tradeSummary",
        "strengths",
        "mistakes",
        "lessonLearned",
        "improvementPlan",

        /* Charts */
        "beforeChart",
        "duringChart",
        "afterChart",

        "notes"
    ];


    fields.forEach(id => {

        const element = $(id);

        if (!element) {

            console.warn(
                `⚠️ Form element #${id} does not exist`
            );

            return;
        }


        if (
            trade[id] !== undefined &&
            trade[id] !== null
        ) {

            element.value =
                String(trade[id]);

            console.log(
                `✅ ${id}:`,
                trade[id]
            );
        }

    });


    /* ======================================================
       CHECKBOXES / CONFLUENCES
       ====================================================== */

    const confluenceMap = {

        htfSwing: "confHTFSwing",
        htfInternal: "confHTFInternal",

        mtfSwing: "confMTFSwing",
        mtfInternal: "confMTFInternal",

        htfDemand: "confHTFDemand",
        htfSupply: "confHTFSupply",

        mtfDemand: "confMTFDemand",
        mtfSupply: "confMTFSupply",

        premium: "confPremium",
        discount: "confDiscount",

        sweep: "confSweep",

        choch: "confChoch",
        bos: "confBos",

        mitigation: "confMitigation",
        refined: "confRefined",
        extreme: "confExtreme"
    };


    /* First reset every checkbox */

    Object.values(confluenceMap)
        .forEach(id => {

            const checkbox = $(id);

            if (checkbox) {
                checkbox.checked = false;
            }

        });


    /* Then restore saved values */

    if (trade.confluences) {

        Object.entries(
            confluenceMap
        ).forEach(([key, id]) => {

            const checkbox = $(id);

            if (!checkbox) return;

            checkbox.checked =
                trade.confluences[key] === true;

            console.log(
                `☑️ ${id}:`,
                checkbox.checked
            );

        });

    }


    /* ======================================================
       UPDATE BUTTON
       ====================================================== */

    const submitButton =
        document.querySelector(
            "#tradeForm button[type='submit']"
        );

    if (submitButton) {

        submitButton.innerHTML =
            '<i class="fa-solid fa-pen"></i> Update Trade';

        submitButton.classList.add(
            "btn-update"
        );
    }


    /* ======================================================
       UPDATE MODE FLAG
       ====================================================== */

    const form = $("tradeForm");

    if (form) {

        let updateFlag =
            $("updateMode");

        if (!updateFlag) {

            updateFlag =
                document.createElement("input");

            updateFlag.type = "hidden";
            updateFlag.id = "updateMode";
            updateFlag.name = "updateMode";

            form.appendChild(updateFlag);
        }

        updateFlag.value = "true";
    }


    /* ======================================================
       PAGE TITLE
       ====================================================== */

    const header =
        document.querySelector(
            ".page-header h1"
        );

    if (header) {

        header.innerHTML =
            '<i class="fa-solid fa-pen"></i> Edit Trade';
    }


    /* ======================================================
       TRIGGER CALCULATIONS
       ====================================================== */

    setTimeout(() => {

        const form =
            $("tradeForm");

        if (!form) return;

        /*
         * Trigger input/change events so
         * your automatic risk calculator
         * sees the loaded values.
         */

        form.querySelectorAll(
            "input, select, textarea"
        ).forEach(element => {

            element.dispatchEvent(
                new Event("input", {
                    bubbles: true
                })
            );

            element.dispatchEvent(
                new Event("change", {
                    bubbles: true
                })
            );

        });

        console.log(
            "🧮 Risk calculations refreshed after edit load."
        );

    }, 100);

}


/* ==========================================================
   INITIALIZE EDIT MODE
   ========================================================== */

function initializeEditMode() {

    const editId =
        getEditId();

    if (!editId) {

        console.log(
            "ℹ️ New trade mode."
        );

        return;
    }


    console.log(
        "🔍 Edit ID:",
        editId
    );


    loadTrades();


    editingTrade =
        trades.find(
            trade =>
                String(trade.id) ===
                String(editId)
        );


    if (!editingTrade) {

        console.error(
            "❌ Trade not found:",
            editId
        );

        console.log(
            "Available trade IDs:",
            trades.map(t => t.id)
        );

        alert(
            "The selected trade could not be found."
        );

        return;
    }


    console.log(
        "✅ Trade found for editing:",
        editingTrade
    );


    populateForm(
        editingTrade
    );
}


/* ==========================================================
   DASHBOARD
   ========================================================== */

function loadDashboard() {

    const closed =
        trades.filter(
            trade =>
                trade.status === "Closed"
        );

    const wins =
        closed.filter(
            trade =>
                trade.result === "Win"
        );

    const losses =
        closed.filter(
            trade =>
                trade.result === "Loss"
        );

    const pending =
        trades.filter(
            trade =>
                trade.status === "Pending"
        );


    const totalTrades =
        closed.length;

    const totalWins =
        wins.length;

    const totalLosses =
        losses.length;


    const winRate =
        totalTrades === 0
            ? 0
            : (totalWins / totalTrades) * 100;


    const netProfit =
        closed.reduce(
            (sum, trade) =>

                sum +
                (parseFloat(trade.profit) || 0) -
                (parseFloat(trade.commission) || 0),

            0
        );


    const avgRR =
        totalTrades === 0
            ? 0
            : closed.reduce(
                (sum, trade) =>
                    sum +
                    (parseFloat(trade.rr) || 0),
                0
            ) / totalTrades;


    setText(
        "totalTrades",
        totalTrades
    );

    setText(
        "wins",
        totalWins
    );

    setText(
        "losses",
        totalLosses
    );

    setText(
        "winRate",
        winRate.toFixed(1) + "%"
    );

    setText(
        "averageRR",
        avgRR.toFixed(2)
    );

    setText(
        "netProfit",
        "$" + netProfit.toFixed(2)
    );

    setText(
        "pendingTrades",
        pending.length
    );


    calculatePerformance(
        closed
    );
}


/* ==========================================================
   PERFORMANCE
   ========================================================== */

function calculatePerformance(closed) {

    if (closed.length === 0) {

        setText("bestPair", "-");
        setText("worstPair", "-");
        setText("bestSession", "-");
        setText("winStreak", "0");

        return;
    }


    const pairStats = {};
    const sessionStats = {};

    let streak = 0;
    let bestStreak = 0;


    closed.forEach(trade => {

        const pair =
            trade.pair || "?";

        const session =
            trade.session || "?";

        const profit =
            parseFloat(trade.profit) || 0;


        pairStats[pair] =
            (pairStats[pair] || 0) +
            profit;


        sessionStats[session] =
            (sessionStats[session] || 0) +
            profit;


        if (trade.result === "Win") {

            streak++;

            if (streak > bestStreak) {
                bestStreak = streak;
            }

        } else {

            streak = 0;
        }

    });


    const pairs =
        Object.keys(pairStats);

    const sessions =
        Object.keys(sessionStats);


    const bestPair =
        pairs.sort(
            (a, b) =>
                pairStats[b] -
                pairStats[a]
        )[0];


    const worstPair =
        pairs.sort(
            (a, b) =>
                pairStats[a] -
                pairStats[b]
        )[0];


    const bestSession =
        sessions.sort(
            (a, b) =>
                sessionStats[b] -
                sessionStats[a]
        )[0];


    setText(
        "bestPair",
        bestPair || "-"
    );

    setText(
        "worstPair",
        worstPair || "-"
    );

    setText(
        "bestSession",
        bestSession || "-"
    );

    setText(
        "winStreak",
        bestStreak
    );
}


/* ==========================================================
   RECENT TRADES
   ========================================================== */

function loadRecentTrades() {

    const container =
        $("recentTrades");

    if (!container) return;


    if (trades.length === 0) {

        container.innerHTML =
            '<div class="loading-card">No trades yet.</div>';

        return;
    }


    container.innerHTML = "";


    trades
        .slice(0, 8)
        .forEach(trade => {

            container.innerHTML += `

                <div class="trade-row">

                    <div>
                        <strong>
                            ${trade.pair || "?"}
                        </strong>

                        <br>

                        ${trade.direction || ""}
                    </div>

                    <div>
                        ${trade.entryModel || "-"}
                    </div>

                    <div>

                        <span class="
                            status
                            ${(trade.status || "Pending")
                                .toLowerCase()}
                        ">
                            ${trade.status || "Pending"}
                        </span>

                    </div>

                    <div>

                        <button
                            onclick="closeTrade('${trade.id}')"
                            class="btn">
                            Close
                        </button>

                    </div>

                </div>

            `;
        });
}


/* ==========================================================
   CLOSE TRADE
   ========================================================== */

function closeTrade(id) {

    const trade =
        trades.find(
            t => t.id === id
        );

    if (!trade) return;


    if (trade.status === "Closed") {

        viewTrade(trade);

        return;
    }


    const outcome =
        prompt(
            "Result?\n\nWin\nLoss\nBreakeven"
        );

    if (!outcome) return;


    const profit =
        parseFloat(
            prompt(
                "Profit/Loss ($)",
                0
            )
        ) || 0;


    const commission =
        parseFloat(
            prompt(
                "Commission ($)",
                0
            )
        ) || 0;


    const rr =
        parseFloat(
            prompt(
                "Actual RR",
                0
            )
        ) || 0;


    const management =
        prompt(
            "Management Quality\nExcellent\nGood\nAverage\nPoor"
        );


    const psych =
        prompt(
            "Psychology Notes"
        );


    const lesson =
        prompt(
            "Lesson Learned"
        );


    const improvement =
        prompt(
            "Improvement"
        );


    trade.status = "Closed";
    trade.closed =
        new Date().toISOString();

    trade.result = outcome;

    trade.profit = profit;

    trade.commission =
        commission;

    trade.rr = rr;

    trade.management =
        management;

    trade.psychologyNote =
        psych;

    trade.reviewNote = {
        lesson,
        improvement
    };


    saveTrades();

    refreshUI();

    alert(
        "✅ Trade closed successfully."
    );
}


/* ==========================================================
   VIEW TRADE
   ========================================================== */

function viewTrade(trade) {

    alert(`

PAIR        : ${trade.pair}
STATUS      : ${trade.status}
RESULT      : ${trade.result}
PROFIT      : $${trade.profit}
RR          : ${trade.rr}

LESSON      :
${trade.reviewNote?.lesson || "-"}

IMPROVEMENT :
${trade.reviewNote?.improvement || "-"}

    `);
}


/* ==========================================================
   CHARTS
   ========================================================== */

function initializeCharts() {

    if (
        typeof Chart ===
        "undefined"
    ) {
        return;
    }


    destroyAllCharts();

    buildEquityChart();

    buildMonthlyChart();
}


function destroyAllCharts() {

    if (equityChartInstance) {

        equityChartInstance.destroy();

        equityChartInstance = null;
    }


    if (monthlyChartInstance) {

        monthlyChartInstance.destroy();

        monthlyChartInstance = null;
    }


    ["equityChart", "monthlyChart"]
        .forEach(id => {

            const canvas = $(id);

            if (!canvas) return;


            if (
                typeof Chart.getChart ===
                "function"
            ) {

                const existing =
                    Chart.getChart(canvas);

                if (existing) {
                    existing.destroy();
                }
            }

        });
}


function buildEquityChart() {

    const canvas =
        $("equityChart");

    if (!canvas) return;


    const closed =
        trades.filter(
            trade =>
                trade.status === "Closed"
        );


    let balance = 0;

    const data = [];


    closed.forEach(trade => {

        balance +=
            (parseFloat(trade.profit) || 0) -
            (parseFloat(trade.commission) || 0);

        data.push(balance);

    });


    equityChartInstance =
        new Chart(canvas, {

            type: "line",

            data: {

                labels:
                    data.map(
                        (_, index) =>
                            index + 1
                    ),

                datasets: [{

                    label: "Equity",

                    data,

                    borderColor:
                        "#4f7cff",

                    backgroundColor:
                        "rgba(79,124,255,0.15)",

                    fill: true,

                    tension: 0.3

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio:
                    false

            }

        });
}


function buildMonthlyChart() {

    const canvas =
        $("monthlyChart");

    if (!canvas) return;


    const monthly = {};


    trades
        .filter(
            trade =>
                trade.status === "Closed"
        )
        .forEach(trade => {

            const month =
                new Date(
                    trade.closed
                ).toLocaleString(
                    "default",
                    {
                        month: "short"
                    }
                );


            monthly[month] =
                (monthly[month] || 0) +

                (parseFloat(
                    trade.profit
                ) || 0) -

                (parseFloat(
                    trade.commission
                ) || 0);

        });


    monthlyChartInstance =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    Object.keys(monthly),

                datasets: [{

                    label:
                        "Monthly P&L",

                    data:
                        Object.values(monthly),

                    backgroundColor:
                        "#4f7cff",

                    borderRadius: 6

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio:
                    false

            }

        });
}


/* ==========================================================
   REFRESH UI
   ========================================================== */

function refreshUI() {

    loadTrades();

    loadDashboard();

    loadRecentTrades();

    initializeCharts();
}


/* ==========================================================
   FORM INITIALIZATION
   ========================================================== */

function initializeForm() {

    const form =
        $("tradeForm");

    if (!form) {

        console.log(
            "ℹ️ Journal form not found."
        );

        return;
    }


    /*
     * Remove any previous listener
     * registered by this module.
     */

    form.removeEventListener(
        "submit",
        saveTrade
    );


    form.addEventListener(
        "submit",
        saveTrade
    );


    console.log(
        "✅ Journal form ready."
    );
}


/* ==========================================================
   PAGE INITIALIZATION
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "🚀 Initializing GTRADES AXIS Journal..."
        );


        try {

            await checkJournalAccess();


            /*
             * Access approved.
             */

            loadTrades();


            /*
             * IMPORTANT:
             * Form must exist before edit mode
             * attempts to populate it.
             */

            initializeForm();


            /*
             * Populate edit form AFTER
             * the DOM and form are ready.
             */

            initializeEditMode();


            /*
             * Dashboard / charts.
             */

            refreshUI();


            console.log(
                "✅ GTRADES AXIS Journal Ready."
            );

        } catch (error) {

            console.log(
                "Journal initialization stopped:",
                error
            );

        }

    }
);


/* ==========================================================
   STORAGE EVENT
   ========================================================== */

window.addEventListener(
    "storage",
    event => {

        if (
            event.key ===
            STORAGE_KEY
        ) {

            loadTrades();

            refreshUI();
        }

    }
);


/* ==========================================================
   GLOBAL FUNCTIONS
   ========================================================== */

window.closeTrade =
    closeTrade;

window.viewTrade =
    viewTrade;


/* ==========================================================
   DEBUG
   ========================================================== */

console.log(
    "✅ journal.js loaded"
);