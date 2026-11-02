// ============================================================
// GTRADES-AXIS™ JOURNAL ENGINE - FIRESTORE VERSION
// ============================================================

import { auth, db } from "./firebase.js";
import { calculateProjectedRR } from "./trade-metrics.js?v=20261024-3r-journal";
const JOURNAL_MIN_PROJECTED_RR = 3;
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
let currentUserRole = "member";
let editingTrade = null;
let selectedAccountId = "all";
let equityChartInstance = null;
let monthlyChartInstance = null;
let exitExecutionsDraft = [];

// --------------------------------------------------------------
// PROFESSIONAL JOURNAL NOTIFICATIONS
// Keep public-facing messages concise and free of technical details.
// Detailed errors remain in the browser console for diagnostics.
// --------------------------------------------------------------
let journalToastTimer = null;

function showJournalNotification(message, type = "info") {
    let toast = document.getElementById("journalNotification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "journalNotification";
        toast.className = "journal-notification";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
    }

    toast.className = `journal-notification ${type}`;
    toast.textContent = message;
    requestAnimationFrame(() => toast.classList.add("show"));

    if (journalToastTimer) clearTimeout(journalToastTimer);
    journalToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
}

// --------------------------------------------------------------
// COLLECTION HELPERS
// --------------------------------------------------------------

// Canonical student journal trade collection.
// EVERY trade belongs to the student who created it:
// users/{uid}/trades/{tradeId}
function tradesCollection() {
    if (!currentUser) throw new Error("User is not authenticated.");
    return collection(db, "users", currentUser.uid, "trades");
}

// Accounts stored under user for privacy
function accountsCollection() {
    if (!currentUser) throw new Error("User is not authenticated.");
    return collection(db, "users", currentUser.uid, "journalAccounts");
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


function calculateExitLeg(price, percent, context) {
    const entry = Number(context.entry) || 0;
    const stopLoss = Number(context.stopLoss) || 0;
    const lotSize = Number(context.lotSize) || 0;
    const pipSize = Number(context.pipSize) || getPipSize(context.pair);
    const pipValue = Number(context.pipValue) || getPipValue(context.pair);
    const exit = Number(price) || 0;
    const allocation = Math.max(0, Math.min(100, Number(percent) || 0));

    if (!entry || !exit || allocation <= 0) {
        return { price: exit, percent: allocation, pnl: 0, rr: 0, fullPositionRR: 0 };
    }

    const direction = String(context.direction || "BUY").toUpperCase();
    const signedMove = direction === "SELL" ? entry - exit : exit - entry;

    // Money P/L can still use pip-value/lot-size assumptions, but R-multiple must not.
    // RR is derived directly from price movement versus the ORIGINAL stop distance.
    let pnl = 0;
    if (lotSize > 0 && pipSize > 0 && pipValue > 0) {
        const pips = signedMove / pipSize;
        pnl = pips * pipValue * lotSize * (allocation / 100);
    }

    const riskDistance = Math.abs(entry - stopLoss);
    const fullPositionRR = riskDistance > 0 ? signedMove / riskDistance : 0;
    const rr = fullPositionRR * (allocation / 100);

    return { price: exit, percent: allocation, pnl, rr, fullPositionRR };
}

function getExitRowsFromForm() {
    const container = document.getElementById("exitExecutions");
    if (!container) return [];
    return [...container.querySelectorAll(".exit-row")].map(row => ({
        price: Number(row.querySelector("[data-exit-price]")?.value) || 0,
        percent: Math.max(0, Math.min(100, Number(row.querySelector("[data-exit-percent]")?.value) || 0))
    }));
}

function renderExitExecutions(rows = exitExecutionsDraft) {
    const container = document.getElementById("exitExecutions");
    if (!container) return;

    exitExecutionsDraft = (rows || []).map(item => ({
        price: Number(item.price) || 0,
        percent: Math.max(0, Math.min(100, Number(item.percent) || 0))
    }));

    if (!exitExecutionsDraft.length) {
        container.innerHTML = `<div class="account-empty"><strong>No exits recorded yet</strong><span>Add an exit or partial to document the actual execution.</span></div>`;
        calculateAll();
        return;
    }

    container.innerHTML = exitExecutionsDraft.map((row, index) => `
        <div class="exit-row" data-exit-index="${index}">
            <div class="form-group">
                <label>Exit ${index + 1} Price</label>
                <input type="number" step="any" data-exit-price value="${row.price || ""}" placeholder="Actual exit price" />
            </div>
            <div class="form-group">
                <label>Closed %</label>
                <input type="number" step="0.01" min="0" max="100" data-exit-percent value="${row.percent || ""}" placeholder="e.g. 50" />
            </div>
            <div class="form-group">
                <label>Exit P/L</label>
                <input type="text" data-exit-pnl class="calculated-field" value="$0.00" readonly />
            </div>
            <div class="form-group">
                <label>Exit R</label>
                <input type="text" data-exit-rr class="calculated-field" value="0.00R" readonly />
            </div>
            <div class="form-group">
                <label>Position Left</label>
                <input type="text" data-exit-remaining class="calculated-field" value="100%" readonly />
            </div>
            <button type="button" class="exit-remove" data-remove-exit="${index}" aria-label="Remove exit ${index + 1}"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join("");

    calculateAll();
}

function addExitExecution() {
    exitExecutionsDraft = getExitRowsFromForm();
    const used = exitExecutionsDraft.reduce((sum, row) => sum + row.percent, 0);
    const remaining = Math.max(0, 100 - used);
    exitExecutionsDraft.push({ price: 0, percent: remaining > 0 ? Number(remaining.toFixed(2)) : 0 });
    renderExitExecutions();
}

function removeExitExecution(index) {
    exitExecutionsDraft = getExitRowsFromForm();
    if (exitExecutionsDraft.length <= 1) {
        exitExecutionsDraft = [];
    } else {
        exitExecutionsDraft.splice(index, 1);
    }
    renderExitExecutions();
}

function calculateExitSummary() {
    const entry = num("entry");
    const lotSize = num("lotSize");
    const pair = val("pair") || "EURUSD";
    const direction = val("direction") || "BUY";
    const pipSize = getPipSize(pair);
    const pipValue = getPipValue(pair);
    const stopLoss = num("stopLoss");
    const riskDistance = Math.abs(entry - stopLoss);
    const riskAmount = (riskDistance / pipSize) * pipValue * lotSize;
    const rows = getExitRowsFromForm();
    const totalPercent = rows.reduce((sum, row) => sum + row.percent, 0);

    const computed = rows.map(row => calculateExitLeg(row.price, row.percent, {
        entry, stopLoss, lotSize, riskAmount, pipSize, pipValue, pair, direction
    }));

    const grossProfit = computed.reduce((sum, row) => sum + row.pnl, 0);
    const commission = Math.max(0, num("commission"));
    const netProfit = grossProfit - commission;
    const weightedExitDenominator = computed.reduce((sum, row) => sum + row.percent, 0);
    const weightedExit = weightedExitDenominator > 0
        ? computed.reduce((sum, row) => sum + (row.price * row.percent), 0) / weightedExitDenominator
        : 0;
    // Realized RR = sum of each actual exit's price-based R contribution.
    // Example: 50% at +2R and 50% at +4R = +3R realized.
    const realizedRR = computed.reduce((sum, row) => sum + (Number(row.rr) || 0), 0);
    const remaining = Math.max(0, 100 - totalPercent);
    let result = "Pending";
    if (totalPercent > 0) result = totalPercent >= 100 ? (grossProfit > 0.005 ? "Win" : grossProfit < -0.005 ? "Loss" : "Breakeven") : "Partial";

    return { rows, computed, totalPercent, remaining, grossProfit, commission, netProfit, weightedExit, realizedRR, result, riskAmount };
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
        showJournalNotification("Unable to load trading accounts.", "error");
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
        showJournalNotification("Trading account deleted.", "success");
    } catch (error) {
        console.error("❌ Delete account error:", error);
        showJournalNotification("Unable to delete trading account.", "error");
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
async function migrateLegacyTrades() {
    if (!currentUser) return;

    try {
        // Older versions stored trades in /trades. Copy this student's old
        // records into the canonical users/{uid}/trades collection once.
        const legacyQuery = query(
            collection(db, "trades"),
            where("userId", "==", currentUser.uid)
        );
        const legacySnapshot = await getDocs(legacyQuery);

        for (const legacyDoc of legacySnapshot.docs) {
            const target = doc(db, "users", currentUser.uid, "trades", legacyDoc.id);
            const targetSnapshot = await getDoc(target);
            if (!targetSnapshot.exists()) {
                await setDoc(target, cleanFirestoreData({
                    ...legacyDoc.data(),
                    id: legacyDoc.id,
                    userId: currentUser.uid,
                    public: false,
                    createdByRole: currentUserRole === "admin" ? "admin" : "member",
                    migratedFromLegacy: true,
                    migratedAt: new Date().toISOString()
                }));
            }
        }

        if (legacySnapshot.size) {
            console.log("✅ Legacy trades migrated:", legacySnapshot.size);
        }
    } catch (error) {
        // Migration must never prevent the journal itself from opening.
        console.warn("Legacy trade migration skipped:", error.message);
    }
}

async function loadTrades() {
    if (!currentUser) return;
    trades = [];

    try {
        await migrateLegacyTrades();
        // IMPORTANT: read ONLY the signed-in student's canonical journal.
        const snapshot = await getDocs(tradesCollection());
        for (const item of snapshot.docs) {
            const data = item.data();
            // Backfill the immutable creator-role marker for older trades
            // that were created by this admin before public community trades
            // were restricted to admin-originated records.
            if (currentUserRole === "admin" && !data.createdByRole) {
                try {
                    await updateDoc(item.ref, { createdByRole: "admin", public: false });
                    data.createdByRole = "admin";
                    data.public = false;
                } catch (migrationError) {
                    console.warn("Could not backfill admin trade marker:", migrationError.message);
                }
            }
            trades.push({ id: item.id, ...data, userId: currentUser.uid });
        }

        trades.sort((a, b) => {
            const av = Date.parse(a.updated || a.created || a.date || "") || 0;
            const bv = Date.parse(b.updated || b.created || b.date || "") || 0;
            return bv - av;
        });

        console.log("✅ Student journal trades loaded:", trades.length);
    } catch (error) {
        console.error("❌ Firestore trade loading failed:", error);
        showJournalNotification("Unable to load journal entries.", "error");
    }
}

async function addTradeToFirestore(trade) {
    if (!currentUser) throw new Error("User is not authenticated.");

    const cleanTrade = cleanFirestoreData(trade);
    delete cleanTrade.id;

    const tradeId = "trade-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);

    const tradeRef = doc(db, "users", currentUser.uid, "trades", tradeId);

    await setDoc(tradeRef, {
        ...cleanTrade,
        id: tradeId,
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        createdByRole: currentUserRole === "admin" ? "admin" : "member",
        public: false,
        created: cleanTrade.created || new Date().toISOString(),
        updated: new Date().toISOString(),
        createdAt: serverTimestamp()
    });

    return tradeId;
}

async function updateTradeInFirestore(tradeId, trade) {
    if (!currentUser) throw new Error("User is not authenticated.");

    const cleanTrade = cleanFirestoreData(trade);
    delete cleanTrade.id;

    const tradeRef = doc(db, "users", currentUser.uid, "trades", tradeId);
    await updateDoc(tradeRef, {
        ...cleanTrade,
        updated: new Date().toISOString()
    });
    console.log("✅ Trade updated:", tradeId);
}

async function deleteTradeFromFirestore(tradeId) {
    if (!currentUser) throw new Error("User is not authenticated.");
    await deleteDoc(doc(db, "users", currentUser.uid, "trades", tradeId));
    console.log("✅ Trade deleted:", tradeId);
}

// --------------------------------------------------------------
// BUILD TRADE FROM FORM
// --------------------------------------------------------------
function buildTradeFromForm(isUpdate = false) {
    const accountId = val("tradeAccount");
    const account = getAccount(accountId);
    const existing = editingTrade || {};
    const exitSummary = calculateExitSummary();
    const result = exitSummary.result;
    const currentEntry = num("entry");
    const currentSL = num("stopLoss");
    const currentTP = num("takeProfit");
    const lotSize = num("lotSize");
    const balance = num("balance");
    const pipSize = getPipSize(val("pair"));
    const pipValue = getPipValue(val("pair"));
    const slDistance = Math.abs(currentEntry - currentSL);
    const actualRisk = exitSummary.riskAmount;
    const tpDistance = Math.abs(currentTP - currentEntry);
    const projectedRR = calculateProjectedRR({ entry: currentEntry, stopLoss: currentSL, takeProfit: currentTP, direction: val("direction") });
    const lastExit = exitSummary.computed.filter(row => row.price > 0).at(-1);

    let entryModel = val("entryModel");
    if (entryModel === "__custom__") entryModel = val("entryModelCustom").trim();

    return {
        id: isUpdate && existing.id ? existing.id : undefined,
        accountId, userId: currentUser.uid, userEmail: currentUser.email || "",
        date: val("tradeDate") || getLocalDate(), time: val("tradeTime") || getLocalTime(),
        pair: val("pair"), direction: val("direction"), session: val("session"), broker: val("broker"),
        account: account?.name || "", accountBalance: num("tradeAccountBalance"),
        accountRiskSetting: val("tradeRiskSetting"), currency: val("currencyDisplay"), pipValue: val("pipValueDisplay"),
        htfSwing: val("htfSwing"), htfInternal: val("htfInternal"), mtfSwing: val("mtfSwing"), mtfInternal: val("mtfInternal"),
        ltfStructure: val("ltfStructure"), liquidity: val("liquidity"), poi: val("poi"), entryModel,
        entryConfirmation: val("entryConfirmation"), tradeValid: val("tradeValid"),
        confluences: {
            htfSwing: isChecked("confHTFSwing"), htfInternal: isChecked("confHTFInternal"),
            mtfSwing: isChecked("confMTFSwing"), mtfInternal: isChecked("confMTFInternal"),
            htfDemand: isChecked("confHTFDemand"), htfSupply: isChecked("confHTFSupply"),
            mtfDemand: isChecked("confMTFDemand"), mtfSupply: isChecked("confMTFSupply"),
            premium: isChecked("confPremium"), discount: isChecked("confDiscount"), sweep: isChecked("confSweep"),
            choch: isChecked("confChoch"), bos: isChecked("confBos"), mitigation: isChecked("confMitigation"),
            refined: isChecked("confRefined"), extreme: isChecked("confExtreme")
        },
        entry: currentEntry, stopLoss: currentSL, takeProfit: currentTP,
        exitPrice: lastExit?.price || 0,
        partialPercent: exitSummary.totalPercent,
        exitExecutions: exitSummary.computed.map((row, index) => ({
            index: index + 1,
            price: row.price,
            percent: row.percent,
            pnl: Number(row.pnl.toFixed(2)),
            rr: Number(row.rr.toFixed(4))
        })),
        totalExitPercent: Number(exitSummary.totalPercent.toFixed(2)),
        remainingPercent: Number(exitSummary.remaining.toFixed(2)),
        weightedExitPrice: exitSummary.weightedExit || 0,
        initialEntry: existing.initialEntry ?? currentEntry,
        initialStopLoss: existing.initialStopLoss ?? currentSL,
        initialTakeProfit: existing.initialTakeProfit ?? currentTP,
        initialRR: existing.initialRR ?? projectedRR, plannedRR: projectedRR,
        lotSize, balance, riskSettingAmount: num("riskSettingAmount"), riskAmount: actualRisk, risk: num("risk"),
        rr: exitSummary.realizedRR,
        actualRR: exitSummary.realizedRR,
        realizedRR: exitSummary.realizedRR,
        potentialProfit: num("potentialProfit"), potentialLoss: num("potentialLoss"),
        profit: Number(exitSummary.grossProfit.toFixed(2)),
        grossProfit: Number(exitSummary.grossProfit.toFixed(2)),
        commission: Number(exitSummary.commission.toFixed(2)),
        netProfit: Number(exitSummary.netProfit.toFixed(2)),
        result,
        status: exitSummary.totalPercent >= 100 ? "Closed" : (exitSummary.totalPercent > 0 ? "Partial" : "Pending"),
        confidence: val("confidence"), emotion: val("emotion"), discipline: val("discipline"), patience: val("patience"),
        tradeSummary: val("tradeSummary"), strengths: val("strengths"), mistakes: val("mistakes"), lessonLearned: val("lessonLearned"),
        improvementPlan: val("improvementPlan"), notes: val("notes"), beforeChart: val("beforeChart"), duringChart: val("duringChart"), afterChart: val("afterChart"),
        public: existing.public || false, created: existing.created || new Date().toISOString(), updated: new Date().toISOString(),
        closed: exitSummary.totalPercent >= 100 ? (existing.closed || new Date().toISOString()) : null
    };
}

// --------------------------------------------------------------
// SAVE TRADE
// --------------------------------------------------------------
async function saveTrade(e) {
    e.preventDefault();
    if (!currentUser) { showJournalNotification("Please sign in to continue.", "error"); return; }

    const date = val("tradeDate");
    if (!date) { showJournalNotification("Please select a trade date.", "error"); return; }

    const accountId = val("tradeAccount");
    if (!accountId || !getAccount(accountId)) {
        showJournalNotification("Please select a trading account.", "error");
        return;
    }

    const projectedRRForValidation = calculateProjectedRR({
        entry: num("entry"),
        stopLoss: num("stopLoss"),
        takeProfit: num("takeProfit"),
        direction: val("direction")
    });
    const editingClosedTrade = editingTrade && String(editingTrade.status || "").toLowerCase() === "closed";
    if (!editingClosedTrade && projectedRRForValidation + 1e-9 < JOURNAL_MIN_PROJECTED_RR) {
        showJournalNotification(`Projected RR must be at least ${JOURNAL_MIN_PROJECTED_RR.toFixed(2)}R. Check Entry, SL, TP and direction.`, "error");
        return;
    }

    const exitRows = getExitRowsFromForm();
    const totalExitPercent = exitRows.reduce((sum, row) => sum + row.percent, 0);
    if (totalExitPercent > 100.0001) {
        showJournalNotification("Exit percentages cannot exceed 100%.", "error");
        return;
    }
    if (exitRows.some(row => row.percent > 0 && row.price <= 0)) {
        showJournalNotification("Every exit percentage must have an actual exit price.", "error");
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

            showJournalNotification("Trade updated successfully.", "success");
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

        showJournalNotification("Trade saved successfully.", "success");
        resetTradeForm();
        await loadTrades();
        await loadAccounts();
        refreshUI();

    } catch (error) {
        console.error("❌ TRADE SAVE ERROR:", error);
        showJournalNotification("Unable to save trade. Please try again.", "error");
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
    if (!trade) { showJournalNotification("Trade could not be found.", "error"); return; }

    if (!confirm(`Delete ${trade.pair || "this trade"}?\n\nThis will permanently remove the trade from your journal.`)) {
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
        showJournalNotification("Trade deleted.", "success");
    } catch (error) {
        console.error("❌ DELETE TRADE ERROR:", error);
        showJournalNotification("Unable to delete trade. Please try again.", "error");
    }
}

// --------------------------------------------------------------
// CLOSE PENDING TRADE
// --------------------------------------------------------------
async function closeTrade(tradeId) {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) { showJournalNotification("Trade could not be found.", "error"); return; }

    const existingExits = Array.isArray(trade.exitExecutions) && trade.exitExecutions.length
        ? trade.exitExecutions.map(row => ({ price: row.price, percent: row.percent }))
        : (Number(trade.exitPrice) > 0 ? [{ price: trade.exitPrice, percent: Number(trade.partialPercent) || 100 }] : []);

    populateForm(trade);
    exitExecutionsDraft = existingExits;
    renderExitExecutions();

    const message = existingExits.length
        ? "The trade is now loaded into the journal. Add or edit every actual exit/partial, then save the trade."
        : "The trade is now loaded into the journal. Enter the actual exit price(s) and percentages, then save the trade.";
    showJournalNotification(message, "info");
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
    const riskPercent = account ? Number(account.riskPercent) || 0 : 0;
    const riskSettingAmount = balance * (riskPercent / 100);
    setValue("riskSettingAmount", riskSettingAmount > 0 ? riskSettingAmount.toFixed(2) : "");
    setText("summaryRiskSetting", money(riskSettingAmount));

    const slDistance = entry && stopLoss ? Math.abs(entry - stopLoss) : 0;
    const tpDistance = entry && takeProfit ? Math.abs(takeProfit - entry) : 0;
    const slPips = slDistance / pipSize;
    const actualRisk = slPips * pipValue * lotSize;
    setValue("riskAmount", actualRisk > 0 ? actualRisk.toFixed(2) : "");

    const actualRiskPercent = balance > 0 ? (actualRisk / balance) * 100 : 0;
    setValue("risk", actualRisk > 0 ? actualRiskPercent.toFixed(2) : "");

    const projectedRR = calculateProjectedRR({ entry, stopLoss, takeProfit, direction: val("direction") });
    setValue("projectedRR", projectedRR ? projectedRR.toFixed(2) : "");
    setText("summaryProjectedRR", projectedRR.toFixed(2));

    const exitSummary = calculateExitSummary();
    const result = exitSummary.result;
    const actualRR = exitSummary.realizedRR;
    setValue("rr", actualRR ? actualRR.toFixed(2) : "");
    setText("summaryRR", actualRR.toFixed(2));
    setValue("profit", exitSummary.grossProfit ? exitSummary.grossProfit.toFixed(2) : "0.00");
    setValue("result", result);
    setValue("exitPrice", exitSummary.computed.filter(row => row.price > 0).at(-1)?.price || "");
    setValue("partialPercent", exitSummary.totalPercent ? exitSummary.totalPercent.toFixed(2) : "0");

    const potentialProfit = actualRisk * projectedRR;
    setValue("potentialLoss", actualRisk > 0 ? actualRisk.toFixed(2) : "");
    setValue("potentialProfit", potentialProfit > 0 ? potentialProfit.toFixed(2) : "");
    setText("summaryRiskAmount", money(actualRisk));
    setText("summaryRiskPercent", `${actualRiskPercent.toFixed(2)}%`);
    setText("summaryPotentialProfit", money(potentialProfit));
    setText("summaryPotentialLoss", money(actualRisk));

    const container = document.getElementById("exitExecutions");
    if (container) {
        exitSummary.computed.forEach((row, index) => {
            const element = container.querySelector(`.exit-row[data-exit-index="${index}"]`);
            if (!element) return;
            const pnl = element.querySelector("[data-exit-pnl]");
            const rr = element.querySelector("[data-exit-rr]");
            const remaining = element.querySelector("[data-exit-remaining]");
            if (pnl) pnl.value = signedMoney(row.pnl);
            if (rr) rr.value = `${row.rr.toFixed(2)}R`;
            if (remaining) {
                const used = exitSummary.computed.slice(0, index + 1).reduce((sum, item) => sum + item.percent, 0);
                remaining.value = `${Math.max(0, 100 - used).toFixed(2)}%`;
            }
        });
    }

    setText("summaryClosedPercent", `${exitSummary.totalPercent.toFixed(2)}%`);
    setText("summaryRemainingPercent", `${exitSummary.remaining.toFixed(2)}%`);
    setText("summaryGrossProfit", signedMoney(exitSummary.grossProfit));
    setText("summaryCommission", money(exitSummary.commission));
    setText("summaryNetProfit", signedMoney(exitSummary.netProfit));
    setText("summaryWeightedExit", exitSummary.weightedExit ? Number(exitSummary.weightedExit).toFixed(5) : "—");
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

function getTradeRealizedRR(trade) {
    if (!trade || typeof trade !== "object") return 0;
    const entry = Number(trade.initialEntry ?? trade.entry) || 0;
    const stopLoss = Number(trade.initialStopLoss ?? trade.stopLoss) || 0;
    const riskDistance = Math.abs(entry - stopLoss);
    const direction = String(trade.direction || "BUY").toUpperCase();
    if (entry && stopLoss && riskDistance > 0) {
        const exits = Array.isArray(trade.exitExecutions) ? trade.exitExecutions : [];
        if (exits.length) {
            return exits.reduce((sum, row) => {
                const price = Number(row?.price) || 0;
                const percent = Math.max(0, Math.min(100, Number(row?.percent) || 0));
                if (!price || percent <= 0) return sum;
                const signedMove = direction === "SELL" ? entry - price : price - entry;
                return sum + (signedMove / riskDistance) * (percent / 100);
            }, 0);
        }
        const exitPrice = Number(trade.exitPrice) || 0;
        if (exitPrice) {
            let percent = Number(trade.totalExitPercent ?? trade.partialPercent);
            if (!Number.isFinite(percent) || percent <= 0) {
                percent = String(trade.status || "").toLowerCase() === "closed" ? 100 : 100;
            }
            percent = Math.max(0, Math.min(100, percent));
            const signedMove = direction === "SELL" ? entry - exitPrice : exitPrice - entry;
            return (signedMove / riskDistance) * (percent / 100);
        }
    }
    return Number(trade.actualRR ?? trade.realizedRR ?? trade.rr ?? 0) || 0;
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
    const rrValues = closed.map(getTradeRealizedRR).filter(Number.isFinite);
    const averageRR = rrValues.length === 0 ? 0 : rrValues.reduce((s, value) => s + value, 0) / rrValues.length;

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
    if (!currentUser) { showJournalNotification("Please sign in to continue.", "error"); return; }

    const name = val("newAccountName").trim();
    const type = val("newAccountType");
    const startingBalance = Number(val("newAccountBalance")) || 0;
    const riskPercent = Number(val("newAccountRisk")) || 0;
    const currency = val("newAccountCurrency").trim().toUpperCase();

    if (!name) { showJournalNotification("Please enter an account name.", "error"); return; }
    if (startingBalance < 0) { showJournalNotification("Starting balance cannot be negative.", "error"); return; }

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
            showJournalNotification("Trading account updated.", "success");
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
            showJournalNotification("Trading account added.", "success");
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
        showJournalNotification("Unable to save trading account. Please try again.", "error");
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
    setValue("lotSize", trade.lotSize);
    setValue("commission", trade.commission ?? 0);
    const savedExits = Array.isArray(trade.exitExecutions) && trade.exitExecutions.length
        ? trade.exitExecutions.map(row => ({ price: row.price, percent: row.percent }))
        : (Number(trade.exitPrice) > 0 ? [{ price: trade.exitPrice, percent: Number(trade.partialPercent) || 100 }] : []);
    exitExecutionsDraft = savedExits;
    renderExitExecutions(savedExits);
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
                exitExecutionsDraft = [];
                renderExitExecutions([]);
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

    ["pair", "entry", "stopLoss", "takeProfit", "lotSize", "commission"]
    .forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", calculateAll);
            el.addEventListener("change", calculateAll);
        }
    });

    document.getElementById("entryModel")?.addEventListener("change", syncEntryModelInput);
    document.getElementById("addExitBtn")?.addEventListener("click", addExitExecution);
    document.getElementById("exitExecutions")?.addEventListener("input", () => {
        exitExecutionsDraft = getExitRowsFromForm();
        calculateAll();
    });
    document.getElementById("exitExecutions")?.addEventListener("change", () => {
        exitExecutionsDraft = getExitRowsFromForm();
        calculateAll();
    });
    document.getElementById("exitExecutions")?.addEventListener("click", event => {
        const button = event.target.closest("[data-remove-exit]");
        if (button) removeExitExecution(Number(button.dataset.removeExit));
    });
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
            currentUserRole = role;
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
            if (!exitExecutionsDraft.length) renderExitExecutions([]);
            checkEditTrade();

            console.log("✅ GTRADES-AXIS™ Journal ready.");

        } catch (error) {
            console.error("❌ Journal initialization failed:", error);
            app.classList.remove("loading");
            app.classList.add("locked");
            showJournalNotification("Journal is temporarily unavailable. Please try again.", "error");
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

console.log("✅ Journal lock script loaded.");