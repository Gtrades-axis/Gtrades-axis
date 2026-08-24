/* ==========================================================
   GTRADES AXIS™
   PREMIUM TRADING JOURNAL
   COMPLETE JOURNAL ENGINE
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
   STORAGE
   ========================================================== */

const STORAGE_KEY = "trades";
const ACCOUNTS_KEY = "tradingAccounts";

let trades = [];
let accounts = {};

let editingTrade = null;
let selectedAccountId = "all";

let equityChartInstance = null;
let monthlyChartInstance = null;

let currentUser = null;


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

    return !!(el && el.checked);

}


function setValue(id, value) {

    const el = $(id);

    if (!el) return;

    if (
        value === undefined ||
        value === null
    ) {
        return;
    }

    el.value = value;

}


function setText(id, text) {

    const el = $(id);

    if (el) {
        el.textContent = text;
    }

}


function money(value) {

    const n = parseFloat(value) || 0;

    return "$" + n.toFixed(2);

}


function signedMoney(value) {

    const n = parseFloat(value) || 0;

    if (n > 0) {
        return "+$" + n.toFixed(2);
    }

    if (n < 0) {
        return "-$" + Math.abs(n).toFixed(2);
    }

    return "$0.00";

}


function safeNumber(value) {

    const n = parseFloat(value);

    return Number.isFinite(n) ? n : 0;

}


/* ==========================================================
   AUTH / PREMIUM ACCESS
   ========================================================== */

async function checkJournalAccess() {

    return new Promise((resolve, reject) => {

        onAuthStateChanged(
            auth,
            async user => {

                if (!user) {

                    window.location.href = "/login";

                    reject(
                        new Error("Not authenticated")
                    );

                    return;

                }


                currentUser = user;


                try {

                    const snap =
                        await getDoc(
                            doc(
                                db,
                                "users",
                                user.uid
                            )
                        );


                    if (!snap.exists()) {

                        alert(
                            "User account not found."
                        );

                        window.location.href =
                            "/dashboard";

                        reject(
                            new Error(
                                "User account not found"
                            )
                        );

                        return;

                    }


                    const data =
                        snap.data();


                    const role =
                        data.role ||
                        "member";


                    const membership =
                        data.membership ||
                        "free";


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

                                    <i
                                        class="fa-solid fa-lock"
                                        style="
                                            font-size:70px;
                                            color:#fbbf24;
                                            margin-bottom:20px;
                                        "
                                    ></i>

                                    <h1>
                                        Premium Membership Required
                                    </h1>

                                    <p style="
                                        color:#94a3b8;
                                        margin:20px 0;
                                    ">
                                        The Trading Journal is available
                                        only to Premium Members.
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
                                        "
                                    >
                                        Return to Dashboard
                                    </a>

                                </div>

                            </div>

                        `;


                        reject(
                            new Error(
                                "Premium membership required"
                            )
                        );

                        return;

                    }


                    resolve(true);

                }

                catch (error) {

                    console.error(
                        "Journal access error:",
                        error
                    );

                    reject(error);

                }

            }
        );

    });

}


/* ==========================================================
   LOAD / SAVE TRADES
   ========================================================== */

function loadTrades() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!saved) {

            trades = [];

            return;

        }


        const parsed =
            JSON.parse(saved);


        trades =
            Array.isArray(parsed)
                ? parsed
                : [];

    }

    catch (error) {

        console.error(
            "Unable to load trades:",
            error
        );

        trades = [];

    }

}


function saveTrades() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(trades)
    );

}


/* ==========================================================
   ACCOUNT SYSTEM
   ========================================================== */

function loadAccounts() {

    try {

        const saved =
            localStorage.getItem(
                ACCOUNTS_KEY
            );


        if (!saved) {

            accounts = {};

            return;

        }


        const parsed =
            JSON.parse(saved);


        if (Array.isArray(parsed)) {

            accounts = {};

            parsed.forEach(account => {

                if (!account) return;

                const id =
                    account.id ||
                    createAccountId(
                        account.name
                    );

                accounts[id] = {
                    ...account,
                    id
                };

            });

        }

        else if (
            parsed &&
            typeof parsed === "object"
        ) {

            accounts = parsed;

        }

        else {

            accounts = {};

        }

    }

    catch (error) {

        console.error(
            "Unable to load accounts:",
            error
        );

        accounts = {};

    }

}


function saveAccounts() {

    localStorage.setItem(
        ACCOUNTS_KEY,
        JSON.stringify(accounts)
    );

}


function createAccountId(name) {

    return String(
        name ||
        "account"
    )
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        +
        "-" +
        Date.now();

}


function getAccount(id) {

    if (!id) return null;

    return accounts[id] || null;

}


function getSelectedAccount() {

    if (
        !selectedAccountId ||
        selectedAccountId === "all"
    ) {

        return null;

    }


    return getAccount(
        selectedAccountId
    );

}


/* ==========================================================
   ACCOUNT NORMALIZATION
   ========================================================== */

function normalizeAccount(account) {

    if (!account) return null;


    const startingBalance =
        safeNumber(
            account.startingBalance ??
            account.initialBalance ??
            account.balance
        );


    const currentBalance =
        safeNumber(
            account.currentBalance ??
            account.balance ??
            startingBalance
        );


    return {

        ...account,

        startingBalance,

        currentBalance,

        balance:
            currentBalance,

        riskSetting:
            account.riskSetting ??
            account.risk ??
            1,

        riskMode:
            account.riskMode ??
            account.riskType ??
            "Multiple",

        currency:
            account.currency ||
            "USD"

    };

}


/* ==========================================================
   ACCOUNT SELECTORS
   ========================================================== */

function populateAccountSelectors() {

    const selectors = [
        $("tradeAccount"),
        $("accountFilter")
    ];


    selectors.forEach(
        select => {

            if (!select) return;


            const current =
                select.value;


            if (
                select.id ===
                "accountFilter"
            ) {

                select.innerHTML = `

                    <option value="all">
                        All Accounts
                    </option>

                `;

            }

            else {

                select.innerHTML = `

                    <option value="">
                        Select an account
                    </option>

                `;

            }


            Object.values(accounts)
                .forEach(rawAccount => {

                    const account =
                        normalizeAccount(
                            rawAccount
                        );


                    if (!account) return;


                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        account.id;


                    option.textContent =
                        account.name ||
                        "Trading Account";


                    select.appendChild(
                        option
                    );

                });


            if (
                current &&
                [...select.options]
                    .some(
                        option =>
                            option.value ===
                            current
                    )
            ) {

                select.value =
                    current;

            }

        }
    );


    const tradeAccount =
        $("tradeAccount");


    if (
        tradeAccount &&
        !tradeAccount.value
    ) {

        if (
            selectedAccountId !== "all" &&
            accounts[selectedAccountId]
        ) {

            tradeAccount.value =
                selectedAccountId;

        }

        else {

            const first =
                Object.values(
                    accounts
                )[0];


            if (first) {

                tradeAccount.value =
                    first.id;

            }

        }

    }


    const accountFilter =
        $("accountFilter");


    if (
        accountFilter &&
        selectedAccountId
    ) {

        accountFilter.value =
            selectedAccountId;

    }

}


/* ==========================================================
   ACCOUNT INFORMATION PANEL
   ========================================================== */

function updateTradeAccountInfo() {

    const select =
        $("tradeAccount");


    if (!select) return;


    const account =
        getAccount(
            select.value
        );


    if (!account) {

        setText(
            "tradeAccountBalance",
            "$0.00"
        );

        setText(
            "tradeAccountRisk",
            "$0.00"
        );

        setText(
            "tradeAccountCurrency",
            "USD"
        );

        return;

    }


    const normalized =
        normalizeAccount(
            account
        );


    const balance =
        getLiveAccountBalance(
            normalized.id
        );


    const risk =
        calculateAccountRisk(
            normalized,
            balance
        );


    setText(
        "tradeAccountBalance",
        money(balance)
    );


    setText(
        "tradeAccountRisk",
        money(risk)
    );


    setText(
        "tradeAccountCurrency",
        normalized.currency ||
        "USD"
    );


    const balanceInput =
        $("balance");


    if (
        balanceInput &&
        !editingTrade
    ) {

        balanceInput.value =
            balance.toFixed(2);

    }


    calculateAll();

}


/* ==========================================================
   ACCOUNT BALANCE
   ========================================================== */

function getLiveAccountBalance(accountId) {

    const account =
        getAccount(
            accountId
        );


    if (!account) return 0;


    const normalized =
        normalizeAccount(
            account
        );


    const closedTrades =
        trades.filter(
            trade =>
                trade.status ===
                    "Closed" &&
                (
                    trade.accountId ===
                        accountId ||
                    (
                        !trade.accountId &&
                        trade.account ===
                            normalized.name
                    )
                )
        );


    const pnl =
        closedTrades.reduce(
            (
                total,
                trade
            ) => {

                return total +
                    (
                        safeNumber(
                            trade.profit
                        ) -
                        safeNumber(
                            trade.commission
                        )
                    );

            },
            0
        );


    return (
        normalized.startingBalance +
        pnl
    );

}


/* ==========================================================
   ACCOUNT RISK
   ========================================================== */

function calculateAccountRisk(
    account,
    balance
) {

    if (!account) return 0;


    const riskSetting =
        safeNumber(
            account.riskSetting
        );


    const mode =
        String(
            account.riskMode ||
            "Multiple"
        )
            .toLowerCase();


    if (
        mode.includes("percent") ||
        mode.includes("%")
    ) {

        return (
            balance *
            riskSetting /
            100
        );

    }


    if (
        mode.includes("fixed") ||
        mode.includes("amount")
    ) {

        return riskSetting;

    }


    /*
     * Multiple means:
     *
     * account risk setting =
     * number of risk units.
     *
     * If a dedicated risk amount
     * exists, use it.
     */

    const baseRisk =
        safeNumber(
            account.baseRisk ||
            account.riskAmount
        );


    if (baseRisk > 0) {

        return (
            baseRisk *
            riskSetting
        );

    }


    /*
     * Default to percentage if
     * no better information exists.
     */

    if (
        riskSetting > 0 &&
        riskSetting <= 10
    ) {

        return (
            balance *
            riskSetting /
            100
        );

    }


    return riskSetting;

}


/* ==========================================================
   PAIR / SYMBOL CALCULATIONS
   ========================================================== */

function getPairInfo(pair) {

    const symbol =
        String(
            pair ||
            ""
        )
            .toUpperCase()
            .replace(
                /[^A-Z0-9]/g,
                ""
            );


    /*
     * Forex
     */

    const forexPairs = [
        "EURUSD",
        "GBPUSD",
        "USDJPY",
        "GBPJPY",
        "EURJPY",
        "AUDUSD",
        "NZDUSD",
        "USDCAD",
        "USDCHF",
        "AUDJPY",
        "CADJPY",
        "CHFJPY",
        "EURGBP",
        "EURAUD",
        "GBPAUD",
        "GBPCAD",
        "GBPCHF",
        "AUDCAD",
        "AUDCHF",
        "AUDNZD",
        "CADCHF",
        "EURNZD",
        "EURCAD",
        "EURCHF",
        "GBPNZD",
        "NZDJPY"
    ];


    if (
        forexPairs.includes(symbol)
    ) {

        const isJPY =
            symbol.includes("JPY");


        return {

            type: "forex",

            pipSize:
                isJPY
                    ? 0.01
                    : 0.0001,

            contractSize:
                100000,

            digits:
                isJPY
                    ? 3
                    : 5

        };

    }


    /*
     * Gold
     */

    if (
        symbol === "XAUUSD" ||
        symbol === "GOLD"
    ) {

        return {

            type: "gold",

            pipSize: 0.01,

            contractSize: 100

        };

    }


    /*
     * Silver
     */

    if (
        symbol === "XAGUSD" ||
        symbol === "SILVER"
    ) {

        return {

            type: "silver",

            pipSize: 0.01,

            contractSize: 5000

        };

    }


    /*
     * Crypto
     */

    if (
        symbol.includes("BTC") ||
        symbol.includes("ETH")
    ) {

        return {

            type: "crypto",

            pipSize: 1,

            contractSize: 1

        };

    }


    /*
     * Indices
     */

    if (
        symbol.includes("US30") ||
        symbol.includes("NAS100") ||
        symbol.includes("USTEC") ||
        symbol.includes("SPX500") ||
        symbol.includes("US500") ||
        symbol.includes("GER40") ||
        symbol.includes("DE40") ||
        symbol.includes("UK100")
    ) {

        return {

            type: "index",

            pipSize: 1,

            contractSize: 1

        };

    }


    /*
     * Generic fallback.
     *
     * We do NOT force this to Gold,
     * EURUSD or GBPUSD.
     */

    return {

        type: "generic",

        pipSize: 0.0001,

        contractSize: 100000

    };

}


/* ==========================================================
   PRICE DISTANCE
   ========================================================== */

function getPriceDistance(
    entry,
    exit
) {

    return Math.abs(
        safeNumber(exit) -
        safeNumber(entry)
    );

}


/* ==========================================================
   CALCULATE RISK FROM PRICE
   ========================================================== */

function calculateRiskAmount(
    pair,
    entry,
    stopLoss,
    lotSize
) {

    entry =
        safeNumber(entry);


    stopLoss =
        safeNumber(stopLoss);


    lotSize =
        safeNumber(lotSize);


    if (
        entry <= 0 ||
        stopLoss <= 0 ||
        lotSize <= 0
    ) {

        return 0;

    }


    const info =
        getPairInfo(pair);


    const distance =
        Math.abs(
            entry -
            stopLoss
        );


    /*
     * Generic monetary calculation.
     *
     * For Forex this is approximately:
     *
     * price distance × contract size × lots
     *
     * The broker/account currency conversion
     * may differ for cross-currency pairs.
     *
     * We preserve the user's actual entered
     * riskAmount when one already exists.
     */

    return (
        distance *
        info.contractSize *
        lotSize
    );

}


/* ==========================================================
   RISK / REWARD
   ========================================================== */

function calculateInitialRR(
    pair,
    direction,
    entry,
    stopLoss,
    takeProfit
) {

    entry =
        safeNumber(entry);


    stopLoss =
        safeNumber(stopLoss);


    takeProfit =
        safeNumber(takeProfit);


    if (
        entry <= 0 ||
        stopLoss <= 0 ||
        takeProfit <= 0
    ) {

        return 0;

    }


    let riskDistance;
    let rewardDistance;


    if (
        String(direction)
            .toUpperCase() ===
        "SELL"
    ) {

        riskDistance =
            stopLoss -
            entry;

        rewardDistance =
            entry -
            takeProfit;

    }

    else {

        riskDistance =
            entry -
            stopLoss;

        rewardDistance =
            takeProfit -
            entry;

    }


    if (
        riskDistance <= 0 ||
        rewardDistance <= 0
    ) {

        return 0;

    }


    return (
        Math.round(
            (
                rewardDistance /
                riskDistance
            ) * 100
        ) / 100
    );

}


/* ==========================================================
   ACTUAL RR
   ========================================================== */

function calculateActualRR(
    trade
) {

    const riskAmount =
        safeNumber(
            trade.initialRiskAmount ??
            trade.riskAmount
        );


    if (
        riskAmount <= 0
    ) {

        return 0;

    }


    const result =
        String(
            trade.result ||
            ""
        )
            .toLowerCase();


    /*
     * A trade that has not won does
     * not display a positive RR.
     */

    if (
        result === "breakeven"
    ) {

        return 0;

    }


    const profit =
        safeNumber(
            trade.profit
        );


    if (
        result === "loss"
    ) {

        return -Math.round(
            (
                Math.abs(profit) /
                riskAmount
            ) * 100
        ) / 100;

    }


    if (
        result === "win"
    ) {

        return Math.round(
            (
                Math.abs(profit) /
                riskAmount
            ) * 100
        ) / 100;

    }


    return 0;

}


/* ==========================================================
   CALCULATE FORM
   ========================================================== */

function calculateAll() {

    const pair =
        val("pair");


    const direction =
        val("direction");


    const entry =
        num("entry");


    const stopLoss =
        num("stopLoss");


    const takeProfit =
        num("takeProfit");


    const lotSize =
        num("lotSize");


    let riskAmount =
        calculateRiskAmount(
            pair,
            entry,
            stopLoss,
            lotSize
        );


    /*
     * If an existing trade has a preserved
     * initial risk, do not destroy it
     * while editing.
     */

    if (
        editingTrade &&
        editingTrade.initialRiskAmount >
            0 &&
        safeNumber(
            editingTrade.entry
        ) === entry &&
        safeNumber(
            editingTrade.stopLoss
        ) === stopLoss &&
        safeNumber(
            editingTrade.lotSize
        ) === lotSize
    ) {

        riskAmount =
            safeNumber(
                editingTrade.initialRiskAmount
            );

    }


    const balance =
        safeNumber(
            val("balance")
        );


    const riskPercent =
        balance > 0
            ? (
                riskAmount /
                balance
            ) * 100
            : 0;


    const rewardDistance =
        direction === "SELL"
            ? entry - takeProfit
            : takeProfit - entry;


    const riskDistance =
        direction === "SELL"
            ? stopLoss - entry
            : entry - stopLoss;


    const validRisk =
        riskDistance > 0;


    const validReward =
        rewardDistance > 0;


    const initialRR =
        validRisk &&
        validReward
            ? Math.round(
                (
                    rewardDistance /
                    riskDistance
                ) * 100
            ) / 100
            : 0;


    const info =
        getPairInfo(
            pair
        );


    const pipDistance =
        info.pipSize > 0
            ? Math.abs(
                entry -
                stopLoss
            ) /
            info.pipSize
            : 0;


    const potentialLoss =
        riskAmount;


    const potentialProfit =
        initialRR > 0
            ? riskAmount *
              initialRR
            : 0;


    setValue(
        "riskAmount",
        riskAmount
            ? riskAmount.toFixed(2)
            : ""
    );


    setValue(
        "potentialLoss",
        potentialLoss
            ? potentialLoss.toFixed(2)
            : ""
    );


    setValue(
        "potentialProfit",
        potentialProfit
            ? potentialProfit.toFixed(2)
            : ""
    );


    /*
     * Do not overwrite actual RR on an
     * existing closed trade.
     */

    if (!editingTrade) {

        setValue(
            "rr",
            initialRR
                ? initialRR.toFixed(2)
                : ""
        );

    }


    setValue(
        "risk",
        riskPercent
            ? riskPercent.toFixed(2)
            : ""
    );


    setText(
        "summaryAccountRisk",
        money(
            getCurrentFormAccountRisk()
        )
    );


    setText(
        "summaryActualRisk",
        money(
            riskAmount
        )
    );


    setText(
        "summaryRiskPercent",
        riskPercent.toFixed(2) +
        "%"
    );


    setText(
        "summaryReward",
        money(
            potentialProfit
        )
    );


    setText(
        "summaryLoss",
        money(
            potentialLoss
        )
    );


    setText(
        "summaryRR",
        initialRR.toFixed(2)
    );


    /*
     * Support alternative IDs used
     * by earlier journal versions.
     */

    setText(
        "actualRiskDisplay",
        money(riskAmount)
    );


    setText(
        "riskPercentDisplay",
        riskPercent.toFixed(2) + "%"
    );


    setText(
        "rewardDisplay",
        money(potentialProfit)
    );


    setText(
        "lossDisplay",
        money(potentialLoss)
    );


    setText(
        "rrDisplay",
        initialRR.toFixed(2)
    );


    setValue(
        "pipValue",
        pipDistance
            ? pipDistance.toFixed(1)
            : ""
    );

}


/* ==========================================================
   CURRENT FORM ACCOUNT RISK
   ========================================================== */

function getCurrentFormAccountRisk() {

    const accountId =
        val("tradeAccount");


    if (!accountId) {

        return 0;

    }


    const account =
        getAccount(
            accountId
        );


    if (!account) {

        return 0;

    }


    return calculateAccountRisk(
        account,
        getLiveAccountBalance(
            accountId
        )
    );

}


/* ==========================================================
   CONFLUENCES
   ========================================================== */

function collectConfluences() {

    return {

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

    };

}


/* ==========================================================
   ENTRY MODEL
   ========================================================== */

function getEntryModelValue() {

    const select =
        $("entryModel");


    if (!select) {

        return "";

    }


    if (
        select.value ===
        "__custom__"
    ) {

        const custom =
            $("entryModelCustom");


        return custom
            ? custom.value.trim()
            : "";

    }


    return select.value;

}


function syncEntryModelInput() {

    const select =
        $("entryModel");


    const custom =
        $("entryModelCustom");


    if (!select || !custom) {

        return;

    }


    if (
        select.value ===
        "__custom__"
    ) {

        custom.style.display =
            "";

        custom.disabled =
            false;

        custom.focus();

    }

    else {

        custom.style.display =
            "none";

        custom.disabled =
            true;

        custom.value =
            "";

    }

}


/* ==========================================================
   BUILD TRADE
   ========================================================== */

function buildTradeFromForm() {

    const existing =
        editingTrade;


    const accountId =
        val("tradeAccount") ||
        existing?.accountId ||
        "";


    const account =
        getAccount(
            accountId
        );


    const entry =
        num("entry");


    const stopLoss =
        num("stopLoss");


    const takeProfit =
        num("takeProfit");


    const lotSize =
        num("lotSize");


    /*
     * Preserve initial risk.
     */

    let initialRiskAmount =
        existing
            ? safeNumber(
                existing.initialRiskAmount ??
                existing.riskAmount
            )
            : 0;


    if (
        !initialRiskAmount
    ) {

        initialRiskAmount =
            calculateRiskAmount(
                val("pair"),
                entry,
                stopLoss,
                lotSize
            );

    }


    /*
     * Initial planned RR.
     */

    let initialRR =
        existing
            ? safeNumber(
                existing.initialRR ??
                calculateInitialRR(
                    val("pair"),
                    val("direction"),
                    entry,
                    stopLoss,
                    takeProfit
                )
            )
            : calculateInitialRR(
                val("pair"),
                val("direction"),
                entry,
                stopLoss,
                takeProfit
            );


    /*
     * Preserve closed result RR.
     */

    const result =
        val("result") ||
        existing?.result ||
        "Pending";


    let actualRR =
        existing
            ? safeNumber(
                existing.actualRR
            )
            : 0;


    if (
        result === "Win" ||
        result === "Loss" ||
        result === "Breakeven"
    ) {

        actualRR =
            calculateActualRR({

                ...existing,

                result,

                profit:
                    num("profit"),

                initialRiskAmount

            });

    }


    const trade = {

        /*
         * ID MUST NEVER CHANGE.
         */

        id:
            existing?.id ||
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 8),


        /*
         * Basic details.
         */

        date:
            val("tradeDate") ||
            existing?.date ||
            new Date()
                .toISOString()
                .split("T")[0],

        time:
            val("tradeTime") ||
            existing?.time ||
            "",

        pair:
            val("pair"),

        direction:
            val("direction"),

        session:
            val("session"),

        broker:
            val("broker"),


        /*
         * ACCOUNT
         */

        accountId,

        account:
            account?.name ||
            existing?.account ||
            "",


        /*
         * Position.
         */

        lotSize,


        /*
         * HTF
         */

        htfSwing:
            val("htfSwing"),

        htfInternal:
            val("htfInternal"),


        /*
         * MTF
         */

        mtfSwing:
            val("mtfSwing"),

        mtfInternal:
            val("mtfInternal"),


        /*
         * LTF
         */

        ltfStructure:
            val("ltfStructure"),

        liquidity:
            val("liquidity"),

        poi:
            val("poi"),

        entryModel:
            getEntryModelValue(),

        entryConfirmation:
            val("entryConfirmation"),

        tradeValid:
            val("tradeValid"),


        /*
         * Confluences.
         */

        confluences:
            collectConfluences(),


        /*
         * Execution.
         */

        entry,

        stopLoss,

        takeProfit,


        /*
         * Initial risk.
         *
         * NEVER replace this with
         * later modified SL risk.
         */

        initialRiskAmount,

        riskAmount:
            initialRiskAmount,


        risk:
            balanceRiskPercent(
                initialRiskAmount,
                num("balance")
            ),


        /*
         * Planned RR.
         */

        initialRR,


        /*
         * Actual realized RR.
         */

        actualRR,

        /*
         * Keep rr for compatibility
         * with old History / Analytics.
         */

        rr:
            actualRR,


        /*
         * Potential values.
         */

        potentialProfit:
            initialRiskAmount *
            initialRR,

        potentialLoss:
            initialRiskAmount,


        /*
         * Results.
         */

        profit:
            num("profit"),

        commission:
            num("commission"),

        result,


        /*
         * Psychology.
         */

        confidence:
            val("confidence"),

        emotion:
            val("emotion"),

        discipline:
            val("discipline"),

        patience:
            val("patience"),


        /*
         * Review.
         */

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


        /*
         * Charts.
         */

        beforeChart:
            val("beforeChart"),

        duringChart:
            val("duringChart"),

        afterChart:
            val("afterChart"),


        /*
         * Notes.
         */

        notes:
            val("notes"),


        /*
         * STATUS
         *
         * Editing a pending trade:
         * remains Pending.
         *
         * Editing a closed trade:
         * remains Closed.
         */

        status:
            existing?.status ||
            (
                result === "Pending"
                    ? "Pending"
                    : "Closed"
            ),


        created:
            existing?.created ||
            new Date().toISOString(),


        closed:
            existing?.closed ||
            null,


        /*
         * Preserve any extra fields from
         * old journal versions.
         */

        ...(existing || {})

    };


    /*
     * Fields from the current form must
     * override old values.
     */

    trade.date =
        val("tradeDate") ||
        trade.date;

    trade.time =
        val("tradeTime");

    trade.pair =
        val("pair");

    trade.direction =
        val("direction");

    trade.session =
        val("session");

    trade.broker =
        val("broker");

    trade.accountId =
        accountId;

    trade.account =
        account?.name ||
        trade.account;

    trade.lotSize =
        lotSize;


    trade.htfSwing =
        val("htfSwing");

    trade.htfInternal =
        val("htfInternal");

    trade.mtfSwing =
        val("mtfSwing");

    trade.mtfInternal =
        val("mtfInternal");

    trade.ltfStructure =
        val("ltfStructure");

    trade.liquidity =
        val("liquidity");

    trade.poi =
        val("poi");

    trade.entryModel =
        getEntryModelValue();

    trade.entryConfirmation =
        val("entryConfirmation");

    trade.tradeValid =
        val("tradeValid");


    trade.confluences =
        collectConfluences();


    trade.entry =
        entry;

    trade.stopLoss =
        stopLoss;

    trade.takeProfit =
        takeProfit;

    trade.lotSize =
        lotSize;


    trade.profit =
        num("profit");

    trade.commission =
        num("commission");


    /*
     * If editing, status must remain
     * what it was unless user explicitly
     * closes it through closeTrade().
     */

    if (existing) {

        trade.status =
            existing.status;

        trade.closed =
            existing.closed;

    }


    /*
     * If the form explicitly contains
     * a closed result and this is a new
     * trade, mark it closed.
     */

    if (
        !existing &&
        result !== "Pending"
    ) {

        trade.status =
            "Closed";

        trade.closed =
            new Date().toISOString();

    }


    /*
     * Recalculate actual RR.
     */

    if (
        trade.status ===
        "Closed"
    ) {

        trade.actualRR =
            calculateActualRR(
                trade
            );

        trade.rr =
            trade.actualRR;

    }

    else {

        trade.actualRR =
            0;

        /*
         * Pending trade should display
         * planned RR, not fake actual RR.
         */

        trade.rr =
            trade.initialRR;

    }


    return trade;

}


/* ==========================================================
   RISK %
   ========================================================== */

function balanceRiskPercent(
    riskAmount,
    balance
) {

    if (
        riskAmount <= 0 ||
        balance <= 0
    ) {

        return 0;

    }


    return Math.round(
        (
            riskAmount /
            balance *
            100
        ) * 100
    ) / 100;

}


/* ==========================================================
   SAVE TRADE
   ========================================================== */

function saveTrade(event) {

    event.preventDefault();


    loadTrades();


    const existing =
        editingTrade;


    const trade =
        buildTradeFromForm();


    /*
     * UPDATE
     */

    if (existing) {

        const index =
            trades.findIndex(
                item =>
                    item.id ===
                    existing.id
            );


        if (
            index === -1
        ) {

            alert(
                "❌ The trade could not be found."
            );

            return;

        }


        /*
         * Replace the existing record
         * WITHOUT changing its ID.
         */

        trades[index] =
            trade;


        saveTrades();


        alert(
            "✅ Trade updated successfully."
        );


        editingTrade =
            null;


        window.location.href =
            "/history";


        return;

    }


    /*
     * NEW TRADE
     */

    trades.unshift(
        trade
    );


    saveTrades();


    alert(
        "✅ Trade saved successfully."
    );


    const form =
        $("tradeForm");


    if (form) {

        form.reset();

    }


    restoreDefaultDate();


    editingTrade =
        null;


    refreshUI();

}


/* ==========================================================
   DEFAULT DATE
   ========================================================== */

function restoreDefaultDate() {

    const date =
        $("tradeDate");


    if (!date) return;


    date.value =
        new Date()
            .toISOString()
            .split("T")[0];

}


/* ==========================================================
   POPULATE FORM
   ========================================================== */

function populateForm(
    trade
) {

    if (!trade) return;


    console.log(
        "Loading trade for edit:",
        trade
    );


    /*
     * Fields.
     */

    const fields = [

        "tradeDate",
        "tradeTime",

        "pair",
        "direction",
        "session",
        "broker",

        "lotSize",

        "htfSwing",
        "htfInternal",

        "mtfSwing",
        "mtfInternal",

        "ltfStructure",
        "liquidity",
        "poi",

        "entryConfirmation",
        "tradeValid",

        "entry",
        "stopLoss",
        "takeProfit",

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

            const el =
                $(id);


            if (!el) return;


            if (
                trade[id] !==
                    undefined &&
                trade[id] !== null
            ) {

                el.value =
                    trade[id];

            }

        }
    );


    /*
     * Account.
     */

    const accountSelect =
        $("tradeAccount");


    if (
        accountSelect &&
        trade.accountId
    ) {

        accountSelect.value =
            trade.accountId;

    }


    /*
     * Risk values.
     */

    setValue(
        "balance",
        trade.balance ??
        getLiveAccountBalance(
            trade.accountId
        )
    );


    setValue(
        "risk",
        trade.risk ??
        0
    );


    setValue(
        "riskAmount",
        trade.initialRiskAmount ??
        trade.riskAmount ??
        0
    );


    setValue(
        "potentialProfit",
        trade.potentialProfit ??
        0
    );


    setValue(
        "potentialLoss",
        trade.potentialLoss ??
        0
    );


    /*
     * Initial RR should be preserved.
     */

    setValue(
        "rr",
        trade.status === "Closed"
            ? (
                trade.actualRR ??
                trade.rr ??
                0
            )
            : (
                trade.initialRR ??
                trade.rr ??
                0
            )
    );


    /*
     * Entry Model.
     */

    const entrySelect =
        $("entryModel");


    const customInput =
        $("entryModelCustom");


    if (
        entrySelect &&
        trade.entryModel !==
            undefined
    ) {

        const savedModel =
            String(
                trade.entryModel ||
                ""
            );


        const builtIn =
            Array.from(
                entrySelect.options
            )
                .some(
                    option =>
                        option.value ===
                        savedModel &&
                        option.value !==
                            "__custom__"
                );


        if (builtIn) {

            entrySelect.value =
                savedModel;


            if (customInput) {

                customInput.value =
                    "";

            }

        }

        else if (
            savedModel
        ) {

            entrySelect.value =
                "__custom__";


            if (customInput) {

                customInput.value =
                    savedModel;

            }

        }


        syncEntryModelInput();

    }


    /*
     * Confluences.
     */

    const confluenceMap = {

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


    /*
     * First clear every checkbox.
     */

    Object.values(
        confluenceMap
    )
        .forEach(
            id => {

                const checkbox =
                    $(id);


                if (checkbox) {

                    checkbox.checked =
                        false;

                }

            }
        );


    /*
     * Then restore saved values.
     */

    if (
        trade.confluences
    ) {

        Object.entries(
            trade.confluences
        )
            .forEach(
                (
                    [
                        key,
                        value
                    ]
                ) => {

                    const id =
                        confluenceMap[
                            key
                        ];


                    if (!id) return;


                    const checkbox =
                        $(id);


                    if (checkbox) {

                        checkbox.checked =
                            !!value;

                    }

                }
            );

    }


    /*
     * Update account display.
     */

    updateTradeAccountInfo();


    /*
     * Calculate display values.
     */

    calculateAll();


    /*
     * Important:
     * After calculateAll(),
     * restore actual RR for closed
     * trades because calculation of
     * the form is planned RR.
     */

    if (
        trade.status ===
        "Closed"
    ) {

        setValue(
            "rr",
            trade.actualRR ??
            trade.rr ??
            0
        );

    }


    /*
     * Change page title.
     */

    const header =
        document.querySelector(
            ".page-header h1"
        );


    if (header) {

        header.innerHTML =
            '<i class="fa-solid fa-pen"></i> Edit Trade';

    }


    const headerP =
        document.querySelector(
            ".page-header p"
        );


    if (headerP) {

        headerP.textContent =
            "Modify trade details and save changes.";

    }


    /*
     * Change button.
     */

    const submit =
        document.querySelector(
            "#tradeForm button[type='submit']"
        );


    if (submit) {

        submit.innerHTML =
            '<i class="fa-solid fa-pen"></i> Update Trade';

        submit.classList.add(
            "btn-update"
        );

    }


    /*
     * Hidden update flag for
     * compatibility with old HTML.
     */

    const form =
        $("tradeForm");


    if (form) {

        let flag =
            $("updateMode");


        if (!flag) {

            flag =
                document.createElement(
                    "input"
                );


            flag.type =
                "hidden";


            flag.id =
                "updateMode";


            flag.name =
                "updateMode";


            form.appendChild(
                flag
            );

        }


        flag.value =
            "true";

    }


    console.log(
        "✅ Trade completely populated for editing."
    );

}


/* ==========================================================
   EDIT MODE
   ========================================================== */

function initializeEditMode() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const editId =
        params.get(
            "edit"
        );


    if (!editId) {

        editingTrade =
            null;

        return;

    }


    loadTrades();


    const trade =
        trades.find(
            item =>
                String(item.id) ===
                String(editId)
        );


    if (!trade) {

        console.error(
            "Trade not found:",
            editId
        );


        alert(
            "❌ Trade could not be found."
        );


        return;

    }


    /*
     * THIS is the single source
     * of truth for edit mode.
     */

    editingTrade =
        trade;


    console.log(
        "✏️ EDIT MODE:",
        editingTrade
    );


    /*
     * Populate only after the DOM
     * exists.
     */

    requestAnimationFrame(
        () => {

            populateForm(
                editingTrade
            );

        }
    );

}


/* ==========================================================
   CLOSE TRADE
   ========================================================== */

window.closeTrade =
    function(id) {

        loadTrades();


        const index =
            trades.findIndex(
                trade =>
                    String(trade.id) ===
                    String(id)
            );


        if (
            index === -1
        ) {

            return;

        }


        const trade =
            trades[index];


        if (
            trade.status ===
            "Closed"
        ) {

            window.location.href =
                "/journal?edit=" +
                encodeURIComponent(
                    trade.id
                );

            return;

        }


        /*
         * IMPORTANT:
         *
         * Closing a trade does NOT ask
         * for a new RR.
         *
         * RR is calculated from the
         * preserved initial risk.
         */

        const outcome =
            prompt(
                "Result?\n\nWin\nLoss\nBreakeven"
            );


        if (!outcome) return;


        const normalized =
            outcome
                .trim()
                .toLowerCase();


        let result;


        if (
            normalized ===
            "win"
        ) {

            result =
                "Win";

        }

        else if (
            normalized ===
            "loss"
        ) {

            result =
                "Loss";

        }

        else if (
            normalized ===
            "breakeven" ||
            normalized ===
            "be"
        ) {

            result =
                "Breakeven";

        }

        else {

            alert(
                "Please enter Win, Loss or Breakeven."
            );

            return;

        }


        let profit =
            parseFloat(
                prompt(
                    "Profit/Loss ($)",
                    "0"
                )
            );


        if (
            !Number.isFinite(
                profit
            )
        ) {

            profit = 0;

        }


        const commission =
            parseFloat(
                prompt(
                    "Commission ($)",
                    "0"
                )
            ) || 0;


        /*
         * Normalize loss sign.
         */

        if (
            result ===
            "Loss"
        ) {

            profit =
                -Math.abs(
                    profit
                );

        }


        if (
            result ===
            "Win"
        ) {

            profit =
                Math.abs(
                    profit
                );

        }


        if (
            result ===
            "Breakeven"
        ) {

            profit =
                0;

        }


        /*
         * Preserve original risk.
         */

        const initialRiskAmount =
            safeNumber(
                trade.initialRiskAmount ??
                trade.riskAmount
            );


        /*
         * Close.
         */

        trade.status =
            "Closed";


        trade.closed =
            new Date()
                .toISOString();


        trade.result =
            result;


        trade.profit =
            profit;


        trade.commission =
            commission;


        trade.initialRiskAmount =
            initialRiskAmount;


        /*
         * ACTUAL RR
         *
         * Based on initial risk.
         *
         * Moving SL later will NOT
         * destroy the original RR.
         */

        trade.actualRR =
            calculateActualRR(
                trade
            );


        trade.rr =
            trade.actualRR;


        saveTrades();


        refreshUI();


        alert(
            "✅ Trade closed successfully.\n\n" +
            "Account: " +
            (
                trade.account ||
                "-"
            ) +
            "\nNet P/L: " +
            signedMoney(
                profit -
                commission
            ) +
            "\nActual RR: " +
            trade.actualRR.toFixed(2)
        );

    };


/* ==========================================================
   VIEW TRADE
   ========================================================== */

window.viewTrade =
    function(trade) {

        if (!trade) return;


        const net =
            safeNumber(
                trade.profit
            ) -
            safeNumber(
                trade.commission
            );


        alert(`

PAIR              : ${trade.pair || "-"}

ACCOUNT           : ${trade.account || "-"}

STATUS            : ${trade.status || "-"}

RESULT            : ${trade.result || "-"}

PROFIT            : ${money(trade.profit)}

COMMISSION        : ${money(trade.commission)}

NET P/L           : ${signedMoney(net)}

INITIAL RISK      : ${money(
    trade.initialRiskAmount ??
    trade.riskAmount
)}

INITIAL RR        : ${safeNumber(
    trade.initialRR
).toFixed(2)}

ACTUAL RR         : ${safeNumber(
    trade.actualRR ??
    trade.rr
).toFixed(2)}

LESSON            : ${
    trade.lessonLearned ||
    "-"
}

IMPROVEMENT       : ${
    trade.improvementPlan ||
    "-"
}

        `);

    };


/* ==========================================================
   RECENT PENDING TRADES
   ========================================================== */

function loadRecentTrades() {

    const container =
        $("recentTrades");


    if (!container) return;


    const filtered =
        getFilteredTrades();


    const pending =
        filtered.filter(
            trade =>
                trade.status ===
                    "Pending" ||
                trade.result ===
                    "Pending"
        );


    if (
        pending.length ===
        0
    ) {

        container.innerHTML = `

            <div style="
                padding:12px 0;
                color:var(--text-secondary);
            ">
                No pending trades.
            </div>

        `;

        return;

    }


    container.innerHTML =
        "";


    pending
        .slice(0, 8)
        .forEach(
            trade => {

                container.innerHTML += `

                    <div class="trade-row">

                        <div>

                            <strong>
                                ${
                                    trade.pair ||
                                    "?"
                                }
                            </strong>

                            <br>

                            <span style="
                                font-size:12px;
                                color:var(--text-secondary);
                            ">
                                ${
                                    trade.direction ||
                                    ""
                                }
                            </span>

                        </div>

                        <div>
                            ${
                                trade.account ||
                                "-"
                            }
                        </div>

                        <div>
                            ${
                                trade.entryModel ||
                                "-"
                            }
                        </div>

                        <div>

                            <span class="status pending">
                                Pending
                            </span>

                        </div>

                        <div>

                            <button
                                onclick="
                                    window.location.href='/journal?edit=${encodeURIComponent(
                                        trade.id
                                    )}'
                                "
                                class="btn"
                            >
                                Edit
                            </button>

                            <button
                                onclick="
                                    closeTrade('${String(
                                        trade.id
                                    ).replace(
                                        /'/g,
                                        "\\'"
                                    )}')
                                "
                                class="btn"
                            >
                                Close
                            </button>

                        </div>

                    </div>

                `;

            }
        );

}


/* ==========================================================
   FILTERED TRADES
   ========================================================== */

function getFilteredTrades() {

    if (
        selectedAccountId ===
        "all"
    ) {

        return trades;

    }


    return trades.filter(
        trade =>
            trade.accountId ===
                selectedAccountId ||
            (
                !trade.accountId &&
                trade.account ===
                    accounts[
                        selectedAccountId
                    ]?.name
            )
    );

}


/* ==========================================================
   DASHBOARD STATISTICS
   ========================================================== */

function calculateStatistics() {

    const filtered =
        getFilteredTrades();


    const closed =
        filtered.filter(
            trade =>
                trade.status ===
                "Closed"
        );


    const wins =
        closed.filter(
            trade =>
                trade.result ===
                "Win"
        );


    const losses =
        closed.filter(
            trade =>
                trade.result ===
                "Loss"
        );


    const pending =
        filtered.filter(
            trade =>
                trade.status ===
                "Pending"
        );


    const netProfit =
        closed.reduce(
            (
                total,
                trade
            ) => {

                return total +
                    safeNumber(
                        trade.profit
                    ) -
                    safeNumber(
                        trade.commission
                    );

            },
            0
        );


    const winRate =
        closed.length
            ? (
                wins.length /
                closed.length *
                100
            )
            : 0;


    /*
     * Only CLOSED trades are used
     * for actual RR.
     */

    const rrValues =
        closed
            .map(
                trade =>
                    safeNumber(
                        trade.actualRR ??
                        trade.rr
                    )
            );


    const avgRR =
        rrValues.length
            ? rrValues.reduce(
                (
                    a,
                    b
                ) =>
                    a + b,
                0
            ) /
            rrValues.length
            : 0;


    setText(
        "totalTrades",
        filtered.length
    );


    setText(
        "wins",
        wins.length
    );


    setText(
        "losses",
        losses.length
    );


    setText(
        "pendingTrades",
        pending.length
    );


    setText(
        "winRate",
        winRate.toFixed(1) +
        "%"
    );


    setText(
        "averageRR",
        avgRR.toFixed(2)
    );


    setText(
        "netProfit",
        signedMoney(
            netProfit
        )
    );


    setText(
        "netProfitValue",
        signedMoney(
            netProfit
        )
    );


    /*
     * Additional statistics.
     */

    const winningProfit =
        wins.reduce(
            (
                total,
                trade
            ) =>
                total +
                Math.max(
                    0,
                    safeNumber(
                        trade.profit
                    )
                ),
            0
        );


    const losingProfit =
        Math.abs(
            losses.reduce(
                (
                    total,
                    trade
                ) =>
                    total +
                    Math.min(
                        0,
                        safeNumber(
                            trade.profit
                        )
                    ),
                0
            )
        );


    const profitFactor =
        losingProfit > 0
            ? winningProfit /
              losingProfit
            : 0;


    setText(
        "profitFactor",
        profitFactor.toFixed(2)
    );


    /*
     * This month.
     */

    const now =
        new Date();


    const thisMonth =
        filtered.filter(
            trade => {

                const date =
                    new Date(
                        trade.closed ||
                        trade.date
                    );


                return (
                    date.getFullYear() ===
                        now.getFullYear() &&
                    date.getMonth() ===
                        now.getMonth()
                );

            }
        );


    setText(
        "thisMonth",
        thisMonth.length
    );


    /*
     * Streak.
     */

    let streak =
        0;


    closed
        .slice()
        .sort(
            (
                a,
                b
            ) =>
                new Date(
                    a.closed ||
                    a.date
                ) -
                new Date(
                    b.closed ||
                    b.date
                )
        )
        .forEach(
            trade => {

                if (
                    trade.result ===
                    "Win"
                ) {

                    streak++;

                }

                else {

                    streak = 0;

                }

            }
        );


    setText(
        "streak",
        streak
            ? "+" +
              streak
            : "0"
    );


    /*
     * Max drawdown.
     */

    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;


    closed
        .slice()
        .sort(
            (
                a,
                b
            ) =>
                new Date(
                    a.closed ||
                    a.date
                ) -
                new Date(
                    b.closed ||
                    b.date
                )
        )
        .forEach(
            trade => {

                equity +=
                    safeNumber(
                        trade.profit
                    ) -
                    safeNumber(
                        trade.commission
                    );


                peak =
                    Math.max(
                        peak,
                        equity
                    );


                maxDrawdown =
                    Math.max(
                        maxDrawdown,
                        peak -
                        equity
                    );

            }
        );


    setText(
        "maxDrawdown",
        money(
            maxDrawdown
        )
    );

}


/* ==========================================================
   ACCOUNT PANEL
   ========================================================== */

function updateAccountPanel() {

    const account =
        getSelectedAccount();


    if (!account) {

        const totalStarting =
            Object.values(
                accounts
            )
                .reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        safeNumber(
                            item.startingBalance
                        ),
                    0
                );


        const totalCurrent =
            Object.keys(
                accounts
            )
                .reduce(
                    (
                        sum,
                        id
                    ) =>
                        sum +
                        getLiveAccountBalance(
                            id
                        ),
                    0
                );


        setText(
            "startingBalance",
            money(
                totalStarting
            )
        );


        setText(
            "currentBalance",
            money(
                totalCurrent
            )
        );


        setText(
            "accountPnl",
            signedMoney(
                totalCurrent -
                totalStarting
            )
        );


        return;

    }


    const normalized =
        normalizeAccount(
            account
        );


    const starting =
        normalized.startingBalance;


    const current =
        getLiveAccountBalance(
            normalized.id
        );


    const pnl =
        current -
        starting;


    setText(
        "startingBalance",
        money(
            starting
        )
    );


    setText(
        "currentBalance",
        money(
            current
        )
    );


    setText(
        "accountPnl",
        signedMoney(
            pnl
        )
    );


    setText(
        "accountRiskSetting",
        normalized.riskMode +
        " " +
        normalized.riskSetting
    );


    setText(
        "riskSetting",
        normalized.riskMode +
        " " +
        normalized.riskSetting
    );


    /*
     * Selected account details.
     */

    setText(
        "selectedAccountName",
        normalized.name ||
        "-"
    );


    setText(
        "selectedAccountBalance",
        money(
            current
        )
    );


    setText(
        "selectedAccountStarting",
        money(
            starting
        )
    );


    setText(
        "selectedAccountRisk",
        money(
            calculateAccountRisk(
                normalized,
                current
            )
        )
    );


    setText(
        "selectedAccountCurrency",
        normalized.currency ||
        "USD"
    );

}


/* ==========================================================
   CHARTS
   ========================================================== */

function destroyAllCharts() {

    if (
        equityChartInstance
    ) {

        equityChartInstance.destroy();

        equityChartInstance =
            null;

    }


    if (
        monthlyChartInstance
    ) {

        monthlyChartInstance.destroy();

        monthlyChartInstance =
            null;

    }


    ["equityChart", "monthlyChart"]
        .forEach(
            id => {

                const canvas =
                    $(id);


                if (!canvas) return;


                if (
                    typeof Chart !==
                    "undefined" &&
                    typeof Chart.getChart ===
                    "function"
                ) {

                    const existing =
                        Chart.getChart(
                            canvas
                        );


                    if (existing) {

                        existing.destroy();

                    }

                }

            }
        );

}


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


function buildEquityChart() {

    const canvas =
        $("equityChart");


    if (!canvas) return;


    const filtered =
        getFilteredTrades();


    const closed =
        filtered
            .filter(
                trade =>
                    trade.status ===
                    "Closed"
            )
            .slice()
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(
                        a.closed ||
                        a.date
                    ) -
                    new Date(
                        b.closed ||
                        b.date
                    )
            );


    let startingBalance = 0;


    if (
        selectedAccountId ===
        "all"
    ) {

        startingBalance =
            Object.values(
                accounts
            )
                .reduce(
                    (
                        sum,
                        account
                    ) =>
                        sum +
                        safeNumber(
                            account.startingBalance
                        ),
                    0
                );

    }

    else {

        const account =
            getSelectedAccount();


        startingBalance =
            account
                ? safeNumber(
                    account.startingBalance
                )
                : 0;

    }


    let balance =
        startingBalance;


    const data = [
        balance
    ];


    closed.forEach(
        trade => {

            balance +=
                safeNumber(
                    trade.profit
                ) -
                safeNumber(
                    trade.commission
                );


            data.push(
                balance
            );

        }
    );


    equityChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "line",

                data: {

                    labels:
                        data.map(
                            (
                                _,
                                index
                            ) =>
                                index ===
                                0
                                    ? "Start"
                                    : index
                        ),

                    datasets: [

                        {

                            label:
                                "Equity",

                            data,

                            borderColor:
                                "#4f7cff",

                            backgroundColor:
                                "rgba(79,124,255,0.15)",

                            fill:
                                true,

                            tension:
                                0.3

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );

}


function buildMonthlyChart() {

    const canvas =
        $("monthlyChart");


    if (!canvas) return;


    const filtered =
        getFilteredTrades();


    const monthly = {};


    filtered
        .filter(
            trade =>
                trade.status ===
                "Closed"
        )
        .forEach(
            trade => {

                const date =
                    new Date(
                        trade.closed ||
                        trade.date
                    );


                if (
                    Number.isNaN(
                        date.getTime()
                    )
                ) {

                    return;

                }


                const key =
                    date.getFullYear() +
                    "-" +
                    String(
                        date.getMonth() + 1
                    )
                        .padStart(
                            2,
                            "0"
                        );


                const label =
                    date.toLocaleString(
                        "default",
                        {
                            month:
                                "short",
                            year:
                                "numeric"
                        }
                    );


                if (
                    !monthly[key]
                ) {

                    monthly[key] = {

                        label,

                        value:
                            0

                    };

                }


                monthly[key].value +=
                    safeNumber(
                        trade.profit
                    ) -
                    safeNumber(
                        trade.commission
                    );

            }
        );


    const keys =
        Object.keys(
            monthly
        )
            .sort();


    monthlyChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels:
                        keys.map(
                            key =>
                                monthly[
                                    key
                                ].label
                        ),

                    datasets: [

                        {

                            label:
                                "Monthly P&L",

                            data:
                                keys.map(
                                    key =>
                                        monthly[
                                            key
                                        ].value
                                ),

                            backgroundColor:
                                "#4f7cff",

                            borderRadius:
                                6

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );

}


/* ==========================================================
   REFRESH
   ========================================================== */

function refreshUI() {

    loadAccounts();

    loadTrades();

    populateAccountSelectors();

    updateTradeAccountInfo();

    calculateStatistics();

    loadRecentTrades();

    initializeCharts();

    updateAccountPanel();

}


/* ==========================================================
   FORM EVENTS
   ========================================================== */

function initializeForm() {

    const form =
        $("tradeForm");


    if (!form) return;


    /*
     * ONE submit listener.
     */

    form.addEventListener(
        "submit",
        saveTrade
    );


    /*
     * Auto calculation.
     */

    [

        "pair",

        "direction",

        "entry",

        "stopLoss",

        "takeProfit",

        "lotSize",

        "balance"

    ]
        .forEach(
            id => {

                const el =
                    $(id);


                if (!el) return;


                el.addEventListener(
                    "input",
                    calculateAll
                );


                el.addEventListener(
                    "change",
                    calculateAll
                );

            }
        );


    /*
     * Account selection.
     */

    const tradeAccount =
        $("tradeAccount");


    if (tradeAccount) {

        tradeAccount.addEventListener(
            "change",
            () => {

                updateTradeAccountInfo();

                calculateAll();

            }
        );

    }


    /*
     * Entry model.
     */

    const entryModel =
        $("entryModel");


    if (entryModel) {

        entryModel.addEventListener(
            "change",
            syncEntryModelInput
        );

    }


    /*
     * Reset.
     */

    form.addEventListener(
        "reset",
        () => {

            setTimeout(
                () => {

                    editingTrade =
                        null;

                    restoreDefaultDate();

                    populateAccountSelectors();

                    updateTradeAccountInfo();

                    calculateAll();

                },
                50
            );

        }
    );

}


/* ==========================================================
   ACCOUNT FILTER
   ========================================================== */

function initializeAccountFilter() {

    const filter =
        $("accountFilter");


    if (!filter) return;


    filter.addEventListener(
        "change",
        () => {

            selectedAccountId =
                filter.value ||
                "all";


            /*
             * Keep journal form aligned
             * with selected account.
             */

            const tradeAccount =
                $("tradeAccount");


            if (
                tradeAccount &&
                selectedAccountId !==
                    "all"
            ) {

                tradeAccount.value =
                    selectedAccountId;

            }


            updateTradeAccountInfo();

            calculateStatistics();

            loadRecentTrades();

            initializeCharts();

            updateAccountPanel();

        }
    );

}


/* ==========================================================
   STORAGE SYNC
   ========================================================== */

window.addEventListener(
    "storage",
    event => {

        if (
            event.key ===
                STORAGE_KEY ||
            event.key ===
                ACCOUNTS_KEY
        ) {

            refreshUI();

        }

    }
);


/* ==========================================================
   INITIALIZATION
   ========================================================== */

async function initializeJournal() {

    try {

        await checkJournalAccess();

    }

    catch (error) {

        console.error(
            "Journal initialization stopped:",
            error
        );

        return;

    }


    loadAccounts();

    loadTrades();


    /*
     * Build selectors first.
     */

    populateAccountSelectors();


    /*
     * Build form listeners.
     */

    initializeForm();

    initializeAccountFilter();


    /*
     * Date only defaults on NEW
     * trade.
     */

    if (
        !new URLSearchParams(
            window.location.search
        ).has("edit")
    ) {

        restoreDefaultDate();

    }


    /*
     * Edit mode must happen AFTER
     * the form exists.
     */

    initializeEditMode();


    /*
     * Initial UI.
     */

    refreshUI();


    /*
     * Re-populate edit trade after
     * all account selectors have
     * finished loading.
     */

    if (editingTrade) {

        populateForm(
            editingTrade
        );

    }


    /*
     * Scroll top.
     */

    const scrollBtn =
        $("scrollTopBtn");


    if (scrollBtn) {

        window.addEventListener(
            "scroll",
            () => {

                scrollBtn.classList.toggle(
                    "visible",
                    window.scrollY >
                    300
                );

            }
        );


        scrollBtn.addEventListener(
            "click",
            () => {

                window.scrollTo(
                    {
                        top:
                            0,

                        behavior:
                            "smooth"

                    }
                );

            }
        );

    }


    console.log(
        "✅ GTRADES-AXIS Journal ready."
    );

}


/* ==========================================================
   DOM READY
   ========================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeJournal
    );

}

else {

    initializeJournal();

}


/* ==========================================================
   LOGOUT
   ========================================================== */

const logoutBtn =
    $("logoutBtn");


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            if (
                !confirm(
                    "Logout?"
                )
            ) {

                return;

            }


            try {

                const {
                    signOut
                } =
                    await import(
                        "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js"
                    );


                await signOut(
                    auth
                );


                window.location.reload();

            }

            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }

        }
    );

}


/* ==========================================================
   END
   ========================================================== */
