/* ==========================================================
   GTRADES AXIS™
   PREMIUM TRADING JOURNAL
   USER + MULTI ACCOUNT SYSTEM
   FIRESTORE VERSION
   ========================================================== */

import { auth, db } from "./firebase.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";


/* ==========================================================
   GLOBAL STATE
   ========================================================== */

let currentUser = null;
let currentAccount = null;
let accounts = [];
let trades = [];

let editingTrade = null;

let equityChartInstance = null;
let monthlyChartInstance = null;


/* ==========================================================
   FIRESTORE PATHS
   ========================================================== */

function accountsRef() {

    return collection(
        db,
        "users",
        currentUser.uid,
        "journalAccounts"
    );

}


function accountRef(accountId) {

    return doc(
        db,
        "users",
        currentUser.uid,
        "journalAccounts",
        accountId
    );

}


function tradesRef(accountId) {

    return collection(
        db,
        "users",
        currentUser.uid,
        "journalAccounts",
        accountId,
        "trades"
    );

}


/* ==========================================================
   JOURNAL ACCESS
   ========================================================== */

async function checkJournalAccess(user) {

    const snap = await getDoc(
        doc(db, "users", user.uid)
    );

    if (!snap.exists()) {

        throw new Error("User account not found.");

    }

    const data = snap.data();

    const role = data.role || "member";
    const membership = data.membership || "free";

    const allowed =
        role === "admin" ||
        membership === "premium";

    if (!allowed) {

        document.body.innerHTML = `

        <div style="
            min-height:100vh;
            display:flex;
            justify-content:center;
            align-items:center;
            background:#0b1120;
            color:white;
            font-family:Arial;
            text-align:center;
            padding:30px;
        ">

            <div>

                <i class="fa-solid fa-lock"
                   style="
                   font-size:65px;
                   color:#fbbf24;
                   margin-bottom:20px;
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

        throw new Error("Journal blocked.");

    }

}


/* ==========================================================
   HELPERS
   ========================================================== */

function $(id) {

    return document.getElementById(id);

}


function val(id) {

    const el = $(id);

    return el ? el.value : "";

}


function num(id) {

    return parseFloat(val(id)) || 0;

}


function isChecked(id) {

    const el = $(id);

    return el ? el.checked : false;

}


function setText(id, text) {

    const el = $(id);

    if (el) {

        el.textContent = text;

    }

}


/* ==========================================================
   LOAD USER ACCOUNTS
   ========================================================== */

async function loadAccounts() {

    if (!currentUser) return;

    const snap = await getDocs(
        query(
            accountsRef(),
            orderBy("createdAt", "asc")
        )
    );

    accounts = [];

    snap.forEach(docSnap => {

        accounts.push({

            id: docSnap.id,

            ...docSnap.data()

        });

    });


    /*
       Restore previously selected account
    */

    const savedAccount =
        localStorage.getItem(
            `gtrades_selected_account_${currentUser.uid}`
        );


    if (savedAccount) {

        currentAccount =
            accounts.find(
                a => a.id === savedAccount
            ) || null;

    }


    if (!currentAccount && accounts.length) {

        currentAccount = accounts[0];

    }


    renderAccountSelector();


    if (currentAccount) {

        await loadTrades();

    }

}


/* ==========================================================
   ACCOUNT SELECTOR
   ========================================================== */

function renderAccountSelector() {

    let selector = $("journalAccountSelector");

    /*
       If the HTML does not already contain it,
       create it automatically.
    */

    if (!selector) {

        const header =
            document.querySelector(".page-header");

        if (!header) return;

        selector =
            document.createElement("div");

        selector.id =
            "journalAccountSelector";

        selector.style.cssText = `
            margin:20px 0;
        `;

        header.after(selector);

    }


    selector.innerHTML = `

        <div style="
            display:flex;
            gap:12px;
            align-items:center;
            flex-wrap:wrap;
        ">

            <label style="
                color:#94a3b8;
                font-weight:600;
            ">
                Trading Account
            </label>

            <select id="journalAccountSelect"
                style="
                    min-width:260px;
                    padding:12px 15px;
                    border-radius:8px;
                    border:1px solid #334155;
                    background:#111827;
                    color:white;
                    outline:none;
                ">

                ${
                    accounts.length

                    ?

                    accounts.map(account => `

                        <option
                            value="${account.id}"
                            ${
                                currentAccount &&
                                currentAccount.id === account.id
                                ? "selected"
                                : ""
                            }
                        >
                            ${escapeHTML(account.name || "Trading Account")}
                        </option>

                    `).join("")

                    :

                    `
                    <option value="">
                        No trading accounts yet
                    </option>
                    `
                }

            </select>

            <button
                id="addTradingAccountBtn"
                type="button"
                style="
                    padding:12px 16px;
                    border:0;
                    border-radius:8px;
                    background:#1d9bf0;
                    color:white;
                    cursor:pointer;
                    font-weight:600;
                "
            >
                <i class="fa-solid fa-plus"></i>
                Add Account
            </button>

        </div>

    `;


    const select =
        $("journalAccountSelect");


    if (select) {

        select.addEventListener(
            "change",
            async function () {

                const account =
                    accounts.find(
                        a => a.id === this.value
                    );

                if (!account) return;

                currentAccount = account;

                localStorage.setItem(
                    `gtrades_selected_account_${currentUser.uid}`,
                    account.id
                );

                await loadTrades();

            }
        );

    }


    const addBtn =
        $("addTradingAccountBtn");


    if (addBtn) {

        addBtn.addEventListener(
            "click",
            createTradingAccount
        );

    }

}


/* ==========================================================
   CREATE TRADING ACCOUNT
   ========================================================== */

async function createTradingAccount() {

    const name =
        prompt(
            "Account Name\n\nExample:\nEquity Edge $10K"
        );

    if (!name) return;


    const broker =
        prompt(
            "Broker / Prop Firm\n\nExample:\nEquity Edge"
        ) || "";


    const type =
        prompt(
            "Account Type\n\nProp Firm\nPersonal\nBroker"
        ) || "Prop Firm";


    const startingBalance =
        parseFloat(
            prompt(
                "Starting Balance ($)",
                "10000"
            )
        ) || 0;


    const maxDrawdown =
        parseFloat(
            prompt(
                "Maximum Drawdown ($)",
                "500"
            )
        ) || 0;


    const dailyLossLimit =
        parseFloat(
            prompt(
                "Daily Loss Limit ($)",
                "300"
            )
        ) || 0;


    const target =
        parseFloat(
            prompt(
                "Profit Target ($)",
                "0"
            )
        ) || 0;


    try {

        const account = await addDoc(
            accountsRef(),
            {

                name,

                broker,

                accountType: type,

                startingBalance,

                currentBalance: startingBalance,

                maxDrawdown,

                dailyLossLimit,

                target,

                createdAt: serverTimestamp()

            }
        );


        currentAccount = {

            id: account.id,

            name,

            broker,

            accountType: type,

            startingBalance,

            currentBalance: startingBalance,

            maxDrawdown,

            dailyLossLimit,

            target

        };


        localStorage.setItem(
            `gtrades_selected_account_${currentUser.uid}`,
            account.id
        );


        await loadAccounts();

        alert(
            "✅ Trading account created successfully."
        );


    } catch (error) {

        console.error(
            "Account creation error:",
            error
        );

        alert(
            "Unable to create trading account."
        );

    }

}


/* ==========================================================
   LOAD TRADES FOR SELECTED ACCOUNT
   ========================================================== */

async function loadTrades() {

    if (!currentAccount) {

        trades = [];

        refreshUI();

        return;

    }


    try {

        const snap = await getDocs(
            query(
                tradesRef(currentAccount.id),
                orderBy("createdAt", "desc")
            )
        );


        trades = [];

        snap.forEach(docSnap => {

            trades.push({

                id: docSnap.id,

                ...docSnap.data()

            });

        });


        refreshUI();


    } catch (error) {

        console.error(
            "Trade loading error:",
            error
        );

    }

}


/* ==========================================================
   BUILD TRADE
   ========================================================== */

function buildTradeFromForm() {

    return {

        date: val("tradeDate"),

        time: val("tradeTime"),

        pair: val("pair"),

        direction: val("direction"),

        session: val("session"),

        broker: val("broker"),

        account: currentAccount
            ? currentAccount.name
            : val("account"),

        lotSize: num("lotSize"),


        htfSwing: val("htfSwing"),

        htfInternal: val("htfInternal"),

        mtfSwing: val("mtfSwing"),

        mtfInternal: val("mtfInternal"),


        ltfStructure: val("ltfStructure"),

        liquidity: val("liquidity"),

        poi: val("poi"),

        entryModel: val("entryModel"),

        entryConfirmation:
            val("entryConfirmation"),

        tradeValid: val("tradeValid"),


        confluences: {

            htfSwing:
                isChecked("confHTFSwing"),

            htfInternal:
                isChecked("confHTFInternal"),

            mtfSwing:
                isChecked("confMTFSwing"),

            mtfInternal:
                isChecked("confMTFInternal"),

            htfDemand:
                isChecked("confHTFDemand"),

            htfSupply:
                isChecked("confHTFSupply"),

            mtfDemand:
                isChecked("confMTFDemand"),

            mtfSupply:
                isChecked("confMTFSupply"),

            premium:
                isChecked("confPremium"),

            discount:
                isChecked("confDiscount"),

            sweep:
                isChecked("confSweep"),

            choch:
                isChecked("confChoch"),

            bos:
                isChecked("confBos"),

            mitigation:
                isChecked("confMitigation"),

            refined:
                isChecked("confRefined"),

            extreme:
                isChecked("confExtreme")

        },


        entry: num("entry"),

        stopLoss: num("stopLoss"),

        takeProfit: num("takeProfit"),

        risk: num("risk"),

        rr: num("rr"),

        profit: num("profit"),

        commission: num("commission"),

        result:
            val("result") || "Pending",


        confidence:
            val("confidence"),

        emotion:
            val("emotion"),

        discipline:
            val("discipline"),

        patience:
            val("patience"),


        tradeSummary:
            val("tradeSummary"),

        strengths:
            val("strengths"),

        mistakes:
            val("mistakes"),

        lessonLearned:
            val("lessonLearned"),

        improvementPlan:
            val("improvementPlan"),


        beforeChart:
            val("beforeChart"),

        duringChart:
            val("duringChart"),

        afterChart:
            val("afterChart"),

        notes:
            val("notes"),


        status:
            editingTrade
                ? editingTrade.status
                : "Pending",

        createdAt:
            editingTrade
                ? editingTrade.createdAt
                : serverTimestamp(),

        closed:
            editingTrade
                ? editingTrade.closed
                : null

    };

}


/* ==========================================================
   SAVE TRADE
   ========================================================== */

async function saveTrade(e) {

    e.preventDefault();


    if (!currentAccount) {

        alert(
            "Please create or select a trading account first."
        );

        return;

    }


    const trade =
        buildTradeFromForm();


    try {

        if (editingTrade) {

            await updateDoc(

                doc(
                    tradesRef(currentAccount.id),
                    editingTrade.id
                ),

                trade

            );


            alert(
                "✅ Trade updated successfully."
            );


            editingTrade = null;

            window.location.href =
                "/journal";


            return;

        }


        await addDoc(

            tradesRef(currentAccount.id),

            trade

        );


        e.target.reset();

        alert(
            "✅ Trade saved."
        );


        await loadTrades();


    } catch (error) {

        console.error(
            "Save trade error:",
            error
        );

        alert(
            "Unable to save trade."
        );

    }

}


/* ==========================================================
   DASHBOARD
   ========================================================== */

function loadDashboard() {

    const closed =
        trades.filter(
            t => t.status === "Closed"
        );


    const wins =
        closed.filter(
            t => t.result === "Win"
        );


    const losses =
        closed.filter(
            t => t.result === "Loss"
        );


    const pending =
        trades.filter(
            t => t.status === "Pending"
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
            : totalWins / totalTrades * 100;


    const netProfit =
        closed.reduce(
            (sum, t) =>
                sum +
                (parseFloat(t.profit) || 0) -
                (parseFloat(t.commission) || 0),
            0
        );


    const avgRR =
        totalTrades === 0
            ? 0
            : closed.reduce(
                (sum, t) =>
                    sum +
                    (parseFloat(t.rr) || 0),
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


    /*
       ACCOUNT BALANCE
    */

    if (currentAccount) {

        const balance =
            (
                parseFloat(
                    currentAccount.startingBalance
                ) || 0
            ) + netProfit;


        setText(
            "accountBalance",
            "$" + balance.toFixed(2)
        );


        /*
           Update account balance in Firestore
        */

        updateDoc(

            accountRef(
                currentAccount.id
            ),

            {
                currentBalance:
                    balance
            }

        ).catch(console.error);

    }


    calculatePerformance(
        closed
    );


    calculateConsistency(
        closed
    );

}


/* ==========================================================
   CONSISTENCY
   ========================================================== */

/*
   Consistency =
   Best profitable day ÷ Total Net Profit × 100

   Example:

   Total profit = $500
   Best day = $100

   Consistency = 20%

   Lower percentage = more evenly distributed profits.
*/

function calculateConsistency(closed) {

    if (!closed.length) {

        setText(
            "consistency",
            "0%"
        );

        setText(
            "bestDayProfit",
            "$0.00"
        );

        return;

    }


    const dailyProfit = {};


    closed.forEach(trade => {

        const date =
            trade.date ||
            (
                trade.closed
                    ? new Date(
                        trade.closed
                    ).toISOString().slice(0, 10)
                    : "unknown"
            );


        const pnl =
            (parseFloat(trade.profit) || 0) -
            (parseFloat(trade.commission) || 0);


        dailyProfit[date] =
            (
                dailyProfit[date] || 0
            ) + pnl;

    });


    const totalNetProfit =
        Object.values(
            dailyProfit
        ).reduce(
            (a, b) => a + b,
            0
        );


    const bestDay =
        Math.max(
            ...Object.values(
                dailyProfit
            )
        );


    let consistency = 0;


    if (totalNetProfit > 0) {

        consistency =
            (
                bestDay /
                totalNetProfit
            ) * 100;

    }


    setText(
        "consistency",
        consistency.toFixed(2) + "%"
    );


    setText(
        "bestDayProfit",
        "$" + bestDay.toFixed(2)
    );


    /*
       Optional extra dashboard fields
    */

    setText(
        "totalNetProfit",
        "$" + totalNetProfit.toFixed(2)
    );

}


/* ==========================================================
   PERFORMANCE
   ========================================================== */

function calculatePerformance(
    closed
) {

    if (!closed.length) {

        setText(
            "bestPair",
            "-"
        );

        setText(
            "worstPair",
            "-"
        );

        setText(
            "bestSession",
            "-"
        );

        setText(
            "winStreak",
            "0"
        );

        return;

    }


    const pairStats = {};

    const sessionStats = {};

    let streak = 0;

    let bestStreak = 0;


    closed.forEach(t => {

        const pair =
            t.pair || "?";


        const session =
            t.session || "?";


        const profit =
            (
                parseFloat(t.profit) || 0
            ) -
            (
                parseFloat(t.commission) || 0
            );


        pairStats[pair] =
            (
                pairStats[pair] || 0
            ) + profit;


        sessionStats[session] =
            (
                sessionStats[session] || 0
            ) + profit;


        if (t.result === "Win") {

            streak++;

            bestStreak =
                Math.max(
                    bestStreak,
                    streak
                );

        } else {

            streak = 0;

        }

    });


    const pairs =
        Object.keys(
            pairStats
        );


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


    const sessions =
        Object.keys(
            sessionStats
        );


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


    if (!trades.length) {

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
                            ${escapeHTML(
                                trade.pair || "?"
                            )}
                        </strong>

                        <br>

                        ${escapeHTML(
                            trade.direction || ""
                        )}

                    </div>


                    <div>

                        ${escapeHTML(
                            trade.entryModel || "-"
                        )}

                    </div>


                    <div>

                        <span class="
                            status
                            ${(
                                trade.status ||
                                "Pending"
                            ).toLowerCase()}
                        ">

                            ${escapeHTML(
                                trade.status ||
                                "Pending"
                            )}

                        </span>

                    </div>


                    <div>

                        <button
                            class="btn"
                            data-close-id="${trade.id}"
                        >
                            Close
                        </button>

                    </div>

                </div>

            `;

        });


    container
        .querySelectorAll(
            "[data-close-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    closeTrade(
                        button.dataset.closeId
                    )
            );

        });

}


/* ==========================================================
   CLOSE TRADE
   ========================================================== */

async function closeTrade(id) {

    if (!currentAccount) return;


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
                "0"
            )
        ) || 0;


    const commission =
        parseFloat(
            prompt(
                "Commission ($)",
                "0"
            )
        ) || 0;


    const rr =
        parseFloat(
            prompt(
                "Actual RR",
                "0"
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


    try {

        await updateDoc(

            doc(
                tradesRef(
                    currentAccount.id
                ),
                id
            ),

            {

                status: "Closed",

                closed:
                    new Date().toISOString(),

                result:
                    outcome,

                profit,

                commission,

                rr,

                management,

                psychologyNote:
                    psych,

                reviewNote: {

                    lesson,

                    improvement

                }

            }

        );


        await loadTrades();


        alert(
            "✅ Trade closed successfully."
        );


    } catch (error) {

        console.error(
            error
        );

        alert(
            "Unable to close trade."
        );

    }

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

LESSON      : ${
        trade.reviewNote?.lesson || "-"
    }

IMPROVEMENT : ${
        trade.reviewNote?.improvement || "-"
    }

    `);

}


/* ==========================================================
   REFRESH UI
   ========================================================== */

function refreshUI() {

    loadDashboard();

    loadRecentTrades();

    initializeCharts();

}


/* ==========================================================
   CHARTS
   ========================================================== */

function initializeCharts() {

    if (
        typeof Chart === "undefined"
    ) return;


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

}


/* ==========================================================
   EQUITY CHART
   ========================================================== */

function buildEquityChart() {

    const canvas =
        $("equityChart");


    if (!canvas) return;


    const closed =
        trades.filter(
            t => t.status === "Closed"
        );


    let balance =
        currentAccount
            ? (
                parseFloat(
                    currentAccount.startingBalance
                ) || 0
            )
            : 0;


    const data = [];


    closed
        .slice()
        .reverse()
        .forEach(trade => {

            balance +=
                (
                    parseFloat(
                        trade.profit
                    ) || 0
                ) -
                (
                    parseFloat(
                        trade.commission
                    ) || 0
                );


            data.push(balance);

        });


    equityChartInstance =
        new Chart(

            canvas,

            {

                type: "line",

                data: {

                    labels:
                        data.map(
                            (_, i) =>
                                i + 1
                        ),

                    datasets: [{

                        label:
                            "Equity",

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

            }

        );

}


/* ==========================================================
   MONTHLY CHART
   ========================================================== */

function buildMonthlyChart() {

    const canvas =
        $("monthlyChart");


    if (!canvas) return;


    const monthly = {};


    trades
        .filter(
            t => t.status === "Closed"
        )
        .forEach(trade => {

            const date =
                trade.closed
                    ? new Date(
                        trade.closed
                    )
                    : new Date();


            const month =
                date.toLocaleString(
                    "default",
                    {
                        month: "short",
                        year: "numeric"
                    }
                );


            const pnl =
                (
                    parseFloat(
                        trade.profit
                    ) || 0
                ) -
                (
                    parseFloat(
                        trade.commission
                    ) || 0
                );


            monthly[month] =
                (
                    monthly[month] || 0
                ) + pnl;

        });


    monthlyChartInstance =
        new Chart(

            canvas,

            {

                type: "bar",

                data: {

                    labels:
                        Object.keys(
                            monthly
                        ),

                    datasets: [{

                        label:
                            "Monthly P&L",

                        data:
                            Object.values(
                                monthly
                            ),

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

            }

        );

}


/* ==========================================================
   EDIT TRADE
   ========================================================== */

async function loadEditTrade() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const editId =
        params.get("edit");


    if (!editId ||
        !currentAccount) {

        return;

    }


    const snap =
        await getDoc(

            doc(
                tradesRef(
                    currentAccount.id
                ),
                editId
            )

        );


    if (!snap.exists()) {

        console.warn(
            "Trade not found."
        );

        return;

    }


    editingTrade = {

        id: snap.id,

        ...snap.data()

    };


    populateForm(
        editingTrade
    );

}


/* ==========================================================
   POPULATE FORM
   ========================================================== */

function populateForm(trade) {

    const fields = [

        "tradeDate",
        "tradeTime",
        "pair",
        "direction",
        "session",
        "broker",
        "account",
        "lotSize",

        "htfSwing",
        "htfInternal",

        "mtfSwing",
        "mtfInternal",

        "ltfStructure",
        "liquidity",
        "poi",
        "entryModel",
        "entryConfirmation",
        "tradeValid",

        "entry",
        "stopLoss",
        "takeProfit",
        "risk",
        "rr",
        "profit",
        "commission",
        "result",

        "confidence",
        "emotion",
        "discipline",
        "patience",

        "tradeSummary",
        "strengths",
        "mistakes",
        "lessonLearned",
        "improvementPlan",

        "beforeChart",
        "duringChart",
        "afterChart",
        "notes"

    ];


    fields.forEach(id => {

        const el = $(id);


        if (
            el &&
            trade[id] !== undefined &&
            trade[id] !== null
        ) {

            el.value =
                trade[id];

        }

    });


    if (trade.confluences) {

        const mapping = {

            htfSwing:
                "confHTFSwing",

            htfInternal:
                "confHTFInternal",

            mtfSwing:
                "confMTFSwing",

            mtfInternal:
                "confMTFInternal",

            htfDemand:
                "confHTFDemand",

            htfSupply:
                "confHTFSupply",

            mtfDemand:
                "confMTFDemand",

            mtfSupply:
                "confMTFSupply",

            premium:
                "confPremium",

            discount:
                "confDiscount",

            sweep:
                "confSweep",

            choch:
                "confChoch",

            bos:
                "confBos",

            mitigation:
                "confMitigation",

            refined:
                "confRefined",

            extreme:
                "confExtreme"

        };


        Object.keys(
            trade.confluences
        ).forEach(key => {

            const checkbox =
                $(
                    mapping[key]
                );


            if (checkbox) {

                checkbox.checked =
                    trade.confluences[key];

            }

        });

    }


    const submit =
        document.querySelector(
            "#tradeForm button[type='submit']"
        );


    if (submit) {

        submit.innerHTML =
            '<i class="fa-solid fa-pen"></i> Update Trade';

    }


    const header =
        document.querySelector(
            ".page-header h1"
        );


    if (header) {

        header.innerHTML =
            '<i class="fa-solid fa-pen"></i> Edit Trade';

    }

}


/* ==========================================================
   ESCAPE HTML
   ========================================================== */

function escapeHTML(value) {

    return String(value || "")
        .replace(
            /[&<>"']/g,
            char => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            })[char]
        );

}


/* ==========================================================
   INITIALIZATION
   ========================================================== */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "/login";

            return;

        }


        try {

            currentUser = user;


            await checkJournalAccess(
                user
            );


            await loadAccounts();


            const form =
                $("tradeForm");


            if (form) {

                form.addEventListener(
                    "submit",
                    saveTrade
                );

            }


            await loadEditTrade();


            refreshUI();


            console.log(
                "✅ GTRADES Journal Ready"
            );


        } catch (error) {

            console.error(
                "Journal initialization error:",
                error
            );

        }

    }
);