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

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const STORAGE_KEY = "trades";
const ACCOUNTS_KEY = "gtrades_axis_accounts";

let currentUser = null;
let trades = [];
let accounts = {};
let selectedAccountId = "all";
let editingTradeId = null;
let equityChartInstance = null;
let monthlyChartInstance = null;
let editTradeLoaded = false;

const $ = id => document.getElementById(id);

function val(id) {
  const el = $(id);
  return el ? String(el.value ?? "") : "";
}
function num(id) {
  const n = parseFloat(val(id));
  return Number.isFinite(n) ? n : 0;
}
function setValue(id, value) {
  const el = $(id);
  if (el) el.value = value ?? "";
}
function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value ?? "";
}
function isChecked(id) { return !!$(id)?.checked; }
function money(v) {
  const n = Number(v) || 0;
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function signedMoney(v) {
  const n = Number(v) || 0;
  return (n >= 0 ? "+" : "-") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function escapeHtml(v) {
  return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function normalizeResult(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "win") return "Win";
  if (s === "loss") return "Loss";
  if (["breakeven", "break even", "break-even", "be"].includes(s)) return "Breakeven";
  return "Pending";
}
function normalizeStatus(t) {
  return String(t?.status || "").toLowerCase() === "closed" || normalizeResult(t?.result) !== "Pending" ? "Closed" : "Pending";
}

/* ==========================================================
   ACCOUNTS
   ========================================================== */
function loadAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    accounts = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { accounts = {}; }

  Object.keys(accounts).forEach(id => {
    const a = accounts[id];
    if (!a || !a.id || !a.name) delete accounts[id];
    else {
      a.startingBalance = Number(a.startingBalance) || 0;
      a.currentBalance = Number.isFinite(Number(a.currentBalance)) ? Number(a.currentBalance) : a.startingBalance;
      a.riskPercent = Number(a.riskPercent) || 0;
      a.currency = String(a.currency || "USD").toUpperCase();
    }
  });
}
function saveAccounts() { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); }
function getAccount(id) { return id ? accounts[id] || null : null; }
function getSelectedAccount() { return selectedAccountId === "all" ? null : getAccount(selectedAccountId); }

function populateAccountSelectors(preferredId = null) {
  const filter = $("accountFilter");
  const select = $("tradeAccount");
  const list = Object.values(accounts);

  if (filter) {
    filter.innerHTML = '<option value="all">All Accounts</option>';
    list.forEach(a => {
      const o = document.createElement("option");
      o.value = a.id; o.textContent = a.name; filter.appendChild(o);
    });
    if (selectedAccountId !== "all" && !accounts[selectedAccountId]) selectedAccountId = "all";
    filter.value = selectedAccountId;
  }

  if (select) {
    const keep = preferredId || select.value;
    select.innerHTML = '<option value="">Select an account</option>';
    list.forEach(a => {
      const o = document.createElement("option");
      o.value = a.id; o.textContent = a.name; select.appendChild(o);
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
  setValue("tradeRiskSetting", `${Number(account.riskPercent).toFixed(2)}%`);
  setValue("currencyDisplay", account.currency);
  if (!editingTradeId) setValue("balance", account.currentBalance);
  calculateAll();
}

function clearAccountForm() {
  $("accountForm")?.reset();
  setValue("editingAccountId", "");
  setValue("newAccountCurrency", "USD");
  setValue("newAccountRisk", "1");
  setText("accountModalTitle", "Manage Trading Accounts");
  const b = $("accountSubmitBtn");
  if (b) b.innerHTML = '<i class="fa-solid fa-plus"></i> Create Account';
}
function closeAccountModal() {
  const m = $("accountModal");
  if (!m) return;
  m.classList.remove("active");
  m.setAttribute("aria-hidden", "true");
}
function openAccountModal(id = null) {
  const m = $("accountModal");
  if (!m) return;
  m.classList.add("active");
  m.setAttribute("aria-hidden", "false");
  if (id && accounts[id]) {
    const a = accounts[id];
    setValue("editingAccountId", a.id);
    setValue("newAccountName", a.name);
    setValue("newAccountType", a.type || "Other");
    setValue("newAccountBalance", a.startingBalance);
    setValue("newAccountRisk", a.riskPercent);
    setValue("newAccountCurrency", a.currency || "USD");
    setText("accountModalTitle", "Edit Trading Account");
    const b = $("accountSubmitBtn");
    if (b) b.innerHTML = '<i class="fa-solid fa-pen"></i> Update Account';
  } else clearAccountForm();
  renderAccountManager();
}
function renderAccountManager() {
  const c = $("accountManagerList");
  if (!c) return;
  const list = Object.values(accounts);
  if (!list.length) {
    c.innerHTML = '<div class="account-empty">No accounts yet. Create your first trading account below.</div>';
    return;
  }
  c.innerHTML = list.map(a => `
    <div class="account-manager-item">
      <div class="account-manager-main">
        <div class="account-manager-name">${escapeHtml(a.name)}</div>
        <div class="account-manager-meta">${escapeHtml(a.type || "Other")} • ${escapeHtml(a.currency || "USD")} • Starting ${money(a.startingBalance)} • Current ${money(a.currentBalance)} • Risk ${Number(a.riskPercent || 0).toFixed(2)}%</div>
      </div>
      <div class="account-manager-actions">
        <button type="button" data-account-edit="${escapeHtml(a.id)}"><i class="fa-solid fa-pen"></i> Edit</button>
        <button type="button" class="delete-account-btn" data-account-delete="${escapeHtml(a.id)}"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>
    </div>`).join("");
  c.querySelectorAll("[data-account-edit]").forEach(b => b.onclick = () => openAccountModal(b.dataset.accountEdit));
  c.querySelectorAll("[data-account-delete]").forEach(b => b.onclick = () => deleteAccount(b.dataset.accountDelete));
}
function createAccountFromForm(e) {
  e.preventDefault();
  const id = val("editingAccountId");
  const name = val("newAccountName").trim();
  const starting = Number(val("newAccountBalance"));
  const risk = Number(val("newAccountRisk"));
  const currency = val("newAccountCurrency").trim().toUpperCase();
  const type = val("newAccountType") || "Other";
  if (!name || !Number.isFinite(starting) || starting < 0 || !Number.isFinite(risk) || risk < 0 || !currency) {
    alert("Please enter valid account details."); return;
  }
  if (id && accounts[id]) {
    const a = accounts[id];
    const pnl = (Number(a.currentBalance) || 0) - (Number(a.startingBalance) || 0);
    a.name = name; a.type = type; a.startingBalance = starting; a.currentBalance = starting + pnl; a.riskPercent = risk; a.currency = currency;
    selectedAccountId = a.id;
  } else {
    const newId = `account-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    accounts[newId] = { id: newId, name, type, startingBalance: starting, currentBalance: starting, riskPercent: risk, currency };
    selectedAccountId = newId;
  }
  saveAccounts();
  populateAccountSelectors(selectedAccountId);
  setValue("tradeAccount", selectedAccountId);
  renderAccountManager(); updateTradeAccountInfo(); calculateStatistics(); updateAccountPanel(); clearAccountForm();
  alert(id ? "✅ Account updated successfully." : "✅ Account added successfully.");
}
function deleteAccount(id) {
  if (!accounts[id]) return;
  if (trades.some(t => t.accountId === id)) return alert("This account has trades attached. Reassign or delete those trades first.");
  if (!confirm(`Delete \"${accounts[id].name}\"?`)) return;
  delete accounts[id];
  if (selectedAccountId === id) selectedAccountId = "all";
  saveAccounts(); populateAccountSelectors(); renderAccountManager(); updateTradeAccountInfo(); calculateStatistics(); updateAccountPanel();
}

/* ==========================================================
   TRADE NORMALIZATION / STORAGE
   ========================================================== */
function normalizeTrade(raw) {
  if (!raw || typeof raw !== "object") return null;
  const info = raw.info || {};
  const ltf = raw.ltf || {};
  const resultObj = raw.result && typeof raw.result === "object" ? raw.result : {};
  const screenshots = raw.screenshots || {};
  const t = {
    ...raw,
    id: raw.id ?? `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    date: raw.date ?? raw.tradeDate ?? info.date ?? info.tradeDate ?? "",
    time: raw.time ?? raw.tradeTime ?? info.time ?? info.tradeTime ?? "",
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
    initialEntry: raw.initialEntry ?? raw.entry ?? raw.execution?.entry ?? 0,
    initialStopLoss: raw.initialStopLoss ?? raw.stopLoss ?? raw.execution?.stopLoss ?? 0,
    initialTakeProfit: raw.initialTakeProfit ?? raw.takeProfit ?? raw.execution?.takeProfit ?? 0,
    initialRiskAmount: raw.initialRiskAmount ?? raw.riskAmount ?? 0,
    initialRR: raw.initialRR ?? raw.plannedRR ?? raw.rr ?? resultObj.plannedRR ?? 0,
    plannedRR: raw.plannedRR ?? raw.initialRR ?? raw.rr ?? resultObj.plannedRR ?? 0,
    rr: raw.rr ?? resultObj.actualRR ?? 0,
    profit: raw.profit ?? resultObj.profit ?? 0,
    commission: raw.commission ?? resultObj.commission ?? 0,
    result: typeof raw.result === "string" ? raw.result : (resultObj.outcome ?? "Pending"),
    confidence: raw.confidence ?? "",
    emotion: raw.emotion ?? "",
    discipline: raw.discipline ?? "",
    patience: raw.patience ?? "",
    tradeSummary: raw.tradeSummary ?? "",
    strengths: raw.strengths ?? "",
    mistakes: raw.mistakes ?? "",
    lessonLearned: raw.lessonLearned ?? "",
    improvementPlan: raw.improvementPlan ?? "",
    beforeChart: raw.beforeChart ?? screenshots.before ?? "",
    duringChart: raw.duringChart ?? screenshots.during ?? "",
    afterChart: raw.afterChart ?? screenshots.after ?? "",
    notes: raw.notes ?? "",
    confluences: raw.confluences || {},
    status: raw.status ?? "Pending",
    created: raw.created ?? raw.createdAt ?? new Date().toISOString(),
    closed: raw.closed ?? null
  };
  t.result = normalizeResult(t.result);
  t.status = normalizeStatus(t);

  /* Migrate legacy RR values to the clean signed setup-RR model. */
  const ie = Number(t.initialEntry ?? t.entry) || 0;
  const isl = Number(t.initialStopLoss ?? t.stopLoss) || 0;
  const itp = Number(t.initialTakeProfit ?? t.takeProfit) || 0;
  const derivedRR = ie && isl && itp && Math.abs(ie - isl) > 0
    ? Math.abs(itp - ie) / Math.abs(ie - isl)
    : Number(t.initialRR ?? t.plannedRR ?? t.rr) || 0;
  t.initialEntry = ie;
  t.initialStopLoss = isl;
  t.initialTakeProfit = itp;
  t.initialRR = derivedRR;
  t.plannedRR = derivedRR;
  if (t.status === "Closed") {
    t.rr = t.result === "Win" ? Math.abs(derivedRR) : t.result === "Loss" ? -Math.abs(derivedRR) : 0;
  } else {
    t.rr = derivedRR;
  }

  if (!t.accountId && t.account) {
    const found = Object.values(accounts).find(a => String(a.name).trim().toLowerCase() === String(t.account).trim().toLowerCase());
    if (found) t.accountId = found.id;
  }
  return t;
}
function loadTrades() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    trades = Array.isArray(parsed) ? parsed.map(normalizeTrade).filter(Boolean) : [];
  } catch { trades = []; }
  let changed = false;
  const rawBefore = localStorage.getItem(STORAGE_KEY) || "";
  const normalizedSnapshot = JSON.stringify(trades);
  trades.forEach(t => {
    if (!t.accountId && t.account) {
      const a = Object.values(accounts).find(x => String(x.name).trim().toLowerCase() === String(t.account).trim().toLowerCase());
      if (a) { t.accountId = a.id; changed = true; }
    }
  });
  if (changed || normalizedSnapshot !== JSON.stringify(trades)) saveTrades();
}
function saveTrades() { localStorage.setItem(STORAGE_KEY, JSON.stringify(trades)); }

/* ==========================================================
   PAIR-AWARE CALCULATIONS
   ========================================================== */
function getPipInfo(pair, price = 0, accountCurrency = "USD") {
  const s = String(pair || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const px = Number(price) || 0;
  const currency = String(accountCurrency || "USD").toUpperCase();

  if (["XAUUSD", "GOLD"].includes(s)) return { pipSize: 0.01, pipValue: 1, basis: "XAUUSD • 100 oz lot" };
  if (["XAGUSD", "SILVER"].includes(s)) return { pipSize: 0.001, pipValue: 5, basis: "XAGUSD • 5,000 oz lot" };
  if (/^(US30|USA30|DOW|DJI|US100|NAS100|NDX|US500|SPX|SPX500|GER30|DAX|DE30|UK100|FTSE|FRA40|CAC|EUR50|STOXX|JPN225|NIKKEI|AUS200|ASX|HK50|HANG|STI)$/.test(s)) return { pipSize: 1, pipValue: 1, basis: "index point • broker dependent" };
  if (/^(BTC|ETH|SOL|XRP|ADA|DOT|LINK|UNI|AVAX|MATIC|LTC|BCH|DOGE|BNB|XLM|TRX|ETC|XMR|EOS|AAVE|MKR|CRV|LDO|NEAR|ATOM|FIL|ICP|ALGO|SUI|APT)(USD|USDT)?$/.test(s)) return { pipSize: 1, pipValue: 1, basis: "crypto point • broker dependent" };

  if (/^[A-Z]{6}$/.test(s)) {
    const base = s.slice(0,3), quote = s.slice(3,6);
    const pipSize = quote === "JPY" ? 0.01 : 0.0001;

    if (currency === quote) return { pipSize, pipValue: quote === "JPY" ? 1000 : 10, basis: "100,000 FX units" };
    if (quote === "USD" && currency === "USD") return { pipSize, pipValue: 10, basis: "100,000 FX units" };

    /* USD account + USDJPY. */
    if (base === "USD" && quote === "JPY" && currency === "USD" && px > 0) return { pipSize, pipValue: 1000 / px, basis: "USDJPY • 100,000 units" };

    /* JPY crosses need USDJPY conversion. If unavailable, use the pair price
       only as a broker-independent fallback and clearly expose the basis. */
    if (quote === "JPY" && currency === "USD" && px > 0) {
      const usdJpy = Number(window.GTRADES_USDJPY_RATE) || 0;
      if (usdJpy > 0) return { pipSize, pipValue: 1000 / usdJpy, basis: "JPY cross • USDJPY conversion" };
      return { pipSize, pipValue: 1000 / px, basis: "JPY cross • USDJPY conversion unavailable" };
    }

    /* Non-USD quote crosses: 10 quote-currency units per pip per lot.
       Without an FX conversion feed, this is the cleanest deterministic value. */
    return { pipSize, pipValue: 10, basis: `${base}/${quote} • quote conversion required for exact ${currency} value` };
  }

  return { pipSize: 0.0001, pipValue: 10, basis: "fallback" };
}
function getPipInfoForForm() {
  const account = getAccount(val("tradeAccount"));
  return getPipInfo(val("pair") || "EURUSD", num("entry"), account?.currency || "USD");
}

function calculateAll() {
  const account = getAccount(val("tradeAccount"));
  const balance = Number(val("balance")) || Number(account?.currentBalance) || 0;
  const entry = num("entry"), sl = num("stopLoss"), tp = num("takeProfit"), lots = num("lotSize");
  const info = getPipInfoForForm();
  const slDistance = entry && sl ? Math.abs(entry - sl) : 0;
  const tpDistance = entry && tp ? Math.abs(tp - entry) : 0;
  const slPips = info.pipSize ? slDistance / info.pipSize : 0;
  const tpPips = info.pipSize ? tpDistance / info.pipSize : 0;
  const riskAmount = slPips * info.pipValue * lots;
  const reward = tpPips * info.pipValue * lots;
  const riskPercent = balance > 0 ? riskAmount / balance * 100 : 0;
  const plannedRR = slDistance > 0 ? tpDistance / slDistance : 0;

  let displayedRR = plannedRR;
  if (editingTradeId) {
    const existing = trades.find(t => String(t.id) === String(editingTradeId));
    if (existing?.status === "Closed") displayedRR = Number(existing.rr) || 0;
  }

  const riskSetting = balance * (Number(account?.riskPercent) || 0) / 100;
  setValue("tradeAccountBalance", account ? money(account.currentBalance) : "");
  setValue("tradeRiskSetting", account ? `${Number(account.riskPercent).toFixed(2)}%` : "");
  setValue("currencyDisplay", account?.currency || "");
  setValue("pipValueDisplay", `$${info.pipValue.toFixed(2)} / lot${info.basis ? ` • ${info.basis}` : ""}`);
  setValue("riskSettingAmount", riskSetting > 0 ? riskSetting.toFixed(2) : "");
  setValue("riskAmount", riskAmount > 0 ? riskAmount.toFixed(2) : "");
  setValue("risk", riskAmount > 0 ? riskPercent.toFixed(2) : "");
  setValue("rr", displayedRR ? displayedRR.toFixed(2) : "");
  setValue("potentialProfit", reward > 0 ? reward.toFixed(2) : "");
  setValue("potentialLoss", riskAmount > 0 ? riskAmount.toFixed(2) : "");
  setText("summaryRiskSetting", money(riskSetting));
  setText("summaryRiskAmount", money(riskAmount));
  setText("summaryRiskPercent", riskAmount > 0 ? `${riskPercent.toFixed(2)}%` : "0.00%");
  setText("summaryPotentialProfit", money(reward));
  setText("summaryPotentialLoss", money(riskAmount));
  setText("summaryRR", displayedRR ? displayedRR.toFixed(2) : "0.00");
  return { info, slDistance, tpDistance, slPips, tpPips, riskAmount, reward, riskPercent, plannedRR, displayedRR, balance };
}

/* ==========================================================
   FORM / TRADE SCHEMA
   ========================================================== */
const CONFLUENCE_MAP = {
  htfSwing:"confHTFSwing", htfInternal:"confHTFInternal", mtfSwing:"confMTFSwing", mtfInternal:"confMTFInternal",
  htfDemand:"confHTFDemand", htfSupply:"confHTFSupply", mtfDemand:"confMTFDemand", mtfSupply:"confMTFSupply",
  premium:"confPremium", discount:"confDiscount", sweep:"confSweep", choch:"confChoch", bos:"confBos", mitigation:"confMitigation", refined:"confRefined", extreme:"confExtreme"
};
function getEntryModelValue() {
  const s = $("entryModel"), c = $("entryModelCustom");
  if (!s) return "";
  return s.value === "__custom__" ? String(c?.value || "").trim() : s.value;
}
function syncEntryModelInput() {
  const s = $("entryModel"), c = $("entryModelCustom");
  if (!s || !c) return;
  const custom = s.value === "__custom__";
  c.style.display = custom ? "block" : "none";
  c.required = custom;
  if (!custom) c.value = "";
}
function ensureSelectValue(el, value) {
  if (!el || value === undefined || value === null || value === "") return;
  const s = String(value);
  if (![...el.options].some(o => o.value === s)) {
    const o = document.createElement("option"); o.value = s; o.textContent = s; el.appendChild(o);
  }
}
function setField(id, value) {
  const el = $(id); if (!el || value === undefined || value === null) return;
  if (el.tagName === "SELECT") ensureSelectValue(el, value);
  el.value = String(value);
}
function buildTradeFromForm(existing = null) {
  const calc = calculateAll();
  const result = normalizeResult(val("result"));
  let profit = num("profit");
  if (result === "Loss" && profit > 0) profit = -profit;
  const accountId = val("tradeAccount");
  const account = getAccount(accountId);

  const preserveOriginal = existing?.status === "Closed";
  const initialEntry = preserveOriginal ? Number(existing.initialEntry ?? existing.entry) || 0 : num("entry");
  const initialSL = preserveOriginal ? Number(existing.initialStopLoss ?? existing.stopLoss) || 0 : num("stopLoss");
  const initialTP = preserveOriginal ? Number(existing.initialTakeProfit ?? existing.takeProfit) || 0 : num("takeProfit");
  const initialRisk = preserveOriginal ? Number(existing.initialRiskAmount ?? existing.riskAmount) || 0 : calc.riskAmount;
  const initialRR = preserveOriginal ? Number(existing.initialRR ?? existing.plannedRR) || 0 : calc.plannedRR;

  /* Result RR is the original setup RR signed by outcome.
     It never changes when the trader later moves SL to BE. */
  const resultRR = result === "Win" ? Math.abs(initialRR) : result === "Loss" ? -Math.abs(initialRR) : 0;

  return {
    ...(existing || {}),
    id: existing?.id || `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    accountId, account: account?.name || existing?.account || "",
    date: val("tradeDate"), time: val("tradeTime"), pair: val("pair"), direction: val("direction"), session: val("session"), broker: val("broker"), lotSize: num("lotSize"),
    htfSwing: val("htfSwing"), htfInternal: val("htfInternal"), mtfSwing: val("mtfSwing"), mtfInternal: val("mtfInternal"),
    ltfStructure: val("ltfStructure"), liquidity: val("liquidity"), poi: val("poi"), entryModel: getEntryModelValue(), entryConfirmation: val("entryConfirmation"), tradeValid: val("tradeValid"),
    confluences: Object.fromEntries(Object.entries(CONFLUENCE_MAP).map(([k,id]) => [k,isChecked(id)])),
    entry: num("entry"), stopLoss: num("stopLoss"), takeProfit: num("takeProfit"),
    balance: calc.balance, riskSettingAmount: Number(getAccount(accountId)?.currentBalance || calc.balance) * (Number(getAccount(accountId)?.riskPercent) || 0) / 100,
    riskAmount: calc.riskAmount, risk: calc.riskPercent, potentialProfit: calc.reward, potentialLoss: calc.riskAmount,
    initialEntry, initialStopLoss: initialSL, initialTakeProfit: initialTP, initialRiskAmount: initialRisk, initialRR, plannedRR: initialRR, rr: resultRR,
    profit, commission: num("commission"), result, status: result === "Pending" ? "Pending" : "Closed",
    confidence: val("confidence"), emotion: val("emotion"), discipline: val("discipline"), patience: val("patience"),
    tradeSummary: val("tradeSummary"), strengths: val("strengths"), mistakes: val("mistakes"), lessonLearned: val("lessonLearned"), improvementPlan: val("improvementPlan"),
    beforeChart: val("beforeChart"), duringChart: val("duringChart"), afterChart: val("afterChart"), notes: val("notes"),
    created: existing?.created || new Date().toISOString(),
    closed: result === "Pending" ? null : (existing?.closed || new Date().toISOString())
  };
}

/* ==========================================================
   EDIT — DO NOT RESET AFTER POPULATION
   ========================================================== */
function populateForm(trade) {
  if (!trade) return;
  editTradeLoaded = false;

  const map = {
    tradeDate: trade.date, tradeTime: trade.time, pair: trade.pair, direction: trade.direction, session: trade.session, broker: trade.broker,
    lotSize: trade.lotSize, htfSwing: trade.htfSwing, htfInternal: trade.htfInternal, mtfSwing: trade.mtfSwing, mtfInternal: trade.mtfInternal,
    ltfStructure: trade.ltfStructure, liquidity: trade.liquidity, poi: trade.poi, entryConfirmation: trade.entryConfirmation, tradeValid: trade.tradeValid,
    entry: trade.entry, stopLoss: trade.stopLoss, takeProfit: trade.takeProfit, balance: trade.balance, riskSettingAmount: trade.riskSettingAmount,
    riskAmount: trade.riskAmount, risk: trade.risk, potentialProfit: trade.potentialProfit, potentialLoss: trade.potentialLoss,
    profit: trade.profit, commission: trade.commission, result: trade.result, confidence: trade.confidence, emotion: trade.emotion, discipline: trade.discipline, patience: trade.patience,
    tradeSummary: trade.tradeSummary, strengths: trade.strengths, mistakes: trade.mistakes, lessonLearned: trade.lessonLearned, improvementPlan: trade.improvementPlan,
    beforeChart: trade.beforeChart, duringChart: trade.duringChart, afterChart: trade.afterChart, notes: trade.notes
  };
  Object.entries(map).forEach(([id,v]) => setField(id,v));

  let accountId = trade.accountId && accounts[trade.accountId] ? trade.accountId : "";
  if (!accountId && trade.account) {
    const found = Object.values(accounts).find(a => String(a.name).trim().toLowerCase() === String(trade.account).trim().toLowerCase());
    if (found) accountId = found.id;
  }
  if (accountId) setValue("tradeAccount", accountId);

  const entrySelect = $("entryModel"), custom = $("entryModelCustom");
  if (entrySelect) {
    const saved = String(trade.entryModel || "");
    const builtIn = [...entrySelect.options].some(o => o.value === saved && o.value !== "__custom__");
    if (builtIn) { entrySelect.value = saved; if (custom) custom.value = ""; }
    else if (saved) { entrySelect.value = "__custom__"; if (custom) custom.value = saved; }
    syncEntryModelInput();
  }

  Object.values(CONFLUENCE_MAP).forEach(id => { if ($(id)) $(id).checked = false; });
  Object.entries(CONFLUENCE_MAP).forEach(([key,id]) => { if ($(id)) $(id).checked = trade.confluences?.[key] === true; });

  editingTradeId = String(trade.id);
  const button = $("saveTradeBtn");
  if (button) { button.innerHTML = '<i class="fa-solid fa-pen"></i> Update Trade'; button.classList.remove("btn-primary"); button.classList.add("btn-update"); }
  const h = document.querySelector(".page-header h1"); if (h) h.innerHTML = '<i class="fa-solid fa-pen"></i> Edit Trade';
  const p = document.querySelector(".page-header p"); if (p) p.textContent = "Modify trade details and save changes.";

  updateTradeAccountInfo();
  calculateAll();
  /* Re-apply the two values that account calculation intentionally protects. */
  setValue("tradeDate", trade.date || "");
  setValue("tradeTime", trade.time || "");
  setValue("result", trade.result || "Pending");
  setValue("profit", trade.profit ?? 0);
  setValue("commission", trade.commission ?? 0);
  calculateAll();
  editTradeLoaded = true;
}

/* ==========================================================
   BALANCE + SAVE
   ========================================================== */
function netOf(t) { return t && t.status === "Closed" ? (Number(t.profit)||0) - (Number(t.commission)||0) : 0; }
function applyBalanceDelta(accountId, oldTrade, newTrade) {
  const a = getAccount(accountId); if (!a) return;
  a.currentBalance = (Number(a.currentBalance)||0) + netOf(newTrade) - netOf(oldTrade);
}
function saveTrade(e) {
  e.preventDefault();
  const existing = editingTradeId ? trades.find(t => String(t.id) === String(editingTradeId)) : null;
  if (editingTradeId && !existing) return alert("❌ The selected trade could not be found.");
  if (!val("tradeDate")) return alert("Please select a date.");
  if (!getAccount(val("tradeAccount"))) return alert("Please select a trading account.");

  const updated = buildTradeFromForm(existing);
  if (existing) {
    if (existing.accountId !== updated.accountId) {
      applyBalanceDelta(existing.accountId, existing, null);
      applyBalanceDelta(updated.accountId, null, updated);
    } else applyBalanceDelta(updated.accountId, existing, updated);
    const index = trades.findIndex(t => String(t.id) === String(existing.id));
    if (index >= 0) trades[index] = updated;
  } else {
    trades.unshift(updated);
    applyBalanceDelta(updated.accountId, null, updated);
  }

  saveTrades(); saveAccounts();
  const wasEdit = !!existing;
  editingTradeId = null; editTradeLoaded = false;
  $("updateMode")?.remove();
  if (wasEdit) {
    window.location.href = `/history?updated=${encodeURIComponent(updated.id)}`;
    return;
  }
  e.target.reset();
  populateAccountSelectors();
  const first = Object.values(accounts)[0]; if (first) setValue("tradeAccount", first.id);
  setValue("tradeDate", new Date().toISOString().slice(0,10));
  updateTradeAccountInfo(); calculateAll(); refreshUI();
  alert(`✅ Trade saved as ${updated.result}.`);
}

/* ==========================================================
   CLOSE TRADE
   ========================================================== */
window.closeTrade = function(id) {
  const trade = trades.find(t => String(t.id) === String(id));
  if (!trade) return;
  if (trade.status === "Closed") { window.location.href = `/journal?edit=${encodeURIComponent(trade.id)}`; return; }
  const outcome = prompt("Result?\n\nWin\nLoss\nBreakeven", "Win");
  if (outcome === null) return;
  const result = normalizeResult(outcome);
  if (result === "Pending") return alert("Use Win, Loss, or Breakeven.");
  const pInput = prompt("Profit/Loss ($)", "0"); if (pInput === null) return;
  const cInput = prompt("Commission ($)", "0"); if (cInput === null) return;
  let profit = Number(pInput) || 0; const commission = Number(cInput) || 0;
  if (result === "Loss" && profit > 0) profit = -profit;

  const oldTrade = { ...trade };
  const initialEntry = Number(trade.initialEntry ?? trade.entry) || 0;
  const initialSL = Number(trade.initialStopLoss ?? trade.stopLoss) || 0;
  const initialTP = Number(trade.initialTakeProfit ?? trade.takeProfit) || 0;
  const initialRisk = Number(trade.initialRiskAmount ?? trade.riskAmount) || 0;
  const initialRR = Number(trade.initialRR ?? trade.plannedRR) || (initialEntry && initialSL ? Math.abs(initialTP-initialEntry)/Math.abs(initialEntry-initialSL) : 0);

  trade.status = "Closed"; trade.result = result; trade.profit = profit; trade.commission = commission; trade.closed = new Date().toISOString();
  trade.initialEntry = initialEntry; trade.initialStopLoss = initialSL; trade.initialTakeProfit = initialTP; trade.initialRiskAmount = initialRisk; trade.initialRR = initialRR; trade.plannedRR = initialRR;
  trade.rr = result === "Win" ? Math.abs(initialRR) : result === "Loss" ? -Math.abs(initialRR) : 0;

  applyBalanceDelta(trade.accountId, oldTrade, trade);
  saveTrades(); saveAccounts(); refreshUI();
  alert(`✅ Trade closed successfully.\n\nAccount: ${getAccount(trade.accountId)?.name || trade.account || "-"}\nNet P/L: ${signedMoney(profit - commission)}\nRR: ${trade.rr.toFixed(2)}R`);
};
window.viewTrade = function(trade) {
  const t = typeof trade === "string" ? trades.find(x => String(x.id) === String(trade)) : trade;
  if (!t) return;
  alert(`PAIR          : ${t.pair || "-"}\nACCOUNT       : ${getAccount(t.accountId)?.name || t.account || "-"}\nSTATUS        : ${t.status}\nRESULT        : ${t.result}\nPROFIT        : ${money(t.profit)}\nCOMMISSION    : ${money(t.commission)}\nNET P/L       : ${signedMoney(netOf(t))}\nRISK AMOUNT   : ${money(t.initialRiskAmount ?? t.riskAmount)}\nREALISED RR   : ${Number(t.rr || 0).toFixed(2)}R\nPLANNED RR    : ${Number(t.plannedRR ?? 0).toFixed(2)}R\nLESSON        : ${t.lessonLearned || "-"}\nIMPROVEMENT   : ${t.improvementPlan || "-"}`);
};

/* ==========================================================
   STATISTICS / UI
   ========================================================== */
function getFilteredTrades() { return selectedAccountId === "all" ? [...trades] : trades.filter(t => t.accountId === selectedAccountId); }
function calculateConsistencyScore(closed) {
  if (!closed.length) return 0;
  const score = {Excellent:10,Good:8,Average:5,Poor:2}; const emotion = {Calm:10,Confident:10,Fear:4,Greed:3,FOMO:2,Revenge:1};
  let total = 0;
  closed.forEach(t => {
    const a = getAccount(t.accountId), planned = Number(a?.riskPercent)||0, actual = Number(t.risk)||0;
    const values = [t.tradeValid === "Yes" ? 10 : 0, score[t.patience] ?? 5, score[t.discipline] ?? 5, emotion[t.emotion] ?? 5, planned<=0||actual<=planned?10:actual<=planned*1.25?6:2, Number(t.initialStopLoss??t.stopLoss)!==0&&Number(t.initialTakeProfit??t.takeProfit)!==0?10:3, [t.tradeSummary,t.lessonLearned,t.improvementPlan].filter(Boolean).length>=2?10:[t.tradeSummary,t.lessonLearned,t.improvementPlan].filter(Boolean).length===1?6:2];
    total += values.reduce((s,v)=>s+v,0)/values.length;
  });
  return Math.max(0,Math.min(100,total/closed.length*10));
}
function applyConsistencyClass(el, score) { if (!el) return; el.classList.remove("consistency-good","consistency-mid","consistency-low"); el.classList.add(score>=80?"consistency-good":score>=60?"consistency-mid":"consistency-low"); }
function calculateStatistics() {
  const all = getFilteredTrades(), closed = all.filter(t=>t.status==="Closed"), wins=closed.filter(t=>normalizeResult(t.result)==="Win"), losses=closed.filter(t=>normalizeResult(t.result)==="Loss"), pending=all.filter(t=>t.status==="Pending");
  const net=closed.reduce((s,t)=>s+netOf(t),0), grossProfit=wins.reduce((s,t)=>s+Math.max(Number(t.profit)||0,0),0), grossLoss=losses.reduce((s,t)=>s+Math.abs(Math.min(Number(t.profit)||0,0)),0);
  const pf=grossLoss>0?grossProfit/grossLoss:grossProfit>0?Infinity:0, avgRR=closed.length?closed.reduce((s,t)=>s+(Number(t.rr)||0),0)/closed.length:0, winRate=closed.length?wins.length/closed.length*100:0;
  const sorted=[...closed].sort((a,b)=>new Date(a.closed||a.date)-new Date(b.closed||b.date)); let streak=0;
  if(sorted.length){const r=normalizeResult(sorted[sorted.length-1].result);for(let i=sorted.length-1;i>=0&&normalizeResult(sorted[i].result)===r;i--) streak += r==="Loss"?-1:1;}
  const starting=selectedAccountId==="all"?Object.values(accounts).reduce((s,a)=>s+(Number(a.startingBalance)||0),0):Number(getSelectedAccount()?.startingBalance)||0;
  let bal=starting,peak=starting,maxDD=0; sorted.forEach(t=>{bal+=netOf(t);peak=Math.max(peak,bal);maxDD=Math.max(maxDD,peak-bal);});
  const monthStart=new Date(new Date().getFullYear(),new Date().getMonth(),1), monthCount=all.filter(t=>t.date&&new Date(t.date)>=monthStart).length, consistency=calculateConsistencyScore(closed);
  setText("totalTrades",all.length);setText("wins",wins.length);setText("losses",losses.length);setText("pendingCount",pending.length);setText("winRate",winRate.toFixed(1)+"%");setText("averageRR",avgRR.toFixed(2));setText("netProfit",signedMoney(net));setText("profitFactor",pf===Infinity?"∞":pf.toFixed(2));setText("maxDrawdown",money(maxDD));setText("streak",streak>0?`+${streak}`:String(streak));setText("consistencyScore",consistency.toFixed(1)+"%");setText("monthCount",monthCount);applyConsistencyClass($("consistencyScore"),consistency);
  const w=$("winRate"),p=$("netProfit");if(w)w.className=winRate>=50?"value-positive":winRate>0?"value-neutral":"value-negative";if(p)p.className=net>0?"value-positive":net<0?"value-negative":"value-neutral";
  updateAccountPanel();
}
function updateAccountPanel() {
  const a=getSelectedAccount();
  if(a){const s=Number(a.startingBalance)||0,c=Number(a.currentBalance)||0,score=calculateConsistencyScore(trades.filter(t=>t.accountId===a.id));setText("accountStartingBalance",money(s));setText("accountCurrentBalance",money(c));setText("accountRiskSetting",`${Number(a.riskPercent||0).toFixed(2)}%`);setText("accountConsistency",score.toFixed(1)+"%");setText("accountPnL",signedMoney(c-s));applyConsistencyClass($("accountConsistency"),score);}
  else {const s=Object.values(accounts).reduce((x,a)=>x+(Number(a.startingBalance)||0),0),c=Object.values(accounts).reduce((x,a)=>x+(Number(a.currentBalance)||0),0),score=calculateConsistencyScore(trades.filter(t=>t.status==="Closed"));setText("accountStartingBalance",money(s));setText("accountCurrentBalance",money(c));setText("accountRiskSetting","Multiple");setText("accountConsistency",score.toFixed(1)+"%");setText("accountPnL",signedMoney(c-s));applyConsistencyClass($("accountConsistency"),score);}
}
function loadRecentTrades(){const c=$("recentTrades");if(!c)return;const pending=getFilteredTrades().filter(t=>t.status==="Pending").slice(0,4);if(!pending.length){c.innerHTML='<div style="padding:12px 0;color:var(--text-secondary);">No pending trades.</div>';return;}c.innerHTML=pending.map(t=>`<div class="trade-row"><div><strong>${escapeHtml(t.pair||"?")}</strong><br><span style="font-size:12px;color:var(--text-secondary);">${escapeHtml(t.direction||"")}</span></div><div>${escapeHtml(getAccount(t.accountId)?.name||t.account||"-")}</div><div>${escapeHtml(t.entryModel||"-")}</div><div><span class="status pending">Pending</span></div><div><button onclick="window.location.href='/journal?edit=${encodeURIComponent(t.id)}'" class="btn">Edit</button><button onclick="closeTrade('${String(t.id).replaceAll("'","\\'")}')" class="btn">Close</button></div></div>`).join("");}

/* ==========================================================
   CHARTS
   ========================================================== */
function destroyAllCharts(){if(equityChartInstance){equityChartInstance.destroy();equityChartInstance=null;}if(monthlyChartInstance){monthlyChartInstance.destroy();monthlyChartInstance=null;}}
function initializeCharts(){if(typeof Chart==="undefined")return;destroyAllCharts();buildEquityChart();buildMonthlyChart();}
function buildEquityChart(){const canvas=$("equityChart");if(!canvas)return;const closed=getFilteredTrades().filter(t=>t.status==="Closed").sort((a,b)=>new Date(a.closed||a.date)-new Date(b.closed||b.date));const a=getSelectedAccount();let bal=a?Number(a.startingBalance)||0:Object.values(accounts).reduce((s,x)=>s+(Number(x.startingBalance)||0),0);const data=[bal];closed.forEach(t=>{bal+=netOf(t);data.push(bal);});equityChartInstance=new Chart(canvas,{type:"line",data:{labels:data.map((_,i)=>i===0?"Start":i),datasets:[{label:"Equity",data,borderColor:"#4f7cff",backgroundColor:"rgba(79,124,255,.15)",fill:true,tension:.3}]},options:{responsive:true,maintainAspectRatio:false}});}
function buildMonthlyChart(){const canvas=$("monthlyChart");if(!canvas)return;const m={};getFilteredTrades().filter(t=>t.status==="Closed").forEach(t=>{const d=new Date(t.closed||t.date);if(Number.isNaN(d.getTime()))return;const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;m[k]??={label:d.toLocaleString("default",{month:"short",year:"numeric"}),value:0};m[k].value+=netOf(t);});const keys=Object.keys(m).sort();monthlyChartInstance=new Chart(canvas,{type:"bar",data:{labels:keys.map(k=>m[k].label),datasets:[{label:"Monthly P&L",data:keys.map(k=>m[k].value),backgroundColor:"#4f7cff",borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false}});}

function refreshUI(){loadAccounts();loadTrades();populateAccountSelectors(editingTradeId?val("tradeAccount"):null);updateTradeAccountInfo();calculateStatistics();loadRecentTrades();initializeCharts();renderAccountManager();}

/* ==========================================================
   INIT
   ========================================================== */
function setupJournal(){
  loadAccounts();loadTrades();populateAccountSelectors();
  const form=$("tradeForm");
  form?.addEventListener("submit",saveTrade);
  $("tradeAccount")?.addEventListener("change",()=>{updateTradeAccountInfo();calculateAll();});
  $("accountFilter")?.addEventListener("change",()=>{selectedAccountId=val("accountFilter")||"all";if(selectedAccountId!=="all"&&accounts[selectedAccountId])setValue("tradeAccount",selectedAccountId);updateTradeAccountInfo();calculateStatistics();loadRecentTrades();initializeCharts();});
  ["pair","entry","stopLoss","takeProfit","lotSize"].forEach(id=>{$(id)?.addEventListener("input",calculateAll);$(id)?.addEventListener("change",calculateAll);});
  $("entryModel")?.addEventListener("change",syncEntryModelInput);
  $("addAccountBtn")?.addEventListener("click",()=>openAccountModal());
  $("closeAccountModal")?.addEventListener("click",closeAccountModal);
  $("cancelAccountBtn")?.addEventListener("click",clearAccountForm);
  $("accountForm")?.addEventListener("submit",createAccountFromForm);
  $("accountModal")?.addEventListener("click",e=>{if(e.target.id==="accountModal")closeAccountModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeAccountModal();});

  const reset=form?.querySelector('button[type="reset"]');
  reset?.addEventListener("click",()=>setTimeout(()=>{editingTradeId=null;editTradeLoaded=false;$("updateMode")?.remove();const b=$("saveTradeBtn");if(b){b.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Save Trade';b.classList.remove("btn-update");b.classList.add("btn-primary");}const first=Object.values(accounts)[0];if(first)setValue("tradeAccount",first.id);setValue("tradeDate",new Date().toISOString().slice(0,10));syncEntryModelInput();updateTradeAccountInfo();calculateAll();},0));
  $("scrollTopBtn")?.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  window.addEventListener("scroll",()=>$("scrollTopBtn")?.classList.toggle("visible",window.scrollY>300));
  window.addEventListener("storage",e=>{if([STORAGE_KEY,ACCOUNTS_KEY].includes(e.key)){loadAccounts();loadTrades();populateAccountSelectors();updateTradeAccountInfo();calculateStatistics();loadRecentTrades();initializeCharts();renderAccountManager();}});

  /* IMPORTANT: edit is resolved LAST, after accounts + selectors exist.
     Nothing calls reset() or refreshUI() after populateForm. */
  const editId=new URLSearchParams(window.location.search).get("edit");
  if(editId){
    const trade=trades.find(t=>String(t.id)===String(editId));
    if(!trade){alert("The selected trade could not be found.");setValue("tradeDate",new Date().toISOString().slice(0,10));updateTradeAccountInfo();calculateAll();}
    else populateForm(trade);
  }else{
    setValue("tradeDate",val("tradeDate")||new Date().toISOString().slice(0,10));
    const first=Object.values(accounts)[0];if(first&&!val("tradeAccount"))setValue("tradeAccount",first.id);
    updateTradeAccountInfo();calculateAll();calculateStatistics();loadRecentTrades();initializeCharts();renderAccountManager();
  }
}

function startLock(){
  const container=$("app");if(!container)return;container.classList.add("loading");
  onAuthStateChanged(auth,async user=>{
    if(!user){container.classList.remove("loading");container.classList.add("locked");return;}
    try{
      currentUser=user;const snap=await getDoc(doc(db,"users",user.uid));if(!snap.exists())throw new Error("User account not found");
      const data=snap.data();const hasPremium=data.role==="admin"||data.membership==="premium";
      container.classList.remove("loading");if(hasPremium){container.classList.remove("locked");setupJournal();}else container.classList.add("locked");
    }catch(e){console.error("Journal access error:",e);container.classList.remove("loading");container.classList.add("locked");}
  });
}

$("logoutBtn")?.addEventListener("click",async()=>{if(!confirm("Logout?"))return;try{await signOut(auth);window.location.reload();}catch(e){console.error(e);}});

if($("app"))startLock();else document.addEventListener("DOMContentLoaded",startLock);
