/* ============================================================
   GTRADES AXIS™
   PREMIUM TRADING JOURNAL
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
   STORAGE
   ============================================================ */

const STORAGE_KEY = "gtradesaxis_trades";
const ACCOUNTS_KEY = "gtradesaxis_accounts";


/* ============================================================
   STATE
   ============================================================ */

let trades = [];
let accounts = {};

let editingTrade = null;
let selectedAccountId = "all";

let equityChartInstance = null;
let monthlyChartInstance = null;

let currentUser = null;


/* ============================================================
   STORAGE COMPATIBILITY
   ============================================================ */

function loadTrades() {

    const possibleKeys = [
        STORAGE_KEY,
        "trades",
        "gtrades_trades",
        "gtradesaxisTrades",
        "journalTrades"
    ];

    let found = null;

    for (const key of possibleKeys) {

        try {

            const raw = localStorage.getItem(key);

            if (!raw) continue;

            const parsed = JSON.parse(raw);

            if (Array.isArray(parsed)) {

                if (
                    parsed.length === 0 ||
                    parsed.some(
                        item =>
                            item &&
                            (
                                item.id ||
                                item.pair ||
                                item.entry !== undefined
                            )
                    )
                ) {

                    found = parsed;
                    break;

                }

            }

        } catch (error) {

            console.warn(
                "Could not read trade storage:",
                key,
                error
            );

        }

    }

    trades = found || [];

    /*
     * Normalize old trades so the new engine
     * can safely work with them.
     */

    trades = trades.map(
        normalizeTrade
    );

}


function saveTrades() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(trades)
    );

}


function loadAccounts() {

    const possibleKeys = [
        ACCOUNTS_KEY,
        "accounts",
        "gtrades_accounts",
        "gtradesaxis_accounts",
        "journalAccounts"
    ];

    let found = null;

    for (const key of possibleKeys) {

        try {

            const raw =
                localStorage.getItem(key);

            if (!raw) continue;

            const parsed =
                JSON.parse(raw);

            if (
                parsed &&
                typeof parsed === "object"
            ) {

                found = parsed;
                break;

            }

        } catch (error) {

            console.warn(
                "Could not read account storage:",
                key,
                error
            );

        }

    }

    accounts = normalizeAccounts(
        found || {}
    );

}


function saveAccounts() {

    localStorage.setItem(
        ACCOUNTS_KEY,
        JSON.stringify(accounts)
    );

}


/* ============================================================
   ACCOUNT NORMALIZATION
   ============================================================ */

function normalizeAccounts(source) {

    const output = {};

    if (Array.isArray(source)) {

        source.forEach(
            account => {

                if (!account) return;

                const id =
                    account.id ||
                    slugify(
                        account.name ||
                        "account"
                    );

                output[id] = {
                    ...account,
                    id,
                    name:
                        account.name ||
                        "Trading Account",

                    startingBalance:
                        number(
                            account.startingBalance ??
                            account.balance ??
                            0
                        ),

                    balance:
                        number(
                            account.balance ??
                            account.startingBalance ??
                            0
                        ),

                    risk:
                        number(
                            account.risk ??
                            account.riskPercent ??
                            0.5
                        ),

                    riskPercent:
                        number(
                            account.riskPercent ??
                            account.risk ??
                            0.5
                        ),

                    riskType:
                        account.riskType ||
                        "percent",

                    currency:
                        account.currency ||
                        "USD"
                };

            }
        );

        return output;

    }


    Object.keys(source).forEach(
        key => {

            const account =
                source[key];

            if (!account) return;

            output[key] = {

                ...account,

                id:
                    account.id ||
                    key,

                name:
                    account.name ||
                    key,

                startingBalance:
                    number(
                        account.startingBalance ??
                        account.balance ??
                        0
                    ),

                balance:
                    number(
                        account.balance ??
                        account.startingBalance ??
                        0
                    ),

                risk:
                    number(
                        account.risk ??
                        account.riskPercent ??
                        0.5
                    ),

                riskPercent:
                    number(
                        account.riskPercent ??
                        account.risk ??
                        0.5
                    ),

                riskType:
                    account.riskType ||
                    "percent",

                currency:
                    account.currency ||
                    "USD"

            };

        }
    );

    return output;

}


/* ============================================================
   GENERIC HELPERS
   ============================================================ */

function $(id) {

    return document.getElementById(id);

}


function val(id) {

    const element =
        $(id);

    return element
        ? element.value
        : "";

}


function num(id) {

    const value =
        parseFloat(
            val(id)
        );

    return Number.isFinite(value)
        ? value
        : 0;

}


function number(value) {

    const parsed =
        parseFloat(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;

}


function isChecked(id) {

    const element =
        $(id);

    return element
        ? !!element.checked
        : false;

}


function setValue(
    id,
    value
) {

    const element =
        $(id);

    if (!element) return;

    if (
        value === undefined ||
        value === null
    ) {

        return;

    }

    const stringValue =
        String(value);

    /*
     * SELECT elements:
     * make sure the old saved option
     * can still be restored.
     */

    if (
        element.tagName ===
        "SELECT"
    ) {

        const exists =
            Array.from(
                element.options
            ).some(
                option =>
                    option.value ===
                    stringValue
            );

        if (
            !exists &&
            stringValue !== ""
        ) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                stringValue;

            option.textContent =
                stringValue;

            element.appendChild(
                option
            );

        }

    }

    element.value =
        stringValue;

}


function setText(
    id,
    text
) {

    const element =
        $(id);

    if (element) {

        element.textContent =
            text;

    }

}


function money(value) {

    const amount =
        number(value);

    return (
        "$" +
        amount.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )
    );

}


function signedMoney(value) {

    const amount =
        number(value);

    return (
        amount >= 0
            ? "+$"
            : "-$"
    ) +
        Math.abs(amount).toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

}


function slugify(text) {

    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        );

}


/* ============================================================
   TRADE NORMALIZATION
   ============================================================ */

function normalizeTrade(trade) {

    if (!trade) return null;

    const normalized = {
        ...trade
    };

    normalized.id =
        trade.id ||
        (
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 8)
        );

    normalized.status =
        trade.status ||
        (
            trade.result &&
            trade.result !== "Pending"
                ? "Closed"
                : "Pending"
        );

    normalized.result =
        trade.result ||
        "Pending";

    /*
     * Support old account field.
     */

    normalized.accountId =
        trade.accountId ||
        trade.account ||
        "";

    normalized.account =
        trade.account ||
        normalized.accountId ||
        "";

    normalized.lotSize =
        number(
            trade.lotSize
        );

    normalized.entry =
        number(
            trade.entry
        );

    normalized.stopLoss =
        number(
            trade.stopLoss
        );

    normalized.takeProfit =
        number(
            trade.takeProfit
        );

    normalized.riskAmount =
        number(
            trade.riskAmount ??
            trade.actualRisk
        );

    normalized.potentialProfit =
        number(
            trade.potentialProfit
        );

    normalized.potentialLoss =
        number(
            trade.potentialLoss
        );

    /*
     * IMPORTANT:
     *
     * plannedRR is the original RR.
     * It must never be overwritten when SL
     * is later moved to BE.
     */

    normalized.plannedRR =
        number(
            trade.plannedRR ??
            trade.initialRR ??
            trade.rrPlanned
        );

    normalized.initialEntry =
        number(
            trade.initialEntry ??
            trade.entry
        );

    normalized.initialStopLoss =
        number(
            trade.initialStopLoss ??
            trade.stopLoss
        );

    normalized.initialTakeProfit =
        number(
            trade.initialTakeProfit ??
            trade.takeProfit
        );

    /*
     * Actual / realized RR.
     */

    normalized.realizedRR =
        number(
            trade.realizedRR
        );

    /*
     * Old data may only have rr.
     * Preserve it as planned RR where appropriate.
     */

    if (
        !normalized.plannedRR &&
        number(trade.rr)
    ) {

        normalized.plannedRR =
            number(trade.rr);

    }

    /*
     * Keep legacy rr field equal to planned RR.
     */

    normalized.rr =
        normalized.plannedRR;

    normalized.profit =
        number(
            trade.profit
        );

    normalized.commission =
        number(
            trade.commission
        );

    normalized.created =
        trade.created ||
        new Date().toISOString();

    normalized.closed =
        trade.closed ||
        null;

    return normalized;

}


/* ============================================================
   INSTRUMENT ENGINE
   ============================================================

   FX:
   Contract size = 100,000 units.

   XAUUSD:
   Standard contract = 100 oz.
   Therefore:

       $1.00 movement
       × 100 oz
       × 1 lot
       = $100

   Example:

       XAUUSD
       Entry  = 3400
       SL     = 3395

       Distance = $5

       5 × 100 × 1 lot
       = $500 risk

   This is NOT the same as treating Gold
   like EURUSD pips.
   ============================================================ */

function instrumentInfo(symbol) {

    const pair =
        String(symbol || "")
            .toUpperCase()
            .replace(
                /[\s/_-]/g,
                ""
            );

    /*
     * GOLD
     */

    if (
        pair === "XAUUSD" ||
        pair === "GOLD" ||
        pair === "XAU"
    ) {

        return {

            type: "metal",

            contractSize: 100,

            pointSize: 0.01,

            pipSize: 0.01,

            directUSD: true,

            pipValuePerLot: 1

        };

    }


    /*
     * SILVER
     */

    if (
        pair === "XAGUSD" ||
        pair === "SILVER" ||
        pair === "XAG"
    ) {

        return {

            type: "metal",

            contractSize: 5000,

            pointSize: 0.001,

            pipSize: 0.001,

            directUSD: true,

            pipValuePerLot: 5

        };

    }


    /*
     * CRYPTO
     */

    if (
        pair.includes("BTCUSD") ||
        pair.includes("ETHUSD")
    ) {

        return {

            type: "crypto",

            contractSize: 1,

            pointSize: 0.01,

            pipSize: 0.01,

            directUSD: true,

            pipValuePerLot: 1

        };

    }


    /*
     * FOREX
     */

    return {

        type: "forex",

        contractSize: 100000,

        pointSize:
            pair.endsWith("JPY")
                ? 0.001
                : 0.00001,

        pipSize:
            pair.endsWith("JPY")
                ? 0.01
                : 0.0001,

        directUSD:
            pair.endsWith("USD"),

        pipValuePerLot:
            pair.endsWith("JPY")
                ? 1000
                : 10

    };

}


/* ============================================================
   DISTANCE
   ============================================================ */

function priceDistance(
    entry,
    exit
) {

    return Math.abs(
        number(entry) -
        number(exit)
    );

}


/* ============================================================
   CALCULATE RAW USD VALUE
   ============================================================ */

function calculateUSDValue(
    pair,
    entry,
    exit,
    lots
) {

    const info =
        instrumentInfo(pair);

    const distance =
        priceDistance(
            entry,
            exit
        );

    const volume =
        number(lots);

    if (
        distance <= 0 ||
        volume <= 0
    ) {

        return 0;

    }


    /*
     * XAUUSD / XAGUSD / direct USD
     */

    if (
        info.type === "metal" ||
        info.directUSD
    ) {

        return (
            distance *
            info.contractSize *
            volume
        );

    }


    /*
     * For USD-quoted FX this branch
     * would already have returned above.
     *
     * JPY crosses need conversion from JPY
     * into USD.
     *
     * We use the trade's stored pip value
     * when available.
     */

    return (
        distance /
        info.pipSize
    ) *
    info.pipValuePerLot *
    volume;

}


/* ============================================================
   CALCULATE RISK
   ============================================================ */

function calculateRisk(
    trade
) {

    return calculateUSDValue(
        trade.pair,
        trade.entry,
        trade.stopLoss,
        trade.lotSize
    );

}


/* ============================================================
   CALCULATE REWARD
   ============================================================ */

function calculateReward(
    trade
) {

    return calculateUSDValue(
        trade.pair,
        trade.entry,
        trade.takeProfit,
        trade.lotSize
    );

}


/* ============================================================
   CALCULATE PLANNED RR
   ============================================================ */

function calculatePlannedRR(
    trade
) {

    const risk =
        calculateRisk(
            trade
        );

    const reward =
        calculateReward(
            trade
        );

    if (
        risk <= 0 ||
        reward <= 0
    ) {

        return 0;

    }

    return (
        reward /
        risk
    );

}


/* ============================================================
   CALCULATE REALIZED RR
   ============================================================

   IMPORTANT:

   Winning trade:
       positive RR

   Losing trade:
       negative RR

   Breakeven:
       0

   Commission is NOT included in
   the raw R multiple.

   R multiple is based on actual
   trade P/L divided by original
   risk amount.
   ============================================================ */

function calculateRealizedRR(
    trade
) {

    const risk =
        number(
            trade.riskAmount
        );

    if (
        risk <= 0
    ) {

        return 0;

    }

    const profit =
        number(
            trade.profit
        );

    if (
        trade.result === "Win"
    ) {

        return (
            Math.abs(profit) /
            risk
        );

    }

    if (
        trade.result === "Loss"
    ) {

        return -(
            Math.abs(profit) /
            risk
        );

    }

    return 0;

}


/* ============================================================
   ACCOUNT HELPERS
   ============================================================ */

function getAccount(
    accountId
) {

    if (!accountId) {

        return null;

    }

    return (
        accounts[accountId] ||
        null
    );

}


function getSelectedAccount() {

    if (
        selectedAccountId ===
        "all"
    ) {

        return null;

    }

    return getAccount(
        selectedAccountId
    );

}


/* ============================================================
   ACCOUNT SELECTORS
   ============================================================ */

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

            /*
             * Preserve All Accounts
             * in the filter.
             */

            const isFilter =
                select.id ===
                "accountFilter";

            select.innerHTML =
                isFilter
                    ? `<option value="all">All Accounts</option>`
                    : `<option value="">Select an account</option>`;

            Object.values(accounts)
                .forEach(
                    account => {

                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            account.id;

                        option.textContent =
                            account.name;

                        select.appendChild(
                            option
                        );

                    }
                );

            if (
                current &&
                (
                    current === "all" ||
                    accounts[current]
                )
            ) {

                select.value =
                    current;

            }

        }
    );

}


/* ============================================================
   ACCOUNT INFO
   ============================================================ */

function updateTradeAccountInfo() {

    const accountSelect =
        $("tradeAccount");

    if (!accountSelect) return;

    const account =
        getAccount(
            accountSelect.value
        );

    if (!account) {

        setText(
            "currentAccountBalance",
            money(0)
        );

        setText(
            "accountRiskSetting",
            "—"
        );

        setText(
            "currency",
            "USD"
        );

        setText(
            "pipValue",
            "—"
        );

        return;

    }


    setText(
        "currentAccountBalance",
        money(
            account.balance
        )
    );


    const risk =
        number(
            account.riskPercent ??
            account.risk
        );


    setText(
        "accountRiskSetting",
        risk +
        "%"
    );


    setText(
        "currency",
        account.currency ||
        "USD"
    );


    const pair =
        val("pair");

    const info =
        instrumentInfo(
            pair
        );


    if (
        pair
    ) {

        if (
            info.type ===
            "metal"
        ) {

            setText(
                "pipValue",
                money(
                    info.pipValuePerLot
                ) +
                " / point / lot"
            );

        } else {

            setText(
                "pipValue",
                money(
                    info.pipValuePerLot
                ) +
                " / pip / lot"
            );

        }

    }

}


/* ============================================================
   ACCOUNT RISK SETTING
   ============================================================ */

function calculateAccountRisk() {

    const account =
        getAccount(
            val("tradeAccount")
        );

    if (!account) {

        return 0;

    }


    const balance =
        number(
            account.balance ??
            account.startingBalance
        );


    const riskPercent =
        number(
            account.riskPercent ??
            account.risk
        );


    if (
        account.riskType ===
        "fixed"
    ) {

        return riskPercent;

    }


    return (
        balance *
        riskPercent /
        100
    );

}


/* ============================================================
   FORM TRADE PREVIEW
   ============================================================ */

function getFormTrade() {

    return {

        pair:
            val("pair"),

        entry:
            num("entry"),

        stopLoss:
            num("stopLoss"),

        takeProfit:
            num("takeProfit"),

        lotSize:
            num("lotSize"),

        result:
            val("result") ||
            "Pending"

    };

}


/* ============================================================
   CALCULATE ALL
   ============================================================ */

function calculateAll() {

    const trade =
        getFormTrade();


    updateTradeAccountInfo();


    const accountRisk =
        calculateAccountRisk();


    const actualRisk =
        calculateRisk(
            trade
        );


    const potentialReward =
        calculateReward(
            trade
        );


    const plannedRR =
        calculatePlannedRR(
            trade
        );


    const balance =
        getAccount(
            val("tradeAccount")
        );


    const accountBalance =
        balance
            ? number(
                balance.balance ??
                balance.startingBalance
            )
            : 0;


    const riskPercent =
        accountBalance > 0
            ? (
                actualRisk /
                accountBalance
            ) * 100
            : 0;


    /*
     * FORM VALUES
     */

    setValue(
        "balance",
        accountBalance
            ? accountBalance.toFixed(2)
            : ""
    );


    setValue(
        "riskAmount",
        actualRisk
            ? actualRisk.toFixed(2)
            : ""
    );


    setValue(
        "potentialProfit",
        potentialReward
            ? potentialReward.toFixed(2)
            : ""
    );


    setValue(
        "potentialLoss",
        actualRisk
            ? actualRisk.toFixed(2)
            : ""
    );


    /*
     * Risk setting amount.
     */

    setValue(
        "riskSettingAmount",
        accountRisk
            ? accountRisk.toFixed(2)
            : ""
    );


    /*
     * DO NOT overwrite planned RR
     * while editing a saved trade.
     *
     * For a new trade calculate it live.
     */

    if (!editingTrade) {

        setValue(
            "rr",
            plannedRR
                ? plannedRR.toFixed(2)
                : ""
        );

    }


    /*
     * AUTOMATIC SUMMARY
     */

    setText(
        "summaryAccountRisk",
        money(
            accountRisk
        )
    );

    setText(
        "summaryActualRisk",
        money(
            actualRisk
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
            potentialReward
        )
    );

    setText(
        "summaryLoss",
        money(
            actualRisk
        )
    );

    setText(
        "summaryRR",
        plannedRR.toFixed(2)
    );

}


/* ============================================================
   BUILD TRADE
   ============================================================ */

function buildTradeFromForm() {

    const existing =
        editingTrade;


    const pair =
        val("pair");


    const entry =
        num("entry");


    const stopLoss =
        num("stopLoss");


    const takeProfit =
        num("takeProfit");


    const lotSize =
        num("lotSize");


    /*
     * NEW TRADE:
     * establish original entry/SL/TP.
     *
     * EDIT:
     * preserve original values unless
     * the trade has not previously had them.
     */

    const initialEntry =
        existing &&
        number(existing.initialEntry)
            ? number(existing.initialEntry)
            : entry;


    const initialSL =
        existing &&
        number(existing.initialStopLoss)
            ? number(existing.initialStopLoss)
            : stopLoss;


    const initialTP =
        existing &&
        number(existing.initialTakeProfit)
            ? number(existing.initialTakeProfit)
            : takeProfit;


    const temporaryTrade = {

        pair,

        entry:
            initialEntry,

        stopLoss:
            initialSL,

        takeProfit:
            initialTP,

        lotSize

    };


    const initialRisk =
        calculateRisk(
            temporaryTrade
        );


    const initialReward =
        calculateReward(
            temporaryTrade
        );


    let plannedRR =
        existing
            ? number(
                existing.plannedRR
            )
            : 0;


    /*
     * Only establish planned RR once.
     */

    if (
        !plannedRR &&
        initialRisk > 0 &&
        initialReward > 0
    ) {

        plannedRR =
            initialReward /
            initialRisk;

    }


    const trade = {

        /*
         * ID
         */

        id:
            existing
                ? existing.id
                : (
                    Date.now() +
                    "_" +
                    Math.random()
                        .toString(36)
                        .slice(2, 8)
                ),


        /*
         * Basic information
         */

        date:
            val("tradeDate"),

        time:
            val("tradeTime"),

        pair,

        direction:
            val("direction"),

        session:
            val("session"),

        broker:
            val("broker"),


        /*
         * Account
         */

        accountId:
            val("tradeAccount"),

        account:
            val("tradeAccount"),


        /*
         * Position
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
            val("entryModel"),

        entryConfirmation:
            val("entryConfirmation"),

        tradeValid:
            val("tradeValid"),


        /*
         * Confluences
         */

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


        /*
         * Current execution values.
         */

        entry,

        stopLoss,

        takeProfit,

        lotSize,


        /*
         * Original planned values.
         *
         * These are NEVER replaced by a
         * later BE move.
         */

        initialEntry,

        initialStopLoss:
            initialSL,

        initialTakeProfit:
            initialTP,


        /*
         * Risk
         */

        risk:
            number(
                val("risk")
            ),

        riskAmount:
            initialRisk,

        potentialProfit:
            initialReward,

        potentialLoss:
            initialRisk,


        /*
         * Planned RR.
         */

        plannedRR,

        rr:
            plannedRR,


        /*
         * Result
         */

        profit:
            num("profit"),

        commission:
            num("commission"),

        result:
            val("result") ||
            (
                existing
                    ? existing.result
                    : "Pending"
            ),


        /*
         * Realized RR.
         */

        realizedRR:
            existing
                ? number(
                    existing.realizedRR
                )
                : 0,


        /*
         * Psychology
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
         * Review
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
         * Charts
         */

        beforeChart:
            val("beforeChart"),

        duringChart:
            val("duringChart"),

        afterChart:
            val("afterChart"),


        notes:
            val("notes"),


        /*
         * Status
         */

        status:
            existing
                ? existing.status
                : "Pending",


        created:
            existing
                ? existing.created
                : new Date().toISOString(),


        closed:
            existing
                ? existing.closed
                : null

    };


    /*
     * If the result is closed,
     * calculate realized RR.
     */

    if (
        trade.status ===
        "Closed"
    ) {

        trade.realizedRR =
            calculateRealizedRR(
                trade
            );

    }


    return trade;

}


/* ============================================================
   SAVE TRADE
   ============================================================ */

async function saveTrade(
    event
) {

    event.preventDefault();


    loadTrades();


    const isEditing =
        !!editingTrade;


    const trade =
        buildTradeFromForm();


    if (isEditing) {

        const index =
            trades.findIndex(
                item =>
                    item.id ===
                    editingTrade.id
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
         * IMPORTANT:
         *
         * Do NOT replace the trade blindly.
         *
         * This preserves values such as
         * created/closed/original RR.
         */

        const oldTrade =
            trades[index];


        trade.id =
            oldTrade.id;

        trade.created =
            oldTrade.created;

        trade.closed =
            oldTrade.closed;


        /*
         * Preserve original risk values.
         */

        trade.initialEntry =
            number(
                oldTrade.initialEntry
            ) ||
            trade.initialEntry;

        trade.initialStopLoss =
            number(
                oldTrade.initialStopLoss
            ) ||
            trade.initialStopLoss;

        trade.initialTakeProfit =
            number(
                oldTrade.initialTakeProfit
            ) ||
            trade.initialTakeProfit;


        trade.riskAmount =
            number(
                oldTrade.riskAmount
            ) ||
            trade.riskAmount;


        trade.plannedRR =
            number(
                oldTrade.plannedRR
            ) ||
            trade.plannedRR;


        trade.rr =
            trade.plannedRR;


        /*
         * If closed, update closed timestamp
         * only when it was previously pending.
         */

        if (
            trade.status ===
            "Closed"
        ) {

            if (
                !oldTrade.closed
            ) {

                trade.closed =
                    new Date()
                        .toISOString();

            }


            trade.realizedRR =
                calculateRealizedRR(
                    trade
                );

        }


        trades[index] =
            trade;


        saveTrades();


        editingTrade =
            null;


        alert(
            "✅ Trade updated successfully."
        );


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


    const form =
        $("tradeForm");


    if (form) {

        form.reset();

    }


    editingTrade =
        null;


    setDefaultDate();


    refreshUI();


    alert(
        "✅ Trade saved."
    );

}


/* ============================================================
   EDIT MODE
   ============================================================ */

function startEditMode() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const editId =
        params.get("edit");


    if (!editId) {

        return false;

    }


    /*
     * ALWAYS reload from storage.
     */

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
            "❌ Trade not found."
        );

        return false;

    }


    editingTrade =
        normalizeTrade(
            trade
        );


    /*
     * Wait until ALL form elements exist.
     */

    populateTradeForm(
        editingTrade
    );


    /*
     * Edit button.
     */

    const submitButton =
        document.querySelector(
            "#saveTradeBtn"
        ) ||
        document.querySelector(
            '#tradeForm button[type="submit"]'
        );


    if (submitButton) {

        submitButton.innerHTML =
            '<i class="fa-solid fa-pen"></i> Update Trade';

        submitButton.classList.remove(
            "btn-primary"
        );

        submitButton.classList.add(
            "btn-update"
        );

    }


    /*
     * Header.
     */

    const header =
        document.querySelector(
            ".page-header h1"
        );


    if (header) {

        header.innerHTML =
            '<i class="fa-solid fa-pen"></i> Edit Trade';

    }


    const headerText =
        document.querySelector(
            ".page-header p"
        );


    if (headerText) {

        headerText.textContent =
            "Modify trade details and save changes.";

    }


    /*
     * DO NOT add a second submit listener.
     *
     * Editing is controlled entirely by
     * editingTrade.
     */

    calculateAll();


    console.log(
        "✅ EDIT MODE ACTIVE:",
        editingTrade
    );


    return true;

}


/* ============================================================
   POPULATE TRADE FORM
   ============================================================ */

function populateTradeForm(
    trade
) {

    if (!trade) return;


    /*
     * ACCOUNT FIRST
     */

    populateAccountSelectors();


    setValue(
        "tradeAccount",
        trade.accountId ||
        trade.account
    );


    /*
     * ALL NORMAL FIELDS
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

        "entryModel",

        "entryConfirmation",

        "tradeValid",


        "entry",

        "stopLoss",

        "takeProfit",


        "risk",

        "riskAmount",

        "riskSettingAmount",

        "potentialProfit",

        "potentialLoss",

        "rr",


        "profit",

        "commission",

        "result",


        "balance",


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

            if (
                trade[id] !==
                undefined &&
                trade[id] !==
                null
            ) {

                setValue(
                    id,
                    trade[id]
                );

            }

        }
    );


    /*
     * Entry Model custom/manual support.
     */

    const entrySelect =
        $("entryModel");

    const customInput =
        $("entryModelCustom");


    if (
        entrySelect &&
        trade.entryModel
    ) {

        const saved =
            String(
                trade.entryModel
            );


        const exists =
            Array.from(
                entrySelect.options
            ).some(
                option =>
                    option.value ===
                    saved
            );


        if (
            exists
        ) {

            entrySelect.value =
                saved;

            if (
                customInput
            ) {

                customInput.value =
                    "";

            }

        } else {

            if (
                Array.from(
                    entrySelect.options
                ).some(
                    option =>
                        option.value ===
                        "__custom__"
                )
            ) {

                entrySelect.value =
                    "__custom__";

            }

            if (
                customInput
            ) {

                customInput.value =
                    saved;

            }

        }

    }


    /*
     * CONFLUENCES
     */

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


    /*
     * Clear all first.
     */

    Object.values(
        mapping
    ).forEach(
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
     * Restore saved values.
     */

    if (
        trade.confluences
    ) {

        Object.keys(
            trade.confluences
        ).forEach(
            key => {

                const id =
                    mapping[key];

                if (!id) return;

                const checkbox =
                    $(id);

                if (
                    checkbox
                ) {

                    checkbox.checked =
                        !!trade.confluences[key];

                }

            }
        );

    }


    /*
     * RESTORE ORIGINAL RR.
     */

    setValue(
        "rr",
        number(
            trade.plannedRR
        ).toFixed(2)
    );


    /*
     * Restore current values,
     * NOT original values, into
     * execution fields.
     *
     * This means you can see the
     * current SL after moving it to BE.
     */

    setValue(
        "entry",
        trade.entry
    );

    setValue(
        "stopLoss",
        trade.stopLoss
    );

    setValue(
        "takeProfit",
        trade.takeProfit
    );


    updateTradeAccountInfo();


    /*
     * Recalculate display fields
     * without destroying original RR.
     */

    calculateAll();

}


/* ============================================================
   CLOSE TRADE
   ============================================================ */

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


    /*
     * Already closed:
     * OPEN EDIT MODE instead of
     * simply showing an alert.
     */

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
     * Pending trade:
     * open the trade editor.
     *
     * This allows you to add:
     *
     * - exit
     * - result
     * - profit
     * - commission
     * - management
     * - review
     */

    window.location.href =
        "/journal?edit=" +
        encodeURIComponent(
            trade.id
        );

};


/* ============================================================
   VIEW TRADE
   ============================================================ */

function viewTrade(
    trade
) {

    const net =
        number(
            trade.profit
        ) -
        number(
            trade.commission
        );


    alert(`

PAIR              : ${trade.pair}

ACCOUNT           : ${
        getAccount(
            trade.accountId
        )?.name ||
        trade.account ||
        "-"
    }

STATUS            : ${trade.status}

RESULT            : ${trade.result}

PROFIT            : ${money(trade.profit)}

COMMISSION        : ${money(trade.commission)}

NET P/L           : ${signedMoney(net)}

ORIGINAL RISK     : ${money(trade.riskAmount)}

PLANNED RR        : ${number(
        trade.plannedRR
    ).toFixed(2)}

REALIZED RR       : ${number(
        trade.realizedRR
    ).toFixed(2)}

ORIGINAL ENTRY    : ${trade.initialEntry || "-"}

ORIGINAL STOP     : ${trade.initialStopLoss || "-"}

ORIGINAL TARGET   : ${trade.initialTakeProfit || "-"}

CURRENT STOP      : ${trade.stopLoss || "-"}

LESSON            : ${
        trade.lessonLearned ||
        "-"
    }

IMPROVEMENT       : ${
        trade.improvementPlan ||
        "-"
    }

`);

}


/* ============================================================
   RECENT PENDING TRADES
   ============================================================ */

function loadRecentTrades() {

    const container =
        $("recentTrades");


    if (!container) return;


    const pending =
        getFilteredTrades()
            .filter(
                trade =>
                    trade.status ===
                    "Pending"
            );


    if (
        pending.length === 0
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
        pending
            .slice(0, 8)
            .map(
                trade => {

                    const account =
                        getAccount(
                            trade.accountId
                        );


                    return `

                        <div class="trade-row">

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        trade.pair ||
                                        "?"
                                    )}
                                </strong>

                                <br>

                                <span style="
                                    font-size:12px;
                                    color:var(--text-secondary);
                                ">
                                    ${escapeHTML(
                                        trade.direction ||
                                        ""
                                    )}
                                </span>

                            </div>


                            <div>
                                ${
                                    account
                                        ? escapeHTML(
                                            account.name
                                        )
                                        : "-"
                                }
                            </div>


                            <div>
                                ${escapeHTML(
                                    trade.entryModel ||
                                    "-"
                                )}
                            </div>


                            <div>

                                <span class="status pending">
                                    Pending
                                </span>

                            </div>


                            <div>

                                <button
                                    type="button"
                                    onclick="closeTrade('${escapeAttribute(trade.id)}')"
                                    class="btn"
                                >
                                    Edit / Close
                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   FILTER
   ============================================================ */

function getFilteredTrades() {

    if (
        selectedAccountId ===
        "all"
    ) {

        return trades;

    }


    return trades.filter(
        trade =>
            (
                trade.accountId ||
                trade.account
            ) ===
            selectedAccountId
    );

}


/* ============================================================
   DASHBOARD
   ============================================================ */

function loadDashboard() {

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
                sum,
                trade
            ) =>
                sum +
                number(
                    trade.profit
                ) -
                number(
                    trade.commission
                ),
            0
        );


    const avgRR =
        closed.length
            ? closed.reduce(
                (
                    sum,
                    trade
                ) =>
                    sum +
                    number(
                        trade.realizedRR
                    ),
                0
            ) /
            closed.length
            : 0;


    const winRate =
        closed.length
            ? (
                wins.length /
                closed.length
            ) * 100
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

    if (
        closed.length ===
        0
    ) {

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


    const pairStats =
        {};

    const sessionStats =
        {};


    let currentStreak =
        0;

    let bestStreak =
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

                const pair =
                    trade.pair ||
                    "?";


                const session =
                    trade.session ||
                    "?";


                const pnl =
                    number(
                        trade.profit
                    ) -
                    number(
                        trade.commission
                    );


                pairStats[pair] =
                    (
                        pairStats[pair] ||
                        0
                    ) +
                    pnl;


                sessionStats[session] =
                    (
                        sessionStats[session] ||
                        0
                    ) +
                    pnl;


                if (
                    trade.result ===
                    "Win"
                ) {

                    currentStreak++;

                    bestStreak =
                        Math.max(
                            bestStreak,
                            currentStreak
                        );

                } else {

                    currentStreak =
                        0;

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
            (
                a,
                b
            ) =>
                pairStats[b] -
                pairStats[a]
        )[0];


    const worstPair =
        pairs.sort(
            (
                a,
                b
            ) =>
                pairStats[a] -
                pairStats[b]
        )[0];


    const bestSession =
        sessions.sort(
            (
                a,
                b
            ) =>
                sessionStats[b] -
                sessionStats[a]
        )[0];


    setText(
        "bestPair",
        bestPair ||
        "-"
    );


    setText(
        "worstPair",
        worstPair ||
        "-"
    );


    setText(
        "bestSession",
        bestSession ||
        "-"
    );


    setText(
        "winStreak",
        bestStreak
    );

}


/* ============================================================
   EQUITY CHART
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


/* ============================================================
   DESTROY CHARTS
   ============================================================ */

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


    /*
     * Protect against Chart.js
     * instances created elsewhere.
     */

    [
        "equityChart",
        "monthlyChart"
    ].forEach(
        id => {

            const canvas =
                $(id);

            if (!canvas) return;


            if (
                typeof Chart.getChart ===
                "function"
            ) {

                const existing =
                    Chart.getChart(
                        canvas
                    );

                if (
                    existing
                ) {

                    existing.destroy();

                }

            }

        }
    );

}


/* ============================================================
   EQUITY CHART
   ============================================================ */

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


    let startingBalance =
        0;


    if (
        selectedAccountId ===
        "all"
    ) {

        startingBalance =
            Object.values(
                accounts
            ).reduce(
                (
                    sum,
                    account
                ) =>
                    sum +
                    number(
                        account.startingBalance
                    ),
                0
            );

    } else {

        const account =
            getSelectedAccount();

        startingBalance =
            account
                ? number(
                    account.startingBalance
                )
                : 0;

    }


    let balance =
        startingBalance;


    const data =
        [
            balance
        ];


    closed.forEach(
        trade => {

            balance +=
                number(
                    trade.profit
                ) -
                number(
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


/* ============================================================
   MONTHLY CHART
   ============================================================ */

function buildMonthlyChart() {

    const canvas =
        $("monthlyChart");


    if (!canvas) return;


    const monthly =
        {};


    getFilteredTrades()
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


                const key =
                    date.getFullYear() +
                    "-" +
                    String(
                        date.getMonth() +
                        1
                    ).padStart(
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
                    number(
                        trade.profit
                    ) -
                    number(
                        trade.commission
                    );

            }
        );


    const keys =
        Object.keys(
            monthly
        ).sort();


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
                                monthly[key].label
                        ),

                    datasets: [

                        {

                            label:
                                "Monthly P&L",

                            data:
                                keys.map(
                                    key =>
                                        monthly[key].value
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
   ACCOUNT PANEL
   ============================================================ */

function updateAccountPanel() {

    const account =
        getSelectedAccount();


    if (!account) {

        /*
         * All accounts.
         */

        const totalStarting =
            Object.values(
                accounts
            ).reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    number(
                        item.startingBalance
                    ),
                0
            );


        const totalBalance =
            Object.values(
                accounts
            ).reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    number(
                        item.balance
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
                totalBalance
            )
        );


        setText(
            "accountRisk",
            "Multiple"
        );


        return;

    }


    setText(
        "startingBalance",
        money(
            account.startingBalance
        )
    );


    setText(
        "currentBalance",
        money(
            account.balance
        )
    );


    setText(
        "accountRisk",
        number(
            account.riskPercent ??
            account.risk
        ) +
        "%"
    );

}


/* ============================================================
   REFRESH
   ============================================================ */

function refreshUI() {

    loadAccounts();

    loadTrades();

    populateAccountSelectors();

    loadDashboard();

    loadRecentTrades();

    initializeCharts();

    updateAccountPanel();

    updateTradeAccountInfo();

}


/* ============================================================
   DEFAULT DATE
   ============================================================ */

function setDefaultDate() {

    const input =
        $("tradeDate");


    if (
        input &&
        !input.value
    ) {

        input.value =
            new Date()
                .toISOString()
                .split("T")[0];

    }

}


/* ============================================================
   RESET FORM
   ============================================================ */

function handleReset() {

    setTimeout(
        () => {

            editingTrade =
                null;


            const submitButton =
                $("saveTradeBtn") ||
                document.querySelector(
                    '#tradeForm button[type="submit"]'
                );


            if (
                submitButton
            ) {

                submitButton.innerHTML =
                    '<i class="fa-solid fa-floppy-disk"></i> Save Trade';

                submitButton.classList.remove(
                    "btn-update"
                );

                submitButton.classList.add(
                    "btn-primary"
                );

            }


            const header =
                document.querySelector(
                    ".page-header h1"
                );


            if (
                header
            ) {

                header.innerHTML =
                    '<i class="fa-solid fa-chart-line"></i> Trading Journal';

            }


            const headerText =
                document.querySelector(
                    ".page-header p"
                );


            if (
                headerText
            ) {

                headerText.textContent =
                    "Record • Review • Improve • Repeat";

            }


            setDefaultDate();


            /*
             * Restore selected account.
             */

            const accountSelect =
                $("tradeAccount");


            if (
                accountSelect
            ) {

                if (
                    selectedAccountId !==
                    "all" &&
                    accounts[selectedAccountId]
                ) {

                    accountSelect.value =
                        selectedAccountId;

                } else {

                    const first =
                        Object.values(
                            accounts
                        )[0];

                    if (
                        first
                    ) {

                        accountSelect.value =
                            first.id;

                    }

                }

            }


            updateTradeAccountInfo();

            calculateAll();

        },
        20
    );

}


/* ============================================================
   ENTRY MODEL
   ============================================================ */

function syncEntryModelInput() {

    const select =
        $("entryModel");

    const custom =
        $("entryModelCustom");


    if (
        !select ||
        !custom
    ) {

        return;

    }


    if (
        select.value ===
        "__custom__"
    ) {

        custom.style.display =
            "";

    } else {

        custom.style.display =
            "none";

        custom.value =
            "";

    }

}


/* ============================================================
   SAFE HTML
   ============================================================ */

function escapeHTML(
    value
) {

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


function escapeAttribute(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /'/g,
            "\\'"
        );

}


/* ============================================================
   AUTH / PREMIUM GUARD
   ============================================================ */

async function checkJournalAccess() {

    return new Promise(
        resolve => {

            onAuthStateChanged(
                auth,
                async user => {

                    if (!user) {

                        window.location.href =
                            "/login";

                        return;

                    }


                    currentUser =
                        user;


                    try {

                        const snapshot =
                            await getDoc(
                                doc(
                                    db,
                                    "users",
                                    user.uid
                                )
                            );


                        if (
                            !snapshot.exists()
                        ) {

                            alert(
                                "User account not found."
                            );

                            window.location.href =
                                "/dashboard";

                            return;

                        }


                        const data =
                            snapshot.data();


                        const role =
                            data.role ||
                            "member";


                        const membership =
                            data.membership ||
                            "free";


                        const allowed =
                            role === "admin" ||
                            membership === "premium";


                        if (
                            !allowed
                        ) {

                            document.body.innerHTML = `

                                <div style="
                                    display:flex;
                                    justify-content:center;
                                    align-items:center;
                                    min-height:100vh;
                                    background:#0b1120;
                                    color:white;
                                    font-family:Arial;
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
                                            The Trading Journal is available only to Premium Members.
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

                            return;

                        }


                        resolve(true);

                    }
                    catch(error) {

                        console.error(
                            "Journal access error:",
                            error
                        );

                        return;

                    }

                }
            );

        }
    );

}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function attachListeners() {

    const form =
        $("tradeForm");


    /*
     * ONE AND ONLY ONE
     * submit listener.
     */

    if (form) {

        form.addEventListener(
            "submit",
            saveTrade
        );


        form.addEventListener(
            "reset",
            handleReset
        );

    }


    /*
     * Account selector.
     */

    const accountSelect =
        $("tradeAccount");


    if (
        accountSelect
    ) {

        accountSelect.addEventListener(
            "change",
            () => {

                updateTradeAccountInfo();

                calculateAll();

            }
        );

    }


    /*
     * Account filter.
     */

    const filter =
        $("accountFilter");


    if (
        filter
    ) {

        filter.addEventListener(
            "change",
            () => {

                selectedAccountId =
                    filter.value;


                if (
                    selectedAccountId !==
                    "all"
                ) {

                    const tradeAccount =
                        $("tradeAccount");


                    if (
                        tradeAccount &&
                        accounts[selectedAccountId]
                    ) {

                        tradeAccount.value =
                            selectedAccountId;

                    }

                }


                refreshUI();

            }
        );

    }


    /*
     * Calculation fields.
     */

    [
        "pair",
        "entry",
        "stopLoss",
        "takeProfit",
        "lotSize",
        "tradeAccount"
    ].forEach(
        id => {

            const element =
                $(id);


            if (!element) return;


            element.addEventListener(
                "input",
                calculateAll
            );


            element.addEventListener(
                "change",
                calculateAll
            );

        }
    );


    /*
     * Entry model.
     */

    const entryModel =
        $("entryModel");


    if (
        entryModel
    ) {

        entryModel.addEventListener(
            "change",
            syncEntryModelInput
        );

    }


    /*
     * Storage sync.
     */

    window.addEventListener(
        "storage",
        event => {

            if (
                event.key ===
                STORAGE_KEY ||
                event.key ===
                ACCOUNTS_KEY ||
                event.key ===
                "trades" ||
                event.key ===
                "accounts"
            ) {

                refreshUI();

            }

        }
    );


    /*
     * Escape.
     */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                /*
                 * Don't accidentally cancel
                 * editing.
                 */

            }

        }
    );

}


/* ============================================================
   GLOBAL FUNCTIONS
   ============================================================ */

window.calculateAll =
    calculateAll;


window.viewTrade =
    viewTrade;


window.refreshJournal =
    refreshUI;


/* ============================================================
   INITIALIZATION
   ============================================================ */

async function initializeJournal() {

    try {

        await checkJournalAccess();


        loadAccounts();

        loadTrades();


        populateAccountSelectors();


        attachListeners();


        /*
         * IMPORTANT:
         *
         * Edit mode MUST happen AFTER:
         *
         * 1. DOM exists
         * 2. accounts loaded
         * 3. form exists
         * 4. selectors populated
         *
         * This is the part your current code
         * was getting wrong.
         */

        const isEditing =
            startEditMode();


        if (!isEditing) {

            setDefaultDate();


            /*
             * Default account.
             */

            const accountSelect =
                $("tradeAccount");


            if (
                accountSelect &&
                !accountSelect.value
            ) {

                const first =
                    Object.values(
                        accounts
                    )[0];


                if (
                    first
                ) {

                    accountSelect.value =
                        first.id;

                }

            }


            updateTradeAccountInfo();

            calculateAll();

        }


        refreshUI();


        /*
         * Edit mode needs to be restored AFTER
         * refreshUI because refreshUI reloads data.
         */

        if (isEditing) {

            populateTradeForm(
                editingTrade
            );

        }


        syncEntryModelInput();


        console.log(
            "✅ GTRADES-AXIS Journal initialized."
        );


    }
    catch(error) {

        console.error(
            "Journal initialization error:",
            error
        );

    }

}


/* ============================================================
   START
   ============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeJournal,
        {
            once: true
        }
    );

} else {

    initializeJournal();

}


console.log(
    "✅ GTRADES-AXIS journal.js loaded."
);
