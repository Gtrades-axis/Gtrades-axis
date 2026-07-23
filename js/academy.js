import { auth, db } from "./firebase.js";
import { ALL_MODULES } from "./academyData.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

let currentUser = null, progress = null;
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

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const role = userDoc.exists() ? userDoc.data().role : "member";
  if (role !== "premium" && role !== "admin") {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;"><i class="fa-solid fa-lock" style="font-size:3rem;color:#ffb300;display:block;margin-bottom:12px;"></i><h2>Premium Access Required</h2><p style="color:#94a3b8;">Upgrade to Premium to access the Academy.</p><a href="dashboard.html" style="display:inline-block;margin-top:12px;padding:8px 20px;background:linear-gradient(135deg,#0f8cff,#00c853);color:#fff;border-radius:8px;text-decoration:none;">Go to Dashboard</a></div>`;
    return;
  }
  userRoleEl.textContent = role.toUpperCase();
  userNameEl.textContent = userDoc.exists() ? userDoc.data().name || "Trader" : "Trader";
  todayDate.textContent = new Date().toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
  await loadProgress();
  renderDashboard();
});

async function loadProgress() {
  try {
    const docSnap = await getDoc(doc(db, "user_progress", currentUser.uid));
    progress = docSnap.exists() ? docSnap.data() : { modules: {} };
  } catch (e) { console.error("Progress load error:", e); progress = { modules: {} }; }
}

async function saveProgress() {
  try { await setDoc(doc(db, "user_progress", currentUser.uid), progress, { merge: true }); } catch (e) { console.error("Save error:", e); }
}

function renderDashboard() {
  const totalModules = ALL_MODULES.length;
  let totalLessons = 0, completedLessons = 0;
  let firstIncomplete = null;

  ALL_MODULES.forEach((mod, idx) => {
    const modProgress = progress.modules[mod.id] || {};
    const completed = modProgress.completedLessons || [];
    const total = mod.lessons.length;
    totalLessons += total;
    completedLessons += completed.length;
    if (completed.length < total && !firstIncomplete) {
      firstIncomplete = { moduleId: mod.id, lessonId: mod.lessons[completed.length]?.id, index: idx };
    }
  });

  const pct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  progressPercent.textContent = pct + "%";
  progressFill.style.width = pct + "%";

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
    continueBtn.href = "certificate.html?module=final";
  }

  let achievements = [];
  if (ALL_MODULES.some(m => progress.modules[m.id]?.quizPassed)) achievements.push("🏆 Quiz Master");
  if (ALL_MODULES.every(m => progress.modules[m.id]?.completedLessons?.length === m.lessons.length)) achievements.push("🎓 Academy Graduate");
  achievementsContainer.innerHTML = achievements.length ? achievements.map(a => `<span class="badge"><i class="fa-solid fa-trophy"></i> ${a}</span>`).join('') : `<span class="badge"><i class="fa-regular fa-star"></i> Complete modules to earn achievements</span>`;

  let html = "";
  ALL_MODULES.forEach((mod, idx) => {
    const modProgress = progress.modules[mod.id] || {};
    const completed = modProgress.completedLessons || [];
    const total = mod.lessons.length;
    const pctMod = total ? Math.round((completed.length / total) * 100) : 0;
    const isCompleted = pctMod === 100 && mod.hasQuiz ? modProgress.quizPassed : pctMod === 100;
    const prevMod = idx > 0 ? ALL_MODULES[idx-1] : null;
    const prevCompleted = prevMod ? (progress.modules[prevMod.id]?.completedLessons?.length || 0) === prevMod.lessons.length : true;
    const unlocked = idx === 0 || (prevCompleted && (prevMod.hasQuiz ? progress.modules[prevMod.id]?.quizPassed : true));
    const status = isCompleted ? "completed" : (unlocked ? "active" : "locked");
    const statusLabel = isCompleted ? "✓ Completed" : (unlocked ? "In Progress" : "🔒 Locked");

    html += `
      <div class="module-card">
        <div class="header"><span class="title">${mod.title}</span><span class="status ${status}">${statusLabel}</span></div>
        <div class="desc">${mod.description}</div>
        <div class="progress-mini"><span>${completed.length}/${total} lessons</span><div class="bar"><div class="fill" style="width:${pctMod}%;"></div></div><span>${pctMod}%</span></div>
        <a href="${unlocked ? `lesson.html?module=${mod.id}&lesson=${mod.lessons[0].id}` : '#'}" class="btn-module ${!unlocked ? 'locked' : ''}">${isCompleted ? 'Review' : (unlocked ? 'Start' : '🔒 Locked')}</a>
        ${mod.hasQuiz && unlocked ? `<a href="quiz.html?module=${mod.id}" style="margin-left:6px;font-size:0.6rem;color:#ffb300;text-decoration:none;">Quiz</a>` : ''}
      </div>
    `;
  });
  container.innerHTML = html;
}