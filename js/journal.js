const STORAGE_KEY = "trades";
let trades = [];

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("tradeForm");
  if (form) form.addEventListener("submit", saveTrade);
  loadDashboard();
});

function loadTrades() {
  const saved = localStorage.getItem(STORAGE_KEY);
  trades = saved ? JSON.parse(saved) : [];
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

function saveTrade(e) {
  e.preventDefault();
  const form = e.target;

  const trade = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    date: document.getElementById('tradeDate')?.value || '',
    pair: document.getElementById('pair')?.value || '',
    direction: document.getElementById('direction')?.value || '',
    entry: parseFloat(document.getElementById('entry')?.value) || 0,
    stopLoss: parseFloat(document.getElementById('stopLoss')?.value) || 0,
    takeProfit: parseFloat(document.getElementById('takeProfit')?.value) || 0,
    rr: parseFloat(document.getElementById('rr')?.value) || 0,
    profit: parseFloat(document.getElementById('profit')?.value) || 0,
    result: document.getElementById('result')?.value || 'Pending',
    notes: document.getElementById('notes')?.value || ''
  };

  loadTrades();
  trades.unshift(trade);
  saveStorage();
  form.reset();
  alert('✅ Trade saved!');
}

function loadDashboard() {
  // Optional – just for demo
  const total = trades.length;
  const el = document.getElementById('totalTrades');
  if (el) el.textContent = total;
}
