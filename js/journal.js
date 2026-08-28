// ============================================================
// GTRADES-AXIS™ JOURNAL ENGINE
// Saves to: users/{userId}/backtestTrades/
// Works for ALL users (students AND admin)
// ============================================================

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
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    where

} from "firebase/firestore";

// --------------------------------------------------------------
// GLOBAL STATE
// --------------------------------------------------------------
let trades = [];
let accounts = {};
let currentUser = null;
let editingTrade = null;
let selectedAccountId = "all";
let equityChartInstance = null;
let monthlyChartInstance = null;

// --------------------------------------------------------------
// COLLECTION HELPERS
// --------------------------------------------------------------

// TOP-LEVEL trades collection (where admin panel reads from)
function tradesCollection() {
    if (!currentUser) throw new Error("User is not authenticated.");
    return collection(db, "users", currentUser.uid, "backtestTrades");
}

// Trades stored at: users/{userId}/backtestTrades/
function getTradesCollection() {
    if (!currentUser) throw new Error("User is not authenticated.");
    return collection(db, "users", currentUser.uid, "backtestTrades");
}
}

// Accounts stored under user for privacy
function accountsCollection() {
    if (!currentUser) throw new Error("User is not authenticated.");
    return collection(db, "users", currentUser.uid, "journalAccounts");
}

// Account document reference
function getAccountDoc(accountId) {
    if (!currentUser) throw new Error("User is not authenticated.");
    return doc(db, "users", currentUser.uid, "journalAccounts", accountId);
}

// Trade document reference
function getTradeDoc(tradeId) {
    if (!currentUser) throw new Error("User is not authenticated.");
    return doc(db, "users", currentUser.uid, "backtestTrades", tradeId);
}
// --------------------------------------------------------------
// HELPERS
// --------------------------------------------------------------
function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
}

function num(id) {
    const n = parseFloat(val(id));
    return Number.isFinite(n) ? n : 0;
}

function isChecked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value !== undefined && value !== null ? value : "";
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text !== undefined && text !== null ? text : "";
}

function money(value) {
    const n = Number(value) || 0;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function signedMoney(value) {
    const n = Number(value) || 0;
    return (n >= 0 ? "+" : "-") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getLocalDate() {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}

function getLocalTime() {
    const now = new Date();
    return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
}

function normalizeResult(value) {
    const v = String(value || "Pending").trim().toLowerCase();
    if (v === "win") return "Win";
    if (v === "loss") return "Loss";
    if (v === "breakeven" || v === "break even" || v === "break-even") return "Breakeven";
    if (v === "partial") return "Partial";
    return "Pending";
}

function calculatePriceRR(entry, stopLoss, exitPrice, direction) {
    entry = Number(entry);
    stopLoss = Number(stopLoss);
    exitPrice = Number(exitPrice);
    if (!Number.isFinite(entry) || !Number.isFinite(stopLoss) || !Number.isFinite(exitPrice)) return 0;
    const riskDistance = Math.abs(entry - stopLoss);
    if (riskDistance <= 0) return 0;
    let rewardDistance = (direction === "SELL") ? (entry - exitPrice) : (exitPrice - entry);
    return rewardDistance / riskDistance;
}

function calculateOutcomeRR(params) {
    const { result, actualProfit, riskAmount, plannedRR, entry, stopLoss, exitPrice, direction, partialPercent } = params;
    const r = normalizeResult(result);
    const profit = Number(actualProfit) || 0;
    const risk = Number(riskAmount) || 0;
    const planned = Number(plannedRR) || 0;
    const exit = Number(exitPrice) || 0;
    const entryPrice = Number(entry) || 0;
    const sl = Number(stopLoss) || 0;

    if (r === "Pending") return 0;
    if (r === "Breakeven") return 0;
    if (r === "Win") return planned > 0 ? planned : 1;
    if (r === "Loss") {
        if (risk <= 0) return 0;
        return -(Math.abs(profit) / risk);
    }
    if (r === "Partial") {
        if (!Number.isFinite(entryPrice) || !Number.isFinite(sl) || !Number.isFinite(exit)) return 0;
        const priceRR = calculatePriceRR(entryPrice, sl, exit, direction);
        const percentage = Math.min(100, Math.max(0, Number(partialPercent) || 0));
        if (percentage <= 0) return priceRR;
        return priceRR * (percentage / 100);
    }
    return 0;
}

function getPipSize(pair) {
    pair = String(pair || "").toUpperCase();
    if (pair.includes("JPY")) return 0.01;
    if (pair.includes("XAU")) return 0.01;
    if (pair.includes("XAG")) return 0.01;
    return 0.0001;
}

function getPipValue(pair) {
    pair = String(pair || "").toUpperCase();
    if (pair.includes("XAU")) return 1;
    if (pair.includes("XAG")) return 5;
    if (pair.includes("JPY")) return 6.7;
    return 10;
}

// --------------------------------------------------------------
// CLEAN FIRESTORE DATA
// --------------------------------------------------------------
function cleanFirestoreData(value) {
    if (value === undefined || value === null) return null;
    if (Array.isArray(value)) return value.map(cleanFirestoreData);
    if (typeof value === "object") {
        const result = {};
        Object.entries(value).forEach(([key, item]) => {
            if (item !== undefined) result[key] = cleanFirestoreData(item);
        });
        return result;
    }
    return value;
}

// --------------------------------------------------------------
// ACCOUNT OPERATIONS
// --------------------------------------------------------------
async function loadAccounts() {
    if (!currentUser) return;
    try {
        const snapshot = await getDocs(accountsCollection());
        accounts = {};
        snapshot.forEach(item => {
            accounts[item.id] = { id: item.id, ...item.data() };
        });
        console.log("✅ Accounts loaded:", Object.keys(accounts).length);
        populateAccountSelectors();
        updateTradeAccountInfo();
        updateAccountPanel();
    } catch (error) {
        console.error("❌ Failed loading accounts:", error);
        alert("Unable to load your trading accounts.");
    }
}

async function saveAccount(account) {
    if (!currentUser) throw new Error("User not authenticated.");
    const accountRef = doc(db, "users", currentUser.uid, "journalAccounts", account.id);
    const cleanData = cleanFirestoreData({
        ...account,
        userId: currentUser.uid,
        updated: serverTimestamp()
    });
    await setDoc(accountRef, cleanData, { merge: true });
    console.log("✅ Account saved:", account.id);
}

async function deleteAccount(accountId) {
    const account = accounts[accountId];
    if (!account) return;

    const linkedTrades = trades.filter(trade => trade.accountId === accountId);
    const message = linkedTrades.length ?
        `Delete "${account.name}"?\n\n${linkedTrades.length} trade(s) are linked to this account.\n\nThe trades will be kept but become unassigned.` :
        `Delete "${account.name}"?\n\nThis cannot be undone.`;

    if (!confirm(message)) return;

    try {
        // Just delete the account, keep trades
        await deleteDoc(doc(db, "users", currentUser.uid, "journalAccounts", accountId));
        delete accounts[accountId];
        if (selectedAccountId === accountId) selectedAccountId = "all";

        await loadTrades();
        await loadAccounts();
        refreshUI();
        alert("✅ Account deleted successfully.");
    } catch (error) {
        console.error("❌ Delete account error:", error);
        alert("Failed to delete account: " + error.message);
    }
}

function getAccount(id) {
    return accounts[id] || null;
}

function getSelectedAccount() {
    if (selectedAccountId === "all") return null;
    return getAccount(selectedAccountId);
}

// --------------------------------------------------------------
// TRADE OPERATIONS - SAVING TO TOP-LEVEL "trades" COLLECTION
// --------------------------------------------------------------
async function loadTrades() {
    if (!currentUser) return;
    trades = [];

    try {
        // Load trades from top-level collection
        const snapshot = await getDocs(query(tradesCollection(), orderBy("created", "desc")));
        snapshot.forEach(item => {
            const data = item.data();
            // Only load trades belonging to this user
            if (data.userId === currentUser.uid) {
                trades.push({ id: item.id, ...data });
            }
        });
        console.log("✅ Firestore trades loaded:", trades.length);
    } catch (error) {
        console.error("❌ Firestore trade loading failed:", error);
        alert("Unable to load your trades.\n\n" + error.message);
    }
}

async function addTradeToFirestore(trade) {
    if (!currentUser) throw new Error("User is not authenticated.");

    const cleanTrade = cleanFirestoreData(trade);
    delete cleanTrade.id;

    const tradeId = "trade-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);

    const tradeRef = doc(db, "trades", tradeId);

    await setDoc(tradeRef, {
        ...cleanTrade,
        id: tradeId,
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        public: false,
        created: cleanTrade.created || new Date().toISOString(),
        updated: new Date().toISOString(),
        createdAt: serverTimestamp()
    });

    console.log("✅ TRADE WRITTEN TO FIRESTORE:", tradeId);
    return tradeId;
}

async function updateTradeInFirestore(tradeId, trade) {
    if (!currentUser) throw new Error("User is not authenticated.");

    const cleanTrade = cleanFirestoreData(trade);
    delete cleanTrade.id;

    const tradeRef = doc(db, "trades", tradeId);
    await updateDoc(tradeRef, {
        ...cleanTrade,
        updated: new Date().toISOString()
    });
    console.log("✅ Trade updated:", tradeId);
}

async function deleteTradeFromFirestore(tradeId) {
    if (!currentUser) throw new Error("User is not authenticated.");
    await deleteDoc(doc(db, "trades", tradeId));
    console.log("✅ Trade deleted:", tradeId);
}

// --------------------------------------------------------------
// BUILD TRADE FROM FORM
// --------------------------------------------------------------
function buildTradeFromForm(isUpdate = false) {
    const accountId = val("tradeAccount");
    const account = getAccount(accountId);
    const result = normalizeResult(val("result"));

    const currentEntry = num("entry");
    const currentSL = num("stopLoss");
    const currentTP = num("takeProfit");
    const exitPrice = num("exitPrice");
    const partialPercent = num("partialPercent");
    const profit = num("profit");
    const commission = num("commission");
    const lotSize = num("lotSize");
    const balance = num("balance");

    const existing = editingTrade || {};

    // Calculate risk and RR
    const pipSize = getPipSize(val("pair"));
    const pipValue = getPipValue(val("pair"));
    const slDistance = Math.abs(currentEntry - currentSL);
    const slPips = slDistance / pipSize;
    const actualRisk = slPips * pipValue * lotSize;
    const tpDistance = Math.abs(currentTP - currentEntry);
    const projectedRR = slDistance > 0 ? tpDistance / slDistance : 0;

    let entryModel = val("entryModel");
    if (entryModel === "__custom__") entryModel = val("entryModelCustom").trim();

    // Calculate outcome RR
    const outcomeRR = calculateOutcomeRR({
        result,
        actualProfit: profit,
        riskAmount: actualRisk,
        plannedRR: projectedRR,
        entry: currentEntry,
        stopLoss: currentSL,
        exitPrice: exitPrice,
        direction: val("direction"),
        partialPercent: partialPercent
    });

    const finalRR = result === "Pending" ? projectedRR : outcomeRR;

    return {
        id: isUpdate && existing.id ? existing.id : undefined,
        accountId: accountId,
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        date: val("tradeDate") || getLocalDate(),
        time: val("tradeTime") || getLocalTime(),
        pair: val("pair"),
        direction: val("direction"),
        session: val("session"),
        broker: val("broker"),
        account: account?.name || "",
        accountBalance: num("tradeAccountBalance"),
        accountRiskSetting: val("tradeRiskSetting"),
        currency: val("currencyDisplay"),
        pipValue: val("pipValueDisplay"),
        htfSwing: val("htfSwing"),
        htfInternal: val("htfInternal"),
        mtfSwing: val("mtfSwing"),
        mtfInternal: val("mtfInternal"),
        ltfStructure: val("ltfStructure"),
        liquidity: val("liquidity"),
        poi: val("poi"),
        entryModel: entryModel,
        entryConfirmation: val("entryConfirmation"),
        tradeValid: val("tradeValid"),
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
        entry: currentEntry,
        stopLoss: currentSL,
        takeProfit: currentTP,
        exitPrice: exitPrice,
        initialEntry: existing.initialEntry ?? currentEntry,
        initialStopLoss: existing.initialStopLoss ?? currentSL,
        initialTakeProfit: existing.initialTakeProfit ?? currentTP,
        initialRR: existing.initialRR ?? projectedRR,
        plannedRR: projectedRR,
        lotSize: lotSize,
        balance: balance,
        riskSettingAmount: num("riskSettingAmount"),
        riskAmount: actualRisk,
        risk: num("risk"),
        rr: finalRR,
        potentialProfit: num("potentialProfit"),
        potentialLoss: num("potentialLoss"),
        profit: profit,
        commission: commission,
        result: result,
        status: result === "Pending" ? "Pending" : "Closed",
        confidence: val("confidence"),
        emotion: val("emotion"),
        discipline: val("discipline"),
        patience: val("patience"),
        tradeSummary: val("tradeSummary"),
        strengths: val("strengths"),
        mistakes: val("mistakes"),
        lessonLearned: val("lessonLearned"),
        improvementPlan: val("improvementPlan"),
        notes: val("notes"),
        beforeChart: val("beforeChart"),
        duringChart: val("duringChart"),
        afterChart: val("afterChart"),
        public: existing.public || false,
        created: existing.created || new Date().toISOString(),
        updated: new Date().toISOString(),
        closed: existing.closed || (result === "Pending" ? null : new Date().toISOString())
    };
}

// --------------------------------------------------------------
// SAVE TRADE
// --------------------------------------------------------------
async function saveTrade(e) {
    e.preventDefault();
    if (!currentUser) { alert("You must be signed in."); return; }

    const date = val("tradeDate");
    if (!date) { alert("Please select a date."); return; }

    const accountId = val("tradeAccount");
    if (!accountId || !getAccount(accountId)) {
        alert("Please add/select a trading account before saving.");
        return;
    }

    const isUpdate = editingTrade !== null;
    const trade = buildTradeFromForm(isUpdate);

    const button = document.getElementById("saveTradeBtn");
    const originalButtonHTML = button ? button.innerHTML : "";

    try {
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        }

        if (isUpdate && editingTrade) {
            const index = trades.findIndex(t => t.id === editingTrade.id);
            if (index === -1) throw new Error("Trade could not be found.");

            if (editingTrade.status === "Closed" && trade.status === "Closed") {
                trade.closed = editingTrade.closed || trade.closed;
            }

            await updateTradeInFirestore(editingTrade.id, trade);
            trades[index] = { ...trade, id: editingTrade.id };

            await recalculateAccountBalance(trade.accountId);

            alert("✅ Trade updated successfully.");
            editingTrade = null;
            refreshUI();
            resetTradeForm();
            return;
        }

        // New trade
        const firestoreId = await addTradeToFirestore(trade);
        const savedTrade = { ...trade, id: firestoreId };
        trades.unshift(savedTrade);

        if (savedTrade.status === "Closed") {
            await recalculateAccountBalance(savedTrade.accountId);
        }

        alert("✅ Trade saved permanently to Firebase.");
        resetTradeForm();
        await loadTrades();
        await loadAccounts();
        refreshUI();

    } catch (error) {
        console.error("❌ TRADE SAVE ERROR:", error);
        alert("❌ Trade was NOT saved.\n\n" + error.message);
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = originalButtonHTML;
        }
    }
}

// --------------------------------------------------------------
// DELETE TRADE
// --------------------------------------------------------------
async function deleteTrade(tradeId) {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) { alert("Trade not found."); return; }

    if (!confirm(`Delete ${trade.pair || "this trade"}?\n\nThis will permanently remove the trade from Firebase.`)) {
        return;
    }

    try {
        await deleteTradeFromFirestore(tradeId);
        trades = trades.filter(t => t.id !== tradeId);

        if (trade.accountId) {
            await recalculateAccountBalance(trade.accountId);
        }

        await loadTrades();
        await loadAccounts();
        refreshUI();
        alert("✅ Trade permanently deleted.");
    } catch (error) {
        console.error("❌ DELETE TRADE ERROR:", error);
        alert("❌ Trade could not be deleted.\n\n" + error.message);
    }
}

// --------------------------------------------------------------
// CLOSE PENDING TRADE
// --------------------------------------------------------------
async function closeTrade(tradeId) {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) { alert("Trade not found."); return; }

    const profitInput = prompt("Enter actual Profit / Loss:", "0");
    if (profitInput === null) return;
    const profit = Number(profitInput) || 0;

    const commissionInput = prompt("Enter Commission:", String(trade.commission || 0));
    if (commissionInput === null) return;
    const commission = Number(commissionInput) || 0;

    const exitPriceInput = prompt("Exit / Close Price (leave blank if not applicable):", String(trade.exitPrice || ""));
    const exitPrice = exitPriceInput === null ? Number(trade.exitPrice) || 0 : (Number(exitPriceInput) || 0);

    const riskAmount = Number(trade.riskAmount) || 0;
    let result = "Breakeven";
    if (profit > 0) result = "Win";
    else if (profit < 0) result = "Loss";

    let actualRR = 0;
    const plannedRR = Number(trade.initialRR ?? trade.plannedRR ?? trade.rr) || 0;

    if (result === "Win") {
        actualRR = Math.abs(plannedRR);
    } else if (result === "Loss") {
        actualRR = riskAmount > 0 ? -(Math.abs(profit) / riskAmount) : 0;
    } else if (result === "Breakeven") {
        actualRR = 0;
    }

    const updatedTrade = {
        ...trade,
        profit,
        commission,
        exitPrice,
        result,
        status: "Closed",
        rr: actualRR,
        closed: new Date().toISOString(),
        updated: new Date().toISOString()
    };

    try {
        await updateTradeInFirestore(tradeId, updatedTrade);
        await recalculateAccountBalance(trade.accountId);
        await loadTrades();
        await loadAccounts();
        refreshUI();
        alert("✅ Trade closed and saved permanently.");
    } catch (error) {
        console.error("❌ CLOSE TRADE ERROR:", error);
        alert("❌ Trade could not be closed.\n\n" + error.message);
    }
}

// --------------------------------------------------------------
// RECALCULATE ACCOUNT BALANCE
// --------------------------------------------------------------
async function recalculateAccountBalance(accountId) {
    if (!accountId) return;
    const account = accounts[accountId];
    if (!account) return;

    const starting = Number(account.startingBalance) || 0;
    const accountTrades = trades.filter(trade =>
        trade.accountId === accountId && trade.status === "Closed"
    );

    let pnl = 0;
    accountTrades.forEach(trade => {
        pnl += (Number(trade.profit) || 0) - (Number(trade.commission) || 0);
    });

    const newBalance = starting + pnl;
    const updatedAccount = {
        ...account,
        currentBalance: newBalance,
        updated: new Date().toISOString()
    };

    await saveAccount(updatedAccount);
    accounts[accountId] = updatedAccount;
}

// --------------------------------------------------------------
// RESET FORM
// --------------------------------------------------------------
function resetTradeForm() {
    const form = document.getElementById("tradeForm");
    if (form) form.reset();
    editingTrade = null;
    setDefaultDateTime();
    populateAccountSelectors();

    const firstAccount = Object.values(accounts)[0];
    if (firstAccount) {
        setValue("tradeAccount", selectedAccountId !== "all" ? selectedAccountId : firstAccount.id);
    }

    updateTradeAccountInfo();
    calculateAll();

    const button = document.getElementById("saveTradeBtn");
    if (button) {
        button.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Trade';
        button.className = "btn-primary";
    }

    const header = document.querySelector(".page-header h1");
    if (header) header.innerHTML = '<i class="fa-solid fa-chart-line"></i> Trading Journal';
}

function setDefaultDateTime() {
    const now = new Date();
    const dateInput = document.getElementById("tradeDate");
    const timeInput = document.getElementById("tradeTime");

    if (dateInput && !dateInput.value) {
        dateInput.value = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    }
    if (timeInput && !timeInput.value) {
        timeInput.value = now.toTimeString().slice(0, 5);
    }
}

// --------------------------------------------------------------
// ACCOUNT SELECTORS
// --------------------------------------------------------------
function populateAccountSelectors() {
    const filter = document.getElementById("accountFilter");
    const tradeAccount = document.getElementById("tradeAccount");
    const list = Object.values(accounts);

    if (filter) {
        filter.innerHTML = `<option value="all">All Accounts</option>`;
        list.forEach(account => {
            const opt = document.createElement("option");
            opt.value = account.id;
            opt.textContent = account.name;
            filter.appendChild(opt);
        });
        if (selectedAccountId !== "all" && !accounts[selectedAccountId]) selectedAccountId = "all";
        filter.value = selectedAccountId;
    }

    if (tradeAccount) {
        const current = tradeAccount.value;
        tradeAccount.innerHTML = `<option value="">Select an account</option>`;
        list.forEach(account => {
            const opt = document.createElement("option");
            opt.value = account.id;
            opt.textContent = account.name;
            tradeAccount.appendChild(opt);
        });
        let target = "";
        if (current && accounts[current]) target = current;
        else if (selectedAccountId !== "all" && accounts[selectedAccountId]) target = selectedAccountId;
        else if (list.length) target = list[0].id;
        tradeAccount.value = target;
    }
}

// --------------------------------------------------------------
// ACCOUNT INFO
// --------------------------------------------------------------
function updateTradeAccountInfo() {
    const accountId = val("tradeAccount");
    const account = getAccount(accountId);
    if (!account) {
        setValue("tradeAccountBalance", "");
        setValue("tradeRiskSetting", "");
        setValue("currencyDisplay", "");
        setValue("balance", "");
        calculateAll();
        return;
    }
    const balance = Number(account.currentBalance) || Number(account.startingBalance) || 0;
    setValue("tradeAccountBalance", money(balance));
    setValue("tradeRiskSetting", `${Number(account.riskPercent || 0).toFixed(2)}%`);
    setValue("currencyDisplay", account.currency || "USD");
    setValue("balance", balance.toFixed(2));
    calculateAll();
}

// --------------------------------------------------------------
// ACCOUNT PANEL
// --------------------------------------------------------------
function updateAccountPanel() {
    const account = getSelectedAccount();

    if (!account) {
        const allStarting = Object.values(accounts).reduce((s, a) => s + (Number(a.startingBalance) || 0), 0);
        const allCurrent = Object.values(accounts).reduce((s, a) => s + (Number(a.currentBalance) || 0), 0);
        setText("accountStartingBalance", money(allStarting));
        setText("accountCurrentBalance", money(allCurrent));
        setText("accountRiskSetting", "—");
        setText("accountPnL", signedMoney(allCurrent - allStarting));
        setText("accountConsistency", calculateConsistencyScore(trades).toFixed(1) + "%");
        return;
    }

    const starting = Number(account.startingBalance) || 0;
    const current = Number(account.currentBalance) || starting;
    const pnl = current - starting;

    setText("accountStartingBalance", money(starting));
    setText("accountCurrentBalance", money(current));
    setText("accountRiskSetting", `${Number(account.riskPercent || 0).toFixed(2)}%`);
    setText("accountPnL", signedMoney(pnl));

    const accountTrades = trades.filter(t => t.accountId === account.id);
    const consistency = calculateConsistencyScore(accountTrades);
    setText("accountConsistency", consistency.toFixed(1) + "%");
}

// --------------------------------------------------------------
// CALCULATE ALL
// --------------------------------------------------------------
function calculateAll() {
    const pair = val("pair") || "EURUSD";
    const entry = parseFloat(val("entry")) || 0;
    const stopLoss = parseFloat(val("stopLoss")) || 0;
    const takeProfit = parseFloat(val("takeProfit")) || 0;
    const lotSize = parseFloat(val("lotSize")) || 0;
    const balance = parseFloat(val("balance")) || 0;
    const accountId = val("tradeAccount");
    const account = getAccount(accountId);

    const pipSize = getPipSize(pair);
    const pipValue = getPipValue(pair);
    setValue("pipValueDisplay", `$${pipValue.toFixed(2)} / lot`);

    const riskPercent = account ? Number(account.riskPercent) || 0 : 0;
    const riskSettingAmount = balance * (riskPercent / 100);
    setValue("riskSettingAmount", riskSettingAmount > 0 ? riskSettingAmount.toFixed(2) : "");
    setText("summaryRiskSetting", money(riskSettingAmount));

    let slDistance = 0, tpDistance = 0;
    if (entry && stopLoss) slDistance = Math.abs(entry - stopLoss);
    if (entry && takeProfit) tpDistance = Math.abs(takeProfit - entry);

    const slPips = slDistance / pipSize;
    const actualRisk = slPips * pipValue * lotSize;
    setValue("riskAmount", actualRisk > 0 ? actualRisk.toFixed(2) : "");

    const actualRiskPercent = balance > 0 ? (actualRisk / balance) * 100 : 0;
    setValue("risk", actualRisk > 0 ? actualRiskPercent.toFixed(2) : "");

    const projectedRR = slDistance > 0 ? tpDistance / slDistance : 0;
    setValue("projectedRR", projectedRR !== 0 ? projectedRR.toFixed(2) : "");
    setText("summaryProjectedRR", projectedRR.toFixed(2));

    let actualRR = projectedRR;
    const exitPrice = parseFloat(val("exitPrice")) || 0;
    const result = normalizeResult(val("result"));
    const profit = parseFloat(val("profit")) || 0;

    if (result !== "Pending" && exitPrice !== 0) {
        const direction = val("direction");
        const rrFromExit = calculatePriceRR(entry, stopLoss, exitPrice, direction);
        if (result === "Win") {
            actualRR = rrFromExit > 0 ? rrFromExit : projectedRR;
        } else if (result === "Loss") {
            actualRR = actualRisk > 0 ? -(Math.abs(profit) / actualRisk) : 0;
        } else if (result === "Partial") {
            const partial = parseFloat(val("partialPercent")) || 0;
            actualRR = rrFromExit * (partial / 100);
        } else {
            actualRR = rrFromExit;
        }
    }

    setValue("rr", actualRR !== 0 ? actualRR.toFixed(2) : "");
    setText("summaryRR", actualRR.toFixed(2));

    const potentialProfit = actualRisk * projectedRR;
    setValue("potentialLoss", actualRisk > 0 ? actualRisk.toFixed(2) : "");
    setValue("potentialProfit", potentialProfit > 0 ? potentialProfit.toFixed(2) : "");

    setText("summaryRiskAmount", money(actualRisk));
    setText("summaryRiskPercent", `${actualRiskPercent.toFixed(2)}%`);
    setText("summaryPotentialProfit", money(potentialProfit));
    setText("summaryPotentialLoss", money(actualRisk));
}

// --------------------------------------------------------------
// STATISTICS
// --------------------------------------------------------------
function getFilteredTrades() {
    if (selectedAccountId === "all") return [...trades];
    return trades.filter(t => t.accountId === selectedAccountId);
}

function calculateConsistencyScore(sourceTrades) {
    const closed = (sourceTrades || []).filter(t => t.status === "Closed");
    if (!closed.length) return 0;

    const scoreMap = { Excellent: 10, Good: 8, Average: 5, Poor: 2 };
    const emotionMap = { Calm: 10, Confident: 10, Fear: 4, Greed: 3, FOMO: 2, Revenge: 1 };

    let total = 0;
    closed.forEach(trade => {
        const followedPlan = trade.tradeValid === "Yes" ? 10 : 0;
        const patience = scoreMap[trade.patience] ?? 5;
        const discipline = scoreMap[trade.discipline] ?? 5;
        const emotionalControl = emotionMap[trade.emotion] ?? 5;
        total += followedPlan + patience + discipline + emotionalControl;
    });

    return (total / (closed.length * 40)) * 100;
}

function calculateMaxDrawdown(closedTrades, startingBalance) {
    if (!closedTrades.length) return 0;
    let balance = startingBalance;
    let peak = startingBalance;
    let maxDrawdown = 0;

    closedTrades.forEach(trade => {
        balance += (Number(trade.profit) || 0) - (Number(trade.commission) || 0);
        if (balance > peak) peak = balance;
        const drawdown = peak - balance;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    return maxDrawdown;
}

function calculateStatistics() {
    const all = getFilteredTrades();
    const closed = all.filter(t => t.status === "Closed");
    const wins = closed.filter(t => t.result === "Win");
    const losses = closed.filter(t => t.result === "Loss");
    const pending = all.filter(t => t.status === "Pending");

    const totalTrades = all.length;
    const totalWins = wins.length;
    const totalLosses = losses.length;
    const winRate = closed.length === 0 ? 0 : (totalWins / closed.length) * 100;

    const netProfit = closed.reduce((sum, t) => sum + (Number(t.profit) || 0) - (Number(t.commission) || 0), 0);
    const grossProfit = wins.reduce((sum, t) => sum + Math.max(Number(t.profit) || 0, 0), 0);
    const grossLoss = losses.reduce((sum, t) => sum + Math.abs(Math.min(Number(t.profit) || 0, 0)), 0);
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const averageRR = closed.length === 0 ? 0 : closed.reduce((s, t) => s + (Number(t.rr) || 0), 0) / closed.length;

    let startingBalance = 0;
    if (selectedAccountId === "all") {
        startingBalance = Object.values(accounts).reduce((s, a) => s + (Number(a.startingBalance) || 0), 0);
    } else {
        const account = getSelectedAccount();
        startingBalance = account ? (Number(account.startingBalance) || 0) : 0;
    }

    const maxDrawdown = calculateMaxDrawdown(closed, startingBalance);

    const sorted = [...closed].sort((a, b) => new Date(a.closed || a.date) - new Date(b.closed || b.date));
    let streak = 0;
    if (sorted.length) {
        const last = sorted[sorted.length - 1];
        if (last.result === "Win") {
            for (let i = sorted.length - 1; i >= 0; i--) {
                if (sorted[i].result === "Win") streak++;
                else break;
            }
        } else if (last.result === "Loss") {
            for (let i = sorted.length - 1; i >= 0; i--) {
                if (sorted[i].result === "Loss") streak--;
                else break;
            }
        }
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthCount = all.filter(t => t.date && new Date(t.date) >= monthStart).length;

    setText("totalTrades", totalTrades);
    setText("wins", totalWins);
    setText("losses", totalLosses);
    setText("pendingCount", pending.length);
    setText("winRate", winRate.toFixed(1) + "%");
    setText("averageRR", averageRR.toFixed(2));
    setText("netProfit", signedMoney(netProfit));
    setText("profitFactor", profitFactor === Infinity ? "∞" : profitFactor.toFixed(2));
    setText("maxDrawdown", money(maxDrawdown));
    setText("streak", streak > 0 ? "+" + streak : streak < 0 ? streak : "0");
    setText("consistencyScore", calculateConsistencyScore(closed).toFixed(1) + "%");
    setText("monthCount", monthCount);

    const winEl = document.getElementById("winRate");
    if (winEl) winEl.className = winRate >= 50 ? "value-positive" : winRate > 0 ? "value-neutral" : "value-negative";

    const profitEl = document.getElementById("netProfit");
    if (profitEl) profitEl.className = netProfit > 0 ? "value-positive" : netProfit < 0 ? "value-negative" : "value-neutral";

    updateAccountPanel();
}

// --------------------------------------------------------------
// RECENT TRADES
// --------------------------------------------------------------
function loadRecentTrades() {
    const container = document.getElementById("recentTrades");
    if (!container) return;

    const pending = getFilteredTrades()
        .filter(trade => trade.status === "Pending")
        .slice(0, 10);

    if (!pending.length) {
        container.innerHTML =
            `<div class="account-empty"><strong>No pending trades</strong>Your pending trades will appear here.</div>`;
        return;
    }

    container.innerHTML = pending.map(trade => `
            <div class="trade-row">
                <div>
                    <strong>${escapeHtml(trade.pair || "-")}</strong>
                    <small>${escapeHtml(trade.direction || "")}</small>
                </div>
                <span class="status pending">Pending</span>
                <button class="btn" data-close-trade="${trade.id}">Close</button>
                <button class="btn" data-delete-trade="${trade.id}">Delete</button>
            </div>
        `).join("");

    container.querySelectorAll("[data-close-trade]").forEach(button => {
        button.addEventListener("click", () => closeTrade(button.dataset.closeTrade));
    });

    container.querySelectorAll("[data-delete-trade]").forEach(button => {
        button.addEventListener("click", () => deleteTrade(button.dataset.deleteTrade));
    });
}

// --------------------------------------------------------------
// CHARTS
// --------------------------------------------------------------
function initializeCharts() {
    if (typeof Chart === "undefined") {
        console.warn("Chart.js not loaded");
        return;
    }
    destroyAllCharts();
    buildEquityChart();
    buildMonthlyChart();
}

function destroyAllCharts() {
    if (equityChartInstance) { equityChartInstance.destroy(); equityChartInstance = null; }
    if (monthlyChartInstance) { monthlyChartInstance.destroy(); monthlyChartInstance = null; }
}

function buildEquityChart() {
    const canvas = document.getElementById("equityChart");
    if (!canvas) return;

    const filtered = getFilteredTrades();
    const closed = filtered.filter(t => t.status === "Closed")
        .sort((a, b) => new Date(a.closed || a.date) - new Date(b.closed || b.date));

    let startingBalance = 0;
    if (selectedAccountId === "all") {
        startingBalance = Object.values(accounts).reduce((s, a) => s + (Number(a.startingBalance) || 0), 0);
    } else {
        const account = getSelectedAccount();
        startingBalance = account ? (Number(account.startingBalance) || 0) : 0;
    }

    let balance = startingBalance;
    const labels = ["Start"];
    const data = [balance];

    closed.forEach(trade => {
        balance += (Number(trade.profit) || 0) - (Number(trade.commission) || 0);
        labels.push(trade.date || "-");
        data.push(balance);
    });

    equityChartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Equity",
                data: data,
                tension: 0.3,
                borderWidth: 2,
                fill: true,
                borderColor: "#4f7cff",
                backgroundColor: "rgba(79,124,255,0.15)"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, labels: { color: "#e8edf5" } }
            },
            scales: {
                y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9aa4bf" } },
                x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9aa4bf", maxTicksLimit: 20 } }
            }
        }
    });
}

function buildMonthlyChart() {
    const canvas = document.getElementById("monthlyChart");
    if (!canvas) return;

    const monthly = {};
    getFilteredTrades()
        .filter(t => t.status === "Closed")
        .forEach(trade => {
            const key = String(trade.date || "").slice(0, 7);
            if (!key) return;
            if (!monthly[key]) monthly[key] = 0;
            monthly[key] += (Number(trade.profit) || 0) - (Number(trade.commission) || 0);
        });

    const labels = Object.keys(monthly).sort();
    const data = labels.map(label => monthly[label]);

    monthlyChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Net P/L",
                data: data,
                backgroundColor: data.map(v => v >= 0 ? "#00c897" : "#ff4766"),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, labels: { color: "#e8edf5" } }
            },
            scales: {
                y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9aa4bf" } },
                x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9aa4bf" } }
            }
        }
    });
}

// --------------------------------------------------------------
// REFRESH UI
// --------------------------------------------------------------
function refreshUI() {
    calculateStatistics();
    loadRecentTrades();
    initializeCharts();
    updateAccountPanel();
}

// --------------------------------------------------------------
// ACCOUNT MANAGER
// --------------------------------------------------------------
function renderAccountManager() {
    const container = document.getElementById("accountManagerList");
    if (!container) return;

    const list = Object.values(accounts);
    if (!list.length) {
        container.innerHTML =
            `<div class="account-empty"><strong>No trading accounts</strong>Add your first account below.</div>`;
        return;
    }

    container.innerHTML = list.map(account => `
            <div class="account-manager-item">
                <div class="account-manager-main">
                    <div class="account-manager-name">${escapeHtml(account.name)}</div>
                    <div class="account-manager-meta">
                        ${escapeHtml(account.type || "Account")} • ${escapeHtml(account.currency || "USD")} • ${money(account.currentBalance)}
                    </div>
                </div>
                <div class="account-manager-actions">
                    <button type="button" data-edit-account="${account.id}"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="delete-account-btn" data-delete-account="${account.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join("");

    container.querySelectorAll("[data-edit-account]").forEach(button => {
        button.addEventListener("click", () => editAccount(button.dataset.editAccount));
    });

    container.querySelectorAll("[data-delete-account]").forEach(button => {
        button.addEventListener("click", () => deleteAccount(button.dataset.deleteAccount));
    });
}

function editAccount(accountId) {
    const account = getAccount(accountId);
    if (!account) return;

    setValue("editingAccountId", account.id);
    setValue("newAccountName", account.name);
    setValue("newAccountType", account.type);
    setValue("newAccountBalance", account.startingBalance);
    setValue("newAccountRisk", account.riskPercent);
    setValue("newAccountCurrency", account.currency);

    const title = document.getElementById("accountModalTitle");
    const submit = document.getElementById("accountSubmitBtn");
    if (title) title.textContent = "Edit Trading Account";
    if (submit) submit.innerHTML = '<i class="fa-solid fa-pen"></i> Save Account';
}

function clearAccountForm() {
    const form = document.getElementById("accountForm");
    if (form) form.reset();
    setValue("editingAccountId", "");
    setValue("newAccountRisk", "1");
    setValue("newAccountCurrency", "USD");

    const title = document.getElementById("accountModalTitle");
    const submit = document.getElementById("accountSubmitBtn");
    if (title) title.textContent = "Manage Trading Accounts";
    if (submit) submit.innerHTML = '<i class="fa-solid fa-plus"></i> Create Account';
}

function openAccountModal(accountId = null) {
    const modal = document.getElementById("accountModal");
    if (!modal) return;
    clearAccountForm();
    renderAccountManager();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    if (accountId && accounts[accountId]) editAccount(accountId);
}

function closeAccountModal() {
    const modal = document.getElementById("accountModal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    clearAccountForm();
}

async function createAccountFromForm(e) {
    e.preventDefault();
    if (!currentUser) { alert("Please sign in first."); return; }

    const name = val("newAccountName").trim();
    const type = val("newAccountType");
    const startingBalance = Number(val("newAccountBalance")) || 0;
    const riskPercent = Number(val("newAccountRisk")) || 0;
    const currency = val("newAccountCurrency").trim().toUpperCase();

    if (!name) { alert("Please enter an account name."); return; }
    if (startingBalance < 0) { alert("Starting balance cannot be negative."); return; }

    const editingId = val("editingAccountId");

    try {
        if (editingId) {
            const oldAccount = accounts[editingId];
            if (!oldAccount) throw new Error("Account not found.");

            const oldStarting = Number(oldAccount.startingBalance) || 0;
            const oldCurrent = Number(oldAccount.currentBalance);
            const pnl = oldCurrent - oldStarting;

            const updatedAccount = {
                ...oldAccount,
                id: editingId,
                name,
                type,
                startingBalance,
                currentBalance: startingBalance + pnl,
                riskPercent,
                currency
            };

            await saveAccount(updatedAccount);
            accounts[editingId] = updatedAccount;
            alert("✅ Account updated successfully.");
        } else {
            const accountId = "account-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
            const account = {
                id: accountId,
                name,
                type,
                startingBalance,
                currentBalance: startingBalance,
                riskPercent,
                currency,
                created: new Date().toISOString(),
                userId: currentUser.uid
            };

            await saveAccount(account);
            accounts[accountId] = account;
            selectedAccountId = accountId;
            alert("✅ Account added successfully.");
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
        console.error("❌ Account save failed:", error);
        alert("Account could not be saved.\n\n" + error.message);
    }
}

// --------------------------------------------------------------
// ENTRY MODEL SYNC
// --------------------------------------------------------------
function syncEntryModelInput() {
    const select = document.getElementById("entryModel");
    const custom = document.getElementById("entryModelCustom");
    if (!select || !custom) return;
    if (select.value === "__custom__") {
        custom.style.display = "block";
    } else {
        custom.style.display = "none";
        custom.value = "";
    }
}

// --------------------------------------------------------------
// POPULATE FORM (EDIT)
// --------------------------------------------------------------
function populateForm(trade) {
    editingTrade = trade;
    setValue("tradeDate", trade.date);
    setValue("tradeTime", trade.time);
    setValue("pair", trade.pair);
    setValue("direction", trade.direction);
    setValue("session", trade.session);
    setValue("broker", trade.broker);
    setValue("tradeAccount", trade.accountId);
    setValue("htfSwing", trade.htfSwing);
    setValue("htfInternal", trade.htfInternal);
    setValue("mtfSwing", trade.mtfSwing);
    setValue("mtfInternal", trade.mtfInternal);
    setValue("ltfStructure", trade.ltfStructure);
    setValue("liquidity", trade.liquidity);
    setValue("poi", trade.poi);

    const standardModels = ["LC-2A", "LC-1", "LTF RE", "MTF RE"];
    const entryModel = document.getElementById("entryModel");
    const customModel = document.getElementById("entryModelCustom");

    if (entryModel) {
        if (standardModels.includes(trade.entryModel)) {
            entryModel.value = trade.entryModel;
            if (customModel) customModel.style.display = "none";
        } else {
            entryModel.value = "__custom__";
            if (customModel) {
                customModel.style.display = "block";
                customModel.value = trade.entryModel || "";
            }
        }
    }

    setValue("entryConfirmation", trade.entryConfirmation);
    setValue("tradeValid", trade.tradeValid);

    const map = {
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

    Object.entries(map).forEach(([key, id]) => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = !!(trade.confluences && trade.confluences[key]);
    });

    setValue("entry", trade.entry);
    setValue("stopLoss", trade.stopLoss);
    setValue("takeProfit", trade.takeProfit);
    setValue("exitPrice", trade.exitPrice ?? "");
    setValue("lotSize", trade.lotSize);
    setValue("profit", trade.profit);
    setValue("commission", trade.commission);
    setValue("result", trade.result);
    setValue("confidence", trade.confidence);
    setValue("emotion", trade.emotion);
    setValue("discipline", trade.discipline);
    setValue("patience", trade.patience);
    setValue("tradeSummary", trade.tradeSummary);
    setValue("strengths", trade.strengths);
    setValue("mistakes", trade.mistakes);
    setValue("lessonLearned", trade.lessonLearned);
    setValue("improvementPlan", trade.improvementPlan);
    setValue("notes", trade.notes);
    setValue("beforeChart", trade.beforeChart);
    setValue("duringChart", trade.duringChart);
    setValue("afterChart", trade.afterChart);

    const button = document.getElementById("saveTradeBtn");
    if (button) {
        button.innerHTML = '<i class="fa-solid fa-pen"></i> Update Trade';
        button.className = "btn-update";
    }

    const header = document.querySelector(".page-header h1");
    if (header) header.innerHTML = '<i class="fa-solid fa-pen"></i> Edit Trade';

    updateTradeAccountInfo();
    calculateAll();
}

// --------------------------------------------------------------
// CHECK EDIT URL
// --------------------------------------------------------------
function checkEditTrade() {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (!editId) return;

    const trade = trades.find(item => item.id === editId);
    if (!trade) {
        console.warn("Trade to edit not found:", editId);
        return;
    }
    populateForm(trade);
}

// --------------------------------------------------------------
// SETUP EVENTS
// --------------------------------------------------------------
function setupEvents() {
    const form = document.getElementById("tradeForm");
    if (form) {
        form.addEventListener("submit", saveTrade);
        form.addEventListener("reset", () => {
            setTimeout(() => {
                setDefaultDateTime();
                populateAccountSelectors();
                updateTradeAccountInfo();
                calculateAll();
            }, 20);
        });
    }

    const tradeAccount = document.getElementById("tradeAccount");
    if (tradeAccount) {
        tradeAccount.addEventListener("change", updateTradeAccountInfo);
    }

    const accountFilter = document.getElementById("accountFilter");
    if (accountFilter) {
        accountFilter.addEventListener("change", () => {
            selectedAccountId = accountFilter.value;
            if (selectedAccountId !== "all") {
                setValue("tradeAccount", selectedAccountId);
            }
            updateTradeAccountInfo();
            calculateStatistics();
            loadRecentTrades();
            initializeCharts();
            updateAccountPanel();
        });
    }

    ["pair", "entry", "stopLoss", "takeProfit", "lotSize", "exitPrice", "partialPercent", "result", "profit"]
    .forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", calculateAll);
            el.addEventListener("change", calculateAll);
        }
    });

    document.getElementById("entryModel")?.addEventListener("change", syncEntryModelInput);
    document.getElementById("addAccountBtn")?.addEventListener("click", () => openAccountModal());
    document.getElementById("closeAccountModal")?.addEventListener("click", closeAccountModal);
    document.getElementById("cancelAccountBtn")?.addEventListener("click", closeAccountModal);
    document.getElementById("accountForm")?.addEventListener("submit", createAccountFromForm);

    document.getElementById("accountModal")?.addEventListener("click", event => {
        if (event.target.id === "accountModal") closeAccountModal();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeAccountModal();
    });

    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        if (confirm("Logout?")) {
            await signOut(auth);
            window.location.reload();
        }
    });

    const scrollBtn = document.getElementById("scrollTopBtn");
    if (scrollBtn) {
        window.addEventListener("scroll", () => {
            scrollBtn.classList.toggle("visible", window.scrollY > 300);
        });
        scrollBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
}

// --------------------------------------------------------------
// FIREBASE AUTH - INIT
// --------------------------------------------------------------
function startApp() {
    const app = document.getElementById("app");
    app.classList.add("loading");

    onAuthStateChanged(auth, async user => {
        if (!user) {
            currentUser = null;
            app.classList.remove("loading");
            app.classList.add("locked");
            return;
        }

        currentUser = user;

        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                app.classList.remove("loading");
                app.classList.add("locked");
                return;
            }

            const data = userDoc.data();
            const role = data.role || "member";
            const membership = data.membership || "free";
            const hasPremium = role === "admin" || membership === "premium";

            app.classList.remove("loading");

            if (!hasPremium) {
                app.classList.add("locked");
                return;
            }

            app.classList.remove("locked");

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

            console.log("✅ GTRADES-AXIS™ Journal connected to Firestore.");

        } catch (error) {
            console.error("❌ Journal initialization failed:", error);
            app.classList.remove("loading");
            app.classList.add("locked");
            alert("Journal could not connect to Firebase.\n\n" + error.message);
        }
    });
}

// --------------------------------------------------------------
// START
// --------------------------------------------------------------
const appContainer = document.getElementById("app");
if (appContainer) {
    startApp();
} else {
    document.addEventListener("DOMContentLoaded", startApp);
}

console.log("✅ Journal script loaded.");
