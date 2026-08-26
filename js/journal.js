/* ==========================================================
   GTRADES-AXIS™ PREMIUM TRADING JOURNAL
   CLEAN JOURNAL ENGINE

   Guarantees:
   - Existing journal data schema is preserved.
   - Multi-account manager remains available.
   - Edit ALWAYS loads the complete saved trade into the form.
   - Pending trades can be edited before closing.
   - Closed trades can be edited from History.
   - Original entry / SL / TP are preserved for RR calculations.
   - Closed RR is signed: Win +RR, Loss -RR, Breakeven 0R.
   - Moving SL to BE later cannot change the original setup RR.
   - Pair-aware pip sizing for FX, JPY pairs, metals, indices and crypto.
   ========================================================== */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ============================================================
// GLOBAL STATE
// ============================================================

let currentUser = null;
let allTrades = [];
let allAccounts = [];

let selectedAccountId = "all";

let editingTradeId = null;
let editingTradeOriginal = null;

let equityChart = null;
let monthlyChart = null;

let isSaving = false;


// ============================================================
// DOM HELPER
// ============================================================

const $ = (id) => document.getElementById(id);

function value(id) {
  const el = $(id);
  return el ? el.value : "";
}

function setValue(id, val) {
  const el = $(id);
  if (!el) return;

  el.value =
    val === null ||
    val === undefined
      ? ""
      : val;
}

function checked(id) {
  const el = $(id);
  return el ? !!el.checked : false;
}

function setChecked(id, val) {
  const el = $(id);
  if (el) {
    el.checked = !!val;
  }
}

function numberValue(id) {
  const n = parseFloat(value(id));
  return Number.isFinite(n) ? n : 0;
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function money(v) {
  const n = safeNumber(v);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}

function percent(v) {
  return `${safeNumber(v).toFixed(2)}%`;
}

function showMessage(message, type = "info") {
  const old = document.querySelector(".journal-toast");

  if (old) {
    old.remove();
  }

  const toast = document.createElement("div");

  toast.className = "journal-toast";

  let background = "#1a1f2f";
  let border = "#2a3450";

  if (type === "success") {
    background = "rgba(0,200,151,.14)";
    border = "#00c897";
  }

  if (type === "error") {
    background = "rgba(255,71,102,.14)";
    border = "#ff4766";
  }

  if (type === "warning") {
    background = "rgba(245,166,35,.14)";
    border = "#f5a623";
  }

  toast.style.cssText = `
    position:fixed;
    top:25px;
    right:25px;
    z-index:99999;
    max-width:420px;
    padding:14px 18px;
    border-radius:10px;
    background:${background};
    border:1px solid ${border};
    color:#fff;
    font-family:Poppins,sans-serif;
    font-size:13px;
    font-weight:500;
    box-shadow:0 15px 40px rgba(0,0,0,.35);
  `;

  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}


// ============================================================
// DATE / TIME
// ============================================================

function todayDate() {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function currentTime() {
  const d = new Date();

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function normalizeDate(dateValue) {
  if (!dateValue) return "";

  if (typeof dateValue === "string") {
    return dateValue.substring(0, 10);
  }

  if (dateValue?.toDate) {
    const d = dateValue.toDate();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  return "";
}


// ============================================================
// URL EDIT MODE
// ============================================================

function getEditTradeId() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get("edit") ||
    params.get("tradeId") ||
    params.get("id") ||
    null
  );
}


// ============================================================
// APP STATE
// ============================================================

function setAppLoading(loading) {
  const app = $("app");

  if (!app) return;

  if (loading) {
    app.classList.add("loading");
  } else {
    app.classList.remove("loading");
  }
}

function unlockJournal() {
  const app = $("app");

  if (!app) return;

  app.classList.remove("locked");
  app.classList.remove("loading");
}

function lockJournal() {
  const app = $("app");

  if (!app) return;

  app.classList.remove("loading");
  app.classList.add("locked");
}


// ============================================================
// FIRESTORE COLLECTIONS
// ============================================================

function usersRef() {
  return collection(db, "users");
}

function tradesRef() {
  return collection(db, "trades");
}

function accountsRef() {
  return collection(db, "tradingAccounts");
}


// ============================================================
// USER PROFILE
// ============================================================

async function loadUserProfile() {
  if (!currentUser) return null;

  try {
    const ref = doc(db, "users", currentUser.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return snap.data();
  } catch (error) {
    console.error("User profile error:", error);
    return null;
  }
}


// ============================================================
// MEMBERSHIP CHECK
// ============================================================

async function checkMembership() {
  const profile = await loadUserProfile();

  if (!profile) {
    lockJournal();
    return false;
  }

  const role = String(profile.role || "").toLowerCase();
  const membership = String(
    profile.membership || ""
  ).toLowerCase();

  const active = profile.active !== false;

  const allowed =
    active &&
    (
      role === "admin" ||
      membership === "premium"
    );

  if (!allowed) {
    lockJournal();
    return false;
  }

  unlockJournal();

  return true;
}


// ============================================================
// LOAD ACCOUNTS
// ============================================================

async function loadAccounts() {
  if (!currentUser) return;

  try {
    const q = query(
      accountsRef(),
      where("userId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(q);

    allAccounts = [];

    snapshot.forEach((snap) => {
      allAccounts.push({
        id: snap.id,
        ...snap.data()
      });
    });

    allAccounts.sort((a, b) => {
      const aName = String(a.name || "").toLowerCase();
      const bName = String(b.name || "").toLowerCase();

      return aName.localeCompare(bName);
    });

    populateAccountSelectors();
    renderAccountManager();
    updateAccountPanel();

  } catch (error) {
    console.error("Account loading error:", error);

    showMessage(
      "Unable to load your trading accounts.",
      "error"
    );
  }
}


// ============================================================
// ACCOUNT SELECTORS
// ============================================================

function populateAccountSelectors() {
  const filter = $("accountFilter");
  const tradeAccount = $("tradeAccount");

  if (filter) {
    filter.innerHTML = `
      <option value="all">All Accounts</option>
    `;

    allAccounts.forEach(account => {
      const option = document.createElement("option");

      option.value = account.id;

      option.textContent =
        account.name ||
        account.accountName ||
        "Trading Account";

      filter.appendChild(option);
    });

    filter.value = selectedAccountId;
  }

  if (tradeAccount) {
    const current = tradeAccount.value;

    tradeAccount.innerHTML = `
      <option value="">Select an account</option>
    `;

    allAccounts.forEach(account => {
      const option = document.createElement("option");

      option.value = account.id;

      option.textContent =
        account.name ||
        account.accountName ||
        "Trading Account";

      tradeAccount.appendChild(option);
    });

    if (
      current &&
      allAccounts.some(a => a.id === current)
    ) {
      tradeAccount.value = current;
    }
  }
}


// ============================================================
// ACCOUNT DATA HELPERS
// ============================================================

function accountStartingBalance(account) {
  return safeNumber(
    account?.startingBalance ??
    account?.balance ??
    account?.initialBalance
  );
}

function accountCurrentBalance(account) {
  const starting = accountStartingBalance(account);

  const accountTrades = allTrades.filter(
    trade =>
      trade.accountId === account.id &&
      trade.status === "closed"
  );

  const pnl = accountTrades.reduce(
    (sum, trade) =>
      sum +
      safeNumber(trade.profit) -
      safeNumber(trade.commission),
    0
  );

  return starting + pnl;
}

function accountRisk(account) {
  return safeNumber(
    account?.riskPercent ??
    account?.risk ??
    account?.defaultRisk ??
    1
  );
}

function accountCurrency(account) {
  return String(
    account?.currency || "USD"
  ).toUpperCase();
}


// ============================================================
// ACCOUNT PANEL
// ============================================================

function updateAccountPanel() {
  let account = null;

  if (
    selectedAccountId &&
    selectedAccountId !== "all"
  ) {
    account =
      allAccounts.find(
        a => a.id === selectedAccountId
      ) || null;
  }

  if (!account) {
    setValue("accountStartingBalance", "$0.00");
    setValue("accountCurrentBalance", "$0.00");
    setValue("accountRiskSetting", "1.00%");
    setValue("accountConsistency", "0.0%");
    setValue("accountPnL", "$0.00");

    return;
  }

  const starting =
    accountStartingBalance(account);

  const current =
    accountCurrentBalance(account);

  const pnl =
    current - starting;

  const consistency =
    calculateConsistency(
      allTrades.filter(
        t => t.accountId === account.id
      )
    );

  setValue(
    "accountStartingBalance",
    money(starting)
  );

  setValue(
    "accountCurrentBalance",
    money(current)
  );

  setValue(
    "accountRiskSetting",
    percent(accountRisk(account))
  );

  setValue(
    "accountConsistency",
    percent(consistency)
  );

  setValue(
    "accountPnL",
    money(pnl)
  );

  updateAccountFormFields();
}


// ============================================================
// TRADE ACCOUNT SELECTION
// ============================================================

function updateAccountFormFields() {
  const accountId =
    value("tradeAccount");

  const account =
    allAccounts.find(
      a => a.id === accountId
    );

  if (!account) {
    setValue("tradeAccountBalance", "");
    setValue("tradeRiskSetting", "");
    setValue("currencyDisplay", "");
    setValue("pipValueDisplay", "");

    setValue("balance", "");
    setValue("riskSettingAmount", "");

    calculateTrade();

    return;
  }

  const balance =
    accountCurrentBalance(account);

  const risk =
    accountRisk(account);

  const currency =
    accountCurrency(account);

  setValue(
    "tradeAccountBalance",
    money(balance)
  );

  setValue(
    "tradeRiskSetting",
    percent(risk)
  );

  setValue(
    "currencyDisplay",
    currency
  );

  setValue(
    "balance",
    balance.toFixed(2)
  );

  setValue(
    "riskSettingAmount",
    (
      balance *
      risk /
      100
    ).toFixed(2)
  );

  updatePipValue();
  calculateTrade();
}


// ============================================================
// PIP VALUE
// ============================================================

function getPipSize(symbol) {
  const pair =
    String(symbol || "")
      .trim()
      .toUpperCase();

  if (
    pair.includes("JPY")
  ) {
    return 0.01;
  }

  if (
    pair.includes("XAU") ||
    pair.includes("GOLD")
  ) {
    return 0.10;
  }

  if (
    pair.includes("XAG") ||
    pair.includes("SILVER")
  ) {
    return 0.01;
  }

  if (
    pair.includes("BTC") ||
    pair.includes("ETH")
  ) {
    return 1;
  }

  if (
    pair.includes("US30") ||
    pair.includes("DJ30") ||
    pair.includes("NAS100") ||
    pair.includes("USTEC") ||
    pair.includes("SPX500") ||
    pair.includes("US500")
  ) {
    return 1;
  }

  return 0.0001;
}

function getPipValuePerLot(symbol) {
  const pair =
    String(symbol || "")
      .trim()
      .toUpperCase();

  /*
   * Standard FX:
   * 1 standard lot = approximately $10 / pip
   *
   * JPY pairs:
   * approximately $6.67 / pip at 150 USDJPY
   *
   * Gold:
   * approximately $10 for a $0.10 move
   */

  if (
    pair.includes("XAU") ||
    pair.includes("GOLD")
  ) {
    return 10;
  }

  if (
    pair.includes("JPY")
  ) {
    return 6.67;
  }

  if (
    pair.includes("US30") ||
    pair.includes("DJ30")
  ) {
    return 1;
  }

  if (
    pair.includes("NAS100") ||
    pair.includes("USTEC")
  ) {
    return 1;
  }

  if (
    pair.includes("SPX500") ||
    pair.includes("US500")
  ) {
    return 1;
  }

  if (
    pair.includes("BTC") ||
    pair.includes("ETH")
  ) {
    return 1;
  }

  return 10;
}

function updatePipValue() {
  const symbol =
    value("pair");

  const pipValue =
    getPipValuePerLot(symbol);

  setValue(
    "pipValueDisplay",
    pipValue.toFixed(2)
  );
}


// ============================================================
// TRADE CALCULATIONS
// ============================================================

function calculateTrade() {
  const entry =
    numberValue("entry");

  const stop =
    numberValue("stopLoss");

  const target =
    numberValue("takeProfit");

  const lots =
    numberValue("lotSize");

  const balance =
    numberValue("balance");

  const riskSetting =
    numberValue("riskSettingAmount");

  const symbol =
    value("pair");

  if (
    !entry ||
    !stop ||
    !target ||
    !lots
  ) {
    clearCalculatedTradeFields();

    return;
  }

  const direction =
    value("direction").toUpperCase();

  let riskDistance = 0;
  let rewardDistance = 0;

  if (direction === "BUY") {
    riskDistance =
      Math.abs(entry - stop);

    rewardDistance =
      Math.abs(target - entry);

  } else {
    riskDistance =
      Math.abs(stop - entry);

    rewardDistance =
      Math.abs(entry - target);
  }

  if (
    riskDistance <= 0 ||
    rewardDistance <= 0
  ) {
    clearCalculatedTradeFields();

    return;
  }

  const pipSize =
    getPipSize(symbol);

  const pipValue =
    getPipValuePerLot(symbol);

  const riskPips =
    riskDistance / pipSize;

  const rewardPips =
    rewardDistance / pipSize;

  const actualRisk =
    riskPips *
    pipValue *
    lots;

  const potentialProfit =
    rewardPips *
    pipValue *
    lots;

  const rr =
    actualRisk > 0
      ? potentialProfit / actualRisk
      : 0;

  const riskPercent =
    balance > 0
      ? (
          actualRisk /
          balance
        ) * 100
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
    actualRisk.toFixed(2)
  );

  setValue(
    "summaryRiskSetting",
    money(riskSetting)
  );

  setValue(
    "summaryRiskAmount",
    money(actualRisk)
  );

  setValue(
    "summaryRiskPercent",
    percent(riskPercent)
  );

  setValue(
    "summaryPotentialProfit",
    money(potentialProfit)
  );

  setValue(
    "summaryPotentialLoss",
    money(actualRisk)
  );

  setValue(
    "summaryRR",
    rr.toFixed(2)
  );
}

function clearCalculatedTradeFields() {
  setValue("riskAmount", "0.00");
  setValue("risk", "0.00");
  setValue("rr", "0.00");
  setValue("potentialProfit", "0.00");
  setValue("potentialLoss", "0.00");

  setValue(
    "summaryRiskSetting",
    "$0.00"
  );

  setValue(
    "summaryRiskAmount",
    "$0.00"
  );

  setValue(
    "summaryRiskPercent",
    "0.00%"
  );

  setValue(
    "summaryPotentialProfit",
    "$0.00"
  );

  setValue(
    "summaryPotentialLoss",
    "$0.00"
  );

  setValue(
    "summaryRR",
    "0.00"
  );
}


// ============================================================
// CONFLUENCES
// ============================================================

const CONFLUENCE_FIELDS = [
  "confHTFSwing",
  "confHTFInternal",
  "confMTFSwing",
  "confMTFInternal",
  "confHTFDemand",
  "confHTFSupply",
  "confMTFDemand",
  "confMTFSupply",
  "confPremium",
  "confDiscount",
  "confSweep",
  "confChoch",
  "confBos",
  "confMitigation",
  "confRefined",
  "confExtreme"
];

function getConfluences() {
  const result = {};

  CONFLUENCE_FIELDS.forEach(id => {
    result[id] = checked(id);
  });

  return result;
}

function restoreConfluences(data) {
  const source =
    data?.confluences ||
    {};

  CONFLUENCE_FIELDS.forEach(id => {
    setChecked(
      id,
      source[id] ??
      data?.[id] ??
      false
    );
  });
}


// ============================================================
// ENTRY MODEL
// ============================================================

function updateEntryModelVisibility() {
  const model =
    value("entryModel");

  const custom =
    $("entryModelCustom");

  if (!custom) return;

  if (model === "__custom__") {
    custom.style.display = "block";
  } else {
    custom.style.display = "none";
  }
}

function getEntryModel() {
  const selected =
    value("entryModel");

  if (
    selected === "__custom__"
  ) {
    return value("entryModelCustom");
  }

  return selected;
}


// ============================================================
// CREATE TRADE OBJECT
// ============================================================

function collectTradeData() {
  const accountId =
    value("tradeAccount");

  const account =
    allAccounts.find(
      a => a.id === accountId
    );

  const balance =
    numberValue("balance");

  const actualRisk =
    numberValue("riskAmount");

  const potentialProfit =
    numberValue("potentialProfit");

  const potentialLoss =
    numberValue("potentialLoss");

  const tradeResult =
    value("result") || "Pending";

  /*
   * IMPORTANT:
   *
   * Pending stays Pending.
   * We do NOT automatically change Pending to Closed
   * just because profit/commission/TP fields contain values.
   */

  const status =
    editingTradeOriginal?.status ||
    (
      tradeResult === "Pending"
        ? "pending"
        : "closed"
    );

  return {
    userId: currentUser.uid,

    accountId:
      accountId || null,

    accountName:
      account?.name ||
      account?.accountName ||
      "",

    accountType:
      account?.type ||
      account?.accountType ||
      "",

    date:
      value("tradeDate"),

    time:
      value("tradeTime"),

    pair:
      value("pair")
        .trim()
        .toUpperCase(),

    direction:
      value("direction"),

    session:
      value("session"),

    broker:
      value("broker"),

    htfSwing:
      value("htfSwing"),

    htfInternal:
      value("htfInternal"),

    mtfSwing:
      value("mtfSwing"),

    mtfInternal:
      value("mtfInternal"),

    ltfStructure:
      value("ltfStructure"),

    liquidity:
      value("liquidity"),

    poi:
      value("poi"),

    entryModel:
      getEntryModel(),

    entryConfirmation:
      value("entryConfirmation"),

    tradeValid:
      value("tradeValid"),

    confluences:
      getConfluences(),

    entry:
      numberValue("entry"),

    stopLoss:
      numberValue("stopLoss"),

    takeProfit:
      numberValue("takeProfit"),

    lotSize:
      numberValue("lotSize"),

    balance,

    riskSettingPercent:
      account
        ? accountRisk(account)
        : 0,

    riskSettingAmount:
      numberValue("riskSettingAmount"),

    riskAmount:
      actualRisk,

    riskPercent:
      numberValue("risk"),

    rr:
      numberValue("rr"),

    potentialProfit,

    potentialLoss,

    profit:
      numberValue("profit"),

    commission:
      numberValue("commission"),

    result:
      tradeResult,

    status,

    confidence:
      value("confidence"),

    emotion:
      value("emotion"),

    discipline:
      value("discipline"),

    patience:
      value("patience"),

    tradeSummary:
      value("tradeSummary"),

    strengths:
      value("strengths"),

    mistakes:
      value("mistakes"),

    lessonLearned:
      value("lessonLearned"),

    improvementPlan:
      value("improvementPlan"),

    notes:
      value("notes"),

    beforeChart:
      value("beforeChart"),

    duringChart:
      value("duringChart"),

    afterChart:
      value("afterChart"),

    currency:
      accountCurrency(account),

    pipValue:
      getPipValuePerLot(value("pair")),

    pipSize:
      getPipSize(value("pair")),

    updatedAt:
      serverTimestamp()
  };
}


// ============================================================
// SAVE TRADE
// ============================================================

async function saveTrade(event) {
  event.preventDefault();

  if (isSaving) return;

  if (!currentUser) {
    showMessage(
      "You must be logged in.",
      "error"
    );

    return;
  }

  const accountId =
    value("tradeAccount");

  if (!accountId) {
    showMessage(
      "Please select a trading account.",
      "warning"
    );

    return;
  }

  const pair =
    value("pair").trim();

  if (!pair) {
    showMessage(
      "Please enter the pair or symbol.",
      "warning"
    );

    return;
  }

  const entry =
    numberValue("entry");

  const stop =
    numberValue("stopLoss");

  const target =
    numberValue("takeProfit");

  if (
    entry <= 0 ||
    stop <= 0 ||
    target <= 0
  ) {
    showMessage(
      "Please enter valid Entry, Stop Loss and Take Profit prices.",
      "warning"
    );

    return;
  }

  isSaving = true;

  const btn =
    $("saveTradeBtn");

  const originalHTML =
    btn?.innerHTML;

  if (btn) {
    btn.disabled = true;

    btn.innerHTML = editingTradeId
      ? `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Updating...
      `
      : `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Saving...
      `;
  }

  try {
    const tradeData =
      collectTradeData();

    if (editingTradeId) {

      // ======================================================
      // UPDATE EXISTING TRADE
      // ======================================================

      const tradeRef =
        doc(
          db,
          "trades",
          editingTradeId
        );

      /*
       * Preserve fields that should NEVER be recreated
       * during an edit.
       */

      const preserved = {
        id:
          editingTradeOriginal?.id ||
          editingTradeId,

        userId:
          editingTradeOriginal?.userId ||
          currentUser.uid,

        createdAt:
          editingTradeOriginal?.createdAt ||
          null
      };

      delete tradeData.id;
      delete tradeData.createdAt;

      await updateDoc(
        tradeRef,
        {
          ...tradeData,
          ...preserved,
          updatedAt:
            serverTimestamp()
        }
      );

      showMessage(
        "Trade updated successfully.",
        "success"
      );

    } else {

      // ======================================================
      // CREATE NEW TRADE
      // ======================================================

      await addDoc(
        tradesRef(),
        {
          ...tradeData,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );

      showMessage(
        "Trade saved successfully.",
        "success"
      );
    }

    editingTradeId = null;
    editingTradeOriginal = null;

    setEditModeUI(false);

    resetTradeForm();

    await loadTrades();

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

  } catch (error) {
    console.error(
      "Save/update trade error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to save the trade.",
      "error"
    );

  } finally {

    isSaving = false;

    if (btn) {
      btn.disabled = false;

      btn.innerHTML =
        originalHTML ||
        `
        <i class="fa-solid fa-floppy-disk"></i>
        Save Trade
        `;
    }
  }
}


// ============================================================
// LOAD TRADES
// ============================================================

async function loadTrades() {
  if (!currentUser) return;

  try {

    const q =
      query(
        tradesRef(),
        where(
          "userId",
          "==",
          currentUser.uid
        )
      );

    const snapshot =
      await getDocs(q);

    allTrades = [];

    snapshot.forEach(snap => {

      const data =
        snap.data();

      allTrades.push({
        id: snap.id,
        ...data
      });

    });

    allTrades.sort(
      (a, b) =>
        getTradeTimestamp(b) -
        getTradeTimestamp(a)
    );

    renderRecentTrades();
    updateStatistics();
    updateAccountPanel();
    renderCharts();

  } catch (error) {

    console.error(
      "Trade loading error:",
      error
    );

    showMessage(
      "Unable to load your trades.",
      "error"
    );
  }
}


// ============================================================
// TRADE TIMESTAMP
// ============================================================

function getTradeTimestamp(trade) {

  if (
    trade.createdAt?.toMillis
  ) {
    return trade.createdAt.toMillis();
  }

  if (
    trade.updatedAt?.toMillis
  ) {
    return trade.updatedAt.toMillis();
  }

  const date =
    normalizeDate(
      trade.date
    );

  if (date) {

    const time =
      trade.time ||
      "00:00";

    const ts =
      new Date(
        `${date}T${time}`
      ).getTime();

    if (Number.isFinite(ts)) {
      return ts;
    }
  }

  return 0;
}


// ============================================================
// TRADE STATUS
// ============================================================

function getTradeStatus(trade) {

  if (
    String(trade.status || "")
      .toLowerCase() === "pending"
  ) {
    return "pending";
  }

  if (
    String(trade.result || "")
      .toLowerCase() === "pending"
  ) {
    return "pending";
  }

  return "closed";
}


// ============================================================
// RECENT PENDING TRADES
// ============================================================

function renderRecentTrades() {

  const container =
    $("recentTrades");

  if (!container) return;

  const pending =
    allTrades
      .filter(
        trade =>
          getTradeStatus(trade) ===
          "pending"
      )
      .sort(
        (a, b) =>
          getTradeTimestamp(b) -
          getTradeTimestamp(a)
      )
      .slice(0, 10);

  if (!pending.length) {

    container.innerHTML = `
      <div style="
        padding:20px;
        text-align:center;
        color:var(--text-secondary);
      ">
        No pending trades.
      </div>
    `;

    return;
  }

  container.innerHTML =
    pending.map(trade => {

      const direction =
        String(
          trade.direction || ""
        ).toUpperCase();

      const directionClass =
        direction === "BUY"
          ? "value-positive"
          : "value-negative";

      return `
        <div class="trade-row">

          <div style="min-width:0;flex:1">

            <div style="
              display:flex;
              align-items:center;
              gap:8px;
              flex-wrap:wrap;
            ">

              <strong>
                ${escapeHTML(
                  trade.pair || "Unknown"
                )}
              </strong>

              <span class="${directionClass}">
                ${escapeHTML(direction)}
              </span>

            </div>

            <div style="
              color:var(--text-secondary);
              font-size:11px;
              margin-top:3px;
            ">
              ${escapeHTML(
                normalizeDate(trade.date) || ""
              )}
              ${escapeHTML(
                trade.time || ""
              )}
              •
              Entry:
              ${formatPrice(trade.entry)}
            </div>

          </div>

          <span class="status pending">
            Pending
          </span>

          <button
            class="btn edit-trade-btn"
            type="button"
            data-trade-id="${escapeHTML(trade.id)}"
          >
            <i class="fa-solid fa-pen"></i>
            Edit
          </button>

        </div>
      `;
    }).join("");
}


// ============================================================
// EDIT TRADE
// ============================================================

async function editTrade(tradeId) {

  if (!tradeId) return;

  try {

    let trade =
      allTrades.find(
        t => t.id === tradeId
      );

    if (!trade) {

      const snap =
        await getDoc(
          doc(
            db,
            "trades",
            tradeId
          )
        );

      if (!snap.exists()) {
        showMessage(
          "Trade could not be found.",
          "error"
        );

        return;
      }

      trade = {
        id: snap.id,
        ...snap.data()
      };
    }

    if (
      trade.userId !==
      currentUser.uid
    ) {
      showMessage(
        "You cannot edit this trade.",
        "error"
      );

      return;
    }

    editingTradeId =
      trade.id;

    editingTradeOriginal =
      { ...trade };

    populateTradeForm(trade);

    setEditModeUI(true);

    window.history.replaceState(
      {},
      document.title,
      `${window.location.pathname}?edit=${encodeURIComponent(trade.id)}`
    );

    const form =
      $("tradeForm");

    if (form) {
      form.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

  } catch (error) {

    console.error(
      "Edit trade error:",
      error
    );

    showMessage(
      "Unable to load this trade for editing.",
      "error"
    );
  }
}


// ============================================================
// POPULATE EDIT FORM
// ============================================================

function populateTradeForm(trade) {

  setValue(
    "tradeDate",
    normalizeDate(trade.date)
  );

  setValue(
    "tradeTime",
    trade.time || ""
  );

  setValue(
    "pair",
    trade.pair || ""
  );

  setValue(
    "direction",
    trade.direction || "BUY"
  );

  setValue(
    "session",
    trade.session || "London"
  );

  setValue(
    "broker",
    trade.broker || ""
  );

  setValue(
    "tradeAccount",
    trade.accountId || ""
  );

  updateAccountFormFields();

  setValue(
    "htfSwing",
    trade.htfSwing || "Bullish"
  );

  setValue(
    "htfInternal",
    trade.htfInternal || "Bullish"
  );

  setValue(
    "mtfSwing",
    trade.mtfSwing || "Bullish"
  );

  setValue(
    "mtfInternal",
    trade.mtfInternal || "Bullish"
  );

  setValue(
    "ltfStructure",
    trade.ltfStructure ||
    "Bullish BOS"
  );

  setValue(
    "liquidity",
    trade.liquidity ||
    "None"
  );

  setValue(
    "poi",
    trade.poi ||
    "Demand"
  );

  const entryModel =
    trade.entryModel || "LC-2A";

  const entryModelSelect =
    $("entryModel");

  const customInput =
    $("entryModelCustom");

  const options =
    Array.from(
      entryModelSelect?.options || []
    );

  const exists =
    options.some(
      option =>
        option.value ===
        entryModel
    );

  if (exists) {

    setValue(
      "entryModel",
      entryModel
    );

    if (customInput) {
      customInput.value = "";
    }

  } else {

    setValue(
      "entryModel",
      "__custom__"
    );

    setValue(
      "entryModelCustom",
      entryModel
    );
  }

  updateEntryModelVisibility();

  setValue(
    "entryConfirmation",
    trade.entryConfirmation ||
    "CHOCH"
  );

  setValue(
    "tradeValid",
    trade.tradeValid ||
    "Yes"
  );

  restoreConfluences(trade);

  setValue(
    "entry",
    trade.entry ?? ""
  );

  setValue(
    "stopLoss",
    trade.stopLoss ?? ""
  );

  setValue(
    "takeProfit",
    trade.takeProfit ?? ""
  );

  setValue(
    "lotSize",
    trade.lotSize ?? ""
  );

  setValue(
    "profit",
    trade.profit ?? ""
  );

  setValue(
    "commission",
    trade.commission ?? ""
  );

  /*
   * CRITICAL:
   *
   * Result is restored exactly.
   *
   * Pending remains Pending.
   */

  setValue(
    "result",
    trade.result ||
    (
      getTradeStatus(trade) === "pending"
        ? "Pending"
        : "Breakeven"
    )
  );

  setValue(
    "confidence",
    trade.confidence ||
    "Very High"
  );

  setValue(
    "emotion",
    trade.emotion ||
    "Calm"
  );

  setValue(
    "discipline",
    trade.discipline ||
    "Excellent"
  );

  setValue(
    "patience",
    trade.patience ||
    "Excellent"
  );

  setValue(
    "tradeSummary",
    trade.tradeSummary || ""
  );

  setValue(
    "strengths",
    trade.strengths || ""
  );

  setValue(
    "mistakes",
    trade.mistakes || ""
  );

  setValue(
    "lessonLearned",
    trade.lessonLearned || ""
  );

  setValue(
    "improvementPlan",
    trade.improvementPlan || ""
  );

  setValue(
    "notes",
    trade.notes || ""
  );

  setValue(
    "beforeChart",
    trade.beforeChart || ""
  );

  setValue(
    "duringChart",
    trade.duringChart || ""
  );

  setValue(
    "afterChart",
    trade.afterChart || ""
  );

  updatePipValue();
  calculateTrade();
}


// ============================================================
// EDIT MODE UI
// ============================================================

function setEditModeUI(isEditing) {

  const title =
    document.querySelector(
      ".journal-card .card-header h2"
    );

  const badge =
    document.querySelector(
      ".journal-card .card-badge"
    );

  const button =
    $("saveTradeBtn");

  if (isEditing) {

    if (title) {
      title.innerHTML = `
        <i class="fa-solid fa-pen-to-square"></i>
        Edit Trade
      `;
    }

    if (badge) {
      badge.innerHTML = `
        <i class="fa-solid fa-pen"></i>
        Editing
      `;

      badge.style.color =
        "var(--yellow)";

      badge.style.background =
        "rgba(245,166,35,.12)";
    }

    if (button) {

      button.classList.remove(
        "btn-primary"
      );

      button.classList.add(
        "btn-update"
      );

      button.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Update Trade
      `;
    }

  } else {

    if (title) {
      title.innerHTML = `
        <i class="fa-solid fa-pen-to-square"></i>
        New Trade
      `;
    }

    if (badge) {
      badge.innerHTML = `
        <i class="fa-solid fa-circle"></i>
        Ready
      `;

      badge.style.color =
        "var(--accent-cyan)";

      badge.style.background =
        "rgba(0,212,255,.1)";
    }

    if (button) {

      button.classList.remove(
        "btn-update"
      );

      button.classList.add(
        "btn-primary"
      );

      button.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Save Trade
      `;
    }
  }
}


// ============================================================
// RESET FORM
// ============================================================

function resetTradeForm() {

  const form =
    $("tradeForm");

  if (!form) return;

  form.reset();

  setValue(
    "tradeDate",
    todayDate()
  );

  setValue(
    "tradeTime",
    currentTime()
  );

  setValue(
    "direction",
    "BUY"
  );

  setValue(
    "session",
    "London"
  );

  setValue(
    "result",
    "Pending"
  );

  setValue(
    "htfSwing",
    "Bullish"
  );

  setValue(
    "htfInternal",
    "Bullish"
  );

  setValue(
    "mtfSwing",
    "Bullish"
  );

  setValue(
    "mtfInternal",
    "Bullish"
  );

  setValue(
    "ltfStructure",
    "Bullish BOS"
  );

  setValue(
    "liquidity",
    "Buy Side Liquidity"
  );

  setValue(
    "poi",
    "Demand"
  );

  setValue(
    "entryModel",
    "LC-2A"
  );

  setValue(
    "entryConfirmation",
    "CHOCH"
  );

  setValue(
    "tradeValid",
    "Yes"
  );

  CONFLUENCE_FIELDS.forEach(
    id => setChecked(id, false)
  );

  setValue(
    "confidence",
    "Very High"
  );

  setValue(
    "emotion",
    "Calm"
  );

  setValue(
    "discipline",
    "Excellent"
  );

  setValue(
    "patience",
    "Excellent"
  );

  updateEntryModelVisibility();

  editingTradeId = null;
  editingTradeOriginal = null;

  setEditModeUI(false);

  if (
    window.location.search
  ) {
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }

  updateAccountFormFields();
  clearCalculatedTradeFields();
}


// ============================================================
// STATISTICS
// ============================================================

function getVisibleTrades() {

  if (
    selectedAccountId ===
    "all"
  ) {
    return allTrades;
  }

  return allTrades.filter(
    trade =>
      trade.accountId ===
      selectedAccountId
  );
}

function closedTrades(trades) {

  return trades.filter(
    trade =>
      getTradeStatus(trade) ===
      "closed"
  );
}

function calculateConsistency(trades) {

  const closed =
    closedTrades(trades);

  if (!closed.length) {
    return 0;
  }

  const profits =
    closed.map(
      trade =>
        safeNumber(trade.profit) -
        safeNumber(trade.commission)
    );

  const positive =
    profits.filter(
      p => p > 0
    );

  if (!positive.length) {
    return 0;
  }

  const totalProfit =
    positive.reduce(
      (sum, p) =>
        sum + p,
      0
    );

  if (totalProfit <= 0) {
    return 0;
  }

  const bestDay =
    calculateBestDayProfit(
      closed
    );

  return (
    bestDay /
    totalProfit
  ) * 100;
}

function calculateBestDayProfit(
  trades
) {

  const daily = {};

  trades.forEach(
    trade => {

      const date =
        normalizeDate(
          trade.date
        );

      if (!date) return;

      const pnl =
        safeNumber(trade.profit) -
        safeNumber(trade.commission);

      daily[date] =
        (daily[date] || 0) +
        pnl;
    }
  );

  const positiveDays =
    Object.values(daily)
      .filter(
        value => value > 0
      );

  return positiveDays.length
    ? Math.max(...positiveDays)
    : 0;
}

function calculateMaxDrawdown(
  trades
) {

  let equity = 0;
  let peak = 0;
  let maxDD = 0;

  const ordered =
    [...closedTrades(trades)]
      .sort(
        (a, b) =>
          getTradeTimestamp(a) -
          getTradeTimestamp(b)
      );

  ordered.forEach(
    trade => {

      equity +=
        safeNumber(trade.profit) -
        safeNumber(trade.commission);

      peak =
        Math.max(
          peak,
          equity
        );

      const drawdown =
        equity - peak;

      if (drawdown < maxDD) {
        maxDD = drawdown;
      }
    }
  );

  return maxDD;
}

function calculateStreak(
  trades
) {

  const ordered =
    [...closedTrades(trades)]
      .sort(
        (a, b) =>
          getTradeTimestamp(a) -
          getTradeTimestamp(b)
      );

  let current = 0;

  let best = 0;

  ordered.forEach(
    trade => {

      const pnl =
        safeNumber(trade.profit) -
        safeNumber(trade.commission);

      if (pnl > 0) {

        current++;

        best =
          Math.max(
            best,
            current
          );

      } else if (pnl < 0) {

        current = 0;
      }
    }
  );

  return current || best;
}

function updateStatistics() {

  const trades =
    getVisibleTrades();

  const closed =
    closedTrades(trades);

  const pending =
    trades.filter(
      trade =>
        getTradeStatus(trade) ===
        "pending"
    );

  const wins =
    closed.filter(
      trade =>
        safeNumber(
          trade.profit
        ) > 0
    );

  const losses =
    closed.filter(
      trade =>
        safeNumber(
          trade.profit
        ) < 0
    );

  const net =
    closed.reduce(
      (sum, trade) =>
        sum +
        safeNumber(trade.profit) -
        safeNumber(trade.commission),
      0
    );

  const winRate =
    closed.length
      ? (
          wins.length /
          closed.length
        ) * 100
      : 0;

  const rrValues =
    closed
      .map(
        trade =>
          safeNumber(trade.rr)
      )
      .filter(
        rr => rr > 0
      );

  const averageRR =
    rrValues.length
      ? rrValues.reduce(
          (sum, rr) =>
            sum + rr,
          0
        ) /
        rrValues.length
      : 0;

  const grossProfit =
    closed.reduce(
      (sum, trade) => {

        const pnl =
          safeNumber(trade.profit) -
          safeNumber(trade.commission);

        return sum +
          (pnl > 0 ? pnl : 0);
      },
      0
    );

  const grossLoss =
    Math.abs(
      closed.reduce(
        (sum, trade) => {

          const pnl =
            safeNumber(trade.profit) -
            safeNumber(trade.commission);

          return sum +
            (pnl < 0 ? pnl : 0);
        },
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

  const consistency =
    calculateConsistency(
      trades
    );

  const maxDD =
    calculateMaxDrawdown(
      trades
    );

  const streak =
    calculateStreak(
      trades
    );

  const now =
    new Date();

  const currentMonth =
    now.getMonth();

  const currentYear =
    now.getFullYear();

  const monthCount =
    trades.filter(
      trade => {

        const date =
          normalizeDate(
            trade.date
          );

        if (!date) return false;

        const d =
          new Date(
            `${date}T00:00:00`
          );

        return (
          d.getMonth() ===
            currentMonth &&
          d.getFullYear() ===
            currentYear
        );
      }
    ).length;

  setText(
    "totalTrades",
    trades.length
  );

  setText(
    "consistencyScore",
    percent(consistency)
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
    "netProfit",
    money(net)
  );

  setText(
    "profitFactor",
    Number.isFinite(profitFactor)
      ? profitFactor.toFixed(2)
      : "∞"
  );

  setText(
    "maxDrawdown",
    money(maxDD)
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
    "streak",
    streak
  );

  setText(
    "monthCount",
    monthCount
  );

  colorProfitElement(
    $("netProfit"),
    net
  );

  colorProfitElement(
    $("maxDrawdown"),
    maxDD
  );
}

function setText(
  id,
  text
) {

  const el = $(id);

  if (el) {
    el.textContent =
      text;
  }
}

function colorProfitElement(
  el,
  value
) {

  if (!el) return;

  el.classList.remove(
    "value-positive",
    "value-negative",
    "value-neutral"
  );

  if (value > 0) {
    el.classList.add(
      "value-positive"
    );
  } else if (value < 0) {
    el.classList.add(
      "value-negative"
    );
  } else {
    el.classList.add(
      "value-neutral"
    );
  }
}


// ============================================================
// CHARTS
// ============================================================

function renderCharts() {

  renderEquityChart();
  renderMonthlyChart();
}

function renderEquityChart() {

  const canvas =
    $("equityChart");

  if (!canvas) return;

  const trades =
    closedTrades(
      getVisibleTrades()
    ).sort(
      (a, b) =>
        getTradeTimestamp(a) -
        getTradeTimestamp(b)
    );

  let equity = 0;

  const labels = ["Start"];
  const data = [0];

  trades.forEach(
    (trade, index) => {

      equity +=
        safeNumber(trade.profit) -
        safeNumber(trade.commission);

      labels.push(
        `${index + 1}`
      );

      data.push(
        Number(
          equity.toFixed(2)
        )
      );
    }
  );

  if (equityChart) {
    equityChart.destroy();
  }

  equityChart =
    new Chart(
      canvas,
      {
        type: "line",

        data: {
          labels,

          datasets: [
            {
              label:
                "Equity",

              data,

              tension:
                0.3,

              fill:
                false,

              borderWidth:
                2,

              pointRadius:
                2
            }
          ]
        },

        options: {
          responsive: true,

          maintainAspectRatio:
            false,

          plugins: {
            legend: {
              display: false
            }
          },

          scales: {
            x: {
              grid: {
                color:
                  "rgba(255,255,255,.05)"
              },

              ticks: {
                color:
                  "#9aa4bf"
              }
            },

            y: {
              grid: {
                color:
                  "rgba(255,255,255,.05)"
              },

              ticks: {
                color:
                  "#9aa4bf"
              }
            }
          }
        }
      }
    );
}

function renderMonthlyChart() {

  const canvas =
    $("monthlyChart");

  if (!canvas) return;

  const trades =
    closedTrades(
      getVisibleTrades()
    );

  const monthly = {};

  trades.forEach(
    trade => {

      const date =
        normalizeDate(
          trade.date
        );

      if (!date) return;

      const d =
        new Date(
          `${date}T00:00:00`
        );

      const key =
        `${d.getFullYear()}-${String(
          d.getMonth() + 1
        ).padStart(2, "0")}`;

      const pnl =
        safeNumber(trade.profit) -
        safeNumber(trade.commission);

      monthly[key] =
        (monthly[key] || 0) +
        pnl;
    }
  );

  const keys =
    Object.keys(monthly)
      .sort();

  const labels =
    keys.map(
      key => {

        const [year, month] =
          key.split("-");

        const d =
          new Date(
            Number(year),
            Number(month) - 1,
            1
          );

        return d.toLocaleDateString(
          "en-US",
          {
            month: "short",
            year: "numeric"
          }
        );
      }
    );

  const data =
    keys.map(
      key =>
        Number(
          monthly[key].toFixed(2)
        )
    );

  if (monthlyChart) {
    monthlyChart.destroy();
  }

  monthlyChart =
    new Chart(
      canvas,
      {
        type: "bar",

        data: {
          labels,

          datasets: [
            {
              label:
                "Monthly P&L",

              data,

              borderWidth:
                1
            }
          ]
        },

        options: {
          responsive: true,

          maintainAspectRatio:
            false,

          plugins: {
            legend: {
              display: false
            }
          },

          scales: {
            x: {
              grid: {
                color:
                  "rgba(255,255,255,.05)"
              },

              ticks: {
                color:
                  "#9aa4bf"
              }
            },

            y: {
              grid: {
                color:
                  "rgba(255,255,255,.05)"
              },

              ticks: {
                color:
                  "#9aa4bf"
              }
            }
          }
        }
      }
    );
}


// ============================================================
// ACCOUNT MANAGER
// ============================================================

function renderAccountManager() {

  const container =
    $("accountManagerList");

  if (!container) return;

  if (!allAccounts.length) {

    container.innerHTML = `
      <div class="account-empty">
        <strong>No trading accounts yet.</strong>
        Create your first account below.
      </div>
    `;

    return;
  }

  container.innerHTML =
    allAccounts.map(
      account => {

        const balance =
          accountStartingBalance(
            account
          );

        return `
          <div
            class="account-manager-item"
            data-account-id="${escapeHTML(account.id)}"
          >

            <div class="account-manager-main">

              <div class="account-manager-name">
                ${escapeHTML(
                  account.name ||
                  account.accountName ||
                  "Trading Account"
                )}
              </div>

              <div class="account-manager-meta">
                ${escapeHTML(
                  account.type ||
                  account.accountType ||
                  "Trading Account"
                )}
                •
                ${money(balance)}
                •
                ${percent(
                  accountRisk(account)
                )}
                risk
              </div>

            </div>

            <div class="account-manager-actions">

              <button
                type="button"
                class="edit-account-btn"
                data-account-id="${escapeHTML(account.id)}"
              >
                <i class="fa-solid fa-pen"></i>
              </button>

              <button
                type="button"
                class="delete-account-btn"
                data-account-id="${escapeHTML(account.id)}"
              >
                <i class="fa-solid fa-trash"></i>
              </button>

            </div>

          </div>
        `;
      }
    ).join("");
}


// ============================================================
// ACCOUNT MODAL
// ============================================================

function openAccountModal() {

  const modal =
    $("accountModal");

  if (!modal) return;

  modal.classList.add("open");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  renderAccountManager();
}

function closeAccountModal() {

  const modal =
    $("accountModal");

  if (!modal) return;

  modal.classList.remove("open");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  clearAccountForm();
}

function clearAccountForm() {

  setValue(
    "editingAccountId",
    ""
  );

  setValue(
    "newAccountName",
    ""
  );

  setValue(
    "newAccountType",
    "Prop Firm"
  );

  setValue(
    "newAccountBalance",
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

  const btn =
    $("accountSubmitBtn");

  if (btn) {
    btn.innerHTML = `
      <i class="fa-solid fa-plus"></i>
      Create Account
    `;
  }
}

function editAccount(accountId) {

  const account =
    allAccounts.find(
      a => a.id === accountId
    );

  if (!account) return;

  setValue(
    "editingAccountId",
    account.id
  );

  setValue(
    "newAccountName",
    account.name ||
    account.accountName ||
    ""
  );

  setValue(
    "newAccountType",
    account.type ||
    account.accountType ||
    "Trading Account"
  );

  setValue(
    "newAccountBalance",
    accountStartingBalance(
      account
    )
  );

  setValue(
    "newAccountRisk",
    accountRisk(account)
  );

  setValue(
    "newAccountCurrency",
    accountCurrency(account)
  );

  const btn =
    $("accountSubmitBtn");

  if (btn) {
    btn.innerHTML = `
      <i class="fa-solid fa-floppy-disk"></i>
      Update Account
    `;
  }
}

async function saveAccount(
  event
) {

  event.preventDefault();

  if (!currentUser) return;

  const name =
    value("newAccountName")
      .trim();

  const type =
    value("newAccountType");

  const startingBalance =
    numberValue(
      "newAccountBalance"
    );

  const risk =
    numberValue(
      "newAccountRisk"
    );

  const currency =
    value("newAccountCurrency")
      .trim()
      .toUpperCase();

  if (!name) {
    showMessage(
      "Enter an account name.",
      "warning"
    );

    return;
  }

  if (startingBalance < 0) {
    showMessage(
      "Starting balance cannot be negative.",
      "warning"
    );

    return;
  }

  if (risk < 0) {
    showMessage(
      "Risk cannot be negative.",
      "warning"
    );

    return;
  }

  try {

    const editingId =
      value("editingAccountId");

    const data = {
      userId:
        currentUser.uid,

      name,

      type,

      startingBalance,

      riskPercent:
        risk,

      currency:
        currency || "USD",

      updatedAt:
        serverTimestamp()
    };

    if (editingId) {

      await updateDoc(
        doc(
          db,
          "tradingAccounts",
          editingId
        ),
        data
      );

      showMessage(
        "Trading account updated.",
        "success"
      );

    } else {

      await addDoc(
        accountsRef(),
        {
          ...data,

          createdAt:
            serverTimestamp()
        }
      );

      showMessage(
        "Trading account created.",
        "success"
      );
    }

    clearAccountForm();

    await loadAccounts();

  } catch (error) {

    console.error(
      "Account save error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to save account.",
      "error"
    );
  }
}

async function deleteAccount(
  accountId
) {

  if (!accountId) return;

  const account =
    allAccounts.find(
      a => a.id === accountId
    );

  if (!account) return;

  const hasTrades =
    allTrades.some(
      trade =>
        trade.accountId ===
        accountId
    );

  const message =
    hasTrades
      ? "This account has trades attached to it. Delete the account anyway?"
      : "Delete this trading account?";

  if (!confirm(message)) {
    return;
  }

  try {

    await deleteDoc(
      doc(
        db,
        "tradingAccounts",
        accountId
      )
    );

    if (
      selectedAccountId ===
      accountId
    ) {
      selectedAccountId =
        "all";
    }

    showMessage(
      "Trading account deleted.",
      "success"
    );

    await loadAccounts();

  } catch (error) {

    console.error(
      "Account deletion error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to delete account.",
      "error"
    );
  }
}


// ============================================================
// ESCAPE HTML
// ============================================================

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


// ============================================================
// PRICE FORMAT
// ============================================================

function formatPrice(value) {

  const n =
    safeNumber(value);

  if (!n) return "0";

  return n.toLocaleString(
    "en-US",
    {
      maximumFractionDigits:
        5
    }
  );
}


// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {

  // ----------------------------------------------------------
  // Trade form
  // ----------------------------------------------------------

  const form =
    $("tradeForm");

  if (form) {

    form.addEventListener(
      "submit",
      saveTrade
    );

    form.addEventListener(
      "reset",
      event => {

        /*
         * Let the native reset happen first,
         * then restore journal defaults.
         */

        setTimeout(
          () => {

            if (
              editingTradeId
            ) {
              /*
               * Reset while editing means:
               * leave edit mode and create new trade.
               */

              editingTradeId = null;
              editingTradeOriginal = null;

              setEditModeUI(false);

              window.history.replaceState(
                {},
                document.title,
                window.location.pathname
              );
            }

            resetTradeForm();

          },
          0
        );
      }
    );
  }


  // ----------------------------------------------------------
  // Account filter
  // ----------------------------------------------------------

  const accountFilter =
    $("accountFilter");

  if (accountFilter) {

    accountFilter.addEventListener(
      "change",
      () => {

        selectedAccountId =
          accountFilter.value;

        updateAccountPanel();
        updateStatistics();
        renderCharts();
      }
    );
  }


  // ----------------------------------------------------------
  // Trade account
  // ----------------------------------------------------------

  const tradeAccount =
    $("tradeAccount");

  if (tradeAccount) {

    tradeAccount.addEventListener(
      "change",
      updateAccountFormFields
    );
  }


  // ----------------------------------------------------------
  // Calculation fields
  // ----------------------------------------------------------

  [
    "pair",
    "direction",
    "entry",
    "stopLoss",
    "takeProfit",
    "lotSize"
  ].forEach(id => {

    const el = $(id);

    if (!el) return;

    el.addEventListener(
      "input",
      () => {

        if (
          id === "pair"
        ) {
          updatePipValue();
        }

        calculateTrade();
      }
    );

    el.addEventListener(
      "change",
      () => {

        if (
          id === "pair"
        ) {
          updatePipValue();
        }

        calculateTrade();
      }
    );
  });


  // ----------------------------------------------------------
  // Entry model
  // ----------------------------------------------------------

  const entryModel =
    $("entryModel");

  if (entryModel) {

    entryModel.addEventListener(
      "change",
      updateEntryModelVisibility
    );
  }


  // ----------------------------------------------------------
  // Recent trades edit
  // ----------------------------------------------------------

  const recentTrades =
    $("recentTrades");

  if (recentTrades) {

    recentTrades.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            ".edit-trade-btn"
          );

        if (!button) return;

        editTrade(
          button.dataset.tradeId
        );
      }
    );
  }


  // ----------------------------------------------------------
  // Add account
  // ----------------------------------------------------------

  const addAccountBtn =
    $("addAccountBtn");

  if (addAccountBtn) {

    addAccountBtn.addEventListener(
      "click",
      openAccountModal
    );
  }


  // ----------------------------------------------------------
  // Close account modal
  // ----------------------------------------------------------

  const closeAccountModalBtn =
    $("closeAccountModal");

  if (closeAccountModalBtn) {

    closeAccountModalBtn.addEventListener(
      "click",
      closeAccountModal
    );
  }


  // ----------------------------------------------------------
  // Cancel account form
  // ----------------------------------------------------------

  const cancelAccountBtn =
    $("cancelAccountBtn");

  if (cancelAccountBtn) {

    cancelAccountBtn.addEventListener(
      "click",
      clearAccountForm
    );
  }


  // ----------------------------------------------------------
  // Account form
  // ----------------------------------------------------------

  const accountForm =
    $("accountForm");

  if (accountForm) {

    accountForm.addEventListener(
      "submit",
      saveAccount
    );
  }


  // ----------------------------------------------------------
  // Account manager actions
  // ----------------------------------------------------------

  const accountManager =
    $("accountManagerList");

  if (accountManager) {

    accountManager.addEventListener(
      "click",
      event => {

        const editButton =
          event.target.closest(
            ".edit-account-btn"
          );

        if (editButton) {

          editAccount(
            editButton.dataset.accountId
          );

          return;
        }

        const deleteButton =
          event.target.closest(
            ".delete-account-btn"
          );

        if (deleteButton) {

          deleteAccount(
            deleteButton.dataset.accountId
          );
        }
      }
    );
  }


  // ----------------------------------------------------------
  // Modal backdrop
  // ----------------------------------------------------------

  const modal =
    $("accountModal");

  if (modal) {

    modal.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          modal
        ) {
          closeAccountModal();
        }
      }
    );
  }


  // ----------------------------------------------------------
  // Logout
  // ----------------------------------------------------------

  const logoutBtn =
    $("logoutBtn");

  if (logoutBtn) {

    logoutBtn.addEventListener(
      "click",
      async () => {

        try {

          await signOut(auth);

          window.location.href =
            "/login";

        } catch (error) {

          console.error(
            "Logout error:",
            error
          );

          showMessage(
            "Unable to log out.",
            "error"
          );
        }
      }
    );
  }


  // ----------------------------------------------------------
  // Scroll top
  // ----------------------------------------------------------

  const scrollTop =
    $("scrollTopBtn");

  if (scrollTop) {

    window.addEventListener(
      "scroll",
      () => {

        if (
          window.scrollY >
          400
        ) {
          scrollTop.classList.add(
            "visible"
          );
        } else {
          scrollTop.classList.remove(
            "visible"
          );
        }
      }
    );

    scrollTop.addEventListener(
      "click",
      () => {

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    );
  }
}


// ============================================================
// EDIT URL AUTO LOAD
// ============================================================

async function checkForEditMode() {

  const tradeId =
    getEditTradeId();

  if (!tradeId) {
    return;
  }

  /*
   * Wait until trades have been loaded,
   * then load the requested trade.
   */

  await editTrade(
    tradeId
  );
}


// ============================================================
// INITIALIZE JOURNAL
// ============================================================

async function initializeJournal() {

  setAppLoading(true);

  try {

    const allowed =
      await checkMembership();

    if (!allowed) {
      return;
    }

    await loadAccounts();

    await loadTrades();

    resetTradeForm();

    await checkForEditMode();

  } catch (error) {

    console.error(
      "Journal initialization error:",
      error
    );

    showMessage(
      "Unable to initialize the trading journal.",
      "error"
    );

  } finally {

    setAppLoading(false);
  }
}


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      currentUser = null;

      window.location.href =
        "/login";

      return;
    }

    currentUser =
      user;

    await initializeJournal();
  }
);


// ============================================================
// START
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEventListeners();

    /*
     * Set initial date/time immediately.
     * Firebase/auth initialization happens separately.
     */

    setValue(
      "tradeDate",
      todayDate()
    );

    setValue(
      "tradeTime",
      currentTime()
    );

    setValue(
      "result",
      "Pending"
    );

    updateEntryModelVisibility();
  }
);

