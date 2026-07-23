import { auth, db } from "./firebase.js";
import { ALL_MODULES } from "./academyData.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const moduleId = urlParams.get('module');
if (!moduleId) {
  document.getElementById('quizContainer').innerHTML = '<div style="padding:40px;color:#ff4d4f;">No module specified.</div>';
  throw new Error('Missing module id');
}

let currentUser = null;
let currentModule = null;
let questions = [];
let progress = null;

const container = document.getElementById('quizContainer');
const titleEl = document.getElementById('quizTitle');

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  await loadProgress();
  loadQuiz();
});

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

function loadQuiz() {
  currentModule = ALL_MODULES.find(m => m.id === moduleId);
  if (!currentModule) {
    container.innerHTML = '<div style="padding:40px;color:#ff4d4f;">Module not found.</div>';
    return;
  }
  if (!currentModule.hasQuiz || !currentModule.quiz || !currentModule.quiz.questions) {
    container.innerHTML = '<div style="padding:40px;color:#94a3b8;">No quiz for this module.</div>';
    return;
  }
  titleEl.textContent = `Quiz: ${currentModule.title}`;
  questions = currentModule.quiz.questions;

  // Check if already passed
  const modProgress = progress.modules[moduleId] || {};
  if (modProgress.quizPassed) {
    container.innerHTML = `
      <div class="result-box">
        <div class="score pass">✅ Quiz Passed!</div>
        <div class="details">Score: ${modProgress.quizScore || 0}%</div>
        <button onclick="window.location.href='premium-academy.html'" class="btn-primary">Back to Academy</button>
      </div>
    `;
    return;
  }

  renderQuiz();
}

function renderQuiz() {
  let html = `<form id="quizForm">`;
  questions.forEach((q, index) => {
    html += `
      <div class="question-block">
        <div class="question-text">${index+1}. ${q.question}</div>
        <div class="options">
          ${q.options.map((opt, oi) => `
            <label>
              <input type="radio" name="q${index}" value="${oi}">
              ${opt}
            </label>
          `).join('')}
        </div>
      </div>
    `;
  });
  html += `<button type="submit" class="btn-primary">Submit Quiz</button></form>`;
  container.innerHTML = html;

  document.getElementById('quizForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitQuiz();
  });
}

async function submitQuiz() {
  const form = document.getElementById('quizForm');
  const inputs = form.querySelectorAll('input[type="radio"]:checked');
  if (inputs.length < questions.length) {
    alert('Please answer all questions.');
    return;
  }
  let correct = 0;
  questions.forEach((q, i) => {
    const selected = parseInt(document.querySelector(`input[name="q${i}"]:checked`).value);
    if (selected === q.correct) correct++;
  });
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= (currentModule.quiz.passingScore || 70);

  // Save progress
  try {
    const progressRef = doc(db, "user_progress", currentUser.uid);
    const progressSnap = await getDoc(progressRef);
    let data = progressSnap.exists() ? progressSnap.data() : { modules: {} };
    if (!data.modules) data.modules = {};
    if (!data.modules[moduleId]) data.modules[moduleId] = { completedLessons: [] };
    data.modules[moduleId].quizScore = score;
    data.modules[moduleId].quizPassed = passed;
    await setDoc(progressRef, data, { merge: true });
    // Update local
    progress = data;
  } catch (e) {
    console.error(e);
    alert('Error saving quiz result.');
  }

  // Show result
  container.innerHTML = `
    <div class="result-box">
      <div class="score ${passed ? 'pass' : 'fail'}">${score}%</div>
      <div class="${passed ? 'pass' : 'fail'}">${passed ? '✅ Passed!' : '❌ Not passed (needs ' + (currentModule.quiz.passingScore || 70) + '%)'}</div>
      <div class="details">Correct: ${correct}/${questions.length}</div>
      <div style="margin-top:8px;">
        <button onclick="window.location.href='premium-academy.html'" class="btn-primary">Back to Academy</button>
        ${!passed ? `<button onclick="window.location.reload()" class="btn-secondary" style="margin-left:6px;background:rgba(255,255,255,0.05);color:#94a3b8;border:1px solid rgba(255,255,255,0.08);padding:6px 18px;border-radius:6px;cursor:pointer;">Retry</button>` : ''}
        ${passed ? `<button onclick="window.location.href='certificate.html?module=${moduleId}'" class="btn-primary" style="margin-left:6px;background:linear-gradient(135deg,#ffb300,#f57c00);">Get Certificate</button>` : ''}
      </div>
    </div>
  `;
}