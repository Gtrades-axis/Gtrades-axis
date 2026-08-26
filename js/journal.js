/* ============================================================
   GTRADES-AXIS™
   TRADING JOURNAL – FIRESTORE FIRST (PERMANENT STORAGE)
   ============================================================ */

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot
} from "firebase/firestore";


/* ============================================================
   JOURNAL SYSTEM
============================================================ */

function initJournal() {

  console.log("✅ GTRADES-AXIS Journal initializing (Firestore First)...");

  const STORAGE_KEY = "trades";
  const ACCOUNTS_KEY = "gtrades_axis_accounts";

  let trades = [];
  let accounts = {};

  let equityChartInstance = null;
  let monthlyChartInstance = null;

  let editingTrade = null;
  let selectedAccountId = "all";

  let isSavingToFirestore = false;
  let unsubscribeTrades = null;

  /* ==========================================================
     HELPERS
  ========================================================== */

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
  }

  function num(id) {
    const n = parseFloat(val(id));
    return Number.isFinite(n) ? n : 0;
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
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
    return (n >= 0 ? "+" : "-") +
      "$" +
      Math.abs(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
  }


  /* ==========================================================
     LOCAL DATE / TIME
  ========================================================== */

  function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getLocalTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }


  function initializeTradeDateTime() {
    const dateInput = document.getElementById("tradeDate");
    const timeInput = document.getElementById("tradeTime");
    if (dateInput && !dateInput.value) {
      dateInput.value = getLocalDate();
    }
    if (timeInput && !timeInput.value) {
      timeInput.value = getLocalTime();
    }
  }


  /* ==========================================================
     RESULT NORMALIZATION
  ========================================================== */

  function normalizeResult(value) {
    const v = String(value || "Pending").trim().toLowerCase();
    if (v === "win") return "Win";
    if (v === "loss") return "Loss";
    if (v === "breakeven" || v === "break even" || v === "break-even") return "Breakeven";
    if (v === "partial") return "Partial";
    return "Pending";
  }


  /* ==========================================================
     PRICE-BASED RR
  ========================================================== */

  function calculatePriceRR(entry, stopLoss, exitPrice, direction) {
    entry = Number(entry);
    stopLoss = Number(stopLoss);
    exitPrice = Number(exitPrice);
    if (!Number.isFinite(entry) || !Number.isFinite(stopLoss) || !Number.isFinite(exitPrice)) return 0;
    let riskDistance = Math.abs(entry - stopLoss);
    if (riskDistance <= 0) return 0;
    let rewardDistance = (direction === "SELL") ? (entry - exitPrice) : (exitPrice - entry);
    return rewardDistance / riskDistance;
  }


  /* ==========================================================
     OUTCOME RR
  ========================================================== */

  function calculateOutcomeRR({
    result,
    actualProfit,
    riskAmount,
    plannedRR,
    entry,
    stopLoss,
    exitPrice,
    direction,
    partialPercent
  }) {
    result = normalizeResult(result);
    actualProfit = Number(actualProfit) || 0;
    riskAmount = Number(riskAmount) || 0;
    plannedRR = Number(plannedRR) || 0;
    exitPrice = Number(exitPrice) || 0;

    if (result === "Pending") return 0;
    if (result === "Breakeven") return 0;
    if (result === "Win") return plannedRR;
    if (result === "Loss") {
      if (riskAmount <= 0) return 0;
      return -(Math.abs(actualProfit) / riskAmount);
    }
    if (result === "Partial") {
      if (!Number.isFinite(entry) || !Number.isFinite(stopLoss) || !Number.isFinite(exitPrice)) return 0;
      const priceRR = calculatePriceRR(entry, stopLoss, exitPrice, direction);
      const percentage = Math.min(100, Math.max(0, Number(partialPercent) || 0));
      if (percentage <= 0) return priceRR;
      return priceRR * (percentage / 100);
    }
    return 0;
  }


  /* ==========================================================
     ACCOUNT STORAGE
  ========================================================== */

  function loadAccounts() {
    const saved = localStorage.getItem(ACCOUNTS_KEY);
    if (!saved) {
      accounts = {};
      return;
    }
    try {
      accounts = JSON.parse(saved) || {};
    } catch (error) {
      console.error("Account data corrupted:", error);
      accounts = {};
    }
    Object.keys(accounts).forEach(id => {
      const account = accounts[id];
      if (!account || !account.id || !account.name) {
        delete accounts[id];
      }
    });
    saveAccounts();
  }

  function saveAccounts() {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function getAccount(id) {
    return accounts[id] || null;
  }

  function getSelectedAccount() {
    if (selectedAccountId === "all") return null;
    return getAccount(selectedAccountId);
  }


  /* ==========================================================
     TRADE STORAGE – FIRESTORE FIRST
  ========================================================== */

  // ---- Load trades from Firestore (listens in real-time) ----
  function listenToTrades() {
    const user = auth.currentUser;
    if (!user) {
      console.warn("No user – cannot listen to trades.");
      return;
    }

    const q = query(collection(db, "trades"), orderBy("createdAt", "desc"));

    if (unsubscribeTrades) unsubscribeTrades();

    unsubscribeTrades = onSnapshot(q, (snapshot) => {
      const loadedTrades = [];
      snapshot.forEach(doc => {
        loadedTrades.push({ id: doc.id, ...doc.data() });
      });

      trades = loadedTrades;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
      console.log("📥 Trades loaded from Firestore:", trades.length);

      refreshUI();
    }, (error) => {
      console.error("Firestore listener error:", error);
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          trades = JSON.parse(cached) || [];
          console.log("⚠️ Using cached trades from localStorage:", trades.length);
          refreshUI();
        } catch (e) {
          trades = [];
        }
      }
    });
  }

  // ---- Save trades to Firestore and localStorage ----
  function saveTrades() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    console.log("💾 Saved trades to localStorage:", trades.length);

    const user = auth.currentUser;
    if (!user) {
      console.warn("No user logged in – skipping Firestore sync.");
      return;
    }

    if (isSavingToFirestore) return;
    isSavingToFirestore = true;

    const promises = trades.map(async (trade) => {
      try {
        const tradeRef = doc(db, "trades", trade.id);
        const data = { ...trade };
        if (data.public === undefined) data.public = false;
        data.updatedAt = new Date().toISOString();
        if (!data.createdAt) data.createdAt = data.updatedAt;
        if (!data.userId) data.userId = user.uid;
        await setDoc(tradeRef, data, { merge: true });
        return true;
      } catch (error) {
        console.error("Failed to sync trade to Firestore:", trade.id, error);
        return false;
      }
    });

    Promise.all(promises).then(() => {
      isSavingToFirestore = false;
      console.log("✅ Trades synced to Firestore.");
    }).catch((error) => {
      console.error("Firestore sync error:", error);
      isSavingToFirestore = false;
    });
  }

  // ---- Load trades (from cache then Firestore) ----
  function loadTrades() {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        trades = JSON.parse(cached) || [];
        console.log("📂 Loaded from localStorage cache:", trades.length);
        refreshUI();
      } catch (e) {
        trades = [];
      }
    }
    listenToTrades();
  }


  /* ==========================================================
     ACCOUNT SELECTORS
  ========================================================== */

  function populateAccountSelectors() {
    const filter = document.getElementById("accountFilter");
    const tradeAccount = document.getElementById("tradeAccount");
    const list = Object.values(accounts);

    if (filter) {
      filter.innerHTML = `<option value="all">All Accounts</option>`;
      list.forEach(account => {
        const option = document.createElement("option");
        option.value = account.id;
        option.textContent = account.name;
        filter.appendChild(option);
      });
      if (selectedAccountId !== "all" && !accounts[selectedAccountId]) {
        selectedAccountId = "all";
      }
      filter.value = selectedAccountId;
    }

    if (tradeAccount) {
      const current = tradeAccount.value;
      tradeAccount.innerHTML = `<option value="">Select an account</option>`;
      list.forEach(account => {
        const option = document.createElement("option");
        option.value = account.id;
        option.textContent = account.name;
        tradeAccount.appendChild(option);
      });
      let target = "";
      if (current && accounts[current]) target = current;
      else if (selectedAccountId !== "all" && accounts[selectedAccountId]) target = selectedAccountId;
      else if (list.length) target = list[0].id;
      tradeAccount.value = target;
    }
  }


  /* ==========================================================
     ACCOUNT INFO
  ========================================================== */

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


  /* ==========================================================
     PIP SETTINGS
  ========================================================== */

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


  /* ==========================================================
     AUTOMATIC CALCULATIONS
  ========================================================== */

  function calculateAll() {
    const pair = val("pair") || "EURUSD";
    const entry = parseFloat(val("entry"));
    const stopLoss = parseFloat(val("stopLoss"));
    const takeProfit = parseFloat(val("takeProfit"));
    const lotSize = parseFloat(val("lotSize")) || 0;
    const balance = parseFloat(val("balance")) || 0;
    const accountId = val("tradeAccount");
    const account = getAccount(accountId);

    const pipSize = getPipSize(pair);
    const pipValue = getPipValue(pair);

    setValue("pipValueDisplay", `$${pipValue.toFixed(2)} / lot`);

    // Account risk
    const riskPercent = account ? Number(account.riskPercent) || 0 : 0;
    const riskSettingAmount = balance * (riskPercent / 100);
    setValue("riskSettingAmount", riskSettingAmount > 0 ? riskSettingAmount.toFixed(2) : "");
    setText("summaryRiskSetting", money(riskSettingAmount));

    // Distances
    let slDistance = 0, tpDistance = 0;
    if (Number.isFinite(entry) && Number.isFinite(stopLoss)) slDistance = Math.abs(entry - stopLoss);
    if (Number.isFinite(entry) && Number.isFinite(takeProfit)) tpDistance = Math.abs(takeProfit - entry);

    const slPips = slDistance / pipSize;
    const tpPips = tpDistance / pipSize;
    const actualRisk = slPips * pipValue * lotSize;
    setValue("riskAmount", actualRisk > 0 ? actualRisk.toFixed(2) : "");

    const actualRiskPercent = balance > 0 ? (actualRisk / balance) * 100 : 0;
    setValue("risk", actualRisk > 0 ? actualRiskPercent.toFixed(2) : "");

    const plannedRR = slDistance > 0 ? tpDistance / slDistance : 0;
    let displayRR = plannedRR;
    if (editingTrade && editingTrade.status === "Closed") {
      displayRR = Number.isFinite(Number(editingTrade.rr)) ? Number(editingTrade.rr) : plannedRR;
    }

    setValue("rr", displayRR !== 0 ? displayRR.toFixed(2) : "");
    setText("summaryRR", displayRR.toFixed(2));

    setValue("potentialLoss", actualRisk > 0 ? actualRisk.toFixed(2) : "");
    const potentialProfit = actualRisk * plannedRR;
    setValue("potentialProfit", potentialProfit > 0 ? potentialProfit.toFixed(2) : "");

    setText("summaryRiskAmount", money(actualRisk));
    setText("summaryRiskPercent", `${actualRiskPercent.toFixed(2)}%`);
    setText("summaryPotentialProfit", money(potentialProfit));
    setText("summaryPotentialLoss", money(actualRisk));
  }


  /* ==========================================================
     BUILD TRADE OBJECT
  ========================================================== */

  function buildTradeFromForm(isUpdate = false) {

    const accountId = val("tradeAccount");
    const account = getAccount(accountId);
    const result = normalizeResult(val("result"));

    const currentEntry = num("entry");
    const currentSL = num("stopLoss");
    const currentTP = num("takeProfit");

    const closedExisting = isUpdate && editingTrade && editingTrade.status === "Closed";

    const originalEntry = closedExisting ?
      (Number.isFinite(Number(editingTrade.originalEntry)) ? Number(editingTrade.originalEntry) :
        Number(editingTrade.entry) || currentEntry) :
      currentEntry;

    const originalStopLoss = closedExisting ?
      (Number.isFinite(Number(editingTrade.originalStopLoss)) ? Number(editingTrade.originalStopLoss) :
        Number(editingTrade.stopLoss) || currentSL) :
      currentSL;

    const originalTakeProfit = closedExisting ?
      (Number.isFinite(Number(editingTrade.originalTakeProfit)) ? Number(editingTrade.originalTakeProfit) :
        Number(editingTrade.takeProfit) || currentTP) :
      currentTP;

    const originalRiskAmount = closedExisting ?
      (Number.isFinite(Number(editingTrade.riskAmount)) ? Number(editingTrade.riskAmount) : num("riskAmount")) :
      num("riskAmount");

    const originalPlannedRR = closedExisting ?
      (Number.isFinite(Number(editingTrade.plannedRR)) ? Number(editingTrade.plannedRR) :
        calculatePriceRR(originalEntry, originalStopLoss, originalTakeProfit, val("direction"))) :
      calculatePriceRR(currentEntry, currentSL, currentTP, val("direction"));

    const actualProfit = num("profit");
    const exitPrice = num("exitPrice");
    const partialPercent = num("partialPercent");

    const calculatedRR = calculateOutcomeRR({
      result,
      actualProfit,
      riskAmount: originalRiskAmount,
      plannedRR: originalPlannedRR,
      entry: originalEntry,
      stopLoss: originalStopLoss,
      exitPrice,
      direction: val("direction"),
      partialPercent
    });

    const finalRR = result === "Pending" ? originalPlannedRR : calculatedRR;

    let tradeDate = val("tradeDate");
    let tradeTime = val("tradeTime");
    if (!tradeDate) tradeDate = getLocalDate();
    if (!tradeTime) tradeTime = getLocalTime();

    let entryModel = val("entryModel");
    if (entryModel === "__custom__") entryModel = val("entryModelCustom").trim();

    const tradeId = (isUpdate && editingTrade) ? editingTrade.id : (Date.now() + "_" + Math.random().toString(36).slice(2, 8));

    return {
      id: tradeId,
      userId: auth.currentUser?.uid || '',
      accountId,
      account: account ? account.name : "",
      date: tradeDate,
      time: tradeTime,
      pair: val("pair"),
      direction: val("direction"),
      session: val("session"),
      broker: val("broker"),
      originalEntry,
      originalStopLoss,
      originalTakeProfit,
      plannedRR: originalPlannedRR,
      riskAmount: originalRiskAmount,
      entry: currentEntry,
      stopLoss: currentSL,
      takeProfit: currentTP,
      lotSize: num("lotSize"),
      result,
      status: result === "Pending" ? "Pending" : "Closed",
      profit: actualProfit,
      commission: num("commission"),
      exitPrice,
      partialPercent,
      rr: finalRR,
      balance: num("balance"),
      risk: num("risk"),
      riskSettingAmount: num("riskSettingAmount"),
      potentialProfit: num("potentialProfit"),
      potentialLoss: num("potentialLoss"),
      htfSwing: val("htfSwing"),
      htfInternal: val("htfInternal"),
      mtfSwing: val("mtfSwing"),
      mtfInternal: val("mtfInternal"),
      ltfStructure: val("ltfStructure"),
      liquidity: val("liquidity"),
      poi: val("poi"),
      entryModel,
      entryConfirmation: val("entryConfirmation"),
      tradeValid: val("tradeValid"),
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
      confluences: {
        htfSwing: document.getElementById("confHTFSwing")?.checked || false,
        htfInternal: document.getElementById("confHTFInternal")?.checked || false,
        mtfSwing: document.getElementById("confMTFSwing")?.checked || false,
        mtfInternal: document.getElementById("confMTFInternal")?.checked || false,
        htfDemand: document.getElementById("confHTFDemand")?.checked || false,
        htfSupply: document.getElementById("confHTFSupply")?.checked || false,
        mtfDemand: document.getElementById("confMTFDemand")?.checked || false,
        mtfSupply: document.getElementById("confMTFSupply")?.checked || false,
        premium: document.getElementById("confPremium")?.checked || false,
        discount: document.getElementById("confDiscount")?.checked || false,
        sweep: document.getElementById("confSweep")?.checked || false,
        choch: document.getElementById("confChoch")?.checked || false,
        bos: document.getElementById("confBos")?.checked || false,
        mitigation: document.getElementById("confMitigation")?.checked || false,
        refined: document.getElementById("confRefined")?.checked || false,
        extreme: document.getElementById("confExtreme")?.checked || false
      },
      public: false,
      updatedAt: new Date().toISOString(),
      createdAt: (isUpdate && editingTrade) ? editingTrade.createdAt : new Date().toISOString()
    };
  }


  /* ==========================================================
     ACCOUNT BALANCE
  ========================================================== */

  function applyTradeToAccount(trade, action) {
    const account = getAccount(trade.accountId);
    if (!account) return;

    const profit = Number(trade.profit) || 0;
    const commission = Number(trade.commission) || 0;
    const net = profit - commission;
    const current = Number(account.currentBalance) || Number(account.startingBalance) || 0;

    if (action === "add") {
      account.currentBalance = current + net;
    } else {
      account.currentBalance = current - net;
    }

    saveAccounts();
  }


  /* ==========================================================
     SAVE TRADE
  ========================================================== */

  function saveTrade(event) {
    event.preventDefault();

    let date = val("tradeDate");
    if (!date) {
      date = getLocalDate();
      setValue("tradeDate", date);
    }

    let time = val("tradeTime");
    if (!time) {
      time = getLocalTime();
      setValue("tradeTime", time);
    }

    const accountId = val("tradeAccount");
    if (!accountId || !getAccount(accountId)) {
      alert("Please add/select a trading account before saving a trade.");
      return;
    }

    const isUpdate = editingTrade !== null;
    const trade = buildTradeFromForm(isUpdate);

    if (isUpdate && editingTrade) {
      const index = trades.findIndex(t => t.id === editingTrade.id);
      if (index !== -1) {
        const oldTrade = trades[index];
        if (oldTrade.status === "Closed") applyTradeToAccount(oldTrade, "remove");

        if (oldTrade.status === "Closed") {
          trade.originalEntry = oldTrade.originalEntry ?? oldTrade.entry;
          trade.originalStopLoss = oldTrade.originalStopLoss ?? oldTrade.stopLoss;
          trade.originalTakeProfit = oldTrade.originalTakeProfit ?? oldTrade.takeProfit;
          trade.plannedRR = oldTrade.plannedRR ?? trade.plannedRR;
          trade.rr = calculateOutcomeRR({
            result: trade.result,
            actualProfit: trade.profit,
            riskAmount: oldTrade.riskAmount ?? trade.riskAmount,
            plannedRR: trade.plannedRR,
            entry: trade.originalEntry,
            stopLoss: trade.originalStopLoss,
            exitPrice: trade.exitPrice,
            direction: trade.direction,
            partialPercent: trade.partialPercent
          });
        }

        trades[index] = trade;
        if (trade.status === "Closed") applyTradeToAccount(trade, "add");
      }

      saveTrades();
      alert("✅ Trade updated successfully.");
      editingTrade = null;

      const submitBtn = document.getElementById("saveTradeBtn");
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Trade';
        submitBtn.className = "btn-primary";
      }

      window.location.href = "/history";
      return;
    }

    // New trade
    trades.unshift(trade);
    saveTrades();

    if (trade.status === "Closed") applyTradeToAccount(trade, "add");

    event.target.reset();
    setValue("tradeDate", getLocalDate());
    setValue("tradeTime", getLocalTime());
    const accSel = document.getElementById("tradeAccount");
    if (accSel && accountId) accSel.value = accountId;
    updateTradeAccountInfo();
    calculateAll();
    refreshUI();
    alert(`✅ Trade saved as ${trade.result}.`);
  }


  /* ==========================================================
     EDIT MODE – populate form
  ========================================================== */

  function populateForm(trade) {
    if (!trade) return;

    setValue("tradeDate", trade.date || getLocalDate());
    setValue("tradeTime", trade.time || getLocalTime());
    setValue("pair", trade.pair || "");
    setValue("direction", trade.direction || "BUY");
    setValue("session", trade.session || "London");
    setValue("broker", trade.broker || "");
    setValue("tradeAccount", trade.accountId || "");
    setValue("entry", trade.entry ?? "");
    setValue("stopLoss", trade.stopLoss ?? "");
    setValue("takeProfit", trade.takeProfit ?? "");
    setValue("lotSize", trade.lotSize ?? "");
    setValue("profit", trade.profit ?? "");
    setValue("commission", trade.commission ?? "");
    setValue("result", trade.result || "Pending");
    setValue("exitPrice", trade.exitPrice ?? "");
    setValue("partialPercent", trade.partialPercent ?? "");
    setValue("htfSwing", trade.htfSwing || "Bullish");
    setValue("htfInternal", trade.htfInternal || "Bullish");
    setValue("mtfSwing", trade.mtfSwing || "Bullish");
    setValue("mtfInternal", trade.mtfInternal || "Bullish");
    setValue("ltfStructure", trade.ltfStructure || "Bullish BOS");
    setValue("liquidity", trade.liquidity || "None");
    setValue("poi", trade.poi || "Demand");

    const em = document.getElementById("entryModel");
    const cm = document.getElementById("entryModelCustom");
    if (em) {
      const known = ["LC-2A", "LC-1", "LTF RE", "MTF RE"];
      if (known.includes(trade.entryModel)) {
        em.value = trade.entryModel;
        if (cm) { cm.style.display = "none"; }
      } else {
        em.value = "__custom__";
        if (cm) { cm.style.display = "block"; cm.value = trade.entryModel || ""; }
      }
    }

    setValue("entryConfirmation", trade.entryConfirmation || "CHOCH");
    setValue("tradeValid", trade.tradeValid || "Yes");
    setValue("confidence", trade.confidence || "High");
    setValue("emotion", trade.emotion || "Calm");
    setValue("discipline", trade.discipline || "Good");
    setValue("patience", trade.patience || "Good");
    setValue("tradeSummary", trade.tradeSummary || "");
    setValue("strengths", trade.strengths || "");
    setValue("mistakes", trade.mistakes || "");
    setValue("lessonLearned", trade.lessonLearned || "");
    setValue("improvementPlan", trade.improvementPlan || "");
    setValue("notes", trade.notes || "");
    setValue("beforeChart", trade.beforeChart || "");
    setValue("duringChart", trade.duringChart || "");
    setValue("afterChart", trade.afterChart || "");

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
      const cb = document.getElementById(id);
      if (cb) cb.checked = !!(trade.confluences && trade.confluences[key]);
    });

    updateTradeAccountInfo();
    calculateAll();
  }


  /* ==========================================================
     ENTRY MODEL CUSTOM
  ========================================================== */

  const entryModel = document.getElementById("entryModel");
  const entryModelCustom = document.getElementById("entryModelCustom");

  if (entryModel) {
    entryModel.addEventListener("change", () => {
      if (entryModel.value === "__custom__") {
        if (entryModelCustom) {
          entryModelCustom.style.display = "block";
          entryModelCustom.focus();
        }
      } else {
        if (entryModelCustom) {
          entryModelCustom.style.display = "none";
          entryModelCustom.value = "";
        }
      }
    });
  }


  /* ==========================================================
     FORM CALCULATION LISTENERS
  ========================================================== */

  const calculationFields = [
    "pair",
    "entry",
    "stopLoss",
    "takeProfit",
    "lotSize",
    "tradeAccount"
  ];

  calculationFields.forEach(id => {
    const element = document.getElementById(id);
    if (!element) return;

    element.addEventListener("input", () => {
      if (id === "tradeAccount") {
        updateTradeAccountInfo();
      } else {
        calculateAll();
      }
    });

    element.addEventListener("change", () => {
      if (id === "tradeAccount") {
        updateTradeAccountInfo();
      } else {
        calculateAll();
      }
    });
  });


  /* ==========================================================
     DATE/TIME LISTENERS
  ========================================================== */

  const dateInput = document.getElementById("tradeDate");
  const timeInput = document.getElementById("tradeTime");

  if (dateInput) {
    dateInput.addEventListener("change", () => {
      console.log("Trade date:", dateInput.value);
    });
  }

  if (timeInput) {
    timeInput.addEventListener("change", () => {
      console.log("Trade time:", timeInput.value);
    });
  }


  /* ==========================================================
     RESULT CHANGE
  ========================================================== */

  const resultInput = document.getElementById("result");
  if (resultInput) {
    resultInput.addEventListener("change", () => {
      calculateAll();
    });
  }


  /* ==========================================================
     FORM SUBMIT
  ========================================================== */

  const form = document.getElementById("tradeForm");
  if (form) {
    form.addEventListener("submit", saveTrade);
  }


  /* ==========================================================
     ACCOUNT FILTER
  ========================================================== */

  const accountFilter = document.getElementById("accountFilter");

  if (accountFilter) {
    accountFilter.addEventListener("change", () => {
      selectedAccountId = accountFilter.value;
      populateAccountSelectors();
      updateTradeAccountInfo();
      calculateAll();
    });
  }


  /* ==========================================================
     LOGOUT
  ========================================================== */

  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "/login";
      } catch (error) {
        console.error(error);
        alert("Unable to logout.");
      }
    });
  }


  /* ==========================================================
     SCROLL TOP
  ========================================================== */

  const scrollTopBtn = document.getElementById("scrollTopBtn");

  if (scrollTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        scrollTopBtn.classList.add("visible");
      } else {
        scrollTopBtn.classList.remove("visible");
      }
    });

    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }


  /* ==========================================================
     REFRESH UI
  ========================================================== */

  function refreshUI() {
    loadAccounts();
    populateAccountSelectors();
    updateTradeAccountInfo();
    calculateAll();
    calculateStatistics();
    loadRecentTrades();
    initializeCharts();
    updateAccountPanel();
  }


  /* ==========================================================
     STATISTICS (summary)
  ========================================================== */

  function calculateStatistics() {
    const filtered = getFilteredTrades();
    const closed = filtered.filter(t => t.status === "Closed");
    const wins = closed.filter(t => t.result === "Win");
    const losses = closed.filter(t => t.result === "Loss");
    const pending = filtered.filter(t => t.status === "Pending" || t.result === "Pending");

    const totalTrades = filtered.length;
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
    const monthCount = filtered.filter(t => t.date && new Date(t.date) >= monthStart).length;

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
    const consistencyScore = calculateConsistencyScore(closed);
    setText("consistencyScore", consistencyScore.toFixed(1) + "%");
    applyConsistencyClass(document.getElementById("consistencyScore"), consistencyScore);
    setText("monthCount", monthCount);

    const winEl = document.getElementById("winRate");
    if (winEl) winEl.className = winRate >= 50 ? "value-positive" : winRate > 0 ? "value-neutral" : "value-negative";
    const profitEl = document.getElementById("netProfit");
    if (profitEl) profitEl.className = netProfit > 0 ? "value-positive" : netProfit < 0 ? "value-negative" : "value-neutral";

    updateAccountPanel();
  }


  /* ==========================================================
     HELPER FUNCTIONS
  ========================================================== */

  function getFilteredTrades() {
    if (selectedAccountId === "all") return [...trades];
    return trades.filter(t => t.accountId === selectedAccountId);
  }

  function calculateMaxDrawdown(closedTrades, startingBalance) {
    if (!closedTrades.length) return 0;
    let balance = startingBalance;
    let peak = startingBalance;
    let maxDrawdown = 0;
    closedTrades.forEach(trade => {
      const profit = Number(trade.profit) || 0;
      const commission = Number(trade.commission) || 0;
      balance += profit - commission;
      if (balance > peak) peak = balance;
      const drawdown = peak - balance;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    return maxDrawdown;
  }

  function calculateConsistencyScore(sourceTrades) {
    const closed = (sourceTrades || []).filter(t => t.status === "Closed");
    if (!closed.length) return 0;
    const scoreMap = { Excellent: 10, Good: 8, Average: 5, Poor: 2 };
    const emotionMap = { Calm: 10, Confident: 10, Fear: 4, Greed: 3, FOMO: 2, Revenge: 1 };
    let total = 0;
    closed.forEach(trade => {
      const account = getAccount(trade.accountId);
      const plannedRisk = account ? (Number(account.riskPercent) || 0) : 0;
      const actualRisk = Number(trade.risk) || 0;
      const followedPlan = trade.tradeValid === "Yes" ? 10 : 0;
      const patience = scoreMap[trade.patience] ?? 5;
      const discipline = scoreMap[trade.discipline] ?? 5;
      const emotionalControl = emotionMap[trade.emotion] ?? 5;
      const riskManagement = plannedRisk <= 0 || actualRisk <= plannedRisk ? 10 : actualRisk <= plannedRisk * 1.25 ? 6 : 2;
      const exitRules = trade.stopLoss !== undefined && trade.takeProfit !== undefined &&
        Number(trade.stopLoss) !== 0 && Number(trade.takeProfit) !== 0 ? 10 : 3;
      const journalCompleted = [trade.tradeSummary, trade.lessonLearned, trade.improvementPlan].filter(Boolean).length >= 2 ? 10 : [trade.tradeSummary, trade.lessonLearned, trade.improvementPlan].filter(Boolean).length === 1 ? 6 : 2;
      total += (followedPlan + patience + discipline + emotionalControl + riskManagement + exitRules + journalCompleted) / 7;
    });
    return Math.max(0, Math.min(100, (total / closed.length) * 10));
  }

  function applyConsistencyClass(el, score) {
    if (!el) return;
    el.classList.remove("consistency-good", "consistency-mid", "consistency-low");
    el.classList.add(score >= 80 ? "consistency-good" : score >= 60 ? "consistency-mid" : "consistency-low");
  }

  function loadRecentTrades() {
    const container = document.getElementById("recentTrades");
    if (!container) return;
    const filtered = getFilteredTrades();
    const pending = filtered.filter(t => t.status === "Pending" || t.result === "Pending");
    const display = pending.slice(0, 4);
    if (display.length === 0) {
      container.innerHTML = `<div style="padding:12px 0;color:var(--text-secondary);">No pending trades.</div>`;
      return;
    }
    container.innerHTML = "";
    display.forEach(trade => {
      const account = getAccount(trade.accountId);
      const row = document.createElement("div");
      row.className = "trade-row";
      row.innerHTML = `
        <div><strong>${trade.pair || "?"}</strong><br><span style="font-size:12px;color:var(--text-secondary);">${trade.direction || ""}</span></div>
        <div>${account ? account.name : trade.account || "-"}</div>
        <div>${trade.entryModel || "-"}</div>
        <div><span class="status pending">Pending</span></div>
        <div><button onclick="window.closeTrade('${trade.id}')" class="btn">Close</button></div>
      `;
      container.appendChild(row);
    });
  }

  function initializeCharts() {
    if (typeof Chart === "undefined") return;
    destroyAllCharts();
    buildEquityChart();
    buildMonthlyChart();
  }

  function destroyAllCharts() {
    if (equityChartInstance) { equityChartInstance.destroy();
      equityChartInstance = null; }
    if (monthlyChartInstance) { monthlyChartInstance.destroy();
      monthlyChartInstance = null; }
  }

  function buildEquityChart() {
    const canvas = document.getElementById("equityChart");
    if (!canvas) return;
    const filtered = getFilteredTrades();
    const closed = filtered.filter(t => t.status === "Closed").sort((a, b) => new Date(a.closed || a.date) - new Date(b.closed || b.date));
    let startingBalance = 0;
    if (selectedAccountId === "all") {
      startingBalance = Object.values(accounts).reduce((s, a) => s + (Number(a.startingBalance) || 0), 0);
    } else {
      const account = getSelectedAccount();
      startingBalance = account ? (Number(account.startingBalance) || 0) : 0;
    }
    let balance = startingBalance;
    const data = [balance];
    closed.forEach(trade => {
      balance += (Number(trade.profit) || 0) - (Number(trade.commission) || 0);
      data.push(balance);
    });
    equityChartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels: data.map((_, i) => i === 0 ? "Start" : i),
        datasets: [{ label: "Equity", data, borderColor: "#4f7cff", backgroundColor: "rgba(79,124,255,0.15)", fill: true, tension: 0.3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }
    });
  }

  function buildMonthlyChart() {
    const canvas = document.getElementById("monthlyChart");
    if (!canvas) return;
    const filtered = getFilteredTrades();
    const monthly = {};
    filtered.filter(t => t.status === "Closed").forEach(trade => {
      const date = new Date(trade.closed || trade.date);
      const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      const label = date.toLocaleString("default", { month: "short", year: "numeric" });
      if (!monthly[key]) monthly[key] = { label, value: 0 };
      monthly[key].value += (Number(trade.profit) || 0) - (Number(trade.commission) || 0);
    });
    const keys = Object.keys(monthly).sort();
    monthlyChartInstance = new Chart(canvas, {
      type: "bar",
      data: {
        labels: keys.map(k => monthly[k].label),
        datasets: [{ label: "Monthly P&L", data: keys.map(k => monthly[k].value), backgroundColor: "#4f7cff", borderRadius: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  function updateAccountPanel() {
    const account = getSelectedAccount();
    if (!account) {
      const allStarting = Object.values(accounts).reduce((s, a) => s + (Number(a.startingBalance) || 0), 0);
      const allCurrent = Object.values(accounts).reduce((s, a) => s + (Number(a.currentBalance) || 0), 0);
      const allPnL = allCurrent - allStarting;
      setText("accountStartingBalance", money(allStarting));
      setText("accountCurrentBalance", money(allCurrent));
      setText("accountRiskSetting", "Multiple");
      setText("accountConsistency", calculateConsistencyScore(trades).toFixed(1) + "%");
      setText("accountPnL", signedMoney(allPnL));
    } else {
      const starting = Number(account.startingBalance) || 0;
      const current = Number(account.currentBalance) || starting;
      const pnl = current - starting;
      setText("accountStartingBalance", money(starting));
      setText("accountCurrentBalance", money(current));
      setText("accountRiskSetting", account.riskPercent.toFixed(2) + "%");
      setText("accountConsistency", calculateConsistencyScore(trades.filter(t => t.accountId === account.id)).toFixed(1) + "%");
      setText("accountPnL", signedMoney(pnl));
    }
    const consistencyEl = document.getElementById("accountConsistency");
    const score = account ? calculateConsistencyScore(trades.filter(t => t.accountId === account.id)) : calculateConsistencyScore(trades);
    applyConsistencyClass(consistencyEl, score);
    const pnlEl = document.getElementById("accountPnL");
    if (pnlEl) {
      const val = account ? (Number(account.currentBalance) || 0) - (Number(account.startingBalance) || 0) : 0;
      pnlEl.className = "value " + (val > 0 ? "green" : val < 0 ? "" : "");
    }
  }


  /* ==========================================================
     CLOSE TRADE (global)
  ========================================================== */

  window.closeTrade = function(id) {
    const trade = trades.find(t => t.id === id);
    if (!trade) return;
    if (trade.status === "Closed") { viewTrade(trade); return; }
    const outcome = prompt("Result?\n\nWin\nLoss\nBreakeven");
    if (!outcome) return;
    const normalized = outcome.trim().toLowerCase();
    let result = normalized === "win" ? "Win" : normalized === "loss" ? "Loss" : "Breakeven";
    let profit = parseFloat(prompt("Profit/Loss ($)", "0")) || 0;
    const commission = parseFloat(prompt("Commission ($)", "0")) || 0;
    if (result === "Loss" && profit > 0) profit = -profit;

    let exitPrice = 0;
    let partialPercent = 0;
    if (result === "Win" || result === "Partial") {
      exitPrice = parseFloat(prompt("Exit price (for actual RR)", "0")) || 0;
      if (result === "Partial") {
        partialPercent = parseFloat(prompt("Partial % (0-100)", "50")) || 0;
      }
    } else if (result === "Loss") {
      exitPrice = parseFloat(prompt("Exit price (optional)", "0")) || 0;
    }

    trade.status = "Closed";
    trade.closed = new Date().toISOString();
    trade.result = result;
    trade.profit = profit;
    trade.commission = commission;
    trade.exitPrice = exitPrice;
    trade.partialPercent = partialPercent;

    const riskAmount = Number(trade.riskAmount) || 0;
    const plannedRR = Number(trade.plannedRR) || 0;
    const entry = Number(trade.originalEntry) || Number(trade.entry) || 0;
    const stopLoss = Number(trade.originalStopLoss) || Number(trade.stopLoss) || 0;
    const direction = trade.direction || "BUY";
    const outcomeRR = calculateOutcomeRR({
      result,
      actualProfit: profit,
      riskAmount,
      plannedRR,
      entry,
      stopLoss,
      exitPrice,
      direction,
      partialPercent
    });
    trade.rr = outcomeRR;

    applyTradeToAccount(trade, "add");
    saveTrades();
    refreshUI();
    alert("✅ Trade closed successfully.\n\nAccount: " + (getAccount(trade.accountId)?.name || trade.account || "-") + "\nNet P/L: " + signedMoney(profit - commission) + "\nActual RR: " + outcomeRR.toFixed(2));
  };

  function viewTrade(trade) {
    const net = (Number(trade.profit) || 0) - (Number(trade.commission) || 0);
    alert(
      `PAIR          : ${trade.pair}\nACCOUNT       : ${getAccount(trade.accountId)?.name || trade.account || "-"}\nSTATUS        : ${trade.status}\nRESULT        : ${trade.result}\nPROFIT        : ${money(trade.profit)}\nCOMMISSION    : ${money(trade.commission)}\nNET P/L       : ${signedMoney(net)}\nRISK AMOUNT   : ${money(trade.riskAmount)}\nRISK %        : ${trade.risk || 0}%\nPROJECTED RR  : ${(trade.plannedRR || 0).toFixed(2)}\nACTUAL RR     : ${(trade.rr || 0).toFixed(2)}\nLESSON        : ${trade.lessonLearned || "-"}\nIMPROVEMENT   : ${trade.improvementPlan || "-"}`
    );
  }


  /* ==========================================================
     INITIALIZE
  ========================================================== */

  loadAccounts();
  loadTrades();
  populateAccountSelectors();
  initializeTradeDateTime();
  updateTradeAccountInfo();
  calculateAll();
  // refreshUI will be called by loadTrades after cache/Firestore loads

  const params = new URLSearchParams(window.location.search);
  const editId = params.get("edit");
  if (editId) {
    const checkAndEdit = () => {
      const trade = trades.find(t => String(t.id) === String(editId));
      if (trade) {
        editingTrade = trade;
        populateForm(trade);
        const submitBtn = document.getElementById("saveTradeBtn");
        if (submitBtn) {
          submitBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Update Trade';
          submitBtn.className = "btn-update";
        }
        const header = document.querySelector(".page-header h1");
        if (header) {
          header.innerHTML = '<i class="fa-solid fa-pen"></i> Edit Trade';
        }
        const headerP = document.querySelector(".page-header p");
        if (headerP) {
          headerP.textContent = "Modify trade details and save changes.";
        }
      } else {
        setTimeout(checkAndEdit, 500);
      }
    };
    checkAndEdit();
  }

  console.log("✅ GTRADES-AXIS Journal ready (Firestore-first).");
}


/* ============================================================
   AUTHENTICATION
============================================================ */

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "/login";
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.warn("User document does not exist.");
    }
    initJournal();
  } catch (error) {
    console.error("Journal authentication error:", error);
    initJournal();
  }
});