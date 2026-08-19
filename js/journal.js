/* ==========================================================
   GTRADES AXIS™
   PREMIUM TRADING JOURNAL
   JOURNAL JS — FINAL VERSION
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


function tradeRef(accountId, tradeId) {

    return doc(
        db,
        "users",
        currentUser.uid,
        "journalAccounts",
        accountId,
        "trades",
        tradeId
    );

}


/* ==========================================================
   DOM HELPERS
   ========================================================== */

function $(id) {
    return document.getElementById(id);
}


function val(id) {

    const el = $(id);

    return el ? el.value.trim() : "";

}


function num(id) {

    const value = parseFloat(val(id));

    return Number.isFinite(value) ? value : 0;

}


function isChecked(id) {

    const el = $(id);

    return el ? el.checked : false;

}


function setText(id, value) {

    const el = $(id);

    if (el) {
        el.textContent = value;
    }

}


function escapeHTML(value) {

    return String(value ?? "")
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


function money(value) {

    const number = Number(value) || 0;

    return (
        number < 0 ? "-$" : "$"
    ) + Math.abs(number).toFixed(2);

}


function tradeNet(trade) {

    return (
        Number(trade.profit) || 0
    ) -
    (
        Number(trade.commission) || 0
    );

}


function normalizeResult(value) {

    const result =
        String(value || "")
            .trim()
            .toLowerCase();

    if (
        result === "win" ||
        result === "won" ||
        result === "profit"
    ) {
        return "Win";
    }

    if (
        result === "loss" ||
        result === "lost"
    ) {
        return "Loss";
    }

    if (
        result === "breakeven" ||
        result === "break even" ||
        result === "be"
    ) {
        return "Breakeven";
    }

    return "Pending";

}


/* ==========================================================
   PREMIUM ACCESS
   ========================================================== */

async function checkJournalAccess(user) {

    const userRef =
        doc(
            db,
            "users",
            user.uid
        );

    const snap =
        await getDoc(userRef);

    if (!snap.exists()) {

        throw new Error(
            "User account not found."
        );

    }

    const data = snap.data();

    const role =
        String(data.role || "member")
            .toLowerCase();

    const membership =
        String(data.membership || "free")
            .toLowerCase();

    const allowed =
        role === "admin" ||
        membership === "premium";

    if (allowed) {
        return true;
    }


    document.body.innerHTML = `

        <div style="
            min-height:100vh;
            display:flex;
            justify-content:center;
            align-items:center;
            background:#0b1120;
            color:#fff;
            font-family:Arial,sans-serif;
            text-align:center;
            padding:30px;
            box-sizing:border-box;
        ">

            <div style="
                max-width:520px;
                width:100%;
            ">

                <i
                    class="fa-solid fa-lock"
                    style="
                        font-size:65px;
                        color:#fbbf24;
                        margin-bottom:20px;
                    "
                ></i>

                <h1>
                    Premium Membership Required
                </h1>

                <p style="
                    color:#94a3b8;
                    line-height:1.7;
                    margin:20px 0 30px;
                ">
                    The GTRADES AXIS™ Trading Journal
                    is available only to Premium Members.
                </p>

                <a
                    href="/dashboard"
                    style="
                        display:inline-block;
                        padding:14px 28px;
                        background:#1d9bf0;
                        color:white;
                        border-radius:8px;
                        text-decoration:none;
                        font-weight:600;
                    "
                >
                    Return to Dashboard
                </a>

            </div>

        </div>

    `;

    throw new Error(
        "Journal access denied."
    );

}


/* ==========================================================
   LOAD ACCOUNTS
   ========================================================== */

async function loadAccounts() {

    if (!currentUser) return;

    try {

        const snap =
            await getDocs(
                query(
                    accountsRef(),
                    orderBy(
                        "createdAt",
                        "asc"
                    )
                )
            );

        accounts = [];

        snap.forEach(
            docSnap => {

                accounts.push({

                    id: docSnap.id,

                    ...docSnap.data()

                });

            }
        );

    } catch (error) {

        /*
           If older accounts have missing createdAt,
           load them without orderBy.
        */

        console.warn(
            "Ordered account query failed. Retrying:",
            error
        );

        const snap =
            await getDocs(
                accountsRef()
            );

        accounts = [];

        snap.forEach(
            docSnap => {

                accounts.push({

                    id: docSnap.id,

                    ...docSnap.data()

                });

            }
        );

    }


    const savedAccount =
        localStorage.getItem(
            `gtrades_selected_account_${currentUser.uid}`
        );


    if (savedAccount) {

        currentAccount =
            accounts.find(
                account =>
                    account.id === savedAccount
            ) || null;

    }


    if (
        !currentAccount &&
        accounts.length
    ) {

        currentAccount =
            accounts[0];

    }


    if (
        currentAccount &&
        !accounts.some(
            account =>
                account.id === currentAccount.id
        )
    ) {

        currentAccount = null;

    }


    renderAccountSelector();


    if (currentAccount) {

        await loadTrades();

    } else {

        trades = [];

        refreshUI();

    }

}


/* ==========================================================
   ACCOUNT SELECTOR
   ========================================================== */

function renderAccountSelector() {

    let selector =
        $("journalAccountSelector");


    if (!selector) {

        const header =
            document.querySelector(
                ".page-header"
            );

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

            <select
                id="journalAccountSelect"
                style="
                    min-width:260px;
                    padding:12px 15px;
                    border-radius:8px;
                    border:1px solid #334155;
                    background:#111827;
                    color:white;
                    outline:none;
                "
            >

                ${
                    accounts.length

                    ?

                    accounts.map(
                        account => `

                            <option
                                value="${escapeHTML(account.id)}"
                                ${
                                    currentAccount &&
                                    currentAccount.id === account.id
                                    ? "selected"
                                    : ""
                                }
                            >
                                ${escapeHTML(
                                    account.name ||
                                    "Trading Account"
                                )}
                            </option>

                        `
                    ).join("")

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
            async event => {

                const accountId =
                    event.target.value;

                const account =
                    accounts.find(
                        item =>
                            item.id === accountId
                    );

                if (!account) return;

                currentAccount =
                    account;

                localStorage.setItem(
                    `gtrades_selected_account_${currentUser.uid}`,
                    account.id
                );

                editingTrade = null;

                await loadTrades();

            }
        );

    }


    const addButton =
        $("addTradingAccountBtn");


    if (addButton) {

        addButton.addEventListener(
            "click",
            createTradingAccount
        );

    }

}


/* ==========================================================
   CREATE ACCOUNT
   ========================================================== */

async function createTradingAccount() {

    const name =
        prompt(
            "Account Name\n\nExample:\nEquity Edge $10K"
        );

    if (!name || !name.trim()) {
        return;
    }


    const broker =
        prompt(
            "Broker / Prop Firm\n\nExample:\nEquity Edge"
        ) || "";


    const accountType =
        prompt(
            "Account Type\n\nProp Firm\nPersonal\nBroker",
            "Prop Firm"
        ) || "Prop Firm";


    const startingBalance =
        parseFloat(
            prompt(
                "Starting Balance ($)",
                "10000"
            )
        );


    if (
        !Number.isFinite(startingBalance) ||
        startingBalance < 0
    ) {

        alert(
            "Please enter a valid starting balance."
        );

        return;

    }


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

        const accountData = {

            name: name.trim(),

            broker:
                broker.trim(),

            accountType:
                accountType.trim(),

            startingBalance,

            currentBalance:
                startingBalance,

            maxDrawdown:
                Math.max(0, maxDrawdown),

            dailyLossLimit:
                Math.max(0, dailyLossLimit),

            target:
                Math.max(0, target),

            createdAt:
                serverTimestamp()

        };


        const newAccount =
            await addDoc(
                accountsRef(),
                accountData
            );


        currentAccount = {

            id: newAccount.id,

            ...accountData,

            createdAt:
                new Date()

        };


        localStorage.setItem(
            `gtrades_selected_account_${currentUser.uid}`,
            newAccount.id
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
            "Unable to create trading account.\n\n" +
            error.message
        );

    }

}


/* ==========================================================
   DELETE ACCOUNT
   ========================================================== */

async function deleteCurrentAccount() {

    if (!currentAccount) {

        alert(
            "No trading account selected."
        );

        return;

    }


    const confirmation =
        confirm(
            `Delete "${currentAccount.name}"?\n\n` +
            "This will delete the account record. " +
            "Trades under this account will also be removed."
        );


    if (!confirmation) return;


    try {

        const tradeSnap =
            await getDocs(
                tradesRef(
                    currentAccount.id
                )
            );


        for (
            const trade of tradeSnap.docs
        ) {

            await deleteDoc(
                trade.ref
            );

        }


        await deleteDoc(
            accountRef(
                currentAccount.id
            )
        );


        localStorage.removeItem(
            `gtrades_selected_account_${currentUser.uid}`
        );


        currentAccount = null;

        trades = [];


        await loadAccounts();


        alert(
            "✅ Trading account deleted."
        );

    } catch (error) {

        console.error(
            "Account deletion error:",
            error
        );

        alert(
            "Unable to delete account."
        );

    }

}


/* ==========================================================
   LOAD TRADES
   ========================================================== */

async function loadTrades() {

    if (!currentAccount) {

        trades = [];

        refreshUI();

        return;

    }


    try {

        let snap;

        try {

            snap =
                await getDocs(
                    query(
                        tradesRef(
                            currentAccount.id
                        ),
                        orderBy(
                            "createdAt",
                            "desc"
                        )
                    )
                );

        } catch (error) {

            console.warn(
                "Ordered trade query failed. Retrying:",
                error
            );

            snap =
                await getDocs(
                    tradesRef(
                        currentAccount.id
                    )
                );

        }


        trades = [];


        snap.forEach(
            docSnap => {

                trades.push({

                    id: docSnap.id,

                    ...docSnap.data()

                });

            }
        );


        trades.sort(
            (a, b) =>
                getTradeTimestamp(b) -
                getTradeTimestamp(a)
        );


        refreshUI();

    } catch (error) {

        console.error(
            "Trade loading error:",
            error
        );

        trades = [];

        refreshUI();

    }

}


/* ==========================================================
   TIMESTAMP HELPER
   ========================================================== */

function getTradeTimestamp(trade) {

    if (!trade) return 0;


    if (
        trade.createdAt &&
        typeof trade.createdAt.toMillis === "function"
    ) {

        return trade.createdAt.toMillis();

    }


    if (
        trade.createdAt instanceof Date
    ) {

        return trade.createdAt.getTime();

    }


    if (trade.closed) {

        const closed =
            new Date(
                trade.closed
            ).getTime();

        if (!Number.isNaN(closed)) {
            return closed;
        }

    }


    if (trade.date) {

        const parsed =
            new Date(
                `${trade.date}T${trade.time || "00:00"}`
            ).getTime();

        if (!Number.isNaN(parsed)) {
            return parsed;
        }

    }


    return 0;

}


/* ==========================================================
   BUILD TRADE
   ========================================================== */

function buildTradeFromForm() {

    return {

        date:
            val("tradeDate"),

        time:
            val("tradeTime"),

        pair:
            val("pair"),

        direction:
            val("direction"),

        session:
            val("session"),

        broker:
            val("broker"),

        account:
            currentAccount
                ? currentAccount.name
                : val("account"),

        accountId:
            currentAccount
                ? currentAccount.id
                : "",

        lotSize:
            num("lotSize"),


        // ======================================================
        // MARKET STRUCTURE
        // ======================================================

        htfSwing:
            val("htfSwing"),

        htfInternal:
            val("htfInternal"),

        mtfSwing:
            val("mtfSwing"),

        mtfInternal:
            val("mtfInternal"),

        ltfStructure:
            val("ltfStructure"),

        liquidity:
            val("liquidity"),

        poi:
            val("poi"),

        entryModel:
            val("entryModel"),

        entryConfirmation:
            val("entryConfirmation"),

        tradeValid:
            val("tradeValid"),


        // ======================================================
        // CONFLUENCES
        // ======================================================

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


        // ======================================================
        // TRADE EXECUTION
        // ======================================================

        entry:
            num("entry"),

        stopLoss:
            num("stopLoss"),

        takeProfit:
            num("takeProfit"),

        risk:
            num("risk"),

        rr:
            num("rr"),

        profit:
            num("profit"),

        commission:
            num("commission"),

        result:
            normalizeResult(
                val("result")
            ),


        // ======================================================
        // PSYCHOLOGY
        // ======================================================

        confidence:
            val("confidence"),

        emotion:
            val("emotion"),

        discipline:
            val("discipline"),

        patience:
            val("patience"),


        // ======================================================
        // REVIEW
        // ======================================================

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


        // ======================================================
        // CHARTS
        // ======================================================

        beforeChart:
            val("beforeChart"),

        duringChart:
            val("duringChart"),

        afterChart:
            val("afterChart"),

        notes:
            val("notes"),


        // ======================================================
        // STATUS
        // ======================================================

        status:
            editingTrade
                ? (
                    editingTrade.status ||
                    "Pending"
                )
                : "Pending",

        closed:
            editingTrade
                ? (
                    editingTrade.closed ||
                    null
                )
                : null,

        createdAt:
            editingTrade
                ? (
                    editingTrade.createdAt ||
                    serverTimestamp()
                )
                : serverTimestamp()

    };

}


/* ==========================================================
   SAVE TRADE
   ========================================================== */

async function saveTrade(event) {

    event.preventDefault();


    if (!currentAccount) {

        alert(
            "Please create or select a trading account first."
        );

        return;

    }


    const trade =
        buildTradeFromForm();


    /*
       Basic validation
    */

    if (!trade.pair) {

        alert(
            "Please select or enter a trading pair."
        );

        return;

    }


    if (!trade.direction) {

        alert(
            "Please select the trade direction."
        );

        return;

    }


    try {

        if (editingTrade) {

            await updateDoc(

                tradeRef(
                    currentAccount.id,
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

            tradesRef(
                currentAccount.id
            ),

            trade

        );


        event.target.reset();


        alert(
            "✅ Trade saved successfully."
        );


        await loadTrades();


    } catch (error) {

        console.error(
            "Save trade error:",
            error
        );

        alert(
            "Unable to save trade.\n\n" +
            error.message
        );

    }

}


/* ==========================================================
   DASHBOARD
   ========================================================== */

function loadDashboard() {

    const closed =
        trades.filter(
            trade =>
                String(
                    trade.status || ""
                ).toLowerCase() === "closed"
        );


    const pending =
        trades.filter(
            trade =>
                String(
                    trade.status || ""
                ).toLowerCase() !== "closed"
        );


    const wins =
        closed.filter(
            trade =>
                normalizeResult(
                    trade.result
                ) === "Win"
        );


    const losses =
        closed.filter(
            trade =>
                normalizeResult(
                    trade.result
                ) === "Loss"
        );


    const totalTrades =
        closed.length;


    const totalWins =
        wins.length;


    const totalLosses =
        losses.length;


    const winRate =
        totalTrades
            ? (
                totalWins /
                totalTrades
            ) * 100
            : 0;


    const netProfit =
        closed.reduce(
            (sum, trade) =>
                sum + tradeNet(trade),
            0
        );


    const avgRR =
        totalTrades
            ? (
                closed.reduce(
                    (sum, trade) =>
                        sum +
                        (
                            Number(
                                trade.rr
                            ) || 0
                        ),
                    0
                ) /
                totalTrades
            )
            : 0;


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
        `${winRate.toFixed(1)}%`
    );


    setText(
        "averageRR",
        avgRR.toFixed(2)
    );


    setText(
        "netProfit",
        money(netProfit)
    );


    setText(
        "pendingTrades",
        pending.length
    );


    /*
       ACCOUNT BALANCE

       Starting balance + all closed net P/L.
    */

    if (currentAccount) {

        const startingBalance =
            Number(
                currentAccount.startingBalance
            ) || 0;


        const balance =
            startingBalance +
            netProfit;


        setText(
            "accountBalance",
            money(balance)
        );


        /*
           Only update if necessary.
        */

        if (
            Number(
                currentAccount.currentBalance
            ) !== balance
        ) {

            currentAccount.currentBalance =
                balance;


            updateDoc(

                accountRef(
                    currentAccount.id
                ),

                {
                    currentBalance:
                        balance
                }

            ).catch(
                console.error
            );

        }

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

function calculateConsistency(
    closed
) {

    if (!closed.length) {

        setText(
            "consistency",
            "0%"
        );

        setText(
            "bestDayProfit",
            "$0.00"
        );

        setText(
            "totalNetProfit",
            "$0.00"
        );

        return;

    }


    const dailyProfit = {};


    closed.forEach(
        trade => {

            const date =
                getTradeDate(
                    trade
                );


            const pnl =
                tradeNet(trade);


            if (!dailyProfit[date]) {
                dailyProfit[date] = 0;
            }


            dailyProfit[date] += pnl;

        }
    );


    const values =
        Object.values(
            dailyProfit
        );


    const totalNetProfit =
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        );


    /*
       Best profitable day only.

       This avoids a negative day becoming
       the "best day".
    */

    const profitableDays =
        values.filter(
            value => value > 0
        );


    const bestDay =
        profitableDays.length
            ? Math.max(
                ...profitableDays
            )
            : 0;


    const consistency =
        totalNetProfit > 0
            ? (
                bestDay /
                totalNetProfit
            ) * 100
            : 0;


    setText(
        "consistency",
        `${consistency.toFixed(2)}%`
    );


    setText(
        "bestDayProfit",
        money(bestDay)
    );


    setText(
        "totalNetProfit",
        money(totalNetProfit)
    );

}


/* ==========================================================
   TRADE DATE
   ========================================================== */

function getTradeDate(trade) {

    if (trade.date) {

        return trade.date;

    }


    if (trade.closed) {

        const date =
            new Date(
                trade.closed
            );

        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date
                .toISOString()
                .slice(0, 10);

        }

    }


    return "unknown";

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


    /*
       Sort oldest → newest so streak is correct.
    */

    const chronological =
        closed
            .slice()
            .sort(
                (a, b) =>
                    getTradeTimestamp(a) -
                    getTradeTimestamp(b)
            );


    let currentStreak = 0;

    let bestStreak = 0;


    chronological.forEach(
        trade => {

            const pair =
                trade.pair || "?";


            const session =
                trade.session || "?";


            const profit =
                tradeNet(trade);


            pairStats[pair] =
                (
                    pairStats[pair] || 0
                ) + profit;


            sessionStats[session] =
                (
                    sessionStats[session] || 0
                ) + profit;


            if (
                normalizeResult(
                    trade.result
                ) === "Win"
            ) {

                currentStreak++;

                bestStreak =
                    Math.max(
                        bestStreak,
                        currentStreak
                    );

            } else {

                currentStreak = 0;

            }

        }
    );


    const pairs =
        Object.keys(
            pairStats
        );


    const sessions =
        Object.keys(
            sessionStats
        );


    const bestPair =
        pairs.length
            ? pairs.reduce(
                (best, pair) =>
                    pairStats[pair] >
                    pairStats[best]
                        ? pair
                        : best,
                pairs[0]
            )
            : "-";


    const worstPair =
        pairs.length
            ? pairs.reduce(
                (worst, pair) =>
                    pairStats[pair] <
                    pairStats[worst]
                        ? pair
                        : worst,
                pairs[0]
            )
            : "-";


    const bestSession =
        sessions.length
            ? sessions.reduce(
                (best, session) =>
                    sessionStats[session] >
                    sessionStats[best]
                        ? session
                        : best,
                sessions[0]
            )
            : "-";


    setText(
        "bestPair",
        bestPair
    );


    setText(
        "worstPair",
        worstPair
    );


    setText(
        "bestSession",
        bestSession
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

        container.innerHTML = `
            <div class="loading-card">
                No trades yet.
            </div>
        `;

        return;

    }


    container.innerHTML = "";


    trades
        .slice(0, 8)
        .forEach(
            trade => {

                const closed =
                    String(
                        trade.status || ""
                    ).toLowerCase() ===
                    "closed";


                const result =
                    normalizeResult(
                        trade.result
                    );


                const net =
                    tradeNet(trade);


                container.innerHTML += `

                    <div class="trade-row">

                        <div>

                            <strong>
                                ${escapeHTML(
                                    trade.pair || "?"
                                )}
                            </strong>

                            <br>

                            <small>
                                ${escapeHTML(
                                    trade.direction || ""
                                )}
                            </small>

                        </div>


                        <div>

                            ${escapeHTML(
                                trade.entryModel || "-"
                            )}

                        </div>


                        <div>

                            <span class="
                                status
                                ${escapeHTML(
                                    (
                                        trade.status ||
                                        "Pending"
                                    ).toLowerCase()
                                )}
                            ">

                                ${escapeHTML(
                                    trade.status ||
                                    "Pending"
                                )}

                            </span>

                        </div>


                        <div>

                            ${
                                closed

                                ?

                                `
                                    <strong>
                                        ${money(net)}
                                    </strong>
                                `

                                :

                                `
                                    <button
                                        class="btn"
                                        type="button"
                                        data-close-id="${escapeHTML(
                                            trade.id
                                        )}"
                                    >
                                        Close
                                    </button>
                                `
                            }

                        </div>

                    </div>

                `;

            }
        );


    container
        .querySelectorAll(
            "[data-close-id]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        closeTrade(
                            button.dataset.closeId
                        )
                );

            }
        );

}


/* ==========================================================
   CLOSE TRADE
   ========================================================== */

async function closeTrade(id) {

    if (!currentAccount) return;


    const trade =
        trades.find(
            item =>
                item.id === id
        );


    if (!trade) return;


    if (
        String(
            trade.status || ""
        ).toLowerCase() === "closed"
    ) {

        viewTrade(trade);

        return;

    }


    const outcome =
        prompt(
            "Result?\n\nWin\nLoss\nBreakeven",
            "Win"
        );


    if (!outcome) return;


    const result =
        normalizeResult(
            outcome
        );


    if (
        result === "Pending"
    ) {

        alert(
            "Please enter Win, Loss or Breakeven."
        );

        return;

    }


    const defaultProfit =
        result === "Win"
            ? "0"
            : result === "Loss"
                ? "0"
                : "0";


    const profit =
        parseFloat(
            prompt(
                "Profit / Loss ($)",
                defaultProfit
            )
        );


    if (
        !Number.isFinite(profit)
    ) {

        alert(
            "Invalid profit/loss amount."
        );

        return;

    }


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
                trade.rr || "0"
            )
        ) || 0;


    const management =
        prompt(
            "Management Quality\n\nExcellent\nGood\nAverage\nPoor",
            "Good"
        ) || "";


    const psychologyNote =
        prompt(
            "Psychology Notes",
            ""
        ) || "";


    const lesson =
        prompt(
            "Lesson Learned",
            ""
        ) || "";


    const improvement =
        prompt(
            "Improvement",
            ""
        ) || "";


    try {

        await updateDoc(

            tradeRef(
                currentAccount.id,
                id
            ),

            {

                status:
                    "Closed",

                closed:
                    new Date().toISOString(),

                result,

                profit,

                commission,

                rr,

                management,

                psychologyNote,

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
            "Close trade error:",
            error
        );

        alert(
            "Unable to close trade.\n\n" +
            error.message
        );

    }

}


/* ==========================================================
   VIEW TRADE
   ========================================================== */

function viewTrade(trade) {

    const review =
        trade.reviewNote || {};


    alert(`

PAIR        : ${trade.pair || "-"}

DIRECTION   : ${trade.direction || "-"}

STATUS      : ${trade.status || "-"}

RESULT      : ${trade.result || "-"}

PROFIT      : ${money(trade.profit)}

COMMISSION  : ${money(trade.commission)}

NET         : ${money(tradeNet(trade))}

RR          : ${Number(trade.rr || 0).toFixed(2)}

MANAGEMENT  : ${trade.management || "-"}

LESSON      : ${review.lesson || "-"}

IMPROVEMENT : ${review.improvement || "-"}

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
    ) {

        console.warn(
            "Chart.js is not loaded."
        );

        return;

    }


    destroyAllCharts();

    buildEquityChart();

    buildMonthlyChart();

}


/* ==========================================================
   DESTROY CHARTS
   ========================================================== */

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
        trades
            .filter(
                trade =>
                    String(
                        trade.status || ""
                    ).toLowerCase() ===
                    "closed"
            )
            .slice()
            .sort(
                (a, b) =>
                    getTradeTimestamp(a) -
                    getTradeTimestamp(b)
            );


    let balance =
        currentAccount
            ? Number(
                currentAccount.startingBalance
            ) || 0
            : 0;


    const data = [];

    const labels = [];


    closed.forEach(
        (trade, index) => {

            balance +=
                tradeNet(trade);


            data.push(
                Number(
                    balance.toFixed(2)
                )
            );


            labels.push(
                trade.date ||
                `Trade ${index + 1}`
            );

        }
    );


    /*
       If there are no closed trades,
       show starting balance.
    */

    if (!data.length) {

        data.push(
            Number(
                balance.toFixed(2)
            )
        );

        labels.push(
            "Start"
        );

    }


    const ctx =
        canvas.getContext("2d");


    equityChartInstance =
        new Chart(
            ctx,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [{

                        label:
                            "Equity",

                        data,

                        borderColor:
                            "#4f7cff",

                        backgroundColor:
                            "rgba(79,124,255,0.15)",

                        fill: true,

                        tension: 0.3,

                        pointRadius: 3

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    interaction: {

                        intersect: false,

                        mode: "index"

                    },

                    plugins: {

                        legend: {

                            display: true

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: false

                        }

                    }

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


    const closed =
        trades
            .filter(
                trade =>
                    String(
                        trade.status || ""
                    ).toLowerCase() ===
                    "closed"
            )
            .slice()
            .sort(
                (a, b) =>
                    getTradeTimestamp(a) -
                    getTradeTimestamp(b)
            );


    closed.forEach(
        trade => {

            const date =
                trade.closed
                    ? new Date(
                        trade.closed
                    )
                    : new Date(
                        `${trade.date || ""}T${
                            trade.time || "00:00"
                        }`
                    );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return;
            }


            const key =
                `${date.getFullYear()}-${
                    String(
                        date.getMonth() + 1
                    ).padStart(2, "0")
                }`;


            if (!monthly[key]) {

                monthly[key] = {

                    label:
                        date.toLocaleString(
                            "default",
                            {
                                month: "short",
                                year: "numeric"
                            }
                        ),

                    value: 0

                };

            }


            monthly[key].value +=
                tradeNet(trade);

        }
    );


    const months =
        Object.keys(
            monthly
        ).sort();


    const labels =
        months.map(
            key =>
                monthly[key].label
        );


    const values =
        months.map(
            key =>
                Number(
                    monthly[key].value
                        .toFixed(2)
                )
        );


    if (!values.length) {

        labels.push("No data");

        values.push(0);

    }


    const ctx =
        canvas.getContext("2d");


    monthlyChartInstance =
        new Chart(
            ctx,
            {

                type: "bar",

                data: {

                    labels,

                    datasets: [{

                        label:
                            "Monthly P&L",

                        data: values,

                        backgroundColor:
                            "#4f7cff",

                        borderRadius: 6

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            display: true

                        }

                    }

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


    if (
        !editId ||
        !currentAccount
    ) {

        return;

    }


    try {

        const snap =
            await getDoc(
                tradeRef(
                    currentAccount.id,
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

            id:
                snap.id,

            ...snap.data()

        };


        populateForm(
            editingTrade
        );

    } catch (error) {

        console.error(
            "Load edit trade error:",
            error
        );

    }

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


    fields.forEach(
        id => {

            const element =
                $(id);


            if (
                element &&
                trade[id] !== undefined &&
                trade[id] !== null
            ) {

                element.value =
                    trade[id];

            }

        }
    );


    /*
       Confluences
    */

    if (
        trade.confluences
    ) {

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


        Object.entries(
            mapping
        ).forEach(
            ([key, id]) => {

                const checkbox =
                    $(id);


                if (checkbox) {

                    checkbox.checked =
                        Boolean(
                            trade
                                .confluences
                                [key]
                        );

                }

            }
        );

    }


    /*
       Update button
    */

    const submit =
        document.querySelector(
            "#tradeForm button[type='submit']"
        );


    if (submit) {

        submit.innerHTML =
            `
                <i class="fa-solid fa-pen"></i>
                Update Trade
            `;

    }


    /*
       Update page title
    */

    const header =
        document.querySelector(
            ".page-header h1"
        );


    if (header) {

        header.innerHTML =
            `
                <i class="fa-solid fa-pen"></i>
                Edit Trade
            `;

    }

}


/* ==========================================================
   FORM DEFAULTS
   ========================================================== */

function setFormDefaults() {

    const date =
        $("tradeDate");


    if (
        date &&
        !date.value
    ) {

        const now =
            new Date();


        const localDate =
            new Date(
                now.getTime() -
                now.getTimezoneOffset() *
                60000
            )
                .toISOString()
                .slice(0, 10);


        date.value =
            localDate;

    }


    const accountInput =
        $("account");


    if (
        accountInput &&
        currentAccount
    ) {

        /*
           Don't overwrite an edit.
        */

        if (!editingTrade) {

            accountInput.value =
                currentAccount.name;

        }

    }


    const brokerInput =
        $("broker");


    if (
        brokerInput &&
        currentAccount &&
        !editingTrade
    ) {

        brokerInput.value =
            currentAccount.broker || "";

    }

}


/* ==========================================================
   OPTIONAL ACCOUNT DELETE BUTTON
   ========================================================== */

function setupAccountDeleteButton() {

    const button =
        $("deleteTradingAccountBtn");


    if (!button) return;


    button.addEventListener(
        "click",
        deleteCurrentAccount
    );

}


/* ==========================================================
   KEYBOARD / FORM SAFETY
   ========================================================== */

function setupFormSafety() {

    const form =
        $("tradeForm");


    if (!form) return;


    form.addEventListener(
        "submit",
        saveTrade
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

            currentUser =
                user;


            /*
               Premium/Admin check
            */

            await checkJournalAccess(
                user
            );


            /*
               Load accounts
            */

            await loadAccounts();


            /*
               Load edit mode
            */

            await loadEditTrade();


            /*
               Defaults after edit
            */

            setFormDefaults();


            /*
               Form
            */

            setupFormSafety();


            /*
               Optional delete account button
            */

            setupAccountDeleteButton();


            /*
               Final refresh
            */

            refreshUI();


            console.log(
                "✅ GTRADES AXIS™ Journal Ready"
            );

        } catch (error) {

            console.error(
                "Journal initialization error:",
                error
            );

        }

    }
);