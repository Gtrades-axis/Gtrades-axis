// ============================================================
// GTRADES-AXIS™ PREMIUM ACADEMY – Lock‑compatible version
// ============================================================

import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ─── FALLBACK MODULES (correct order) ──────────────────────
const FALLBACK_MODULES = [
  {
    id: "mod_1",
    title: "Introduction",
    description: "Welcome, academy overview, rules, environment setup, recommended tools.",
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
    title: "Market Structure",
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
  },
  {
    id: "mod_3",
    title: "Liquidity",
    description: "Equal highs/lows, sweeps, inducement, engineered liquidity, mapping.",
    order: 3,
    hasQuiz: true,
    lessons: [
      { id: "lsn_3_1", title: "Introduction to Liquidity", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_2", title: "Equal Highs", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_3", title: "Equal Lows", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_4", title: "Liquidity Sweeps", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_5", title: "Inducement", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_6", title: "Engineered Liquidity", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_7", title: "Liquidity Mapping", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_8", title: "Practical Examples", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What is a liquidity sweep?", options: ["Price moves past a swing high/low to grab orders", "Price bounces off support", "Price trends strongly", "Price consolidates"], correct: 0 },
        { question: "Equal highs and equal lows indicate:", options: ["Liquidity zones", "Support and resistance", "Trend continuation", "Breakout"], correct: 0 },
        { question: "Engineered liquidity is:", options: ["Created by institutions to trap traders", "Natural market movement", "Always bullish", "Always bearish"], correct: 0 }
      ]
    }
  },
  {
    id: "mod_4",
    title: "Supply & Demand",
    description: "Institutional zones, fresh vs tested, refinement, premium/discount, combining with structure.",
    order: 4,
    hasQuiz: true,
    lessons: [
      { id: "lsn_4_1", title: "Institutional Supply", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_2", title: "Institutional Demand", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_3", title: "Fresh vs Tested Zones", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_4", title: "Zone Refinement", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_5", title: "Premium & Discount", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_6", title: "Combining Structure with S&D", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_7", title: "Practical Chart Examples", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What is a fresh zone?", options: ["Untested by price", "Tested multiple times", "Very wide zone", "On a lower timeframe"], correct: 0 },
        { question: "Supply zones are typically found:", options: ["Near resistance levels", "Near support levels", "In the middle of a range", "Below price"], correct: 0 },
        { question: "Demand zones are typically found:", options: ["Near support levels", "Near resistance levels", "In the middle of a range", "Above price"], correct: 0 }
      ]
    }
  },
  {
    id: "mod_5",
    title: "Trade Entries",
    description: "LC-1, LC-2A, LTF RE, MTF RE, confirmation checklist, trade management, exit strategy.",
    order: 5,
    hasQuiz: true,
    lessons: [
      { id: "lsn_5_1", title: "Entry Philosophy", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_2", title: "LC-1", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_3", title: "LC-2A", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_4", title: "Lower Timeframe Re-entry (LTF RE)", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_5", title: "Multi-Timeframe Re-entry (MTF RE)", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_6", title: "Confirmation Checklist", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_7", title: "Trade Management", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_8", title: "Exit Strategy", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What does LC-1 stand for?", options: ["Liquidity Capture 1", "Low Confidence 1", "Long Call 1", "Limit Close 1"], correct: 0 },
        { question: "What is the main purpose of a confirmation checklist?", options: ["Avoid impulsive entries", "Increase position size", "Trade more frequently", "Use higher leverage"], correct: 0 }
      ]
    }
  },
  {
    id: "mod_6",
    title: "Risk Management",
    description: "Position sizing, risk per trade, daily/weekly limits, R:R, prop firm rules, drawdown.",
    order: 6,
    hasQuiz: true,
    lessons: [
      { id: "lsn_6_1", title: "Position Sizing", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_6_2", title: "Risk Per Trade", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_6_3", title: "Daily & Weekly Limits", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_6_4", title: "Risk-to-Reward", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_6_5", title: "Prop Firm Rules", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_6_6", title: "Managing Drawdown", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What is a recommended risk per trade for beginners?", options: ["1-2%", "5-10%", "20%", "50%"], correct: 0 },
        { question: "What is drawdown?", options: ["Peak-to-trough decline in equity", "Maximum profit", "Average win", "Total trades"], correct: 0 }
      ]
    }
  },
  {
    id: "mod_7",
    title: "Trading Psychology",
    description: "Discipline, patience, emotional control, routine, consistency, common mistakes.",
    order: 7,
    hasQuiz: true,
    lessons: [
      { id: "lsn_7_1", title: "Discipline", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_7_2", title: "Patience", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_7_3", title: "Emotional Control", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_7_4", title: "Trading Routine", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_7_5", title: "Building Consistency", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_7_6", title: "Common Trading Mistakes", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What is the most common mistake traders make?", options: ["Overtrading", "Using stop losses", "Following a plan", "Keeping a journal"], correct: 0 },
        { question: "How can you improve trading consistency?", options: ["Stick to your trading plan", "Trade every signal", "Increase risk", "Ignore the market"], correct: 0 }
      ]
    }
  }
];

// ─── DOM refs ─────────────────────────────────────────────────
const modulesGrid = document.getElementById("modulesGrid");
const progressPercent = document.getElementById("progressPercent");
const progressText = document.getElementById("progressText");
const continueBtn = document.getElementById("continueBtn");
const lessonCompleted = document.getElementById("lessonCompleted");
const quizPassed = document.getElementById("quizPassed");
const certificateCount = document.getElementById("certificateCount");
const learningHours = document.getElementById("learningHours");
const activityLog = document.getElementById("activityLog");

let progress = null;
let modules = [];

// ─── Load progress ─────────────────────────────────────────────
async function loadProgress(uid) {
  try {
    const docRef = doc(db, "user_progress", uid);
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
    modules.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (e) {
    console.error("Error loading modules:", e);
    modules = FALLBACK_MODULES;
    console.log("🔄 Using fallback modules due to error.");
  }
}

// ─── Render Dashboard ──────────────────────────────────────────
function renderDashboard() {
  if (!modules.length) {
    modulesGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#94a3b8;">No modules available yet. Check back soon!</div>`;
    return;
  }

  // 1. Overall progress
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
  progressText.textContent = `${completedLessons} of ${totalLessons} Lessons Completed`;

  // 2. Continue Learning button
  if (firstIncomplete) {
    const mod = modules.find((m) => m.id === firstIncomplete.moduleId);
    const lesson = mod.lessons.find((l) => l.id === firstIncomplete.lessonId);
    continueBtn.textContent = `Continue ${mod.title} – ${lesson ? lesson.title : ''}`;
    continueBtn.onclick = () => {
      window.location.href = `/lesson?module=${firstIncomplete.moduleId}&lesson=${firstIncomplete.lessonId}`;
    };
  } else {
    continueBtn.textContent = "🎉 All modules complete! View Certificate";
    continueBtn.onclick = () => {
      window.location.href = "/certificate?final=true";
    };
  }

  // 3. Stats
  let lessonsDone = 0;
  let quizzesPassed = 0;
  let certificates = 0;

  modules.forEach(mod => {
    const modProgress = progress.modules[mod.id] || {};
    const completed = modProgress.completedLessons || [];
    const total = mod.lessons ? mod.lessons.length : 0;
    lessonsDone += completed.length;
    if (modProgress.quizPassed) quizzesPassed++;
    if (completed.length === total && (mod.hasQuiz ? modProgress.quizPassed : true)) {
      certificates++;
    }
  });

  lessonCompleted.textContent = lessonsDone;
  quizPassed.textContent = quizzesPassed;
  certificateCount.textContent = certificates;
  learningHours.textContent = "0h"; // placeholder

  // 4. Activity log
  const activities = [];
  if (lessonsDone > 0) activities.push(`📘 Completed ${lessonsDone} lessons`);
  if (quizzesPassed > 0) activities.push(`✅ Passed ${quizzesPassed} quizzes`);
  if (certificates > 0) activities.push(`🏆 Earned ${certificates} certificates`);
  if (activities.length === 0) activities.push("No activity yet. Start learning!");
  activityLog.innerHTML = activities.map(a => `<div class="activity-item">${a}</div>`).join('');

  // 5. Render module cards
  let html = "";
  modules.forEach((mod, idx) => {
    const modProgress = progress.modules[mod.id] || {};
    const completed = modProgress.completedLessons || [];
    const total = mod.lessons ? mod.lessons.length : 0;
    const pctMod = total ? Math.round((completed.length / total) * 100) : 0;

    // Unlock logic
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
    const statusLabel = isCompleted ? "✅ Completed" : unlocked ? "▶ In Progress" : "🔒 Locked";
    const statusClass = isCompleted ? "completed" : unlocked ? "active" : "locked";

    html += `
      <div class="module-card">
        <div class="module-header">
          <h3>${mod.title}</h3>
          <span class="status ${statusClass}">${statusLabel}</span>
        </div>
        <p>${mod.description || ''}</p>
        <div class="module-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pctMod}%;"></div>
          </div>
          <span>${completed.length}/${total} lessons</span>
        </div>
        <a href="${unlocked && total > 0 ? `/lesson?module=${mod.id}&lesson=${mod.lessons[0].id}` : '#'}" class="module-btn ${!unlocked ? 'locked' : ''}">
          ${isCompleted ? 'Review' : (unlocked ? 'Start' : '🔒 Locked')}
        </a>
        ${mod.hasQuiz && unlocked ? `<a href="/quiz?module=${mod.id}" class="quiz-link">Take Quiz</a>` : ''}
      </div>
    `;
  });
  modulesGrid.innerHTML = html;
}

// ─── EXPORTED INIT FUNCTION (called by the lock system) ──────
export async function initAcademy(userData) {
  console.log("✅ Academy unlocked – initializing...", userData);
  const uid = auth.currentUser?.uid;
  if (!uid) {
    console.error("No authenticated user found.");
    return;
  }
  await loadProgress(uid);
  await loadModules();
  renderDashboard();
}