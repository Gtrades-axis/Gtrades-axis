import { auth, db } from "./firebase.js";
import { ALL_MODULES } from "./academyData.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const moduleId = urlParams.get('module');
const lessonId = urlParams.get('lesson');
if (!moduleId || !lessonId) { document.getElementById('lessonContent').innerHTML = '<div style="padding:40px;color:#ff4d4f;">Invalid lesson.</div>'; throw new Error('Missing module or lesson id'); }

let currentUser = null, currentModule = null, currentLesson = null, lessonIndex = -1, progress = null;
const container = document.getElementById('lessonContent');
const titleEl = document.getElementById('lessonTitle');

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  await loadProgress();
  loadLesson();
});

async function loadProgress() {
  try { const docSnap = await getDoc(doc(db, "user_progress", currentUser.uid)); progress = docSnap.exists() ? docSnap.data() : { modules: {} }; } catch (e) { console.error(e); progress = { modules: {} }; }
}

function loadLesson() {
  currentModule = ALL_MODULES.find(m => m.id === moduleId);
  if (!currentModule) { container.innerHTML = '<div style="padding:40px;color:#ff4d4f;">Module not found.</div>'; return; }
  currentLesson = currentModule.lessons.find(l => l.id === lessonId);
  if (!currentLesson) { container.innerHTML = '<div style="padding:40px;color:#ff4d4f;">Lesson not found.</div>'; return; }
  lessonIndex = currentModule.lessons.findIndex(l => l.id === lessonId);
  titleEl.textContent = currentLesson.title;

  let html = '';
  if (currentLesson.type === 'video' && currentLesson.videoUrl) {
    let embedUrl = currentLesson.videoUrl;
    if (embedUrl.includes('watch?v=')) { const vid = embedUrl.split('v=')[1]?.split('&')[0]; embedUrl = `https://www.youtube.com/embed/${vid}`; }
    else if (embedUrl.includes('youtu.be/')) { const vid = embedUrl.split('youtu.be/')[1]?.split('?')[0]; embedUrl = `https://www.youtube.com/embed/${vid}`; }
    html += `<div class="video-wrapper"><iframe src="${embedUrl}" allowfullscreen></iframe></div>`;
  }
  if (currentLesson.pdfUrl) { html += `<div class="pdf-download"><i class="fa-solid fa-file-pdf"></i> <a href="${currentLesson.pdfUrl}" target="_blank">Download PDF</a></div>`; }
  if (currentLesson.notes) { html += `<div class="notes-box">${currentLesson.notes}</div>`; }

  const modProgress = progress.modules[moduleId] || {};
  const completedLessons = modProgress.completedLessons || [];
  const isCompleted = completedLessons.includes(lessonId);
  const prevLesson = lessonIndex > 0 ? currentModule.lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < currentModule.lessons.length - 1 ? currentModule.lessons[lessonIndex + 1] : null;
  const isLastLesson = lessonIndex === currentModule.lessons.length - 1;
  const quizLink = currentModule.hasQuiz ? `quiz.html?module=${moduleId}` : null;

  html += `<div class="actions"><button class="btn-primary" id="markCompleteBtn" ${isCompleted ? 'disabled' : ''}><i class="fa-${isCompleted ? 'solid fa-check-circle' : 'solid fa-check'}"></i> ${isCompleted ? 'Completed' : 'Mark Complete'}</button><button class="btn-secondary" onclick="window.location.href='premium-academy.html'">Back</button></div>
    <div class="nav-buttons">${prevLesson ? `<a href="lesson.html?module=${moduleId}&lesson=${prevLesson.id}" class="btn-secondary"><i class="fa-solid fa-arrow-left"></i> Previous</a>` : '<span></span>'}${nextLesson ? `<a href="lesson.html?module=${moduleId}&lesson=${nextLesson.id}" class="btn-secondary">Next <i class="fa-solid fa-arrow-right"></i></a>` : (isLastLesson && quizLink ? `<a href="${quizLink}" class="btn-secondary">Take Quiz <i class="fa-solid fa-arrow-right"></i></a>` : '')}</div>`;
  container.innerHTML = html;
  const markBtn = document.getElementById('markCompleteBtn');
  if (markBtn && !isCompleted) { markBtn.addEventListener('click', async () => { await markLessonComplete(); }); }
}

async function markLessonComplete() {
  if (!currentUser) return;
  try {
    const progressRef = doc(db, "user_progress", currentUser.uid);
    const progressSnap = await getDoc(progressRef);
    let data = progressSnap.exists() ? progressSnap.data() : { modules: {} };
    if (!data.modules) data.modules = {};
    if (!data.modules[moduleId]) data.modules[moduleId] = { completedLessons: [] };
    if (!data.modules[moduleId].completedLessons.includes(lessonId)) { data.modules[moduleId].completedLessons.push(lessonId); }
    await setDoc(progressRef, data, { merge: true });
    progress = data;
    alert('✅ Lesson marked complete!');
    loadLesson();
  } catch (e) { console.error(e); alert('❌ Error marking complete.'); }
}