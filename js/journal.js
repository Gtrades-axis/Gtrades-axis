/* ============================================================
   GTRADES AXIS™
   TRADING JOURNAL
   COMPLETE JOURNAL ENGINE
   ============================================================ */

import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";


/* ============================================================
   GLOBALS
   ============================================================ */

const STORAGE_KEY = "trades";

let currentUser = null;
let trades = [];
let editingTrade = null;

let equityChartInstance = null;
let monthlyChartInstance = null;


/* ============================================================
   BASIC HELPERS
   ============================================================ */

function $(id) {
    return document.getElementById(id);
}

function val(id) {

    const el = $(id);

    if (!el) return "";

    return el.value ?? "";
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

function safeNumber(value) {

    const n = parseFloat(value);

    return Number.isFinite(n) ? n : 0;
}

function round(value, decimals = 2) {

    const factor = Math.pow(10, decimals);

    return Math.round((safeNumber(value) + Number.EPSILON) * factor) / factor;
}


/* ============================================================
   LOCAL STORAGE
   ============================================================ */

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

        console.error("Failed to load trades:", error);

        trades = [];
    }
}


function saveTrades() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(trades)
        );

        return true;

    } catch (error) {

        console.error("Failed to save trades:", error);

        alert("❌ Unable to save journal data.");

        return false;
    }
}


/* ============================================================
   JOURNAL ACCESS
   ============================================================ */

async function checkJournalAccess() {

    return new Promise((resolve, reject) => {

        onAuthStateChanged(auth, async (user) => {

            if (!user) {

                window.location.href = "/login";

                reject(new Error("Not authenticated"));

                return;
            }

            currentUser = user;

            try {

                const snap = await getDoc(
                    doc(db, "users", user.uid)
                );

                if (!snap.exists()) {

                    alert("User account not found.");

                    window.location.href = "/dashboard";

                    reject(new Error("User not found"));

                    return;
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

                console.error("Journal access error:", error);

                reject(error);
            }

        });
    });
}


/* ============================================================
   FIELD READING
   ============================================================ */

/*
   Supports:

   <input id="pair">
   <select id="pair">
   <textarea id="notes">

   AND radio groups such as:

   <input type="radio" name="direction" value="BUY">
   <input type="radio" name="direction" value="SELL">
*/

function readField(id) {

    const element = $(id);

    if (element) {

        if (
            element.type === "checkbox"
        ) {
            return element.checked;
        }

        return element.value ?? "";
    }


    const radio = document.querySelector(
        `input[name="${id}"]:checked`
    );

    if (radio) {
        return radio.value;
    }

    return "";
}


function readNumber(id) {

    return safeNumber(readField(id));
}


/* ============================================================
   FIELD WRITING
   ============================================================ */

function setField(id, value) {

    const element = $(id);

    if (element) {

        if (element.type === "checkbox") {

            element.checked =
                value === true ||
                value === "true";

        } else {

            element.value =
                value === null ||
                value === undefined
                    ? ""
                    : value;
        }

        element.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );

        element.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );

        return true;
    }


    const radios = document.querySelectorAll(
        `input[name="${id}"]`
    );

    if (radios.length) {

        radios.forEach(radio => {

            radio.checked =
                String(radio.value) ===
                String(value);

        });

        return true;
    }


    return false;
}


function setCheckbox(id, checked) {

    const element = $(id);

    if (element) {

        element.checked = !!checked;

        element.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );
    }
}


/* ============================================================
   SYMBOL NORMALIZATION
   ============================================================ */

function normalizeSymbol(symbol) {

    return String(symbol || "")
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace("/", "");
}


/* ============================================================
   PIP / CONTRACT CALCULATIONS
   ============================================================ */

/*
   IMPORTANT:

   This journal is NOT Gold-only.

   Forex:

   EURUSD / GBPUSD / AUDUSD / NZDUSD
   1 standard lot ≈ $10 per pip

   USDJPY / GBPJPY / EURJPY etc.
   Pip size = 0.01

   Gold:

   XAUUSD
   Standard assumption:
   1 lot = 100 oz
   $1.00 price movement = $100 per lot

   This gives:

   0.15 XAUUSD movement × 1.5 lots × $100
   = $22.50 risk

   Which matches the type of calculation your old journal
   was showing.
*/


function getSymbolInfo(symbol) {

    const s = normalizeSymbol(symbol);

    const isGold =
        s.includes("XAUUSD") ||
        s === "GOLD" ||
        s.includes("XAU");

    if (isGold) {

        return {
            type: "gold",
            pipSize: 0.01,
            pipValuePerLot: 1,
            contractSize: 100,
            priceValuePerLot: 100
        };
    }


    const isSilver =
        s.includes("XAGUSD") ||
        s === "SILVER";

    if (isSilver) {

        return {
            type: "metal",
            pipSize: 0.01,
            pipValuePerLot: 0.5,
            contractSize: 5000,
            priceValuePerLot: 5000
        };
    }


    const jpyPair =
        s.endsWith("JPY");

    if (jpyPair) {

        return {
            type: "forex",
            pipSize: 0.01,
            pipValuePerLot: 10,
            contractSize: 100000
        };
    }


    return {
        type: "forex",
        pipSize: 0.0001,
        pipValuePerLot: 10,
        contractSize: 100000
    };
}


/*
   If your HTML has a manual Pip Value field,
   we only use it when it contains a valid value.

   Otherwise the journal calculates it automatically.
*/

function getPipValuePerLot(symbol) {

    const manual = readNumber("pipValue");

    if (manual > 0) {
        return manual;
    }

    return getSymbolInfo(symbol).pipValuePerLot;
}


function calculatePriceDistance(entry, stopLoss) {

    return Math.abs(
        safeNumber(entry) -
        safeNumber(stopLoss)
    );
}


function calculatePips(symbol, entry, exit) {

    const info = getSymbolInfo(symbol);

    if (!entry || !exit) return 0;

    return Math.abs(
        safeNumber(entry) -
        safeNumber(exit)
    ) / info.pipSize;
}


/* ============================================================
   RISK CALCULATION
   ============================================================ */

function calculateRiskAmount(
    symbol,
    entry,
    stopLoss,
    lotSize
) {

    entry = safeNumber(entry);
    stopLoss = safeNumber(stopLoss);
    lotSize = safeNumber(lotSize);

    if (
        entry <= 0 ||
        stopLoss <= 0 ||
        lotSize <= 0
    ) {
        return 0;
    }

    const info = getSymbolInfo(symbol);

    const distance =
        Math.abs(entry - stopLoss);

    if (info.type === "gold") {

        return distance *
            lotSize *
            info.priceValuePerLot;
    }

    if (info.type === "metal") {

        return distance *
            lotSize *
            info.priceValuePerLot;
    }


    const pips =
        distance / info.pipSize;

    const pipValue =
        getPipValuePerLot(symbol);

    return pips *
        pipValue *
        lotSize;
}


/* ============================================================
   REWARD CALCULATION
   ============================================================ */

function calculateRewardAmount(
    symbol,
    entry,
    takeProfit,
    lotSize
) {

    entry = safeNumber(entry);
    takeProfit = safeNumber(takeProfit);
    lotSize = safeNumber(lotSize);

    if (
        entry <= 0 ||
        takeProfit <= 0 ||
        lotSize <= 0
    ) {
        return 0;
    }

    const info = getSymbolInfo(symbol);

    const distance =
        Math.abs(entry - takeProfit);

    if (
        info.type === "gold" ||
        info.type === "metal"
    ) {

        return distance *
            lotSize *
            info.priceValuePerLot;
    }


    const pips =
        distance / info.pipSize;

    const pipValue =
        getPipValuePerLot(symbol);

    return pips *
        pipValue *
        lotSize;
}


/* ============================================================
   PLANNED RR
   ============================================================ */

function calculatePlannedRR(
    symbol,
    entry,
    stopLoss,
    takeProfit
) {

    const risk =
        calculateRiskAmount(
            symbol,
            entry,
            stopLoss,
            1
        );

    const reward =
        calculateRewardAmount(
            symbol,
            entry,
            takeProfit,
            1
        );

    if (risk <= 0) return 0;

    return reward / risk;
}


/* ============================================================
   ACTUAL RR
   ============================================================ */

/*
   Actual RR uses:

       ORIGINAL ENTRY
       ORIGINAL STOP LOSS
       ACTUAL EXIT

   NOT the current stop loss after management.

   Therefore if you move SL to BE during the trade,
   the original risk is still preserved.

   Win  = positive RR
   Loss = negative RR
   BE   = 0
*/

function calculateActualRRFromPrices(
    symbol,
    direction,
    initialEntry,
    initialStopLoss,
    actualExit
) {

    initialEntry = safeNumber(initialEntry);
    initialStopLoss = safeNumber(initialStopLoss);
    actualExit = safeNumber(actualExit);

    if (
        initialEntry <= 0 ||
        initialStopLoss <= 0 ||
        actualExit <= 0
    ) {
        return 0;
    }

    const riskDistance =
        Math.abs(
            initialEntry -
            initialStopLoss
        );

    if (riskDistance <= 0) {
        return 0;
    }


    let rewardDistance;


    if (
        String(direction).toUpperCase() === "SELL"
    ) {

        rewardDistance =
            initialEntry -
            actualExit;

    } else {

        rewardDistance =
            actualExit -
            initialEntry;
    }


    return rewardDistance /
        riskDistance;
}


/*
   When there is no exit price field,
   use gross P/L / original monetary risk.

   This keeps old trades compatible.
*/

function calculateActualRR(
    trade
) {

    const direction =
        trade.direction || "";

    const initialEntry =
        safeNumber(
            trade.initialEntry ??
            trade.entry
        );

    const initialSL =
        safeNumber(
            trade.initialStopLoss ??
            trade.stopLoss
        );

    const actualExit =
        safeNumber(
            trade.actualExit ??
            trade.exitPrice
        );


    if (
        initialEntry > 0 &&
        initialSL > 0 &&
        actualExit > 0
    ) {

        return calculateActualRRFromPrices(
            trade.pair,
            direction,
            initialEntry,
            initialSL,
            actualExit
        );
    }


    const originalRisk =
        safeNumber(
            trade.initialRiskAmount ??
            trade.riskAmount ??
            trade.risk
        );

    const profit =
        safeNumber(trade.profit);


    if (originalRisk > 0) {

        if (
            trade.result === "Win"
        ) {

            return Math.abs(profit) /
                originalRisk;
        }

        if (
            trade.result === "Loss"
        ) {

            return -Math.abs(profit) /
                originalRisk;
        }

        return 0;
    }

    return 0;
}


/* ============================================================
   ACCOUNT DATA
   ============================================================ */

function getSelectedAccount() {

    const select = $("account");

    if (!select) return null;

    const selectedValue =
        select.value;

    if (!selectedValue) {
        return null;
    }

    const option =
        select.options[
            select.selectedIndex
        ];

    if (!option) {
        return null;
    }

    let account = {
        id: selectedValue,
        name:
            option.dataset.name ||
            option.textContent ||
            selectedValue,
        balance:
            safeNumber(
                option.dataset.balance
            ),
        risk:
            safeNumber(
                option.dataset.risk
            ),
        currency:
            option.dataset.currency ||
            "USD",
        riskSetting:
            option.dataset.riskSetting ||
            ""
    };


    /*
       Try common account-storage names used
       by the existing GTRADES-AXIS journal.
    */

    const storageKeys = [
        "tradingAccounts",
        "accounts",
        "journalAccounts"
    ];

    for (const key of storageKeys) {

        try {

            const raw =
                localStorage.getItem(key);

            if (!raw) continue;

            const data =
                JSON.parse(raw);

            if (!Array.isArray(data)) continue;

            const found =
                data.find(a =>
                    String(
                        a.id ??
                        a.accountId ??
                        a.name ??
                        ""
                    ) === String(selectedValue)
                );

            if (found) {

                account = {
                    ...account,
                    ...found
                };

                break;
            }

        } catch (error) {

            console.warn(
                "Account storage read failed:",
                key,
                error
            );
        }
    }


    return account;
}


/* ============================================================
   ACCOUNT UI
   ============================================================ */

function updateAccountDisplay() {

    const account =
        getSelectedAccount();

    if (!account) return;


    const balance =
        safeNumber(
            account.balance ??
            account.currentBalance ??
            account.startingBalance
        );


    const riskSetting =
        account.riskSetting ??
        account.riskType ??
        account.riskMode ??
        "";


    const riskAmount =
        safeNumber(
            account.risk ??
            account.riskAmount ??
            account.riskPerTrade
        );


    if ($("accountBalance")) {

        $("accountBalance").value =
            balance || "";

    }

    if ($("currentAccountBalance")) {

        $("currentAccountBalance").value =
            balance || "";

    }

    if ($("startingBalance")) {

        $("startingBalance").value =
            balance || "";

    }

    if ($("accountRiskSetting")) {

        $("accountRiskSetting").value =
            riskSetting;

    }

    if ($("currency")) {

        $("currency").value =
            account.currency ||
            "USD";

    }

    if ($("riskAmount")) {

        $("riskAmount").value =
            riskAmount || "";

    }


    updateCalculations();
}


/* ============================================================
   UPDATE CALCULATIONS IN FORM
   ============================================================ */

function updateCalculations() {

    const symbol =
        readField("pair");

    const direction =
        readField("direction");

    const entry =
        readNumber("entry");

    const stopLoss =
        readNumber("stopLoss");

    const takeProfit =
        readNumber("takeProfit");

    const lotSize =
        readNumber("lotSize");


    const riskAmount =
        calculateRiskAmount(
            symbol,
            entry,
            stopLoss,
            lotSize
        );


    const rewardAmount =
        calculateRewardAmount(
            symbol,
            entry,
            takeProfit,
            lotSize
        );


    const plannedRR =
        riskAmount > 0
            ? rewardAmount / riskAmount
            : 0;


    let accountRisk = 0;

    const account =
        getSelectedAccount();

    if (account) {

        accountRisk =
            safeNumber(
                account.risk ??
                account.riskAmount ??
                account.riskPerTrade
            );
    }


    if (!accountRisk) {

        const balance =
            safeNumber(
                readField(
                    "currentAccountBalance"
                )
            );

        const riskPercent =
            safeNumber(
                readField(
                    "accountRiskPercent"
                )
            );

        if (
            balance > 0 &&
            riskPercent > 0
        ) {

            accountRisk =
                balance *
                riskPercent /
                100;
        }
    }


    const balance =
        account
            ? safeNumber(
                account.balance ??
                account.currentBalance ??
                account.startingBalance
            )
            : safeNumber(
                readField(
                    "currentAccountBalance"
                )
            );


    const actualRiskPercent =
        balance > 0
            ? (
                riskAmount /
                balance
            ) * 100
            : 0;


    /*
       Update visible fields where they exist.
    */

    setFieldIfExists(
        "risk",
        riskAmount
    );

    setFieldIfExists(
        "riskAmount",
        riskAmount
    );

    setFieldIfExists(
        "actualRisk",
        riskAmount
    );

    setFieldIfExists(
        "riskPercent",
        actualRiskPercent
    );

    setFieldIfExists(
        "rr",
        plannedRR
    );

    setFieldIfExists(
        "plannedRR",
        plannedRR
    );

    setFieldIfExists(
        "potentialProfit",
        rewardAmount
    );

    setFieldIfExists(
        "potentialLoss",
        riskAmount
    );

    setFieldIfExists(
        "pipValue",
        getPipValuePerLot(symbol)
    );


    /*
       Summary cards.
    */

    setText(
        "summaryAccountRisk",
        `$${round(accountRisk).toFixed(2)}`
    );

    setText(
        "summaryActualRisk",
        `$${round(riskAmount).toFixed(2)}`
    );

    setText(
        "summaryRiskPercent",
        `${round(actualRiskPercent).toFixed(2)}%`
    );

    setText(
        "summaryReward",
        `$${round(rewardAmount).toFixed(2)}`
    );

    setText(
        "summaryLoss",
        `$${round(riskAmount).toFixed(2)}`
    );

    setText(
        "summaryRR",
        round(plannedRR).toFixed(2)
    );


    /*
       Support alternate IDs from older journal HTML.
    */

    setText(
        "accountRiskDisplay",
        `$${round(accountRisk).toFixed(2)}`
    );

    setText(
        "actualRiskDisplay",
        `$${round(riskAmount).toFixed(2)}`
    );

    setText(
        "riskPercentDisplay",
        `${round(actualRiskPercent).toFixed(2)}%`
    );

    setText(
        "rewardDisplay",
        `$${round(rewardAmount).toFixed(2)}`
    );

    setText(
        "lossDisplay",
        `$${round(riskAmount).toFixed(2)}`
    );

    setText(
        "rrDisplay",
        round(plannedRR).toFixed(2)
    );
}


function setFieldIfExists(
    id,
    value
) {

    const el = $(id);

    if (!el) return;

    if (
        el.tagName === "INPUT" &&
        el.type === "number"
    ) {

        el.value =
            value === 0
                ? "0"
                : String(
                    round(value, 6)
                );

    } else {

        el.value =
            value === null ||
            value === undefined
                ? ""
                : value;
    }
}


/* ============================================================
   CONFLUENCES
   ============================================================ */

const CONFLUENCE_MAP = {

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


function readConfluences() {

    const result = {};

    Object.entries(
        CONFLUENCE_MAP
    ).forEach(
        ([key, id]) => {

            result[key] =
                isChecked(id);

        }
    );

    return result;
}


function populateConfluences(
    confluences
) {

    Object.entries(
        CONFLUENCE_MAP
    ).forEach(
        ([key, id]) => {

            setCheckbox(
                id,
                !!(
                    confluences &&
                    confluences[key]
                )
            );
        }
    );
}


/* ============================================================
   BUILD TRADE
   ============================================================ */

function buildTradeFromForm(
    isUpdate
) {

    /*
       Preserve the original trade completely
       when editing.

       This is important because it prevents
       the edit operation from accidentally
       generating a new ID.
    */

    const oldTrade =
        isUpdate &&
        editingTrade
            ? editingTrade
            : null;


    const symbol =
        readField("pair");

    const direction =
        readField("direction");

    const entry =
        readNumber("entry");

    const stopLoss =
        readNumber("stopLoss");

    const takeProfit =
        readNumber("takeProfit");

    const lotSize =
        readNumber("lotSize");


    /*
       ORIGINAL values.

       Once a trade has been created,
       these NEVER change when editing.

       This protects the original risk
       calculation even if SL is later moved.
    */

    const initialEntry =
        oldTrade?.initialEntry ??
        oldTrade?.entry ??
        entry;

    const initialStopLoss =
        oldTrade?.initialStopLoss ??
        oldTrade?.stopLoss ??
        stopLoss;

    const initialTakeProfit =
        oldTrade?.initialTakeProfit ??
        oldTrade?.takeProfit ??
        takeProfit;


    const initialRiskAmount =
        oldTrade?.initialRiskAmount ??
        calculateRiskAmount(
            symbol,
            initialEntry,
            initialStopLoss,
            lotSize
        );


    const plannedReward =
        calculateRewardAmount(
            symbol,
            initialEntry,
            initialTakeProfit,
            lotSize
        );


    const plannedRR =
        initialRiskAmount > 0
            ? plannedReward /
              initialRiskAmount
            : 0;


    /*
       Result handling.
    */

    const result =
        readField("result") ||
        oldTrade?.result ||
        "Pending";


    let status =
        oldTrade?.status ||
        "Pending";


    if (
        result === "Win" ||
        result === "Loss" ||
        result === "Breakeven"
    ) {

        status = "Closed";

    } else {

        status = "Pending";
    }


    /*
       Actual RR.

       Do NOT simply copy the form's rr.

       Actual RR is based on the original
       risk and the actual outcome.
    */

    const actualExit =
        readNumber("exitPrice") ||
        readNumber("actualExit") ||
        safeNumber(
            oldTrade?.actualExit
        );


    let actualRR = 0;

    if (
        status === "Closed"
    ) {

        if (actualExit > 0) {

            actualRR =
                calculateActualRRFromPrices(
                    symbol,
                    direction,
                    initialEntry,
                    initialStopLoss,
                    actualExit
                );

        } else {

            const profit =
                readNumber("profit");

            if (initialRiskAmount > 0) {

                if (result === "Win") {

                    actualRR =
                        Math.abs(
                            profit
                        ) /
                        initialRiskAmount;

                } else if (
                    result === "Loss"
                ) {

                    actualRR =
                        -Math.abs(
                            profit
                        ) /
                        initialRiskAmount;

                } else {

                    actualRR = 0;
                }
            }
        }
    }


    /*
       Force RR sign according to result.
    */

    if (result === "Win") {

        actualRR =
            Math.abs(actualRR);

    } else if (
        result === "Loss"
    ) {

        actualRR =
            -Math.abs(actualRR);

    } else if (
        result === "Breakeven"
    ) {

        actualRR = 0;
    }


    const trade = {

        /*
           Identity
        */

        id:
            oldTrade?.id ||
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 8),

        created:
            oldTrade?.created ||
            new Date().toISOString(),

        closed:
            status === "Closed"
                ? (
                    oldTrade?.closed ||
                    new Date().toISOString()
                )
                : null,


        /*
           Basic trade information
        */

        date:
            readField("tradeDate"),

        time:
            readField("tradeTime"),

        pair:
            symbol,

        direction:
            direction,

        session:
            readField("session"),

        broker:
            readField("broker"),

        account:
            readField("account"),

        lotSize:
            lotSize,


        /*
           Account information
        */

        accountBalance:
            readNumber(
                "currentAccountBalance"
            ) ||
            readNumber(
                "accountBalance"
            ),

        accountRiskSetting:
            readField(
                "accountRiskSetting"
            ),

        currency:
            readField("currency"),

        pipValue:
            getPipValuePerLot(symbol),


        /*
           HTF
        */

        htfSwing:
            readField("htfSwing"),

        htfInternal:
            readField("htfInternal"),


        /*
           MTF
        */

        mtfSwing:
            readField("mtfSwing"),

        mtfInternal:
            readField("mtfInternal"),


        /*
           LTF
        */

        ltfStructure:
            readField("ltfStructure"),

        liquidity:
            readField("liquidity"),

        poi:
            readField("poi"),

        entryModel:
            readField("entryModel"),

        entryConfirmation:
            readField(
                "entryConfirmation"
            ),

        tradeValid:
            readField("tradeValid"),


        /*
           Confluences
        */

        confluences:
            readConfluences(),


        /*
           CURRENT execution values

           These can be edited.
        */

        entry:
            entry,

        stopLoss:
            stopLoss,

        takeProfit:
            takeProfit,


        /*
           ORIGINAL execution values

           These are intentionally preserved.
        */

        initialEntry:
            initialEntry,

        initialStopLoss:
            initialStopLoss,

        initialTakeProfit:
            initialTakeProfit,

        initialRiskAmount:
            initialRiskAmount,


        /*
           Calculated planned values
        */

        risk:
            initialRiskAmount,

        riskAmount:
            initialRiskAmount,

        potentialProfit:
            plannedReward,

        potentialLoss:
            initialRiskAmount,

        plannedRR:
            plannedRR,


        /*
           Exit
        */

        actualExit:
            actualExit ||
            oldTrade?.actualExit ||
            null,

        exitPrice:
            actualExit ||
            oldTrade?.exitPrice ||
            null,


        /*
           Result
        */

        profit:
            readNumber("profit"),

        commission:
            readNumber("commission"),

        result:
            result,

        actualRR:
            actualRR,

        /*
           Keep rr for compatibility
           with old history/analytics.
        */

        rr:
            actualRR,


        /*
           Psychology
        */

        confidence:
            readField("confidence"),

        emotion:
            readField("emotion"),

        discipline:
            readField("discipline"),

        patience:
            readField("patience"),


        /*
           Review
        */

        tradeSummary:
            readField("tradeSummary"),

        strengths:
            readField("strengths"),

        mistakes:
            readField("mistakes"),

        lessonLearned:
            readField("lessonLearned"),

        improvementPlan:
            readField("improvementPlan"),


        /*
           Chart references
        */

        beforeChart:
            readField("beforeChart"),

        duringChart:
            readField("duringChart"),

        afterChart:
            readField("afterChart"),

        notes:
            readField("notes"),


        /*
           Status
        */

        status:
            status
    };


    /*
       Preserve old fields that may exist
       but are not part of the current form.
    */

    if (oldTrade) {

        Object.keys(oldTrade).forEach(
            key => {

                if (
                    trade[key] === undefined
                ) {

                    trade[key] =
                        oldTrade[key];
                }
            }
        );
    }


    return trade;
}


/* ============================================================
   SAVE TRADE
   ============================================================ */

function saveTrade(event) {

    event.preventDefault();

    const form =
        event.currentTarget ||
        $("tradeForm");

    if (!form) return;


    loadTrades();


    const isUpdate =
        !!editingTrade;


    const trade =
        buildTradeFromForm(
            isUpdate
        );


    /*
       UPDATE EXISTING TRADE
    */

    if (isUpdate) {

        const index =
            trades.findIndex(
                t =>
                    String(t.id) ===
                    String(editingTrade.id)
            );


        if (index === -1) {

            alert(
                "❌ The original trade could not be found."
            );

            return;
        }


        trades[index] =
            trade;


        if (!saveTrades()) return;


        alert(
            "✅ Trade updated successfully."
        );


        window.location.href =
            "/history";

        return;
    }


    /*
       NEW TRADE
    */

    trades.unshift(trade);

    if (!saveTrades()) return;


    form.reset();

    editingTrade = null;

    refreshUI();


    alert(
        "✅ Trade saved."
    );
}


/* ============================================================
   POPULATE EDIT FORM
   ============================================================ */

function populateForm(trade) {

    if (!trade) return;


    console.log(
        "✏️ POPULATING TRADE:",
        trade
    );


    /*
       Basic fields
    */

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
        "notes",

        "currentAccountBalance",
        "accountBalance",
        "accountRiskSetting",
        "currency",
        "pipValue",

        "exitPrice",
        "actualExit"
    ];


    fields.forEach(id => {

        if (
            trade[id] !== undefined &&
            trade[id] !== null
        ) {

            setField(
                id,
                trade[id]
            );
        }
    });


    /*
       IMPORTANT:

       If the form does not contain exitPrice,
       we still preserve the old trade's
       actual exit internally.
    */


    populateConfluences(
        trade.confluences
    );


    /*
       Update page heading
    */

    const header =
        document.querySelector(
            ".page-header h1"
        );


    if (header) {

        header.innerHTML =
            '<i class="fa-solid fa-pen"></i> Edit Trade';
    }


    /*
       Update form submit button
    */

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


    /*
       Add/update hidden edit flag.
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

            form.appendChild(flag);
        }


        flag.value =
            "true";
    }


    /*
       Make sure calculations use
       the selected trade's account.
    */

    updateAccountDisplay();

    updateCalculations();


    /*
       Recalculate visible actual RR
       for an already closed trade.
    */

    updateActualRRDisplay(
        trade
    );


    console.log(
        "✅ TRADE FULLY POPULATED"
    );
}


/* ============================================================
   ACTUAL RR DISPLAY
   ============================================================ */

function updateActualRRDisplay(
    trade
) {

    const actualRR =
        calculateActualRR(
            trade
        );


    const formatted =
        actualRR > 0
            ? `+${round(actualRR).toFixed(2)}`
            : round(actualRR).toFixed(2);


    setText(
        "actualRR",
        formatted
    );

    setText(
        "actualRRDisplay",
        formatted
    );

    setText(
        "tradeActualRR",
        formatted
    );

    setFieldIfExists(
        "actualRR",
        actualRR
    );
}


/* ============================================================
   EDIT MODE
   ============================================================ */

function initializeEditMode() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const editId =
        params.get("edit");


    if (!editId) {

        editingTrade = null;

        return;
    }


    console.log(
        "🔎 EDIT MODE ID:",
        editId
    );


    loadTrades();


    /*
       Exact ID match.
    */

    editingTrade =
        trades.find(
            trade =>
                String(trade.id) ===
                String(editId)
        );


    if (!editingTrade) {

        console.error(
            "❌ EDIT TRADE NOT FOUND:",
            editId
        );

        alert(
            "❌ Trade could not be found."
        );

        return;
    }


    console.log(
        "✅ EDIT TRADE FOUND:",
        editingTrade
    );


    /*
       Populate AFTER the DOM exists.
    */

    populateForm(
        editingTrade
    );
}


/* ============================================================
   RESULT / CLOSE TRADE
   ============================================================ */

function closeTrade(id) {

    loadTrades();


    const trade =
        trades.find(
            t =>
                String(t.id) ===
                String(id)
        );


    if (!trade) return;


    /*
       IMPORTANT:

       Do not destroy the original
       entry/SL when closing.

       The original values are preserved.
    */


    const outcome =
        prompt(
            "Result?\n\nWin\nLoss\nBreakeven"
        );


    if (!outcome) return;


    const normalizedOutcome =
        outcome.trim()
            .toLowerCase();


    let result;


    if (
        normalizedOutcome === "win"
    ) {

        result = "Win";

    } else if (
        normalizedOutcome === "loss"
    ) {

        result = "Loss";

    } else if (
        normalizedOutcome === "breakeven" ||
        normalizedOutcome === "be"
    ) {

        result = "Breakeven";

    } else {

        alert(
            "Use Win, Loss or Breakeven."
        );

        return;
    }


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


    /*
       Ask for actual exit price
       when possible.

       This is what allows accurate
       realized RR even after SL
       has been moved.
    */

    const exitInput =
        prompt(
            "Actual Exit Price\n\nLeave blank if you want RR calculated from P/L.",
            trade.actualExit ??
            ""
        );


    const actualExit =
        exitInput !== null &&
        exitInput.trim() !== ""
            ? parseFloat(exitInput)
            : 0;


    trade.status =
        "Closed";

    trade.closed =
        new Date().toISOString();

    trade.result =
        result;

    trade.profit =
        profit;

    trade.commission =
        commission;


    if (actualExit > 0) {

        trade.actualExit =
            actualExit;

        trade.exitPrice =
            actualExit;
    }


    trade.actualRR =
        calculateActualRR(
            trade
        );


    trade.rr =
        trade.actualRR;


    saveTrades();

    refreshUI();


    alert(
        `✅ Trade closed.\n\nActual RR: ${
            trade.actualRR > 0
                ? "+"
                : ""
        }${round(
            trade.actualRR
        ).toFixed(2)}R`
    );
}


/* ============================================================
   DASHBOARD
   ============================================================ */

function loadDashboard() {

    loadTrades();


    const closed =
        trades.filter(
            t =>
                t.status === "Closed"
        );


    const wins =
        closed.filter(
            t =>
                t.result === "Win"
        );


    const losses =
        closed.filter(
            t =>
                t.result === "Loss"
        );


    const pending =
        trades.filter(
            t =>
                t.status !== "Closed"
        );


    const totalTrades =
        closed.length;


    const totalWins =
        wins.length;


    const totalLosses =
        losses.length;


    const winRate =
        totalTrades > 0
            ? (
                totalWins /
                totalTrades
            ) * 100
            : 0;


    const netProfit =
        closed.reduce(
            (sum, trade) =>
                sum +
                safeNumber(
                    trade.profit
                ) -
                safeNumber(
                    trade.commission
                ),
            0
        );


    /*
       Average actual RR.

       Pending trades are excluded.

       Actual RR is signed:
       wins positive,
       losses negative,
       BE zero.
    */

    const actualRRValues =
        closed.map(
            trade =>
                calculateActualRR(
                    trade
                )
        );


    const averageRR =
        actualRRValues.length > 0
            ? actualRRValues.reduce(
                (a, b) =>
                    a + b,
                0
            ) /
            actualRRValues.length
            : 0;


    const winningRR =
        wins.length > 0
            ? wins.reduce(
                (sum, trade) =>
                    sum +
                    Math.abs(
                        calculateActualRR(
                            trade
                        )
                    ),
                0
            ) /
            wins.length
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
        averageRR.toFixed(2)
    );

    setText(
        "avgRR",
        averageRR.toFixed(2)
    );

    setText(
        "winningRR",
        winningRR.toFixed(2)
    );

    setText(
        "netProfit",
        `${netProfit >= 0 ? "+" : ""}$${netProfit.toFixed(2)}`
    );

    setText(
        "pendingTrades",
        pending.length
    );


    calculatePerformance(
        closed
    );
}


/* ============================================================
   PERFORMANCE
   ============================================================ */

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


    let currentStreak = 0;
    let bestStreak = 0;


    closed
        .slice()
        .sort(
            (a, b) =>
                new Date(
                    a.closed ||
                    a.created
                ) -
                new Date(
                    b.closed ||
                    b.created
                )
        )
        .forEach(
            trade => {

                const pair =
                    trade.pair ||
                    "?";


                const session =
                    trade.session ||
                    "?";


                const pnl =
                    safeNumber(
                        trade.profit
                    ) -
                    safeNumber(
                        trade.commission
                    );


                pairStats[pair] =
                    (
                        pairStats[pair] ||
                        0
                    ) + pnl;


                sessionStats[session] =
                    (
                        sessionStats[session] ||
                        0
                    ) + pnl;


                if (
                    trade.result ===
                    "Win"
                ) {

                    currentStreak++;

                    if (
                        currentStreak >
                        bestStreak
                    ) {

                        bestStreak =
                            currentStreak;
                    }

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


/* ============================================================
   RECENT TRADES
   ============================================================ */

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
        .forEach(
            trade => {

                const status =
                    trade.status ||
                    "Pending";


                const actualRR =
                    status === "Closed"
                        ? calculateActualRR(
                            trade
                        )
                        : 0;


                const rrText =
                    status === "Closed"
                        ? (
                            actualRR > 0
                                ? "+"
                                : ""
                        ) +
                        round(
                            actualRR
                        ).toFixed(2) +
                        "R"
                        : "-";


                container.innerHTML += `

                    <div class="trade-row">

                        <div>
                            <strong>
                                ${escapeHTML(
                                    trade.pair ||
                                    "?"
                                )}
                            </strong>

                            <br>

                            ${escapeHTML(
                                trade.direction ||
                                ""
                            )}
                        </div>

                        <div>
                            ${escapeHTML(
                                trade.entryModel ||
                                "-"
                            )}
                        </div>

                        <div>
                            <span class="
                                status
                                ${status.toLowerCase()}
                            ">
                                ${escapeHTML(
                                    status
                                )}
                            </span>
                        </div>

                        <div>
                            <strong>
                                ${rrText}
                            </strong>
                        </div>

                        <div>

                            <button
                                type="button"
                                class="btn"
                                onclick="editTrade('${escapeJS(
                                    trade.id
                                )}')"
                            >
                                Edit
                            </button>

                            ${
                                status !==
                                "Closed"
                                    ? `
                                    <button
                                        type="button"
                                        class="btn"
                                        onclick="closeTrade('${escapeJS(
                                            trade.id
                                        )}')"
                                    >
                                        Close
                                    </button>
                                    `
                                    : ""
                            }

                        </div>

                    </div>
                `;
            }
        );
}


/* ============================================================
   EDIT TRADE GLOBAL FUNCTION
   ============================================================ */

function editTrade(id) {

    const cleanId =
        String(id);


    /*
       IMPORTANT:

       Do NOT construct a new trade.

       Just open the journal with the
       existing trade ID.
    */

    window.location.href =
        `/journal?edit=${encodeURIComponent(
            cleanId
        )}`;
}


/* ============================================================
   CHARTS
   ============================================================ */

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
}


function buildEquityChart() {

    const canvas =
        $("equityChart");


    if (!canvas) return;


    const closed =
        trades
            .filter(
                t =>
                    t.status ===
                    "Closed"
            )
            .slice()
            .sort(
                (a, b) =>
                    new Date(
                        a.closed ||
                        a.created
                    ) -
                    new Date(
                        b.closed ||
                        b.created
                    )
            );


    let balance = 0;

    const data = [];


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
                round(balance)
            );
        }
    );


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

                    datasets: [
                        {
                            label:
                                "Equity",

                            data:
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


    const monthly = {};


    trades
        .filter(
            t =>
                t.status ===
                "Closed"
        )
        .forEach(
            trade => {

                const date =
                    new Date(
                        trade.closed ||
                        trade.created
                    );


                const key =
                    `${date.getFullYear()}-${String(
                        date.getMonth() + 1
                    ).padStart(2, "0")}`;


                monthly[key] =
                    (
                        monthly[key] ||
                        0
                    ) +
                    safeNumber(
                        trade.profit
                    ) -
                    safeNumber(
                        trade.commission
                    );
            }
        );


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

                    datasets: [
                        {
                            label:
                                "Monthly P&L",

                            data:
                                Object.values(
                                    monthly
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


/* ============================================================
   REFRESH
   ============================================================ */

function refreshUI() {

    loadTrades();

    loadDashboard();

    loadRecentTrades();

    initializeCharts();
}


/* ============================================================
   HTML ESCAPING
   ============================================================ */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeJS(value) {

    return String(
        value ?? ""
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        );
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function attachCalculationListeners() {

    const calculationFields = [

        "pair",
        "direction",
        "entry",
        "stopLoss",
        "takeProfit",
        "lotSize",
        "account",
        "pipValue",
        "currentAccountBalance",
        "accountBalance"
    ];


    calculationFields.forEach(
        id => {

            const el =
                $(id);


            if (!el) return;


            el.addEventListener(
                "input",
                updateCalculations
            );


            el.addEventListener(
                "change",
                () => {

                    if (
                        id ===
                        "account"
                    ) {

                        updateAccountDisplay();

                    } else {

                        updateCalculations();
                    }
                }
            );
        }
    );


    /*
       Radio groups.
    */

    [
        "direction"
    ].forEach(
        name => {

            document
                .querySelectorAll(
                    `input[name="${name}"]`
                )
                .forEach(
                    radio => {

                        radio.addEventListener(
                            "change",
                            updateCalculations
                        );
                    }
                );
        }
    );
}


/* ============================================================
   FORM INITIALIZATION
   ============================================================ */

function initializeForm() {

    const form =
        $("tradeForm");


    if (!form) {

        console.log(
            "ℹ️ No trade form on this page."
        );

        return;
    }


    /*
       Remove any old listeners by cloning
       is NOT done because other project
       scripts may rely on the form.

       We use a single namespace flag.
    */

    if (
        form.dataset.journalInitialized ===
        "true"
    ) {
        return;
    }


    form.dataset.journalInitialized =
        "true";


    form.addEventListener(
        "submit",
        saveTrade
    );


    attachCalculationListeners();


    /*
       Account selection.
    */

    const account =
        $("account");


    if (account) {

        account.addEventListener(
            "change",
            updateAccountDisplay
        );
    }


    /*
       Edit mode MUST happen after
       the form has been created.
    */

    initializeEditMode();


    /*
       If this is not edit mode,
       make sure heading is New Trade.
    */

    const params =
        new URLSearchParams(
            window.location.search
        );


    if (
        !params.get("edit")
    ) {

        const header =
            document.querySelector(
                ".page-header h1"
            );


        if (header) {

            header.innerHTML =
                '<i class="fa-solid fa-chart-line"></i> Trading Journal';
        }
    }


    updateAccountDisplay();

    updateCalculations();


    console.log(
        "✅ Journal form initialized"
    );
}


/* ============================================================
   STORAGE LISTENER
   ============================================================ */

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


/* ============================================================
   GLOBAL FUNCTIONS
   ============================================================ */

window.closeTrade =
    closeTrade;

window.editTrade =
    editTrade;

window.viewTrade =
    function(trade) {

        if (!trade) return;


        const actualRR =
            calculateActualRR(
                trade
            );


        alert(`
PAIR        : ${trade.pair || "-"}
STATUS      : ${trade.status || "-"}
RESULT      : ${trade.result || "-"}
ENTRY       : ${trade.entry || "-"}
INITIAL SL  : ${
    trade.initialStopLoss ??
    trade.stopLoss ??
    "-"
}
INITIAL TP  : ${
    trade.initialTakeProfit ??
    trade.takeProfit ??
    "-"
}
ACTUAL EXIT : ${
    trade.actualExit ??
    "-"
}
PLANNED RR  : ${
    round(
        trade.plannedRR ||
        0
    ).toFixed(2)
}R
ACTUAL RR   : ${
    actualRR > 0
        ? "+"
        : ""
}${round(
    actualRR
).toFixed(2)}R
PROFIT      : $${safeNumber(
    trade.profit
).toFixed(2)}
        `);
};


/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            await checkJournalAccess();

            loadTrades();

            initializeForm();

            refreshUI();


            console.log(
                "🚀 GTRADES AXIS™ JOURNAL READY"
            );


        } catch (error) {

            console.error(
                "Journal initialization failed:",
                error
            );
        }
    }
);


/* ============================================================
   INITIAL LOAD
   ============================================================ */

loadTrades();

console.log(
    "✅ Complete journal.js loaded"
);