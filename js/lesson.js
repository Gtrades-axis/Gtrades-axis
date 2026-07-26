// js/lesson.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc, updateDoc, arrayUnion, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const moduleId = urlParams.get('module');
const lessonId = urlParams.get('lesson');

if (!moduleId || !lessonId) {
  document.getElementById('lessonContent').innerHTML = '<div style="padding:40px;color:#ff4d4f;">Missing module or lesson ID.</div>';
  throw new Error('Missing module or lesson id');
}

let currentUser = null;
let moduleData = null;
let lessonData = null;
let lessonIndex = -1;
let progress = null;

const container = document.getElementById('lessonContent');
const titleEl = document.getElementById('lessonTitle');

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  await loadLesson();
});

async function loadLesson() {
  try {
    // 1. Load module from Firestore
    const moduleRef = doc(db, "academy_modules", moduleId);
    const moduleSnap = await getDoc(moduleRef);
    if (!moduleSnap.exists()) {
      container.innerHTML = '<div style="padding:40px;color:#ff4d4f;">Module not found.</div>';
      return;
    }
    moduleData = moduleSnap.data();
    // 2. Find lesson
    const lessons = moduleData.lessons || [];
    lessonIndex = lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex === -1) {
      container.innerHTML = '<div style="padding:40px;color:#ff4d4f;">Lesson not found.</div>';
      return;
    }
    lessonData = lessons[lessonIndex];
    titleEl.textContent = lessonData.title;

    // 3. Load user progress
    const progressRef = doc(db, "user_progress", currentUser.uid);
    const progressSnap = await getDoc(progressRef);
    progress = progressSnap.exists() ? progressSnap.data() : { modules: {} };
    if (!progress.modules) progress.modules = {};
    if (!progress.modules[moduleId]) {
      progress.modules[moduleId] = { completedLessons: [] };
    }

    // 4. Render lesson content
    renderLesson();

  } catch (e) {
    console.error("Lesson load error:", e);
    container.innerHTML = '<div style="padding:40px;color:#ff4d4f;">Error loading lesson.</div>';
  }
}

function renderLesson() {
  const completed = progress.modules[moduleId].completedLessons || [];
  const isCompleted = completed.includes(lessonId);

  let html = '';

  // Video
  if (lessonData.type === 'video' && lessonData.videoUrl) {
    let embedUrl = lessonData.videoUrl;
    if (embedUrl.includes('watch?v=')) {
      const vid = embedUrl.split('v=')[1]?.split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${vid}`;
    } else if (embedUrl.includes('youtu.be/')) {
      const vid = embedUrl.split('youtu.be/')[1]?.split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${vid}`;
    }
    html += `<div class="video-wrapper"><iframe src="${embedUrl}" allowfullscreen></iframe></div>`;
  }

  // PDF download
  if (lessonData.pdfUrl) {
    html += `<div class="pdf-download"><i class="fa-solid fa-file-pdf"></i> <a href="${lessonData.pdfUrl}" target="_blank">Download PDF</a></div>`;
  }

  // Notes
  if (lessonData.notes) {
    html += `<div class="notes-box">${lessonData.notes}</div>`;
  }

  // Mark complete button
  html += `
    <div class="actions">
      <button class="btn-primary" id="markCompleteBtn" ${isCompleted ? 'disabled' : ''}>
        <i class="fa-${isCompleted ? 'solid fa-check-circle' : 'solid fa-check'}"></i> 
        ${isCompleted ? 'Completed' : 'Mark Complete'}
      </button>
      <button class="btn-secondary" onclick="window.location.href='academy.html'">Back to Academy</button>
    </div>
  `;

  // Previous / Next / Quiz navigation
  const lessons = moduleData.lessons || [];
  const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;
  const isLastLesson = lessonIndex === lessons.length - 1;
  const quizLink = moduleData.hasQuiz ? `quiz.html?module=${moduleId}` : null;

  html += `
    <div class="nav-buttons">
      ${prevLesson ? `<a href="lesson.html?module=${moduleId}&lesson=${prevLesson.id}" class="btn-secondary"><i class="fa-solid fa-arrow-left"></i> Previous</a>` : '<span></span>'}
      ${nextLesson ? `<a href="lesson.html?module=${moduleId}&lesson=${nextLesson.id}" class="btn-secondary">Next <i class="fa-solid fa-arrow-right"></i></a>` : (isLastLesson && quizLink ? `<a href="${quizLink}" class="btn-primary">Take Quiz <i class="fa-solid fa-arrow-right"></i></a>` : '')}
    </div>
  `;

  container.innerHTML = html;

  const markBtn = document.getElementById('markCompleteBtn');
  if (markBtn && !isCompleted) {
    markBtn.addEventListener('click', markComplete);
  }
}

async function markComplete() {
  if (!currentUser) return;
  try {
    const progressRef = doc(db, "user_progress", currentUser.uid);
    const progressSnap = await getDoc(progressRef);
    let data = progressSnap.exists() ? progressSnap.data() : { modules: {} };
    if (!data.modules) data.modules = {};
    if (!data.modules[moduleId]) data.modules[moduleId] = { completedLessons: [] };
    if (!data.modules[moduleId].completedLessons.includes(lessonId)) {
      data.modules[moduleId].completedLessons.push(lessonId);
      await setDoc(progressRef, data, { merge: true });
      // Update local progress
      progress = data;
      alert('✅ Lesson marked complete!');
      renderLesson(); // refresh to disable button and update UI
    }
  } catch (e) {
    console.error(e);
    alert('❌ Error marking complete.');
  }
}