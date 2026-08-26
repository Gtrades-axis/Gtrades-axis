/* ============================================================
   GTRADES-AXIS™
   TRADING JOURNAL – FIRESTORE + LOCALSTORAGE SYNC
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
  limit
} from "firebase/firestore";


/* ============================================================
   JOURNAL SYSTEM
============================================================ */

function initJournal() {

  console.log("✅ GTRADES-AXIS Journal initializing...");

  const STORAGE_KEY = "trades";
  const ACCOUNTS_KEY = "gtrades_axis_accounts";

  let trades = [];
  let accounts = {};

  let equityChartInstance = null;
  let monthlyChartInstance = null;

  let editingTrade = null;
  let selectedAccountId = "all";

  // ---- Flag to avoid duplicate Firestore writes ----
  let isSavingToFirestore = false;

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
     TRADE STORAGE – LocalStorage + Firestore
  ========================================================== */

  function loadTrades() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        trades = JSON.parse(saved) || [];
      } catch (error) {
        console.error("Trade data corrupted:", error);
        trades = [];
      }
    } else {
      trades = [];
    }
  }

  function saveTrades() {
    // 1. Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    console.log("💾 Saved trades to localStorage:", trades.length);

    // 2. Sync to Firestore (only if user is logged in)
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
        await setDoc(tradeRef, data, { merge: true });
      } catch (error) {
        console.error("Failed to sync trade to Firestore:", error);
      }
    });

    Promise.all(promises).then(() => {
      isSavingToFirestore = false;
    }).catch((error) => {
      console.error("Firestore sync error:", error);
      isSavingToFirestore = false;
    });
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
      userId: auth.currentUser?.uid || '',   // ← ADDED: user ID for ownership
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
      public: false,   // ← default: not public
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
    loadTrades();
    calculateStatistics();   // Defined below
    loadRecentTrades();      // Defined below
    initializeCharts();      // Defined below
    updateAccountPanel();    // Defined below
  }


  /* ==========================================================
     STATISTICS (summary) – placeholders (keep your existing)
  ========================================================== */

  // I'm including minimal versions here; your actual code already has these.
  // They are not the focus of this update.
  function calculateStatistics() {
    // Your existing stats calculation
    console.log("Stats updated (placeholder)");
  }
  function loadRecentTrades() {
    console.log("Recent trades loaded (placeholder)");
  }
  function initializeCharts() {
    console.log("Charts initialised (placeholder)");
  }
  function updateAccountPanel() {
    console.log("Account panel updated (placeholder)");
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
  refreshUI();

  // Handle edit mode from URL parameter
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("edit");
  if (editId) {
    editingTrade = trades.find(trade => String(trade.id) === String(editId));
    if (editingTrade) {
      populateForm(editingTrade);
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
    }
  }

  console.log("✅ GTRADES-AXIS Journal ready (Firestore sync enabled).");
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