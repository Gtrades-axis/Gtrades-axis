import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const moduleId = urlParams.get("module");
const lessonId = urlParams.get("lesson");

if (!moduleId || !lessonId) {
  document.getElementById("lessonContent").innerHTML = `
    <div style="padding:40px;color:#ff4d4f;text-align:center;">
      <i class="fa-solid fa-exclamation-triangle" style="font-size:2rem;display:block;margin-bottom:12px;"></i>
      Invalid lesson. Please go back to the Academy.
    </div>
  `;
  throw new Error("Missing module or lesson id");
}

let currentUser = null;
let moduleData = null;
let lessonData = null;
let lessonIndex = -1;
let progress = null;

const titleEl = document.getElementById("lessonTitle");
const moduleTitleEl = document.getElementById("moduleTitle");
const container = document.getElementById("lessonContent");

// ─── Auth ──────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadProgress();
  await loadLesson();
});

// ─── Load progress ─────────────────────────────────────────────
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

// ─── Load lesson ───────────────────────────────────────────────
async function loadLesson() {
  try {
    const docRef = doc(db, "academy_modules", moduleId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      container.innerHTML = `<div style="padding:40px;color:#ff4d4f;">Module not found.</div>`;
      return;
    }
    moduleData = docSnap.data();
    moduleTitleEl.textContent = moduleData.title || "Module";

    // Find the lesson
    const lessons = moduleData.lessons || [];
    lessonIndex = lessons.findIndex((l) => l.id === lessonId);
    if (lessonIndex === -1) {
      container.innerHTML = `<div style="padding:40px;color:#ff4d4f;">Lesson not found.</div>`;
      return;
    }
    lessonData = lessons[lessonIndex];
    titleEl.textContent = lessonData.title || "Lesson";

    renderLesson();
  } catch (e) {
    console.error("Load lesson error:", e);
    container.innerHTML = `<div style="padding:40px;color:#ff4d4f;">Error loading lesson.</div>`;
  }
}

// ─── Render lesson ─────────────────────────────────────────────
function renderLesson() {
  let html = "";

  // Video
  if (lessonData.type === "video" && lessonData.videoUrl) {
    let embedUrl = lessonData.videoUrl;
    if (embedUrl.includes("watch?v=")) {
      const vid = embedUrl.split("v=")[1]?.split("&")[0];
      embedUrl = `https://www.youtube.com/embed/${vid}`;
    } else if (embedUrl.includes("youtu.be/")) {
      const vid = embedUrl.split("youtu.be/")[1]?.split("?")[0];
      embedUrl = `https://www.youtube.com/embed/${vid}`;
    }
    html += `<div class="video-wrapper"><iframe src="${embedUrl}" allowfullscreen></iframe></div>`;
  }

  // PDF Download
  if (lessonData.pdfUrl) {
    html += `
      <div class="pdf-download">
        <i class="fa-solid fa-file-pdf"></i>
        <a href="${lessonData.pdfUrl}" target="_blank">Download PDF</a>
      </div>
    `;
  }

  // Notes
  if (lessonData.notes) {
    html += `<div class="notes-box">${lessonData.notes}</div>`;
  }

  // Check if completed
  const modProgress = progress.modules[moduleId] || {};
  const completedLessons = modProgress.completedLessons || [];
  const isCompleted = completedLessons.includes(lessonId);

  // Previous/Next
  const lessons = moduleData.lessons || [];
  const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;
  const isLastLesson = lessonIndex === lessons.length - 1;
  const quizLink = moduleData.hasQuiz ? `quiz.html?module=${moduleId}` : null;

  html += `
    <div class="actions">
      <button class="btn btn-primary" id="markCompleteBtn" ${isCompleted ? 'disabled' : ''}>
        <i class="fa-${isCompleted ? 'solid fa-check-circle' : 'solid fa-check'}"></i>
        ${isCompleted ? 'Completed' : 'Mark Complete'}
      </button>
      <a href="academy.html" class="btn btn-outline">Back to Academy</a>
    </div>
    <div class="nav-buttons">
      ${prevLesson ? `<a href="lesson.html?module=${moduleId}&lesson=${prevLesson.id}" class="btn btn-outline"><i class="fa-solid fa-arrow-left"></i> Previous</a>` : '<span></span>'}
      ${nextLesson ? `<a href="lesson.html?module=${moduleId}&lesson=${nextLesson.id}" class="btn btn-outline">Next <i class="fa-solid fa-arrow-right"></i></a>` : (isLastLesson && quizLink ? `<a href="${quizLink}" class="btn btn-primary">Take Quiz <i class="fa-solid fa-arrow-right"></i></a>` : '')}
    </div>
  `;

  container.innerHTML = html;

  const markBtn = document.getElementById("markCompleteBtn");
  if (markBtn && !isCompleted) {
    markBtn.addEventListener("click", markLessonComplete);
  }
}

// ─── Mark lesson complete ──────────────────────────────────────
async function markLessonComplete() {
  if (!currentUser) return;
  try {
    const progressRef = doc(db, "user_progress", currentUser.uid);
    const progressSnap = await getDoc(progressRef);
    let data = progressSnap.exists() ? progressSnap.data() : { modules: {} };
    if (!data.modules) data.modules = {};
    if (!data.modules[moduleId]) data.modules[moduleId] = { completedLessons: [] };
    if (!data.modules[moduleId].completedLessons.includes(lessonId)) {
      data.modules[moduleId].completedLessons.push(lessonId);
    }
    await setDoc(progressRef, data, { merge: true });
    progress = data;
    alert("✅ Lesson marked complete!");
    renderLesson();
  } catch (e) {
    console.error(e);
    alert("❌ Error marking complete.");
  }
}