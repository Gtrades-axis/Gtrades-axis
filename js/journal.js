/* ==========================================================
   GTRADES AXIS™ – TRADING JOURNAL (SAVES TO "trades")
   ========================================================= */

const STORAGE_KEY = "trades";
let trades = [];
let equityChartInstance = null;
let monthlyChartInstance = null;

// Load trades from localStorage
function loadTrades() {
    const saved = localStorage.getItem(STORAGE_KEY);
    trades = saved ? JSON.parse(saved) : [];
}

// Save to localStorage
function saveStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

// Helper to get form value
function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

// Helper to get checked state
function isChecked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}

// ==========================================================
// SAVE TRADE – this is the core function
// ==========================================================
function saveTrade(e) {
    e.preventDefault();
    console.log('🔥 saveTrade called');

    // Build trade object with all fields
    const trade = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        date: val('tradeDate'),
        time: val('tradeTime'),
        pair: val('pair'),
        direction: val('direction'),
        session: val('session'),
        broker: val('broker'),
        account: val('account'),
        lotSize: parseFloat(val('lotSize')) || 0,

        // Execution
        entry: parseFloat(val('entry')) || 0,
        stopLoss: parseFloat(val('stopLoss')) || 0,
        takeProfit: parseFloat(val('takeProfit')) || 0,
        risk: parseFloat(val('risk')) || 0,
        rr: parseFloat(val('rr')) || 0,
        profit: parseFloat(val('profit')) || 0,
        commission: parseFloat(val('commission')) || 0,
        result: val('result') || 'Pending',

        // Psychology
        confidence: val('confidence'),
        emotion: val('emotion'),
        discipline: val('discipline'),
        patience: val('patience'),

        // Review
        tradeSummary: val('tradeSummary'),
        strengths: val('strengths'),
        mistakes: val('mistakes'),
        lessonLearned: val('lessonLearned'),
        improvementPlan: val('improvementPlan'),

        // Charts
        beforeChart: val('beforeChart'),
        duringChart: val('duringChart'),
        afterChart: val('afterChart'),
        notes: val('notes'),

        // Detailed analysis (nested – for future use)
        htf: {
            swingBias: val('htfSwing'),
            internalBias: val('htfInternal')
        },
        mtf: {
            swingBias: val('mtfSwing'),
            internalBias: val('mtfInternal')
        },
        ltf: {
            structure: val('ltfStructure'),
            liquidity: val('liquidity'),
            poi: val('poi'),
            model: val('entryModel'),
            confirmation: val('entryConfirmation'),
            valid: val('tradeValid')
        },
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

        // Status
        status: "Pending",
        created: new Date().toISOString(),
        closed: null,
        resultDetails: null,
        management: null,
        psychologyNote: null,
        reviewNote: null
    };

    console.log('📦 Trade to save:', trade);

    // Save
    loadTrades();  // refresh in case other tabs changed it
    trades.unshift(trade);
    saveStorage();

    // Reset form
    document.getElementById('tradeForm').reset();

    // Update UI
    loadDashboard();
    loadRecentTrades();
    initializeCharts();

    alert('✅ Trade saved as Pending.');
}

// ==========================================================
// LOAD DASHBOARD
// ==========================================================
function loadDashboard() {
    const closed = trades.filter(t => t.status === "Closed");
    const wins = closed.filter(t => t.result === "Win");
    const losses = closed.filter(t => t.result === "Loss");
    const pending = trades.filter(t => t.status === "Pending");

    const totalTrades = closed.length;
    const totalWins = wins.length;
    const totalLosses = losses.length;
    const winRate = totalTrades === 0 ? 0 : (totalWins / totalTrades) * 100;
    const netProfit = closed.reduce((sum, t) => sum + (parseFloat(t.profit) || 0) - (parseFloat(t.commission) || 0), 0);
    const avgRR = totalTrades === 0 ? 0 : closed.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / totalTrades;

    setText('totalTrades', totalTrades);
    setText('wins', totalWins);
    setText('losses', totalLosses);
    setText('winRate', winRate.toFixed(1) + '%');
    setText('averageRR', avgRR.toFixed(2));
    setText('netProfit', '$' + netProfit.toFixed(2));
    setText('pendingTrades', pending.length);
    calculatePerformance(closed);
}

function calculatePerformance(closed) {
    if (closed.length === 0) {
        setText('bestPair', '-');
        setText('worstPair', '-');
        setText('bestSession', '-');
        setText('winStreak', '0');
        return;
    }
    const pairStats = {};
    const sessionStats = {};
    let streak = 0, bestStreak = 0;
    closed.forEach(t => {
        const pair = t.pair || '?';
        const session = t.session || '?';
        const profit = parseFloat(t.profit) || 0;
        pairStats[pair] = (pairStats[pair] || 0) + profit;
        sessionStats[session] = (sessionStats[session] || 0) + profit;
        if (t.result === 'Win') { streak++; if (streak > bestStreak) bestStreak = streak; }
        else { streak = 0; }
    });
    const bestPair = Object.keys(pairStats).sort((a, b) => pairStats[b] - pairStats[a])[0];
    const worstPair = Object.keys(pairStats).sort((a, b) => pairStats[a] - pairStats[b])[0];
    const bestSession = Object.keys(sessionStats).sort((a, b) => sessionStats[b] - sessionStats[a])[0];
    setText('bestPair', bestPair || '-');
    setText('worstPair', worstPair || '-');
    setText('bestSession', bestSession || '-');
    setText('winStreak', bestStreak);
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// ==========================================================
// RECENT TRADES
// ==========================================================
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
                <div>${t.ltf?.model || '-'}</div>
                <div><span class="status ${t.status.toLowerCase()}">${t.status}</span></div>
                <div><button onclick="editTrade('${t.id}')" class="btn">Edit</button></div>
            </div>
        `;
    });
}

// ==========================================================
// EDIT / CLOSE TRADE
// ==========================================================
function editTrade(id) {
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
    trade.resultDetails = { outcome, profit, commission, actualRR: rr };

    saveStorage();
    loadDashboard();
    loadRecentTrades();
    initializeCharts();
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

// ==========================================================
// CHARTS
// ==========================================================
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
    const existing = Chart.getChart ? Chart.getChart(canvas) : null;
    if (existing) existing.destroy();
    if (equityChartInstance) { equityChartInstance.destroy(); equityChartInstance = null; }

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
            datasets: [{ label: 'Equity', data }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildMonthlyChart() {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas) return;
    const existing = Chart.getChart ? Chart.getChart(canvas) : null;
    if (existing) existing.destroy();
    if (monthlyChartInstance) { monthlyChartInstance.destroy(); monthlyChartInstance = null; }

    const monthly = {};
    trades.filter(t => t.status === 'Closed').forEach(t => {
        const month = new Date(t.closed).toLocaleString('default', { month: 'short' });
        monthly[month] = (monthly[month] || 0) + (parseFloat(t.profit) || 0) - (parseFloat(t.commission) || 0);
    });
    monthlyChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: Object.keys(monthly),
            datasets: [{ label: 'Monthly P&L', data: Object.values(monthly) }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ==========================================================
// INIT
// ==========================================================
loadTrades();
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('tradeForm');
    if (form) {
        form.addEventListener('submit', saveTrade);
        console.log('✅ Journal form ready');
    } else {
        console.error('❌ Form #tradeForm not found');
    }
    loadDashboard();
    loadRecentTrades();
    initializeCharts();
});