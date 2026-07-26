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

let currentUser = null;
let progress = null; // { modules: { mod_id: { completedLessons: [...], quizPassed: false, quizScore: 0 } } }

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
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const role = userDoc.exists() ? userDoc.data().role : "member";
  if (role !== "premium" && role !== "admin") {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
        <i class="fa-solid fa-lock" style="font-size:3rem;color:#ffb300;display:block;margin-bottom:16px;"></i>
        <h2>Premium Access Required</h2>
        <p style="color:#94a3b8;margin-bottom:16px;">Upgrade to Premium to access the Academy.</p>
        <a href="dashboard.html" class="btn btn-primary" style="display:inline-block;">Go to Dashboard</a>
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
  await renderDashboard();
});

// ─── Load progress from Firestore ─────────────────────────────
async function loadProgress() {
  try {
    const docRef = doc(db, "user_progress", currentUser.uid);
    const docSnap = await getDoc(docRef);
    progress = docSnap.exists() ? docSnap.data() : { modules: {} };
  } catch (e) {
    console.error("Progress load error:", e);
    progress = { modules: {} };
  }
}

// ─── Render Dashboard ──────────────────────────────────────────
async function renderDashboard() {
  // 1. Load modules from Firestore
  let modules = [];
  try {
    const querySnapshot = await getDocs(collection(db, "academy_modules"));
    querySnapshot.forEach((doc) => {
      modules.push({ id: doc.id, ...doc.data() });
    });
    // Sort by order (if field exists) or by title
    modules.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (e) {
    console.error("Error loading modules:", e);
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:#ff4d4f;">Failed to load modules. Please try again later.</div>`;
    return;
  }

  if (modules.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#94a3b8;">No modules available yet. Check back soon!</div>`;
    return;
  }

  // 2. Calculate overall progress
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

  // 3. Continue Learning
  if (firstIncomplete) {
    const mod = modules.find((m) => m.id === firstIncomplete.moduleId);
    const lesson = mod.lessons.find((l) => l.id === firstIncomplete.lessonId);
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

  // 4. Achievements
  const achievements = [];
  if (modules.some((m) => progress.modules[m.id]?.quizPassed)) achievements.push("🏆 Quiz Master");
  if (modules.every((m) => (progress.modules[m.id]?.completedLessons?.length || 0) === (m.lessons ? m.lessons.length : 0)))
    achievements.push("🎓 Academy Graduate");
  achievementsSection.innerHTML = achievements.length
    ? achievements.map((a) => `<span class="badge"><i class="fa-solid fa-trophy"></i> ${a}</span>`).join("")
    : `<span class="badge"><i class="fa-regular fa-star"></i> Complete modules to earn achievements</span>`;

  // 5. Render module cards
  let html = "";
  modules.forEach((mod, idx) => {
    const modProgress = progress.modules[mod.id] || {};
    const completed = modProgress.completedLessons || [];
    const total = mod.lessons ? mod.lessons.length : 0;
    const pctMod = total ? Math.round((completed.length / total) * 100) : 0;

    // Unlock logic: module 0 is always unlocked; subsequent modules unlock after previous is fully completed (all lessons + quiz if exists)
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
        <a href="${unlocked && total > 0 ? `lesson.html?module=${mod.id}&lesson=${mod.lessons[0].id}` : '#'}" class="btn-module ${!unlocked ? 'locked' : ''}">
          ${isCompleted ? 'Review' : (unlocked ? 'Start' : '🔒 Locked')}
        </a>
        ${mod.hasQuiz && unlocked ? `<a href="quiz.html?module=${mod.id}" class="quiz-link">Quiz</a>` : ''}
      </div>
    `;
  });
  container.innerHTML = html;
}