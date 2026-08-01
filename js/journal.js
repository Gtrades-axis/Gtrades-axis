/* ============================================================
   GTRADES-AXIS™ – TRADING JOURNAL
   ============================================================ */

const STORAGE_KEY = "trades";
let trades = [];
let equityChartInstance = null;
let monthlyChartInstance = null;
let editingTrade = null;

// ─── LOAD & SAVE ────────────────────────────────────────────
export function loadTrades() {
  const saved = localStorage.getItem(STORAGE_KEY);
  trades = saved ? JSON.parse(saved) : [];
  return trades;
}

export function saveTrades() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

export function getTrades() {
  return trades;
}

// ─── HELPERS ──────────────────────────────────────────────────
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function num(id) {
  return parseFloat(val(id)) || 0;
}

function isChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function $(id) { return document.getElementById(id); }

// ─── BUILD TRADE OBJECT ──────────────────────────────────────
function buildTradeFromForm(isUpdate) {
  const resultVal = val('result') || 'Pending';
  const statusVal = resultVal === 'Pending' ? 'Pending' : 'Closed';

  return {
    id: isUpdate && editingTrade ? editingTrade.id : Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    date: val('tradeDate'),
    time: val('tradeTime'),
    pair: val('pair'),
    direction: val('direction'),
    session: val('session'),
    broker: val('broker'),
    account: val('account'),
    lotSize: num('lotSize'),
    htfSwing: val('htfSwing'),
    htfInternal: val('htfInternal'),
    mtfSwing: val('mtfSwing'),
    mtfInternal: val('mtfInternal'),
    ltfStructure: val('ltfStructure'),
    liquidity: val('liquidity'),
    poi: val('poi'),
    entryModel: val('entryModel'),
    entryConfirmation: val('entryConfirmation'),
    tradeValid: val('tradeValid'),
    confluences: {
      htfSwing: isChecked('confHTFSwing'),
      htfInternal: isChecked('confHTFInternal'),
      mtfSwing: isChecked('confMTFSwing'),
      mtfInternal: isChecked('confMTFInternal'),
      htfDemand: isChecked('confHTFDemand'),
      htfSupply: isChecked('confHTFSupply'),
      mtfDemand: isChecked('confMTFDemand'),
      mtfSupply: isChecked('confMTFSupply'),
      premium: isChecked('confPremium'),
      discount: isChecked('confDiscount'),
      sweep: isChecked('confSweep'),
      choch: isChecked('confChoch'),
      bos: isChecked('confBos'),
      mitigation: isChecked('confMitigation'),
      refined: isChecked('confRefined'),
      extreme: isChecked('confExtreme')
    },
    entry: num('entry'),
    stopLoss: num('stopLoss'),
    takeProfit: num('takeProfit'),
    risk: num('risk'),
    rr: num('rr'),
    profit: num('profit'),
    commission: num('commission'),
    result: resultVal,
    confidence: val('confidence'),
    emotion: val('emotion'),
    discipline: val('discipline'),
    patience: val('patience'),
    tradeSummary: val('tradeSummary'),
    strengths: val('strengths'),
    mistakes: val('mistakes'),
    lessonLearned: val('lessonLearned'),
    improvementPlan: val('improvementPlan'),
    beforeChart: val('beforeChart'),
    duringChart: val('duringChart'),
    afterChart: val('afterChart'),
    notes: val('notes'),
    status: statusVal,
    created: isUpdate && editingTrade ? editingTrade.created : new Date().toISOString(),
    closed: isUpdate && editingTrade ? editingTrade.closed : (statusVal === 'Closed' ? new Date().toISOString() : null)
  };
}

// ─── SAVE TRADE (new + update) ──────────────────────────────
function saveTrade(e) {
  e.preventDefault();
  console.log('💾 SaveTrade triggered!');
  const form = e.target;
  const isUpdate = $('#updateMode')?.value === 'true';
  console.log('Is update mode?', isUpdate);

  loadTrades();
  const trade = buildTradeFromForm(isUpdate);

  if (isUpdate && editingTrade) {
    // ── UPDATE ──
    const index = trades.findIndex(t => t.id === editingTrade.id);
    if (index !== -1) {
      trades[index] = trade;
    }
    saveTrades();
    alert('✅ Trade updated!');
    // Reset update mode
    if (document.getElementById('updateMode')) {
      document.getElementById('updateMode').value = 'false';
    }
    form.reset();
    // Restore button appearance
    const submitBtn = document.querySelector('#tradeForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Trade';
      submitBtn.className = 'btn-primary';
    }
    // Restore header
    const header = document.querySelector('.page-header h1');
    if (header) {
      header.innerHTML = '<i class="fa-solid fa-chart-line"></i> Trading Journal';
    }
    document.querySelector('.page-header p').textContent = 'Record • Review • Improve • Repeat';
    // Redirect to history
    window.location.href = 'history.html';
  } else {
    // ── NEW TRADE ──
    trades.unshift(trade);
    saveTrades();
    form.reset();
    refreshUI();
    alert('✅ Trade saved as ' + trade.result + '.');
  }
}

// ─── REFRESH UI ──────────────────────────────────────────────
function refreshUI() {
  loadDashboard();
  loadRecentTrades();
  initializeCharts();
}

// ─── LOAD DASHBOARD ──────────────────────────────────────────
function loadDashboard() {
  const all = trades;
  const wins = all.filter(t => t.result === "Win");
  const losses = all.filter(t => t.result === "Loss");
  const pending = all.filter(t => t.status === "Pending" || t.result === "Pending");
  const totalTrades = all.length;
  const totalWins = wins.length;
  const totalLosses = losses.length;
  const winRate = totalTrades === 0 ? 0 : (totalWins / totalTrades) * 100;
  const netProfit = all.reduce((sum, t) => sum + (parseFloat(t.profit) || 0) - (parseFloat(t.commission) || 0), 0);
  const avgRR = totalTrades === 0 ? 0 : all.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / totalTrades;

  let streak = 0;
  const sorted = [...all].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length > 0) {
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
  const monthCount = all.filter(t => {
    if (!t.date) return false;
    try { const d = new Date(t.date); return d >= monthStart; } catch { return false; }
  }).length;

  setText('totalTrades', totalTrades);
  setText('wins', totalWins);
  setText('losses', totalLosses);
  setText('pendingCount', pending.length);
  setText('winRate', winRate.toFixed(1) + '%');
  setText('averageRR', avgRR.toFixed(2));
  setText('netProfit', (netProfit >= 0 ? '+' : '') + '$' + netProfit.toFixed(2));
  setText('streak', streak > 0 ? '+' + streak : streak < 0 ? streak : '0');
  setText('monthCount', monthCount);

  const winEl = document.getElementById('winRate');
  if (winEl) winEl.className = winRate >= 50 ? 'value-positive' : winRate > 0 ? 'value-neutral' : 'value-negative';
  const profitEl = document.getElementById('netProfit');
  if (profitEl) {
    const p = netProfit;
    profitEl.className = p > 0 ? 'value-positive' : p < 0 ? 'value-negative' : 'value-neutral';
  }
  calculatePerformance(all);
}

function calculatePerformance(tradesArray) {
  if (tradesArray.length === 0) {
    setText('bestPair', '-');
    setText('worstPair', '-');
    setText('bestSession', '-');
    setText('winStreak', '0');
    return;
  }
  const pairStats = {};
  const sessionStats = {};
  tradesArray.forEach(t => {
    const pair = t.pair || '?';
    const session = t.session || '?';
    const profit = parseFloat(t.profit) || 0;
    pairStats[pair] = (pairStats[pair] || 0) + profit;
    sessionStats[session] = (sessionStats[session] || 0) + profit;
  });
  let bestPair = Object.keys(pairStats).sort((a, b) => pairStats[b] - pairStats[a])[0] || '-';
  let worstPair = Object.keys(pairStats).sort((a, b) => pairStats[a] - pairStats[b])[0] || '-';
  let bestSession = Object.keys(sessionStats).sort((a, b) => sessionStats[b] - sessionStats[a])[0] || '-';
  setText('bestPair', bestPair);
  setText('worstPair', worstPair);
  setText('bestSession', bestSession);
}

// ─── RECENT TRADES ────────────────────────────────────────────
function loadRecentTrades() {
  const container = document.getElementById('recentTrades');
  if (!container) return;
  if (trades.length === 0) {
    container.innerHTML = '<div class="loading-card">No trades yet.</div>';
    return;
  }
  container.innerHTML = '';
  trades.slice(0, 8).forEach(t => {
    container.innerHTML += `
      <div class="trade-row">
        <div><strong>${t.pair || '?'}</strong><br>${t.direction || ''}</div>
        <div>${t.entryModel || '-'}</div>
        <div><span class="status ${t.status.toLowerCase()}">${t.status}</span></div>
        <div><button onclick="closeTrade('${t.id}')" class="btn">Close</button></div>
      </div>
    `;
  });
}

// ─── CLOSE TRADE ──────────────────────────────────────────────
function closeTrade(id) {
  const trade = trades.find(t => t.id === id);
  if (!trade) return;
  if (trade.status === 'Closed') {
    viewTrade(trade);
    return;
  }
  const outcome = prompt("Result?\n\nWin\nLoss\nBreakeven");
  if (!outcome) return;
  const profit = parseFloat(prompt("Profit/Loss ($)", 0)) || 0;
  const commission = parseFloat(prompt("Commission ($)", 0)) || 0;
  const rr = parseFloat(prompt("Actual RR", 0)) || 0;
  const management = prompt("Management Quality\nExcellent\nGood\nAverage\nPoor");
  const psych = prompt("Psychology Notes");
  const lesson = prompt("Lesson Learned");
  const improvement = prompt("Improvement");

  trade.status = 'Closed';
  trade.closed = new Date().toISOString();
  trade.result = outcome;
  trade.profit = profit;
  trade.commission = commission;
  trade.rr = rr;
  trade.management = management;
  trade.psychologyNote = psych;
  trade.reviewNote = { lesson, improvement };

  saveTrades();
  refreshUI();
  alert('✅ Trade closed successfully.');
}

function viewTrade(trade) {
  alert(`
    PAIR        : ${trade.pair}
    STATUS      : ${trade.status}
    RESULT      : ${trade.result}
    PROFIT      : $${trade.profit}
    RR          : ${trade.rr}
    LESSON      : ${trade.reviewNote?.lesson || '-'}
    IMPROVEMENT : ${trade.reviewNote?.improvement || '-'}
  `);
}

// ─── CHARTS ────────────────────────────────────────────────────
function initializeCharts() {
  if (typeof Chart === 'undefined') return;
  destroyAllCharts();
  buildEquityChart();
  buildMonthlyChart();
}

function destroyAllCharts() {
  if (equityChartInstance) { equityChartInstance.destroy(); equityChartInstance = null; }
  if (monthlyChartInstance) { monthlyChartInstance.destroy(); monthlyChartInstance = null; }
  ['equityChart', 'monthlyChart'].forEach(id => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (Chart.instances) {
      for (const key in Chart.instances) {
        const instance = Chart.instances[key];
        if (instance && instance.canvas === canvas) { instance.destroy(); break; }
      }
    }
    if (typeof Chart.getChart === 'function') {
      const existing = Chart.getChart(canvas);
      if (existing) existing.destroy();
    }
  });
}

function buildEquityChart() {
  const canvas = document.getElementById('equityChart');
  if (!canvas) return;
  const closed = trades.filter(t => t.status === 'Closed');
  let balance = 0;
  const data = [];
  closed.forEach(t => {
    balance += (parseFloat(t.profit) || 0) - (parseFloat(t.commission) || 0);
    data.push(balance);
  });
  equityChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i + 1),
      datasets: [{ label: 'Equity', data, borderColor: '#4f7cff', backgroundColor: 'rgba(79,124,255,0.15)', fill: true, tension: 0.3 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function buildMonthlyChart() {
  const canvas = document.getElementById('monthlyChart');
  if (!canvas) return;
  const monthly = {};
  trades.filter(t => t.status === 'Closed').forEach(t => {
    const month = new Date(t.closed).toLocaleString('default', { month: 'short' });
    monthly[month] = (monthly[month] || 0) + (parseFloat(t.profit) || 0) - (parseFloat(t.commission) || 0);
  });
  monthlyChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: Object.keys(monthly),
      datasets: [{ label: 'Monthly P&L', data: Object.values(monthly), backgroundColor: '#4f7cff', borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// ─── POPULATE FORM (edit mode) ──────────────────────────────
function populateForm(trade) {
  console.log('📝 Populating form with trade:', trade);

  const fields = [
    'tradeDate', 'tradeTime', 'pair', 'direction', 'session', 'broker', 'account', 'lotSize',
    'htfSwing', 'htfInternal', 'mtfSwing', 'mtfInternal',
    'ltfStructure', 'liquidity', 'poi', 'entryModel', 'entryConfirmation', 'tradeValid',
    'entry', 'stopLoss', 'takeProfit', 'risk', 'rr', 'profit', 'commission', 'result',
    'confidence', 'emotion', 'discipline', 'patience',
    'tradeSummary', 'strengths', 'mistakes', 'lessonLearned', 'improvementPlan',
    'beforeChart', 'duringChart', 'afterChart', 'notes'
  ];

  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (trade[id] !== undefined && trade[id] !== null) {
        el.value = trade[id];
        console.log(`  ✅ Set ${id} = ${trade[id]}`);
      }
    }
  });

  // Confluences
  if (trade.confluences) {
    const map = {
      htfSwing: 'confHTFSwing',
      htfInternal: 'confHTFInternal',
      mtfSwing: 'confMTFSwing',
      mtfInternal: 'confMTFInternal',
      htfDemand: 'confHTFDemand',
      htfSupply: 'confHTFSupply',
      mtfDemand: 'confMTFDemand',
      mtfSupply: 'confMTFSupply',
      premium: 'confPremium',
      discount: 'confDiscount',
      sweep: 'confSweep',
      choch: 'confChoch',
      bos: 'confBos',
      mitigation: 'confMitigation',
      refined: 'confRefined',
      extreme: 'confExtreme'
    };
    Object.keys(trade.confluences).forEach(key => {
      const cb = document.getElementById(map[key]);
      if (cb) cb.checked = trade.confluences[key];
    });
  }
}

// ─── DETECT EDIT MODE ────────────────────────────────────────
function checkEditMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  if (editId) {
    loadTrades();
    editingTrade = trades.find(t => t.id === editId);
    if (editingTrade) {
      // Wait for DOM to be ready
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setupEditMode(editingTrade);
      } else {
        document.addEventListener('DOMContentLoaded', () => setupEditMode(editingTrade));
      }
    } else {
      console.warn('⚠️ Trade not found for ID:', editId);
    }
  }
}

function setupEditMode(trade) {
  console.log('✏️ Setting up edit mode for trade:', trade);
  populateForm(trade);

  const submitBtn = document.querySelector('#tradeForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Update Trade';
    submitBtn.className = 'btn-update';
  }

  const form = document.getElementById('tradeForm');
  let flag = document.getElementById('updateMode');
  if (!flag) {
    flag = document.createElement('input');
    flag.type = 'hidden';
    flag.id = 'updateMode';
    flag.value = 'true';
    form.appendChild(flag);
  } else {
    flag.value = 'true';
  }

  const header = document.querySelector('.page-header h1');
  if (header) {
    header.innerHTML = '<i class="fa-solid fa-pen"></i> Edit Trade';
  }
  const headerP = document.querySelector('.page-header p');
  if (headerP) {
    headerP.textContent = 'Modify trade details and save changes.';
  }
}

// ─── ATTACH FORM SUBMIT ──────────────────────────────────────
function attachFormListener() {
  const form = document.getElementById('tradeForm');
  if (form) {
    form.removeEventListener('submit', saveTrade);
    form.addEventListener('submit', saveTrade);
    console.log('✅ Submit listener attached to #tradeForm');
  } else {
    console.error('❌ Form #tradeForm not found');
  }
}

// ─── EXPORTED INIT FUNCTION ──────────────────────────────────
export function initJournal() {
  console.log('✅ Journal initializing...');

  loadTrades();
  attachFormListener();
  checkEditMode();

  // Refresh UI after DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    refreshUI();
  } else {
    document.addEventListener('DOMContentLoaded', refreshUI);
  }

  // ─── SCROLL TO TOP ──────────────────────────────────────────
  const scrollBtn = document.getElementById('scrollTopBtn');
  if (scrollBtn) {
    window.addEventListener('scroll', () => {
      scrollBtn.classList.toggle('visible', window.scrollY > 300);
    });
    scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ─── STORAGE SYNC ──────────────────────────────────────────
  window.addEventListener('storage', function(e) {
    if (e.key === STORAGE_KEY) {
      loadTrades();
      refreshUI();
    }
  });

  // ─── GLOBAL closeTrade for inline onclick ──────────────────
  window.closeTrade = closeTrade;

  console.log('✅ Journal fully initialized.');
}