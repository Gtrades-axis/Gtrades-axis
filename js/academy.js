import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  collection, getDocs, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

let currentUser = null;
let modules = [];
let progress = {};

// ─── Auth guard & role check ──────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const role = userDoc.exists() ? userDoc.data().role : "member";
  if (role !== "premium" && role !== "admin") {
    document.getElementById("academyContainer").innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px 20px;">
        <i class="fa-solid fa-lock" style="font-size:3rem;color:#ffb300;display:block;margin-bottom:12px;"></i>
        <h2>Premium Access Required</h2>
        <p style="color:#94a3b8;">Upgrade to Premium to access the Academy.</p>
        <a href="dashboard.html" style="margin-top:16px;display:inline-block;padding:8px 20px;background:linear-gradient(135deg,#0f8cff,#00c853);color:#fff;border-radius:8px;text-decoration:none;">Go to Dashboard</a>
      </div>
    `;
    return;
  }
  document.getElementById("userRole").textContent = role.toUpperCase();
  await loadAcademy();
});

// ─── Load modules and user progress ────────────────────────────
async function loadAcademy() {
  try {
    const modulesSnap = await getDocs(collection(db, "academy_modules"));
    const progressSnap = await getDoc(doc(db, "user_progress", currentUser.uid));
    progress = progressSnap.exists() ? progressSnap.data() : { modules: {} };
    modules = [];
    modulesSnap.forEach(doc => {
      const mod = doc.data();
      mod.id = doc.id;
      modules.push(mod);
    });
    modules.sort((a, b) => (a.order || 0) - (b.order || 0));
    renderModules();
  } catch (e) {
    console.error("Load academy error:", e);
    document.getElementById("academyContainer").innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:#ff4d4f;">Error loading Academy. Please refresh.</div>`;
  }
}

// ─── Render modules ─────────────────────────────────────────────
function renderModules() {
  const container = document.getElementById("academyContainer");
  container.innerHTML = "";
  if (!modules.length) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:#94a3b8;">No modules available yet. Check back soon!</div>`;
    return;
  }
  modules.forEach(mod => {
    const modProgress = progress.modules?.[mod.id] || {};
    const completedLessons = modProgress.completedLessons || [];
    const totalLessons = mod.lessons?.length || 0;
    const completedCount = completedLessons.length;
    const pct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;
    const quizPassed = modProgress.quizPassed || false;
    const certIssued = modProgress.certificateIssued || false;

    let lessonsHtml = "";
    if (mod.lessons && mod.lessons.length) {
      mod.lessons.forEach(lesson => {
        const isCompleted = completedLessons.includes(lesson.lessonId);
        lessonsHtml += `
          <div class="lesson-item">
            <span class="icon ${isCompleted ? 'completed' : ''}">
              <i class="fa-${isCompleted ? 'solid fa-check-circle' : 'regular fa-circle'}"></i>
            </span>
            <span class="title">${lesson.title}</span>
            ${isCompleted ? '<span class="badge">Done</span>' : ''}
            <button onclick="openLesson('${mod.id}','${lesson.lessonId}')" style="background:none;border:none;color:#0f8cff;cursor:pointer;font-size:0.7rem;">
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        `;
      });
    }

    const hasQuiz = mod.quiz && mod.quiz.questions && mod.quiz.questions.length > 0;

    container.innerHTML += `
      <div class="module-card">
        <h3>${mod.title}</h3>
        <div class="desc">${mod.description || ''}</div>
        <div class="progress-bar">
          <div class="fill" style="width:${pct}%;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:#94a3b8;margin-bottom:6px;">
          <span>${completedCount}/${totalLessons} lessons</span>
          <span>${pct}%</span>
        </div>
        <div class="lesson-list">${lessonsHtml}</div>
        ${hasQuiz ? `
          <button class="quiz-btn" onclick="startQuiz('${mod.id}')">
            <i class="fa-solid fa-question-circle"></i> ${quizPassed ? 'Retake Quiz' : 'Take Quiz'}
          </button>
        ` : ''}
        ${quizPassed && !certIssued ? `
          <button class="quiz-btn" style="background:rgba(0,200,83,0.12);color:#00c853;margin-top:4px;" onclick="issueCertificate('${mod.id}')">
            <i class="fa-solid fa-certificate"></i> Get Certificate
          </button>
        ` : ''}
        ${certIssued ? `
          <div class="cert-badge"><i class="fa-solid fa-certificate"></i> Certificate earned</div>
        ` : ''}
      </div>
    `;
  });
}

// ─── Open a lesson ─────────────────────────────────────────────
window.openLesson = function(moduleId, lessonId) {
  window.location.href = `lesson.html?module=${moduleId}&lesson=${lessonId}`;
};

// ─── Start quiz ────────────────────────────────────────────────
window.startQuiz = function(moduleId) {
  window.location.href = `quiz.html?module=${moduleId}`;
};

// ─── Issue certificate (redirect to certificate page) ──────────
window.issueCertificate = function(moduleId) {
  window.location.href = `certificate.html?module=${moduleId}`;
};