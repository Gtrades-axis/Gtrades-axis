import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ─── FALLBACK MODULES (in case Firestore is empty) ───────────
const FALLBACK_MODULES = [
  {
    id: "mod_1",
    title: "Module 1 — Introduction",
    description: "Welcome to GTRADES-AXIS™, academy overview, rules, environment setup, recommended tools.",
    order: 1,
    hasQuiz: true,
    lessons: [
      { id: "lsn_1_1", title: "Welcome to GTRADES-AXIS™", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_1_2", title: "How the Academy Works", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_1_3", title: "Trading Rules & Expectations", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_1_4", title: "Setting Up Your Trading Environment", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_1_5", title: "Recommended Tools", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What is the first step in the GTRADES-AXIS™ framework?", options: ["Market Structure", "Liquidity Analysis", "Risk Management", "Psychology"], correct: 0 },
        { question: "Which tool is recommended for chart analysis?", options: ["TradingView", "MetaTrader", "NinjaTrader", "All of the above"], correct: 3 },
        { question: "What is the primary rule of trading?", options: ["Protect your capital", "Make maximum profit", "Trade every day", "Use high leverage"], correct: 0 }
      ]
    }
  },
  {
    id: "mod_2",
    title: "Module 2 — Market Structure",
    description: "HTF bias, MTF analysis, BOS, CHOCH, internal/external structure, examples.",
    order: 2,
    hasQuiz: true,
    lessons: [
      { id: "lsn_2_1", title: "Understanding Market Structure", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_2", title: "Higher Timeframe (HTF) Bias", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_3", title: "Multi-Timeframe (MTF) Analysis", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_4", title: "Trend Continuation", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_5", title: "Trend Reversal", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_6", title: "Internal Structure", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_7", title: "External Structure", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_8", title: "BOS & CHoCH", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_9", title: "Practical Chart Examples", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What does BOS stand for?", options: ["Break of Structure", "Balance of Supply", "Buy on Sight", "Breach of Support"], correct: 0 },
        { question: "Which is a sign of trend reversal?", options: ["BOS", "CHoCH", "Liquidity Sweep", "All of the above"], correct: 1 },
        { question: "What is the HTF bias used for?", options: ["Determining overall trend direction", "Entry timing", "Risk management", "Setting stop loss"], correct: 0 }
      ]
    }
  }
  // Add more fallback modules if needed – for now two are enough to test.
];

let currentUser = null;
let progress = null;
let modules = [];

// ─── DOM refs ─────────────────────────────────────────────────
const container = document.getElementById("moduleGrid");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const continueModuleEl = document.getElementById("continueModule");
const continueLessonEl = document.getElementById("continueLesson");
const continueBtn = document.getElementById("continueBtn");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const achievementsSection = document.getElementById("achievementsSection");
const todayDate = document.getElementById("todayDate");

// ─── Auth guard ───────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login";
    return;
  }
  currentUser = user;
  console.log("✅ User logged in:", user.uid);

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const role = userDoc.exists() ? userDoc.data().role : "member";
    console.log("👤 User role:", role);

    if (role !== "premium" && role !== "admin") {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
          <i class="fa-solid fa-lock" style="font-size:3rem;color:#ffb300;display:block;margin-bottom:16px;"></i>
          <h2>Premium Access Required</h2>
          <p style="color:#94a3b8;margin-bottom:16px;">Upgrade to Premium to access the Academy.</p>
          <a href="/dashboard" class="btn btn-primary" style="display:inline-block;">Go to Dashboard</a>
        </div>
      `;
      return;
    }
    userRoleEl.textContent = role.toUpperCase();
    userNameEl.textContent = userDoc.exists() ? userDoc.data().name || "Trader" : "Trader";
    todayDate.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    await loadProgress();
    await loadModules();
    renderDashboard();
  } catch (e) {
    console.error("Auth setup error:", e);
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:#ff4d4f;">Error loading Academy. Please refresh.</div>`;
  }
});

// ─── Load progress ─────────────────────────────────────────────
async function loadProgress() {
  try {
    const docRef = doc(db, "user_progress", currentUser.uid);
    const docSnap = await getDoc(docRef);
    progress = docSnap.exists() ? docSnap.data() : { modules: {} };
    console.log("📊 Progress loaded:", progress);
  } catch (e) {
    console.error("Progress load error:", e);
    progress = { modules: {} };
  }
}

// ─── Load modules (from Firestore, fallback if empty) ────────
async function loadModules() {
  try {
    const querySnapshot = await getDocs(collection(db, "academy_modules"));
    if (querySnapshot.empty) {
      console.warn("⚠️ No modules found in Firestore. Using fallback sample data.");
      modules = FALLBACK_MODULES;
    } else {
      modules = [];
      querySnapshot.forEach((doc) => {
        modules.push({ id: doc.id, ...doc.data() });
      });
      console.log(`📦 Loaded ${modules.length} modules from Firestore.`);
    }
    // Sort by order
    modules.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (e) {
    console.error("Error loading modules:", e);
    // Fallback to sample data
    modules = FALLBACK_MODULES;
    console.log("🔄 Using fallback modules due to error.");
  }
}

// ─── Render Dashboard ──────────────────────────────────────────
function renderDashboard() {
  if (!modules.length) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#94a3b8;">No modules available yet. Check back soon!</div>`;
    return;
  }

  // 1. Calculate overall progress
  let totalLessons = 0;
  let completedLessons = 0;
  let firstIncomplete = null;

  modules.forEach((mod, idx) => {
    const modProgress = progress.modules[mod.id] || {};
    const completed = modProgress.completedLessons || [];
    const total = mod.lessons ? mod.lessons.length : 0;
    totalLessons += total;
    completedLessons += completed.length;
    if (completed.length < total && !firstIncomplete) {
      firstIncomplete = {
        moduleId: mod.id,
        lessonId: mod.lessons[completed.length]?.id,
        index: idx,
      };
    }
  });

  const pct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  progressPercent.textContent = pct + "%";
  progressFill.style.width = pct + "%";

  // 2. Continue Learning
  if (firstIncomplete) {
    const mod = modules.find((m) => m.id === firstIncomplete.moduleId);
    const lesson = mod.lessons.find((l) => l.id === firstIncomplete.lessonId);
    continueModuleEl.textContent = mod.title;
    continueLessonEl.textContent = lesson ? lesson.title : "Start Module";
    continueBtn.href = `/lesson?module=${firstIncomplete.moduleId}&lesson=${firstIncomplete.lessonId}`;
    continueBtn.textContent = "Continue ▶";
  } else {
    continueModuleEl.textContent = "🎉 All modules complete!";
    continueLessonEl.textContent = "You've finished the Academy. Great job!";
    continueBtn.textContent = "View Certificate";
    continueBtn.href = "/certificate?final=true";
  }

  // 3. Achievements
  const achievements = [];
  if (modules.some((m) => progress.modules[m.id]?.quizPassed)) achievements.push("🏆 Quiz Master");
  if (modules.every((m) => (progress.modules[m.id]?.completedLessons?.length || 0) === (m.lessons ? m.lessons.length : 0)))
    achievements.push("🎓 Academy Graduate");
  achievementsSection.innerHTML = achievements.length
    ? achievements.map((a) => `<span class="badge"><i class="fa-solid fa-trophy"></i> ${a}</span>`).join("")
    : `<span class="badge"><i class="fa-regular fa-star"></i> Complete modules to earn achievements</span>`;

  // 4. Render module cards
  let html = "";
  modules.forEach((mod, idx) => {
    const modProgress = progress.modules[mod.id] || {};
    const completed = modProgress.completedLessons || [];
    const total = mod.lessons ? mod.lessons.length : 0;
    const pctMod = total ? Math.round((completed.length / total) * 100) : 0;

    // Unlock logic: module 0 always unlocked; subsequent unlock after previous complete
    let unlocked = false;
    if (idx === 0) {
      unlocked = true;
    } else {
      const prevMod = modules[idx - 1];
      const prevProgress = progress.modules[prevMod.id] || {};
      const prevCompleted = prevProgress.completedLessons || [];
      const prevTotal = prevMod.lessons ? prevMod.lessons.length : 0;
      const prevFullyCompleted = prevCompleted.length === prevTotal && (prevMod.hasQuiz ? prevProgress.quizPassed : true);
      unlocked = prevFullyCompleted;
    }

    const isCompleted = unlocked && completed.length === total && (mod.hasQuiz ? modProgress.quizPassed : true);
    const status = isCompleted ? "completed" : unlocked ? "active" : "locked";
    const statusLabel = isCompleted ? "✓ Completed" : unlocked ? "In Progress" : "🔒 Locked";

    html += `
      <div class="module-card">
        <div class="header">
          <span class="title">${mod.title}</span>
          <span class="status ${status}">${statusLabel}</span>
        </div>
        <div class="desc">${mod.description || ''}</div>
        <div class="progress-mini">
          <span>${completed.length}/${total} lessons</span>
          <div class="mini-bar"><div class="fill" style="width:${pctMod}%;"></div></div>
          <span>${pctMod}%</span>
        </div>
        <a href="${unlocked && total > 0 ? `/lesson?module=${mod.id}&lesson=${mod.lessons[0].id}` : '#'}" class="btn-module ${!unlocked ? 'locked' : ''}">
          ${isCompleted ? 'Review' : (unlocked ? 'Start' : '🔒 Locked')}
        </a>
        ${mod.hasQuiz && unlocked ? `<a href="/quiz?module=${mod.id}" class="quiz-link">Quiz</a>` : ''}
      </div>
    `;
  });
  container.innerHTML = html;
}