// ============================================================
// GTRADES-AXIS™ PREMIUM ACADEMY
// ============================================================

import { auth, db } from "./firebase.js";
import { ALL_MODULES } from "./academyData.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let currentUser = null;
let progress = null;
let modules = [];

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

// ─── Auth guard ───────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  console.log("✅ User logged in:", user.uid);

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const role = userDoc.exists() ? userDoc.data().role : "member";
    console.log("👤 User role:", role);

    if (role !== "premium" && role !== "admin") {
      modulesGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
          <i class="fa-solid fa-lock" style="font-size:3rem;color:#ffb300;display:block;margin-bottom:16px;"></i>
          <h2>Premium Access Required</h2>
          <p style="color:#94a3b8;margin-bottom:16px;">Upgrade to Premium to access the Academy.</p>
          <a href="dashboard.html" style="display:inline-block;padding:10px 24px;background:linear-gradient(135deg,#1d9bf0,#4db6ff);color:#fff;border-radius:8px;text-decoration:none;">Go to Dashboard</a>
        </div>
      `;
      return;
    }
    await loadProgress();
    await loadModules();
    renderDashboard();
  } catch (e) {
    console.error("Auth setup error:", e);
    modulesGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:#ff4d4f;">Error loading Academy. Please refresh.</div>`;
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

// ─── Load modules (Firestore first, fallback to ALL_MODULES) ──
async function loadModules() {
  try {
    const querySnapshot = await getDocs(collection(db, "academy_modules"));
    if (querySnapshot.empty) {
      console.warn("⚠️ No modules found in Firestore. Using fallback data.");
      modules = ALL_MODULES;
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
    modules = ALL_MODULES;
    console.log("🔄 Using fallback modules due to error.");
  }
}

// ─── Render Dashboard ──────────────────────────────────────────
function renderDashboard() {
  if (!modules.length) {
    modulesGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#94a3b8;">No modules available yet. Check back soon!</div>`;
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
  progressText.textContent = `${completedLessons} of ${totalLessons} Lessons Completed`;

  // 2. Continue Learning button
  if (firstIncomplete) {
    const mod = modules.find((m) => m.id === firstIncomplete.moduleId);
    const lesson = mod.lessons.find((l) => l.id === firstIncomplete.lessonId);
    continueBtn.textContent = `Continue ${mod.title} – ${lesson ? lesson.title : ''}`;
    continueBtn.onclick = () => {
      window.location.href = `lesson.html?module=${firstIncomplete.moduleId}&lesson=${firstIncomplete.lessonId}`;
    };
  } else {
    continueBtn.textContent = "🎉 All modules complete! View Certificate";
    continueBtn.onclick = () => {
      window.location.href = "certificate.html?final=true";
    };
  }

  // 3. Stats
  let lessonsTotal = 0;
  let lessonsDone = 0;
  let quizzesPassed = 0;
  let certificates = 0;

  modules.forEach(mod => {
    const modProgress = progress.modules[mod.id] || {};
    const completed = modProgress.completedLessons || [];
    const total = mod.lessons ? mod.lessons.length : 0;
    lessonsTotal += total;
    lessonsDone += completed.length;
    if (modProgress.quizPassed) quizzesPassed++;
    if (completed.length === total && (mod.hasQuiz ? modProgress.quizPassed : true)) {
      certificates++;
    }
  });

  lessonCompleted.textContent = lessonsDone;
  quizPassed.textContent = quizzesPassed;
  certificateCount.textContent = certificates;
  learningHours.textContent = "0h";

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

    let unlocked = false;
    if (idx === 0) unlocked = true;
    else {
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
        <a href="${unlocked && total > 0 ? `lesson.html?module=${mod.id}&lesson=${mod.lessons[0].id}` : '#'}" class="module-btn ${!unlocked ? 'locked' : ''}">
          ${isCompleted ? 'Review' : (unlocked ? 'Start' : '🔒 Locked')}
        </a>
        ${mod.hasQuiz && unlocked ? `<a href="quiz.html?module=${mod.id}" class="quiz-link">Take Quiz</a>` : ''}
      </div>
    `;
  });
  modulesGrid.innerHTML = html;
}