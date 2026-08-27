/* ============================================================
   GTRADES-AXIS™
   TRADING JOURNAL
   FIRESTORE PERMANENT STORAGE ENGINE
   ============================================================ */

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "firebase/auth";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from "firebase/firestore";


/* ============================================================
   GLOBAL STATE
   ============================================================ */

let trades = [];
let accounts = {};

let currentUser = null;
let editingTrade = null;

let selectedAccountId = "all";

let equityChartInstance = null;
let monthlyChartInstance = null;


/* ============================================================
   COLLECTIONS
   ============================================================ */

function tradesCollection() {

    if (!currentUser) {
        throw new Error("User is not authenticated.");
    }

    return collection(
        db,
        "users",
        currentUser.uid,
        "trades"
    );
}


function accountsCollection() {

    if (!currentUser) {
        throw new Error("User is not authenticated.");
    }

    return collection(
        db,
        "users",
        currentUser.uid,
        "accounts"
    );
}


/* ============================================================
   HELPERS
   ============================================================ */

function val(id) {

    const el = document.getElementById(id);

    return el ? el.value : "";
}


function num(id) {

    const value = parseFloat(val(id));

    return Number.isFinite(value)
        ? value
        : 0;
}


function isChecked(id) {

    const el = document.getElementById(id);

    return el
        ? el.checked
        : false;
}


function setValue(id, value) {

    const el = document.getElementById(id);

    if (el) {
        el.value = value ?? "";
    }
}


function setText(id, value) {

    const el = document.getElementById(id);

    if (el) {
        el.textContent = value ?? "";
    }
}


function money(value) {

    const n = Number(value) || 0;

    return "$" + n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function signedMoney(value) {

    const n = Number(value) || 0;

    return (
        n >= 0 ? "+" : "-"
    ) +
    "$" +
    Math.abs(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


/* ============================================================
   DATE / TIME
   ============================================================ */

function setDefaultDateTime() {

    const now = new Date();

    const dateInput =
        document.getElementById("tradeDate");

    const timeInput =
        document.getElementById("tradeTime");

    if (dateInput && !dateInput.value) {

        const year =
            now.getFullYear();

        const month =
            String(now.getMonth() + 1)
                .padStart(2, "0");

        const day =
            String(now.getDate())
                .padStart(2, "0");

        dateInput.value =
            `${year}-${month}-${day}`;
    }

    if (timeInput && !timeInput.value) {

        timeInput.value =
            now.toTimeString()
                .slice(0, 5);
    }
}


/* ============================================================
   ACCOUNTS
   ============================================================ */

async function loadAccounts() {

    if (!currentUser) return;

    try {

        const snapshot =
            await getDocs(
                accountsCollection()
            );

        accounts = {};

        snapshot.forEach(item => {

            const data = item.data();

            accounts[item.id] = {
                id: item.id,
                ...data
            };
        });

        populateAccountSelectors();

        updateTradeAccountInfo();

        updateAccountPanel();

    } catch (error) {

        console.error(
            "❌ Failed loading accounts:",
            error
        );

        alert(
            "Unable to load your trading accounts."
        );
    }
}


/* ============================================================
   SAVE ACCOUNT
   ============================================================ */

async function saveAccount(account) {

    if (!currentUser) {
        throw new Error(
            "User not authenticated."
        );
    }

    const accountRef =
        doc(
            db,
            "users",
            currentUser.uid,
            "accounts",
            account.id
        );

    await setDoc(
        accountRef,
        {
            ...account,

            userId:
                currentUser.uid,

            updated:
                serverTimestamp()
        },
        {
            merge: true
        }
    );
}


/* ============================================================
   DELETE ACCOUNT
   ============================================================ */

async function deleteAccount(accountId) {

    const account =
        accounts[accountId];

    if (!account) return;

    const linkedTrades =
        trades.filter(
            trade =>
                trade.accountId === accountId
        );

    const message =
        linkedTrades.length
            ? `Delete "${account.name}"?\n\n` +
              `${linkedTrades.length} trade(s) are linked ` +
              `to this account.\n\n` +
              `The trades will be kept but become unassigned.`
            : `Delete "${account.name}"?\n\n` +
              `This cannot be undone.`;

    if (!confirm(message)) {
        return;
    }


    /* -----------------------------------------
       Keep linked trades
    ----------------------------------------- */

    for (const trade of linkedTrades) {

        const tradeRef =
            doc(
                db,
                "users",
                currentUser.uid,
                "trades",
                trade.id
            );

        await updateDoc(
            tradeRef,
            {
                accountId: "",
                account: account.name || ""
            }
        );
    }


    /* -----------------------------------------
       Delete account
    ----------------------------------------- */

    await deleteDoc(
        doc(
            db,
            "users",
            currentUser.uid,
            "accounts",
            accountId
        )
    );


    delete accounts[accountId];


    if (
        selectedAccountId === accountId
    ) {
        selectedAccountId = "all";
    }


    await loadTrades();
    await loadAccounts();

    refreshUI();

    alert(
        "✅ Account deleted successfully."
    );
}


/* ============================================================
   CREATE / UPDATE ACCOUNT
   ============================================================ */

async function createAccountFromForm(e) {

    e.preventDefault();

    if (!currentUser) {

        alert(
            "Please sign in first."
        );

        return;
    }


    const name =
        val("newAccountName").trim();

    const type =
        val("newAccountType");

    const startingBalance =
        Number(
            val("newAccountBalance")
        ) || 0;

    const riskPercent =
        Number(
            val("newAccountRisk")
        ) || 0;

    const currency =
        val("newAccountCurrency")
            .trim()
            .toUpperCase();


    if (!name) {

        alert(
            "Please enter an account name."
        );

        return;
    }


    if (startingBalance < 0) {

        alert(
            "Starting balance cannot be negative."
        );

        return;
    }


    const editingId =
        val("editingAccountId");


    try {

        if (editingId) {

            const oldAccount =
                accounts[editingId];

            if (!oldAccount) {
                throw new Error(
                    "Account not found."
                );
            }


            const oldStarting =
                Number(
                    oldAccount.startingBalance
                ) || 0;

            const oldCurrent =
                Number(
                    oldAccount.currentBalance
                );

            const pnl =
                oldCurrent -
                oldStarting;


            const updatedAccount = {

                ...oldAccount,

                id:
                    editingId,

                name,

                type,

                startingBalance,

                currentBalance:
                    startingBalance + pnl,

                riskPercent,

                currency
            };


            await saveAccount(
                updatedAccount
            );


            accounts[editingId] =
                updatedAccount;

            alert(
                "✅ Account updated successfully."
            );

        } else {

            const accountId =
                "account-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .slice(2, 8);


            const account = {

                id:
                    accountId,

                name,

                type,

                startingBalance,

                currentBalance:
                    startingBalance,

                riskPercent,

                currency,

                created:
                    new Date().toISOString(),

                userId:
                    currentUser.uid
            };


            await saveAccount(
                account
            );


            accounts[accountId] =
                account;


            selectedAccountId =
                accountId;


            alert(
                "✅ Account added successfully."
            );
        }


        clearAccountForm();

        populateAccountSelectors();

        updateTradeAccountInfo();

        calculateAll();

        calculateStatistics();

        loadRecentTrades();

        initializeCharts();

        updateAccountPanel();

        renderAccountManager();


    } catch (error) {

        console.error(
            "❌ Account save failed:",
            error
        );

        alert(
            "Account could not be saved.\n\n" +
            error.message
        );
    }
}


/* ============================================================
   TRADES
   ============================================================ */

async function loadTrades() {

    if (!currentUser) return;

    try {

        const snapshot =
            await getDocs(
                query(
                    tradesCollection(),
                    orderBy(
                        "created",
                        "desc"
                    )
                )
            );


        trades = [];

        snapshot.forEach(item => {

            trades.push({
                id: item.id,
                ...item.data()
            });

        });


        console.log(
            "✅ Firestore trades loaded:",
            trades.length
        );


    } catch (error) {

        /*
         * If orderBy causes an index issue,
         * load without ordering.
         */

        console.warn(
            "Ordered trade query failed. " +
            "Loading without order:",
            error
        );


        try {

            const snapshot =
                await getDocs(
                    tradesCollection()
                );

            trades = [];

            snapshot.forEach(item => {

                trades.push({
                    id: item.id,
                    ...item.data()
                });

            });


            trades.sort(
                (a, b) =>
                    new Date(
                        b.created || 0
                    ) -
                    new Date(
                        a.created || 0
                    )
            );


        } catch (secondError) {

            console.error(
                "❌ Firestore trade loading failed:",
                secondError
            );

            alert(
                "Unable to load your trades.\n\n" +
                secondError.message
            );
        }
    }
}


/* ============================================================
   BUILD TRADE
   ============================================================ */

function buildTradeFromForm(
    isUpdate = false
) {

    const result =
        val("result");


    const accountId =
        val("tradeAccount");

    const account =
        getAccount(accountId);


    const existing =
        editingTrade || {};


    const trade = {

        /*
         * Preserve the original ID
         * during an update.
         */

        ...(existing.id
            ? {
                id: existing.id
            }
            : {}),


        userId:
            currentUser.uid,


        /* TRADE DETAILS */

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

        accountId,

        account:
            account?.name || "",


        /* ACCOUNT */

        accountBalance:
            num("tradeAccountBalance"),

        accountRiskSetting:
            val("tradeRiskSetting"),

        currency:
            val("currencyDisplay"),

        pipValue:
            val("pipValueDisplay"),


        /* HTF */

        htfSwing:
            val("htfSwing"),

        htfInternal:
            val("htfInternal"),


        /* MTF */

        mtfSwing:
            val("mtfSwing"),

        mtfInternal:
            val("mtfInternal"),


        /* LTF */

        ltfStructure:
            val("ltfStructure"),

        liquidity:
            val("liquidity"),

        poi:
            val("poi"),

        entryModel:
            val("entryModel") === "__custom__"
                ? val("entryModelCustom")
                : val("entryModel"),

        entryConfirmation:
            val("entryConfirmation"),

        tradeValid:
            val("tradeValid"),


        /* CONFLUENCES */

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


        /* EXECUTION */

        entry:
            num("entry"),

        stopLoss:
            num("stopLoss"),

        takeProfit:
            num("takeProfit"),

        exitPrice:
            num("exitPrice"),

        // Preserve the original execution prices for later
        // partial/close calculations.
        initialEntry:
            existing.initialEntry ?? num("entry"),

        initialStopLoss:
            existing.initialStopLoss ?? num("stopLoss"),

        initialTakeProfit:
            existing.initialTakeProfit ?? num("takeProfit"),

        initialRR:
            existing.initialRR ?? num("rr"),

        plannedRR:
            existing.plannedRR ?? num("rr"),

        lotSize:
            num("lotSize"),

        balance:
            num("balance"),

        riskSettingAmount:
            num("riskSettingAmount"),

        riskAmount:
            num("riskAmount"),

        risk:
            num("risk"),

        rr:
            num("rr"),

        potentialProfit:
            num("potentialProfit"),

        potentialLoss:
            num("potentialLoss"),

        profit:
            num("profit"),

        commission:
            num("commission"),


        /* RESULT */

        result,

        status:
            result === "Pending"
                ? "Pending"
                : "Closed",


        /* PSYCHOLOGY */

        confidence:
            val("confidence"),

        emotion:
            val("emotion"),

        discipline:
            val("discipline"),

        patience:
            val("patience"),


        /* REVIEW */

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

        notes:
            val("notes"),


        /* CHARTS */

        beforeChart:
            val("beforeChart"),

        duringChart:
            val("duringChart"),

        afterChart:
            val("afterChart"),


        /*
         * PRESERVE CREATED DATE
         */

        created:
            existing.created ||
            new Date().toISOString(),


        updated:
            new Date().toISOString(),


        /*
         * Preserve close timestamp
         * unless this is a newly closed trade.
         */

        closed:
            existing.closed ||
            (
                result === "Pending"
                    ? null
                    : new Date().toISOString()
            )
    };


    return trade;
}


/* ============================================================
   ADD TRADE TO FIRESTORE
   ============================================================ */

async function addTradeToFirestore(
    trade
) {

    if (!currentUser) {

        throw new Error(
            "User is not authenticated."
        );
    }


    /*
     * Do not send undefined values.
     */

    const cleanTrade =
        cleanFirestoreData(
            trade
        );


    /*
     * Remove local ID when creating.
     */

    delete cleanTrade.id;


    const reference =
        await addDoc(
            tradesCollection(),
            cleanTrade
        );


    return reference.id;
}


/* ============================================================
   UPDATE TRADE IN FIRESTORE
   ============================================================ */

async function updateTradeInFirestore(
    tradeId,
    trade
) {

    if (!currentUser) {

        throw new Error(
            "User is not authenticated."
        );
    }


    const cleanTrade =
        cleanFirestoreData(
            trade
        );


    delete cleanTrade.id;


    await updateDoc(

        doc(
            db,
            "users",
            currentUser.uid,
            "trades",
            tradeId
        ),

        cleanTrade
    );
}


/* ============================================================
   DELETE TRADE FROM FIRESTORE
   ============================================================ */

async function deleteTradeFromFirestore(
    tradeId
) {

    if (!currentUser) {

        throw new Error(
            "User is not authenticated."
        );
    }


    await deleteDoc(

        doc(
            db,
            "users",
            currentUser.uid,
            "trades",
            tradeId
        )
    );
}


/* ============================================================
   CLEAN FIRESTORE DATA
   ============================================================ */

function cleanFirestoreData(
    value
) {

    if (
        value === undefined
    ) {

        return null;
    }


    if (
        value === null
    ) {

        return null;
    }


    if (
        Array.isArray(value)
    ) {

        return value.map(
            cleanFirestoreData
        );
    }


    if (
        typeof value === "object"
    ) {

        const result = {};

        Object.entries(value)
            .forEach(
                ([key, item]) => {

                    if (
                        item !== undefined
                    ) {

                        result[key] =
                            cleanFirestoreData(
                                item
                            );
                    }

                }
            );

        return result;
    }


    return value;
}


/* ============================================================
   SAVE TRADE
   ============================================================ */

async function saveTrade(e) {

    e.preventDefault();


    if (!currentUser) {

        alert(
            "You must be signed in."
        );

        return;
    }


    const date =
        val("tradeDate");


    if (!date) {

        alert(
            "Please select a date."
        );

        return;
    }


    const accountId =
        val("tradeAccount");


    if (
        !accountId ||
        !getAccount(accountId)
    ) {

        alert(
            "Please add/select a trading account before saving."
        );

        return;
    }


    const isUpdate =
        editingTrade !== null;


    const trade =
        buildTradeFromForm(
            isUpdate
        );


    const button =
        document.getElementById(
            "saveTradeBtn"
        );


    const originalButtonHTML =
        button
            ? button.innerHTML
            : "";


    try {

        if (button) {

            button.disabled =
                true;

            button.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        }


        /* =====================================================
           UPDATE EXISTING TRADE
        ===================================================== */

        if (
            isUpdate &&
            editingTrade
        ) {

            const index =
                trades.findIndex(
                    t =>
                        t.id ===
                        editingTrade.id
                );


            if (index === -1) {

                throw new Error(
                    "Trade could not be found."
                );
            }


            /*
             * Preserve original close time
             * if trade remains closed.
             */

            if (
                editingTrade.status ===
                    "Closed" &&
                trade.status ===
                    "Closed"
            ) {

                trade.closed =
                    editingTrade.closed ||
                    trade.closed;
            }


            await updateTradeInFirestore(
                editingTrade.id,
                trade
            );


            trades[index] = {

                ...trade,

                id:
                    editingTrade.id
            };


            alert(
                "✅ Trade updated successfully."
            );


            editingTrade =
                null;


            window.location.href =
                "/history";


            return;
        }


        /* =====================================================
           NEW TRADE
        ===================================================== */

        const firestoreId =
            await addTradeToFirestore(
                trade
            );


        const savedTrade = {

            ...trade,

            id:
                firestoreId
        };


        trades.unshift(
            savedTrade
        );


        /*
         * If closed immediately,
         * update account balance.
         */

        if (
            savedTrade.status ===
            "Closed"
        ) {

            await recalculateAccountBalance(
                savedTrade.accountId
            );
        }


        alert(
            "✅ Trade saved permanently to Firebase."
        );


        resetTradeForm();


        await loadTrades();

        await loadAccounts();

        refreshUI();


    } catch (error) {

        console.error(
            "❌ TRADE SAVE ERROR:",
            error
        );


        alert(
            "❌ Trade was NOT saved.\n\n" +
            error.message
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                originalButtonHTML;
        }
    }
}


/* ============================================================
   DELETE TRADE
   ============================================================ */

async function deleteTrade(
    tradeId
) {

    const trade =
        trades.find(
            t =>
                t.id === tradeId
        );


    if (!trade) {

        alert(
            "Trade not found."
        );

        return;
    }


    if (
        !confirm(
            `Delete ${trade.pair || "this trade"}?\n\n` +
            `This will permanently remove the trade from Firebase.`
        )
    ) {

        return;
    }


    try {

        await deleteTradeFromFirestore(
            tradeId
        );


        trades =
            trades.filter(
                t =>
                    t.id !==
                    tradeId
            );


        /*
         * Recalculate account balance
         * from the remaining closed trades.
         */

        if (trade.accountId) {

            await recalculateAccountBalance(
                trade.accountId
            );
        }


        await loadTrades();

        await loadAccounts();

        refreshUI();


        alert(
            "✅ Trade permanently deleted."
        );


    } catch (error) {

        console.error(
            "❌ DELETE TRADE ERROR:",
            error
        );


        alert(
            "❌ Trade could not be deleted.\n\n" +
            error.message
        );
    }
}


/* ============================================================
   CLOSE PENDING TRADE
   ============================================================ */

async function closeTrade(
    tradeId
) {

    const trade =
        trades.find(
            t =>
                t.id === tradeId
        );


    if (!trade) {

        alert(
            "Trade not found."
        );

        return;
    }


    const profitInput =
        prompt(
            "Enter actual Profit / Loss:",
            "0"
        );


    if (
        profitInput === null
    ) {

        return;
    }


    const profit =
        Number(
            profitInput
        ) || 0;


    const commissionInput =
        prompt(
            "Enter Commission:",
            String(
                trade.commission || 0
            )
        );


    if (
        commissionInput === null
    ) {

        return;
    }


    const commission =
        Number(
            commissionInput
        ) || 0;

    const exitPriceInput = prompt(
        "Exit / Close Price (leave blank if not applicable):",
        String(trade.exitPrice || "")
    );

    const exitPrice = exitPriceInput === null
        ? Number(trade.exitPrice) || 0
        : (Number(exitPriceInput) || 0);


    const riskAmount =
        Number(
            trade.riskAmount
        ) || 0;


    let result =
        "Breakeven";


    if (profit > 0) {

        result = "Win";

    } else if (profit < 0) {

        result = "Loss";
    }


    /*
     * CLOSED RR
     *
     * WIN:
     * Keep the ORIGINAL planned RR.
     *
     * LOSS:
     * Use the ACTUAL loss divided by the
     * original risk amount. This prevents a
     * -0.42R loss from being displayed as -4R.
     *
     * BREAKEVEN:
     * Always 0R.
     *
     * PARTIAL:
     * If an exitPrice exists, calculate the
     * realized R from the original entry/SL.
     * Otherwise fall back to actual P/L ÷ risk.
     */
    let actualRR = 0;

    const plannedRR = Number(
        trade.initialRR ??
        trade.plannedRR ??
        trade.rr
    ) || 0;

    if (result === "Win") {
        actualRR = Math.abs(plannedRR);
    } else if (result === "Loss") {
        actualRR = riskAmount > 0
            ? -(Math.abs(profit) / riskAmount)
            : 0;
    } else if (result === "Breakeven") {
        actualRR = 0;
    } else if (result === "Partial") {
        const exitPrice = Number(trade.exitPrice) || 0;
        const originalEntry = Number(trade.initialEntry ?? trade.entry) || 0;
        const originalSL = Number(trade.initialStopLoss ?? trade.stopLoss) || 0;
        const priceRisk = Math.abs(originalEntry - originalSL);

        if (exitPrice && originalEntry && priceRisk) {
            const move = trade.direction === "SELL"
                ? originalEntry - exitPrice
                : exitPrice - originalEntry;

            actualRR = move / priceRisk;
        } else if (riskAmount > 0) {
            actualRR = profit / riskAmount;
        }
        actualRR = Math.round(actualRR * 100) / 100;
    }


    const updatedTrade = {

        ...trade,

        profit,

        commission,

        exitPrice,

        result,

        status:
            "Closed",

        rr:
            actualRR,

        closed:
            new Date().toISOString(),

        updated:
            new Date().toISOString()
    };


    try {

        await updateTradeInFirestore(
            tradeId,
            updatedTrade
        );


        /*
         * Recalculate account from
         * ALL closed trades.
         */

        await recalculateAccountBalance(
            trade.accountId
        );


        await loadTrades();

        await loadAccounts();

        refreshUI();


        alert(
            "✅ Trade closed and saved permanently."
        );


    } catch (error) {

        console.error(
            "❌ CLOSE TRADE ERROR:",
            error
        );


        alert(
            "❌ Trade could not be closed.\n\n" +
            error.message
        );
    }
}


/* ============================================================
   RECALCULATE ACCOUNT BALANCE
   ============================================================ */

async function recalculateAccountBalance(
    accountId
) {

    if (!accountId) return;


    const account =
        accounts[accountId];


    if (!account) return;


    const starting =
        Number(
            account.startingBalance
        ) || 0;


    const accountTrades =
        trades.filter(
            trade =>
                trade.accountId ===
                    accountId &&
                trade.status ===
                    "Closed"
        );


    let pnl = 0;


    accountTrades.forEach(
        trade => {

            const profit =
                Number(
                    trade.profit
                ) || 0;

            const commission =
                Number(
                    trade.commission
                ) || 0;


            pnl +=
                profit -
                commission;
        }
    );


    const newBalance =
        starting + pnl;


    const updatedAccount = {

        ...account,

        currentBalance:
            newBalance,

        updated:
            new Date().toISOString()
    };


    await saveAccount(
        updatedAccount
    );


    accounts[accountId] =
        updatedAccount;
}


/* ============================================================
   RESET FORM
   ============================================================ */

function resetTradeForm() {

    const form =
        document.getElementById(
            "tradeForm"
        );


    if (form) {

        form.reset();
    }


    editingTrade =
        null;


    setDefaultDateTime();


    populateAccountSelectors();


    const firstAccount =
        Object.values(
            accounts
        )[0];


    if (firstAccount) {

        setValue(
            "tradeAccount",
            selectedAccountId !==
                "all"
                ? selectedAccountId
                : firstAccount.id
        );
    }


    updateTradeAccountInfo();

    calculateAll();


    const button =
        document.getElementById(
            "saveTradeBtn"
        );


    if (button) {

        button.innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Save Trade';

        button.className =
            "btn-primary";
    }
}


/* ============================================================
   ACCOUNT HELPERS
   ============================================================ */

function getAccount(
    accountId
) {

    return (
        accounts[accountId] ||
        null
    );
}


function populateAccountSelectors() {

    const filter =
        document.getElementById(
            "accountFilter"
        );


    const tradeAccount =
        document.getElementById(
            "tradeAccount"
        );


    const list =
        Object.values(
            accounts
        );


    if (filter) {

        filter.innerHTML =
            '<option value="all">All Accounts</option>';


        list.forEach(
            account => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    account.id;

                option.textContent =
                    account.name;

                filter.appendChild(
                    option
                );
            }
        );


        if (
            selectedAccountId !==
                "all" &&
            !accounts[
                selectedAccountId
            ]
        ) {

            selectedAccountId =
                "all";
        }


        filter.value =
            selectedAccountId;
    }


    if (tradeAccount) {

        const previous =
            tradeAccount.value;


        tradeAccount.innerHTML =
            '<option value="">Select an account</option>';


        list.forEach(
            account => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    account.id;

                option.textContent =
                    account.name;

                tradeAccount.appendChild(
                    option
                );
            }
        );


        if (
            previous &&
            accounts[previous]
        ) {

            tradeAccount.value =
                previous;

        } else if (
            selectedAccountId !==
                "all" &&
            accounts[
                selectedAccountId
            ]
        ) {

            tradeAccount.value =
                selectedAccountId;

        } else if (
            list.length
        ) {

            tradeAccount.value =
                list[0].id;
        }
    }
}


/* ============================================================
   ACCOUNT INFO
   ============================================================ */

function updateTradeAccountInfo() {

    const accountSelect =
        document.getElementById(
            "tradeAccount"
        );


    if (!accountSelect) {
        return;
    }


    const account =
        getAccount(
            accountSelect.value
        );


    if (!account) {

        setValue(
            "tradeAccountBalance",
            ""
        );

        setValue(
            "tradeRiskSetting",
            ""
        );

        setValue(
            "currencyDisplay",
            ""
        );

        setValue(
            "balance",
            ""
        );

        return;
    }


    setValue(
        "tradeAccountBalance",
        money(
            account.currentBalance
        )
    );


    setValue(
        "tradeRiskSetting",
        Number(
            account.riskPercent || 0
        ).toFixed(2) +
        "%"
    );


    setValue(
        "currencyDisplay",
        account.currency ||
        "USD"
    );


    setValue(
        "balance",
        Number(
            account.currentBalance
        ) || 0
    );


    calculateAll();
}


/* ============================================================
   ACCOUNT PANEL
   ============================================================ */

function updateAccountPanel() {

    const account =
        selectedAccountId === "all"
            ? null
            : getAccount(
                selectedAccountId
            );


    if (!account) {

        setText(
            "accountStartingBalance",
            money(
                Object.values(
                    accounts
                ).reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        (
                            Number(
                                item.startingBalance
                            ) || 0
                        ),
                    0
                )
            )
        );


        setText(
            "accountCurrentBalance",
            money(
                Object.values(
                    accounts
                ).reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        (
                            Number(
                                item.currentBalance
                            ) || 0
                        ),
                    0
                )
            )
        );


        setText(
            "accountRiskSetting",
            "—"
        );

        return;
    }


    setText(
        "accountStartingBalance",
        money(
            account.startingBalance
        )
    );


    setText(
        "accountCurrentBalance",
        money(
            account.currentBalance
        )
    );


    setText(
        "accountRiskSetting",
        Number(
            account.riskPercent || 0
        ).toFixed(2) +
        "%"
    );


    const pnl =
        Number(
            account.currentBalance
        ) -
        Number(
            account.startingBalance
        );


    setText(
        "accountPnL",
        signedMoney(pnl)
    );


    const accountTrades =
        trades.filter(
            trade =>
                trade.accountId ===
                account.id
        );


    const consistency =
        calculateConsistencyScore(
            accountTrades
        );


    setText(
        "accountConsistency",
        consistency.toFixed(1) +
        "%"
    );
}


/* ============================================================
   CALCULATIONS
   ============================================================ */

function calculateAll() {

    const balance =
        num("balance");


    const riskSetting =
        parseFloat(
            val("tradeRiskSetting")
        ) || 0;


    const entry =
        num("entry");

    const stopLoss =
        num("stopLoss");

    const takeProfit =
        num("takeProfit");

    const lotSize =
        num("lotSize");


    /*
     * Risk setting amount
     */

    const riskSettingAmount =
        balance *
        (
            riskSetting /
            100
        );


    setValue(
        "riskSettingAmount",
        riskSettingAmount
            .toFixed(2)
    );


    /*
     * Actual price risk
     */

    const priceRisk =
        Math.abs(
            entry -
            stopLoss
        );


    /*
     * Simple pip/point value.
     *
     * Preserve existing calculation
     * where possible.
     */

    let pipValue =
        0;


    const pair =
        val("pair")
            .toUpperCase();


    if (
        pair.includes("XAU") ||
        pair.includes("GOLD")
    ) {

        pipValue =
            lotSize *
            100;

    } else {

        pipValue =
            lotSize *
            100000;
    }


    const actualRisk =
        priceRisk *
        pipValue;


    const reward =
        Math.abs(
            takeProfit -
            entry
        );


    const potentialProfit =
        reward *
        pipValue;


    const potentialLoss =
        actualRisk;


    const riskPercent =
        balance > 0
            ? (
                actualRisk /
                balance
            ) *
            100
            : 0;


    const rr =
        actualRisk > 0
            ? potentialProfit /
              actualRisk
            : 0;


    setValue(
        "riskAmount",
        actualRisk.toFixed(2)
    );


    setValue(
        "risk",
        riskPercent.toFixed(2)
    );


    setValue(
        "rr",
        rr.toFixed(2)
    );


    setValue(
        "potentialProfit",
        potentialProfit.toFixed(2)
    );


    setValue(
        "potentialLoss",
        potentialLoss.toFixed(2)
    );


    setValue(
        "pipValueDisplay",
        pipValue.toFixed(2)
    );


    setText(
        "summaryRiskSetting",
        money(
            riskSettingAmount
        )
    );


    setText(
        "summaryRiskAmount",
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
        "summaryPotentialProfit",
        money(
            potentialProfit
        )
    );


    setText(
        "summaryPotentialLoss",
        money(
            potentialLoss
        )
    );


    setText(
        "summaryRR",
        rr.toFixed(2)
    );
}


/* ============================================================
   STATISTICS
   ============================================================ */

function getFilteredTrades() {

    if (
        selectedAccountId ===
        "all"
    ) {

        return [
            ...trades
        ];
    }


    return trades.filter(
        trade =>
            trade.accountId ===
            selectedAccountId
    );
}


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
                Number(
                    trade.profit
                ) > 0
        );


    const losses =
        closed.filter(
            trade =>
                Number(
                    trade.profit
                ) < 0
        );


    const pending =
        filtered.filter(
            trade =>
                trade.status ===
                "Pending"
        );


    const totalProfit =
        closed.reduce(
            (
                sum,
                trade
            ) =>
                sum +
                (
                    Number(
                        trade.profit
                    ) || 0
                ),
            0
        );


    const commissions =
        closed.reduce(
            (
                sum,
                trade
            ) =>
                sum +
                (
                    Number(
                        trade.commission
                    ) || 0
                ),
            0
        );


    const netProfit =
        totalProfit -
        commissions;


    const grossProfit =
        wins.reduce(
            (
                sum,
                trade
            ) =>
                sum +
                (
                    Number(
                        trade.profit
                    ) || 0
                ),
            0
        );


    const grossLoss =
        Math.abs(
            losses.reduce(
                (
                    sum,
                    trade
                ) =>
                    sum +
                    (
                        Number(
                            trade.profit
                        ) || 0
                    ),
                0
            )
        );


    const profitFactor =
        grossLoss > 0
            ? grossProfit /
              grossLoss
            : grossProfit > 0
                ? Infinity
                : 0;


    const winRate =
        closed.length > 0
            ? (
                wins.length /
                closed.length
            ) *
            100
            : 0;


    const averageRR =
        closed.length > 0
            ? closed.reduce(
                (
                    sum,
                    trade
                ) =>
                    sum +
                    (
                        Number(
                            trade.rr
                        ) || 0
                    ),
                0
            ) /
            closed.length
            : 0;


    const consistency =
        calculateConsistencyScore(
            closed
        );


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
        "pendingCount",
        pending.length
    );


    setText(
        "winRate",
        winRate.toFixed(1) +
        "%"
    );


    setText(
        "averageRR",
        averageRR.toFixed(2)
    );


    setText(
        "netProfit",
        signedMoney(
            netProfit
        )
    );


    setText(
        "profitFactor",
        Number.isFinite(
            profitFactor
        )
            ? profitFactor.toFixed(2)
            : "∞"
    );


    setText(
        "consistencyScore",
        consistency.toFixed(1) +
        "%"
    );


    /*
     * Maximum drawdown
     */

    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;


    closed
        .slice()
        .sort(
            (a, b) =>
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
                    (
                        Number(
                            trade.profit
                        ) || 0
                    ) -
                    (
                        Number(
                            trade.commission
                        ) || 0
                    );


                peak =
                    Math.max(
                        peak,
                        equity
                    );


                const dd =
                    peak -
                    equity;


                maxDrawdown =
                    Math.max(
                        maxDrawdown,
                        dd
                    );
            }
        );


    setText(
        "maxDrawdown",
        money(
            maxDrawdown
        )
    );


    /*
     * Streak
     */

    let streak = 0;


    for (
        let i = closed.length - 1;
        i >= 0;
        i--
    ) {

        if (
            Number(
                closed[i].profit
            ) > 0
        ) {

            streak++;

        } else {

            break;
        }
    }


    setText(
        "streak",
        streak
    );


    /*
     * Month count
     */

    const now =
        new Date();


    const month =
        now.getMonth();

    const year =
        now.getFullYear();


    const monthCount =
        filtered.filter(
            trade => {

                if (!trade.date)
                    return false;

                const d =
                    new Date(
                        trade.date
                    );

                return (
                    d.getMonth() ===
                        month &&
                    d.getFullYear() ===
                        year
                );
            }
        ).length;


    setText(
        "monthCount",
        monthCount
    );


    setText(
        "accountPnL",
        signedMoney(
            netProfit
        )
    );
}


/* ============================================================
   CONSISTENCY
   ============================================================ */

function calculateConsistencyScore(
    sourceTrades
) {

    const closed =
        (
            sourceTrades ||
            []
        ).filter(
            trade =>
                trade.status ===
                "Closed"
        );


    if (!closed.length) {
        return 0;
    }


    const scoreMap = {

        Excellent:
            10,

        Good:
            8,

        Average:
            5,

        Poor:
            2
    };


    const emotionMap = {

        Calm:
            10,

        Confident:
            10,

        Fear:
            4,

        Greed:
            3,

        FOMO:
            2,

        Revenge:
            1
    };


    let total = 0;


    closed.forEach(
        trade => {

            const followedPlan =
                trade.tradeValid ===
                "Yes"
                    ? 10
                    : 0;


            const patience =
                scoreMap[
                    trade.patience
                ] ?? 5;


            const discipline =
                scoreMap[
                    trade.discipline
                ] ?? 5;


            const emotionalControl =
                emotionMap[
                    trade.emotion
                ] ?? 5;


            total +=
                followedPlan +
                patience +
                discipline +
                emotionalControl;
        }
    );


    return (
        total /
        (
            closed.length *
            40
        )
    ) *
    100;
}


/* ============================================================
   RECENT TRADES
   ============================================================ */

function loadRecentTrades() {

    const container =
        document.getElementById(
            "recentTrades"
        );


    if (!container) return;


    const pending =
        getFilteredTrades()
            .filter(
                trade =>
                    trade.status ===
                    "Pending"
            )
            .slice(
                0,
                10
            );


    if (!pending.length) {

        container.innerHTML =
            '<div class="account-empty">' +
            '<strong>No pending trades</strong>' +
            'Your pending trades will appear here.' +
            '</div>';

        return;
    }


    container.innerHTML =
        pending.map(
            trade => `

            <div class="trade-row">

                <div>

                    <strong>
                        ${escapeHtml(
                            trade.pair ||
                            "-"
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            trade.direction ||
                            ""
                        )}
                    </small>

                </div>

                <span class="status pending">
                    Pending
                </span>

                <button
                    class="btn"
                    data-close-trade="${trade.id}"
                >
                    Close
                </button>

                <button
                    class="btn"
                    data-delete-trade="${trade.id}"
                >
                    Delete
                </button>

            </div>

        `
        ).join("");


    container
        .querySelectorAll(
            "[data-close-trade]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        closeTrade(
                            button.dataset
                                .closeTrade
                        )
                );
            }
        );


    container
        .querySelectorAll(
            "[data-delete-trade]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        deleteTrade(
                            button.dataset
                                .deleteTrade
                        )
                );
            }
        );
}


/* ============================================================
   HTML ESCAPE
   ============================================================ */

function escapeHtml(
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


/* ============================================================
   ENTRY MODEL
   ============================================================ */

function syncEntryModelInput() {

    const select =
        document.getElementById(
            "entryModel"
        );

    const custom =
        document.getElementById(
            "entryModelCustom"
        );


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
            "block";

    } else {

        custom.style.display =
            "none";

        custom.value =
            "";
    }
}


/* ============================================================
   EDIT TRADE
   ============================================================ */

function populateForm(
    trade
) {

    editingTrade =
        trade;


    setValue(
        "tradeDate",
        trade.date
    );

    setValue(
        "tradeTime",
        trade.time
    );

    setValue(
        "pair",
        trade.pair
    );

    setValue(
        "direction",
        trade.direction
    );

    setValue(
        "session",
        trade.session
    );

    setValue(
        "broker",
        trade.broker
    );

    setValue(
        "tradeAccount",
        trade.accountId
    );

    setValue(
        "htfSwing",
        trade.htfSwing
    );

    setValue(
        "htfInternal",
        trade.htfInternal
    );

    setValue(
        "mtfSwing",
        trade.mtfSwing
    );

    setValue(
        "mtfInternal",
        trade.mtfInternal
    );

    setValue(
        "ltfStructure",
        trade.ltfStructure
    );

    setValue(
        "liquidity",
        trade.liquidity
    );

    setValue(
        "poi",
        trade.poi
    );


    const standardModels = [
        "LC-2A",
        "LC-1",
        "LTF RE",
        "MTF RE"
    ];


    const entryModel =
        document.getElementById(
            "entryModel"
        );


    const customModel =
        document.getElementById(
            "entryModelCustom"
        );


    if (
        entryModel
    ) {

        if (
            standardModels.includes(
                trade.entryModel
            )
        ) {

            entryModel.value =
                trade.entryModel;

            if (customModel) {
                customModel.style.display =
                    "none";
            }

        } else {

            entryModel.value =
                "__custom__";

            if (customModel) {

                customModel.style.display =
                    "block";

                customModel.value =
                    trade.entryModel ||
                    "";
            }
        }
    }


    setValue(
        "entryConfirmation",
        trade.entryConfirmation
    );

    setValue(
        "tradeValid",
        trade.tradeValid
    );


    const map = {

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
        map
    ).forEach(
        ([key, id]) => {

            const checkbox =
                document.getElementById(
                    id
                );

            if (checkbox) {

                checkbox.checked =
                    !!(
                        trade.confluences &&
                        trade.confluences[key]
                    );
            }
        }
    );


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

    setValue(
        "exitPrice",
        trade.exitPrice ?? ""
    );

    setValue(
        "lotSize",
        trade.lotSize
    );

    setValue(
        "profit",
        trade.profit
    );

    setValue(
        "commission",
        trade.commission
    );

    setValue(
        "result",
        trade.result
    );


    setValue(
        "confidence",
        trade.confidence
    );

    setValue(
        "emotion",
        trade.emotion
    );

    setValue(
        "discipline",
        trade.discipline
    );

    setValue(
        "patience",
        trade.patience
    );


    setValue(
        "tradeSummary",
        trade.tradeSummary
    );

    setValue(
        "strengths",
        trade.strengths
    );

    setValue(
        "mistakes",
        trade.mistakes
    );

    setValue(
        "lessonLearned",
        trade.lessonLearned
    );

    setValue(
        "improvementPlan",
        trade.improvementPlan
    );

    setValue(
        "notes",
        trade.notes
    );


    setValue(
        "beforeChart",
        trade.beforeChart
    );

    setValue(
        "duringChart",
        trade.duringChart
    );

    setValue(
        "afterChart",
        trade.afterChart
    );


    const button =
        document.getElementById(
            "saveTradeBtn"
        );


    if (button) {

        button.innerHTML =
            '<i class="fa-solid fa-pen"></i> Update Trade';

        button.className =
            "btn-update";
    }


    const header =
        document.querySelector(
            ".page-header h1"
        );


    if (header) {

        header.innerHTML =
            '<i class="fa-solid fa-pen"></i> Edit Trade';
    }


    updateTradeAccountInfo();

    calculateAll();
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
        document.getElementById(
            "equityChart"
        );


    if (!canvas) return;


    const closed =
        getFilteredTrades()
            .filter(
                trade =>
                    trade.status ===
                    "Closed"
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.closed ||
                        a.date
                    ) -
                    new Date(
                        b.closed ||
                        b.date
                    )
            );


    let balance = 0;


    if (
        selectedAccountId !==
        "all"
    ) {

        balance =
            Number(
                getAccount(
                    selectedAccountId
                )?.startingBalance
            ) || 0;

    } else {

        balance =
            Object.values(
                accounts
            ).reduce(
                (
                    sum,
                    account
                ) =>
                    sum +
                    (
                        Number(
                            account.startingBalance
                        ) || 0
                    ),
                0
            );
    }


    const labels = [
        "Start"
    ];

    const values = [
        balance
    ];


    closed.forEach(
        trade => {

            balance +=
                (
                    Number(
                        trade.profit
                    ) || 0
                ) -
                (
                    Number(
                        trade.commission
                    ) || 0
                );


            labels.push(
                trade.date ||
                "-"
            );

            values.push(
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

                    labels,

                    datasets: [{

                        label:
                            "Equity",

                        data:
                            values,

                        tension:
                            0.3,

                        borderWidth:
                            2,

                        fill:
                            false
                    }]
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
        document.getElementById(
            "monthlyChart"
        );


    if (!canvas) return;


    const monthly = {};


    getFilteredTrades()
        .filter(
            trade =>
                trade.status ===
                "Closed"
        )
        .forEach(
            trade => {

                const key =
                    String(
                        trade.date ||
                        ""
                    ).slice(
                        0,
                        7
                    );


                if (!key) return;


                if (
                    !monthly[key]
                ) {

                    monthly[key] =
                        0;
                }


                monthly[key] +=

                    (
                        Number(
                            trade.profit
                        ) || 0
                    ) -

                    (
                        Number(
                            trade.commission
                        ) || 0
                    );
            }
        );


    const labels =
        Object.keys(
            monthly
        ).sort();


    const values =
        labels.map(
            label =>
                monthly[label]
        );


    monthlyChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels,

                    datasets: [{

                        label:
                            "Net P/L",

                        data:
                            values
                    }]
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

    calculateStatistics();

    loadRecentTrades();

    initializeCharts();

    updateAccountPanel();
}


/* ============================================================
   ACCOUNT MANAGER UI
   ============================================================ */

function renderAccountManager() {

    const container =
        document.getElementById(
            "accountManagerList"
        );


    if (!container) return;


    const list =
        Object.values(
            accounts
        );


    if (!list.length) {

        container.innerHTML =
            '<div class="account-empty">' +
            '<strong>No trading accounts</strong>' +
            'Add your first account below.' +
            '</div>';

        return;
    }


    container.innerHTML =
        list.map(
            account => `

            <div class="account-manager-item">

                <div class="account-manager-main">

                    <div class="account-manager-name">
                        ${escapeHtml(
                            account.name
                        )}
                    </div>

                    <div class="account-manager-meta">
                        ${escapeHtml(
                            account.type ||
                            "Account"
                        )}
                        •
                        ${escapeHtml(
                            account.currency ||
                            "USD"
                        )}
                        •
                        ${money(
                            account.currentBalance
                        )}
                    </div>

                </div>

                <div class="account-manager-actions">

                    <button
                        type="button"
                        data-edit-account="${account.id}"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button
                        type="button"
                        class="delete-account-btn"
                        data-delete-account="${account.id}"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </div>

            </div>

        `
        ).join("");


    container
        .querySelectorAll(
            "[data-edit-account]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        editAccount(
                            button.dataset
                                .editAccount
                        )
                );
            }
        );


    container
        .querySelectorAll(
            "[data-delete-account]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        deleteAccount(
                            button.dataset
                                .deleteAccount
                        )
                );
            }
        );
}


function editAccount(
    accountId
) {

    const account =
        getAccount(
            accountId
        );


    if (!account) return;


    setValue(
        "editingAccountId",
        account.id
    );

    setValue(
        "newAccountName",
        account.name
    );

    setValue(
        "newAccountType",
        account.type
    );

    setValue(
        "newAccountBalance",
        account.startingBalance
    );

    setValue(
        "newAccountRisk",
        account.riskPercent
    );

    setValue(
        "newAccountCurrency",
        account.currency
    );


    const title =
        document.getElementById(
            "accountModalTitle"
        );


    const submit =
        document.getElementById(
            "accountSubmitBtn"
        );


    if (title) {

        title.textContent =
            "Edit Trading Account";
    }


    if (submit) {

        submit.innerHTML =
            '<i class="fa-solid fa-pen"></i> Save Account';
    }
}


function clearAccountForm() {

    const form =
        document.getElementById(
            "accountForm"
        );


    if (form) {

        form.reset();
    }


    setValue(
        "editingAccountId",
        ""
    );


    setValue(
        "newAccountRisk",
        "1"
    );


    setValue(
        "newAccountCurrency",
        "USD"
    );


    const title =
        document.getElementById(
            "accountModalTitle"
        );


    const submit =
        document.getElementById(
            "accountSubmitBtn"
        );


    if (title) {

        title.textContent =
            "Manage Trading Accounts";
    }


    if (submit) {

        submit.innerHTML =
            '<i class="fa-solid fa-plus"></i> Create Account';
    }
}


function openAccountModal(
    accountId = null
) {

    const modal =
        document.getElementById(
            "accountModal"
        );


    if (!modal) return;


    clearAccountForm();

    renderAccountManager();


    modal.classList.add(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    if (
        accountId &&
        accounts[accountId]
    ) {

        editAccount(
            accountId
        );
    }
}


function closeAccountModal() {

    const modal =
        document.getElementById(
            "accountModal"
        );


    if (!modal) return;


    modal.classList.remove(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    clearAccountForm();
}


/* ============================================================
   EVENTS
   ============================================================ */

function setupEvents() {

    const form =
        document.getElementById(
            "tradeForm"
        );


    if (form) {

        form.addEventListener(
            "submit",
            saveTrade
        );


        form.addEventListener(
            "reset",
            () => {

                setTimeout(
                    () => {

                        setDefaultDateTime();

                        populateAccountSelectors();

                        updateTradeAccountInfo();

                        calculateAll();

                    },
                    20
                );
            }
        );
    }


    const tradeAccount =
        document.getElementById(
            "tradeAccount"
        );


    if (tradeAccount) {

        tradeAccount.addEventListener(
            "change",
            updateTradeAccountInfo
        );
    }


    const accountFilter =
        document.getElementById(
            "accountFilter"
        );


    if (accountFilter) {

        accountFilter.addEventListener(
            "change",
            () => {

                selectedAccountId =
                    accountFilter.value;


                if (
                    selectedAccountId !==
                    "all"
                ) {

                    setValue(
                        "tradeAccount",
                        selectedAccountId
                    );
                }


                updateTradeAccountInfo();

                calculateStatistics();

                loadRecentTrades();

                initializeCharts();

                updateAccountPanel();
            }
        );
    }


    [
        "pair",
        "entry",
        "stopLoss",
        "takeProfit",
        "lotSize"
    ]
    .forEach(
        id => {

            const el =
                document.getElementById(
                    id
                );


            if (el) {

                el.addEventListener(
                    "input",
                    calculateAll
                );

                el.addEventListener(
                    "change",
                    calculateAll
                );
            }
        }
    );


    document
        .getElementById(
            "entryModel"
        )
        ?.addEventListener(
            "change",
            syncEntryModelInput
        );


    document
        .getElementById(
            "addAccountBtn"
        )
        ?.addEventListener(
            "click",
            () =>
                openAccountModal()
        );


    document
        .getElementById(
            "closeAccountModal"
        )
        ?.addEventListener(
            "click",
            closeAccountModal
        );


    document
        .getElementById(
            "cancelAccountBtn"
        )
        ?.addEventListener(
            "click",
            closeAccountModal
        );


    document
        .getElementById(
            "accountForm"
        )
        ?.addEventListener(
            "submit",
            createAccountFromForm
        );


    document
        .getElementById(
            "accountModal"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "accountModal"
                ) {

                    closeAccountModal();
                }
            }
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeAccountModal();
            }
        }
    );


    document
        .getElementById(
            "logoutBtn"
        )
        ?.addEventListener(
            "click",
            async () => {

                if (
                    confirm(
                        "Logout?"
                    )
                ) {

                    await signOut(
                        auth
                    );

                    window.location.reload();
                }
            }
        );


    /*
     * Scroll top
     */

    const scrollBtn =
        document.getElementById(
            "scrollTopBtn"
        );


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

                window.scrollTo({
                    top: 0,
                    behavior:
                        "smooth"
                });
            }
        );
    }
}


/* ============================================================
   EDIT URL
   ============================================================ */

function checkEditTrade() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const editId =
        params.get(
            "edit"
        );


    if (!editId) {
        return;
    }


    const trade =
        trades.find(
            item =>
                item.id ===
                editId
        );


    if (!trade) {

        console.warn(
            "Trade to edit not found:",
            editId
        );

        return;
    }


    populateForm(
        trade
    );
}


/* ============================================================
   FIREBASE AUTH
   ============================================================ */

onAuthStateChanged(
    auth,
    async user => {

        const app =
            document.getElementById(
                "app"
            );


        if (!user) {

            currentUser =
                null;


            if (app) {

                app.classList.remove(
                    "loading"
                );

                app.classList.add(
                    "locked"
                );
            }


            return;
        }


        currentUser =
            user;


        try {

            /*
             * Load everything from Firebase.
             */

            await loadAccounts();

            await loadTrades();


            populateAccountSelectors();

            updateTradeAccountInfo();

            calculateAll();

            calculateStatistics();

            loadRecentTrades();

            initializeCharts();

            updateAccountPanel();

            renderAccountManager();

            setupEvents();

            setDefaultDateTime();

            checkEditTrade();


            if (app) {

                app.classList.remove(
                    "loading"
                );
            }


            console.log(
                "✅ GTRADES-AXIS™ Journal connected to Firestore."
            );


        } catch (error) {

            console.error(
                "❌ Journal initialization failed:",
                error
            );


            alert(
                "Journal could not connect to Firebase.\n\n" +
                error.message
            );
        }
    }
);