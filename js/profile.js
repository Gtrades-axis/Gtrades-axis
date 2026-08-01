// ============================================================
// GTRADES-AXIS™ – PROFILE (Complete & Fixed)
// ============================================================

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ─── DOM REFS ──────────────────────────────────────────────
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileImage = document.getElementById("profileImage");
const roleBadge = document.getElementById("roleBadge");
const membershipBadge = document.getElementById("membershipBadge");
const statusBadge = document.getElementById("statusBadge");
const accName = document.getElementById("accName");
const accEmail = document.getElementById("accEmail");
const accRole = document.getElementById("accRole");
const accMembership = document.getElementById("accMembership");
const accStatus = document.getElementById("accStatus");
const accJoined = document.getElementById("accJoined");
const accUid = document.getElementById("accUid");
const membershipTitle = document.getElementById("membershipTitle");
const membershipDescription = document.getElementById("membershipDescription");
const upgradeBtn = document.getElementById("upgradeBtn");

const totalTrades = document.getElementById("totalTrades");
const winRate = document.getElementById("winRate");
const profit = document.getElementById("profit");
const rrAverage = document.getElementById("rrAverage");
const currentStreak = document.getElementById("currentStreak");
const profitFactor = document.getElementById("profitFactor");
const bestTrade = document.getElementById("bestTrade");
const worstTrade = document.getElementById("worstTrade");
const avgWin = document.getElementById("avgWin");
const avgLoss = document.getElementById("avgLoss");
const largestRR = document.getElementById("largestRR");
const expectancy = document.getElementById("expectancy");

const dailyGoal = document.getElementById("dailyGoal");
const weeklyGoal = document.getElementById("weeklyGoal");
const monthlyGoal = document.getElementById("monthlyGoal");
const riskTrade = document.getElementById("riskTrade");
const maxLoss = document.getElementById("maxLoss");
const saveGoals = document.getElementById("saveGoals");

const journalEntries = document.getElementById("journalEntries");
const journalWins = document.getElementById("journalWins");
const journalLosses = document.getElementById("journalLosses");
const journalRR = document.getElementById("journalRR");
const reviewsDone = document.getElementById("reviewsDone");
const averageScore = document.getElementById("averageScore");
const bestScore = document.getElementById("bestScore");
const mistakesFixed = document.getElementById("mistakesFixed");
const disciplineScore = document.getElementById("disciplineScore");
const disciplineBar = document.getElementById("disciplineBar");
const consistencyScore = document.getElementById("consistencyScore");
const consistencyBar = document.getElementById("consistencyBar");
const riskScore = document.getElementById("riskScore");
const riskBar = document.getElementById("riskBar");
const academyProgress = document.getElementById("academyProgress");
const academyBar = document.getElementById("academyBar");
const lessonsCompleted = document.getElementById("lessonsCompleted");
const lessonBar = document.getElementById("lessonBar");

let currentUser = null;
let currentUserData = null;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    if (dateStr.toDate) return dateStr.toDate().toLocaleDateString();
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
}
function formatCurrency(amount) {
  return (amount >= 0 ? '+' : '') + '$' + amount.toFixed(2);
}
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function loadTrades() {
  const saved = localStorage.getItem("trades");
  return saved ? JSON.parse(saved) : [];
}

function calculateStatistics(trades) {
  const total = trades.length;
  if (total === 0) {
    setText('totalTrades', 0); setText('winRate', '0.0%'); setText('profit', '$0.00');
    setText('rrAverage', '0.00'); setText('currentStreak', 0); setText('profitFactor', '0.00');
    setText('bestTrade', '$0.00'); setText('worstTrade', '$0.00'); setText('avgWin', '$0.00');
    setText('avgLoss', '$0.00'); setText('largestRR', '0R'); setText('expectancy', '0.00');
    return;
  }

  const completed = trades.filter(t => t.result && t.result.toLowerCase() !== 'pending');
  const closedTotal = completed.length;
  const wins = completed.filter(t => t.result && t.result.toLowerCase() === 'win');
  const losses = completed.filter(t => t.result && t.result.toLowerCase() === 'loss');

  const winRateVal = closedTotal > 0 ? (wins.length / closedTotal) * 100 : 0;
  setText('winRate', winRateVal.toFixed(1) + '%');

  const netProfit = completed.reduce((sum, t) => sum + (parseFloat(t.profit) || 0) - (parseFloat(t.commission) || 0), 0);
  setText('profit', formatCurrency(netProfit));
  setText('totalTrades', total);

  const totalRR = completed.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0);
  const avgRR = closedTotal > 0 ? totalRR / closedTotal : 0;
  setText('rrAverage', avgRR.toFixed(2));

  const grossProfit = wins.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
  const grossLoss = losses.reduce((sum, t) => sum + Math.abs(parseFloat(t.profit) || 0), 0);
  const pf = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? grossProfit : 0);
  setText('profitFactor', pf.toFixed(2));

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
  setText('currentStreak', streak > 0 ? '+' + streak : streak < 0 ? streak : 0);

  const profits = completed.map(t => parseFloat(t.profit) || 0);
  const best = profits.length > 0 ? Math.max(...profits) : 0;
  const worst = profits.length > 0 ? Math.min(...profits) : 0;
  setText('bestTrade', formatCurrency(best));
  setText('worstTrade', formatCurrency(worst));

  const avgWinVal = wins.length > 0 ? wins.reduce((s, t) => s + parseFloat(t.profit || 0), 0) / wins.length : 0;
  const avgLossVal = losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(parseFloat(t.profit || 0)), 0) / losses.length : 0;
  setText('avgWin', formatCurrency(avgWinVal));
  setText('avgLoss', formatCurrency(avgLossVal));

  const maxRR = completed.reduce((max, t) => Math.max(max, parseFloat(t.rr) || 0), 0);
  setText('largestRR', maxRR.toFixed(1) + 'R');
  const expectancyVal = closedTotal > 0 ? netProfit / closedTotal : 0;
  setText('expectancy', expectancyVal.toFixed(2));

  const profitEl = document.getElementById('profit');
  if (profitEl) profitEl.style.color = netProfit >= 0 ? '#16c784' : '#ea3943';
}

function loadGoals(user) {
  if (!user) return;
  if (dailyGoal) dailyGoal.value = user.dailyGoal || '';
  if (weeklyGoal) weeklyGoal.value = user.weeklyGoal || '';
  if (monthlyGoal) monthlyGoal.value = user.monthlyGoal || '';
  if (riskTrade) riskTrade.value = user.riskTrade || '';
  if (maxLoss) maxLoss.value = user.maxLoss || '';
}

saveGoals?.addEventListener('click', async () => {
  if (!currentUser) return;
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      dailyGoal: Number(dailyGoal.value) || 0,
      weeklyGoal: Number(weeklyGoal.value) || 0,
      monthlyGoal: Number(monthlyGoal.value) || 0,
      riskTrade: Number(riskTrade.value) || 0,
      maxLoss: Number(maxLoss.value) || 0,
    });
    saveGoals.innerHTML = '<i class="fa-solid fa-check"></i> Goals Saved';
    saveGoals.style.background = '#16c784';
    setTimeout(() => { saveGoals.innerHTML = 'Save Goals'; saveGoals.style.background = '#0094ff'; }, 2000);
  } catch (error) { console.error(error); alert('Failed to save goals.'); }
});

function loadDashboardData() {
  const trades = loadTrades();
  const total = trades.length;
  const wins = trades.filter(t => t.result && t.result.toLowerCase() === 'win').length;
  const losses = trades.filter(t => t.result && t.result.toLowerCase() === 'loss').length;
  setText('journalEntries', total); setText('journalWins', wins); setText('journalLosses', losses);

  let totalRR = 0; trades.forEach(t => { totalRR += parseFloat(t.rr) || 0; });
  const avgRR = total > 0 ? totalRR / total : 0;
  setText('journalRR', avgRR.toFixed(2) + 'R');

  const completed = Number(localStorage.getItem('academyCompleted') || 0);
  const totalLessons = 20; const percent = Math.round((completed / totalLessons) * 100);
  setText('academyProgress', percent + '%');
  if (academyBar) academyBar.style.width = percent + '%';
  setText('lessonsCompleted', completed + ' / ' + totalLessons);
  if (lessonBar) lessonBar.style.width = percent + '%';

  const reviews = JSON.parse(localStorage.getItem('aiReviews') || '[]');
  setText('reviewsDone', reviews.length);
  if (reviews.length > 0) {
    let totalScore = 0, best = 0, fixed = 0;
    reviews.forEach(r => {
      const score = Number(r.score || 0); totalScore += score;
      if (score > best) best = score; fixed += Number(r.fixed || 0);
    });
    setText('averageScore', Math.round(totalScore / reviews.length) + '%');
    setText('bestScore', best + '%'); setText('mistakesFixed', fixed);
  } else { setText('averageScore', '0%'); setText('bestScore', '0%'); setText('mistakesFixed', '0'); }

  const discipline = 82; const consistency = 74; const riskPsych = 90;
  setText('disciplineScore', discipline + '%'); if (disciplineBar) disciplineBar.style.width = discipline + '%';
  setText('consistencyScore', consistency + '%'); if (consistencyBar) consistencyBar.style.width = consistency + '%';
  setText('riskScore', riskPsych + '%'); if (riskBar) riskBar.style.width = riskPsych + '%';
}

function populateProfile(user) {
  if (!user) return;
  const name = user.name || 'Trader'; const email = user.email || '';
  const role = user.role || 'member'; const membership = user.membership || 'free';
  const active = user.active !== false;

  setText('profileName', name); setText('profileEmail', email); setText('accName', name); setText('accEmail', email);
  setText('accRole', role.charAt(0).toUpperCase() + role.slice(1));
  setText('accMembership', membership.charAt(0).toUpperCase() + membership.slice(1));
  setText('accStatus', active ? 'Active' : 'Suspended'); setText('accUid', currentUser?.uid || '—');
  if (user.createdAt) setText('accJoined', formatDate(user.createdAt));
  if (user.photoURL && profileImage) profileImage.src = user.photoURL;

  if (roleBadge) { roleBadge.textContent = role.toUpperCase(); roleBadge.className = 'badge ' + role; }
  if (membershipBadge) { membershipBadge.textContent = membership.toUpperCase(); membershipBadge.className = 'badge ' + membership; }
  if (statusBadge) { statusBadge.textContent = active ? 'ACTIVE' : 'SUSPENDED'; statusBadge.className = 'badge ' + (active ? 'active' : 'suspended'); }
  updateMembershipCard(user); loadGoals(user);
}

function updateMembershipCard(user) {
  if (!membershipTitle) return;
  if (user.role === 'admin') { membershipTitle.textContent = 'ADMINISTRATOR'; membershipDescription.textContent = 'You have unrestricted access.'; if (upgradeBtn) upgradeBtn.style.display = 'none'; return; }
  if (user.membership === 'premium') { membershipTitle.textContent = 'PREMIUM MEMBER'; membershipDescription.textContent = 'Enjoy unlimited access.'; if (upgradeBtn) upgradeBtn.style.display = 'none'; return; }
  membershipTitle.textContent = 'FREE MEMBER'; membershipDescription.textContent = 'Upgrade to unlock every premium feature.'; if (upgradeBtn) upgradeBtn.style.display = 'inline-flex';
}

const photoInput = document.getElementById('profilePhotoInput');
document.getElementById('changePhotoBtn')?.addEventListener('click', () => photoInput?.click());
photoInput?.addEventListener('change', () => {
  const file = photoInput.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => { if (profileImage) profileImage.src = e.target.result; localStorage.setItem('profilePhoto', e.target.result); };
  reader.readAsDataURL(file);
});
const savedPhoto = localStorage.getItem('profilePhoto');
if (savedPhoto && profileImage) profileImage.src = savedPhoto;

document.getElementById('downloadDataBtn')?.addEventListener('click', () => {
  const data = { profile: currentUserData, trades: loadTrades(), goals: { daily: dailyGoal?.value || 0, weekly: weeklyGoal?.value || 0, monthly: monthlyGoal?.value || 0, risk: riskTrade?.value || 0, maxLoss: maxLoss?.value || 0 } };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'GTRADES-AXIS-Profile.json'; a.click(); URL.revokeObjectURL(url);
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (confirm('Logout?')) { signOut(auth).then(() => { window.location.href = 'login.html'; }); }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'login.html'; return; }
  currentUser = user;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) { currentUserData = snap.data(); populateProfile(currentUserData); }
    const trades = loadTrades(); calculateStatistics(trades); loadDashboardData();
  } catch (error) { console.error('Profile error:', error); }
});

console.log('✅ Profile loaded & synced.');