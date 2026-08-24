/* ==========================================================
   GTRADES-AXIS™ TRADE HISTORY
   Uses the SAME flat "trades" schema and edit route as journal.js.
   ========================================================== */

const STORAGE_KEY = "trades";

let trades = [];
let filteredTrades = [];
let sortKey = "date";
let sortAsc = false;

const $ = id => document.getElementById(id);

function money(v) {
  return "$" + (Number(v) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function signedMoney(v) {
  const n = Number(v) || 0;
  return (n >= 0 ? "+" : "-") + "$" + Math.abs(n).toFixed(2);
}

function normalizeResult(value) {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "win") return "Win";
  if (s === "loss") return "Loss";
  if (s === "breakeven" || s === "break even" || s === "break-even") return "Breakeven";
  return "Pending";
}

function normalizeTrade(raw) {
  if (!raw || typeof raw !== "object") return null;

  const info = raw.info || {};
  const resultObj = raw.result && typeof raw.result === "object" ? raw.result : {};
  const ltf = raw.ltf || {};
  const screenshots = raw.screenshots || {};

  const normalizedResult = normalizeResult(typeof raw.result === "string" ? raw.result : resultObj.outcome);
  const status = String(raw.status || "").toLowerCase() === "closed" || normalizedResult !== "Pending" ? "Closed" : "Pending";
  const initialEntry = Number(raw.initialEntry ?? raw.entry) || 0;
  const initialSL = Number(raw.initialStopLoss ?? raw.stopLoss) || 0;
  const initialTP = Number(raw.initialTakeProfit ?? raw.takeProfit) || 0;
  const setupRR = initialEntry && initialSL && initialTP && Math.abs(initialEntry-initialSL)>0
    ? Math.abs(initialTP-initialEntry) / Math.abs(initialEntry-initialSL)
    : Number(raw.initialRR ?? raw.plannedRR ?? raw.rr) || 0;
  const signedRR = status === "Closed"
    ? (normalizedResult === "Win" ? Math.abs(setupRR) : normalizedResult === "Loss" ? -Math.abs(setupRR) : 0)
    : setupRR;

  return {
    ...raw,
    id: raw.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: raw.date ?? info.date ?? "",
    time: raw.time ?? info.time ?? "",
    pair: raw.pair ?? info.pair ?? "",
    direction: raw.direction ?? info.direction ?? "",
    session: raw.session ?? info.session ?? "",
    broker: raw.broker ?? info.broker ?? "",
    account: raw.account ?? info.account ?? "",
    entryModel: raw.entryModel ?? ltf.model ?? "",
    entry: raw.entry ?? 0,
    stopLoss: raw.stopLoss ?? 0,
    takeProfit: raw.takeProfit ?? 0,
    initialEntry,
    initialStopLoss: Number(raw.initialStopLoss ?? raw.stopLoss) || 0,
    initialTakeProfit: Number(raw.initialTakeProfit ?? raw.takeProfit) || 0,
    initialRR: setupRR,
    plannedRR: setupRR,
    rr: signedRR,
    profit: raw.profit ?? resultObj.profit ?? 0,
    commission: raw.commission ?? resultObj.commission ?? 0,
    result: normalizeResult(typeof raw.result === "string" ? raw.result : resultObj.outcome),
    beforeChart: raw.beforeChart ?? screenshots.before ?? "",
    duringChart: raw.duringChart ?? screenshots.during ?? "",
    afterChart: raw.afterChart ?? screenshots.after ?? "",
    status
  };
}

function loadTrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    trades = Array.isArray(parsed) ? parsed.map(normalizeTrade).filter(Boolean) : [];
  } catch {
    trades = [];
  }
  filteredTrades = [...trades];
}

function saveTrades() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
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

function renderTable() {
  const tbody = $("tradeTableBody");
  if (!tbody) return;

  let data = [...filteredTrades];

  data.sort((a, b) => {
    let A = a[sortKey] ?? "";
    let B = b[sortKey] ?? "";

    if (["profit", "rr", "entry", "stopLoss", "takeProfit", "commission"].includes(sortKey)) {
      A = Number(A) || 0;
      B = Number(B) || 0;
    } else if (sortKey === "date") {
      A = new Date(A).getTime() || 0;
      B = new Date(B).getTime() || 0;
    } else {
      A = String(A).toLowerCase();
      B = String(B).toLowerCase();
    }

    if (A < B) return sortAsc ? -1 : 1;
    if (A > B) return sortAsc ? 1 : -1;
    return 0;
  });

  if (!data.length) {
    tbody.innerHTML = `
      <tr><td colspan="12">
        <div class="empty-state">
          <i class="fa-solid fa-inbox"></i>
          <h3>No trades found</h3>
          <p>Start journaling your trades in the
            <a href="/journal" style="color:var(--accent-blue);text-decoration:none;">Trading Journal</a>.
          </p>
        </div>
      </td></tr>`;
  } else {
    tbody.innerHTML = data.map(t => {
      const profit = Number(t.profit) || 0;
      const commission = Number(t.commission) || 0;
      const result = normalizeResult(t.result);
      const resultClass = result.toLowerCase() === "win"
        ? "win" : result.toLowerCase() === "loss" ? "loss" : "breakeven";
      const directionClass = String(t.direction || "").toLowerCase() === "buy" ? "buy" : "sell";

      const links = [
        ["Before", t.beforeChart],
        ["During", t.duringChart],
        ["After", t.afterChart]
      ].filter(x => x[1]);

      const chartLinks = links.length
        ? links.map(([label, url]) =>
            `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" title="${label}">
              <i class="fa-solid fa-image"></i>${label}
            </a>`).join(" ")
        : '<span class="no-link">—</span>';

      return `
        <tr>
          <td>${formatDate(t.date)}</td>
          <td><strong>${escapeHtml(t.pair || "—")}</strong></td>
          <td><span class="badge-direction ${directionClass}">${escapeHtml(t.direction || "—")}</span></td>
          <td>${t.entry ?? "—"}</td>
          <td>${t.stopLoss ?? "—"}</td>
          <td>${t.takeProfit ?? "—"}</td>
          <td>${Number(t.rr) ? Number(t.rr).toFixed(2) : "—"}</td>
          <td class="trade-profit ${profit > 0 ? "positive" : profit < 0 ? "negative" : "zero"}">${signedMoney(profit)}</td>
          <td>${commission ? money(commission) : "—"}</td>
          <td><span class="badge-result ${resultClass}">${result}</span></td>
          <td><div class="chart-links">${chartLinks}</div></td>
          <td>
            <div class="action-buttons">
              <button class="view-btn" data-id="${escapeHtml(t.id)}" title="View"><i class="fa-regular fa-eye"></i></button>
              <button class="edit-btn" data-id="${escapeHtml(t.id)}" title="Edit"><i class="fa-regular fa-pen-to-square"></i></button>
              <button class="delete-btn" data-id="${escapeHtml(t.id)}" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
            </div>
          </td>
        </tr>`;
    }).join("");
  }

  $("showingCount").textContent = String(data.length);
  $("totalCount").textContent = String(trades.length);

  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const t = trades.find(x => String(x.id) === String(btn.dataset.id));
      if (t) openViewModal(t);
    });
  });

  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = `/journal?edit=${encodeURIComponent(btn.dataset.id)}`;
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("Delete this trade?")) deleteTrade(btn.dataset.id);
    });
  });

  updateStats();
}

function updateStats() {
  const data = filteredTrades;
  const closed = data.filter(t => t.status === "Closed");
  const wins = closed.filter(t => normalizeResult(t.result) === "Win");
  const losses = closed.filter(t => normalizeResult(t.result) === "Loss");

  const net = closed.reduce(
    (s, t) => s + (Number(t.profit) || 0) - (Number(t.commission) || 0), 0
  );

  const rrValues = closed
    .map(t => Number(t.rr) || 0)
    .filter(v => v !== 0);

  const avgRR = rrValues.length
    ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length
    : 0;

  let bestStreak = 0;
  let current = 0;
  let type = "";

  [...closed]
    .sort((a, b) => new Date(a.closed || a.date) - new Date(b.closed || b.date))
    .forEach(t => {
      const r = normalizeResult(t.result);
      if (r === "Win" || r === "Loss") {
        if (r === type) current++;
        else {
          type = r;
          current = 1;
        }
        bestStreak = Math.max(bestStreak, current);
      } else {
        type = "";
        current = 0;
      }
    });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthCount = data.filter(t => t.date && new Date(t.date) >= monthStart).length;

  const winRate = closed.length ? wins.length / closed.length * 100 : 0;

  $("statTotal").textContent = String(data.length);
  $("statWinRate").textContent = winRate.toFixed(1) + "%";
  $("statAvgRR").textContent = avgRR.toFixed(2);
  $("statNetProfit").textContent = signedMoney(net);
  $("statWins").textContent = String(wins.length);
  $("statLosses").textContent = String(losses.length);
  $("statStreak").textContent = String(bestStreak);
  $("statMonth").textContent = String(monthCount);
}

function applyFiltersAndRender() {
  const pair = ($("filterPair")?.value || "").trim().toLowerCase();
  const direction = $("filterDirection")?.value || "";
  const result = $("filterResult")?.value || "";
  const from = $("filterDateFrom")?.value || "";
  const to = $("filterDateTo")?.value || "";

  filteredTrades = trades.filter(t => {
    if (pair && !String(t.pair || "").toLowerCase().includes(pair)) return false;
    if (direction && String(t.direction || "").toUpperCase() !== direction) return false;
    if (result && normalizeResult(t.result) !== result) return false;

    if (from) {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime()) || d < new Date(from)) return false;
    }

    if (to) {
      const d = new Date(t.date);
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (Number.isNaN(d.getTime()) || d > end) return false;
    }

    return true;
  });

  renderTable();
}

function deleteTrade(id) {
  const index = trades.findIndex(t => String(t.id) === String(id));
  if (index === -1) return;

  const trade = trades[index];

  /*
   * Keep account balance correct when a closed trade is deleted.
   * The account store uses the same incremental model as the journal.
   */
  try {
    const accountsKey = "gtrades_axis_accounts";
    const raw = localStorage.getItem(accountsKey);
    const accounts = raw ? JSON.parse(raw) : {};
    const account = accounts[trade.accountId];

    if (account && trade.status === "Closed") {
      account.currentBalance =
        (Number(account.currentBalance) || 0) -
        ((Number(trade.profit) || 0) - (Number(trade.commission) || 0));
      localStorage.setItem(accountsKey, JSON.stringify(accounts));
    }
  } catch {}

  trades.splice(index, 1);
  saveTrades();
  applyFiltersAndRender();
}

function getConfluenceLabels(c) {
  if (!c) return "";
  const labels = {
    htfSwing: "HTF Swing", htfInternal: "HTF Internal",
    mtfSwing: "MTF Swing", mtfInternal: "MTF Internal",
    htfDemand: "HTF Demand", htfSupply: "HTF Supply",
    mtfDemand: "MTF Demand", mtfSupply: "MTF Supply",
    premium: "Premium", discount: "Discount",
    sweep: "Liquidity Sweep", choch: "CHOCH", bos: "BOS",
    mitigation: "POI Mitigation", refined: "Refined POI", extreme: "Extreme POI"
  };
  return Object.keys(c).filter(k => c[k]).map(k => labels[k] || k).join(", ");
}

function openViewModal(t) {
  const modal = $("viewModal");
  const body = $("modalBody");
  if (!modal || !body) return;

  const rows = [
    ["Date", t.date],
    ["Time", t.time],
    ["Pair", t.pair],
    ["Direction", t.direction],
    ["Session", t.session],
    ["Broker", t.broker],
    ["Account", t.account],
    ["Status", t.status],
    ["Result", normalizeResult(t.result)],
    ["Lot Size", t.lotSize],
    ["Entry", t.entry],
    ["Stop Loss", t.stopLoss],
    ["Take Profit", t.takeProfit],
    ["Risk %", t.risk],
    ["Risk Amount", t.riskAmount],
    ["RR", t.rr],
    ["Profit", t.profit],
    ["Commission", t.commission],
    ["HTF Swing", t.htfSwing],
    ["HTF Internal", t.htfInternal],
    ["MTF Swing", t.mtfSwing],
    ["MTF Internal", t.mtfInternal],
    ["LTF Structure", t.ltfStructure],
    ["Liquidity", t.liquidity],
    ["POI", t.poi],
    ["Entry Model", t.entryModel],
    ["Confirmation", t.entryConfirmation],
    ["Trade Valid", t.tradeValid],
    ["Confidence", t.confidence],
    ["Emotion", t.emotion],
    ["Discipline", t.discipline],
    ["Patience", t.patience],
    ["Summary", t.tradeSummary],
    ["Strengths", t.strengths],
    ["Mistakes", t.mistakes],
    ["Lesson", t.lessonLearned],
    ["Improvement", t.improvementPlan],
    ["Before Chart", t.beforeChart],
    ["During Chart", t.duringChart],
    ["After Chart", t.afterChart],
    ["Notes", t.notes],
    ["Confluences", getConfluenceLabels(t.confluences)]
  ];

  body.innerHTML = rows.map(([label, value]) =>
    `<div class="detail-row">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value || "-")}</div>
    </div>`
  ).join("");

  modal.classList.add("active");
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportJSON() {
  if (!filteredTrades.length) return alert("No trades to export.");
  downloadFile(JSON.stringify(filteredTrades, null, 2), "trades_export.json", "application/json");
}

function exportCSV() {
  if (!filteredTrades.length) return alert("No trades to export.");

  const headers = ["Date","Time","Pair","Direction","Session","Account","Entry","Stop Loss","Take Profit","Risk %","Risk Amount","RR","Profit","Commission","Result","Status","Notes"];
  const csvEscape = v => `"${String(v ?? "").replaceAll('"', '""')}"`;

  const rows = filteredTrades.map(t => [
    t.date, t.time, t.pair, t.direction, t.session, t.account,
    t.entry, t.stopLoss, t.takeProfit, t.risk, t.riskAmount,
    t.rr, t.profit, t.commission, t.result, t.status, t.notes
  ]);

  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map(row => row.map(csvEscape).join(","))
  ].join("\n");

  downloadFile(csv, "trades_export.csv", "text/csv");
}

function clearAll() {
  if (!trades.length) return alert("No trades to clear.");
  if (!confirm("⚠️ Delete ALL trades? This cannot be undone.")) return;

  /*
   * Do not silently leave account balances inflated after deleting all
   * journal trades. Reverse all closed journal P/L first.
   */
  try {
    const accountsKey = "gtrades_axis_accounts";
    const raw = localStorage.getItem(accountsKey);
    const accounts = raw ? JSON.parse(raw) : {};

    trades.forEach(t => {
      const a = accounts[t.accountId];
      if (a && t.status === "Closed") {
        a.currentBalance =
          (Number(a.currentBalance) || 0) -
          ((Number(t.profit) || 0) - (Number(t.commission) || 0));
      }
    });

    localStorage.setItem(accountsKey, JSON.stringify(accounts));
  } catch {}

  trades = [];
  saveTrades();
  applyFiltersAndRender();
}

function setupSorting() {
  document.querySelectorAll("thead th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortAsc = !sortAsc;
      else {
        sortKey = key;
        sortAsc = false;
      }
      renderTable();
    });
  });
}

function initHistory() {
  loadTrades();

  $("applyFilters")?.addEventListener("click", applyFiltersAndRender);

  $("resetFilters")?.addEventListener("click", () => {
    ["filterPair","filterDirection","filterResult","filterDateFrom","filterDateTo"]
      .forEach(id => { if ($(id)) $(id).value = ""; });
    applyFiltersAndRender();
  });

  $("exportCSV")?.addEventListener("click", exportCSV);
  $("exportJSON")?.addEventListener("click", exportJSON);
  $("clearAll")?.addEventListener("click", clearAll);

  $("closeModal")?.addEventListener("click", () => $("viewModal")?.classList.remove("active"));
  $("viewModal")?.addEventListener("click", e => {
    if (e.target === $("viewModal")) $("viewModal").classList.remove("active");
  });

  setupSorting();

  $("scrollTopBtn")?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );

  window.addEventListener("scroll", () =>
    $("scrollTopBtn")?.classList.toggle("visible", window.scrollY > 300)
  );

  window.addEventListener("storage", e => {
    if (e.key === STORAGE_KEY || e.key === "gtrades_axis_accounts") {
      loadTrades();
      applyFiltersAndRender();
    }
  });

  $("logoutBtn")?.addEventListener("click", async () => {
    if (confirm("Logout?")) {
      try {
        const { auth } = await import("./firebase.js");
        const { signOut } = await import("https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js");
        await signOut(auth);
        window.location.reload();
      } catch (e) {
        console.error(e);
      }
    }
  });

  applyFiltersAndRender();
}

initHistory();
console.log("✅ GTRADES-AXIS history engine loaded.");
