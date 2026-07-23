import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ─── Module Data ──────────────────────────────────────────────
const MODULES = [
  {
    id: "mod_1",
    title: "Module 1 — Introduction",
    description: "Welcome, academy overview, rules, environment setup, recommended tools.",
    lessons: [
      { id: "lsn_1_1", title: "Welcome to GTRADES-AXIS™" },
      { id: "lsn_1_2", title: "How the Academy Works" },
      { id: "lsn_1_3", title: "Trading Rules & Expectations" },
      { id: "lsn_1_4", title: "Setting Up Your Trading Environment" },
      { id: "lsn_1_5", title: "Recommended Tools" }
    ],
    hasQuiz: true,
    quizId: "quiz_1"
  },
  {
    id: "mod_2",
    title: "Module 2 — Market Structure",
    description: "HTF bias, MTF analysis, BOS, CHOCH, internal/external structure, examples.",
    lessons: [
      { id: "lsn_2_1", title: "Understanding Market Structure" },
      { id: "lsn_2_2", title: "Higher Timeframe (HTF) Bias" },
      { id: "lsn_2_3", title: "Multi-Timeframe (MTF) Analysis" },
      { id: "lsn_2_4", title: "Trend Continuation" },
      { id: "lsn_2_5", title: "Trend Reversal" },
      { id: "lsn_2_6", title: "Internal Structure" },
      { id: "lsn_2_7", title: "External Structure" },
      { id: "lsn_2_8", title: "BOS & CHoCH" },
      { id: "lsn_2_9", title: "Practical Chart Examples" }
    ],
    hasQuiz: true,
    quizId: "quiz_2"
  },
  {
    id: "mod_3",
    title: "Module 3 — Liquidity",
    description: "Equal highs/lows, sweeps, inducement, engineered liquidity, mapping.",
    lessons: [
      { id: "lsn_3_1", title: "Introduction to Liquidity" },
      { id: "lsn_3_2", title: "Equal Highs" },
      { id: "lsn_3_3", title: "Equal Lows" },
      { id: "lsn_3_4", title: "Liquidity Sweeps" },
      { id: "lsn_3_5", title: "Inducement" },
      { id: "lsn_3_6", title: "Engineered Liquidity" },
      { id: "lsn_3_7", title: "Liquidity Mapping" },
      { id: "lsn_3_8", title: "Practical Examples" }
    ],
    hasQuiz: true,
    quizId: "quiz_3"
  },
  // Add modules 4–7 similarly (I'll include them in the data array fully)
  // For brevity, I'll include the rest in the code below
];

// ─── Full module list (all 7) ────────────────────────────────
const ALL_MODULES = [
  {
    id: "mod_1",
    title: "Module 1 — Introduction",
    description: "Welcome, academy overview, rules, environment setup, recommended tools.",
    lessons: [
      { id: "lsn_1_1", title: "Welcome to GTRADES-AXIS™" },
      { id: "lsn_1_2", title: "How the Academy Works" },
      { id: "lsn_1_3", title: "Trading Rules & Expectations" },
      { id: "lsn_1_4", title: "Setting Up Your Trading Environment" },
      { id: "lsn_1_5", title: "Recommended Tools" }
    ],
    hasQuiz: true,
    quizId: "quiz_1"
  },
  {
    id: "mod_2",
    title: "Module 2 — Market Structure",
    description: "HTF bias, MTF analysis, BOS, CHOCH, internal/external structure, examples.",
    lessons: [
      { id: "lsn_2_1", title: "Understanding Market Structure" },
      { id: "lsn_2_2", title: "Higher Timeframe (HTF) Bias" },
      { id: "lsn_2_3", title: "Multi-Timeframe (MTF) Analysis" },
      { id: "lsn_2_4", title: "Trend Continuation" },
      { id: "lsn_2_5", title: "Trend Reversal" },
      { id: "lsn_2_6", title: "Internal Structure" },
      { id: "lsn_2_7", title: "External Structure" },
      { id: "lsn_2_8", title: "BOS & CHoCH" },
      { id: "lsn_2_9", title: "Practical Chart Examples" }
    ],
    hasQuiz: true,
    quizId: "quiz_2"
  },
  {
    id: "mod_3",
    title: "Module 3 — Liquidity",
    description: "Equal highs/lows, sweeps, inducement, engineered liquidity, mapping.",
    lessons: [
      { id: "lsn_3_1", title: "Introduction to Liquidity" },
      { id: "lsn_3_2", title: "Equal Highs" },
      { id: "lsn_3_3", title: "Equal Lows" },
      { id: "lsn_3_4", title: "Liquidity Sweeps" },
      { id: "lsn_3_5", title: "Inducement" },
      { id: "lsn_3_6", title: "Engineered Liquidity" },
      { id: "lsn_3_7", title: "Liquidity Mapping" },
      { id: "lsn_3_8", title: "Practical Examples" }
    ],
    hasQuiz: true,
    quizId: "quiz_3"
  },
  {
    id: "mod_4",
    title: "Module 4 — Supply & Demand",
    description: "Institutional zones, fresh vs tested, refinement, premium/discount, combining with structure.",
    lessons: [
      { id: "lsn_4_1", title: "Institutional Supply" },
      { id: "lsn_4_2", title: "Institutional Demand" },
      { id: "lsn_4_3", title: "Fresh vs Tested Zones" },
      { id: "lsn_4_4", title: "Zone Refinement" },
      { id: "lsn_4_5", title: "Premium & Discount" },
      { id: "lsn_4_6", title: "Combining Structure with S&D" },
      { id: "lsn_4_7", title: "Practical Chart Examples" }
    ],
    hasQuiz: true,
    quizId: "quiz_4"
  },
  {
    id: "mod_5",
    title: "Module 5 — Trade Entries",
    description: "LC-1, LC-2A, LTF RE, MTF RE, confirmation checklist, trade management, exit strategy.",
    lessons: [
      { id: "lsn_5_1", title: "Entry Philosophy" },
      { id: "lsn_5_2", title: "LC-1" },
      { id: "lsn_5_3", title: "LC-2A" },
      { id: "lsn_5_4", title: "Lower Timeframe Re-entry (LTF RE)" },
      { id: "lsn_5_5", title: "Multi-Timeframe Re-entry (MTF RE)" },
      { id: "lsn_5_6", title: "Confirmation Checklist" },
      { id: "lsn_5_7", title: "Trade Management" },
      { id: "lsn_5_8", title: "Exit Strategy" }
    ],
    hasQuiz: true,
    quizId: "quiz_5"
  },
  {
    id: "mod_6",
    title: "Module 6 — Risk Management",
    description: "Position sizing, risk per trade, daily/weekly limits, R:R, prop firm rules, drawdown.",
    lessons: [
      { id: "lsn_6_1", title: "Position Sizing" },
      { id: "lsn_6_2", title: "Risk Per Trade" },
      { id: "lsn_6_3", title: "Daily & Weekly Limits" },
      { id: "lsn_6_4", title: "Risk-to-Reward" },
      { id: "lsn_6_5", title: "Prop Firm Rules" },
      { id: "lsn_6_6", title: "Managing Drawdown" }
    ],
    hasQuiz: true,
    quizId: "quiz_6"
  },
  {
    id: "mod_7",
    title: "Module 7 — Trading Psychology",
    description: "Discipline, patience, emotional control, routine, consistency, common mistakes.",
    lessons: [
      { id: "lsn_7_1", title: "Discipline" },
      { id: "lsn_7_2", title: "Patience" },
      { id: "lsn_7_3", title: "Emotional Control" },
      { id: "lsn_7_4", title: "Trading Routine" },
      { id: "lsn_7_5", title: "Building Consistency" },
      { id: "lsn_7_6", title: "Common Trading Mistakes" }
    ],
    hasQuiz: true,
    quizId: "quiz_7"
  }
];

// ─── State ──────────────────────────────────────────────────────
let currentUser = null;
let progress = null; // { modules: { mod_id: { completedLessons: [...], quizPassed: false, ... } } }

// ─── DOM refs ──────────────────────────────────────────────────
const container = document.getElementById("academyContainer");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const continueModuleEl = document.getElementById("continueModule");
const continueLessonEl = document.getElementById("continueLesson");
const continueBtn = document.getElementById("continueBtn");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const achievementsContainer = document.getElementById("achievementsContainer");
const todayDate = document.getElementById("todayDate");

// ─── Auth ──────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const role = userDoc.exists() ? userDoc.data().role : "member";
  if (role !== "premium" && role !== "admin") {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px 20px;">
        <i class="fa-solid fa-lock" style="font-size:3rem;color:#ffb300;display:block;margin-bottom:12px;"></i>
        <h2>Premium Access Required</h2>
        <p style="color:#94a3b8;">Upgrade to Premium to access the Academy.</p>
        <a href="dashboard.html" style="display:inline-block;margin-top:12px;padding:8px 20px;background:linear-gradient(135deg,#0f8cff,#00c853);color:#fff;border-radius:8px;text-decoration:none;">Go to Dashboard</a>
      </div>
    `;
    return;
  }
  userRoleEl.textContent = role.toUpperCase();
  userNameEl.textContent = userDoc.exists() ? userDoc.data().name || "Trader" : "Trader";
  todayDate.textContent = new Date().toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
  await loadProgress();
  renderDashboard();
});

// ─── Load progress from Firestore ─────────────────────────────
async function loadProgress() {
  try {
    const docRef = doc(db, "user_progress", currentUser.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      progress = docSnap.data();
    } else {
      progress = { modules: {} };
    }
  } catch (e) {
    console.error("Progress load error:", e);
    progress = { modules: {} };
  }
}

// ─── Save progress to Firestore ──────────────────────────────
async function saveProgress() {
  try {
    await setDoc(doc(db, "user_progress", currentUser.uid), progress, { merge: true });
  } catch (e) {
    console.error("Save progress error:", e);
  }
}

// ─── Render Dashboard ──────────────────────────────────────────
function renderDashboard() {
  const totalModules = ALL_MODULES.length;
  let totalLessons = 0, completedLessons = 0;
  let firstIncomplete = null; // { moduleId, lessonId, index }
  let nextModuleId = null;

  ALL_MODULES.forEach((mod, idx) => {
    const modProgress = progress.modules[mod.id] || {};
    const completed = modProgress.completedLessons || [];
    const total = mod.lessons.length;
    totalLessons += total;
    completedLessons += completed.length;
    if (completed.length < total && !firstIncomplete) {
      firstIncomplete = { moduleId: mod.id, lessonId: mod.lessons[completed.length]?.id, index: idx };
    }
    if (completed.length === total && !nextModuleId && idx < totalModules - 1) {
      const nextMod = ALL_MODULES[idx + 1];
      const nextProgress = progress.modules[nextMod.id] || {};
      if (nextProgress.completedLessons?.length === 0 || !nextProgress.completedLessons) {
        nextModuleId = nextMod.id;
      }
    }
  });

  // Overall progress
  const pct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  progressPercent.textContent = pct + "%";
  progressFill.style.width = pct + "%";

  // Continue learning
  if (firstIncomplete) {
    const mod = ALL_MODULES.find(m => m.id === firstIncomplete.moduleId);
    const lesson = mod.lessons.find(l => l.id === firstIncomplete.lessonId);
    continueModuleEl.textContent = mod.title;
    continueLessonEl.textContent = lesson ? lesson.title : "Start Module";
    continueBtn.href = `lesson.html?module=${firstIncomplete.moduleId}&lesson=${firstIncomplete.lessonId}`;
    continueBtn.textContent = "Continue ▶";
  } else {
    continueModuleEl.textContent = "🎉 All modules complete!";
    continueLessonEl.textContent = "You've finished the Academy. Great job!";
    continueBtn.textContent = "View Certificate";
    continueBtn.href = "certificate.html?final=true";
  }

  // Achievements
  let achievements = [];
  if (ALL_MODULES.some(m => progress.modules[m.id]?.quizPassed)) {
    achievements.push("🏆 Quiz Master");
  }
  if (ALL_MODULES.every(m => progress.modules[m.id]?.completedLessons?.length === m.lessons.length)) {
    achievements.push("🎓 Academy Graduate");
  }
  if (achievements.length) {
    achievementsContainer.innerHTML = achievements.map(a => `<span class="badge"><i class="fa-solid fa-trophy"></i> ${a}</span>`).join('');
  } else {
    achievementsContainer.innerHTML = `<span class="badge"><i class="fa-regular fa-star"></i> Complete modules to earn achievements</span>`;
  }

  // Render modules
  let html = "";
  ALL_MODULES.forEach((mod, idx) => {
    const modProgress = progress.modules[mod.id] || {};
    const completed = modProgress.completedLessons || [];
    const total = mod.lessons.length;
    const pctMod = total ? Math.round((completed.length / total) * 100) : 0;
    const isCompleted = pctMod === 100 && mod.hasQuiz ? modProgress.quizPassed : pctMod === 100;
    const isLocked = idx > 0 && !(ALL_MODULES[idx-1] && (progress.modules[ALL_MODULES[idx-1].id]?.completedLessons?.length || 0) === ALL_MODULES[idx-1].lessons.length);
    // Actually unlock logic: previous module must be fully complete (all lessons + quiz if exists)
    const prevMod = idx > 0 ? ALL_MODULES[idx-1] : null;
    const prevCompleted = prevMod ? (progress.modules[prevMod.id]?.completedLessons?.length || 0) === prevMod.lessons.length : true;
    const unlocked = idx === 0 || (prevCompleted && (prevMod.hasQuiz ? progress.modules[prevMod.id]?.quizPassed : true));
    const status = isCompleted ? "completed" : (unlocked ? "active" : "locked");
    const statusLabel = isCompleted ? "✓ Completed" : (unlocked ? "In Progress" : "🔒 Locked");

    html += `
      <div class="module-card">
        <div class="header">
          <span class="title">${mod.title}</span>
          <span class="status ${status}">${statusLabel}</span>
        </div>
        <div class="desc">${mod.description}</div>
        <div class="progress-mini">
          <span>${completed.length}/${total} lessons</span>
          <div class="bar"><div class="fill" style="width:${pctMod}%;"></div></div>
          <span>${pctMod}%</span>
        </div>
        <a href="${unlocked ? `lesson.html?module=${mod.id}&lesson=${mod.lessons[0].id}` : '#'}" class="btn-module ${!unlocked ? 'locked' : ''}">
          ${isCompleted ? 'Review' : (unlocked ? 'Start' : '🔒 Locked')}
        </a>
        ${mod.hasQuiz && unlocked ? `<a href="quiz.html?module=${mod.id}" style="margin-left:6px;font-size:0.6rem;color:#ffb300;text-decoration:none;">Quiz</a>` : ''}
      </div>
    `;
  });
  container.innerHTML = html;
}

// ─── Initial render ────────────────────────────────────────────
// (Called after auth and progress load)