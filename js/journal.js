```javascript
/* ============================================================
   GTRADES AXIS™
   TRADING JOURNAL
   COMPLETE JOURNAL ENGINE
   VERSION: RR + ACCOUNTS + EDIT DATE/TIME FIX
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

    return Number.isFinite(value)
        ? value
        : 0;
}


function isChecked(id) {

    const el = $(id);

    return el
        ? el.checked
        : false;
}


function setText(id, value) {

    const el = $(id);

    if (el) {
        el.textContent = value;
    }
}


function safeNumber(value) {

    const n = parseFloat(value);

    return Number.isFinite(n)
        ? n
        : 0;
}


function round(value, decimals = 2) {

    const factor =
        Math.pow(10, decimals);

    return Math.round(
        (
            safeNumber(value) +
            Number.EPSILON
        ) * factor
    ) / factor;
}


/* ============================================================
   LOCAL STORAGE
   ============================================================ */

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

    } catch (error) {

        console.error(
            "Failed to load trades:",
            error
        );

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

        console.error(
            "Failed to save trades:",
            error
        );

        alert(
            "❌ Unable to save journal data."
        );

        return false;
    }
}


/* ============================================================
   JOURNAL ACCESS
   ============================================================ */

async function checkJournalAccess() {

    return new Promise(
        (resolve, reject) => {

            onAuthStateChanged(
                auth,
                async user => {

                    if (!user) {

                        window.location.href =
                            "/login";

                        reject(
                            new Error(
                                "Not authenticated"
                            )
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
                                    "User not found"
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
                                                display:block;
                                            "
                                        ></i>

                                        <h1>
                                            Premium Membership Required
                                        </h1>

                                        <p style="
                                            color:#94a3b8;
                                            margin:20px 0;
                                        ">
                                            The Trading Journal is available only
                                            to Premium Members.
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
                                    "Journal blocked"
                                )
                            );

                            return;
                        }

                        resolve(true);

                    } catch (error) {

                        console.error(
                            "Journal access error:",
                            error
                        );

                        reject(error);
                    }
                }
            );
        }
    );
}


/* ============================================================
   FIELD READING
   ============================================================ */

function readField(id) {

    const element = $(id);

    if (element) {

        if (
            element.type ===
            "checkbox"
        ) {

            return element.checked;
        }

        return element.value ?? "";
    }


    const radio =
        document.querySelector(
            `input[name="${id}"]:checked`
        );

    if (radio) {

        return radio.value;
    }

    return "";
}


function readNumber(id) {

    return safeNumber(
        readField(id)
    );
}


/* ============================================================
   FIELD WRITING
   ============================================================ */

function setField(id, value) {

    const element = $(id);

    if (element) {

        if (
            element.type ===
            "checkbox"
        ) {

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
            new Event(
                "change",
                {
                    bubbles: true
                }
            )
        );

        element.dispatchEvent(
            new Event(
                "input",
                {
                    bubbles: true
                }
            )
        );

        return true;
    }


    const radios =
        document.querySelectorAll(
            `input[name="${id}"]`
        );

    if (radios.length) {

        radios.forEach(
            radio => {

                radio.checked =
                    String(
                        radio.value
                    ) ===
                    String(value);
            }
        );

        return true;
    }


    return false;
}


function setCheckbox(
    id,
    checked
) {

    const element = $(id);

    if (!element) return;

    element.checked =
        !!checked;

    element.dispatchEvent(
        new Event(
            "change",
            {
                bubbles: true
            }
        )
    );
}


/* ============================================================
   SYMBOL NORMALIZATION
   ============================================================ */

function normalizeSymbol(symbol) {

    return String(
        symbol || ""
    )
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace("/", "");
}


/* ============================================================
   SYMBOL INFORMATION
   ============================================================ */

function getSymbolInfo(symbol) {

    const s =
        normalizeSymbol(symbol);


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


/* ============================================================
   PIP VALUE
   ============================================================ */

function getPipValuePerLot(
    symbol,
    useManual = true
) {

    /*
       Do not allow the automatically displayed
       pip value to recursively overwrite the
       symbol's own calculation.

       Manual value is only respected when
       explicitly entered by the user.
    */

    if (useManual) {

        const element =
            $("pipValue");

        if (element) {

            const raw =
                String(
                    element.value ?? ""
                ).trim();

            if (raw !== "") {

                const manual =
                    parseFloat(raw);

                if (
                    Number.isFinite(
                        manual
                    ) &&
                    manual > 0
                ) {

                    return manual;
                }
            }
        }
    }


    return getSymbolInfo(
        symbol
    ).pipValuePerLot;
}


/* ============================================================
   PRICE / PIP CALCULATIONS
   ============================================================ */

function calculatePriceDistance(
    entry,
    stopLoss
) {

    return Math.abs(
        safeNumber(entry) -
        safeNumber(stopLoss)
    );
}


function calculatePips(
    symbol,
    entry,
    exit
) {

    const info =
        getSymbolInfo(symbol);

    entry =
        safeNumber(entry);

    exit =
        safeNumber(exit);

    if (
        entry <= 0 ||
        exit <= 0
    ) {

        return 0;
    }

    return Math.abs(
        entry - exit
    ) / info.pipSize;
}


/* ============================================================
   RISK CALCULATION
   ============================================================ */

function calculateRiskAmount(
    symbol,
    entry,
    stopLoss,
    lotSize,
    manualPipValue = null
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
        getSymbolInfo(symbol);


    const distance =
        Math.abs(
            entry - stopLoss
        );


    /*
       GOLD

       $1 movement × 1 lot
       = $100
    */

    if (
        info.type === "gold"
    ) {

        return (
            distance *
            lotSize *
            100
        );
    }


    /*
       SILVER
    */

    if (
        info.type === "metal"
    ) {

        return (
            distance *
            lotSize *
            info.priceValuePerLot
        );
    }


    /*
       FOREX
    */

    const pips =
        distance /
        info.pipSize;


    let pipValue =
        manualPipValue !== null
            ? safeNumber(
                manualPipValue
            )
            : getPipValuePerLot(
                symbol
            );


    if (pipValue <= 0) {

        pipValue =
            info.pipValuePerLot;
    }


    return (
        pips *
        pipValue *
        lotSize
    );
}


/* ============================================================
   REWARD CALCULATION
   ============================================================ */

function calculateRewardAmount(
    symbol,
    entry,
    takeProfit,
    lotSize,
    manualPipValue = null
) {

    entry =
        safeNumber(entry);

    takeProfit =
        safeNumber(takeProfit);

    lotSize =
        safeNumber(lotSize);


    if (
        entry <= 0 ||
        takeProfit <= 0 ||
        lotSize <= 0
    ) {

        return 0;
    }


    const info =
        getSymbolInfo(symbol);


    const distance =
        Math.abs(
            entry -
            takeProfit
        );


    if (
        info.type === "gold"
    ) {

        return (
            distance *
            lotSize *
            100
        );
    }


    if (
        info.type === "metal"
    ) {

        return (
            distance *
            lotSize *
            info.priceValuePerLot
        );
    }


    const pips =
        distance /
        info.pipSize;


    let pipValue =
        manualPipValue !== null
            ? safeNumber(
                manualPipValue
            )
            : getPipValuePerLot(
                symbol
            );


    if (pipValue <= 0) {

        pipValue =
            info.pipValuePerLot;
    }


    return (
        pips *
        pipValue *
        lotSize
    );
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


    const riskDistance =
        Math.abs(
            entry -
            stopLoss
        );


    if (
        riskDistance <= 0
    ) {

        return 0;
    }


    const rewardDistance =
        Math.abs(
            takeProfit -
            entry
        );


    return (
        rewardDistance /
        riskDistance
    );
}


/* ============================================================
   ACTUAL RR FROM PRICES
   ============================================================ */

function calculateActualRRFromPrices(
    symbol,
    direction,
    initialEntry,
    initialStopLoss,
    actualExit
) {

    initialEntry =
        safeNumber(
            initialEntry
        );

    initialStopLoss =
        safeNumber(
            initialStopLoss
        );

    actualExit =
        safeNumber(
            actualExit
        );


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


    if (
        riskDistance <= 0
    ) {

        return 0;
    }


    let rewardDistance;


    if (
        String(direction)
            .toUpperCase() ===
        "SELL"
    ) {

        rewardDistance =
            initialEntry -
            actualExit;

    } else {

        rewardDistance =
            actualExit -
            initialEntry;
    }


    return (
        rewardDistance /
        riskDistance
    );
}


/* ============================================================
   ACTUAL RR
   ============================================================ */

function calculateActualRR(
    trade
) {

    if (!trade) return 0;


    const direction =
        trade.direction ||
        "";


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


    /*
       PRIMARY METHOD:
       Original Entry + Original SL
       + Actual Exit.
    */

    if (
        initialEntry > 0 &&
        initialSL > 0 &&
        actualExit > 0
    ) {

        let rr =
            calculateActualRRFromPrices(
                trade.pair,
                direction,
                initialEntry,
                initialSL,
                actualExit
            );


        if (
            trade.result ===
            "Win"
        ) {

            rr =
                Math.abs(rr);

        } else if (
            trade.result ===
            "Loss"
        ) {

            rr =
                -Math.abs(rr);

        } else if (
            trade.result ===
            "Breakeven"
        ) {

            rr = 0;
        }


        return rr;
    }


    /*
       FALLBACK:
       P/L ÷ original monetary risk.
    */

    const originalRisk =
        safeNumber(
            trade.initialRiskAmount ??
            trade.riskAmount ??
            trade.risk
        );


    const profit =
        safeNumber(
            trade.profit
        );


    if (
        originalRisk > 0
    ) {

        if (
            trade.result ===
            "Win"
        ) {

            return (
                Math.abs(profit) /
                originalRisk
            );
        }


        if (
            trade.result ===
            "Loss"
        ) {

            return (
                -Math.abs(profit) /
                originalRisk
            );
        }
    }


    return 0;
}


/* ============================================================
   ACCOUNT NORMALIZATION
   ============================================================ */

function normalizeAccount(
    account,
    index = 0
) {

    if (!account) {
        return null;
    }


    const id =
        account.id ??
        account.accountId ??
        account.uid ??
        account.number ??
        account.name ??
        `account_${index}`;


    const name =
        account.name ??
        account.accountName ??
        account.title ??
        account.label ??
        account.accountNumber ??
        String(id);


    const balance =
        safeNumber(
            account.balance ??
            account.currentBalance ??
            account.startingBalance ??
            account.initialBalance ??
            account.equity
        );


    const risk =
        safeNumber(
            account.risk ??
            account.riskAmount ??
            account.riskPerTrade
        );


    const riskPercent =
        safeNumber(
            account.riskPercent ??
            account.riskPercentage ??
            account.riskPerTradePercent
        );


    const riskSetting =
        account.riskSetting ??
        account.riskType ??
        account.riskMode ??
        (
            riskPercent > 0
                ? `${riskPercent}%`
                : ""
        );


    const currency =
        account.currency ||
        account.accountCurrency ||
        "USD";


    return {

        ...account,

        id:
            String(id),

        name:
            String(name),

        balance,

        risk,

        riskPercent,

        riskSetting,

        currency
    };
}


/* ============================================================
   ACCOUNT STORAGE
   ============================================================ */

function getStoredAccounts() {

    const accounts = [];

    const storageKeys = [

        "tradingAccounts",

        "accounts",

        "journalAccounts",

        "forexAccounts",

        "myTradingAccounts",

        "userAccounts"
    ];


    storageKeys.forEach(
        key => {

            try {

                const raw =
                    localStorage.getItem(
                        key
                    );


                if (!raw) return;


                const parsed =
                    JSON.parse(raw);


                /*
                   Direct array.
                */

                if (
                    Array.isArray(
                        parsed
                    )
                ) {

                    parsed.forEach(
                        account => {

                            const normalized =
                                normalizeAccount(
                                    account
                                );

                            if (
                                normalized
                            ) {

                                accounts.push(
                                    normalized
                                );
                            }
                        }
                    );

                    return;
                }


                /*
                   Object containing accounts.
                */

                if (
                    parsed &&
                    typeof parsed ===
                    "object"
                ) {

                    const possibleArrays = [

                        parsed.accounts,

                        parsed.tradingAccounts,

                        parsed.journalAccounts,

                        parsed.data,

                        parsed.items
                    ];


                    possibleArrays.forEach(
                        array => {

                            if (
                                !Array.isArray(
                                    array
                                )
                            ) {

                                return;
                            }


                            array.forEach(
                                account => {

                                    const normalized =
                                        normalizeAccount(
                                            account
                                        );

                                    if (
                                        normalized
                                    ) {

                                        accounts.push(
                                            normalized
                                        );
                                    }
                                }
                            );
                        }
                    );
                }

            } catch (error) {

                console.warn(
                    `Could not read ${key}:`,
                    error
                );
            }
        }
    );


    /*
       Remove duplicates.
    */

    const unique =
        new Map();


    accounts.forEach(
        account => {

            unique.set(
                String(
                    account.id
                ),
                account
            );
        }
    );


    return Array.from(
        unique.values()
    );
}


/* ============================================================
   ACCOUNT SELECTOR
   ============================================================ */

function populateAccountSelector(
    preferredAccountId = ""
) {

    const select =
        $("account");


    if (!select) {

        return [];
    }


    const accounts =
        getStoredAccounts();


    /*
       Preserve any accounts already
       present in the HTML.
    */

    const existing =
        Array.from(
            select.options
        ).map(
            option => {

                const id =
                    option.value;

                if (!id) {
                    return null;
                }


                return normalizeAccount(
                    {

                        id,

                        name:
                            option.dataset.name ||
                            option.textContent ||
                            id,

                        balance:
                            option.dataset.balance,

                        risk:
                            option.dataset.risk,

                        currency:
                            option.dataset.currency ||
                            "USD",

                        riskSetting:
                            option.dataset.riskSetting ||
                            ""
                    }
                );
            }
        ).filter(Boolean);


    /*
       Merge stored accounts and
       existing HTML accounts.
    */

    const merged =
        new Map();


    existing.forEach(
        account => {

            merged.set(
                String(account.id),
                account
            );
        }
    );


    accounts.forEach(
        account => {

            const existingAccount =
                merged.get(
                    String(account.id)
                );


            merged.set(
                String(account.id),
                existingAccount
                    ? {
                        ...existingAccount,
                        ...account
                    }
                    : account
            );
        }
    );


    const finalAccounts =
        Array.from(
            merged.values()
        );


    /*
       Rebuild selector.
    */

    const currentValue =
        preferredAccountId ||
        select.value;


    select.innerHTML = `

        <option value="">
            Select Trading Account
        </option>

    `;


    finalAccounts.forEach(
        account => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                account.id;


            option.textContent =
                account.name;


            option.dataset.name =
                account.name;


            option.dataset.balance =
                account.balance;


            option.dataset.risk =
                account.risk;


            option.dataset.riskPercent =
                account.riskPercent;


            option.dataset.currency =
                account.currency;


            option.dataset.riskSetting =
                account.riskSetting;


            select.appendChild(
                option
            );
        }
    );


    /*
       If there are no stored accounts,
       don't destroy a manually-created
       placeholder.
    */

    if (
        finalAccounts.length === 0
    ) {

        const placeholder =
            select.querySelector(
                'option[value=""]'
            );

        if (placeholder) {

            placeholder.textContent =
                "No trading accounts found";
        }
    }


    /*
       Restore selected account.
    */

    if (
        currentValue &&
        finalAccounts.some(
            account =>
                String(account.id) ===
                String(currentValue)
        )
    ) {

        select.value =
            String(currentValue);

    } else if (
        currentValue
    ) {

        /*
           If the trade contains an account
           that isn't currently in storage,
           keep it visible rather than losing
           the historical account reference.
        */

        const fallback =
            document.createElement(
                "option"
            );


        fallback.value =
            String(currentValue);


        fallback.textContent =
            String(currentValue);


        fallback.dataset.name =
            String(currentValue);


        fallback.dataset.balance =
            "0";


        fallback.dataset.risk =
            "0";


        fallback.dataset.currency =
            "USD";


        select.appendChild(
            fallback
        );


        select.value =
            String(currentValue);
    }


    return finalAccounts;
}


/* ============================================================
   GET SELECTED ACCOUNT
   ============================================================ */

function getSelectedAccount() {

    const select =
        $("account");


    if (!select) {
        return null;
    }


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

        id:
            selectedValue,

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

        riskPercent:
            safeNumber(
                option.dataset.riskPercent
            ),

        currency:
            option.dataset.currency ||
            "USD",

        riskSetting:
            option.dataset.riskSetting ||
            ""
    };


    /*
       Re-check storage so the latest
       account values are used.
    */

    const storedAccounts =
        getStoredAccounts();


    const found =
        storedAccounts.find(
            a =>
                String(a.id) ===
                String(selectedValue)
        );


    if (found) {

        account = {

            ...account,

            ...found
        };
    }


    return account;
}


/* ============================================================
   ACCOUNT UI
   ============================================================ */

function updateAccountDisplay() {

    const account =
        getSelectedAccount();


    if (!account) {

        updateCalculations();

        return;
    }


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


    let riskAmount =
        safeNumber(
            account.risk ??
            account.riskAmount ??
            account.riskPerTrade
        );


    const riskPercent =
        safeNumber(
            account.riskPercent
        );


    /*
       If account has a percentage
       but no fixed risk amount,
       calculate it from balance.
    */

    if (
        riskAmount <= 0 &&
        balance > 0 &&
        riskPercent > 0
    ) {

        riskAmount =
            balance *
            riskPercent /
            100;
    }


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


    if ($("accountRiskPercent")) {

        $("accountRiskPercent").value =
            riskPercent || "";
    }


    setText(
        "accountRiskDisplay",
        `$${round(
            riskAmount
        ).toFixed(2)}`
    );


    updateCalculations();
}


/* ============================================================
   FORM CALCULATIONS
   ============================================================ */

function updateCalculations() {

    const symbol =
        readField("pair");


    const entry =
        readNumber("entry");


    const stopLoss =
        readNumber("stopLoss");


    const takeProfit =
        readNumber("takeProfit");


    const lotSize =
        readNumber("lotSize");


    /*
       IMPORTANT:

       If pipValue field was automatically
       populated, getSymbolInfo() is still
       used unless the user manually changes
       the value.

       For GOLD:
       $100 per $1 move per lot.
    */

    const pipValue =
        getPipValuePerLot(
            symbol
        );


    const riskAmount =
        calculateRiskAmount(
            symbol,
            entry,
            stopLoss,
            lotSize,
            pipValue
        );


    const rewardAmount =
        calculateRewardAmount(
            symbol,
            entry,
            takeProfit,
            lotSize,
            pipValue
        );


    /*
       Planned RR does NOT depend on
       lot size or account balance.

       Example:

       Entry 3400
       SL    3390
       TP    3440

       Risk = 10
       Reward = 40

       RR = 4.00R
    */

    const plannedRR =
        calculatePlannedRR(
            symbol,
            entry,
            stopLoss,
            takeProfit
        );


    const account =
        getSelectedAccount();


    let accountRisk = 0;


    if (account) {

        accountRisk =
            safeNumber(
                account.risk ??
                account.riskAmount ??
                account.riskPerTrade
            );


        const accountBalance =
            safeNumber(
                account.balance ??
                account.currentBalance ??
                account.startingBalance
            );


        const accountRiskPercent =
            safeNumber(
                account.riskPercent
            );


        if (
            accountRisk <= 0 &&
            accountBalance > 0 &&
            accountRiskPercent > 0
        ) {

            accountRisk =
                accountBalance *
                accountRiskPercent /
                100;
        }
    }


    /*
       Fallback account fields.
    */

    if (
        accountRisk <= 0
    ) {

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
       Form values.
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


    /*
       Do NOT automatically overwrite
       pipValue with a value that can then
       be interpreted as manual input.

       Only display it if the field exists.
    */

    const pipField =
        $("pipValue");


    if (
        pipField &&
        pipField.dataset.manual !==
        "true"
    ) {

        pipField.value =
            round(
                getSymbolInfo(
                    symbol
                ).pipValuePerLot,
                4
            );
    }


    /*
       Summary.
    */

    setText(
        "summaryAccountRisk",
        `$${round(
            accountRisk
        ).toFixed(2)}`
    );


    setText(
        "summaryActualRisk",
        `$${round(
            riskAmount
        ).toFixed(2)}`
    );


    setText(
        "summaryRiskPercent",
        `${round(
            actualRiskPercent
        ).toFixed(2)}%`
    );


    setText(
        "summaryReward",
        `$${round(
            rewardAmount
        ).toFixed(2)}`
    );


    setText(
        "summaryLoss",
        `$${round(
            riskAmount
        ).toFixed(2)}`
    );


    setText(
        "summaryRR",
        round(
            plannedRR
        ).toFixed(2) + "R"
    );


    /*
       Alternate IDs.
    */

    setText(
        "accountRiskDisplay",
        `$${round(
            accountRisk
        ).toFixed(2)}`
    );


    setText(
        "actualRiskDisplay",
        `$${round(
            riskAmount
        ).toFixed(2)}`
    );


    setText(
        "riskPercentDisplay",
        `${round(
            actualRiskPercent
        ).toFixed(2)}%`
    );


    setText(
        "rewardDisplay",
        `$${round(
            rewardAmount
        ).toFixed(2)}`
    );


    setText(
        "lossDisplay",
        `$${round(
            riskAmount
        ).toFixed(2)}`
    );


    setText(
        "rrDisplay",
        round(
            plannedRR
        ).toFixed(2) + "R"
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
                    round(
                        value,
                        6
                    )
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
   TRADE DATE / TIME
   ============================================================ */

function normalizeTradeDate(
    trade
) {

    if (
        trade &&
        trade.date
    ) {

        return String(
            trade.date
        );
    }


    /*
       Some older trades may only
       have created timestamp.
    */

    if (
        trade &&
        trade.created
    ) {

        const date =
            new Date(
                trade.created
            );


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return [
                date.getFullYear(),
                String(
                    date.getMonth() + 1
                ).padStart(2, "0"),
                String(
                    date.getDate()
                ).padStart(2, "0")
            ].join("-");
        }
    }


    return "";
}


function normalizeTradeTime(
    trade
) {

    if (
        trade &&
        trade.time
    ) {

        return String(
            trade.time
        );
    }


    if (
        trade &&
        trade.created
    ) {

        const date =
            new Date(
                trade.created
            );


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return [
                String(
                    date.getHours()
                ).padStart(2, "0"),

                String(
                    date.getMinutes()
                ).padStart(2, "0")
            ].join(":");
        }
    }


    return "";
}


/* ============================================================
   BUILD TRADE
   ============================================================ */

function buildTradeFromForm(
    isUpdate
) {

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
       ORIGINAL VALUES

       These NEVER change during
       editing.

       This is critical for correct
       realized RR.
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


    /*
       Original risk.

       If the old trade already has
       original risk, preserve it.

       Otherwise calculate it using
       the original Entry/SL.
    */

    let initialRiskAmount =
        oldTrade?.initialRiskAmount;


    if (
        initialRiskAmount ===
        undefined ||
        initialRiskAmount ===
        null ||
        safeNumber(
            initialRiskAmount
        ) <= 0
    ) {

        initialRiskAmount =
            calculateRiskAmount(
                symbol,
                initialEntry,
                initialStopLoss,
                lotSize
            );
    }


    /*
       Planned reward uses the
       ORIGINAL Entry + TP.
    */

    const plannedReward =
        calculateRewardAmount(
            symbol,
            initialEntry,
            initialTakeProfit,
            lotSize
        );


    const plannedRR =
        calculatePlannedRR(
            symbol,
            initialEntry,
            initialStopLoss,
            initialTakeProfit
        );


    /*
       Result.
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

        status =
            "Closed";

    } else {

        status =
            "Pending";
    }


    /*
       Actual exit.

       During edit, preserve the existing
       actual exit if the field isn't
       available.
    */

    const exitFromForm =
        readNumber(
            "exitPrice"
        ) ||
        readNumber(
            "actualExit"
        );


    const actualExit =
        exitFromForm ||
        safeNumber(
            oldTrade?.actualExit ??
            oldTrade?.exitPrice
        );


    /*
       Profit / commission.

       When editing, preserve existing
       values if the form is blank.
    */

    const formProfit =
        readField("profit");


    const formCommission =
        readField("commission");


    const profit =
        formProfit !== ""
            ? safeNumber(
                formProfit
            )
            : safeNumber(
                oldTrade?.profit
            );


    const commission =
        formCommission !== ""
            ? safeNumber(
                formCommission
            )
            : safeNumber(
                oldTrade?.commission
            );


    /*
       Actual RR.
    */

    let actualRR = 0;


    if (
        status ===
        "Closed"
    ) {

        if (
            actualExit > 0
        ) {

            actualRR =
                calculateActualRRFromPrices(
                    symbol,
                    direction,
                    initialEntry,
                    initialStopLoss,
                    actualExit
                );

        } else if (
            safeNumber(
                initialRiskAmount
            ) > 0
        ) {

            if (
                result ===
                "Win"
            ) {

                actualRR =
                    Math.abs(
                        profit
                    ) /
                    safeNumber(
                        initialRiskAmount
                    );

            } else if (
                result ===
                "Loss"
            ) {

                actualRR =
                    -Math.abs(
                        profit
                    ) /
                    safeNumber(
                        initialRiskAmount
                    );

            } else {

                actualRR = 0;
            }
        }
    }


    /*
       Force sign.
    */

    if (
        result ===
        "Win"
    ) {

        actualRR =
            Math.abs(
                actualRR
            );

    } else if (
        result ===
        "Loss"
    ) {

        actualRR =
            -Math.abs(
                actualRR
            );

    } else if (
        result ===
        "Breakeven"
    ) {

        actualRR = 0;
    }


    /*
       Date/time.

       When editing, the existing trade's
       date and time are restored and
       preserved.

       We DO NOT replace them with today's
       date/time.
    */

    const tradeDate =
        readField(
            "tradeDate"
        ) ||
        normalizeTradeDate(
            oldTrade
        );


    const tradeTime =
        readField(
            "tradeTime"
        ) ||
        normalizeTradeTime(
            oldTrade
        );


    /*
       Closed timestamp.

       Preserve the original close time
       during editing.
    */

    let closed =
        oldTrade?.closed ||
        null;


    if (
        status ===
        "Closed" &&
        !closed
    ) {

        closed =
            new Date().toISOString();
    }


    const trade = {

        /*
           IDENTITY
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


        closed,


        /*
           BASIC INFORMATION
        */

        date:
            tradeDate,


        time:
            tradeTime,


        pair:
            symbol,


        direction:
            direction,


        session:
            readField(
                "session"
            ),


        broker:
            readField(
                "broker"
            ),


        account:
            readField(
                "account"
            ),


        lotSize:
            lotSize,


        /*
           ACCOUNT
        */

        accountBalance:
            readNumber(
                "currentAccountBalance"
            ) ||
            readNumber(
                "accountBalance"
            ) ||
            safeNumber(
                oldTrade?.accountBalance
            ),


        accountRiskSetting:
            readField(
                "accountRiskSetting"
            ) ||
            oldTrade?.accountRiskSetting ||
            "",


        currency:
            readField(
                "currency"
            ) ||
            oldTrade?.currency ||
            "USD",


        pipValue:
            getSymbolInfo(
                symbol
            ).pipValuePerLot,


        /*
           HTF
        */

        htfSwing:
            readField(
                "htfSwing"
            ),


        htfInternal:
            readField(
                "htfInternal"
            ),


        /*
           MTF
        */

        mtfSwing:
            readField(
                "mtfSwing"
            ),


        mtfInternal:
            readField(
                "mtfInternal"
            ),


        /*
           LTF
        */

        ltfStructure:
            readField(
                "ltfStructure"
            ),


        liquidity:
            readField(
                "liquidity"
            ),


        poi:
            readField(
                "poi"
            ),


        entryModel:
            readField(
                "entryModel"
            ),


        entryConfirmation:
            readField(
                "entryConfirmation"
            ),


        tradeValid:
            readField(
                "tradeValid"
            ),


        /*
           CONFLUENCES
        */

        confluences:
            readConfluences(),


        /*
           CURRENT EXECUTION VALUES

           These can change during editing.
        */

        entry:
            entry,


        stopLoss:
            stopLoss,


        takeProfit:
            takeProfit,


        /*
           ORIGINAL EXECUTION VALUES

           These NEVER change.
        */

        initialEntry:
            initialEntry,


        initialStopLoss:
            initialStopLoss,


        initialTakeProfit:
            initialTakeProfit,


        initialRiskAmount:
            safeNumber(
                initialRiskAmount
            ),


        /*
           PLANNED
        */

        risk:
            safeNumber(
                initialRiskAmount
            ),


        riskAmount:
            safeNumber(
                initialRiskAmount
            ),


        potentialProfit:
            plannedReward,


        potentialLoss:
            safeNumber(
                initialRiskAmount
            ),


        plannedRR:
            plannedRR,


        /*
           EXIT
        */

        actualExit:
            actualExit ||
            null,


        exitPrice:
            actualExit ||
            null,


        /*
           RESULT
        */

        profit:
            profit,


        commission:
            commission,


        result:
            result,


        actualRR:
            actualRR,


        rr:
            actualRR,


        /*
           PSYCHOLOGY
        */

        confidence:
            readField(
                "confidence"
            ),


        emotion:
            readField(
                "emotion"
            ),


        discipline:
            readField(
                "discipline"
            ),


        patience:
            readField(
                "patience"
            ),


        /*
           REVIEW
        */

        tradeSummary:
            readField(
                "tradeSummary"
            ),


        strengths:
            readField(
                "strengths"
            ),


        mistakes:
            readField(
                "mistakes"
            ),


        lessonLearned:
            readField(
                "lessonLearned"
            ),


        improvementPlan:
            readField(
                "improvementPlan"
            ),


        /*
           CHARTS
        */

        beforeChart:
            readField(
                "beforeChart"
            ),


        duringChart:
            readField(
                "duringChart"
            ),


        afterChart:
            readField(
                "afterChart"
            ),


        notes:
            readField(
                "notes"
            ),


        /*
           STATUS
        */

        status:
            status
    };


    /*
       Preserve old fields that aren't
       currently represented by the form.
    */

    if (oldTrade) {

        Object.keys(
            oldTrade
        ).forEach(
            key => {

                if (
                    trade[key] ===
                    undefined
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


    if (!form) {
        return;
    }


    loadTrades();


    const isUpdate =
        !!editingTrade;


    const trade =
        buildTradeFromForm(
            isUpdate
        );


    /*
       UPDATE
    */

    if (isUpdate) {

        const index =
            trades.findIndex(
                t =>
                    String(t.id) ===
                    String(
                        editingTrade.id
                    )
            );


        if (
            index === -1
        ) {

            alert(
                "❌ The original trade could not be found."
            );

            return;
        }


        trades[index] =
            trade;


        if (
            !saveTrades()
        ) {

            return;
        }


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

    trades.unshift(
        trade
    );


    if (
        !saveTrades()
    ) {

        return;
    }


    form.reset();


    editingTrade =
        null;


    refreshUI();


    alert(
        "✅ Trade saved."
    );
}


/* ============================================================
   POPULATE EDIT FORM
   ============================================================ */

function populateForm(
    trade
) {

    if (!trade) {
        return;
    }


    console.log(
        "✏️ POPULATING TRADE:",
        trade
    );


    /*
       ACCOUNT MUST BE POPULATED
       BEFORE setting the selected value.
    */

    populateAccountSelector(
        trade.account
    );


    /*
       DATE + TIME

       Explicitly resolve them first.
       This fixes older trades where the
       date/time may only exist inside
       created timestamp.
    */

    const tradeDate =
        normalizeTradeDate(
            trade
        );


    const tradeTime =
        normalizeTradeTime(
            trade
        );


    /*
       BASIC FIELDS
    */

    const fields = [

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

        "exitPrice",

        "actualExit"
    ];


    fields.forEach(
        id => {

            if (
                trade[id] !==
                undefined &&
                trade[id] !==
                null
            ) {

                setField(
                    id,
                    trade[id]
                );
            }
        }
    );


    /*
       EXPLICIT DATE/TIME RESTORE
    */

    if (
        tradeDate
    ) {

        setField(
            "tradeDate",
            tradeDate
        );
    }


    if (
        tradeTime
    ) {

        setField(
            "tradeTime",
            tradeTime
        );
    }


    /*
       If the HTML date/time fields
       are still empty, use created.
    */

    if (
        !$("tradeDate")?.value &&
        trade.created
    ) {

        setField(
            "tradeDate",
            tradeDate
        );
    }


    if (
        !$("tradeTime")?.value &&
        trade.created
    ) {

        setField(
            "tradeTime",
            tradeTime
        );
    }


    /*
       CONFLUENCES
    */

    populateConfluences(
        trade.confluences
    );


    /*
       PAGE HEADING
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
       SUBMIT BUTTON
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
       EDIT FLAG
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


    /*
       ACCOUNT VALUES
    */

    const accountSelect =
        $("account");


    if (
        accountSelect &&
        trade.account
    ) {

        accountSelect.value =
            String(
                trade.account
            );


        /*
           If the historical account no
           longer exists, create a temporary
           option so the edit doesn't lose it.
        */

        if (
            accountSelect.value !==
            String(trade.account)
        ) {

            const fallback =
                document.createElement(
                    "option"
                );


            fallback.value =
                String(
                    trade.account
                );


            fallback.textContent =
                String(
                    trade.account
                );


            accountSelect.appendChild(
                fallback
            );


            accountSelect.value =
                String(
                    trade.account
                );
        }
    }


    updateAccountDisplay();


    updateCalculations();


    /*
       Actual RR based on the original
       Entry and original SL.
    */

    updateActualRRDisplay(
        trade
    );


    console.log(
        "✅ TRADE FULLY POPULATED FOR EDIT"
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
            ? `+${round(
                actualRR
            ).toFixed(2)}`
            : round(
                actualRR
            ).toFixed(2);


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


    setText(
        "summaryActualRR",
        `${formatted}R`
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
        params.get(
            "edit"
        );


    if (!editId) {

        editingTrade =
            null;

        /*
           Still populate account selector
           for a new trade.
        */

        populateAccountSelector();

        return;
    }


    console.log(
        "🔎 EDIT MODE ID:",
        editId
    );


    loadTrades();


    editingTrade =
        trades.find(
            trade =>
                String(
                    trade.id
                ) ===
                String(
                    editId
                )
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
       Populate only after DOM and
       account selector exist.
    */

    populateForm(
        editingTrade
    );
}


/* ============================================================
   CLOSE TRADE
   ============================================================ */

function closeTrade(
    id
) {

    loadTrades();


    const trade =
        trades.find(
            t =>
                String(
                    t.id
                ) ===
                String(id)
        );


    if (!trade) {
        return;
    }


    const outcome =
        prompt(
            "Result?\n\nWin\nLoss\nBreakeven"
        );


    if (!outcome) {
        return;
    }


    const normalizedOutcome =
        outcome
            .trim()
            .toLowerCase();


    let result;


    if (
        normalizedOutcome ===
        "win"
    ) {

        result =
            "Win";

    } else if (
        normalizedOutcome ===
        "loss"
    ) {

        result =
            "Loss";

    } else if (
        normalizedOutcome ===
        "breakeven" ||
        normalizedOutcome ===
        "be"
    ) {

        result =
            "Breakeven";

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


    const exitInput =
        prompt(
            "Actual Exit Price\n\nLeave blank if you want RR calculated from P/L.",
            trade.actualExit ??
            ""
        );


    const actualExit =
        exitInput !== null &&
        exitInput.trim() !== ""
            ? parseFloat(
                exitInput
            )
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


    if (
        actualExit > 0
    ) {

        trade.actualExit =
            actualExit;


        trade.exitPrice =
            actualExit;
    }


    /*
       Original Entry and Original SL
       remain untouched.
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
        `✅ Trade closed.\n\nActual RR: ${
            trade.actualRR > 0
                ? "+"
                : ""
        }${
            round(
                trade.actualRR
            ).toFixed(2)
        }R`
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
                t.status ===
                "Closed"
        );


    const wins =
        closed.filter(
            t =>
                t.result ===
                "Win"
        );


    const losses =
        closed.filter(
            t =>
                t.result ===
                "Loss"
        );


    const pending =
        trades.filter(
            t =>
                t.status !==
                "Closed"
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
            (
                sum,
                trade
            ) =>
                sum +
                safeNumber(
                    trade.profit
                ) -
                safeNumber(
                    trade.commission
                ),
            0
        );


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
                (
                    a,
                    b
                ) =>
                    a + b,
                0
            ) /
            actualRRValues.length
            : 0;


    const winningRR =
        wins.length > 0
            ? wins.reduce(
                (
                    sum,
                    trade
                ) =>
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
        `${
            netProfit >= 0
                ? "+"
                : ""
        }$${netProfit.toFixed(2)}`
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
        [...pairs].sort(
            (
                a,
                b
            ) =>
                pairStats[b] -
                pairStats[a]
        )[0];


    const worstPair =
        [...pairs].sort(
            (
                a,
                b
            ) =>
                pairStats[a] -
                pairStats[b]
        )[0];


    const bestSession =
        [...sessions].sort(
            (
                a,
                b
            ) =>
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


    if (!container) {
        return;
    }


    if (!trades.length) {

        container.innerHTML =
            '<div class="loading-card">No trades yet.</div>';

        return;
    }


    container.innerHTML =
        "";


    trades
        .slice(
            0,
            8
        )
        .forEach(
            trade => {

                const status =
                    trade.status ||
                    "Pending";


                const actualRR =
                    status ===
                    "Closed"
                        ? calculateActualRR(
                            trade
                        )
                        : 0;


                const rrText =
                    status ===
                    "Closed"
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
                                ${String(
                                    status
                                ).toLowerCase()}
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
   EDIT TRADE
   ============================================================ */

function editTrade(
    id
) {

    const cleanId =
        String(id);


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
}


function buildEquityChart() {

    const canvas =
        $("equityChart");


    if (!canvas) {
        return;
    }


    const closed =
        trades
            .filter(
                t =>
                    t.status ===
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
                round(
                    balance
                )
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
                                i
                            ) =>
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


    if (!canvas) {
        return;
    }


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
                    ).padStart(
                        2,
                        "0"
                    )}`;


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

                type:
                    "bar",


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


function escapeJS(
    value
) {

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

        "accountBalance",

        "accountRiskPercent"
    ];


    calculationFields.forEach(
        id => {

            const el =
                $(id);


            if (!el) {
                return;
            }


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
       Detect manual pip value.
    */

    const pipValue =
        $("pipValue");


    if (pipValue) {

        pipValue.addEventListener(
            "input",
            () => {

                pipValue.dataset.manual =
                    pipValue.value.trim() !== ""
                        ? "true"
                        : "false";

                updateCalculations();
            }
        );
    }


    /*
       Direction radio buttons.
    */

    document
        .querySelectorAll(
            'input[name="direction"]'
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

        /*
           Even without a form,
           account selector may exist on
           dashboard/history.
        */

        populateAccountSelector();

        return;
    }


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
       Populate accounts BEFORE edit mode.
    */

    populateAccountSelector();


    /*
       Account change.
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
       Edit mode after all form fields
       and accounts exist.
    */

    initializeEditMode();


    /*
       New trade heading.
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


    /*
       If creating a new trade,
       optionally initialize date/time
       to current date/time.

       Editing NEVER gets today's date/time
       because populateForm restores the
       original trade date/time.
    */

    if (
        !params.get("edit")
    ) {

        initializeNewTradeDateTime();
    }


    updateAccountDisplay();

    updateCalculations();


    console.log(
        "✅ Journal form initialized"
    );
}


/* ============================================================
   NEW TRADE DATE/TIME
   ============================================================ */

function initializeNewTradeDateTime() {

    const now =
        new Date();


    /*
       Only populate if empty.
    */

    const dateField =
        $("tradeDate");


    if (
        dateField &&
        !dateField.value
    ) {

        const date =
            [
                now.getFullYear(),

                String(
                    now.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                ),

                String(
                    now.getDate()
                ).padStart(
                    2,
                    "0"
                )
            ].join("-");


        dateField.value =
            date;
    }


    const timeField =
        $("tradeTime");


    if (
        timeField &&
        !timeField.value
    ) {

        timeField.value =
            [
                String(
                    now.getHours()
                ).padStart(
                    2,
                    "0"
                ),

                String(
                    now.getMinutes()
                ).padStart(
                    2,
                    "0"
                )
            ].join(":");
    }
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


        /*
           Account storage changed.
        */

        const accountKeys = [

            "tradingAccounts",

            "accounts",

            "journalAccounts",

            "forexAccounts",

            "myTradingAccounts",

            "userAccounts"
        ];


        if (
            accountKeys.includes(
                event.key
            )
        ) {

            populateAccountSelector();

            updateAccountDisplay();
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

        if (!trade) {
            return;
        }


        const actualRR =
            calculateActualRR(
                trade
            );


        alert(`

PAIR        : ${trade.pair || "-"}

STATUS      : ${trade.status || "-"}

RESULT      : ${trade.result || "-"}

DATE        : ${trade.date || "-"}

TIME        : ${trade.time || "-"}

ENTRY       : ${
    trade.initialEntry ??
    trade.entry ??
    "-"
}

INITIAL SL  : ${
    trade.initialStopLoss ??
    trade.stopLoss ??
    "-"
}

CURRENT SL  : ${
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
}${
    round(
        actualRR
    ).toFixed(2)
}R

PROFIT      : $${safeNumber(
    trade.profit
).toFixed(2)}

COMMISSION  : $${safeNumber(
    trade.commission
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
```
