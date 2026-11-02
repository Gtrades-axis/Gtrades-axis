// ============================================================
// GTRADES-AXIS™ – PROFILE PAGE (COMPLETE)
// ============================================================

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  onSnapshot,
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

// Stats
const totalTrades = document.getElementById("totalTrades");
const winRate = document.getElementById("winRate");
const profit = document.getElementById("profit");
const currentBalance = document.getElementById("currentBalance");
const rrAverage = document.getElementById("rrAverage");
const currentStreak = document.getElementById("currentStreak");
const profitFactor = document.getElementById("profitFactor");
const bestTrade = document.getElementById("bestTrade");
const worstTrade = document.getElementById("worstTrade");
const avgWin = document.getElementById("avgWin");
const avgLoss = document.getElementById("avgLoss");
const largestRR = document.getElementById("largestRR");
const expectancy = document.getElementById("expectancy");

// Goals
const dailyGoal = document.getElementById("dailyGoal");
const weeklyGoal = document.getElementById("weeklyGoal");
const monthlyGoal = document.getElementById("monthlyGoal");
const riskTrade = document.getElementById("riskTrade");
const maxLoss = document.getElementById("maxLoss");
const saveGoals = document.getElementById("saveGoals");

// Other sections
const academyProgress = document.getElementById("academyProgress");
const academyBar = document.getElementById("academyBar");
const lessonsCompleted = document.getElementById("lessonsCompleted");
const lessonBar = document.getElementById("lessonBar");
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
const journalEntries = document.getElementById("journalEntries");
const journalWins = document.getElementById("journalWins");
const journalLosses = document.getElementById("journalLosses");
const journalRR = document.getElementById("journalRR");
const downloadDataBtn = document.getElementById("downloadDataBtn");

let currentUser = null;
let currentUserData = null;
let journalTrades = [];
let journalAccounts = {};
let tradesUnsubscribe = null;
let accountsUnsubscribe = null;

// ─── AUTH ──────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login";
    return;
  }
  currentUser = user;
  await loadProfile();
  subscribeJournalData();
  loadAcademy();
  loadAIReview();
  loadPsychology();
});

// ─── LOAD PROFILE ──────────────────────────────────────────
async function loadProfile() {
  try {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (!snap.exists()) {
      alert("Profile not found.");
      return;
    }
    currentUserData = snap.data();
    populateProfile(currentUserData);
    loadGoals(currentUserData);
  } catch (err) {
    console.error(err);
  }
}

// ─── POPULATE PROFILE ──────────────────────────────────────
function populateProfile(user) {
  profileName.textContent = user.name || "Trader";
  profileEmail.textContent = user.email || "";
  accName.textContent = user.name || "--";
  accEmail.textContent = user.email || "--";
  accRole.textContent = user.role || "member";
  accMembership.textContent = user.membership || "free";
  accStatus.textContent = user.status || "pending";
  accUid.textContent = currentUser.uid;

  if (user.createdAt) {
    try {
      accJoined.textContent = user.createdAt.toDate().toLocaleDateString();
    } catch {
      accJoined.textContent = "--";
    }
  }

  if (user.photoURL) {
    profileImage.src = user.photoURL;
  }

  statusBadge.textContent = (user.status || "pending").toUpperCase();
  statusBadge.className = "badge " + (user.status || "pending");

  roleBadge.textContent = (user.role || "member").toUpperCase();
  roleBadge.className = "badge " + (user.role || "member");

  membershipBadge.textContent = (user.membership || "free").toUpperCase();
  membershipBadge.className = "badge " + (user.membership || "free");

  updateMembershipCard(user);
}

// ─── MEMBERSHIP CARD ────────────────────────────────────────
function updateMembershipCard(user) {
  if (user.role === "admin") {
    membershipTitle.textContent = "ADMINISTRATOR";
    membershipDescription.textContent = "You have unrestricted access to the GTRADES-AXIS platform.";
    upgradeBtn.style.display = "none";
    return;
  }
  if (user.membership === "premium") {
    membershipTitle.textContent = "PREMIUM MEMBER";
    membershipDescription.textContent = "Enjoy unlimited access to Premium Academy, Journal, AI Review and Resources.";
    upgradeBtn.style.display = "none";
    return;
  }
  membershipTitle.textContent = "FREE MEMBER";
  membershipDescription.textContent = "Upgrade your membership to unlock every premium feature.";
  upgradeBtn.style.display = "inline-flex";
}

// ─── JOURNAL DATA (SAME FIRESTORE SOURCE AS JOURNAL) ────────
function normalizeTrade(trade) {
  const t = trade || {};
  const pnl = Number(t.profit ?? t.pnl ?? 0) || 0;
  let result = String(t.result ?? t.outcome ?? "").trim().toLowerCase();
  if (result === "break even" || result === "break-even" || result === "breakeven") result = "breakeven";
  if (!result) result = pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven";
  let rr = Number(t.actualRR);
  if (!Number.isFinite(rr)) rr = Number(t.rr);
  if (!Number.isFinite(rr)) rr = Number(t.plannedRR);
  if (!Number.isFinite(rr)) rr = 0;
  return { ...t, profit: pnl, result, actualRR: rr, rr };
}

function subscribeJournalData() {
  if (!currentUser) return;
  if (tradesUnsubscribe) tradesUnsubscribe();
  if (accountsUnsubscribe) accountsUnsubscribe();

  const tradesRef = collection(db, "users", currentUser.uid, "trades");
  const accountsRef = collection(db, "users", currentUser.uid, "journalAccounts");

  tradesUnsubscribe = onSnapshot(tradesRef, (snapshot) => {
    journalTrades = [];
    snapshot.forEach(snap => journalTrades.push(normalizeTrade({ id: snap.id, ...snap.data() })));
    journalTrades.sort((a,b) => String(b.closed || b.date || b.tradeDate || "").localeCompare(String(a.closed || a.date || a.tradeDate || "")));
    calculateStatistics(journalTrades);
    loadJournalSummary(journalTrades);
    unlockAchievements(journalTrades);
  }, (error) => console.error("Profile trades error:", error));

  accountsUnsubscribe = onSnapshot(accountsRef, (snapshot) => {
    journalAccounts = {};
    snapshot.forEach(snap => journalAccounts[snap.id] = { id: snap.id, ...snap.data() });
    const balance = Object.values(journalAccounts).reduce((sum, a) => sum + Number(a.currentBalance ?? a.startingBalance ?? 0), 0);
    if (currentBalance) currentBalance.textContent = "$" + balance.toFixed(2);
  }, (error) => console.error("Profile accounts error:", error));
}

// ─── CALCULATE STATISTICS ──────────────────────────────────
function calculateStatistics(trades) {
  if (!trades || trades.length === 0) { resetStatistics(); return; }
  let wins=0, losses=0, totalProfit=0, grossProfit=0, grossLoss=0, rrTotal=0, largestRRTrade=0, best=-Infinity, worst=Infinity, winTotal=0, lossTotal=0, streak=0, maxStreak=0;
  trades.forEach(raw => {
    const trade = normalizeTrade(raw), pnl = trade.profit, rr = trade.actualRR;
    totalProfit += pnl; rrTotal += rr; if (rr > largestRRTrade) largestRRTrade = rr; if (pnl > best) best=pnl; if (pnl < worst) worst=pnl;
    if (trade.result === "win" || pnl > 0) { wins++; grossProfit += Math.max(0,pnl); winTotal += Math.max(0,pnl); streak++; maxStreak=Math.max(maxStreak,streak); }
    else if (trade.result === "loss" || pnl < 0) { losses++; grossLoss += Math.abs(Math.min(0,pnl)); lossTotal += Math.abs(Math.min(0,pnl)); streak=0; }
    else streak=0;
  });
  if (totalTrades) totalTrades.textContent=trades.length;
  if (profit) profit.textContent="$"+totalProfit.toFixed(2);
  const decisive=wins+losses;
  if (winRate) winRate.textContent=(decisive ? wins/decisive*100 : 0).toFixed(1)+"%";
  if (rrAverage) rrAverage.textContent=(rrTotal/trades.length).toFixed(2);
  if (currentStreak) currentStreak.textContent=maxStreak;
  if (profitFactor) profitFactor.textContent=(grossLoss ? grossProfit/grossLoss : grossProfit).toFixed(2);
  if (bestTrade) bestTrade.textContent=best===-Infinity?"$0.00":"$"+best.toFixed(2);
  if (worstTrade) worstTrade.textContent=worst===Infinity?"$0.00":"$"+worst.toFixed(2);
  if (avgWin) avgWin.textContent=wins?"$"+(winTotal/wins).toFixed(2):"$0.00";
  if (avgLoss) avgLoss.textContent=losses?"$"+(lossTotal/losses).toFixed(2):"$0.00";
  if (largestRR) largestRR.textContent=largestRRTrade.toFixed(2)+"R";
  if (expectancy) expectancy.textContent=(totalProfit/trades.length).toFixed(2);
}

function resetStatistics() {
  if (totalTrades) totalTrades.textContent="0"; if (winRate) winRate.textContent="0%"; if (profit) profit.textContent="$0.00"; if (rrAverage) rrAverage.textContent="0.00"; if (currentStreak) currentStreak.textContent="0"; if (profitFactor) profitFactor.textContent="0.00"; if (bestTrade) bestTrade.textContent="$0.00"; if (worstTrade) worstTrade.textContent="$0.00"; if (avgWin) avgWin.textContent="$0.00"; if (avgLoss) avgLoss.textContent="$0.00"; if (largestRR) largestRR.textContent="0R"; if (expectancy) expectancy.textContent="0.00";
}

// ─── CHANGE PASSWORD ──────────────────────────────────────
document.getElementById("changePasswordBtn")?.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  // Step 1: Ask for current password
  const currentPassword = prompt("Enter your current password:");

  if (currentPassword === null) return; // User cancelled

  if (!currentPassword || currentPassword.trim() === "") {
    alert("Current password is required.");
    return;
  }

  // Step 2: Ask for new password
  const newPassword = prompt("Enter your new password (minimum 6 characters):");

  if (newPassword === null) return; // User cancelled

  if (!newPassword || newPassword.trim().length < 6) {
    alert("New password must be at least 6 characters.");
    return;
  }

  // Step 3: Confirm new password
  const confirmPassword = prompt("Confirm your new password:");

  if (confirmPassword === null) return;

  if (newPassword !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  try {
    // Re-authenticate user before changing password
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );
    await reauthenticateWithCredential(currentUser, credential);

    // Update password
    await updatePassword(currentUser, newPassword);

    alert("✅ Password changed successfully!");
  } catch (error) {
    console.error("Change password error:", error);

    let errorMessage = "Failed to change password.";
    if (error.code === "auth/wrong-password") {
      errorMessage = "Current password is incorrect.";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Too many attempts. Please try again later.";
    } else if (error.code === "auth/requires-recent-login") {
      errorMessage = "Please log out and log back in, then try again.";
    }
    alert("❌ " + errorMessage);
  }
});

// ─── JOURNAL SUMMARY ──────────────────────────────────────
function loadJournalSummary(trades = journalTrades) {
  const data = trades.map(normalizeTrade);
  if (journalEntries) journalEntries.textContent=data.length;
  let wins=0, losses=0, rrSum=0;
  data.forEach(t=>{ rrSum+=t.actualRR; if(t.result==="win"||t.profit>0) wins++; else if(t.result==="loss"||t.profit<0) losses++; });
  if (journalWins) journalWins.textContent=wins; if (journalLosses) journalLosses.textContent=losses; if (journalRR) journalRR.textContent=data.length?(rrSum/data.length).toFixed(2)+"R":"0R";
}

// ─── ACHIEVEMENTS ──────────────────────────────────────────
function unlockAchievements(trades = journalTrades) {
  const data = trades || [];
  const achievements = document.querySelectorAll(".achievement");
  if (data.length > 0) achievements[0]?.classList.add("unlocked");
  if (data.length >= 100) achievements[2]?.classList.add("unlocked");
}

// ─── ACADEMY PROGRESS ──────────────────────────────────────
function loadAcademy() {
  const completed = Number(localStorage.getItem("academyCompleted") || 0);
  const total = 20;
  const percent = Math.round((completed / total) * 100);
  academyProgress.textContent = percent + "%";
  academyBar.style.width = percent + "%";
  lessonsCompleted.textContent = completed + " / " + total;
  lessonBar.style.width = percent + "%";
}

// ─── AI REVIEW ──────────────────────────────────────────────
function loadAIReview() {
  const reviews = JSON.parse(localStorage.getItem("aiReviews") || "[]");
  reviewsDone.textContent = reviews.length;
  if (reviews.length === 0) {
    averageScore.textContent = "0%";
    bestScore.textContent = "0%";
    mistakesFixed.textContent = "0";
    return;
  }
  let total = 0,
    best = 0,
    fixed = 0;
  reviews.forEach((r) => {
    total += Number(r.score || 0);
    if (Number(r.score) > best) best = Number(r.score);
    fixed += Number(r.fixed || 0);
  });
  averageScore.textContent = Math.round(total / reviews.length) + "%";
  bestScore.textContent = best + "%";
  mistakesFixed.textContent = fixed;
}

// ─── PSYCHOLOGY ──────────────────────────────────────────────
function loadPsychology() {
  const discipline = 82,
    consistency = 74,
    risk = 90;
  disciplineScore.textContent = discipline + "%";
  disciplineBar.style.width = discipline + "%";
  consistencyScore.textContent = consistency + "%";
  consistencyBar.style.width = consistency + "%";
  riskScore.textContent = risk + "%";
  riskBar.style.width = risk + "%";
}

// ─── DOWNLOAD DATA ──────────────────────────────────────────
downloadDataBtn?.addEventListener("click", () => {
  const data = {
    profile: currentUserData,
    trades: journalTrades.map(normalizeTrade),
    goals: {
      daily: dailyGoal.value,
      weekly: weeklyGoal.value,
      monthly: monthlyGoal.value,
      risk: riskTrade.value,
      maxLoss: maxLoss.value,
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "GTRADES-AXIS-Profile.json";
  a.click();
  URL.revokeObjectURL(url);
});

// ─── PROFILE PHOTO ──────────────────────────────────────────
const photoInput = document.getElementById("profilePhotoInput");
document.getElementById("changePhotoBtn")?.addEventListener("click", () => {
  photoInput.click();
});
photoInput?.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    profileImage.src = e.target.result;
    localStorage.setItem("profilePhoto", e.target.result);
  };
  reader.readAsDataURL(file);
});
const savedPhoto = localStorage.getItem("profilePhoto");
if (savedPhoto) profileImage.src = savedPhoto;

// ─── LOAD ALL STATS ──────────────────────────────────────────
function loadAllStats() {
  calculateStatistics(journalTrades);
  loadJournalSummary(journalTrades);
  unlockAchievements(journalTrades);
  loadAcademy();
  loadAIReview();
  loadPsychology();
}

// ─── LOGOUT ──────────────────────────────────────────────────
document.querySelectorAll("#logoutBtn").forEach((btn) => {
  btn?.addEventListener("click", async () => {
    if (confirm("Logout?")) {
      await signOut(auth);
      window.location.href = "/login";
    }
  });
});

console.log("✅ PROFILE.JS LOADED");