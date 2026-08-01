// ============================================================
// GTRADES-AXIS™ – JOURNAL (Complete & Fixed)
// ============================================================

import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ─── STATE ──────────────────────────────────────────────────
const STORAGE_KEY = "trades";
let trades = [];
let editingTrade = null;
let equityChartInstance = null;
let monthlyChartInstance = null;

// ─── PREMIUM LOCK ──────────────────────────────────────────
async function checkJournalAccess() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          alert("User account not found.");
          window.location.href = "dashboard.html";
          return;
        }
        const data = snap.data();
        const role = data.role || "member";
        const membership = data.membership || "free";
        const allowed = role === "admin" || membership === "premium";

        if (!allowed) {
          document.body.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0b1120;color:white;font-family:Arial;text-align:center;padding:40px;">
              <div>
                <i class="fa-solid fa-lock" style="font-size:70px;color:#fbbf24;margin-bottom:20px;display:block;"></i>
                <h1>Premium Membership Required</h1>
                <p style="color:#94a3b8;margin:20px 0;">The Trading Journal is available only to Premium Members.</p>
                <a href="dashboard.html" style="display:inline-block;padding:14px 28px;background:#1d9bf0;color:white;border-radius:8px;text-decoration:none;">Return to Dashboard</a>
              </div>
            </div>
          `;
          throw new Error("Journal blocked");
        }
        resolve(true);
      } catch (err) {
        console.error(err);
        resolve(false); 
      }
    });
  });
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

// ─── LOAD & SAVE ────────────────────────────────────────────
function loadTrades() {
    const saved = localStorage.getItem(STORAGE_KEY);
    trades = saved ? JSON.parse(saved) : [];
}
function saveTrades() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

// ─── BUILD TRADE OBJECT ──────────────────────────────────────
function buildTradeFromForm(isUpdate) {
    const resultVal = val('result') || 'Pending';
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
        status: resultVal === 'Pending' ? 'Pending' : 'Closed',
        created: isUpdate && editingTrade ? editingTrade.created : new Date().toISOString(),
        closed: isUpdate && editingTrade ? editingTrade.closed : (resultVal !== 'Pending' ? new Date().toISOString() : null)
    };
}

// ─── SAVE TRADE ──────────────────────────────────────────────
function saveTrade(e) {
    e.preventDefault();
    const form = e.target;
    const isUpdate = $('#updateMode')?.value === 'true';
    loadTrades();
    const trade = buildTradeFromForm(isUpdate);

    if (isUpdate && editingTrade) {
        const index = trades.findIndex(t => t.id === editingTrade.id);
        if (index !== -1) trades[index] = trade;
        saveTrades();
        alert('✅ Trade updated!');
        window.location.href = 'history.html';
    } else {
        trades.unshift(trade);
        saveTrades();
        form.reset();
        refreshUI();
        alert('✅ Trade saved!');
    }
}

// ─── REFRESH UI ──────────────────────────────────────────────
function refreshUI() {
    loadDashboard();
    initializeCharts();
}

// ─── LOAD DASHBOARD ──────────────────────────────────────────
function loadDashboard() {
    // FIX: Consider any trade with a valid, non-pending result as completed
    const completed = trades.filter(t => t.result && t.result.toLowerCase() !== 'pending');
    const wins = completed.filter(t => t.result && t.result.toLowerCase() === 'win');
    const losses = completed.filter(t => t.result && t.result.toLowerCase() === 'loss');

    const totalTrades = completed.length;
    const totalWins = wins.length;
    const totalLosses = losses.length;
    const winRate = totalTrades === 0 ? 0 : (totalWins / totalTrades) * 100;
    const netProfit = completed.reduce((sum, t) => sum + (parseFloat(t.profit) || 0) - (parseFloat(t.commission) || 0), 0);
    const avgRR = totalTrades === 0 ? 0 : completed.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / totalTrades;

    setText('totalTrades', totalTrades);
    setText('wins', totalWins);
    setText('losses', totalLosses);
    setText('pendingCount', trades.filter(t => t.result && t.result.toLowerCase() === 'pending').length);
    setText('winRate', winRate.toFixed(1) + '%');
    setText('averageRR', avgRR.toFixed(2));
    setText('netProfit', (netProfit >= 0 ? '+' : '') + '$' + netProfit.toFixed(2));

    // Streak
    let streak = 0;
    const allSorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (allSorted.length > 0) {
        const last = allSorted[allSorted.length - 1];
        if (last.result && last.result.toLowerCase() === "win") {
            for (let i = allSorted.length - 1; i >= 0; i--) {
                if (allSorted[i].result && allSorted[i].result.toLowerCase() === "win") streak++;
                else break;
            }
        } else if (last.result && last.result.toLowerCase() === "loss") {
            for (let i = allSorted.length - 1; i >= 0; i--) {
                if (allSorted[i].result && allSorted[i].result.toLowerCase() === "loss") streak--;
                else break;
            }
        }
    }
    setText('streak', streak > 0 ? '+' + streak : streak < 0 ? streak : '0');

    // Month count
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthCount = trades.filter(t => {
        if (!t.date) return false;
        try { const d = new Date(t.date); return d >= monthStart; } catch { return false; }
    }).length;
    setText('monthCount', monthCount);
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
}

function buildEquityChart() {
    const canvas = document.getElementById('equityChart');
    if (!canvas) return;
    // FIX: Include all trades that have a result
    const completed = trades.filter(t => t.result && t.result.toLowerCase() !== 'pending');
    let balance = 0;
    const data = [];
    const sorted = [...completed].sort((a, b) => new Date(a.date || a.created) - new Date(b.date || b.created));
    sorted.forEach(t => {
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
    // FIX: Use the 'date' field properly to sort and filter
    const completed = trades.filter(t => t.result && t.result.toLowerCase() !== 'pending');
    const monthly = {};
    completed.forEach(t => {
        const date = t.closed || t.date || new Date();
        const month = new Date(date).toLocaleString('default', { month: 'short' });
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

// ─── POPULATE FORM FOR EDITING ─────────────────────────────
function populateForm(trade) {
    if (!trade) return;
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
        if (el && trade[id] !== undefined && trade[id] !== null) el.value = trade[id];
    });
    // Confluences mapping
    if (trade.confluences) {
        const map = {
            htfSwing: 'confHTFSwing', htfInternal: 'confHTFInternal',
            mtfSwing: 'confMTFSwing', mtfInternal: 'confMTFInternal',
            htfDemand: 'confHTFDemand', htfSupply: 'confHTFSupply',
            mtfDemand: 'confMTFDemand', mtfSupply: 'confMTFSupply',
            premium: 'confPremium', discount: 'confDiscount',
            sweep: 'confSweep', choch: 'confChoch',
            bos: 'confBos', mitigation: 'confMitigation',
            refined: 'confRefined', extreme: 'confExtreme'
        };
        Object.keys(trade.confluences).forEach(key => {
            const cb = document.getElementById(map[key]);
            if (cb) cb.checked = trade.confluences[key];
        });
    }
    // Update UI for Edit Mode
    document.querySelector('.page-header h1').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Trade';
    const submitBtn = document.querySelector('#tradeForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Update Trade';
        submitBtn.classList.add('btn-update');
    }
}

// ─── INIT LOGIC ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await checkJournalAccess();
        
        // Check if we are editing
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        
        loadTrades();

        if (editId) {
            editingTrade = trades.find(t => t.id === editId);
            if (editingTrade) {
                populateForm(editingTrade);
                // Add hidden flag to form
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
            }
        }

        // Attach submit listener
        const form = document.getElementById('tradeForm');
        if (form) {
            form.removeEventListener('submit', saveTrade);
            form.addEventListener('submit', saveTrade);
        }

        refreshUI();
        console.log("✅ Journal ready and synced.");
        
    } catch (e) {
        console.log("Journal Locked or Error:", e);
    }
});

// ─── STORAGE SYNC ──────────────────────────────────────────
window.addEventListener('storage', function(e) {
    if (e.key === STORAGE_KEY) {
        loadTrades();
        refreshUI();
    }
});

console.log('✅ journal.js loaded successfully');