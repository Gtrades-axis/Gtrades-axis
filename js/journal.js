/* ==========================================================
   GTRADES-AXIS™ PREMIUM TRADING JOURNAL
   Rebuilt journal engine
   - Single flat trade schema
   - Reliable edit/populate flow
   - Pending trades remain fully editable
   - Multi-account support
   - Pair-aware risk calculations
   ========================================================== */

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const STORAGE_KEY = "trades";
const ACCOUNTS_KEY = "gtrades_axis_accounts";

let currentUser = null;
let trades = [];
let accounts = {};
let selectedAccountId = "all";
let editingTradeId = null;
let equityChartInstance = null;
let monthlyChartInstance = null;

/* ==========================================================
   HELPERS
   ========================================================== */

const $ = id => document.getElementById(id);

function val(id) {
  const el = $(id);
  return el ? String(el.value ?? "") : "";
}

function num(id) {
  const n = parseFloat(val(id));
  return Number.isFinite(n) ? n : 0;
}

function isChecked(id) {
  const el = $(id);
  return !!el?.checked;
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setValue(id, value) {
  const el = $(id);
  if (el) el.value = value ?? "";
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
  return (n >= 0 ? "+" : "-") + "$" + Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeResult(value) {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "win") return "Win";
  if (s === "loss") return "Loss";
  if (s === "breakeven" || s === "break even" || s === "break-even") return "Breakeven";
  return "Pending";
}

function normalizeStatus(trade) {
  if (String(trade?.status || "").toLowerCase() === "closed") return "Closed";
  if (normalizeResult(trade?.result) !== "Pending") return "Closed";
  return "Pending";
}

/* ==========================================================
   STORAGE + LEGACY NORMALIZATION
   ========================================================== */

function normalizeTrade(raw) {
  if (!raw || typeof raw !== "object") return null;

  /* Old nested journal schema support */
  const info = raw.info || {};
  const ltf = raw.ltf || {};
  const result = raw.result && typeof raw.result === "object" ? raw.result : {};
  const screenshots = raw.screenshots || {};

  const trade = {
    ...raw,

    id: raw.id ?? (Date.now() + "_" + Math.random().toString(36).slice(2, 8)),

    date: raw.date ?? info.date ?? "",
    time: raw.time ?? info.time ?? "",
    pair: raw.pair ?? info.pair ?? "",
    direction: raw.direction ?? info.direction ?? "",
    session: raw.session ?? info.session ?? "",
    broker: raw.broker ?? info.broker ?? "",
    account: raw.account ?? info.account ?? "",
    accountId: raw.accountId ?? "",

    lotSize: raw.lotSize ?? raw.execution?.lotSize ?? 0,

    htfSwing: raw.htfSwing ?? raw.htf?.swing ?? "",
    htfInternal: raw.htfInternal ?? raw.htf?.internal ?? "",
    mtfSwing: raw.mtfSwing ?? raw.mtf?.swing ?? "",
    mtfInternal: raw.mtfInternal ?? raw.mtf?.internal ?? "",

    ltfStructure: raw.ltfStructure ?? ltf.structure ?? "",
    liquidity: raw.liquidity ?? ltf.liquidity ?? "",
    poi: raw.poi ?? ltf.poi ?? "",
    entryModel: raw.entryModel ?? ltf.model ?? "",
    entryConfirmation: raw.entryConfirmation ?? ltf.confirmation ?? "",
    tradeValid: raw.tradeValid ?? ltf.valid ?? "",

    entry: raw.entry ?? raw.execution?.entry ?? 0,
    stopLoss: raw.stopLoss ?? raw.execution?.stopLoss ?? 0,
    takeProfit: raw.takeProfit ?? raw.execution?.takeProfit ?? 0,

    balance: raw.balance ?? 0,
    riskSettingAmount: raw.riskSettingAmount ?? 0,
    riskAmount: raw.riskAmount ?? 0,
    risk: raw.risk ?? 0,
    potentialProfit: raw.potentialProfit ?? 0,
    potentialLoss: raw.potentialLoss ?? 0,
    rr: raw.rr ?? result.actualRR ?? 0,

    profit: raw.profit ?? result.profit ?? 0,
    commission: raw.commission ?? result.commission ?? 0,
    result: typeof raw.result === "string" ? raw.result : (result.outcome ?? "Pending"),

    beforeChart: raw.beforeChart ?? screenshots.before ?? "",
    duringChart: raw.duringChart ?? screenshots.during ?? "",
    afterChart: raw.afterChart ?? screenshots.after ?? "",

    status: raw.status ?? "Pending",
    created: raw.created ?? raw.createdAt ?? new Date().toISOString(),
    closed: raw.closed ?? null
  };

  trade.result = normalizeResult(trade.result);
  trade.status = normalizeStatus(trade);

  if (!trade.accountId && trade.account) {
    const found = Object.values(accounts).find(a =>
      String(a.name || "").trim().toLowerCase() ===
      String(trade.account).trim().toLowerCase()
    );
    if (found) trade.accountId = found.id;
  }

  return trade;
}

function loadAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    accounts = raw ? JSON.parse(raw) : {};
    if (!accounts || typeof accounts !== "object" || Array.isArray(accounts)) accounts = {};
  } catch {
    accounts = {};
  }

  Object.keys(accounts).forEach(id => {
    const a = accounts[id];
    if (!a || !a.id || !a.name) delete accounts[id];
    else {
      a.startingBalance = Number(a.startingBalance) || 0;
      a.currentBalance = Number.isFinite(Number(a.currentBalance))
        ? Number(a.currentBalance)
        : a.startingBalance;
      a.riskPercent = Number(a.riskPercent) || 0;
      a.currency = String(a.currency || "USD").toUpperCase();
    }
  });
}

function saveAccounts() {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getAccount(id) {
  return id ? accounts[id] || null : null;
}

function loadTrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    trades = Array.isArray(parsed)
      ? parsed.map(normalizeTrade).filter(Boolean)
      : [];
  } catch {
    trades = [];
  }

  /* Attach old account-name-only trades to matching accounts. */
  let changed = false;
  trades.forEach(t => {
    if (!t.accountId && t.account) {
      const found = Object.values(accounts).find(a =>
        String(a.name || "").trim().toLowerCase() ===
        String(t.account || "").trim().toLowerCase()
      );
      if (found) {
        t.accountId = found.id;
        changed = true;
      }
    }
  });

  if (changed) saveTrades();
}

function saveTrades() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

/* ==========================================================
   ACCOUNT ENGINE
   ========================================================== */

function getSelectedAccount() {
  return selectedAccountId === "all" ? null : getAccount(selectedAccountId);
}

function getAccountNetPnL(accountId) {
  return trades
    .filter(t => t.accountId === accountId && t.status === "Closed")
    .reduce((sum, t) => sum + (Number(t.profit) || 0) - (Number(t.commission) || 0), 0);
}

function populateAccountSelectors() {
  const filter = $("accountFilter");
  const select = $("tradeAccount");
  const list = Object.values(accounts);

  if (filter) {
    filter.innerHTML = `<option value="all">All Accounts</option>`;
    list.forEach(a => {
      const option = document.createElement("option");
      option.value = a.id;
      option.textContent = a.name;
      filter.appendChild(option);
    });

    if (selectedAccountId !== "all" && !accounts[selectedAccountId]) {
      selectedAccountId = "all";
    }
    filter.value = selectedAccountId;
  }

  if (select) {
    const keep = select.value;
    select.innerHTML = `<option value="">Select an account</option>`;
    list.forEach(a => {
      const option = document.createElement("option");
      option.value = a.id;
      option.textContent = a.name;
      select.appendChild(option);
    });

    if (keep && accounts[keep]) select.value = keep;
    else if (selectedAccountId !== "all" && accounts[selectedAccountId]) select.value = selectedAccountId;
    else if (list[0]) select.value = list[0].id;
  }
}

function updateTradeAccountInfo() {
  const account = getAccount(val("tradeAccount"));
  if (!account) {
    setValue("tradeAccountBalance", "");
    setValue("tradeRiskSetting", "");
    setValue("currencyDisplay", "");
    if (!editingTradeId) setValue("balance", "");
    calculateAll();
    return;
  }

  setValue("tradeAccountBalance", money(account.currentBalance));
  setValue("tradeRiskSetting", `${account.riskPercent.toFixed(2)}%`);
  setValue("currencyDisplay", account.currency);

  /* Do not overwrite the stored balance while editing. */
  if (!editingTradeId) setValue("balance", account.currentBalance);

  calculateAll();
}

function openAccountModal(accountId = null) {
  const modal = $("accountModal");
  if (!modal) return;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");

  if (accountId && accounts[accountId]) {
    const a = accounts[accountId];
    setValue("editingAccountId", a.id);
    setValue("newAccountName", a.name);
    setValue("newAccountType", a.type || "Other");
    setValue("newAccountBalance", a.startingBalance);
    setValue("newAccountRisk", a.riskPercent);
    setValue("newAccountCurrency", a.currency || "USD");
    setText("accountModalTitle", "Edit Trading Account");
    const btn = $("accountSubmitBtn");
    if (btn) btn.innerHTML = '<i class="fa-solid fa-pen"></i> Update Account';
  } else {
    clearAccountForm();
  }
  renderAccountManager();
}

function closeAccountModal() {
  const modal = $("accountModal");
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}

function clearAccountForm() {
  const form = $("accountForm");
  if (form) form.reset();
  setValue("editingAccountId", "");
  setValue("newAccountCurrency", "USD");
  setValue("newAccountRisk", "1");
  setText("accountModalTitle", "Manage Trading Accounts");
  const btn = $("accountSubmitBtn");
  if (btn) btn.innerHTML = '<i class="fa-solid fa-plus"></i> Create Account';
}

function renderAccountManager() {
  const container = $("accountManagerList");
  if (!container) return;

  const list = Object.values(accounts);
  if (!list.length) {
    container.innerHTML = '<div class="account-empty">No accounts yet. Create your first trading account below.</div>';
    return;
  }

  container.innerHTML = "";
  list.forEach(a => {
    const item = document.createElement("div");
    item.className = "account-manager-item";

    const main = document.createElement("div");
    main.className = "account-manager-main";
    main.innerHTML = `
      <div class="account-manager-name">${escapeHtml(a.name)}</div>
      <div class="account-manager-meta">
        ${escapeHtml(a.type || "Other")} • ${escapeHtml(a.currency || "USD")}
        • Starting ${money(a.startingBalance)}
        • Risk ${Number(a.riskPercent || 0).toFixed(2)}%
      </div>`;

    const actions = document.createElement("div");
    actions.className = "account-manager-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.innerHTML = '<i class="fa-solid fa-pen"></i> Edit';
    edit.addEventListener("click", () => openAccountModal(a.id));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete-account-btn";
    del.innerHTML = '<i class="fa-solid fa-trash"></i> Delete';
    del.addEventListener("click", () => deleteAccount(a.id));

    actions.append(edit, del);
    item.append(main, actions);
    container.appendChild(item);
  });
}

function createAccountFromForm(event) {
  event.preventDefault();

  const editingId = val("editingAccountId");
  const name = val("newAccountName").trim();
  const startingBalance = parseFloat(val("newAccountBalance"));
  const riskPercent = parseFloat(val("newAccountRisk"));
  const currency = val("newAccountCurrency").trim().toUpperCase();
  const type = val("newAccountType") || "Other";

  if (!name || !Number.isFinite(startingBalance) || startingBalance < 0 ||
      !Number.isFinite(riskPercent) || riskPercent < 0 || !currency) {
    alert("Please enter valid account details.");
    return;
  }

  if (editingId && accounts[editingId]) {
    const a = accounts[editingId];
    const oldStarting = Number(a.startingBalance) || 0;
    const oldCurrent = Number(a.currentBalance) || oldStarting;
    const pnl = oldCurrent - oldStarting;

    a.name = name;
    a.type = type;
    a.startingBalance = startingBalance;
    a.currentBalance = startingBalance + pnl;
    a.riskPercent = riskPercent;
    a.currency = currency;
  } else {
    const id = "account-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    accounts[id] = {
      id, name, type, startingBalance,
      currentBalance: startingBalance,
      riskPercent, currency
    };
    selectedAccountId = id;
  }

  saveAccounts();
  populateAccountSelectors();
  renderAccountManager();
  updateTradeAccountInfo();
  calculateStatistics();
  updateAccountPanel();
  clearAccountForm();
  alert(editingId ? "✅ Account updated successfully." : "✅ Account added successfully.");
}

function deleteAccount(id) {
  const account = accounts[id];
  if (!account) return;

  const used = trades.some(t => t.accountId === id);
  if (used) {
    alert("This account has journal trades attached to it. Delete or reassign those trades first.");
    return;
  }

  if (!confirm(`Delete "${account.name}"?`)) return;
  delete accounts[id];
  if (selectedAccountId === id) selectedAccountId = "all";
  saveAccounts();
  populateAccountSelectors();
  renderAccountManager();
  updateTradeAccountInfo();
  calculateStatistics();
  updateAccountPanel();
}

/* ==========================================================
   PAIR-AWARE PIP / RISK ENGINE
   ========================================================== */

function getPipInfo(pair, price = 0, accountCurrency = "USD") {
  const symbol = String(pair || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const px = Number(price) || 0;
  const currency = String(accountCurrency || "USD").toUpperCase();

  /* CFDs / crypto: retain common journal conventions. */
  if (/^(XAUUSD|GOLD)$/.test(symbol)) return { pipSize: 0.01, pipValueUSD: 1.00, basis: "100 oz lot" };
  if (/^(XAGUSD|SILVER)$/.test(symbol)) return { pipSize: 0.001, pipValueUSD: 5.00, basis: "5000 oz lot" };

  if (/^(US30|USA30|DOW|DJI|US100|NAS100|NDX|US500|SPX|SPX500|GER30|DAX|DE30|UK100|FTSE|FRA40|CAC|EUR50|STOXX|JPN225|NIKKEI|AUS200|ASX|HK50|HANG|SING|STI)$/i.test(symbol)) {
    return { pipSize: 1, pipValueUSD: 1, basis: "broker-dependent CFD point" };
  }

  if (/^(BTC|ETH|SOL|XRP|ADA|DOT|LINK|UNI|AVAX|MATIC|LTC|BCH|DOGE|BNB|XLM|TRX|ETC|XMR|EOS|AAVE|MKR|CRV|LDO|NEAR|ATOM|FIL|ICP|ALGO|SUI|APT)(USD|USDT)?$/i.test(symbol)) {
    return { pipSize: 1, pipValueUSD: 1, basis: "broker-dependent crypto point" };
  }

  /* Standard FX pair: 100,000 base units. */
  if (symbol.length >= 6) {
    const base = symbol.slice(0, 3);
    const quote = symbol.slice(3, 6);

    if (/^[A-Z]{3}$/.test(base) && /^[A-Z]{3}$/.test(quote)) {
      const pipSize = quote === "JPY" ? 0.01 : 0.0001;

      /* USD account: exact for USD-quoted pairs and USDJPY. */
      if (currency === "USD") {
        if (quote === "USD") {
          return { pipSize, pipValueUSD: 10, basis: "100,000 FX units" };
        }

        if (quote === "JPY" && px > 0) {
          return {
            pipSize,
            pipValueUSD: 1000 / px,
            basis: "100,000 FX units • JPY converted using pair price"
          };
        }

        /*
         * For other cross pairs, the exact USD conversion requires the
         * quote-currency/USD rate. We keep the quote pip value and flag it.
         * Users can still see the correct pip distance and can use the
         * calculated value as a broker-specific estimate.
         */
        if (quote === "USD") {
          return { pipSize, pipValueUSD: 10, basis: "100,000 FX units" };
        }

        const commonQuoteToUSD = {
          EUR: 1.0,
          GBP: 1.0,
          AUD: 1.0,
          NZD: 1.0,
          CAD: 1.0,
          CHF: 1.0
        };

        /* Conservative fallback: quote pip value before conversion. */
        if (quote !== "JPY") {
          return {
            pipSize,
            pipValueUSD: 10,
            basis: `${base}/${quote} • quote conversion unavailable`
          };
        }
      }

      /* If account currency equals quote currency, no conversion needed. */
      if (currency === quote) {
        return {
          pipSize,
          pipValueUSD: quote === "JPY" ? 1000 : 10,
          basis: "100,000 FX units"
        };
      }

      /* Generic fallback for non-USD account currencies. */
      return {
        pipSize,
        pipValueUSD: quote === "JPY" && px > 0 ? 1000 / px : 10,
        basis: `${base}/${quote} • verify account-currency conversion`
      };
    }
  }

  return { pipSize: 0.0001, pipValueUSD: 10, basis: "fallback" };
}

function getPipValue(pair) {
  const entry = num("entry");
  const account = getAccount(val("tradeAccount"));
  return getPipInfo(pair, entry, account?.currency || "USD").pipValueUSD;
}

function getPipSize(pair) {
  const entry = num("entry");
  const account = getAccount(val("tradeAccount"));
  return getPipInfo(pair, entry, account?.currency || "USD").pipSize;
}

function calculateAll() {
  const pair = val("pair") || "EURUSD";
  const entry = num("entry");
  const stopLoss = num("stopLoss");
  const takeProfit = num("takeProfit");
  const lotSize = num("lotSize");
  const balance = num("balance");

  const account = getAccount(val("tradeAccount"));
  const accountRiskPercent = account ? Number(account.riskPercent) || 0 : 0;
  const riskSettingAmount = balance * accountRiskPercent / 100;

  setValue("riskSettingAmount", riskSettingAmount > 0 ? riskSettingAmount.toFixed(2) : "");
  setText("summaryRiskSetting", money(riskSettingAmount));

  const pipSize = getPipSize(pair);
  const pipValue = getPipValue(pair);

  const slDistance = entry && stopLoss ? Math.abs(entry - stopLoss) : 0;
  const tpDistance = entry && takeProfit ? Math.abs(takeProfit - entry) : 0;

  const slPips = pipSize > 0 ? slDistance / pipSize : 0;
  const tpPips = pipSize > 0 ? tpDistance / pipSize : 0;

  const actualRiskAmount = slPips * pipValue * lotSize;
  const potentialProfit = tpPips * pipValue * lotSize;

  const riskPercent = balance > 0 ? actualRiskAmount / balance * 100 : 0;
  const rr = slDistance > 0 ? tpDistance / slDistance : 0;

  const pipInfo = getPipInfo(
    pair,
    entry,
    account?.currency || "USD"
  );

  setValue("pipValueDisplay",
    `$${pipValue.toFixed(2)} / lot${pipInfo.basis ? ` • ${pipInfo.basis}` : ""}`);

  setValue("riskAmount", actualRiskAmount > 0 ? actualRiskAmount.toFixed(2) : "");
  setValue("risk", actualRiskAmount > 0 ? riskPercent.toFixed(2) : "");
  setValue("rr", rr > 0 ? rr.toFixed(2) : "");
  setValue("potentialLoss", actualRiskAmount > 0 ? actualRiskAmount.toFixed(2) : "");
  setValue("potentialProfit", potentialProfit > 0 ? potentialProfit.toFixed(2) : "");

  setText("summaryRiskAmount", money(actualRiskAmount));
  setText("summaryRiskPercent", actualRiskAmount > 0 ? `${riskPercent.toFixed(2)}%` : "0.00%");
  setText("summaryPotentialProfit", money(potentialProfit));
  setText("summaryPotentialLoss", money(actualRiskAmount));
  setText("summaryRR", rr > 0 ? rr.toFixed(2) : "0.00");

  return {
    pipSize,
    pipValue,
    slPips,
    tpPips,
    actualRiskAmount,
    potentialProfit,
    riskPercent,
    rr
  };
}

/* ==========================================================
   TRADE OBJECT
   ========================================================== */

const CONFLUENCE_MAP = {
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

function getEntryModelValue() {
  const select = $("entryModel");
  const custom = $("entryModelCustom");
  if (!select) return "";
  return select.value === "__custom__"
    ? String(custom?.value || "").trim()
    : select.value;
}

function syncEntryModelInput() {
  const select = $("entryModel");
  const custom = $("entryModelCustom");
  if (!select || !custom) return;
  const manual = select.value === "__custom__";
  custom.style.display = manual ? "block" : "none";
  custom.required = manual;
  if (!manual) custom.value = "";
}

function buildTradeFromForm(existing = null) {
  const calc = calculateAll();
  const result = normalizeResult(val("result"));

  let profit = num("profit");
  if (result === "Loss" && profit > 0) profit = -profit;

  const accountId = val("tradeAccount");
  const account = getAccount(accountId);

  return {
    ...(existing || {}),

    id: existing?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,

    accountId,
    account: account?.name || existing?.account || "",

    date: val("tradeDate"),
    time: val("tradeTime"),
    pair: val("pair"),
    direction: val("direction"),
    session: val("session"),
    broker: val("broker"),

    lotSize: num("lotSize"),

    htfSwing: val("htfSwing"),
    htfInternal: val("htfInternal"),
    mtfSwing: val("mtfSwing"),
    mtfInternal: val("mtfInternal"),

    ltfStructure: val("ltfStructure"),
    liquidity: val("liquidity"),
    poi: val("poi"),
    entryModel: getEntryModelValue(),
    entryConfirmation: val("entryConfirmation"),
    tradeValid: val("tradeValid"),

    confluences: Object.fromEntries(
      Object.entries(CONFLUENCE_MAP).map(([key, id]) => [key, isChecked(id)])
    ),

    entry: num("entry"),
    stopLoss: num("stopLoss"),
    takeProfit: num("takeProfit"),

    balance: num("balance"),
    riskSettingAmount: calc.actualRiskAmount > 0
      ? (getAccount(accountId)?.currentBalance || num("balance")) *
        ((Number(getAccount(accountId)?.riskPercent) || 0) / 100)
      : num("riskSettingAmount"),

    riskAmount: calc.actualRiskAmount,
    risk: calc.riskPercent,
    potentialProfit: calc.potentialProfit,
    potentialLoss: calc.actualRiskAmount,
    rr: calc.rr,

    profit,
    commission: num("commission"),

    result,
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

    beforeChart: val("beforeChart"),
    duringChart: val("duringChart"),
    afterChart: val("afterChart"),

    notes: val("notes"),

    created: existing?.created || new Date().toISOString(),
    closed: result === "Pending"
      ? null
      : (existing?.closed || new Date().toISOString())
  };
}

/* ==========================================================
   FORM POPULATION — THE EDIT FIX
   ========================================================== */

function ensureSelectValue(select, value) {
  if (!select || value === undefined || value === null || value === "") return;
  const exists = Array.from(select.options).some(o => o.value === String(value));
  if (!exists) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = String(value);
    select.appendChild(option);
  }
}

function populateForm(trade) {
  if (!trade) return;

  const fields = [
    "tradeDate", "tradeTime",
    "pair", "direction", "session", "broker",
    "lotSize",
    "htfSwing", "htfInternal",
    "mtfSwing", "mtfInternal",
    "ltfStructure", "liquidity", "poi",
    "entryConfirmation", "tradeValid",
    "entry", "stopLoss", "takeProfit",
    "balance", "riskSettingAmount", "riskAmount", "risk",
    "potentialProfit", "potentialLoss", "rr",
    "profit", "commission", "result",
    "confidence", "emotion", "discipline", "patience",
    "tradeSummary", "strengths", "mistakes",
    "lessonLearned", "improvementPlan",
    "beforeChart", "duringChart", "afterChart", "notes"
  ];

  fields.forEach(id => {
    const el = $(id);
    if (!el) return;

    const value = trade[id];
    if (value === undefined || value === null) return;

    if (el.tagName === "SELECT") ensureSelectValue(el, value);
    el.value = String(value);
  });

  /* Account MUST be selected before calculating. */
  const accountSelect = $("tradeAccount");
  if (accountSelect && trade.accountId && accounts[trade.accountId]) {
    accountSelect.value = trade.accountId;
  } else if (accountSelect && trade.account) {
    const found = Object.values(accounts).find(a =>
      String(a.name).trim().toLowerCase() === String(trade.account).trim().toLowerCase()
    );
    if (found) accountSelect.value = found.id;
  }

  /* Entry model can be a built-in option OR a saved custom value. */
  const entrySelect = $("entryModel");
  const custom = $("entryModelCustom");
  if (entrySelect) {
    const saved = String(trade.entryModel ?? "");
    const builtIn = Array.from(entrySelect.options)
      .some(o => o.value === saved && o.value !== "__custom__");

    if (builtIn) {
      entrySelect.value = saved;
      if (custom) custom.value = "";
    } else if (saved) {
      entrySelect.value = "__custom__";
      if (custom) custom.value = saved;
    }
    syncEntryModelInput();
  }

  /* Reset all checkboxes, then restore saved confluences. */
  Object.values(CONFLUENCE_MAP).forEach(id => {
    const el = $(id);
    if (el) el.checked = false;
  });

  Object.entries(CONFLUENCE_MAP).forEach(([key, id]) => {
    const el = $(id);
    if (el) el.checked = trade.confluences?.[key] === true;
  });

  editingTradeId = String(trade.id);

  let updateFlag = $("updateMode");
  if (!updateFlag) {
    updateFlag = document.createElement("input");
    updateFlag.type = "hidden";
    updateFlag.id = "updateMode";
    updateFlag.name = "updateMode";
    $("tradeForm")?.appendChild(updateFlag);
  }
  if (updateFlag) updateFlag.value = "true";

  const button = $("saveTradeBtn");
  if (button) {
    button.innerHTML = '<i class="fa-solid fa-pen"></i> Update Trade';
    button.classList.remove("btn-primary");
    button.classList.add("btn-update");
  }

  const header = document.querySelector(".page-header h1");
  if (header) header.innerHTML = '<i class="fa-solid fa-pen"></i> Edit Trade';

  const headerP = document.querySelector(".page-header p");
  if (headerP) headerP.textContent = "Modify trade details and save changes.";

  /*
   * Calculate only AFTER every saved field is in the DOM.
   * This is deliberately direct instead of dispatching dozens of events.
   */
  updateTradeAccountInfo();
  calculateAll();
}

/* ==========================================================
   SAVE / UPDATE
   ========================================================== */

function applyBalanceDelta(accountId, oldTrade, newTrade) {
  const account = getAccount(accountId);
  if (!account) return;

  const oldNet =
    oldTrade && oldTrade.status === "Closed"
      ? (Number(oldTrade.profit) || 0) - (Number(oldTrade.commission) || 0)
      : 0;

  const newNet =
    newTrade && newTrade.status === "Closed"
      ? (Number(newTrade.profit) || 0) - (Number(newTrade.commission) || 0)
      : 0;

  account.currentBalance =
    (Number(account.currentBalance) || 0) + newNet - oldNet;
}

function saveTrade(event) {
  event.preventDefault();

  const form = event.target;
  const existing = editingTradeId
    ? trades.find(t => String(t.id) === String(editingTradeId))
    : null;

  if (editingTradeId && !existing) {
    alert("❌ The trade could not be found.");
    return;
  }

  if (!val("tradeDate")) {
    alert("Please select a date.");
    return;
  }

  if (!val("tradeAccount") || !getAccount(val("tradeAccount"))) {
    alert("Please select a trading account.");
    return;
  }

  const updated = buildTradeFromForm(existing);

  if (existing) {
    /*
     * If the user changed the account while editing, reverse the old
     * trade from its old account and apply it to the new account.
     */
    if (existing.accountId !== updated.accountId) {
      applyBalanceDelta(existing.accountId, existing, null);
      applyBalanceDelta(updated.accountId, null, updated);
    } else {
      applyBalanceDelta(updated.accountId, existing, updated);
    }

    const index = trades.findIndex(t => String(t.id) === String(existing.id));
    trades[index] = updated;
  } else {
    trades.unshift(updated);
    applyBalanceDelta(updated.accountId, null, updated);
  }

  saveTrades();
  saveAccounts();

  const message = existing ? "✅ Trade updated successfully." : `✅ Trade saved as ${updated.result}.`;

  /* Clear edit state BEFORE navigating. */
  editingTradeId = null;
  const updateFlag = $("updateMode");
  if (updateFlag) updateFlag.remove();

  if (existing) {
    window.location.href = "/history";
    return;
  }

  form.reset();
  populateAccountSelectors();
  updateTradeAccountInfo();
  setValue("tradeDate", new Date().toISOString().slice(0, 10));
  refreshUI();

  alert(message);
}

/* ==========================================================
   CLOSE PENDING TRADE
   ========================================================== */

window.closeTrade = function(id) {
  const trade = trades.find(t => String(t.id) === String(id));
  if (!trade) return;

  if (trade.status === "Closed") {
    window.location.href = `/journal?edit=${encodeURIComponent(trade.id)}`;
    return;
  }

  const outcomeInput = prompt("Result?\n\nWin\nLoss\nBreakeven", "Win");
  if (!outcomeInput) return;

  const result = normalizeResult(outcomeInput);
  if (result === "Pending") {
    alert("Use Win, Loss, or Breakeven.");
    return;
  }

  const profitInput = prompt("Profit/Loss ($)", "0");
  if (profitInput === null) return;

  const commissionInput = prompt("Commission ($)", "0");
  if (commissionInput === null) return;

  let profit = parseFloat(profitInput) || 0;
  const commission = parseFloat(commissionInput) || 0;

  if (result === "Loss" && profit > 0) profit = -profit;

  const oldTrade = { ...trade };

  trade.status = "Closed";
  trade.result = result;
  trade.profit = profit;
  trade.commission = commission;
  trade.closed = new Date().toISOString();

  const riskAmount = Number(trade.riskAmount) || 0;
  if (riskAmount > 0) {
    trade.rr = Math.round((profit / riskAmount) * 100) / 100;
  }

  applyBalanceDelta(trade.accountId, oldTrade, trade);

  saveTrades();
  saveAccounts();
  refreshUI();

  alert(
    "✅ Trade closed successfully.\n\n" +
    "Account: " + (getAccount(trade.accountId)?.name || trade.account || "-") +
    "\nNet P/L: " + signedMoney(profit - commission)
  );
};

/* ==========================================================
   VIEW
   ========================================================== */

window.viewTrade = function(trade) {
  const t = typeof trade === "string"
    ? trades.find(x => String(x.id) === String(trade))
    : trade;

  if (!t) return;

  alert(
`PAIR          : ${t.pair || "-"}
ACCOUNT       : ${getAccount(t.accountId)?.name || t.account || "-"}
STATUS        : ${t.status || "-"}
RESULT        : ${t.result || "-"}
PROFIT        : ${money(t.profit)}
COMMISSION    : ${money(t.commission)}
NET P/L       : ${signedMoney((Number(t.profit) || 0) - (Number(t.commission) || 0))}
RISK AMOUNT   : ${money(t.riskAmount)}
RISK %        : ${Number(t.risk || 0).toFixed(2)}%
RR            : ${Number(t.rr || 0).toFixed(2)}
LESSON        : ${t.lessonLearned || "-"}
IMPROVEMENT   : ${t.improvementPlan || "-"}`
  );
};

/* ==========================================================
   STATISTICS
   ========================================================== */

function getFilteredTrades() {
  if (selectedAccountId === "all") return [...trades];
  return trades.filter(t => t.accountId === selectedAccountId);
}

function calculateConsistencyScore(closed) {
  if (!closed.length) return 0;

  const scoreMap = { Excellent: 10, Good: 8, Average: 5, Poor: 2 };
  const emotionMap = { Calm: 10, Confident: 10, Fear: 4, Greed: 3, FOMO: 2, Revenge: 1 };

  let total = 0;

  closed.forEach(t => {
    const account = getAccount(t.accountId);
    const plannedRisk = Number(account?.riskPercent) || 0;
    const actualRisk = Number(t.risk) || 0;

    const followedPlan = t.tradeValid === "Yes" ? 10 : 0;
    const patience = scoreMap[t.patience] ?? 5;
    const discipline = scoreMap[t.discipline] ?? 5;
    const emotionalControl = emotionMap[t.emotion] ?? 5;
    const riskManagement =
      plannedRisk <= 0 || actualRisk <= plannedRisk ? 10 :
      actualRisk <= plannedRisk * 1.25 ? 6 : 2;

    const exitRules =
      Number(t.stopLoss) !== 0 && Number(t.takeProfit) !== 0 ? 10 : 3;

    const journalCompleted =
      [t.tradeSummary, t.lessonLearned, t.improvementPlan].filter(Boolean).length >= 2 ? 10 :
      [t.tradeSummary, t.lessonLearned, t.improvementPlan].filter(Boolean).length === 1 ? 6 : 2;

    total += (followedPlan + patience + discipline + emotionalControl +
      riskManagement + exitRules + journalCompleted) / 7;
  });

  return Math.max(0, Math.min(100, (total / closed.length) * 10));
}

function applyConsistencyClass(el, score) {
  if (!el) return;
  el.classList.remove("consistency-good", "consistency-mid", "consistency-low");
  el.classList.add(
    score >= 80 ? "consistency-good" :
    score >= 60 ? "consistency-mid" :
    "consistency-low"
  );
}

function calculateStatistics() {
  const all = getFilteredTrades();
  const closed = all.filter(t => t.status === "Closed");
  const wins = closed.filter(t => normalizeResult(t.result) === "Win");
  const losses = closed.filter(t => normalizeResult(t.result) === "Loss");
  const pending = all.filter(t => t.status === "Pending");

  const netProfit = closed.reduce(
    (sum, t) => sum + (Number(t.profit) || 0) - (Number(t.commission) || 0), 0
  );

  const grossProfit = wins.reduce((sum, t) => sum + Math.max(Number(t.profit) || 0, 0), 0);
  const grossLoss = losses.reduce((sum, t) => sum + Math.abs(Math.min(Number(t.profit) || 0, 0)), 0);

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const avgRR = closed.length
    ? closed.reduce((s, t) => s + (Number(t.rr) || 0), 0) / closed.length
    : 0;
  const winRate = closed.length ? wins.length / closed.length * 100 : 0;

  const sorted = [...closed].sort((a, b) =>
    new Date(a.closed || a.date) - new Date(b.closed || b.date)
  );

  let streak = 0;
  if (sorted.length) {
    const last = normalizeResult(sorted.at(-1).result);
    for (let i = sorted.length - 1; i >= 0; i--) {
      const r = normalizeResult(sorted[i].result);
      if (r !== last) break;
      streak += last === "Loss" ? -1 : 1;
    }
  }

  let startingBalance = 0;
  if (selectedAccountId === "all") {
    startingBalance = Object.values(accounts)
      .reduce((s, a) => s + (Number(a.startingBalance) || 0), 0);
  } else {
    startingBalance = Number(getSelectedAccount()?.startingBalance) || 0;
  }

  let balance = startingBalance;
  let peak = startingBalance;
  let maxDrawdown = 0;

  sorted.forEach(t => {
    balance += (Number(t.profit) || 0) - (Number(t.commission) || 0);
    peak = Math.max(peak, balance);
    maxDrawdown = Math.max(maxDrawdown, peak - balance);
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthCount = all.filter(t => t.date && new Date(t.date) >= monthStart).length;

  setText("totalTrades", all.length);
  setText("wins", wins.length);
  setText("losses", losses.length);
  setText("pendingCount", pending.length);
  setText("winRate", winRate.toFixed(1) + "%");
  setText("averageRR", avgRR.toFixed(2));
  setText("netProfit", signedMoney(netProfit));
  setText("profitFactor", profitFactor === Infinity ? "∞" : profitFactor.toFixed(2));
  setText("maxDrawdown", money(maxDrawdown));
  setText("streak", streak > 0 ? `+${streak}` : String(streak));
  setText("consistencyScore", calculateConsistencyScore(closed).toFixed(1) + "%");
  setText("monthCount", monthCount);

  const winEl = $("winRate");
  if (winEl) winEl.className = winRate >= 50 ? "value-positive" : winRate > 0 ? "value-neutral" : "value-negative";

  const profitEl = $("netProfit");
  if (profitEl) profitEl.className = netProfit > 0 ? "value-positive" : netProfit < 0 ? "value-negative" : "value-neutral";

  applyConsistencyClass($("consistencyScore"), calculateConsistencyScore(closed));
  updateAccountPanel();
}

function updateAccountPanel() {
  const account = getSelectedAccount();

  if (account) {
    const starting = Number(account.startingBalance) || 0;
    const current = Number(account.currentBalance) || 0;
    setText("accountStartingBalance", money(starting));
    setText("accountCurrentBalance", money(current));
    setText("accountRiskSetting", `${Number(account.riskPercent || 0).toFixed(2)}%`);
    const score = calculateConsistencyScore(trades.filter(t => t.accountId === account.id));
    setText("accountConsistency", score.toFixed(1) + "%");
    setText("accountPnL", signedMoney(current - starting));
    applyConsistencyClass($("accountConsistency"), score);
  } else {
    const starting = Object.values(accounts).reduce((s, a) => s + (Number(a.startingBalance) || 0), 0);
    const current = Object.values(accounts).reduce((s, a) => s + (Number(a.currentBalance) || 0), 0);
    setText("accountStartingBalance", money(starting));
    setText("accountCurrentBalance", money(current));
    setText("accountRiskSetting", "Multiple");
    const score = calculateConsistencyScore(trades.filter(t => t.status === "Closed"));
    setText("accountConsistency", score.toFixed(1) + "%");
    setText("accountPnL", signedMoney(current - starting));
    applyConsistencyClass($("accountConsistency"), score);
  }
}

/* ==========================================================
   RECENT PENDING
   ========================================================== */

function loadRecentTrades() {
  const container = $("recentTrades");
  if (!container) return;

  const pending = getFilteredTrades()
    .filter(t => t.status === "Pending")
    .slice(0, 4);

  if (!pending.length) {
    container.innerHTML = `<div style="padding:12px 0;color:var(--text-secondary);">No pending trades.</div>`;
    return;
  }

  container.innerHTML = pending.map(t => {
    const account = getAccount(t.accountId);
    return `
      <div class="trade-row">
        <div>
          <strong>${escapeHtml(t.pair || "?")}</strong><br>
          <span style="font-size:12px;color:var(--text-secondary);">${escapeHtml(t.direction || "")}</span>
        </div>
        <div>${escapeHtml(account?.name || t.account || "-")}</div>
        <div>${escapeHtml(t.entryModel || "-")}</div>
        <div><span class="status pending">Pending</span></div>
        <div>
          <button onclick="window.location.href='/journal?edit=${encodeURIComponent(t.id)}'" class="btn">Edit</button>
          <button onclick="closeTrade('${String(t.id).replaceAll("'", "\\'")}')" class="btn">Close</button>
        </div>
      </div>`;
  }).join("");
}

/* ==========================================================
   CHARTS
   ========================================================== */

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

function initializeCharts() {
  if (typeof Chart === "undefined") return;
  destroyAllCharts();
  buildEquityChart();
  buildMonthlyChart();
}

function buildEquityChart() {
  const canvas = $("equityChart");
  if (!canvas) return;

  const closed = getFilteredTrades()
    .filter(t => t.status === "Closed")
    .sort((a, b) => new Date(a.closed || a.date) - new Date(b.closed || b.date));

  const account = getSelectedAccount();
  let balance = account
    ? Number(account.startingBalance) || 0
    : Object.values(accounts).reduce((s, a) => s + (Number(a.startingBalance) || 0), 0);

  const data = [balance];
  closed.forEach(t => {
    balance += (Number(t.profit) || 0) - (Number(t.commission) || 0);
    data.push(balance);
  });

  equityChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: data.map((_, i) => i === 0 ? "Start" : i),
      datasets: [{
        label: "Equity",
        data,
        borderColor: "#4f7cff",
        backgroundColor: "rgba(79,124,255,0.15)",
        fill: true,
        tension: 0.3
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function buildMonthlyChart() {
  const canvas = $("monthlyChart");
  if (!canvas) return;

  const monthly = {};

  getFilteredTrades()
    .filter(t => t.status === "Closed")
    .forEach(t => {
      const d = new Date(t.closed || t.date);
      if (Number.isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key]) {
        monthly[key] = {
          label: d.toLocaleString("default", { month: "short", year: "numeric" }),
          value: 0
        };
      }

      monthly[key].value += (Number(t.profit) || 0) - (Number(t.commission) || 0);
    });

  const keys = Object.keys(monthly).sort();

  monthlyChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: keys.map(k => monthly[k].label),
      datasets: [{
        label: "Monthly P&L",
        data: keys.map(k => monthly[k].value),
        backgroundColor: "#4f7cff",
        borderRadius: 6
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
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
  renderAccountManager();
}

/* ==========================================================
   EVENT SETUP
   ========================================================== */

function setupJournal() {
  loadAccounts();
  loadTrades();

  const form = $("tradeForm");
  form?.addEventListener("submit", saveTrade);

  $("tradeAccount")?.addEventListener("change", updateTradeAccountInfo);

  $("accountFilter")?.addEventListener("change", () => {
    selectedAccountId = val("accountFilter") || "all";
    if (selectedAccountId !== "all" && accounts[selectedAccountId]) {
      setValue("tradeAccount", selectedAccountId);
      updateTradeAccountInfo();
    }
    calculateStatistics();
    loadRecentTrades();
    initializeCharts();
  });

  ["pair", "entry", "stopLoss", "takeProfit", "lotSize", "balance"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", calculateAll);
    el.addEventListener("change", calculateAll);
  });

  $("entryModel")?.addEventListener("change", syncEntryModelInput);

  $("addAccountBtn")?.addEventListener("click", () => openAccountModal());
  $("closeAccountModal")?.addEventListener("click", closeAccountModal);
  $("cancelAccountBtn")?.addEventListener("click", () => {
    clearAccountForm();
  });
  $("accountForm")?.addEventListener("submit", createAccountFromForm);

  $("accountModal")?.addEventListener("click", e => {
    if (e.target === $("accountModal")) closeAccountModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeAccountModal();
  });

  $("logoutBtn")?.addEventListener("click", async () => {
    if (!confirm("Logout?")) return;
    try {
      await signOut(auth);
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  });

  window.addEventListener("storage", e => {
    if (e.key === STORAGE_KEY || e.key === ACCOUNTS_KEY) refreshUI();
  });

  const reset = form?.querySelector('button[type="reset"]');
  reset?.addEventListener("click", () => {
    setTimeout(() => {
      editingTradeId = null;
      const flag = $("updateMode");
      if (flag) flag.remove();

      const button = $("saveTradeBtn");
      if (button) {
        button.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Trade';
        button.classList.remove("btn-update");
        button.classList.add("btn-primary");
      }

      const first = Object.values(accounts)[0];
      if (first) setValue("tradeAccount", first.id);
      setValue("tradeDate", new Date().toISOString().slice(0, 10));
      syncEntryModelInput();
      updateTradeAccountInfo();
      calculateAll();
    }, 0);
  });

  const scrollBtn = $("scrollTopBtn");
  if (scrollBtn) {
    window.addEventListener("scroll", () =>
      scrollBtn.classList.toggle("visible", window.scrollY > 300)
    );
    scrollBtn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }

  populateAccountSelectors();

  /* Edit is resolved only after selectors/options exist. */
  const editId = new URLSearchParams(window.location.search).get("edit");

  if (editId) {
    const found = trades.find(t => String(t.id) === String(editId));

    if (!found) {
      alert("The selected trade could not be found.");
    } else {
      populateForm(found);
    }
  } else {
    setValue("tradeDate", val("tradeDate") || new Date().toISOString().slice(0, 10));
    updateTradeAccountInfo();
    calculateAll();
  }

  refreshUI();
}

/* ==========================================================
   PREMIUM LOCK
   ========================================================== */

function startLock() {
  const container = $("app");
  if (!container) return;

  container.classList.add("loading");

  onAuthStateChanged(auth, async user => {
    if (!user) {
      container.classList.remove("loading");
      container.classList.add("locked");
      return;
    }

    currentUser = user;

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) throw new Error("User account not found");

      const data = snap.data();
      const allowed =
        (data.role || "member") === "admin" ||
        (data.membership || "free") === "premium";

      container.classList.remove("loading");

      if (!allowed) {
        container.classList.add("locked");
        return;
      }

      container.classList.remove("locked");
      setupJournal();
    } catch (error) {
      console.error("Journal access error:", error);
      container.classList.remove("loading");
      container.classList.add("locked");
    }
  });
}

if ($("app")) {
  startLock();
} else {
  document.addEventListener("DOMContentLoaded", startLock);
}

console.log("✅ GTRADES-AXIS rebuilt journal engine loaded.");
