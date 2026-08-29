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

// ─── AUTH ──────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login";
    return;
  }
  currentUser = user;
  await loadProfile();
  loadAllStats();
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

// ─── LOAD TRADING STATISTICS ──────────────────────────────
function loadTradingStatistics() {
  const saved = localStorage.getItem("trades");
  if (!saved) {
    resetStatistics();
    return;
  }
  try {
    const trades = JSON.parse(saved);
    calculateStatistics(trades);
  } catch (e) {
    resetStatistics();
  }
}

// ─── CALCULATE STATISTICS ──────────────────────────────────
function calculateStatistics(trades) {
  if (!trades || trades.length === 0) {
    resetStatistics();
    return;
  }

  let wins = 0,
    losses = 0;
  let totalProfit = 0;
  let grossProfit = 0,
    grossLoss = 0;
  let rrTotal = 0;
  let largestRRTrade = 0;
  let best = -Infinity,
    worst = Infinity;
  let winTotal = 0,
    lossTotal = 0;
  let streak = 0,
    maxStreak = 0;

  trades.forEach((trade) => {
    const pnl = Number(trade.profit) || 0;
    const rr = Number(trade.rr) || 0;

    totalProfit += pnl;
    rrTotal += rr;

    if (rr > largestRRTrade) largestRRTrade = rr;
    if (pnl > best) best = pnl;
    if (pnl < worst) worst = pnl;

    if (pnl > 0) {
      wins++;
      grossProfit += pnl;
      winTotal += pnl;
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else if (pnl < 0) {
      losses++;
      grossLoss += Math.abs(pnl);
      lossTotal += Math.abs(pnl);
      streak = 0;
    }
  });

  totalTrades.textContent = trades.length;
  profit.textContent = "$" + totalProfit.toFixed(2);
  winRate.textContent = ((wins / trades.length) * 100).toFixed(1) + "%";
  rrAverage.textContent = (rrTotal / trades.length).toFixed(2);
  currentStreak.textContent = maxStreak;

  if (grossLoss === 0) {
    profitFactor.textContent = grossProfit.toFixed(2);
  } else {
    profitFactor.textContent = (grossProfit / grossLoss).toFixed(2);
  }

  bestTrade.textContent = best === -Infinity ? "$0.00" : "$" + best.toFixed(2);
  worstTrade.textContent = worst === Infinity ? "$0.00" : "$" + worst.toFixed(2);

  avgWin.textContent = wins === 0 ? "$0.00" : "$" + (winTotal / wins).toFixed(2);
  avgLoss.textContent = losses === 0 ? "$0.00" : "$" + (lossTotal / losses).toFixed(2);
  largestRR.textContent = largestRRTrade.toFixed(2) + "R";
  expectancy.textContent = (totalProfit / trades.length).toFixed(2);

  profit.style.color = totalProfit >= 0 ? "#16c784" : "#ea3943";
}

function resetStatistics() {
  totalTrades.textContent = "0";
  winRate.textContent = "0%";
  profit.textContent = "$0.00";
  rrAverage.textContent = "0.00";
  currentStreak.textContent = "0";
  profitFactor.textContent = "0.00";
  bestTrade.textContent = "$0.00";
  worstTrade.textContent = "$0.00";
  avgWin.textContent = "$0.00";
  avgLoss.textContent = "$0.00";
  largestRR.textContent = "0R";
  expectancy.textContent = "0";
}

// ─── LOAD GOALS ──────────────────────────────────────────────
function loadGoals(user) {
  if (!user) return;
  dailyGoal.value = user.dailyGoal || "";
  weeklyGoal.value = user.weeklyGoal || "";
  monthlyGoal.value = user.monthlyGoal || "";
  riskTrade.value = user.riskTrade || "";
  maxLoss.value = user.maxLoss || "";
}

// ─── SAVE GOALS ──────────────────────────────────────────────
saveGoals?.addEventListener("click", async () => {
  if (!currentUser) return;
  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      dailyGoal: Number(dailyGoal.value) || 0,
      weeklyGoal: Number(weeklyGoal.value) || 0,
      monthlyGoal: Number(monthlyGoal.value) || 0,
      riskTrade: Number(riskTrade.value) || 0,
      maxLoss: Number(maxLoss.value) || 0,
    });
    currentUserData.dailyGoal = Number(dailyGoal.value) || 0;
    currentUserData.weeklyGoal = Number(weeklyGoal.value) || 0;
    currentUserData.monthlyGoal = Number(monthlyGoal.value) || 0;
    currentUserData.riskTrade = Number(riskTrade.value) || 0;
    currentUserData.maxLoss = Number(maxLoss.value) || 0;

    saveGoals.innerHTML = '<i class="fa-solid fa-check"></i> Goals Saved';
    saveGoals.style.background = "#16c784";
    setTimeout(() => {
      saveGoals.innerHTML = "Save Goals";
      saveGoals.style.background = "#0094ff";
    }, 2000);
  } catch (error) {
    console.error(error);
    alert("Failed to save goals.");
  }
});

// ─── EDIT PROFILE ──────────────────────────────────────────
document.getElementById("editProfileBtn")?.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  const currentName = currentUserData?.name || "";
  const newName = prompt("Enter your full name:", currentName);

  if (newName === null) return; // User cancelled

  const trimmedName = newName.trim();
  if (!trimmedName) {
    alert("Name cannot be empty.");
    return;
  }

  try {
    // Update Firebase Auth profile
    await updateProfile(currentUser, { displayName: trimmedName });

    // Update Firestore
    await updateDoc(doc(db, "users", currentUser.uid), {
      name: trimmedName,
      updatedAt: serverTimestamp(),
    });

    // Update local data
    currentUserData.name = trimmedName;
    populateProfile(currentUserData);

    alert("✅ Profile updated successfully!");
  } catch (error) {
    console.error("Edit profile error:", error);
    alert("Failed to update profile: " + error.message);
  }
});

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
function loadJournalSummary() {
  const saved = localStorage.getItem("trades");
  const trades = saved ? JSON.parse(saved) : [];
  journalEntries.textContent = trades.length;

  let wins = 0,
    losses = 0,
    rrSum = 0;
  trades.forEach((t) => {
    const pnl = Number(t.profit) || 0;
    const rr = Number(t.rr) || 0;
    rrSum += rr;
    if (pnl > 0) wins++;
    else if (pnl < 0) losses++;
  });
  journalWins.textContent = wins;
  journalLosses.textContent = losses;
  journalRR.textContent = trades.length ? (rrSum / trades.length).toFixed(2) + "R" : "0R";
}

// ─── ACHIEVEMENTS ──────────────────────────────────────────
function unlockAchievements() {
  const trades = JSON.parse(localStorage.getItem("trades") || "[]");
  const achievements = document.querySelectorAll(".achievement");
  if (trades.length > 0) achievements[0]?.classList.add("unlocked");
  if (trades.length >= 100) achievements[2]?.classList.add("unlocked");
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
    trades: JSON.parse(localStorage.getItem("trades") || "[]"),
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
  loadTradingStatistics();
  loadJournalSummary();
  unlockAchievements();
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